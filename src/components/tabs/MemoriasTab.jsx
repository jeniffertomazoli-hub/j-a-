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
import Avatar from '../Avatar';

// -------------------------------------------------------------
// ÁLBUNS TEMÁTICOS & MARCADORES
// -------------------------------------------------------------
export const ALBUNS_TEMATICOS = [
  {
    id: 'Todos',
    label: 'Todas as Fotos',
    emoji: '✨',
    desc: 'Coleção completa de todas as nossas fotos salvas',
    gradiente: 'from-[#FF85B3]/25 via-[#FFD93D]/20 to-[#33DDF3]/20',
    corBadge: 'bg-yellow text-ink',
  },
  {
    id: '💕 Especial',
    label: 'Momentos Especiais',
    emoji: '💕',
    desc: 'Dias inesquecíveis, declarações e memórias marcantes',
    gradiente: 'from-[#FF85B3]/35 to-[#A78BFA]/25',
    corBadge: 'bg-pink text-white',
  },
  {
    id: '✈️ Viagem',
    label: 'Viagens & Passeios',
    emoji: '✈️',
    desc: 'Nossas viagens, trilhas, estradas e passeios favoritos',
    gradiente: 'from-[#33DDF3]/35 to-[#2F3FE0]/25',
    corBadge: 'bg-cyan text-ink',
  },
  {
    id: '🎂 Aniversário',
    label: 'Aniversários & Datas',
    emoji: '🎂',
    desc: 'Comemorações de aniversários e datas especiais do casal',
    gradiente: 'from-[#FFD93D]/35 to-[#FF85B3]/25',
    corBadge: 'bg-yellow text-ink',
  },
  {
    id: '🍕 Date & Comida',
    label: 'Dates & Comidas',
    emoji: '🍕',
    desc: 'Restaurantes, comidinhas, jantares e dates a dois',
    gradiente: 'from-[#FB923C]/35 to-[#FFD93D]/25',
    corBadge: 'bg-[#FB923C] text-white',
  },
  {
    id: '🏡 Dia a dia',
    label: 'Nosso Dia a Dia',
    emoji: '🏡',
    desc: 'Momentos simples, carinhos e fofuras da rotina',
    gradiente: 'from-[#6EE7B7]/35 to-[#33DDF3]/20',
    corBadge: 'bg-[#34D399] text-ink',
  },
  {
    id: '🎉 Comemoração',
    label: 'Comemorações',
    emoji: '🎉',
    desc: 'Vitórias, brindes, festas e motivos para celebrar',
    gradiente: 'from-[#A78BFA]/35 to-[#FF85B3]/25',
    corBadge: 'bg-purple text-white',
  },
];

// -------------------------------------------------------------
// OPÇÕES DE FITAS ADESIVAS (WASHI TAPES)
// -------------------------------------------------------------
const WASHI_TAPES = [
  { id: 'tape-pink', nome: 'Rosa Doce', bg: 'bg-[#FF85B3]/90', border: 'border-[#FF4D97]', label: '🌸 Rosa' },
  { id: 'tape-yellow', nome: 'Amarelo Sol', bg: 'bg-[#FFD93D]/95', border: 'border-[#F4C414]', label: '☀️ Amarelo' },
  { id: 'tape-mint', nome: 'Menta Pastel', bg: 'bg-[#6EE7B7]/90', border: 'border-[#34D399]', label: '🌿 Menta' },
  { id: 'tape-purple', nome: 'Lavanda Amor', bg: 'bg-[#A78BFA]/90', border: 'border-[#8B5CF6]', label: '💜 Lavanda' },
  { id: 'tape-peach', nome: 'Pêssego Fofo', bg: 'bg-[#FDBA74]/90', border: 'border-[#FB923C]', label: '🍑 Pêssego' },
  { id: 'tape-cyan', nome: 'Azul Céu', bg: 'bg-[#67E8F9]/90', border: 'border-[#06B6D4]', label: '🌊 Azul' },
];

