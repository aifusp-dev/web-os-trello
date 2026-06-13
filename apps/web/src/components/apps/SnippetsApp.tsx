import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Eye, Pencil, Code2, Search, Copy, Check } from 'lucide-react';
import {
  getSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  type SnippetSummary,
} from '../../api';
import { highlightCode, SUPPORTED_LANGUAGES } from '../../utils/highlight';

const LAST_SNIPPET_KEY = 'snippets_last_snippet_id';
const SAVE_DELAY = 800;

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const SnippetsApp: React.FC = () => {
  const [snippets, setSnippets] = useState<SnippetSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(false);

  const fetchSnippets = () => {
    getSnippets()
      .then(list => {
        setSnippets(list);
        setError(null);
        setSelectedId(prev => {
          if (prev && list.some(s => s.id === prev)) return prev;
          const stored = localStorage.getItem(LAST_SNIPPET_KEY);
          if (stored && list.some(s => s.id === stored)) return stored;
          return list[0]?.id ?? null;
        });
      })
      .catch(() => setError('No se pudo conectar con el servidor.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSnippets();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setTitle('');
      setLanguage('plaintext');
      setTagsInput('');
      setContent('');
      return;
    }
    localStorage.setItem(LAST_SNIPPET_KEY, selectedId);
    skipNextSave.current = true;
    getSnippet(selectedId)
      .then(snippet => {
        setTitle(snippet.title);
        setLanguage(snippet.language);
        setTagsInput(snippet.tags.join(', '));
        setContent(snippet.content);
        setError(null);
      })
      .catch(() => setError('No se pudo cargar el snippet.'));
  }, [selectedId]);

  // Debounced autosave whenever title/language/tags/content change (but not on snippet switch).
  useEffect(() => {
    if (!selectedId) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      updateSnippet(selectedId, { title, language, content, tags })
        .then(updated => {
          setSnippets(prev => prev.map(s => s.id === selectedId
            ? { ...s, title: updated.title, language: updated.language, tags: updated.tags, updatedAt: updated.updatedAt }
            : s));
        })
        .catch(() => setError('No se pudo guardar el snippet.'));
    }, SAVE_DELAY);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, language, tagsInput, content]);

  const handleCreate = async () => {
    try {
      const snippet = await createSnippet({});
      setSnippets(prev => [{ id: snippet.id, title: snippet.title, language: snippet.language, tags: snippet.tags, createdAt: snippet.createdAt, updatedAt: snippet.updatedAt }, ...prev]);
      setSelectedId(snippet.id);
      setMode('edit');
    } catch {
      setError('No se pudo crear el snippet.');
    }
  };

  const handleDelete = async (id: string) => {
    const previous = snippets;
    const remaining = snippets.filter(s => s.id !== id);
    setSnippets(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
    try {
      await deleteSnippet(id);
    } catch {
      setError('No se pudo eliminar el snippet.');
      setSnippets(previous);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('No se pudo copiar al portapapeles.');
    }
  };

  const allLanguages = Array.from(new Set(snippets.map(s => s.language))).sort();

  const filteredSnippets = snippets.filter(s => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || s.title.toLowerCase().includes(query) || s.tags.some(t => t.toLowerCase().includes(query));
    const matchesLanguage = !languageFilter || s.language === languageFilter;
    return matchesQuery && matchesLanguage;
  });

  return (
    <div className="w-full h-full flex text-white">
      {/* Sidebar */}
      <div className="w-60 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="p-2 border-b border-zinc-800 space-y-2">
          <button
            onClick={handleCreate}
            className="w-full px-2 py-1.5 bg-os-pink/10 border border-os-pink text-os-pink rounded-md hover:bg-os-pink/20 text-sm flex items-center justify-center"
          >
            <Plus size={14} className="mr-1" /> Nuevo snippet
          </button>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por título o tag..."
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded-md pl-6 pr-2 py-1 text-xs outline-none"
            />
          </div>
          <select
            value={languageFilter}
            onChange={e => setLanguageFilter(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded-md px-2 py-1 text-xs outline-none"
          >
            <option value="">Todos los lenguajes</option>
            {allLanguages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-3 text-xs text-zinc-500">Cargando...</p>
          ) : filteredSnippets.length === 0 ? (
            <p className="p-3 text-xs text-zinc-500">Sin snippets todavía.</p>
          ) : (
            filteredSnippets.map(snippet => (
              <div
                key={snippet.id}
                onClick={() => setSelectedId(snippet.id)}
                className={`group px-3 py-2 border-b border-zinc-800/50 cursor-pointer flex items-start justify-between ${
                  snippet.id === selectedId ? 'bg-os-pink/10 border-l-2 border-l-os-pink' : 'hover:bg-zinc-900'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{snippet.title || 'Sin título'}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">{snippet.language}</span>
                    {snippet.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-os-pink/10 text-os-pink truncate">{tag}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{formatDate(snippet.updatedAt)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(snippet.id); }}
                  className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
                  title="Eliminar snippet"
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
            <Code2 size={28} className="mb-2 opacity-50" />
            Selecciona o crea un snippet.
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-zinc-800 flex flex-wrap items-center gap-2">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título"
                className="flex-1 min-w-[120px] bg-transparent text-lg font-semibold outline-none border-b border-transparent focus:border-os-pink"
              />
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded-md px-2 py-1 text-xs outline-none"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <input
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="tags, separadas, por, comas"
                className="bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded-md px-2 py-1 text-xs outline-none w-48"
              />
              <button
                onClick={handleCopy}
                className="px-2 py-1 text-xs border border-zinc-700 text-zinc-300 rounded-md hover:border-os-pink hover:text-os-pink flex items-center"
                title="Copiar al portapapeles"
              >
                {copied ? <Check size={13} className="mr-1 text-green-400" /> : <Copy size={13} className="mr-1" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
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
                  placeholder="Pega o escribe tu snippet..."
                  spellCheck={false}
                  className="w-full h-full bg-transparent outline-none resize-none font-mono text-sm text-zinc-200 leading-relaxed"
                />
              ) : (
                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  <code dangerouslySetInnerHTML={{ __html: highlightCode(content, language) }} />
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
