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
        methods: ["GET", "POST"]
    }
});
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Web OS Backend is running');
});
// Real-time Collaboration Logic
io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);
    socket.on('join_board', (boardId) => {
        socket.join(boardId);
        console.log(`User ${socket.id} joined board ${boardId}`);
    });
    socket.on('card_moved', async (data) => {
        // data: { cardId, sourceListId, destListId, newOrder, boardId }
        const { cardId, destListId, newOrder, boardId } = data;
        try {
            // Update DB
            await prisma.card.update({
                where: { id: cardId },
                data: {
                    listId: destListId,
                    order: newOrder
                }
            });
            // Broadcast to other users in the board
            socket.to(boardId).emit('board_updated', { type: 'CARD_MOVED', ...data });
        }
        catch (error) {
            console.error('Error updating card position:', error);
        }
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
