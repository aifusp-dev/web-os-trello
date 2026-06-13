import React from 'react';
import { useOSStore } from '../../store/osStore';
import { Layout, Link as LinkIcon, FileText, LogOut, User } from 'lucide-react';

export const Taskbar: React.FC = () => {
  const { windows, openWindow, focusWindow, activeWindowId, logout, user, hasPermission } = useOSStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-os-dark border-t border-zinc-800 flex items-center px-2 z-[9999]">
      {/* Start Button */}
      {hasPermission('kanban') && (
        <button
          onClick={() => openWindow('kanban', 'Kanban Board', 'KanbanApp')}
          className="p-2 hover:bg-os-pink/20 text-os-pink rounded-md transition-colors mr-2"
          title="Open Kanban Board"
        >
          <Layout size={24} />
        </button>
      )}
      {hasPermission('shortener') && (
        <button
          onClick={() => openWindow('shortener', 'Acortador de enlaces', 'ShortenerApp')}
          className="p-2 hover:bg-os-pink/20 text-os-pink rounded-md transition-colors mr-2"
          title="Acortador de enlaces"
        >
          <LinkIcon size={24} />
        </button>
      )}
      {hasPermission('notes') && (
        <button
          onClick={() => openWindow('notes', 'Notas', 'NotesApp')}
          className="p-2 hover:bg-os-pink/20 text-os-pink rounded-md transition-colors mr-2"
          title="Notas"
        >
          <FileText size={24} />
        </button>
      )}

      {/* Running Apps */}
      <div className="flex-1 flex items-center space-x-1 overflow-x-auto no-scrollbar">
        {windows.map(window => (
          <button
            key={window.id}
            onClick={() => focusWindow(window.id)}
            className={`px-3 py-1 text-xs rounded-md border flex items-center space-x-2 transition-all duration-200 ${
              activeWindowId === window.id 
                ? 'bg-os-pink/10 border-os-pink text-white shadow-neon-pink' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeWindowId === window.id ? 'bg-os-pink shadow-neon-pink' : 'bg-zinc-600'}`} />
            <span className="truncate max-w-[120px]">{window.title}</span>
          </button>
        ))}
      </div>

      {/* User & Logout */}
      <div className="flex items-center space-x-4 ml-4">
        {user && (
          <div className="flex items-center space-x-2 text-zinc-400">
            <User size={14} />
            <span className="text-xs font-medium">{user.username}</span>
          </div>
        )}
        
        <button 
          onClick={logout}
          className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-md transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>

        {/* System Tray (Clock) */}
        <div className="px-2 text-[10px] text-zinc-500 font-mono">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
