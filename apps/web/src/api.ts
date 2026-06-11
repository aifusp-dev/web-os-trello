import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
});

export interface CardData {
  id: string;
  title: string;
  description: string | null;
  listId: string;
  order: number;
}

export interface ListData {
  id: string;
  title: string;
  boardId: string;
  order: number;
  cards: CardData[];
}

export interface BoardData {
  id: string;
  title: string;
  ownerId: string;
  lists: ListData[];
}

export const getBoard = () => api.get<BoardData>('/api/board').then(r => r.data);

export const createList = (title: string) => api.post<ListData>('/api/lists', { title }).then(r => r.data);
export const renameList = (id: string, title: string) => api.patch(`/api/lists/${id}`, { title });
export const deleteList = (id: string) => api.delete(`/api/lists/${id}`);
export const reorderLists = (lists: { id: string; order: number }[]) => api.post('/api/lists/reorder', { lists });

export const createCard = (listId: string, title: string, description?: string | null) =>
  api.post<CardData>('/api/cards', { listId, title, description }).then(r => r.data);
export const updateCard = (id: string, data: { title?: string; description?: string | null }) =>
  api.patch(`/api/cards/${id}`, data);
export const deleteCard = (id: string) => api.delete(`/api/cards/${id}`);
export const reorderCards = (cards: { id: string; listId: string; order: number }[]) =>
  api.post('/api/cards/reorder', { cards });
