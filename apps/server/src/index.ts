import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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
const JWT_SECRET = process.env.JWT_SECRET || 'aifusp-web-os-secret-2026';

app.use(cors());
app.use(express.json());

// Middleware to verify JWT
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/', (req, res) => {
  res.send('Web OS Backend is running');
});

// Auth Endpoints
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, permissions: user.permissions },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, username: user.username, permissions: user.permissions } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticate, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, username: user.username, permissions: user.permissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Protect all /api routes except login
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login') return next();
  authenticate(req, res, next);
});

async function getOrCreateOwner() {
  let owner = await prisma.user.findFirst({ where: { username: 'aifusp' } });
  if (!owner) {
    const hashedPassword = await bcrypt.hash('aifusp2026', 10);
    owner = await prisma.user.create({
      data: {
        username: 'aifusp',
        email: 'aifusp@local',
        password: hashedPassword,
        permissions: ['kanban', 'terminal', 'settings', 'shortener'] // Admin has all by default
      }
    });
  } else if (!owner.permissions.includes('shortener')) {
    owner = await prisma.user.update({
      where: { id: owner.id },
      data: { permissions: { push: 'shortener' } }
    });
  }
  return owner;
}

const boardInclude = {
  labels: true,
  lists: {
    orderBy: { order: 'asc' as const },
    include: {
      cards: {
        orderBy: { order: 'asc' as const },
        include: {
          labels: true,
          checklistItems: { orderBy: { order: 'asc' as const } }
        }
      }
    }
  }
};

const defaultLists = [
  { title: 'To Do', order: 0 },
  { title: 'In Progress', order: 1 },
  { title: 'Done', order: 2 },
];

const SHORT_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SHORT_CODE_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

function randomShortCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += SHORT_CODE_CHARS[crypto.randomInt(SHORT_CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueShortCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomShortCode();
    const existing = await prisma.shortLink.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique short code');
}

function notifyBoardChanged() {
  io.emit('board_changed');
}

// List all boards (lightweight, no lists/cards). Lazily creates a default
// board the first time this is called on a fresh database.
app.get('/api/boards', authenticate, async (req, res) => {
  try {
    let boards = await prisma.board.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, title: true }
    });

    if (boards.length === 0) {
      const owner = await getOrCreateOwner();
      const board = await prisma.board.create({
        data: { title: 'Project Board', ownerId: owner.id, lists: { create: defaultLists } },
        select: { id: true, title: true }
      });
      boards = [board];
    }

    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

app.get('/api/boards/:id', authenticate, async (req, res) => {
  try {
    const board = await prisma.board.findUnique({ where: { id: req.params.id }, include: boardInclude });
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

app.post('/api/boards', async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const owner = await getOrCreateOwner();
    const board = await prisma.board.create({
      data: { title, ownerId: owner.id, lists: { create: defaultLists } },
      include: boardInclude
    });

    notifyBoardChanged();
    res.status(201).json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

app.patch('/api/boards/:id', async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const board = await prisma.board.update({ where: { id: req.params.id }, data: { title } });
    notifyBoardChanged();
    res.json(board);
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

app.delete('/api/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction([
      prisma.card.deleteMany({ where: { list: { boardId: id } } }),
      prisma.list.deleteMany({ where: { boardId: id } }),
      prisma.board.delete({ where: { id } })
    ]);
    notifyBoardChanged();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

app.post('/api/boards/:id/labels', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const color = String(req.body?.color ?? '').trim();
    if (!name || !color) return res.status(400).json({ error: 'name and color are required' });

    const label = await prisma.label.create({ data: { name, color, boardId: req.params.id } });
    notifyBoardChanged();
    res.status(201).json(label);
  } catch (error) {
    console.error('Error creating label:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

app.patch('/api/labels/:id', async (req, res) => {
  try {
    const data: { name?: string; color?: string } = {};
    if (req.body?.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body?.color !== undefined) data.color = String(req.body.color).trim();

    const label = await prisma.label.update({ where: { id: req.params.id }, data });
    notifyBoardChanged();
    res.json(label);
  } catch (error) {
    console.error('Error updating label:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
});

app.delete('/api/labels/:id', async (req, res) => {
  try {
    await prisma.label.delete({ where: { id: req.params.id } });
    notifyBoardChanged();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting label:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

app.post('/api/lists', async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    const boardId = req.body?.boardId as string | undefined;
    if (!title || !boardId) return res.status(400).json({ error: 'title and boardId are required' });

    const last = await prisma.list.findFirst({
      where: { boardId },
      orderBy: { order: 'desc' }
    });

    const list = await prisma.list.create({
      data: { title, boardId, order: (last?.order ?? -1) + 1 },
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
      data: { title, description, listId, order: (last?.order ?? -1) + 1 },
      include: { labels: true, checklistItems: true }
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
    const data: { title?: string; description?: string | null; dueDate?: Date | null } = {};
    if (req.body?.title !== undefined) data.title = String(req.body.title).trim();
    if (req.body?.description !== undefined) data.description = req.body.description;
    if (req.body?.dueDate !== undefined) data.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

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

app.post('/api/cards/:id/labels', async (req, res) => {
  try {
    const labelId = req.body?.labelId as string | undefined;
    if (!labelId) return res.status(400).json({ error: 'labelId is required' });

    const card = await prisma.card.update({
      where: { id: req.params.id },
      data: { labels: { connect: { id: labelId } } },
      include: { labels: true }
    });
    notifyBoardChanged();
    res.json(card);
  } catch (error) {
    console.error('Error attaching label:', error);
    res.status(500).json({ error: 'Failed to attach label' });
  }
});

app.delete('/api/cards/:id/labels/:labelId', async (req, res) => {
  try {
    const card = await prisma.card.update({
      where: { id: req.params.id },
      data: { labels: { disconnect: { id: req.params.labelId } } },
      include: { labels: true }
    });
    notifyBoardChanged();
    res.json(card);
  } catch (error) {
    console.error('Error detaching label:', error);
    res.status(500).json({ error: 'Failed to detach label' });
  }
});

app.post('/api/cards/:id/checklist', async (req, res) => {
  try {
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ error: 'text is required' });

    const last = await prisma.checklistItem.findFirst({
      where: { cardId: req.params.id },
      orderBy: { order: 'desc' }
    });

    const item = await prisma.checklistItem.create({
      data: { text, cardId: req.params.id, order: (last?.order ?? -1) + 1 }
    });

    notifyBoardChanged();
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating checklist item:', error);
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
});

app.patch('/api/checklist/:id', async (req, res) => {
  try {
    const data: { text?: string; done?: boolean } = {};
    if (req.body?.text !== undefined) data.text = String(req.body.text).trim();
    if (req.body?.done !== undefined) data.done = Boolean(req.body.done);

    const item = await prisma.checklistItem.update({ where: { id: req.params.id }, data });
    notifyBoardChanged();
    res.json(item);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

app.delete('/api/checklist/:id', async (req, res) => {
  try {
    await prisma.checklistItem.delete({ where: { id: req.params.id } });
    notifyBoardChanged();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({ error: 'Failed to delete checklist item' });
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

// Short Links (acortador de URLs, short.aifusp.dev)
app.get('/api/links', async (req: any, res) => {
  try {
    const links = await prisma.shortLink.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(links);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

app.post('/api/links', async (req: any, res) => {
  try {
    const targetUrl = String(req.body?.targetUrl ?? '').trim();
    const title = req.body?.title ? String(req.body.title).trim() : null;
    let code = req.body?.code ? String(req.body.code).trim() : null;

    if (!targetUrl) return res.status(400).json({ error: 'targetUrl is required' });
    try {
      new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: 'targetUrl must be a valid URL' });
    }

    if (code) {
      if (!SHORT_CODE_REGEX.test(code)) {
        return res.status(400).json({ error: 'El código solo puede contener letras, números, "-" y "_" (3-32 caracteres)' });
      }
      const existing = await prisma.shortLink.findUnique({ where: { code } });
      if (existing) return res.status(409).json({ error: 'Ese código ya está en uso' });
    } else {
      code = await generateUniqueShortCode();
    }

    const link = await prisma.shortLink.create({
      data: { code, targetUrl, title, ownerId: req.user.id }
    });
    res.status(201).json(link);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

app.patch('/api/links/:id', async (req: any, res) => {
  try {
    const link = await prisma.shortLink.findUnique({ where: { id: req.params.id } });
    if (!link || link.ownerId !== req.user.id) return res.status(404).json({ error: 'Link not found' });

    const data: { targetUrl?: string; title?: string | null; code?: string } = {};

    if (req.body?.targetUrl !== undefined) {
      const targetUrl = String(req.body.targetUrl).trim();
      try {
        new URL(targetUrl);
      } catch {
        return res.status(400).json({ error: 'targetUrl must be a valid URL' });
      }
      data.targetUrl = targetUrl;
    }

    if (req.body?.title !== undefined) {
      const title = String(req.body.title).trim();
      data.title = title || null;
    }

    if (req.body?.code !== undefined) {
      const code = String(req.body.code).trim();
      if (!SHORT_CODE_REGEX.test(code)) {
        return res.status(400).json({ error: 'El código solo puede contener letras, números, "-" y "_" (3-32 caracteres)' });
      }
      if (code !== link.code) {
        const existing = await prisma.shortLink.findUnique({ where: { code } });
        if (existing) return res.status(409).json({ error: 'Ese código ya está en uso' });
      }
      data.code = code;
    }

    const updated = await prisma.shortLink.update({ where: { id: link.id }, data });
    res.json(updated);
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: 'Failed to update link' });
  }
});

app.delete('/api/links/:id', async (req: any, res) => {
  try {
    const link = await prisma.shortLink.findUnique({ where: { id: req.params.id } });
    if (!link || link.ownerId !== req.user.id) return res.status(404).json({ error: 'Link not found' });

    await prisma.shortLink.delete({ where: { id: link.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// Public redirect for short.aifusp.dev/<code>. Kept after the /api routes so
// it never shadows a real API path (all of which have multiple segments).
app.get('/:code', async (req, res) => {
  try {
    const link = await prisma.shortLink.findUnique({ where: { code: req.params.code } });
    if (!link) return res.status(404).send('Enlace no encontrado');

    await prisma.shortLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } });
    res.redirect(302, link.targetUrl);
  } catch (error) {
    console.error('Error resolving short link:', error);
    res.status(500).send('Error interno');
  }
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  prisma.$connect()
    .then(() => console.log('Connected to DB via Prisma'))
    .then(() => getOrCreateOwner())
    .catch((err) => console.error('Prisma connection failed:', err));
});
