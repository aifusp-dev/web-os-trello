import React from 'react';
import { Rnd } from 'react-rnd';
import { X, Minus, Square } from 'lucide-react';
import { useOSStore, WindowState } from '../../store/osStore';

interface WindowProps {
  window: WindowState;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({ window, children }) => {
  const { 
    focusWindow, 
    closeWindow, 
    minimizeWindow, 
    maximizeWindow, 
    updateWindowPos, 
    updateWindowSize,
    activeWindowId 
  } = useOSStore();

  const isActive = activeWindowId === window.id;

  if (window.isMinimized) return null;

  return (
    <Rnd
      size={window.isMaximized ? { width: '100%', height: 'calc(100vh - 48px)' } : { width: window.width, height: window.height }}
      position={window.isMaximized ? { x: 0, y: 0 } : { x: window.x, y: window.y }}
      onDragStop={(_, d) => {
        if (!window.isMaximized) updateWindowPos(window.id, d.x, d.y);
      }}
      onResizeStop={(_, __, ref, ___, position) => {
        if (!window.isMaximized) {
          updateWindowSize(window.id, parseInt(ref.style.width), parseInt(ref.style.height));
          updateWindowPos(window.id, position.x, position.y);
        }
      }}
      dragHandleClassName="window-header"
      bounds="parent"
      enableResizing={!window.isMaximized}
      disableDragging={window.isMaximized}
      style={{ zIndex: window.zIndex }}
      onMouseDown={() => focusWindow(window.id)}
    >
      <div className={`flex flex-col w-full h-full bg-os-dark border ${isActive ? 'border-os-pink active-window-shadow' : 'border-zinc-800 window-shadow'} rounded-lg overflow-hidden transition-shadow duration-200`}>
        {/* Header */}
        <div className={`window-header flex items-center justify-between px-3 py-2 ${isActive ? 'bg-os-pink text-white' : 'bg-zinc-900 text-zinc-400'} cursor-default select-none`}>
          <span className="text-sm font-medium truncate">{window.title}</span>
          <div className="flex items-center space-x-2">
            <button 
              onClick={(e) => { e.stopPropagation(); minimizeWindow(window.id); }}
              className="p-1 hover:bg-white/20 rounded"
            >
              <Minus size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); maximizeWindow(window.id); }}
              className="p-1 hover:bg-white/20 rounded"
            >
              <Square size={12} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }}
              className="p-1 hover:bg-red-500 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto bg-os-black p-1">
          {children}
        </div>
      </div>
    </Rnd>
  );
};
