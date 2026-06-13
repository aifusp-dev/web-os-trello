import React from 'react';
import { useOSStore } from './store/osStore';
import { Window } from './components/os/Window';
import { Taskbar } from './components/os/Taskbar';
import { KanbanApp } from './components/apps/KanbanApp';
import { ShortenerApp } from './components/apps/ShortenerApp';
import { NotesApp } from './components/apps/NotesApp';
import { SnippetsApp } from './components/apps/SnippetsApp';
import { Login } from './components/os/Login';
import { api } from './api';
import { socket } from './socket';
import { Layout, Link as LinkIcon, FileText, Code2 } from 'lucide-react';

const App: React.FC = () => {
  const { windows, openWindow, isAuthenticated, setAuth, logout, hasPermission } = useOSStore();

  React.useEffect(() => {
    // Check session on load
    const checkSession = async () => {
      const token = localStorage.getItem('os_token');
      if (token) {
        try {
          const response = await api.get('/api/auth/me');
          setAuth(response.data, token);
        } catch (err) {
          console.error('Session invalid');
          logout();
        }
      }
    };

    checkSession();

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    return () => {
      socket.off('connect');
    };
  }, []);

  const renderApp = (component: string) => {
    switch (component) {
      case 'KanbanApp':
        return <KanbanApp />;
      case 'ShortenerApp':
        return <ShortenerApp />;
      case 'NotesApp':
        return <NotesApp />;
      case 'SnippetsApp':
        return <SnippetsApp />;
      default:
        return <div className="p-4 text-white">App not found: {component}</div>;
    }
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="relative w-screen h-screen bg-os-black overflow-hidden select-none">
      {/* Desktop Background */}
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center opacity-10 pointer-events-none">
         <h1 className="text-9xl font-black text-os-pink tracking-tighter">WEB OS</h1>
         <div className="w-96 h-1 bg-os-pink shadow-neon-pink mt-4"></div>
      </div>

      {/* Desktop Icons */}
      <div className="absolute inset-0 z-10 p-6 grid grid-cols-1 grid-rows-10 gap-4 w-min">
        {hasPermission('kanban') && (
          <button
            onDoubleClick={() => openWindow('kanban', 'Kanban Board', 'KanbanApp')}
            className="flex flex-col items-center group w-20"
          >
            <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-os-pink group-hover:bg-os-pink/20 group-hover:border-os-pink group-hover:shadow-neon-pink transition-all">
              <Layout size={32} />
            </div>
            <span className="mt-2 text-[11px] font-medium text-white text-center shadow-black drop-shadow-md">Kanban</span>
          </button>
        )}
        {hasPermission('shortener') && (
          <button
            onDoubleClick={() => openWindow('shortener', 'Acortador de enlaces', 'ShortenerApp')}
            className="flex flex-col items-center group w-20"
          >
            <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-os-pink group-hover:bg-os-pink/20 group-hover:border-os-pink group-hover:shadow-neon-pink transition-all">
              <LinkIcon size={32} />
            </div>
            <span className="mt-2 text-[11px] font-medium text-white text-center shadow-black drop-shadow-md">Acortador</span>
          </button>
        )}
        {hasPermission('notes') && (
          <button
            onDoubleClick={() => openWindow('notes', 'Notas', 'NotesApp')}
            className="flex flex-col items-center group w-20"
          >
            <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-os-pink group-hover:bg-os-pink/20 group-hover:border-os-pink group-hover:shadow-neon-pink transition-all">
              <FileText size={32} />
            </div>
            <span className="mt-2 text-[11px] font-medium text-white text-center shadow-black drop-shadow-md">Notas</span>
          </button>
        )}
        {hasPermission('snippets') && (
          <button
            onDoubleClick={() => openWindow('snippets', 'Snippets', 'SnippetsApp')}
            className="flex flex-col items-center group w-20"
          >
            <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-os-pink group-hover:bg-os-pink/20 group-hover:border-os-pink group-hover:shadow-neon-pink transition-all">
              <Code2 size={32} />
            </div>
            <span className="mt-2 text-[11px] font-medium text-white text-center shadow-black drop-shadow-md">Snippets</span>
          </button>
        )}
      </div>

      {/* Windows Manager */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="relative w-full h-full pointer-events-auto">
          {windows.map(window => (
            <Window key={window.id} window={window}>
              {renderApp(window.component)}
            </Window>
          ))}
        </div>
      </div>

      {/* Taskbar */}
      <Taskbar />
    </div>
  );
};

export default App;
