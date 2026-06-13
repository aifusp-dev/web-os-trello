import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Eye, Pencil, FileText, Search } from 'lucide-react';
import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  type NoteSummary,
} from '../../api';
import { renderMarkdown } from '../../utils/markdown';

const LAST_NOTE_KEY = 'notes_last_note_id';
const SAVE_DELAY = 800;

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const NotesApp: React.FC = () => {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(false);

  const fetchNotes = () => {
    getNotes()
      .then(list => {
        setNotes(list);
        setError(null);
        setSelectedId(prev => {
          if (prev && list.some(n => n.id === prev)) return prev;
          const stored = localStorage.getItem(LAST_NOTE_KEY);
          if (stored && list.some(n => n.id === stored)) return stored;
          return list[0]?.id ?? null;
        });
      })
      .catch(() => setError('No se pudo conectar con el servidor.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setTitle('');
      setContent('');
      return;
    }
    localStorage.setItem(LAST_NOTE_KEY, selectedId);
    skipNextSave.current = true;
    getNote(selectedId)
      .then(note => {
        setTitle(note.title);
        setContent(note.content);
        setError(null);
      })
      .catch(() => setError('No se pudo cargar la nota.'));
  }, [selectedId]);

  // Debounced autosave whenever title/content change (but not on note switch).
  useEffect(() => {
    if (!selectedId) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      updateNote(selectedId, { title, content })
        .then(updated => {
          setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, title: updated.title, updatedAt: updated.updatedAt } : n));
        })
        .catch(() => setError('No se pudo guardar la nota.'));
    }, SAVE_DELAY);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  const handleCreate = async () => {
    try {
      const note = await createNote({});
      setNotes(prev => [{ id: note.id, title: note.title, createdAt: note.createdAt, updatedAt: note.updatedAt }, ...prev]);
      setSelectedId(note.id);
      setMode('edit');
    } catch {
      setError('No se pudo crear la nota.');
    }
  };

  const handleDelete = async (id: string) => {
    const previous = notes;
    const remaining = notes.filter(n => n.id !== id);
    setNotes(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
    try {
      await deleteNote(id);
    } catch {
      setError('No se pudo eliminar la nota.');
      setNotes(previous);
    }
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="w-full h-full flex text-white">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="p-2 border-b border-zinc-800 space-y-2">
          <button
            onClick={handleCreate}
            className="w-full px-2 py-1.5 bg-os-pink/10 border border-os-pink text-os-pink rounded-md hover:bg-os-pink/20 text-sm flex items-center justify-center"
          >
            <Plus size={14} className="mr-1" /> Nueva nota
          </button>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded-md pl-6 pr-2 py-1 text-xs outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-3 text-xs text-zinc-500">Cargando...</p>
          ) : filteredNotes.length === 0 ? (
            <p className="p-3 text-xs text-zinc-500">Sin notas todavía.</p>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={`group px-3 py-2 border-b border-zinc-800/50 cursor-pointer flex items-start justify-between ${
                  note.id === selectedId ? 'bg-os-pink/10 border-l-2 border-l-os-pink' : 'hover:bg-zinc-900'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{note.title || 'Sin título'}</p>
                  <p className="text-[10px] text-zinc-500">{formatDate(note.updatedAt)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(note.id); }}
                  className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
                  title="Eliminar nota"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor / preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {error && <p className="text-red-400 text-xs px-4 pt-2">{error}</p>}
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm">
            <FileText size={28} className="mb-2 opacity-50" />
            Selecciona o crea una nota.
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título"
                className="flex-1 bg-transparent text-lg font-semibold outline-none border-b border-transparent focus:border-os-pink"
              />
              <button
                onClick={() => setMode(m => m === 'edit' ? 'preview' : 'edit')}
                className="px-2 py-1 text-xs border border-zinc-700 text-zinc-300 rounded-md hover:border-os-pink hover:text-os-pink flex items-center"
                title={mode === 'edit' ? 'Vista previa' : 'Editar'}
              >
                {mode === 'edit' ? <Eye size={13} className="mr-1" /> : <Pencil size={13} className="mr-1" />}
                {mode === 'edit' ? 'Vista previa' : 'Editar'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {mode === 'edit' ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Escribe en markdown..."
                  className="w-full h-full bg-transparent outline-none resize-none font-mono text-sm text-zinc-200 leading-relaxed"
                />
              ) : (
                <div
                  className="prose-sm max-w-none text-sm text-zinc-200"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
