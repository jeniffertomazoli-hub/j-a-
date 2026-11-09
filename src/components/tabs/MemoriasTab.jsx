import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  buscarMemorias,
  buscarPostsFeed,
  salvarMemoria,
  uploadImagemMemoria,
  excluirMemoria,
  getTodayDateString,
  subscribeToTable,
} from '../../lib/supabase';
import { compressImage } from '../../lib/imageUtils';
import { playChimeSound } from '../../lib/notifications';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';

// -------------------------------------------------------------
// CATEGORIAS / ÁLBUNS TEMÁTICOS (PÍLULAS DE FILTRO RÁPIDO)
// -------------------------------------------------------------
export const CATEGORIAS_FOTOS = [
  { id: 'Todos', label: 'Todas as Fotos', emoji: '✨' },
  { id: '💕 Especial', label: 'Especiais', emoji: '💕' },
  { id: '✈️ Viagem', label: 'Viagens', emoji: '✈️' },
  { id: '🎂 Aniversário', label: 'Aniversários', emoji: '🎂' },
  { id: '🍕 Date & Comida', label: 'Dates & Comidas', emoji: '🍕' },
  { id: '🏡 Dia a dia', label: 'Dia a Dia', emoji: '🏡' },
  { id: '🎉 Comemoração', label: 'Comemorações', emoji: '🎉' },
];

// -------------------------------------------------------------
// OPÇÕES DE FITAS ADESIVAS (WASHI TAPES)
// -------------------------------------------------------------
const WASHI_TAPES = [
  { id: 'tape-pink', nome: 'Rosa Doce', bg: 'bg-[#FF85B3]/90', label: '🌸 Rosa' },
  { id: 'tape-yellow', nome: 'Amarelo Sol', bg: 'bg-[#FFD93D]/95', label: '☀️ Amarelo' },
  { id: 'tape-mint', nome: 'Menta Pastel', bg: 'bg-[#6EE7B7]/90', label: '🌿 Menta' },
  { id: 'tape-purple', nome: 'Lavanda Amor', bg: 'bg-[#A78BFA]/90', label: '💜 Lavanda' },
  { id: 'tape-peach', nome: 'Pêssego Fofo', bg: 'bg-[#FDBA74]/90', label: '🍑 Pêssego' },
  { id: 'tape-cyan', nome: 'Azul Céu', bg: 'bg-[#67E8F9]/90', label: '🌊 Azul' },
];

// -------------------------------------------------------------
// ADESIVOS / STICKERS DECORATIVOS
// -------------------------------------------------------------
const STICKERS_FOTOS = [
  { emoji: '💖', label: 'Amor' },
  { emoji: '✨', label: 'Brilho' },
  { emoji: '🧸', label: 'Fofura' },
  { emoji: '🌸', label: 'Flor' },
  { emoji: '✈️', label: 'Viagem' },
  { emoji: '🍕', label: 'Date' },
  { emoji: '🎂', label: 'Festa' },
  { emoji: '🥂', label: 'Brinde' },
  { emoji: '📸', label: 'Foto' },
  { emoji: '💌', label: 'Carta' },
  { emoji: '👑', label: 'Realeza' },
  { emoji: '💍', label: 'Para Sempre' },
];

