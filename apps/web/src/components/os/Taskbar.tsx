import React from 'react';
import { useOSStore } from '../../store/osStore';
import { Layout } from 'lucide-react';

export const Taskbar: React.FC = () => {
  const { windows, openWindow, focusWindow, activeWindowId } = useOSStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-os-dark border-t border-zinc-800 flex items-center px-2 z-[9999]">
      {/* Start Button */}
      <button 
        onClick={() => openWindow('kanban', 'Kanban Board', 'KanbanApp')}
        className="p-2 hover:bg-os-pink/20 text-os-pink rounded-md transition-colors mr-4"
        title="Open Kanban Board"
      >
        <Layout size={24} />
      </button>

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

      {/* System Tray (Clock placeholder) */}
      <div className="px-4 text-xs text-zinc-500 font-mono">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};
