import axios from 'axios';

// In production the web container's nginx proxies /api to the server,
// so requests can stay relative to the current origin (avoids CORS).
// VITE_API_URL can override this for local dev (e.g. http://localhost:3001).
const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
});

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('os_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Label {
  id: string;
  name: string;
  color: string;
  boardId: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
  cardId: string;
}

export interface CardData {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  listId: string;
  order: number;
  labels: Label[];
  checklistItems: ChecklistItem[];
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
  labels: Label[];
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
export const updateCard = (id: string, data: { title?: string; description?: string | null; dueDate?: string | null }) =>
  api.patch(`/api/cards/${id}`, data);
export const deleteCard = (id: string) => api.delete(`/api/cards/${id}`);
export const reorderCards = (cards: { id: string; listId: string; order: number }[]) =>
  api.post('/api/cards/reorder', { cards });

export const createLabel = (boardId: string, name: string, color: string) =>
  api.post<Label>(`/api/boards/${boardId}/labels`, { name, color }).then(r => r.data);
export const updateLabel = (id: string, data: { name?: string; color?: string }) =>
  api.patch<Label>(`/api/labels/${id}`, data).then(r => r.data);
export const deleteLabel = (id: string) => api.delete(`/api/labels/${id}`);

export const attachLabel = (cardId: string, labelId: string) =>
  api.post<CardData>(`/api/cards/${cardId}/labels`, { labelId }).then(r => r.data);
export const detachLabel = (cardId: string, labelId: string) =>
  api.delete<CardData>(`/api/cards/${cardId}/labels/${labelId}`).then(r => r.data);

export const createChecklistItem = (cardId: string, text: string) =>
  api.post<ChecklistItem>(`/api/cards/${cardId}/checklist`, { text }).then(r => r.data);
export const updateChecklistItem = (id: string, data: { text?: string; done?: boolean }) =>
  api.patch<ChecklistItem>(`/api/checklist/${id}`, data).then(r => r.data);
export const deleteChecklistItem = (id: string) => api.delete(`/api/checklist/${id}`);

export interface ShortLink {
  id: string;
  code: string;
  targetUrl: string;
  title: string | null;
  clicks: number;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export const getShortLinks = () => api.get<ShortLink[]>('/api/links').then(r => r.data);
export const createShortLink = (data: { targetUrl: string; code?: string; title?: string }) =>
  api.post<ShortLink>('/api/links', data).then(r => r.data);
export const updateShortLink = (id: string, data: { targetUrl?: string; code?: string; title?: string }) =>
  api.patch<ShortLink>(`/api/links/${id}`, data).then(r => r.data);
export const deleteShortLink = (id: string) => api.delete(`/api/links/${id}`);

export interface NoteSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteData extends NoteSummary {
  content: string;
  ownerId: string;
}

export const getNotes = () => api.get<NoteSummary[]>('/api/notes').then(r => r.data);
export const getNote = (id: string) => api.get<NoteData>(`/api/notes/${id}`).then(r => r.data);
export const createNote = (data: { title?: string; content?: string }) =>
  api.post<NoteData>('/api/notes', data).then(r => r.data);
export const updateNote = (id: string, data: { title?: string; content?: string }) =>
  api.patch<NoteData>(`/api/notes/${id}`, data).then(r => r.data);
export const deleteNote = (id: string) => api.delete(`/api/notes/${id}`);

export interface SnippetSummary {
  id: string;
  title: string;
  language: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SnippetData extends SnippetSummary {
  content: string;
  ownerId: string;
}

export const getSnippets = () => api.get<SnippetSummary[]>('/api/snippets').then(r => r.data);
export const getSnippet = (id: string) => api.get<SnippetData>(`/api/snippets/${id}`).then(r => r.data);
export const createSnippet = (data: { title?: string; language?: string; content?: string; tags?: string[] }) =>
  api.post<SnippetData>('/api/snippets', data).then(r => r.data);
export const updateSnippet = (id: string, data: { title?: string; language?: string; content?: string; tags?: string[] }) =>
  api.patch<SnippetData>(`/api/snippets/${id}`, data).then(r => r.data);
export const deleteSnippet = (id: string) => api.delete(`/api/snippets/${id}`);
