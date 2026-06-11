"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Web OS Backend is running');
});
const boardInclude = {
    lists: {
        orderBy: { order: 'asc' },
        include: {
            cards: { orderBy: { order: 'asc' } }
        }
    }
};
const defaultLists = [
    { title: 'To Do', order: 0 },
    { title: 'In Progress', order: 1 },
    { title: 'Done', order: 2 },
];
async function getOrCreateOwner() {
    let owner = await prisma.user.findFirst();
    if (!owner) {
        owner = await prisma.user.create({
            data: { username: 'aifusp', email: 'aifusp@local' }
        });
    }
    return owner;
}
function notifyBoardChanged() {
    io.emit('board_changed');
}
// List all boards (lightweight, no lists/cards). Lazily creates a default
// board the first time this is called on a fresh database.
app.get('/api/boards', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching boards:', error);
        res.status(500).json({ error: 'Failed to fetch boards' });
    }
});
app.get('/api/boards/:id', async (req, res) => {
    try {
        const board = await prisma.board.findUnique({ where: { id: req.params.id }, include: boardInclude });
        if (!board)
            return res.status(404).json({ error: 'Board not found' });
        res.json(board);
    }
    catch (error) {
        console.error('Error fetching board:', error);
        res.status(500).json({ error: 'Failed to fetch board' });
    }
});
app.post('/api/boards', async (req, res) => {
    try {
        const title = String(req.body?.title ?? '').trim();
        if (!title)
            return res.status(400).json({ error: 'Title is required' });
        const owner = await getOrCreateOwner();
        const board = await prisma.board.create({
            data: { title, ownerId: owner.id, lists: { create: defaultLists } },
            include: boardInclude
        });
        notifyBoardChanged();
        res.status(201).json(board);
    }
    catch (error) {
        console.error('Error creating board:', error);
        res.status(500).json({ error: 'Failed to create board' });
    }
});
app.patch('/api/boards/:id', async (req, res) => {
    try {
        const title = String(req.body?.title ?? '').trim();
        if (!title)
            return res.status(400).json({ error: 'Title is required' });
        const board = await prisma.board.update({ where: { id: req.params.id }, data: { title } });
        notifyBoardChanged();
        res.json(board);
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error deleting board:', error);
        res.status(500).json({ error: 'Failed to delete board' });
    }
});
app.post('/api/lists', async (req, res) => {
    try {
        const title = String(req.body?.title ?? '').trim();
        const boardId = req.body?.boardId;
        if (!title || !boardId)
            return res.status(400).json({ error: 'title and boardId are required' });
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error deleting list:', error);
        res.status(500).json({ error: 'Failed to delete list' });
    }
});
// Reorder lists (e.g. after dragging a list to a new position).
app.post('/api/lists/reorder', async (req, res) => {
    try {
        const lists = req.body?.lists;
        if (!Array.isArray(lists))
            return res.status(400).json({ error: 'lists array is required' });
        await prisma.$transaction(lists.map(l => prisma.list.update({ where: { id: l.id }, data: { order: l.order } })));
        notifyBoardChanged();
        res.status(204).send();
    }
    catch (error) {
        console.error('Error reordering lists:', error);
        res.status(500).json({ error: 'Failed to reorder lists' });
    }
});
app.post('/api/cards', async (req, res) => {
    try {
        const listId = req.body?.listId;
        const title = String(req.body?.title ?? '').trim();
        const description = req.body?.description ?? null;
        if (!listId || !title)
            return res.status(400).json({ error: 'listId and title are required' });
        const last = await prisma.card.findFirst({
            where: { listId },
            orderBy: { order: 'desc' }
        });
        const card = await prisma.card.create({
            data: { title, description, listId, order: (last?.order ?? -1) + 1 }
        });
        notifyBoardChanged();
        res.status(201).json(card);
    }
    catch (error) {
        console.error('Error creating card:', error);
        res.status(500).json({ error: 'Failed to create card' });
    }
});
app.patch('/api/cards/:id', async (req, res) => {
    try {
        const data = {};
        if (req.body?.title !== undefined)
            data.title = String(req.body.title).trim();
        if (req.body?.description !== undefined)
            data.description = req.body.description;
        const card = await prisma.card.update({ where: { id: req.params.id }, data });
        notifyBoardChanged();
        res.json(card);
    }
    catch (error) {
        console.error('Error updating card:', error);
        res.status(500).json({ error: 'Failed to update card' });
    }
});
app.delete('/api/cards/:id', async (req, res) => {
    try {
        await prisma.card.delete({ where: { id: req.params.id } });
        notifyBoardChanged();
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting card:', error);
        res.status(500).json({ error: 'Failed to delete card' });
    }
});
// Move/reorder cards (drag & drop). Receives every card whose listId/order
// changed as a result of the drag (the moved card, plus its old and new siblings).
app.post('/api/cards/reorder', async (req, res) => {
    try {
        const cards = req.body?.cards;
        if (!Array.isArray(cards))
            return res.status(400).json({ error: 'cards array is required' });
        await prisma.$transaction(cards.map(c => prisma.card.update({
            where: { id: c.id },
            data: { listId: c.listId, order: c.order }
        })));
        notifyBoardChanged();
        res.status(204).send();
    }
    catch (error) {
        console.error('Error reordering cards:', error);
        res.status(500).json({ error: 'Failed to reorder cards' });
    }
});
io.on('connection', (socket) => {
    socket.on('disconnect', () => { });
});
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    prisma.$connect()
        .then(() => console.log('Connected to DB via Prisma'))
        .catch((err) => console.error('Prisma connection failed:', err));
});
