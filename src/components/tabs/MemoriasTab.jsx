import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  buscarMemorias,
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
const ALBUNS_TEMATICOS = [
  { id: 'Todos', label: 'Todas as Fotos', emoji: '✨' },
  { id: '💕 Especial', label: 'Especiais', emoji: '💕' },
  { id: '✈️ Viagem', label: 'Viagens & Passeios', emoji: '✈️' },
  { id: '🎂 Aniversário', label: 'Aniversários & Datas', emoji: '🎂' },
  { id: '🍕 Date & Comida', label: 'Dates & Comidas', emoji: '🍕' },
  { id: '🏡 Dia a dia', label: 'Nosso Dia a Dia', emoji: '🏡' },
  { id: '🎉 Comemoração', label: 'Comemorações', emoji: '🎉' },
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

export default function MemoriasTab({ quemSouEu, settings }) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings?.apelido1 || 'Jeniffer' : settings?.apelido2 || 'Alvaro';
  const meuEmoji = ehP1 ? settings?.emoji1 || '🐰' : settings?.emoji2 || '🦊';
  const outroNome = ehP1 ? settings?.apelido2 || 'Alvaro' : settings?.apelido1 || 'Jeniffer';
  const outroEmoji = ehP1 ? settings?.emoji2 || '🦊' : settings?.emoji1 || '🐰';

  const [loading, setLoading] = useState(true);
  const [memorias, setMemorias] = useState([]);
  const [modoVisualizacao, setModoVisualizacao] = useState('scrapbook'); // 'scrapbook' | 'grade' | 'timeline'
  const [filtroAlbum, setFiltroAlbum] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [statusUpload, setStatusUpload] = useState('');

  // Campos do formulário
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
  const [modalFotoDetalhe, setModalFotoDetalhe] = useState(null);

  useEffect(() => {
    carregar();
    const unsub = subscribeToTable('memorias', () => carregar());
    return () => unsub();
  }, []);

  async function carregar() {
    try {
      const dataRes = await buscarMemorias();
      setMemorias(dataRes || []);
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

  function handleRemoverFotoForm() {
    setArquivoImagem(null);
    setPreviewImagem(null);
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
      
      // Guarda sticker e fita adesiva no array emojis da tabela
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

      // Efeito de sucesso fofo
      playChimeSound();
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#FF4D97', '#FFD93D', '#2F3FE0', '#33DDF3', '#A78BFA'],
      });

      // Limpa formulário
      setTitulo('');
      setDescricao('');
      setLink('');
      setArquivoImagem(null);
      setPreviewImagem(null);
      setShowForm(false);

      toast.love('Foto colada no Scrapbook com muito amor! 📸💖');
      await carregar();
    } catch (err) {
      console.error(err);
      toast.error('Não consegui colar a foto agora. Tente de novo!');
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
      if (modalFotoDetalhe?.id === deleteModal.id) {
        setModalFotoDetalhe(null);
      }
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir foto.');
    }
  }

  // Filtragem dos registros
  const memoriasFiltradas = memorias.filter((item) => {
    if (filtroAlbum === 'Todos') return true;
    return item.marcador === filtroAlbum;
  });

  const totalComFoto = memorias.filter((m) => Boolean(m.imagem_url)).length;
  const fitaAtivaObj = WASHI_TAPES.find((w) => w.id === selectedTape) || WASHI_TAPES[0];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 pt-4 max-w-md mx-auto pb-16 animate-fadeIn w-full overflow-hidden">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-pink text-ink text-[10px]">
          Álbum Digital do Casal 📖
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings?.apelido1} & {settings?.apelido2}
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1 leading-tight">
        Nosso Álbum Scrapbook
      </h1>
      <p className="text-xs text-white/80 font-medium mb-3">
        Guarde nossas fotos, polaroids, bilhetinhos e recordações coladas com amor.
      </p>

      {/* Mini Estatísticas do Álbum */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="card-brut p-2.5 text-center bg-white shadow-brutsm">
          <p className="text-base sm:text-lg font-black text-ink">
            📸 {memorias.length}
          </p>
          <p className="text-[9px] font-extrabold text-ink/70 uppercase">
            Momentos
          </p>
        </div>
        <div className="card-brut p-2.5 text-center bg-white shadow-brutsm">
          <p className="text-base sm:text-lg font-black text-ink">
            🖼️ {totalComFoto}
          </p>
          <p className="text-[9px] font-extrabold text-ink/70 uppercase">
            Fotos Reais
          </p>
        </div>
        <div className="card-brut p-2.5 text-center bg-white shadow-brutsm">
          <p className="text-base sm:text-lg font-black text-ink">
            💜 100%
          </p>
          <p className="text-[9px] font-extrabold text-ink/70 uppercase">
            Nossa História
          </p>
        </div>
      </div>

      {/* Botão de Ação: Colar Nova Foto */}
      <button
        onClick={() => setShowForm((prev) => !prev)}
        className="btn-brut w-full py-3.5 bg-yellow text-ink text-xs sm:text-sm font-black mb-4 shadow-brut flex items-center justify-center gap-2 hover:scale-101 active:scale-98 transition"
      >
        <span>{showForm ? '✕' : '✨'}</span>
        <span>{showForm ? 'Fechar Ateliê de Scrapbook' : '+ Colar Nova Foto no Scrapbook 📸'}</span>
      </button>

      {/* ========================================================= */}
      {/* ATELIÊ DE SCRAPBOOK (FORMULÁRIO DE NOVA POLAROID / FOTO) */}
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
                  Monte sua polaroid personalizada com fita e adesivos!
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

          {/* 2. ESCOLHA DA FITA ADESIVA (WASHI TAPE) */}
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
              ✨ Pré-visualização da Polaroid:
            </p>
            <div className="p-3 bg-[#FAF7F0] rounded-2xl border-2 border-dashed border-ink/30 flex justify-center">
              <div className="polaroid-card p-3 pb-4 max-w-[240px] w-full text-center relative rotate-[-1.5deg]">
                {/* Washi Tape */}
                <div className={`washi-tape-strip ${fitaAtivaObj.bg}`} />

                {/* Foto ou Ilustração */}
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

                  {/* Sticker no canto superior direito */}
                  <span className="sticker-stamp absolute -bottom-1 -right-1 text-2xl z-10">
                    {selectedSticker}
                  </span>
                </div>

                {/* Legenda escrita */}
                <p className="font-display font-black text-xs text-ink truncate leading-tight">
                  {titulo.trim() || 'Título do Momento'}
                </p>
                <p className="text-[9px] text-ink/60 font-bold mt-0.5">
                  {formatarDataCompleta(data)} · {meuNome}
                </p>
              </div>
            </div>
          </div>

          {/* 5. CAMPOS DE DETALHE */}
          <div className="space-y-2.5 pt-1">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da foto (Ex: Nosso primeiro piquenique 🧺)"
              className="w-full rounded-xl border-3 border-ink px-3 py-2.5 outline-none bg-white text-xs font-bold shadow-brutsm placeholder:text-ink/40"
            />

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Escreva um bilhetinho sobre esse momento especial... (opcional)"
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

          {/* BOTÃO FINAL DE COLAR */}
          <button
            onClick={handleSalvarFoto}
            disabled={salvando}
            className="btn-brut w-full py-3 bg-pink text-white text-xs sm:text-sm font-black disabled:opacity-50 shadow-brut flex items-center justify-center gap-2 hover:bg-pink/90 transition"
          >
            <span>{salvando ? '⏳' : '📌'}</span>
            <span>{salvando ? statusUpload || 'Colando no Álbum...' : 'Colar Foto no Álbum de Recordações 💕'}</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* SELETOR DE MODO DE VISUALIZAÇÃO & FILTROS DE ÁLBUM */}
      {/* ========================================================= */}
      <div className="space-y-2.5 mb-4">
        {/* Modos de Visualização */}
        <div className="flex items-center justify-between bg-white/20 p-1 rounded-2xl border-2 border-ink/40">
          {[
            { id: 'scrapbook', label: '📖 Scrapbook', desc: 'Mural de Colagens' },
            { id: 'grade', label: '🖼️ Grade', desc: 'Galeria Rápida' },
            { id: 'timeline', label: '🎞️ Linha do Tempo', desc: 'Cronológico' },
          ].map((mode) => {
            const isActive = modoVisualizacao === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setModoVisualizacao(mode.id)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-black transition ${
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

        {/* Filtros por Álbum Temático */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {ALBUNS_TEMATICOS.map((album) => {
            const isActive = filtroAlbum === album.id;
            const count =
              album.id === 'Todos'
                ? memorias.length
                : memorias.filter((m) => m.marcador === album.id).length;

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
      </div>

      {/* ========================================================= */}
      {/* EXIBIÇÃO DAS FOTOS / POLAROIDS DO SCRAPBOOK */}
      {/* ========================================================= */}
      {memoriasFiltradas.length === 0 ? (
        <div className="card-brut p-8 text-center bg-white shadow-brut space-y-2">
          <p className="text-4xl py-1">📖✨</p>
          <h4 className="font-display font-extrabold text-sm text-ink">
            {filtroAlbum === 'Todos'
              ? 'Nenhuma foto colada no Scrapbook ainda!'
              : `Nenhuma foto no álbum "${filtroAlbum}".`}
          </h4>
          <p className="text-xs text-ink/70 font-semibold max-w-xs mx-auto">
            Toque no botão amarelo acima para escolher uma foto e colar no álbum do casal!
          </p>
        </div>
      ) : modoVisualizacao === 'scrapbook' ? (
        /* --------------------------------------------------------- */
        /* MODO 1: MURAL SCRAPBOOK COM POLAROIDS ORGÂNICAS           */
        /* --------------------------------------------------------- */
        <div className="space-y-6 pt-2">
          {memoriasFiltradas.map((item, index) => {
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
                {/* Washi Tape Rasgada no Topo */}
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

                {/* Área da Imagem / Foto Polaroid */}
                {temImagem ? (
                  <div
                    onClick={() => setModalFotoDetalhe(item)}
                    className="relative cursor-pointer rounded border-2 border-ink/40 overflow-hidden bg-ink/5 mb-3 shadow-brutsm group-hover:opacity-95 transition"
                  >
                    <img
                      src={item.imagem_url}
                      alt={item.titulo}
                      className="w-full max-h-72 object-cover"
                      loading="lazy"
                    />

                    {/* Sticker colado no canto da foto */}
                    <span className="sticker-stamp absolute -bottom-1 -right-1 text-3xl z-10 pointer-events-none">
                      {sticker}
                    </span>
                  </div>
                ) : (
                  /* Sem imagem: Recorte de Bilhete Scrapbook */
                  <div
                    onClick={() => setModalFotoDetalhe(item)}
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

                {/* Conteúdo Escrito da Polaroid */}
                <div className="px-1">
                  {/* Badges de Data e Álbum */}
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

                  {/* Título do Momento */}
                  <h3
                    onClick={() => setModalFotoDetalhe(item)}
                    className="font-display text-base sm:text-lg font-black text-ink leading-snug cursor-pointer hover:text-royal"
                  >
                    {item.titulo}
                  </h3>

                  {/* Descrição / Bilhetinho */}
                  {item.descricao && (
                    <p className="text-xs text-ink/80 font-medium mt-1 leading-relaxed">
                      {item.descricao}
                    </p>
                  )}

                  {/* Link se houver */}
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

                  {/* Rodapé: Quem colou */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-ink/10 text-[10px] text-ink/60 font-bold">
                    <span>
                      {item.criado_por ? `Colado por ${item.criado_por} 💜` : 'Colado com amor'}
                    </span>
                    <span
                      onClick={() => setModalFotoDetalhe(item)}
                      className="cursor-pointer text-royal hover:underline font-black"
                    >
                      Ver detalhes ↗
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : modoVisualizacao === 'grade' ? (
        /* --------------------------------------------------------- */
        /* MODO 2: GRADE / GALERIA DE FOTOS LIMPA                    */
        /* --------------------------------------------------------- */
        <div className="grid grid-cols-2 gap-3 pt-2">
          {memoriasFiltradas.map((item, index) => {
            const sticker = item.emojis?.[0] || '💖';
            const temImagem = Boolean(item.imagem_url);

            return (
              <div
                key={item.id}
                onClick={() => setModalFotoDetalhe(item)}
                className="card-brut p-2 pb-3 bg-white shadow-brutsm cursor-pointer hover:scale-102 transition relative group"
              >
                <div className="aspect-square rounded-lg border-2 border-ink overflow-hidden bg-ink/5 mb-2 relative flex items-center justify-center">
                  {temImagem ? (
                    <img
                      src={item.imagem_url}
                      alt={item.titulo}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="p-2 text-center">
                      <p className="text-2xl mb-1">📝</p>
                      <p className="text-[10px] font-black text-ink truncate">
                        {item.titulo}
                      </p>
                    </div>
                  )}
                  <span className="sticker-stamp absolute bottom-1 right-1 text-xl pointer-events-none">
                    {sticker}
                  </span>
                </div>

                <p className="font-display font-extrabold text-xs text-ink truncate leading-tight">
                  {item.titulo}
                </p>
                <p className="text-[9px] text-ink/60 font-bold mt-0.5">
                  {formatarDataCompleta(item.data)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        /* --------------------------------------------------------- */
        /* MODO 3: LINHA DO TEMPO CRONOLÓGICA                        */
        /* --------------------------------------------------------- */
        <div className="relative pl-6 space-y-5 pt-2 border-l-3 border-yellow/60 ml-2">
          {memoriasFiltradas.map((item) => {
            const sticker = item.emojis?.[0] || '💖';
            const temImagem = Boolean(item.imagem_url);

            return (
              <div key={item.id} className="relative">
                {/* Ponto / Nó na linha do tempo */}
                <div className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-yellow border-3 border-ink flex items-center justify-center text-xs shadow-brutsm">
                  {sticker}
                </div>

                <div
                  onClick={() => setModalFotoDetalhe(item)}
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
      {/* MODAL: POLAROID AMPLIADA (VISUALIZAÇÃO COMPLETA)         */}
      {/* ========================================================= */}
      {modalFotoDetalhe && (
        <div
          onClick={() => setModalFotoDetalhe(null)}
          className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="polaroid-card p-4 sm:p-5 max-w-sm w-full bg-white animate-popIn relative max-h-[90vh] overflow-y-auto"
          >
            {/* Washi Tape */}
            <div className="washi-tape-strip bg-pink/90" />

            {/* Fechar */}
            <button
              onClick={() => setModalFotoDetalhe(null)}
              className="absolute top-3 right-3 text-ink/40 hover:text-ink font-black text-sm z-20 w-7 h-7 rounded-full flex items-center justify-center hover:bg-ink/5"
              aria-label="Fechar"
            >
              ✕
            </button>

            {/* Foto Ampliada */}
            {modalFotoDetalhe.imagem_url && (
              <div className="rounded-xl border-3 border-ink overflow-hidden shadow-brutsm mb-3.5 relative">
                <img
                  src={modalFotoDetalhe.imagem_url}
                  alt={modalFotoDetalhe.titulo}
                  className="w-full max-h-[50vh] object-contain bg-ink/5"
                />
                <span className="sticker-stamp absolute -bottom-1 -right-1 text-4xl pointer-events-none">
                  {modalFotoDetalhe.emojis?.[0] || '💖'}
                </span>
              </div>
            )}

            {/* Informações da Memória */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="badge-brut bg-yellow text-ink text-[10px] font-black">
                  📅 {formatarDataCompleta(modalFotoDetalhe.data)}
                </span>
                {calcularTempoPassado(modalFotoDetalhe.data) && (
                  <span className="badge-brut bg-pink/20 text-ink text-[10px] font-black">
                    ⏳ {calcularTempoPassado(modalFotoDetalhe.data)}
                  </span>
                )}
                <span className="badge-brut bg-cyan/30 text-ink text-[10px] font-bold">
                  {modalFotoDetalhe.marcador}
                </span>
              </div>

              <h3 className="font-display text-xl font-black text-ink leading-tight pr-6">
                {modalFotoDetalhe.titulo}
              </h3>

              {modalFotoDetalhe.descricao && (
                <p className="text-xs text-ink/80 font-medium leading-relaxed bg-[#FAF7F0] p-3 rounded-xl border border-ink/10">
                  {modalFotoDetalhe.descricao}
                </p>
              )}

              {modalFotoDetalhe.link && (
                <a
                  href={modalFotoDetalhe.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-brut w-full py-2 bg-yellow text-ink text-xs font-black shadow-brutsm flex items-center justify-center gap-1.5"
                >
                  <span>🔗</span>
                  <span>Acessar Link Externo</span>
                </a>
              )}

              <p className="text-[10px] text-ink/60 font-bold pt-1">
                {modalFotoDetalhe.criado_por ? `Guardado no álbum por ${modalFotoDetalhe.criado_por} 💜` : 'Guardado no álbum do casal'}
              </p>

              {/* Botões de Ação do Modal */}
              <div className="flex gap-2 pt-2 border-t border-ink/10">
                {modalFotoDetalhe.imagem_url && (
                  <a
                    href={modalFotoDetalhe.imagem_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`scrapbook-${modalFotoDetalhe.id}.jpg`}
                    className="btn-brut flex-1 py-2 bg-cyan text-ink text-xs font-black shadow-brutsm inline-flex items-center justify-center gap-1"
                  >
                    <span>📥</span>
                    <span>Abrir / Baixar Foto</span>
                  </a>
                )}
                <button
                  onClick={() => setDeleteModal({ isOpen: true, id: modalFotoDetalhe.id })}
                  className="btn-brut px-3 py-2 bg-white text-pink text-xs font-black shadow-brutsm hover:bg-pink hover:text-white transition"
                  title="Excluir do Scrapbook"
                >
                  🗑️
                </button>
              </div>
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
        title="Remover do Scrapbook"
        badgeText="Atenção"
        badgeColor="bg-pink"
        confirmText="Sim, Remover"
        onConfirm={handleConfirmDelete}
        isDestructive={true}
      >
        <p className="text-xs text-ink/80 font-medium">
          Deseja mesmo descolar e remover esta foto do álbum? Essa ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
