import { Server as SocketIO } from 'socket.io';
import { Server } from 'http';
import AppError from '../functions/AppError';

let io: SocketIO;

export const initIO = (httpServer: Server): SocketIO => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
    },
  });

  io.on('connection', (socket) => {
    socket.on('joinChatBox', (ticketId: string) => {
      console.info('A client joined a ticket channel');
      socket.join(ticketId);
    });

    socket.on('joinNotification', () => {
      console.info('A client joined notification channel');
      socket.join('notification');
    });

    socket.on('joinTickets', (status: string) => {
      console.info(`A client joined to ${status} tickets channel.`);
      socket.join(status);
    });

    socket.on('disconnect', () => {
      console.info('Client disconnected');
    });

    return socket;
  });
  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError('Socket IO not initialized');
  }
  return io;
};
