import React, { useState, useEffect } from 'react';
import {
  buscarTopicosDoDia,
  criarTopico,
  alternarTopicoConcluido,
  excluirTopico,
  buscarJogarDoDia,
  responderJogarDoDia,
  buscarMensagensConversa,
  enviarMensagemConversa,
  editarMensagemConversa,
  excluirMensagemConversa,
  marcarPerguntaRespondida,
  buscarRespostasPerguntaHoje,
  uploadFotoConversa,
  getTodayDateString,
  subscribeToTable,
} from '../../lib/supabase';
import { compressImage } from '../../lib/imageUtils';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';
import RouletteModal from '../RouletteModal';
import confetti from 'canvas-confetti';

// ---------------------------------------------------------------
// 💭 Banco de Perguntas Profundas do Dia
// ---------------------------------------------------------------
const PERGUNTAS_DO_DIA = [
  'Qual memória nossa sempre te faz sorrir sozinho(a) quando você lembra?',
  'Se você pudesse descrever nosso relacionamento em uma música, qual seria e por quê?',
  'O que você imagina estarmos fazendo daqui a 5 anos?',
  'Qual hábito meu você acha mais fofo ou engraçado?',
  'Qual foi o momento em que você percebeu que tinha se apaixonado por mim?',
  'O que você mais sente falta quando estamos longe?',
  'Se pudermos fazer UMA coisa juntos amanhã, o que você escolheria?',
  'Qual comida ou bebida te lembra a gente quando você experimenta?',
  'Qual é o lugar que você mais sonha me levar um dia?',
  'Qual foi o dia que você mais gostou de passar comigo até hoje?',
  'O que você acha que é o nosso ponto mais forte como casal?',
  'Qual é a coisa mais boba que te faz pensar em mim?',
  'Se eu fosse um personagem de série ou filme, quem eu seria? E você?',
  'O que você mais admira em mim?',
  'Qual medo que você tem que raramente conta para as pessoas?',
  'Se a gente pudesse morar em qualquer cidade do mundo juntos, qual seria?',
  'Qual foi o presente que mais te marcou que eu dei (ou quero dar) para você?',
  'Como você descreveria a gente para um amigo que nunca nos viu juntos?',
  'Qual é o sonho que você ainda não me contou?',
  'O que você acha que precisamos melhorar juntos como casal?',
  'Qual seria a nossa viagem perfeita? Para onde e como seria?',
  'Qual cheiro, som ou sensação física te lembra imediatamente de mim?',
  'O que você faria se soubesse que hoje seria nosso último dia juntos?',
  'Qual é a coisa mais inesperada que você já descobriu sobre mim?',
  'Se você pudesse viver um dia da nossa história de novo, qual escolheria?',
  'Em que momento você se sente mais amado(a) por mim?',
  'Qual seria nossa tradição perfeita enquanto namoramos à distância?',
  'O que te faz ter certeza de que eu sou a pessoa certa para você?',
  'Qual é a sua definição de namorado(a) perfeito(a)?',
  'O que você quer que eu saiba mas nunca consegue dizer com facilidade?',
];

