import { io } from 'socket.io-client';

// In production the web container's nginx proxies /socket.io to the server,
// so we connect to the same origin. VITE_API_URL can override this for
// local dev (e.g. http://localhost:3001).
const API_URL = import.meta.env.VITE_API_URL || undefined;

export const socket = io(API_URL, {
  autoConnect: true,
  // The websocket upgrade fails behind the Coolify/Traefik proxy in front
  // of this app, so stick to long-polling (which already works fine for
  // the low-frequency board_changed notifications this app sends).
  transports: ['polling'],
});
