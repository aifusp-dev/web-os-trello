import React from 'react';

export const KanbanApp: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col text-white">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-xl font-bold text-os-pink">Project Board</h2>
        <div className="flex space-x-2">
          <button className="px-3 py-1 bg-os-pink/10 border border-os-pink text-os-pink rounded-md hover:bg-os-pink/20 text-sm">
            + New List
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto p-4 flex space-x-4">
        {/* Placeholder Lists */}
        {[ 'To Do', 'In Progress', 'Done' ].map(title => (
          <div key={title} className="w-72 flex-shrink-0 bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
            <h3 className="font-semibold mb-4 text-zinc-300 px-1">{title}</h3>
            <div className="space-y-2">
              <div className="p-3 bg-zinc-800 rounded border border-zinc-700 hover:border-os-pink transition-colors cursor-pointer group">
                <p className="text-sm">Example task for {title}</p>
                <div className="mt-2 flex justify-end">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Bug</span>
                </div>
              </div>
              <button className="w-full py-1.5 text-xs text-zinc-500 hover:text-os-pink transition-colors text-left px-1">
                + Add a card
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