function getPerguntaDoDia() {
  const hoje = new Date();
  const diaDoAno = Math.floor(
    (hoje - new Date(hoje.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );
  return PERGUNTAS_DO_DIA[diaDoAno % PERGUNTAS_DO_DIA.length];
}

// ---------------------------------------------------------------
const CATEGORIAS = [
  { id: 'roles', label: 'Rolês & Passeios', emoji: '🚶', cor: 'bg-cyan' },
  { id: 'filmes', label: 'Filmes & Séries', emoji: '🎬', cor: 'bg-pink' },
  { id: 'casa', label: 'Em Casa', emoji: '🏡', cor: 'bg-purple' },
];

const EMOJIS_CHAT = ['🥰', '😊', '😌', '😐', '😕', '😢', '😤', '🍿', '🎮', '💜'];

function formatHora(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TopicosTab({ quemSouEu, settings }) {
  const toast = useToast();
  const hojeIso = getTodayDateString();
  const meuNome = quemSouEu === 'parceiro1' ? settings.apelido1 : settings.apelido2;
  const outroNome = quemSouEu === 'parceiro1' ? settings.apelido2 : settings.apelido1;

  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState('roles');
  const [novoTopicoTexto, setNovoTopicoTexto] = useState('');
  const [topicos, setTopicos] = useState([]);
  const [jogosHoje, setJogosHoje] = useState([]);
  const [mensagens, setMensagens] = useState([]);

  // Pergunta do dia
  const [respostasPergunta, setRespostasPergunta] = useState([]);
  const perguntaDoDia = getPerguntaDoDia();

  // Modais
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null });
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);

  // Chat
  const [novoChatTexto, setNovoChatTexto] = useState('');
  const [emojiChat, setEmojiChat] = useState('😌');
  const [enviandoChat, setEnviandoChat] = useState(false);
  const [editandoMsgId, setEditandoMsgId] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState('');

  // Foto no chat
  const [fotoParaEnviar, setFotoParaEnviar] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [uploadandoFoto, setUploadandoFoto] = useState(false);
  const [imagemCheia, setImagemCheia] = useState(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    carregarTudo();
    const unsubTopicos = subscribeToTable('topicos', () => carregarTudo());
    const unsubJogos = subscribeToTable('jogar_do_dia', () => carregarTudo());
    const unsubMsg = subscribeToTable('mensagens_conversa', () => carregarTudo());
    const unsubPergunta = subscribeToTable('pergunta_do_dia', () => carregarTudo());
    return () => { unsubTopicos(); unsubJogos(); unsubMsg(); unsubPergunta(); };
  }, []);

  async function carregarTudo() {
    try {
      const [topicosRes, jogosRes, msgRes, perguntaRes] = await Promise.all([
        buscarTopicosDoDia(hojeIso),
        buscarJogarDoDia(hojeIso),
        buscarMensagensConversa(hojeIso),
        buscarRespostasPerguntaHoje(),
      ]);
      setTopicos(topicosRes);
      setJogosHoje(jogosRes);
      setMensagens(msgRes);
      setRespostasPergunta(perguntaRes);
    } catch (err) {
      console.error('Erro ao carregar tópicos/chat:', err);
    } finally {
      setLoading(false);
    }
  }

  // Tópicos
  async function handleAddTopico() {
    if (!novoTopicoTexto.trim()) return;
    try {
      await criarTopico({
        data: hojeIso,
        categoria: categoriaAtiva,
        titulo: novoTopicoTexto.trim(),
        concluida: false,
        adicionado_por: meuNome,
        parceiro: quemSouEu,
      });
      setNovoTopicoTexto('');
      toast.success('Atividade adicionada! 💜');
      carregarTudo();
    } catch (err) {
      toast.error('Não consegui salvar agora.');
    }
  }

  async function handleToggleTopico(item) {
    try {
      await alternarTopicoConcluido(item.id, !item.concluida);
      carregarTudo();
    } catch {}
  }

  async function handleExecutarExclusao() {
    try {
      if (deleteModal.type === 'topico') {
        await excluirTopico(deleteModal.id);
        toast.success('Item removido!');
      } else if (deleteModal.type === 'mensagem') {
        await excluirMensagemConversa(deleteModal.id);
        toast.success('Mensagem apagada!');
      }
      setDeleteModal({ isOpen: false, type: null, id: null });
      carregarTudo();
    } catch {
      toast.error('Erro ao excluir.');
    }
  }

  // Jogar
  async function handleResponderJogar(querJogar) {
    try {
      await responderJogarDoDia(quemSouEu, querJogar);
      toast.love(querJogar ? '🎮 Avisado!' : 'Descanso merecido ✨');
      carregarTudo();
    } catch {
      toast.error('Erro ao salvar resposta.');
    }
  }

  // Pergunta do Dia
  async function handleMarcarPerguntaRespondida() {
    try {
      await marcarPerguntaRespondida(quemSouEu);
      const atualizadas = await buscarRespostasPerguntaHoje();
      setRespostasPergunta(atualizadas);

      if (atualizadas.length >= 2) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD93D', '#FF4D97', '#8B7FFF'],
        });
        toast.love('Vocês conversaram sobre isso hoje! 💜 Conexão +1!');
      } else {
        toast.success('Marcado! Falta só o outro confirmar.');
      }
    } catch {
      toast.error('Erro ao marcar a pergunta.');
    }
  }

  // Chat
  function handleSelecionarFoto(e) {
    const file = e.target.files?.[0];
    if (file) {
      setFotoParaEnviar(file);
      setPreviewFoto(URL.createObjectURL(file));
    }
    e.target.value = '';
  }

  async function handleEnviarChat() {
    if (!novoChatTexto.trim() && !fotoParaEnviar) return;
    setEnviandoChat(true);

    try {
      let fotoUrl = null;

      if (fotoParaEnviar) {
        setUploadandoFoto(true);
        const compressed = await compressImage(fotoParaEnviar);
        fotoUrl = await uploadFotoConversa(compressed);
        setUploadandoFoto(false);
      }

      await enviarMensagemConversa(
        quemSouEu,
        novoChatTexto.trim() || '📸',
        emojiChat,
        fotoUrl
      );

      setNovoChatTexto('');
      setFotoParaEnviar(null);
      setPreviewFoto(null);
      toast.love(fotoUrl ? 'Foto enviada! 📸' : 'Recadinho enviado! 💌');
      carregarTudo();
    } catch {
      toast.error('Não consegui enviar. Tente de novo!');
      setUploadandoFoto(false);
    } finally {
      setEnviandoChat(false);
    }
  }

  async function handleSalvarEdicao(id) {
    if (!textoEdicao.trim()) return;
    try {
      await editarMensagemConversa(id, textoEdicao.trim());
      setEditandoMsgId(null);
      toast.success('Mensagem atualizada!');
      carregarTudo();
    } catch {
      toast.error('Erro ao editar.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const topicosFiltrados = topicos.filter((t) => t.categoria === categoriaAtiva);
  const catConfig = CATEGORIAS.find((c) => c.id === categoriaAtiva) || CATEGORIAS[0];

  const statusJogar1 = jogosHoje.find((j) => j.parceiro === 'parceiro1');
  const statusJogar2 = jogosHoje.find((j) => j.parceiro === 'parceiro2');

  const euRespondiPergunta = respostasPergunta.some((r) => r.parceiro === quemSouEu);
  const ambosBatem = respostasPergunta.length >= 2;

  return (
    <div className="px-3 sm:px-6 pt-4 max-w-md mx-auto pb-14 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-purple text-ink text-[10px]">Planos & Sintonia 📋</p>
        <span className="text-[11px] font-extrabold text-white/80">Hoje</span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-4 leading-tight">
        O que vamos viver hoje?
      </h1>

      {/* 💭 PERGUNTA PROFUNDA DO DIA */}
      <div
        className={`card-brut p-4 mb-5 shadow-brut border-3 border-ink transition-all ${
          ambosBatem ? 'bg-cyan' : 'bg-purple/20'
        }`}
      >
        <div className="flex items-center justify-between mb-2.5">
          <p className="badge-brut bg-white text-ink text-[9px] flex items-center gap-1">
            💭 Pergunta Profunda do Dia
          </p>
          {ambosBatem && (
            <span className="badge-brut bg-yellow text-ink text-[9px]">
              ✅ Conversaram!
            </span>
          )}
        </div>

        <p className="text-sm font-bold text-ink leading-relaxed mb-3">
          "{perguntaDoDia}"
        </p>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2 text-[10px] font-bold text-ink/70">
            <span>{settings.emoji1} {euRespondiPergunta && quemSouEu === 'parceiro1' ? '✅' : (respostasPergunta.some(r => r.parceiro === 'parceiro1') ? '✅' : '⏳')}</span>
            <span>{settings.emoji2} {respostasPergunta.some(r => r.parceiro === 'parceiro2') ? '✅' : '⏳'}</span>
          </div>

          {!euRespondiPergunta ? (
            <button
              onClick={handleMarcarPerguntaRespondida}
              className="btn-brut px-3 py-1.5 bg-yellow text-ink text-[10px] font-black shadow-brutsm"
            >
              Já conversamos! ✅
            </button>
          ) : (
            <span className="text-[10px] font-black text-ink/60">
              {ambosBatem ? 'Conexão do dia! 💜' : 'Aguardando o outro confirmar...'}
            </span>
          )}
        </div>
      </div>

      {/* Card "Bora Jogar Hoje? 🎮" */}
      <div className="card-brut p-4 mb-5 bg-yellow shadow-brut">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-black text-ink uppercase tracking-wide flex items-center gap-1">
            <span>🎮</span> Bora Jogar Hoje?
          </p>
          <span className="badge-brut bg-white text-ink text-[9px]">Ao vivo</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3.5">
          <button
            onClick={() => handleResponderJogar(true)}
            className="py-2.5 px-2 rounded-xl text-xs font-black border-3 border-ink bg-white text-ink hover:bg-ink hover:text-yellow transition shadow-brutsm active:scale-98 flex items-center justify-center gap-1.5"
          >
            <span>🎮</span><span>Sim, bora!</span>
          </button>
          <button
            onClick={() => handleResponderJogar(false)}
            className="py-2.5 px-2 rounded-xl text-xs font-black border-3 border-ink bg-white text-ink hover:bg-ink hover:text-yellow transition shadow-brutsm active:scale-98 flex items-center justify-center gap-1.5"
          >
            <span>💤</span><span>Hoje não</span>
          </button>
        </div>

        <div className="space-y-2">
          {/* Jeniffer */}
          <div className="bg-white rounded-xl p-2.5 border-2 border-ink shadow-brutsm flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-lg shrink-0">{settings.emoji1 || '🐰'}</span>
              <span className="text-xs font-black text-ink truncate">{settings.apelido1}:</span>
            </div>
            <span className={`badge-brut text-[10px] shrink-0 ${statusJogar1 ? statusJogar1.quer_jogar ? 'bg-cyan text-ink' : 'bg-pink text-white' : 'bg-ink/10 text-ink/70'}`}>
              {statusJogar1 ? statusJogar1.quer_jogar ? 'Quer jogar ✅' : 'Descansando 💤' : 'Ainda não respondeu'}
            </span>
          </div>

          {/* Alvaro */}
          <div className="bg-white rounded-xl p-2.5 border-2 border-ink shadow-brutsm flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-lg shrink-0">{settings.emoji2 || '🦊'}</span>
              <span className="text-xs font-black text-ink truncate">{settings.apelido2}:</span>
            </div>
            <span className={`badge-brut text-[10px] shrink-0 ${statusJogar2 ? statusJogar2.quer_jogar ? 'bg-cyan text-ink' : 'bg-pink text-white' : 'bg-ink/10 text-ink/70'}`}>
              {statusJogar2 ? statusJogar2.quer_jogar ? 'Quer jogar ✅' : 'Descansando 💤' : 'Ainda não respondeu'}
            </span>
          </div>
        </div>
      </div>

      {/* Seletor de Temas */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-extrabold text-white">Selecione o tema:</span>
          <button
            onClick={() => setIsRouletteOpen(true)}
            className="btn-brut px-3 py-1 bg-yellow text-ink text-xs shrink-0 shadow-brutsm flex items-center gap-1"
          >
            🎲 Sortear
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORIAS.map((cat) => {
            const isActive = categoriaAtiva === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`py-2 px-1 rounded-xl text-center text-xs font-black border-3 border-ink transition-all shadow-brutsm ${
                  isActive ? `${cat.cor} text-ink scale-102 shadow-brut` : 'bg-white text-ink/80'
                }`}
              >
                <span className="block text-base">{cat.emoji}</span>
                <span className="block text-[10px] leading-tight truncate mt-0.5 font-extrabold">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Adicionar Tópico */}
      <div className="flex gap-2 mb-4">
        <input
          value={novoTopicoTexto}
          onChange={(e) => setNovoTopicoTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTopico()}
          placeholder={`Adicionar ideia em ${catConfig.label}...`}
          className="flex-1 rounded-xl border-3 border-ink px-3.5 py-2.5 outline-none bg-white text-xs font-bold placeholder:text-ink/40 shadow-brutsm min-w-0"
        />
        <button
          onClick={handleAddTopico}
          className="btn-brut px-4 bg-ink text-white text-base shrink-0 shadow-brutsm"
        >
          +
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2 mb-8">
        {topicosFiltrados.length === 0 ? (
          <div className="card-brut p-4 text-center">
            <p className="text-xs text-ink/60 font-bold">
              Nada planejado em {catConfig.label} ainda. Adicione acima! 💡
            </p>
          </div>
        ) : (
          topicosFiltrados.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 card-brut px-3.5 py-2.5 shadow-brutsm ${
                item.concluida ? 'opacity-60 bg-white/70' : 'bg-white'
              }`}
            >
              <button
                onClick={() => handleToggleTopico(item)}
                className={`w-6 h-6 rounded-lg border-3 border-ink flex items-center justify-center shrink-0 font-black text-xs ${
                  item.concluida ? `${catConfig.cor} text-ink` : 'bg-white'
                }`}
              >
                {item.concluida && '✓'}
              </button>

              <div className="flex-1 min-w-0">
                <span className={`block text-xs font-bold break-words leading-tight ${item.concluida ? 'line-through text-ink/50' : 'text-ink'}`}>
                  {item.titulo}
                </span>
                {item.adicionado_por && (
                  <span className="block text-[9px] text-ink/40 font-bold mt-0.5">
                    por {item.adicionado_por}
                  </span>
                )}
              </div>

              <button
                onClick={() => setDeleteModal({ isOpen: true, type: 'topico', id: item.id })}
                className="text-ink/30 hover:text-pink font-black text-base px-1 shrink-0"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* ===================== FEED DE RECADOS + FOTOS ===================== */}
      <div className="border-t-3 border-white/20 pt-6">
        <h2 className="font-display font-extrabold text-white text-xl mb-3 flex items-center gap-2">
          💬 Recados, Fotos & Conversas
        </h2>

        {/* Input Chat com Foto */}
        <div className="card-brut p-4 mb-4 shadow-brut">
          {/* Preview de foto selecionada */}
          {previewFoto && (
            <div className="relative mb-2.5">
              <img
                src={previewFoto}
                alt="Preview"
                className="w-full max-h-40 object-cover rounded-xl border-3 border-ink shadow-brutsm"
              />
              <button
                onClick={() => { setFotoParaEnviar(null); setPreviewFoto(null); }}
                className="absolute top-2 right-2 w-6 h-6 bg-pink border-2 border-ink rounded-full text-xs font-black text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          )}

          <textarea
            value={novoChatTexto}
            onChange={(e) => setNovoChatTexto(e.target.value)}
            placeholder={`Deixe um recado para ${outroNome}... ou mande uma foto do seu dia!`}
            rows={2}
            className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs resize-none font-medium mb-2.5 placeholder:text-ink/40"
          />

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Emojis + Câmera */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none flex-1 pb-0.5">
              {/* Botão câmera */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 rounded-full bg-yellow border-2 border-ink flex items-center justify-center text-sm shrink-0 hover:bg-yellow/80 transition"
                title="Adicionar foto"
              >
                📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelecionarFoto}
                className="hidden"
              />

              {EMOJIS_CHAT.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmojiChat(em)}
                  className={`w-7 h-7 rounded-full text-sm border-2 shrink-0 transition ${
                    emojiChat === em ? 'border-ink bg-yellow scale-110' : 'border-transparent hover:bg-ink/5'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>

            <button
              onClick={handleEnviarChat}
              disabled={enviandoChat}
              className="btn-brut px-4 py-2 bg-pink text-ink text-xs disabled:opacity-50 shrink-0 w-full sm:w-auto shadow-brutsm"
            >
              {uploadandoFoto ? 'Enviando foto...' : enviandoChat ? 'Enviando...' : 'Enviar 💌'}
            </button>
          </div>
        </div>

        {/* Feed de Mensagens + Fotos */}
        <div className="space-y-2.5">
          {mensagens.length === 0 ? (
            <p className="text-center text-xs text-white/70 font-medium py-4">
              Nenhum recadinho ainda hoje. Mande uma foto do seu dia! 📸
            </p>
          ) : (
            mensagens.map((msg) => {
              const autorNome = msg.parceiro === 'parceiro1' ? settings.apelido1 : settings.apelido2;
              const autorEmoji = msg.parceiro === 'parceiro1' ? settings.emoji1 : settings.emoji2;
              const corBadge = msg.parceiro === 'parceiro1' ? 'bg-yellow' : 'bg-pink';

              return (
                <div key={msg.id} className="card-brut px-4 py-3 shadow-brutsm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`badge-brut ${corBadge} text-ink text-[10px]`}>
                      {msg.emoji} {autorEmoji} {autorNome}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink/40 font-bold">
                        {formatHora(msg.criado_em)}
                        {msg.editado && ' · editado'}
                      </span>

                      {editandoMsgId !== msg.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditandoMsgId(msg.id); setTextoEdicao(msg.texto); }}
                            className="text-ink/40 hover:text-royal text-xs p-0.5"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, type: 'mensagem', id: msg.id })}
                            className="text-ink/40 hover:text-pink text-xs p-0.5"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Foto da mensagem */}
                  {msg.foto_url && (
                    <div
                      onClick={() => setImagemCheia(msg.foto_url)}
                      className="cursor-pointer mb-2"
                    >
                      <img
                        src={msg.foto_url}
                        alt="Foto do dia"
                        className="w-full max-h-64 object-cover rounded-xl border-3 border-ink shadow-brutsm hover:opacity-95 transition"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {editandoMsgId === msg.id ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        value={textoEdicao}
                        onChange={(e) => setTextoEdicao(e.target.value)}
                        className="flex-1 rounded-lg border-2 border-ink px-2.5 py-1 text-xs font-bold outline-none"
                        autoFocus
                      />
                      <button onClick={() => handleSalvarEdicao(msg.id)} className="btn-brut px-2.5 py-1 bg-yellow text-ink text-xs">Salvar</button>
                      <button onClick={() => setEditandoMsgId(null)} className="btn-brut px-2 py-1 bg-white text-ink text-xs">✕</button>
                    </div>
                  ) : (
                    msg.texto && msg.texto !== '📸' && (
                      <p className="text-xs text-ink font-semibold leading-relaxed break-words">
                        {msg.texto}
                      </p>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modais */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, id: null })}
        title="Confirmar Exclusão"
        badgeText="Excluir"
        badgeColor="bg-pink"
        confirmText="Sim, Excluir"
        onConfirm={handleExecutarExclusao}
        isDestructive={true}
      >
        <p>Você tem certeza que deseja remover este item?</p>
      </Modal>

      <RouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        items={topicosFiltrados.filter((t) => !t.concluida)}
        title={`Sortear ${catConfig.label} 🎲`}
        emptyMessage={`Adicione opções pendentes em ${catConfig.label} para sortear!`}
      />

      {/* Modal de Imagem em Tela Cheia */}
      {imagemCheia && (
        <div
          onClick={() => setImagemCheia(null)}
          className="fixed inset-0 z-50 bg-ink/85 flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <img
            src={imagemCheia}
            alt="Foto ampliada"
            className="rounded-2xl border-3 border-ink shadow-brut max-h-[88vh] object-contain"
          />
        </div>
      )}
    </div>
  );
}