// -------------------------------------------------------------
// ADESIVOS / STICKERS DECORATIVOS DO SCRAPBOOK
// -------------------------------------------------------------
const STICKERS_SCRAPBOOK = [
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

function getScrapbookRotation(index, id) {
  const angles = [-1.0, 0.8, -0.6, 1.0, -0.8, 0.6, -1.0, 0.8];
  let sum = 0;
  if (id) {
    for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  } else {
    sum = index;
  }
  return angles[sum % angles.length];
}

function getCapaAlbum(albumId, todasMemorias, postsFeed = []) {
  if (albumId === 'Todos') {
    const memComFoto = todasMemorias.find((m) => Boolean(m.imagem_url));
    if (memComFoto) return memComFoto.imagem_url;
    const feedComFoto = postsFeed.find((p) => Boolean(p.foto_url));
    return feedComFoto ? feedComFoto.foto_url : null;
  }
  const mem = todasMemorias.find((m) => m.marcador === albumId && Boolean(m.imagem_url));
  return mem ? mem.imagem_url : null;
}

function getContagemAlbum(albumId, todasMemorias, postsFeed = [], incluirFeed = false) {
  if (albumId === 'Todos') {
    let count = todasMemorias.filter((m) => Boolean(m.imagem_url)).length;
    if (incluirFeed) {
      count += postsFeed.filter((p) => Boolean(p.foto_url)).length;
    }
    return count;
  }
  return todasMemorias.filter((m) => m.marcador === albumId && Boolean(m.imagem_url)).length;
}

export default function MemoriasTab({ quemSouEu, settings }) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings?.apelido1 || 'Jeniffer' : settings?.apelido2 || 'Alvaro';

  const [loading, setLoading] = useState(true);
  const [memorias, setMemorias] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [modoVisualizacao, setModoVisualizacao] = useState('albuns'); // 'albuns' | 'galeria' | 'scrapbook' | 'timeline'
  const [albumAberto, setAlbumAberto] = useState(null); // id do álbum quando aberto em detalhe
  const [filtroAlbum, setFiltroAlbum] = useState('Todos');
  const [incluirFeed, setIncluirFeed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [statusUpload, setStatusUpload] = useState('');

  // Formulário de Nova Foto
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(getTodayDateString());
  const [marcador, setMarcador] = useState(ALBUNS_TEMATICOS[1].id);
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

  // Navegação no Lightbox por Teclado
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

  function handleAbrirAlbum(albumId) {
    setAlbumAberto(albumId);
    setFiltroAlbum(albumId);
  }

  function handleVoltarAlbuns() {
    setAlbumAberto(null);
    setFiltroAlbum('Todos');
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
        setStatusUpload('Otimizando imagem para o álbum...');
        const compressed = await compressImage(arquivoImagem);

        setStatusUpload('Colando foto na nuvem...');
        imagemUrl = await uploadImagemMemoria(compressed);
      }

      setStatusUpload('Finalizando recorte de scrapbook...');
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

      toast.love('Foto colada no Álbum com muito amor! 📸💖');
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
      toast.success('Foto removida do álbum.');
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

  // Lista de Fotos para a Galeria Limpa
  const fotosDaGaleria = useMemo(() => {
    const albumFiltro = albumAberto || filtroAlbum;

    let itens = memorias.filter((m) => Boolean(m.imagem_url));

    if (albumFiltro && albumFiltro !== 'Todos') {
      itens = itens.filter((m) => m.marcador === albumFiltro);
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

    if (incluirFeed && (!albumFiltro || albumFiltro === 'Todos' || albumFiltro === '📸 Feed')) {
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
  }, [memorias, feedPosts, albumAberto, filtroAlbum, incluirFeed]);

  // Registros para o modo Scrapbook e Linha do Tempo
  const memoriasFiltradas = useMemo(() => {
    const albumFiltro = albumAberto || filtroAlbum;
    if (!albumFiltro || albumFiltro === 'Todos') {
      return memorias;
    }
    return memorias.filter((m) => m.marcador === albumFiltro);
  }, [memorias, albumAberto, filtroAlbum]);

  const totalComFoto = memorias.filter((m) => Boolean(m.imagem_url)).length;
  const fitaAtivaObj = WASHI_TAPES.find((w) => w.id === selectedTape) || WASHI_TAPES[0];
  const albumAbertoObj = ALBUNS_TEMATICOS.find((a) => a.id === albumAberto);

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
          Álbum & Galeria do Casal 📸
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings?.apelido1} & {settings?.apelido2}
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1 leading-tight">
        Nosso Álbum de Memórias
      </h1>
      <p className="text-xs text-white/80 font-medium mb-3">
        Guarde nossas fotos, explore os álbuns temáticos ou navegue pela galeria completa.
      </p>

      {/* Mini Estatísticas do Álbum */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="card-brut p-2.5 text-center bg-white shadow-brutsm">
          <p className="text-base sm:text-lg font-black text-ink">
            📁 {ALBUNS_TEMATICOS.length - 1}
          </p>
          <p className="text-[9px] font-extrabold text-ink/70 uppercase">
            Álbuns
          </p>
        </div>
        <div className="card-brut p-2.5 text-center bg-white shadow-brutsm">
          <p className="text-base sm:text-lg font-black text-ink">
            🖼️ {totalComFoto}
          </p>
          <p className="text-[9px] font-extrabold text-ink/70 uppercase">
            Fotos Salvas
          </p>
        </div>
        <div className="card-brut p-2.5 text-center bg-white shadow-brutsm">
          <p className="text-base sm:text-lg font-black text-ink">
            💜 100%
          </p>
          <p className="text-[9px] font-extrabold text-ink/70 uppercase">
            Nossa Sintonia
          </p>
        </div>
      </div>

      {/* Botão de Ação: Adicionar Foto */}
      <button
        onClick={() => setShowForm((prev) => !prev)}
        className="btn-brut w-full py-3.5 bg-yellow text-ink text-xs sm:text-sm font-black mb-4 shadow-brut flex items-center justify-center gap-2 hover:scale-101 active:scale-98 transition"
      >
        <span>{showForm ? '✕' : '✨'}</span>
        <span>{showForm ? 'Fechar Ateliê de Fotos' : '+ Colar Nova Foto no Álbum 💕'}</span>
      </button>

      {/* ========================================================= */}
      {/* ATELIÊ DE FOTOS / SCRAPBOOK (FORMULÁRIO DE NOVA POLAROID) */}
      {/* ========================================================= */}
      {showForm && (
        <div className="card-brut p-4 sm:p-5 mb-6 shadow-brut bg-white animate-popIn space-y-4">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎨</span>
              <div>
                <h3 className="font-display font-extrabold text-sm text-ink leading-tight">
                  Ateliê de Colagem
                </h3>
                <p className="text-[10px] text-ink/60 font-bold">
                  Monte sua foto personalizada com fita washi tape e adesivos!
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
              <span>📷</span> 1. Escolha a Foto do Casal:
            </label>
            <div className="flex items-center gap-2">
              <label className="btn-brut px-3 py-2 bg-yellow text-ink text-xs font-black cursor-pointer shadow-brutsm hover:bg-yellow/90">
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

          {/* 2. ESCOLHA DA FITA ADESIVA */}
          <div>
            <label className="block text-[11px] font-black uppercase text-ink mb-1.5 flex items-center gap-1">
              <span>🎀</span> 2. Fita Adesiva (Washi Tape):
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {WASHI_TAPES.map((tape) => {
                const isSelected = selectedTape === tape.id;
                return (
                  <button
                    key={tape.id}
                    type="button"
                    onClick={() => setSelectedTape(tape.id)}
                    className={`py-1.5 px-2 rounded-xl border-2 border-ink text-[10px] font-black flex items-center justify-center transition shadow-brutsm ${tape.bg} ${
                      isSelected ? 'ring-2 ring-ink scale-103 font-black shadow-brut' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {tape.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. ESCOLHA DO ADESIVO / STICKER */}
          <div>
            <label className="block text-[11px] font-black uppercase text-ink mb-1.5 flex items-center gap-1">
              <span>🏷️</span> 3. Adesivo Decorativo:
            </label>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {STICKERS_SCRAPBOOK.map((stk) => {
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

          {/* 4. PREVIEW AO VIVO DA POLAROID */}
          <div>
            <p className="text-[10px] font-black uppercase text-ink/60 mb-2">
              ✨ Prévia do Álbum:
            </p>
            <div className="p-3 bg-[#FAF7F0] rounded-2xl border-2 border-dashed border-ink/30 flex justify-center">
              <div className="polaroid-card p-3 pb-4 max-w-[240px] w-full text-center relative rotate-[-1deg]">
                <div className={`washi-tape-strip ${fitaAtivaObj.bg}`} />
                <div className="relative rounded border-2 border-ink/40 overflow-hidden bg-ink/5 aspect-square flex items-center justify-center mb-2.5">
                  {previewImagem ? (
                    <img
                      src={previewImagem}
                      alt="Prévia"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-3 text-ink/50">
                      <p className="text-3xl mb-1">🖼️</p>
                      <p className="text-[9px] font-bold">Sua foto aparecerá aqui</p>
                    </div>
                  )}
                  <span className="sticker-stamp absolute -bottom-1 -right-1 text-2xl z-10">
                    {selectedSticker}
                  </span>
                </div>
                <p className="font-display font-black text-xs text-ink truncate leading-tight">
                  {titulo.trim() || 'Título do Momento'}
                </p>
                <p className="text-[9px] text-ink/60 font-bold mt-0.5">
                  {formatarDataCompleta(data)} · {meuNome}
                </p>
              </div>
            </div>
          </div>

          {/* 5. CAMPOS ESCRITOS */}
          <div className="space-y-2.5">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da recordação (ex: Nosso Date na Praia) *"
              className="w-full rounded-xl border-3 border-ink px-3 py-2.5 outline-none bg-white text-xs font-bold shadow-brutsm placeholder:text-ink/40"
            />

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Escreva um bilhetinho romântico sobre esse momento... (opcional)"
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
                  Álbum Temático:
                </label>
                <select
                  value={marcador}
                  onChange={(e) => setMarcador(e.target.value)}
                  className="w-full rounded-xl border-3 border-ink px-2 py-2 outline-none bg-white text-xs font-bold shadow-brutsm"
                >
                  {ALBUNS_TEMATICOS.filter((a) => a.id !== 'Todos').map((a) => (
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

          {/* BOTÃO FINAL */}
          <button
            onClick={handleSalvarFoto}
            disabled={salvando}
            className="btn-brut w-full py-3 bg-pink text-white text-xs sm:text-sm font-black disabled:opacity-50 shadow-brut flex items-center justify-center gap-2 hover:bg-pink/90 transition"
          >
            <span>{salvando ? '⏳' : '📌'}</span>
            <span>{salvando ? statusUpload || 'Guardando no Álbum...' : 'Salvar Foto no Álbum de Recordações 💕'}</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* SELETOR DE MODO DE VISUALIZAÇÃO PRINCIPAL                  */}
      {/* ========================================================= */}
      <div className="mb-4">
        <div className="flex items-center justify-between bg-white/20 p-1 rounded-2xl border-2 border-ink/40 gap-1">
          {[
            { id: 'albuns', label: '📚 Álbuns', desc: 'Pastas de Fotos' },
            { id: 'galeria', label: '🖼️ Galeria', desc: 'Grade Limpa' },
            { id: 'scrapbook', label: '📖 Scrapbook', desc: 'Mural de Colagens' },
            { id: 'timeline', label: '🎞️ Linha do Tempo', desc: 'Cronologia' },
          ].map((mode) => {
            const isActive = modoVisualizacao === mode.id && !albumAberto;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setModoVisualizacao(mode.id);
                  if (mode.id !== 'albuns') {
                    setAlbumAberto(null);
                  }
                }}
                className={`flex-1 py-1.5 px-1.5 sm:px-2 rounded-xl text-[10px] sm:text-xs font-black transition text-center ${
                  isActive
                    ? 'bg-yellow text-ink shadow-brutsm border-2 border-ink'
                    : 'text-white hover:text-yellow'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VISÃO 1: ÁLBUNS TEMÁTICOS (PASTAS / LIVROS DE CAPA)       */}
      {/* ========================================================= */}
      {modoVisualizacao === 'albuns' && !albumAberto && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display font-black text-sm text-white flex items-center gap-1.5">
              <span>📚</span> Nossos Álbuns de Fotos
            </h3>
            <span className="text-[11px] font-bold text-white/70">
              Toque em um álbum para abrir
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {ALBUNS_TEMATICOS.map((album) => {
              const capa = getCapaAlbum(album.id, memorias, feedPosts);
              const count = getContagemAlbum(album.id, memorias, feedPosts, incluirFeed);

              return (
                <div
                  key={album.id}
                  onClick={() => handleAbrirAlbum(album.id)}
                  className="card-brut p-3 bg-white shadow-brut hover:scale-[1.02] active:scale-98 transition cursor-pointer relative group border-3 border-ink overflow-hidden"
                >
                  {/* Capa do Álbum */}
                  <div className="aspect-[16/10] sm:aspect-[4/3] rounded-xl border-2 border-ink overflow-hidden relative mb-2.5 bg-ink/5 flex items-center justify-center">
                    {capa ? (
                      <>
                        <img
                          src={capa}
                          alt={album.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent pointer-events-none" />
                        <span className="absolute bottom-2 left-2 text-white font-display font-black text-sm drop-shadow">
                          {album.emoji} {album.label}
                        </span>
                      </>
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${album.gradiente} flex flex-col items-center justify-center p-3 text-center`}>
                        <span className="text-3xl mb-1">{album.emoji}</span>
                        <span className="font-display font-black text-xs text-ink/75">
                          {album.label}
                        </span>
                        <span className="text-[10px] text-ink/50 font-bold mt-0.5">
                          Nenhuma foto ainda
                        </span>
                      </div>
                    )}

                    {/* Badge Contador */}
                    <span className="badge-brut bg-yellow text-ink text-[10px] absolute top-2 right-2 shadow-brutsm font-black">
                      📸 {count} {count === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>

                  {/* Informações do Álbum */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-display font-black text-sm text-ink truncate leading-tight">
                        {album.label}
                      </h4>
                      <p className="text-[10px] text-ink/65 font-bold truncate mt-0.5">
                        {album.desc}
                      </p>
                    </div>
                    <span className="text-xs font-black text-royal shrink-0 group-hover:translate-x-1 transition">
                      Abrir ➔
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DETALHE DE UM ÁLBUM ABERTO                                */}
      {/* ========================================================= */}
      {albumAberto && (
        <div className="space-y-3 mb-4 animate-fadeIn">
          {/* Barra Superior do Álbum */}
          <div className="flex items-center justify-between gap-2 bg-white/20 p-2.5 rounded-2xl border-2 border-ink/40">
            <button
              onClick={handleVoltarAlbuns}
              className="btn-brut px-3 py-1.5 bg-white text-ink text-xs font-black shadow-brutsm flex items-center gap-1 hover:bg-yellow transition active:scale-95"
            >
              <span>←</span>
              <span>Todos os Álbuns</span>
            </button>

            <span className="badge-brut bg-yellow text-ink text-[10px] font-black">
              {fotosDaGaleria.length} {fotosDaGaleria.length === 1 ? 'foto' : 'fotos'}
            </span>
          </div>

          <div className="card-brut p-3.5 bg-white shadow-brut flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display font-black text-base sm:text-lg text-ink truncate flex items-center gap-1.5">
                <span>{albumAbertoObj?.emoji || '📁'}</span>
                <span>{albumAbertoObj?.label || albumAberto}</span>
              </h2>
              <p className="text-[11px] text-ink/65 font-bold truncate mt-0.5">
                {albumAbertoObj?.desc}
              </p>
            </div>
            <button
              onClick={() => {
                setMarcador(albumAberto !== 'Todos' ? albumAberto : ALBUNS_TEMATICOS[1].id);
                setShowForm(true);
              }}
              className="btn-brut px-3 py-2 bg-pink text-white text-xs font-black shadow-brutsm shrink-0 hover:bg-pink/90 transition"
            >
              + Adicionar Foto
            </button>
          </div>

          {/* Sub-visualização dentro do Álbum aberto */}
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-white/70 mr-1">Visualizar como:</span>
            <button
              onClick={() => setModoVisualizacao('galeria')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black border-2 border-ink transition ${
                modoVisualizacao === 'galeria' ? 'bg-yellow text-ink shadow-brutsm' : 'bg-white/80 text-ink'
              }`}
            >
              🖼️ Galeria
            </button>
            <button
              onClick={() => setModoVisualizacao('scrapbook')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black border-2 border-ink transition ${
                modoVisualizacao === 'scrapbook' ? 'bg-yellow text-ink shadow-brutsm' : 'bg-white/80 text-ink'
              }`}
            >
              📖 Scrapbook
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISÃO 2: GALERIA DE FOTOS LIMPA COM LIGHTBOX               */}
      {/* ========================================================= */}
      {modoVisualizacao === 'galeria' && (
        <div className="space-y-3">
          {/* Filtros em Pílulas (quando não estiver com álbum aberto fixo) */}
          {!albumAberto && (
            <div className="space-y-2">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {ALBUNS_TEMATICOS.map((album) => {
                  const isActive = filtroAlbum === album.id;
                  const count = getContagemAlbum(album.id, memorias, feedPosts, incluirFeed);

                  return (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => setFiltroAlbum(album.id)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black border-2 border-ink transition whitespace-nowrap shadow-brutsm flex items-center gap-1 shrink-0 ${
                        isActive
                          ? 'bg-yellow text-ink scale-102 font-black'
                          : 'bg-white text-ink/75 hover:bg-yellow/20'
                      }`}
                    >
                      <span>{album.emoji}</span>
                      <span>{album.label}</span>
                      <span className="opacity-60 text-[9px]">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Opção para incluir fotos do Feed */}
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
          )}

          {/* Grade de Fotos da Galeria */}
          {fotosDaGaleria.length === 0 ? (
            <div className="card-brut p-8 text-center bg-white shadow-brut space-y-2">
              <p className="text-4xl py-1">🖼️✨</p>
              <h4 className="font-display font-extrabold text-sm text-ink">
                Nenhuma foto encontrada nesta galeria!
              </h4>
              <p className="text-xs text-ink/70 font-semibold max-w-xs mx-auto">
                Adicione fotos no botão acima para preencher este álbum com momentos lindos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
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
        </div>
      )}

      {/* ========================================================= */}
      {/* VISÃO 3: MURAL SCRAPBOOK COM POLAROIDS ARTESANAIS         */}
      {/* ========================================================= */}
      {modoVisualizacao === 'scrapbook' && (
        <div className="space-y-6 pt-2">
          {!albumAberto && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {ALBUNS_TEMATICOS.map((album) => {
                const isActive = filtroAlbum === album.id;
                const count = getContagemAlbum(album.id, memorias, feedPosts, false);

                return (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => setFiltroAlbum(album.id)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black border-2 border-ink transition whitespace-nowrap shadow-brutsm flex items-center gap-1 ${
                      isActive
                        ? 'bg-yellow text-ink scale-102 font-black'
                        : 'bg-white text-ink/75 hover:bg-yellow/20'
                    }`}
                  >
                    <span>{album.emoji}</span>
                    <span>{album.label}</span>
                    <span className="opacity-60 text-[9px]">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {memoriasFiltradas.length === 0 ? (
            <div className="card-brut p-8 text-center bg-white shadow-brut space-y-2">
              <p className="text-4xl py-1">📖✨</p>
              <h4 className="font-display font-extrabold text-sm text-ink">
                Nenhuma foto colada no Scrapbook ainda!
              </h4>
              <p className="text-xs text-ink/70 font-semibold max-w-xs mx-auto">
                Toque no botão amarelo acima para escolher uma foto e colar no álbum do casal!
              </p>
            </div>
          ) : (
            memoriasFiltradas.map((item, index) => {
              const rotation = getScrapbookRotation(index, item.id);
              const sticker = item.emojis?.[0] || '💖';
              const tapeId = item.emojis?.[1] || WASHI_TAPES[index % WASHI_TAPES.length].id;
              const tapeObj = WASHI_TAPES.find((w) => w.id === tapeId) || WASHI_TAPES[index % WASHI_TAPES.length];
              const temImagem = Boolean(item.imagem_url);

              return (
                <div
                  key={item.id}
                  style={{ transform: `rotate(${rotation}deg)` }}
                  className="polaroid-card p-3 sm:p-4 pb-5 rounded-sm relative group transition-all hover:scale-101"
                >
                  <div className={`washi-tape-strip ${tapeObj.bg}`} />

                  {/* Botão de Excluir */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({ isOpen: true, id: item.id });
                    }}
                    className="absolute top-2 right-2 text-ink/30 hover:text-pink font-black text-sm z-20 w-6 h-6 rounded-full flex items-center justify-center hover:bg-ink/5"
                    title="Excluir do Scrapbook"
                    aria-label="Excluir"
                  >
                    ✕
                  </button>

                  {/* Foto Polaroid */}
                  {temImagem ? (
                    <div
                      onClick={() => handleAbrirLightbox(item, fotosDaGaleria)}
                      className="relative cursor-pointer rounded border-2 border-ink/40 overflow-hidden bg-ink/5 mb-3 shadow-brutsm group-hover:opacity-95 transition"
                    >
                      <img
                        src={item.imagem_url}
                        alt={item.titulo}
                        className="w-full max-h-72 object-cover"
                        loading="lazy"
                      />
                      <span className="sticker-stamp absolute -bottom-1 -right-1 text-3xl z-10 pointer-events-none">
                        {sticker}
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleAbrirLightbox(item, fotosDaGaleria)}
                      className="cursor-pointer rounded-xl p-4 bg-[#FFF9E6] border-2 border-dashed border-ink/40 mb-3 relative text-center"
                    >
                      <span className="sticker-stamp absolute top-2 right-2 text-2xl">
                        {sticker}
                      </span>
                      <p className="text-3xl mb-1">📝</p>
                      <p className="text-xs font-black text-ink">
                        Recordação Guardada
                      </p>
                    </div>
                  )}

                  {/* Detalhes Escritos */}
                  <div className="px-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className="badge-brut bg-yellow text-ink text-[9px] font-black">
                        📅 {formatarDataCompleta(item.data)}
                      </span>
                      {calcularTempoPassado(item.data) && (
                        <span className="badge-brut bg-white text-ink text-[9px] font-black">
                          ⏳ {calcularTempoPassado(item.data)}
                        </span>
                      )}
                      <span className="badge-brut bg-pink/20 text-ink text-[9px] font-bold">
                        {item.marcador}
                      </span>
                    </div>

                    <h3
                      onClick={() => handleAbrirLightbox(item, fotosDaGaleria)}
                      className="font-display text-base sm:text-lg font-black text-ink leading-snug cursor-pointer hover:text-royal"
                    >
                      {item.titulo}
                    </h3>

                    {item.descricao && (
                      <p className="text-xs text-ink/80 font-medium mt-1 leading-relaxed">
                        {item.descricao}
                      </p>
                    )}

                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[11px] font-black text-royal underline break-all"
                      >
                        🔗 Abrir link da recordação
                      </a>
                    )}

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-ink/10 text-[10px] text-ink/60 font-bold">
                      <span>
                        {item.criado_por ? `Colado por ${item.criado_por} 💜` : 'Colado com amor'}
                      </span>
                      <span
                        onClick={() => handleAbrirLightbox(item, fotosDaGaleria)}
                        className="cursor-pointer text-royal hover:underline font-black"
                      >
                        Ver na galeria ↗
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VISÃO 4: LINHA DO TEMPO CRONOLÓGICA                       */}
      {/* ========================================================= */}
      {modoVisualizacao === 'timeline' && (
        <div className="relative pl-6 space-y-5 pt-2 border-l-3 border-yellow/60 ml-2">
          {memoriasFiltradas.map((item) => {
            const sticker = item.emojis?.[0] || '💖';
            const temImagem = Boolean(item.imagem_url);

            return (
              <div key={item.id} className="relative">
                <div className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-yellow border-3 border-ink flex items-center justify-center text-xs shadow-brutsm">
                  {sticker}
                </div>

                <div
                  onClick={() => handleAbrirLightbox(item, fotosDaGaleria)}
                  className="card-brut p-3.5 bg-white shadow-brutsm cursor-pointer hover:scale-101 transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="badge-brut bg-pink/20 text-ink text-[9px] font-black">
                      {formatarDataCompleta(item.data)}
                    </span>
                    <span className="text-[10px] text-ink/50 font-bold">
                      {calcularTempoPassado(item.data)}
                    </span>
                  </div>

                  {temImagem && (
                    <img
                      src={item.imagem_url}
                      alt={item.titulo}
                      className="w-full max-h-44 object-cover rounded-xl border-2 border-ink shadow-brutsm"
                      loading="lazy"
                    />
                  )}

                  <h4 className="font-display font-extrabold text-sm text-ink leading-tight">
                    {item.titulo}
                  </h4>
                  {item.descricao && (
                    <p className="text-xs text-ink/75 font-medium line-clamp-2">
                      {item.descricao}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* LIGHTBOX / VISUALIZADOR DE GALERIA COMPLETO               */}
      {/* ========================================================= */}
      {lightbox.isOpen && lightbox.fotos.length > 0 && (
        <div
          onClick={handleFecharLightbox}
          className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 select-none animate-fadeIn overflow-y-auto"
        >
          {/* Barra Superior do Lightbox */}
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

          {/* Área Central: Foto com Botões Laterais ◀ ▶ */}
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

            {/* Imagem Ampliada com Swipe */}
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

          {/* Painel Inferior de Informações da Foto */}
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
                  title="Excluir do Álbum"
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
        title="Remover do Álbum"
        badgeText="Atenção"
        badgeColor="bg-pink"
        confirmText="Sim, Remover"
        onConfirm={handleConfirmDelete}
        isDestructive={true}
      >
        <p className="text-xs text-ink/80 font-medium">
          Deseja mesmo remover esta foto do álbum? Essa ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
