import React, { useEffect, useRef, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { Plus, X, Trash2 } from 'lucide-react';
import { socket } from '../../socket';
import {
  getBoards,
  getBoard,
  createBoard,
  renameBoard,
  deleteBoard,
  createList,
  renameList,
  deleteList,
  reorderLists,
  createCard,
  updateCard,
  deleteCard,
  reorderCards,
  type BoardData,
  type BoardSummary,
  type CardData,
} from '../../api';

const LAST_BOARD_KEY = 'kanban_last_board_id';

export const KanbanApp: React.FC = () => {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const [addingCardTo, setAddingCardTo] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const currentBoardIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentBoardIdRef.current = currentBoardId;
  }, [currentBoardId]);

  const fetchBoards = () => {
    getBoards()
      .then(list => {
        setBoards(list);
        setError(null);
        setCurrentBoardId(prev => {
          if (prev && list.some(b => b.id === prev)) return prev;
          const stored = localStorage.getItem(LAST_BOARD_KEY);
          if (stored && list.some(b => b.id === stored)) return stored;
          return list[0]?.id ?? null;
        });
      })
      .catch(() => setError('No se pudo conectar con el servidor.'));
  };

  const fetchBoard = (id: string) => {
    getBoard(id)
      .then(data => {
        setBoard(data);
        setError(null);
      })
      .catch(() => setError('No se pudo conectar con el servidor.'));
  };

  useEffect(() => {
    fetchBoards();

    const handleBoardChanged = () => {
      fetchBoards();
      if (currentBoardIdRef.current) fetchBoard(currentBoardIdRef.current);
    };
    socket.on('board_changed', handleBoardChanged);
    return () => {
      socket.off('board_changed', handleBoardChanged);
    };
  }, []);

  useEffect(() => {
    if (!currentBoardId) {
      setBoard(null);
      return;
    }
    localStorage.setItem(LAST_BOARD_KEY, currentBoardId);
    fetchBoard(currentBoardId);
  }, [currentBoardId]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'list') {
      setBoard(prev => {
        if (!prev) return prev;
        const lists = Array.from(prev.lists);
        const [moved] = lists.splice(source.index, 1);
        lists.splice(destination.index, 0, moved);
        const reordered = lists.map((l, idx) => ({ ...l, order: idx }));
        reorderLists(reordered.map(l => ({ id: l.id, order: l.order }))).catch(() =>
          setError('No se pudo guardar el nuevo orden.')
        );
        return { ...prev, lists: reordered };
      });
      return;
    }

    setBoard(prev => {
      if (!prev) return prev;
      const lists = prev.lists.map(l => ({ ...l, cards: Array.from(l.cards) }));
      const sourceList = lists.find(l => l.id === source.droppableId);
      const destList = lists.find(l => l.id === destination.droppableId);
      if (!sourceList || !destList) return prev;

      const [moved] = sourceList.cards.splice(source.index, 1);
      moved.listId = destList.id;
      destList.cards.splice(destination.index, 0, moved);

      sourceList.cards.forEach((c, idx) => (c.order = idx));
      if (destList.id !== sourceList.id) {
        destList.cards.forEach((c, idx) => (c.order = idx));
      }

      const affected = destList.id === sourceList.id
        ? destList.cards.map(c => ({ id: c.id, listId: c.listId, order: c.order }))
        : [...sourceList.cards, ...destList.cards].map(c => ({ id: c.id, listId: c.listId, order: c.order }));

      reorderCards(affected).catch(() => setError('No se pudo guardar el movimiento.'));

      return { ...prev, lists };
    });
  };

  const handleCreateBoard = async () => {
    const title = newBoardTitle.trim();
    if (!title) {
      setIsAddingBoard(false);
      return;
    }
    try {
      const newBoard = await createBoard(title);
      setBoards(prev => [...prev, { id: newBoard.id, title: newBoard.title }]);
      setCurrentBoardId(newBoard.id);
    } catch {
      setError('No se pudo crear el tablero.');
    }
    setNewBoardTitle('');
    setIsAddingBoard(false);
  };

  const handleRenameBoard = async (boardId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, title: trimmed } : b));
    setBoard(prev => prev && prev.id === boardId ? { ...prev, title: trimmed } : prev);
    try {
      await renameBoard(boardId, trimmed);
    } catch {
      setError('No se pudo renombrar el tablero.');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (boards.length <= 1) return;
    const previous = boards;
    const remaining = boards.filter(b => b.id !== boardId);
    setBoards(remaining);
    if (currentBoardId === boardId) setCurrentBoardId(remaining[0]?.id ?? null);
    try {
      await deleteBoard(boardId);
    } catch {
      setError('No se pudo eliminar el tablero.');
      setBoards(previous);
    }
  };

  const handleCreateList = async () => {
    const title = newListTitle.trim();
    if (!title || !currentBoardId) {
      setIsAddingList(false);
      return;
    }
    try {
      const list = await createList(currentBoardId, title);
      setBoard(prev => prev ? { ...prev, lists: [...prev.lists, { ...list, cards: [] }] } : prev);
    } catch {
      setError('No se pudo crear la lista.');
    }
    setNewListTitle('');
    setIsAddingList(false);
  };

  const handleRenameList = async (listId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setBoard(prev => prev ? {
      ...prev,
      lists: prev.lists.map(l => l.id === listId ? { ...l, title: trimmed } : l)
    } : prev);
    try {
      await renameList(listId, trimmed);
    } catch {
      setError('No se pudo renombrar la lista.');
    }
  };

  const handleDeleteList = async (listId: string) => {
    const previous = board;
    setBoard(prev => prev ? { ...prev, lists: prev.lists.filter(l => l.id !== listId) } : prev);
    try {
      await deleteList(listId);
    } catch {
      setError('No se pudo eliminar la lista.');
      setBoard(previous);
    }
  };

  const handleCreateCard = async (listId: string) => {
    const title = newCardTitle.trim();
    if (!title) {
      setAddingCardTo(null);
      return;
    }
    try {
      const card = await createCard(listId, title);
      setBoard(prev => prev ? {
        ...prev,
        lists: prev.lists.map(l => l.id === listId ? { ...l, cards: [...l.cards, card] } : l)
      } : prev);
    } catch {
      setError('No se pudo crear la tarjeta.');
    }
    setNewCardTitle('');
    setAddingCardTo(null);
  };

  const openCardEditor = (card: CardData) => {
    setEditingCard(card);
    setEditTitle(card.title);
    setEditDescription(card.description ?? '');
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    const title = editTitle.trim();
    if (!title) return;
    const description = editDescription.trim() || null;

    setBoard(prev => prev ? {
      ...prev,
      lists: prev.lists.map(l => ({
        ...l,
        cards: l.cards.map(c => c.id === editingCard.id ? { ...c, title, description } : c)
      }))
    } : prev);

    try {
      await updateCard(editingCard.id, { title, description });
    } catch {
      setError('No se pudo guardar la tarjeta.');
    }
    setEditingCard(null);
  };

  const handleDeleteCard = async () => {
    if (!editingCard) return;
    const cardId = editingCard.id;
    setBoard(prev => prev ? {
      ...prev,
      lists: prev.lists.map(l => ({ ...l, cards: l.cards.filter(c => c.id !== cardId) }))
    } : prev);
    setEditingCard(null);
    try {
      await deleteCard(cardId);
    } catch {
      setError('No se pudo eliminar la tarjeta.');
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400 text-sm p-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col text-white relative">
      <div className="px-4 pt-3 border-b border-zinc-800 flex items-center space-x-1 overflow-x-auto">
        {boards.map(b => (
          <div
            key={b.id}
            onClick={() => setCurrentBoardId(b.id)}
            className={`group flex items-center shrink-0 px-3 py-1.5 rounded-t-md text-sm cursor-pointer border-b-2 transition-colors ${
              b.id === currentBoardId
                ? 'border-os-pink text-os-pink bg-zinc-900/50'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {editingBoardId === b.id ? (
              <input
                autoFocus
                defaultValue={b.title}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setEditingBoardId(null);
                }}
                onBlur={e => {
                  handleRenameBoard(b.id, e.target.value);
                  setEditingBoardId(null);
                }}
                className="bg-zinc-800 border border-os-pink rounded px-1 outline-none w-32"
              />
            ) : (
              <span onDoubleClick={() => setEditingBoardId(b.id)}>{b.title}</span>
            )}
            {boards.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); handleDeleteBoard(b.id); }}
                className="ml-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar tablero"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        {isAddingBoard ? (
          <input
            autoFocus
            value={newBoardTitle}
            onChange={e => setNewBoardTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateBoard();
              if (e.key === 'Escape') { setIsAddingBoard(false); setNewBoardTitle(''); }
            }}
            onBlur={handleCreateBoard}
            placeholder="Nombre del tablero"
            className="ml-1 mb-1 bg-zinc-800 border border-os-pink rounded px-2 py-1 text-sm outline-none shrink-0"
          />
        ) : (
          <button
            onClick={() => setIsAddingBoard(true)}
            className="shrink-0 ml-1 mb-1 px-2 py-1 text-zinc-500 hover:text-os-pink transition-colors"
            title="Nuevo tablero"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {!board ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          Cargando tablero...
        </div>
      ) : (
      <>
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-xl font-bold text-os-pink">{board.title}</h2>
        <div className="flex space-x-2">
          {isAddingList ? (
            <div className="flex items-center space-x-2">
              <input
                autoFocus
                value={newListTitle}
                onChange={e => setNewListTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateList();
                  if (e.key === 'Escape') { setIsAddingList(false); setNewListTitle(''); }
                }}
                onBlur={handleCreateList}
                placeholder="Nombre de la lista"
                className="bg-zinc-800 border border-os-pink rounded-md px-2 py-1 text-sm outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => setIsAddingList(true)}
              className="px-3 py-1 bg-os-pink/10 border border-os-pink text-os-pink rounded-md hover:bg-os-pink/20 text-sm"
            >
              + New List
            </button>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="list">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 overflow-x-auto p-4 flex space-x-4"
            >
              {board.lists.map((list, listIndex) => (
                <Draggable key={list.id} draggableId={list.id} index={listIndex}>
                  {(providedList) => (
                    <div
                      ref={providedList.innerRef}
                      {...providedList.draggableProps}
                      className="w-72 flex-shrink-0 bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex flex-col"
                    >
                      <div
                        {...providedList.dragHandleProps}
                        className="flex items-center justify-between mb-3 px-1 group"
                      >
                        <input
                          value={list.title}
                          onChange={e => setBoard(prev => prev ? {
                            ...prev,
                            lists: prev.lists.map(l => l.id === list.id ? { ...l, title: e.target.value } : l)
                          } : prev)}
                          onBlur={e => handleRenameList(list.id, e.target.value)}
                          className="font-semibold text-zinc-300 bg-transparent outline-none focus:text-white w-full"
                        />
                        <button
                          onClick={() => handleDeleteList(list.id)}
                          className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                          title="Eliminar lista"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <Droppable droppableId={list.id} type="card">
                        {(providedCards) => (
                          <div
                            ref={providedCards.innerRef}
                            {...providedCards.droppableProps}
                            className="space-y-2 min-h-[8px]"
                          >
                            {list.cards.map((card, cardIndex) => (
                              <Draggable key={card.id} draggableId={card.id} index={cardIndex}>
                                {(providedCard) => (
                                  <div
                                    ref={providedCard.innerRef}
                                    {...providedCard.draggableProps}
                                    {...providedCard.dragHandleProps}
                                    onClick={() => openCardEditor(card)}
                                    className="p-3 bg-zinc-800 rounded border border-zinc-700 hover:border-os-pink transition-colors cursor-pointer group"
                                  >
                                    <p className="text-sm">{card.title}</p>
                                    {card.description && (
                                      <p className="text-xs text-zinc-500 mt-1 truncate">{card.description}</p>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {providedCards.placeholder}
                          </div>
                        )}
                      </Droppable>

                      {addingCardTo === list.id ? (
                        <textarea
                          autoFocus
                          rows={2}
                          value={newCardTitle}
                          onChange={e => setNewCardTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleCreateCard(list.id);
                            }
                            if (e.key === 'Escape') { setAddingCardTo(null); setNewCardTitle(''); }
                          }}
                          onBlur={() => handleCreateCard(list.id)}
                          placeholder="Título de la tarjeta"
                          className="mt-2 w-full bg-zinc-800 border border-os-pink rounded px-2 py-1 text-sm outline-none resize-none"
                        />
                      ) : (
                        <button
                          onClick={() => { setAddingCardTo(list.id); setNewCardTitle(''); }}
                          className="w-full mt-2 py-1.5 text-xs text-zinc-500 hover:text-os-pink transition-colors text-left px-1 flex items-center"
                        >
                          <Plus size={12} className="mr-1" /> Add a card
                        </button>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {editingCard && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-os-pink rounded-lg p-4 space-y-3 shadow-neon-pink">
            <div className="flex items-center justify-between">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="bg-transparent text-lg font-semibold outline-none border-b border-transparent focus:border-os-pink w-full mr-2"
              />
              <button onClick={() => setEditingCard(null)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              placeholder="Descripción..."
              rows={5}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm outline-none resize-none focus:border-os-pink"
            />
            <div className="flex justify-between items-center">
              <button
                onClick={handleDeleteCard}
                className="px-3 py-1 text-sm text-red-400 border border-red-400/40 rounded-md hover:bg-red-400/10 flex items-center"
              >
                <Trash2 size={14} className="mr-1" /> Eliminar
              </button>
              <button
                onClick={handleSaveCard}
                className="px-3 py-1 text-sm bg-os-pink/10 border border-os-pink text-os-pink rounded-md hover:bg-os-pink/20"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
