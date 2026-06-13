import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Check, Pencil, X, ExternalLink, Link as LinkIcon } from 'lucide-react';
import {
  getShortLinks,
  createShortLink,
  updateShortLink,
  deleteShortLink,
  type ShortLink,
} from '../../api';

const SHORT_DOMAIN = 'short.aifusp.dev';

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const ShortenerApp: React.FC = () => {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetUrl, setTargetUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTargetUrl, setEditTargetUrl] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const fetchLinks = () => {
    getShortLinks()
      .then(data => {
        setLinks(data);
        setError(null);
      })
      .catch(() => setError('No se pudo conectar con el servidor.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = targetUrl.trim();
    if (!url) return;

    setCreating(true);
    setError(null);
    try {
      const link = await createShortLink({
        targetUrl: url,
        code: customCode.trim() || undefined,
        title: title.trim() || undefined,
      });
      setLinks(prev => [link, ...prev]);
      setTargetUrl('');
      setCustomCode('');
      setTitle('');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo crear el enlace.');
    }
    setCreating(false);
  };

  const handleCopy = (link: ShortLink) => {
    navigator.clipboard.writeText(`https://${SHORT_DOMAIN}/${link.code}`).then(() => {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const startEdit = (link: ShortLink) => {
    setEditingId(link.id);
    setEditTargetUrl(link.targetUrl);
    setEditCode(link.code);
    setEditTitle(link.title ?? '');
    setError(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async (link: ShortLink) => {
    const targetUrlTrimmed = editTargetUrl.trim();
    const codeTrimmed = editCode.trim();
    if (!targetUrlTrimmed || !codeTrimmed) return;

    try {
      const updated = await updateShortLink(link.id, {
        targetUrl: targetUrlTrimmed,
        code: codeTrimmed,
        title: editTitle.trim(),
      });
      setLinks(prev => prev.map(l => l.id === link.id ? updated : l));
      setEditingId(null);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo guardar el enlace.');
    }
  };

  const handleDelete = async (id: string) => {
    const previous = links;
    setLinks(prev => prev.filter(l => l.id !== id));
    try {
      await deleteShortLink(id);
    } catch {
      setError('No se pudo eliminar el enlace.');
      setLinks(previous);
    }
  };

  return (
    <div className="w-full h-full flex flex-col text-white">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-os-pink mb-3 flex items-center">
          <LinkIcon size={18} className="mr-2" /> Acortador de enlaces
        </h2>

        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <input
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://ejemplo.com/url-larga"
            className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded-md px-3 py-1.5 text-sm outline-none"
            required
          />
          <input
            value={customCode}
            onChange={e => setCustomCode(e.target.value)}
            placeholder="código (opcional)"
            className="w-40 bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded-md px-3 py-1.5 text-sm outline-none"
          />
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="título (opcional)"
            className="w-48 bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded-md px-3 py-1.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-3 py-1.5 bg-os-pink/10 border border-os-pink text-os-pink rounded-md hover:bg-os-pink/20 text-sm flex items-center disabled:opacity-50"
          >
            <Plus size={14} className="mr-1" /> Crear
          </button>
        </form>

        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Cargando...</div>
        ) : links.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            Todavía no has creado ningún enlace.
          </div>
        ) : (
          links.map(link => (
            <div key={link.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              {editingId === link.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-sm shrink-0">{SHORT_DOMAIN}/</span>
                    <input
                      value={editCode}
                      onChange={e => setEditCode(e.target.value)}
                      className="bg-zinc-800 border border-os-pink rounded px-2 py-1 text-sm outline-none flex-1"
                    />
                  </div>
                  <input
                    value={editTargetUrl}
                    onChange={e => setEditTargetUrl(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded px-2 py-1 text-sm outline-none"
                  />
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="título (opcional)"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-os-pink rounded px-2 py-1 text-sm outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 text-sm text-zinc-400 border border-zinc-700 rounded-md hover:bg-zinc-800 flex items-center"
                    >
                      <X size={14} className="mr-1" /> Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveEdit(link)}
                      className="px-3 py-1 text-sm bg-os-pink/10 border border-os-pink text-os-pink rounded-md hover:bg-os-pink/20"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    {link.title && (
                      <p className="text-sm font-medium text-zinc-200 truncate">{link.title}</p>
                    )}
                    <a
                      href={`https://${SHORT_DOMAIN}/${link.code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-os-pink text-sm font-mono hover:underline flex items-center gap-1"
                    >
                      {SHORT_DOMAIN}/{link.code} <ExternalLink size={11} />
                    </a>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{link.targetUrl}</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      {link.clicks} clic{link.clicks === 1 ? '' : 's'} · creado el {formatDate(link.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(link)}
                      title="Copiar enlace"
                      className="p-1.5 text-zinc-400 hover:text-os-pink rounded-md hover:bg-zinc-800"
                    >
                      {copiedId === link.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => startEdit(link)}
                      title="Editar"
                      className="p-1.5 text-zinc-400 hover:text-os-pink rounded-md hover:bg-zinc-800"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      title="Eliminar"
                      className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-zinc-800"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
