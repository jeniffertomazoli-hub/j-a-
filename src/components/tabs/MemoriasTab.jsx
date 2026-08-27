import React, { useState, useEffect } from 'react';
import {
  buscarMemorias,
  salvarMemoria,
  uploadImagemMemoria,
  excluirMemoria,
  getTodayDateString,
  subscribeToTable,
} from '../../lib/supabase';
import { compressImage } from '../../lib/imageUtils';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';

const MARCADORES = [
  '💕 Especial',
  '✈️ Viagem',
  '🎂 Aniversário',
  '🏡 Dia a dia',
  '🎉 Comemoração',
  '🍕 Date & Comida',
];

function formatarDataCompleta(dataStr) {
  if (!dataStr) return '';
  const d = new Date(dataStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export default function MemoriasTab({ quemSouEu, settings }) {
  const toast = useToast();
  const meuNome = quemSouEu === 'parceiro1' ? settings.apelido1 : settings.apelido2;

  const [loading, setLoading] = useState(true);
  const [memorias, setMemorias] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [statusUpload, setStatusUpload] = useState('');

  // Form fields
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(getTodayDateString());
  const [marcador, setMarcador] = useState(MARCADORES[0]);
  const [link, setLink] = useState('');
  const [arquivoImagem, setArquivoImagem] = useState(null);
  const [previewImagem, setPreviewImagem] = useState(null);

  // Modais
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [imageModalUrl, setImageModalUrl] = useState(null);

  useEffect(() => {
    carregar();
    const unsub = subscribeToTable('memorias', () => carregar());
    return () => unsub();
  }, []);

  async function carregar() {
    try {
      const dataRes = await buscarMemorias();
      setMemorias(dataRes);
    } catch (err) {
      console.error('Erro ao carregar memórias:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoImagem(file);
      setPreviewImagem(URL.createObjectURL(file));
    }
  }

  async function handleSalvar() {
    if (!titulo.trim()) {
      toast.error('Informe um título para a memória!');
      return;
    }

    setSalvando(true);
    try {
      let imagemUrl = null;

      if (arquivoImagem) {
        setStatusUpload('Otimizando imagem...');
        const compressed = await compressImage(arquivoImagem);

        setStatusUpload('Enviando para a nuvem...');
        imagemUrl = await uploadImagemMemoria(compressed);
      }

      setStatusUpload('Guardando na cápsula...');
      await salvarMemoria({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data,
        marcador,
        criado_por: meuNome,
        link: link.trim() && isValidHttpUrl(link.trim()) ? link.trim() : null,
        imagem_url: imagemUrl,
      });

      // Reset
      setTitulo('');
      setDescricao('');
      setLink('');
      setArquivoImagem(null);
      setPreviewImagem(null);
      setShowForm(false);

      toast.love('Memória guardada com muito amor! 📸💜');
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Não consegui guardar a memória agora. Tente de novo!');
    } finally {
      setSalvando(false);
      setStatusUpload('');
    }
  }

  async function handleConfirmDelete() {
    if (!deleteModal.id) return;
    try {
      await excluirMemoria(deleteModal.id);
      toast.success('Memória removida.');
      setDeleteModal({ isOpen: false, id: null });
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover memória.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-md mx-auto pb-12 animate-fadeIn">
      <p className="badge-brut bg-cyan text-ink mb-2">Cápsula do Tempo 📸</p>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-4">
        Nossas Memórias
      </h1>

      <button
        onClick={() => setShowForm((prev) => !prev)}
        className="btn-brut w-full py-3 bg-white text-ink text-xs font-black mb-5 shadow-brut"
      >
        {showForm ? '✕ Fechar Formulário' : '+ Guardar Nova Memória'}
      </button>

      {/* Formulário de Nova Memória */}
      {showForm && (
        <div className="card-brut p-4 space-y-3 mb-6 shadow-brut animate-popIn">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título do momento (Ex: Nossa viagem para a praia)"
            className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs font-bold shadow-brutsm placeholder:text-ink/40"
          />

          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Conte um pouco de como foi esse dia especial..."
            rows={3}
            className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs resize-none font-medium shadow-brutsm placeholder:text-ink/40"
          />

          <div className="flex gap-2">
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="flex-1 rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs font-bold shadow-brutsm"
            />
            <select
              value={marcador}
              onChange={(e) => setMarcador(e.target.value)}
              className="flex-1 rounded-xl border-3 border-ink px-2 py-2 outline-none bg-white text-xs font-bold shadow-brutsm"
            >
              {MARCADORES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link (Google Drive, vídeo no YouTube, playlist do Spotify) — opcional"
            className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs font-medium shadow-brutsm placeholder:text-ink/40"
          />

          {/* Upload de Foto */}
          <div>
            <label className="block text-[10px] font-black uppercase text-ink/70 mb-1">
              Foto do Momento (comprimida automaticamente)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full text-xs font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-2 file:border-ink file:bg-yellow file:text-ink file:font-black file:text-[10px]"
            />
            {previewImagem && (
              <img
                src={previewImagem}
                alt="Prévia"
                className="mt-2.5 w-full max-h-48 object-cover rounded-xl border-3 border-ink shadow-brutsm"
              />
            )}
          </div>

          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="btn-brut w-full py-2.5 bg-cyan text-ink text-xs font-black disabled:opacity-50 shadow-brut"
          >
            {salvando ? statusUpload || 'Guardando...' : '💜 Guardar Memória'}
          </button>
        </div>
      )}

      {/* Feed de Memórias */}
      <div className="space-y-4">
        {memorias.length === 0 ? (
          <div className="card-brut p-8 text-center">
            <p className="text-xs text-ink/60 font-bold">
              Nenhuma memória guardada ainda. Registre a primeira foto ou história! 📸
            </p>
          </div>
        ) : (
          memorias.map((item) => (
            <div
              key={item.id}
              className="card-brut p-4 relative overflow-hidden shadow-brut"
            >
              <button
                onClick={() => setDeleteModal({ isOpen: true, id: item.id })}
                className="absolute top-3 right-3 text-ink/30 hover:text-pink font-black text-sm z-10 w-6 h-6 rounded-full flex items-center justify-center hover:bg-ink/5"
                aria-label="Excluir memória"
              >
                ✕
              </button>

              {item.imagem_url && (
                <div
                  onClick={() => setImageModalUrl(item.imagem_url)}
                  className="cursor-pointer"
                >
                  <img
                    src={item.imagem_url}
                    alt={item.titulo}
                    className="w-full max-h-60 object-cover rounded-xl border-3 border-ink mb-3 shadow-brutsm hover:opacity-95 transition"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <span className="badge-brut bg-purple text-ink text-[9px]">
                  {formatarDataCompleta(item.data)} · {item.marcador}
                </span>
              </div>

              <h3 className="font-display text-lg font-bold text-ink pr-6 leading-snug">
                {item.titulo}
              </h3>

              {item.descricao && (
                <p className="text-xs text-ink/80 font-medium mt-1.5 leading-relaxed">
                  {item.descricao}
                </p>
              )}

              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2.5 text-xs font-black text-royal underline break-all"
                >
                  🔗 Acessar link da memória
                </a>
              )}

              {item.criado_por && (
                <p className="text-[9px] text-ink/40 font-bold mt-2">
                  Guardado por {item.criado_por}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de Exclusão */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Excluir Memória"
        badgeText="Atenção"
        badgeColor="bg-pink"
        confirmText="Sim, Excluir"
        onConfirm={handleConfirmDelete}
        isDestructive={true}
      >
        <p>Você deseja excluir esta memória? Essa ação não pode ser desfeita.</p>
      </Modal>

      {/* Modal de Imagem em Tamanho Cheio */}
      {imageModalUrl && (
        <div
          onClick={() => setImageModalUrl(null)}
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-2xl max-h-[90vh]">
            <img
              src={imageModalUrl}
              alt="Foto cheia"
              className="rounded-2xl border-3 border-ink shadow-brut max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
