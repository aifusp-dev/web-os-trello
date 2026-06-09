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
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
    } catch (error) {
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
