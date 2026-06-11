import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Web OS Backend is running');
});

const boardInclude = {
  lists: {
    orderBy: { order: 'asc' as const },
    include: {
      cards: { orderBy: { order: 'asc' as const } }
    }
  }
};

/**
 * This OS has a single personal Kanban board. We lazily create it
 * (and a default owner) the first time it's requested.
 */
async function getOrCreateBoard() {
  let board = await prisma.board.findFirst({ include: boardInclude });
  if (board) return board;

  let owner = await prisma.user.findFirst();
  if (!owner) {
    owner = await prisma.user.create({
      data: { username: 'aifusp', email: 'aifusp@local' }
    });
  }

  return prisma.board.create({
    data: {
      title: 'Project Board',
      ownerId: owner.id,
      lists: {
        create: [
          { title: 'To Do', order: 0 },
          { title: 'In Progress', order: 1 },
          { title: 'Done', order: 2 },
        ]
      }
    },
    include: boardInclude
  });
}

function notifyBoardChanged() {
  io.emit('board_changed');
}

app.get('/api/board', async (req, res) => {
  try {
    res.json(await getOrCreateBoard());
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

app.post('/api/lists', async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const board = await getOrCreateBoard();
    const last = await prisma.list.findFirst({
      where: { boardId: board.id },
      orderBy: { order: 'desc' }
    });

    const list = await prisma.list.create({
      data: { title, boardId: board.id, order: (last?.order ?? -1) + 1 },
      include: { cards: true }
    });

    notifyBoardChanged();
    res.status(201).json(list);
  } catch (error) {
    console.error('Error creating list:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

app.patch('/api/lists/:id', async (req, res) => {
  try {
    const title = req.body?.title !== undefined ? String(req.body.title).trim() : undefined;
    const list = await prisma.list.update({
      where: { id: req.params.id },
      data: { title }
    });
    notifyBoardChanged();
    res.json(list);
  } catch (error) {
    console.error('Error updating list:', error);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

app.delete('/api/lists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction([
      prisma.card.deleteMany({ where: { listId: id } }),
      prisma.list.delete({ where: { id } })
    ]);
    notifyBoardChanged();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// Reorder lists (e.g. after dragging a list to a new position).
app.post('/api/lists/reorder', async (req, res) => {
  try {
    const lists = req.body?.lists as { id: string; order: number }[] | undefined;
    if (!Array.isArray(lists)) return res.status(400).json({ error: 'lists array is required' });

    await prisma.$transaction(
      lists.map(l => prisma.list.update({ where: { id: l.id }, data: { order: l.order } }))
    );
    notifyBoardChanged();
    res.status(204).send();
  } catch (error) {
    console.error('Error reordering lists:', error);
    res.status(500).json({ error: 'Failed to reorder lists' });
  }
});

app.post('/api/cards', async (req, res) => {
  try {
    const listId = req.body?.listId as string | undefined;
    const title = String(req.body?.title ?? '').trim();
    const description = req.body?.description ?? null;
    if (!listId || !title) return res.status(400).json({ error: 'listId and title are required' });

    const last = await prisma.card.findFirst({
      where: { listId },
      orderBy: { order: 'desc' }
    });

    const card = await prisma.card.create({
      data: { title, description, listId, order: (last?.order ?? -1) + 1 }
    });

    notifyBoardChanged();
    res.status(201).json(card);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

app.patch('/api/cards/:id', async (req, res) => {
  try {
    const data: { title?: string; description?: string | null } = {};
    if (req.body?.title !== undefined) data.title = String(req.body.title).trim();
    if (req.body?.description !== undefined) data.description = req.body.description;

    const card = await prisma.card.update({ where: { id: req.params.id }, data });
    notifyBoardChanged();
    res.json(card);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    await prisma.card.delete({ where: { id: req.params.id } });
    notifyBoardChanged();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Move/reorder cards (drag & drop). Receives every card whose listId/order
// changed as a result of the drag (the moved card, plus its old and new siblings).
app.post('/api/cards/reorder', async (req, res) => {
  try {
    const cards = req.body?.cards as { id: string; listId: string; order: number }[] | undefined;
    if (!Array.isArray(cards)) return res.status(400).json({ error: 'cards array is required' });

    await prisma.$transaction(
      cards.map(c => prisma.card.update({
        where: { id: c.id },
        data: { listId: c.listId, order: c.order }
      }))
    );
    notifyBoardChanged();
    res.status(204).send();
  } catch (error) {
    console.error('Error reordering cards:', error);
    res.status(500).json({ error: 'Failed to reorder cards' });
  }
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  prisma.$connect()
    .then(() => console.log('Connected to DB via Prisma'))
    .catch((err) => console.error('Prisma connection failed:', err));
});