function formatarDataCompleta(dataStr) {
  if (!dataStr) return '';
  const d = new Date(dataStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dataStr;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function calcularTempoPassado(dataStr) {
  if (!dataStr) return '';
  const partes = dataStr.split('-');
  if (partes.length < 3) return '';
  const dataMem = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffDias = Math.floor((hoje - dataMem) / (1000 * 60 * 60 * 24));
  if (diffDias === 0) return 'Hoje! ✨';
  if (diffDias === 1) return 'Ontem';
  if (diffDias < 30) return `Há ${diffDias} dias`;
  const diffMeses = Math.floor(diffDias / 30);
  if (diffMeses < 12) return diffMeses === 1 ? 'Há 1 mês' : `Há ${diffMeses} meses`;
  const diffAnos = Math.floor(diffDias / 365);
  return diffAnos === 1 ? 'Há 1 ano 💜' : `Há ${diffAnos} anos 💜`;
}

export default function MemoriasTab({ quemSouEu, settings }) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings?.apelido1 || 'Jeniffer' : settings?.apelido2 || 'Alvaro';

  const [loading, setLoading] = useState(true);
  const [memorias, setMemorias] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [incluirFeed, setIncluirFeed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [statusUpload, setStatusUpload] = useState('');

  // Formulário de Nova Foto
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(getTodayDateString());
  const [marcador, setMarcador] = useState(CATEGORIAS_FOTOS[1].id);
  const [link, setLink] = useState('');
  const [selectedTape, setSelectedTape] = useState(WASHI_TAPES[0].id);
  const [selectedSticker, setSelectedSticker] = useState('💖');
  const [arquivoImagem, setArquivoImagem] = useState(null);
  const [previewImagem, setPreviewImagem] = useState(null);

  // Modais
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [lightbox, setLightbox] = useState({ isOpen: false, index: 0, fotos: [] });

  const touchStartX = useRef(null);

  useEffect(() => {
    carregar();
    const unsub1 = subscribeToTable('memorias', () => carregar());
    const unsub2 = subscribeToTable('feed_posts', () => carregar());
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  async function carregar() {
    try {
      const [dataMem, dataFeed] = await Promise.all([
        buscarMemorias(),
        buscarPostsFeed(60).catch(() => []),
      ]);
      setMemorias(dataMem || []);
      setFeedPosts(dataFeed || []);
    } catch (err) {
      console.error('Erro ao carregar fotos:', err);
    } finally {
      setLoading(false);
    }
  }

  // Navegação no Lightbox por Teclado (Setas ← e →)
  useEffect(() => {
    if (!lightbox.isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'ArrowRight') handleNextFoto();
      if (e.key === 'ArrowLeft') handlePrevFoto();
      if (e.key === 'Escape') handleFecharLightbox();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox.isOpen, lightbox.index, lightbox.fotos]);

  // Gestos de Deslize (Swipe) no Celular para o Lightbox
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX.current - touchEndX;

    if (diffX > 45) {
      handleNextFoto();
    } else if (diffX < -45) {
      handlePrevFoto();
    }
    touchStartX.current = null;
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoImagem(file);
      setPreviewImagem(URL.createObjectURL(file));
    }
  }

  function handleRemoverFotoForm() {
    setArquivoImagem(null);
    setPreviewImagem(null);
  }

  function handleAbrirLightbox(fotoItem, lista) {
    const idx = lista.findIndex((f) => f.id === fotoItem.id);
    setLightbox({
      isOpen: true,
      index: idx >= 0 ? idx : 0,
      fotos: lista,
    });
  }

  function handleFecharLightbox() {
    setLightbox({ isOpen: false, index: 0, fotos: [] });
  }

  function handlePrevFoto() {
    setLightbox((prev) => {
      if (!prev.fotos || prev.fotos.length === 0) return prev;
      const novoIndex = (prev.index - 1 + prev.fotos.length) % prev.fotos.length;
      return { ...prev, index: novoIndex };
    });
  }

  function handleNextFoto() {
    setLightbox((prev) => {
      if (!prev.fotos || prev.fotos.length === 0) return prev;
      const novoIndex = (prev.index + 1) % prev.fotos.length;
      return { ...prev, index: novoIndex };
    });
  }

  async function handleSalvarFoto() {
    if (!titulo.trim()) {
      toast.error('Dê um título especial para este momento!');
      return;
    }

    setSalvando(true);
    try {
      let imagemUrl = null;

      if (arquivoImagem) {
        setStatusUpload('Otimizando foto...');
        const compressed = await compressImage(arquivoImagem);

        setStatusUpload('Enviando foto para a nuvem...');
        imagemUrl = await uploadImagemMemoria(compressed);
      }

      setStatusUpload('Guardando na galeria...');
      const emojisArray = [selectedSticker, selectedTape];

      await salvarMemoria({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data,
        marcador,
        emojis: emojisArray,
        criado_por: meuNome,
        link: link.trim() || null,
        imagem_url: imagemUrl,
      });

      playChimeSound();
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#FF4D97', '#FFD93D', '#2F3FE0', '#33DDF3', '#A78BFA'],
      });

      setTitulo('');
      setDescricao('');
      setLink('');
      setArquivoImagem(null);
      setPreviewImagem(null);
      setShowForm(false);

      toast.love('Foto salva na Galeria com muito amor! 📸💖');
      await carregar();
    } catch (err) {
      console.error(err);
      toast.error('Não consegui salvar a foto agora. Tente de novo!');
    } finally {
      setSalvando(false);
      setStatusUpload('');
    }
  }

  async function handleConfirmDelete() {
    if (!deleteModal.id) return;
    try {
      await excluirMemoria(deleteModal.id);
      toast.success('Foto removida da galeria.');
      setDeleteModal({ isOpen: false, id: null });
      if (lightbox.isOpen && lightbox.fotos[lightbox.index]?.id === deleteModal.id) {
        handleFecharLightbox();
      }
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir foto.');
    }
  }

  // Lista de Fotos da Galeria Completa
  const fotosDaGaleria = useMemo(() => {
    let itens = memorias.filter((m) => Boolean(m.imagem_url));

    if (filtroCategoria && filtroCategoria !== 'Todos') {
      itens = itens.filter((m) => m.marcador === filtroCategoria);
    }

    let listaMapeada = itens.map((m) => ({
      id: m.id,
      titulo: m.titulo,
      descricao: m.descricao,
      data: m.data,
      marcador: m.marcador,
      imagem_url: m.imagem_url,
      link: m.link,
      criado_por: m.criado_por,
      emojis: m.emojis || ['💖', 'tape-pink'],
      tipo: 'memoria',
    }));

    if (incluirFeed && (filtroCategoria === 'Todos' || filtroCategoria === '📸 Feed')) {
      const feedComFoto = feedPosts
        .filter((p) => Boolean(p.foto_url))
        .map((p) => ({
          id: `feed-${p.id}`,
          feedId: p.id,
          titulo: p.texto ? (p.texto.length > 50 ? p.texto.slice(0, 50) + '...' : p.texto) : 'Foto do Feed',
          descricao: p.texto,
          data: p.criado_em ? p.criado_em.slice(0, 10) : '',
          marcador: '📸 Feed',
          imagem_url: p.foto_url,
          criado_por: p.autor_nome,
          emojis: ['📸', 'tape-pink'],
          tipo: 'feed',
        }));
      listaMapeada = [...listaMapeada, ...feedComFoto];
    }

    listaMapeada.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
    return listaMapeada;
  }, [memorias, feedPosts, filtroCategoria, incluirFeed]);

  const totalFotosSalvas = memorias.filter((m) => Boolean(m.imagem_url)).length;
  const fitaAtivaObj = WASHI_TAPES.find((w) => w.id === selectedTape) || WASHI_TAPES[0];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 pt-4 max-w-xl mx-auto pb-16 animate-fadeIn w-full overflow-hidden">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-pink text-ink text-[10px]">
          Galeria de Fotos 📸
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings?.apelido1} & {settings?.apelido2}
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            Galeria do Casal
          </h1>
          <p className="text-xs text-white/80 font-medium">
            Nossas fotos salvas reunidas em uma galeria linda.
          </p>
        </div>

        <span className="badge-brut bg-yellow text-ink text-xs font-black shrink-0 shadow-brutsm">
          📸 {totalFotosSalvas} {totalFotosSalvas === 1 ? 'foto' : 'fotos'}
        </span>
      </div>

      {/* Botão de Ação: Adicionar Foto */}
      <button
        onClick={() => setShowForm((prev) => !prev)}
        className="btn-brut w-full py-3 bg-yellow text-ink text-xs sm:text-sm font-black mb-4 shadow-brut flex items-center justify-center gap-2 hover:scale-101 active:scale-98 transition"
      >
        <span>{showForm ? '✕' : '✨'}</span>
        <span>{showForm ? 'Fechar Envio' : '+ Adicionar Foto na Galeria 💕'}</span>
      </button>

      {/* ========================================================= */}
      {/* FORMULÁRIO DE NOVA FOTO                                   */}
      {/* ========================================================= */}
      {showForm && (
        <div className="card-brut p-4 sm:p-5 mb-5 shadow-brut bg-white animate-popIn space-y-4">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">📷</span>
              <div>
                <h3 className="font-display font-extrabold text-sm text-ink leading-tight">
                  Nova Foto
                </h3>
                <p className="text-[10px] text-ink/60 font-bold">
                  Escolha uma foto especial e guarde na galeria do casal!
                </p>
              </div>
            </div>
            <span className="badge-brut bg-cyan text-ink text-[9px]">
              {meuNome}
            </span>
          </div>

          {/* 1. SELEÇÃO DA FOTO */}
          <div>
            <label className="block text-[11px] font-black uppercase text-ink mb-1.5 flex items-center gap-1">
              <span>🖼️</span> 1. Escolha a Foto:
            </label>
            <div className="flex items-center gap-2">
              <label className="btn-brut px-3.5 py-2 bg-yellow text-ink text-xs font-black cursor-pointer shadow-brutsm hover:bg-yellow/90">
                <span>📁 Escolher Arquivo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              {previewImagem && (
                <button
                  type="button"
                  onClick={handleRemoverFotoForm}
                  className="text-[11px] font-black text-pink hover:underline"
                >
                  ✕ Remover Foto
                </button>
              )}
            </div>
          </div>

          {/* Prévia da Foto */}
          {previewImagem && (
            <div>
              <p className="text-[10px] font-black uppercase text-ink/60 mb-1.5">
                Pré-visualização:
              </p>
              <div className="aspect-video max-h-48 rounded-xl border-2 border-ink overflow-hidden bg-ink/5 flex items-center justify-center relative">
                <img
                  src={previewImagem}
                  alt="Prévia"
                  className="w-full h-full object-cover"
                />
                <span className="sticker-stamp absolute bottom-2 right-2 text-2xl drop-shadow">
                  {selectedSticker}
                </span>
              </div>
            </div>
          )}

          {/* 2. ADESIVO / EMOJI */}
          <div>
            <label className="block text-[11px] font-black uppercase text-ink mb-1.5 flex items-center gap-1">
              <span>🏷️</span> 2. Adesivo Decorativo:
            </label>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {STICKERS_FOTOS.map((stk) => {
                const isSelected = selectedSticker === stk.emoji;
                return (
                  <button
                    key={stk.emoji}
                    type="button"
                    onClick={() => setSelectedSticker(stk.emoji)}
                    className={`w-9 h-9 rounded-xl border-2 border-ink flex items-center justify-center text-lg shrink-0 transition ${
                      isSelected
                        ? 'bg-yellow shadow-brut scale-110'
                        : 'bg-white hover:bg-yellow/30 shadow-brutsm'
                    }`}
                    title={stk.label}
                  >
                    {stk.emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. CAMPOS ESCRITOS */}
          <div className="space-y-2.5">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da foto (ex: Nosso Date na Praia) *"
              className="w-full rounded-xl border-3 border-ink px-3 py-2.5 outline-none bg-white text-xs font-bold shadow-brutsm placeholder:text-ink/40"
            />

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Escreva um bilhetinho sobre esse momento... (opcional)"
              rows={2}
              className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs resize-none font-medium shadow-brutsm placeholder:text-ink/40"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-black uppercase text-ink/70 mb-0.5">
                  Data do Momento:
                </label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full rounded-xl border-3 border-ink px-2.5 py-2 outline-none bg-white text-xs font-bold shadow-brutsm"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-ink/70 mb-0.5">
                  Categoria:
                </label>
                <select
                  value={marcador}
                  onChange={(e) => setMarcador(e.target.value)}
                  className="w-full rounded-xl border-3 border-ink px-2 py-2 outline-none bg-white text-xs font-bold shadow-brutsm"
                >
                  {CATEGORIAS_FOTOS.filter((a) => a.id !== 'Todos').map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link especial (música no Spotify, vídeo no Drive, etc) — opcional"
              className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs font-medium shadow-brutsm placeholder:text-ink/40"
            />
          </div>

          {/* BOTÃO SALVAR */}
          <button
            onClick={handleSalvarFoto}
            disabled={salvando}
            className="btn-brut w-full py-3 bg-pink text-white text-xs sm:text-sm font-black disabled:opacity-50 shadow-brut flex items-center justify-center gap-2 hover:bg-pink/90 transition"
          >
            <span>{salvando ? '⏳' : '📌'}</span>
            <span>{salvando ? statusUpload || 'Guardando na Galeria...' : 'Salvar Foto na Galeria 💕'}</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* FILTROS RÁPIDOS POR CATEGORIA (PÍLULAS COMPACTAS)         */}
      {/* ========================================================= */}
      <div className="space-y-2 mb-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIAS_FOTOS.map((cat) => {
            const isActive = filtroCategoria === cat.id;
            const count =
              cat.id === 'Todos'
                ? totalFotosSalvas
                : memorias.filter((m) => m.marcador === cat.id && Boolean(m.imagem_url)).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFiltroCategoria(cat.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black border-2 border-ink transition whitespace-nowrap shadow-brutsm flex items-center gap-1 shrink-0 ${
                  isActive
                    ? 'bg-yellow text-ink scale-102 font-black'
                    : 'bg-white text-ink/75 hover:bg-yellow/20'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span className="opacity-60 text-[9px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Toggle Opcional: Incluir Fotos do Feed */}
        <div className="flex items-center justify-between bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
          <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
            <span>📸</span> Incluir fotos postadas no Feed
          </span>
          <button
            type="button"
            onClick={() => setIncluirFeed((prev) => !prev)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border-2 border-ink transition shadow-brutsm ${
              incluirFeed ? 'bg-yellow text-ink' : 'bg-white/40 text-white'
            }`}
          >
            {incluirFeed ? 'Ativado ✓' : 'Desativado'}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* GRADE DE FOTOS DA GALERIA                                 */}
      {/* ========================================================= */}
      {fotosDaGaleria.length === 0 ? (
        <div className="card-brut p-8 text-center bg-white shadow-brut space-y-2">
          <p className="text-4xl py-1">🖼️✨</p>
          <h4 className="font-display font-extrabold text-sm text-ink">
            Nenhuma foto nesta categoria ainda!
          </h4>
          <p className="text-xs text-ink/70 font-semibold max-w-xs mx-auto">
            Toque no botão amarelo acima para adicionar fotos e criar uma galeria inesquecível.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {fotosDaGaleria.map((item, index) => (
            <div
              key={item.id}
              onClick={() => handleAbrirLightbox(item, fotosDaGaleria)}
              className="card-brut p-1.5 sm:p-2 bg-white shadow-brutsm cursor-pointer hover:scale-[1.03] active:scale-95 transition relative group overflow-hidden border-2 sm:border-3 border-ink"
            >
              <div className="aspect-square rounded-lg border-2 border-ink overflow-hidden bg-ink/5 relative flex items-center justify-center">
                <img
                  src={item.imagem_url}
                  alt={item.titulo}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy"
                />

                {/* Sticker Decorativo */}
                <span className="sticker-stamp absolute top-1 right-1 text-xl sm:text-2xl pointer-events-none drop-shadow">
                  {item.emojis?.[0] || '💖'}
                </span>

                {/* Legenda Degradê ao Pé da Foto */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent p-1.5 pt-4 text-white pointer-events-none">
                  <p className="font-display font-black text-[11px] truncate leading-tight">
                    {item.titulo}
                  </p>
                  <p className="text-[9px] text-white/80 font-bold">
                    {formatarDataCompleta(item.data)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* LIGHTBOX / VISUALIZADOR DE FOTOS EM TELA CHEIA            */}
      {/* ========================================================= */}
      {lightbox.isOpen && lightbox.fotos.length > 0 && (
        <div
          onClick={handleFecharLightbox}
          className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 select-none animate-fadeIn overflow-y-auto"
        >
          {/* Barra Superior */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between gap-2 max-w-xl w-full mx-auto pb-2"
          >
            <span className="badge-brut bg-yellow text-ink text-[11px] font-black shadow-brutsm">
              📸 Foto {lightbox.index + 1} de {lightbox.fotos.length}
            </span>

            <button
              onClick={handleFecharLightbox}
              className="btn-brut px-3 py-1 bg-white text-ink text-xs font-black shadow-brutsm hover:bg-pink hover:text-white transition active:scale-95"
            >
              ✕ Fechar
            </button>
          </div>

          {/* Área Central: Foto com Setas ◀ e ▶ */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-between max-w-2xl w-full mx-auto my-auto gap-2 py-2"
          >
            {/* Seta Anterior */}
            <button
              onClick={handlePrevFoto}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-3 border-ink bg-white text-ink flex items-center justify-center font-black text-base sm:text-xl shadow-brut hover:bg-yellow active:scale-90 transition shrink-0 z-20"
              title="Foto anterior (Seta esquerda ←)"
            >
              ◀
            </button>

            {/* Imagem Ampliada com Suporte a Deslize (Swipe) */}
            <div
              className="flex-1 flex items-center justify-center relative max-h-[55vh] px-1"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={lightbox.fotos[lightbox.index]?.imagem_url}
                alt={lightbox.fotos[lightbox.index]?.titulo}
                className="max-h-[52vh] max-w-full rounded-2xl border-3 border-ink object-contain shadow-brut bg-white/5"
              />
              <span className="sticker-stamp absolute bottom-2 right-4 text-3xl sm:text-4xl pointer-events-none drop-shadow">
                {lightbox.fotos[lightbox.index]?.emojis?.[0] || '💖'}
              </span>
            </div>

            {/* Seta Próxima */}
            <button
              onClick={handleNextFoto}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-3 border-ink bg-white text-ink flex items-center justify-center font-black text-base sm:text-xl shadow-brut hover:bg-yellow active:scale-90 transition shrink-0 z-20"
              title="Próxima foto (Seta direita →)"
            >
              ▶
            </button>
          </div>

          {/* Painel Inferior de Informações */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-brut p-3 sm:p-4 bg-white max-w-xl w-full mx-auto space-y-2 shadow-brut text-ink mt-2"
          >
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="badge-brut bg-yellow text-ink text-[10px] font-black">
                  📅 {formatarDataCompleta(lightbox.fotos[lightbox.index]?.data)}
                </span>
                {calcularTempoPassado(lightbox.fotos[lightbox.index]?.data) && (
                  <span className="badge-brut bg-pink/20 text-ink text-[10px] font-black">
                    ⏳ {calcularTempoPassado(lightbox.fotos[lightbox.index]?.data)}
                  </span>
                )}
                <span className="badge-brut bg-cyan/30 text-ink text-[10px] font-bold">
                  {lightbox.fotos[lightbox.index]?.marcador}
                </span>
              </div>
              {lightbox.fotos[lightbox.index]?.criado_por && (
                <span className="text-[10px] text-ink/65 font-bold">
                  Por {lightbox.fotos[lightbox.index]?.criado_por}
                </span>
              )}
            </div>

            <h3 className="font-display text-base sm:text-lg font-black text-ink leading-tight">
              {lightbox.fotos[lightbox.index]?.titulo}
            </h3>

            {lightbox.fotos[lightbox.index]?.descricao && (
              <p className="text-xs text-ink/80 font-medium leading-relaxed max-h-20 overflow-y-auto bg-[#FAF7F0] p-2 rounded-xl border border-ink/10">
                {lightbox.fotos[lightbox.index]?.descricao}
              </p>
            )}

            {/* Ações da Foto */}
            <div className="flex items-center gap-2 pt-1 border-t border-ink/10">
              <a
                href={lightbox.fotos[lightbox.index]?.imagem_url}
                target="_blank"
                rel="noopener noreferrer"
                download={`foto-${lightbox.fotos[lightbox.index]?.id}.jpg`}
                className="btn-brut flex-1 py-2 px-3 bg-cyan text-ink text-xs font-black shadow-brutsm flex items-center justify-center gap-1.5 hover:bg-cyan/90 transition"
              >
                <span>📥</span>
                <span>Baixar Foto em Alta</span>
              </a>

              {lightbox.fotos[lightbox.index]?.link && (
                <a
                  href={lightbox.fotos[lightbox.index]?.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-brut py-2 px-3 bg-yellow text-ink text-xs font-black shadow-brutsm flex items-center gap-1"
                >
                  <span>🔗</span>
                  <span>Link</span>
                </a>
              )}

              {lightbox.fotos[lightbox.index]?.tipo !== 'feed' && (
                <button
                  onClick={() => {
                    setDeleteModal({ isOpen: true, id: lightbox.fotos[lightbox.index]?.id });
                  }}
                  className="btn-brut px-3 py-2 bg-white text-pink text-xs font-black shadow-brutsm hover:bg-pink hover:text-white transition"
                  title="Excluir da Galeria"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                          */}
      {/* ========================================================= */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Remover Foto"
        badgeText="Atenção"
        badgeColor="bg-pink"
        confirmText="Sim, Remover"
        onConfirm={handleConfirmDelete}
        isDestructive={true}
      >
        <p className="text-xs text-ink/80 font-medium">
          Deseja mesmo remover esta foto da galeria? Essa ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
