import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  permissions: string[];
}

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  component: string;
}

interface OSState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  windows: WindowState[];
  activeWindowId: string | null;
  maxZIndex: number;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  openWindow: (id: string, title: string, component: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPos: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, width: number, height: number) => void;
  hasPermission: (appId: string) => boolean;
}

export const useOSStore = create<OSState>((set, get) => ({
  user: null,
  token: localStorage.getItem('os_token'),
  isAuthenticated: !!localStorage.getItem('os_token'),
  windows: [],
  activeWindowId: null,
  maxZIndex: 10,

  setAuth: (user, token) => {
    localStorage.setItem('os_token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('os_token');
    set({ user: null, token: null, isAuthenticated: false, windows: [] });
  },

  hasPermission: (appId) => {
    const { user } = get();
    if (!user) return false;
    return user.permissions.includes(appId);
  },

  openWindow: (id, title, component) => {
    const { windows, maxZIndex, hasPermission } = get();
    
    // Check permission before opening
    if (!hasPermission(id)) {
      console.warn(`Access denied for app: ${id}`);
      return;
    }

    const existingWindow = windows.find(w => w.id === id);

    if (existingWindow) {
      get().focusWindow(id);
      if (existingWindow.isMinimized) {
        set({
          windows: windows.map(w => w.id === id ? { ...w, isMinimized: false } : w)
        });
      }
      return;
    }

    const newZIndex = maxZIndex + 1;
    const newWindow: WindowState = {
      id,
      title,
      component,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: newZIndex,
      x: 100 + (windows.length * 30),
      y: 100 + (windows.length * 30),
      width: 800,
      height: 600,
    };

    set({
      windows: [...windows, newWindow],
      activeWindowId: id,
      maxZIndex: newZIndex
    });
  },

  closeWindow: (id) => {
    set(state => ({
      windows: state.windows.filter(w => w.id !== id),
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
    }));
  },

  minimizeWindow: (id) => {
    set(state => ({
      windows: state.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w),
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
    }));
  },

  maximizeWindow: (id) => {
    set(state => ({
      windows: state.windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)
    }));
  },

  focusWindow: (id) => {
    const { maxZIndex, windows } = get();
    const newZIndex = maxZIndex + 1;
    set({
      windows: windows.map(w => w.id === id ? { ...w, zIndex: newZIndex, isMinimized: false } : w),
      activeWindowId: id,
      maxZIndex: newZIndex
    });
  },

  updateWindowPos: (id, x, y) => {
    set(state => ({
      windows: state.windows.map(w => w.id === id ? { ...w, x, y } : w)
    }));
  },

  updateWindowSize: (id, width, height) => {
    set(state => ({
      windows: state.windows.map(w => w.id === id ? { ...w, width, height } : w)
    }));
  }
}));
