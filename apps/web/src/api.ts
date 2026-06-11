import axios from 'axios';

// In production the web container's nginx proxies /api to the server,
// so requests can stay relative to the current origin (avoids CORS).
// VITE_API_URL can override this for local dev (e.g. http://localhost:3001).
const API_URL = import.meta.env.VITE_API_URL || '';

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

export interface BoardSummary {
  id: string;
  title: string;
}

export interface BoardData extends BoardSummary {
  ownerId: string;
  lists: ListData[];
}

export const getBoards = () => api.get<BoardSummary[]>('/api/boards').then(r => r.data);
export const getBoard = (id: string) => api.get<BoardData>(`/api/boards/${id}`).then(r => r.data);
export const createBoard = (title: string) => api.post<BoardData>('/api/boards', { title }).then(r => r.data);
export const renameBoard = (id: string, title: string) => api.patch(`/api/boards/${id}`, { title });
export const deleteBoard = (id: string) => api.delete(`/api/boards/${id}`);

export const createList = (boardId: string, title: string) =>
  api.post<ListData>('/api/lists', { boardId, title }).then(r => r.data);
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
