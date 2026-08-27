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
  getTodayDateString,
  subscribeToTable,
} from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';
import RouletteModal from '../RouletteModal';

const CATEGORIAS = [
  { id: 'roles', label: 'Rolês & Passeios', emoji: '🚶', cor: 'bg-cyan', borda: 'border-cyan' },
  { id: 'filmes', label: 'Filmes & Séries', emoji: '🎬', cor: 'bg-pink', borda: 'border-pink' },
  { id: 'casa', label: 'Em Casa', emoji: '🏡', cor: 'bg-purple', borda: 'border-purple' },
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

  // Modais
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'topico' | 'mensagem'
    id: null,
  });

  const [isRouletteOpen, setIsRouletteOpen] = useState(false);

  // Chat State
  const [novoChatTexto, setNovoChatTexto] = useState('');
  const [emojiChat, setEmojiChat] = useState('😌');
  const [enviandoChat, setEnviandoChat] = useState(false);
  const [editandoMsgId, setEditandoMsgId] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState('');

  // Carrega e assina Realtime
  useEffect(() => {
    carregarTudo();

    const unsubTopicos = subscribeToTable('topicos', () => carregarTudo());
    const unsubJogos = subscribeToTable('jogar_do_dia', () => carregarTudo());
    const unsubMsg = subscribeToTable('mensagens_conversa', () => carregarTudo());

    return () => {
      unsubTopicos();
      unsubJogos();
      unsubMsg();
    };
  }, []);

  async function carregarTudo() {
    try {
      const [topicosRes, jogosRes, msgRes] = await Promise.all([
        buscarTopicosDoDia(hojeIso),
        buscarJogarDoDia(hojeIso),
        buscarMensagensConversa(hojeIso),
      ]);
      setTopicos(topicosRes);
      setJogosHoje(jogosRes);
      setMensagens(msgRes);
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
      toast.success('Atividade adicionada com sucesso! 💜');
      carregarTudo();
    } catch (err) {
      console.error(err);
      toast.error('Não consegui salvar agora.');
    }
  }

  async function handleToggleTopico(item) {
    try {
      await alternarTopicoConcluido(item.id, !item.concluida);
      carregarTudo();
    } catch (err) {
      console.error(err);
    }
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
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir.');
    }
  }

  // Jogar do dia
  async function handleResponderJogar(querJogar) {
    try {
      await responderJogarDoDia(quemSouEu, querJogar);
      toast.love(querJogar ? '🎮 Boa! Avisado que você quer jogar!' : 'Tudo bem, descansar também é ótimo! ✨');
      carregarTudo();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar resposta.');
    }
  }

  // Chat do dia
  async function handleEnviarChat() {
    if (!novoChatTexto.trim()) return;
    setEnviandoChat(true);
    try {
      await enviarMensagemConversa(quemSouEu, novoChatTexto.trim(), emojiChat);
      setNovoChatTexto('');
      toast.love('Recadinho enviado! 💌');
      carregarTudo();
    } catch (err) {
      console.error(err);
      toast.error('Não consegui enviar a mensagem.');
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
    } catch (err) {
      console.error(err);
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

  return (
    <div className="px-3.5 sm:px-6 pt-4 max-w-md mx-auto pb-14 animate-fadeIn">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-purple text-ink text-[10px]">
          Planos & Sintonia 📋
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          Hoje
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-4 leading-tight">
        O que vamos viver hoje?
      </h1>

      {/* Card "Você quer jogar hoje? 🎮" */}
      <div className="card-brut p-4 mb-5 bg-yellow shadow-brut">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black text-ink uppercase tracking-wide">
            🎮 Bora Jogar Hoje?
          </p>
          <span className="text-[10px] font-extrabold text-ink/70">
            Status ao vivo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => handleResponderJogar(true)}
            className="py-2.5 px-2 rounded-xl text-xs font-black border-3 border-ink bg-white text-ink hover:bg-ink hover:text-yellow transition shadow-brutsm active:scale-98 flex items-center justify-center gap-1.5"
          >
            <span>🎮</span>
            <span>Sim, bora!</span>
          </button>
          <button
            onClick={() => handleResponderJogar(false)}
            className="py-2.5 px-2 rounded-xl text-xs font-black border-3 border-ink bg-white text-ink hover:bg-ink hover:text-yellow transition shadow-brutsm active:scale-98 flex items-center justify-center gap-1.5"
          >
            <span>💤</span>
            <span>Hoje não</span>
          </button>
        </div>

        {/* Respostas de Ambos */}
        <div className="bg-white/80 rounded-xl p-2.5 border-2 border-ink/20 flex flex-col sm:flex-row gap-1.5 justify-between text-xs font-bold text-ink">
          <div className="flex items-center gap-1.5">
            <span>{settings.emoji1}</span>
            <span className="truncate">{settings.apelido1}:</span>
            <span className="font-black text-royal">
              {statusJogar1 ? (statusJogar1.quer_jogar ? 'Quer jogar ✅' : 'Descansando 💤') : 'Ainda não respondeu'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{settings.emoji2}</span>
            <span className="truncate">{settings.apelido2}:</span>
            <span className="font-black text-royal">
              {statusJogar2 ? (statusJogar2.quer_jogar ? 'Quer jogar ✅' : 'Descansando 💤') : 'Ainda não respondeu'}
            </span>
          </div>
        </div>
      </div>

      {/* Seletor Responsivo de Categorias (Wrap para nunca quebrar no mobile) */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-extrabold text-white">
            Selecione o tema:
          </span>
          <button
            onClick={() => setIsRouletteOpen(true)}
            className="btn-brut px-3 py-1 bg-yellow text-ink text-xs shrink-0 shadow-brutsm flex items-center gap-1"
            title="Sortear o que fazer"
          >
            🎲 Sortear Atividade
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORIAS.map((cat) => {
            const isActive = categoriaAtiva === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`py-2 px-1.5 rounded-xl text-center text-xs font-black border-3 border-ink transition-all shadow-brutsm ${
                  isActive
                    ? `${cat.cor} text-ink scale-102 shadow-brut`
                    : 'bg-white text-ink/80 hover:bg-white'
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

      {/* Input de Adicionar Tópico */}
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
          title="Adicionar"
        >
          +
        </button>
      </div>

      {/* Lista de Atividades do Tema */}
      <div className="space-y-2 mb-8">
        {topicosFiltrados.length === 0 ? (
          <div className="card-brut p-4 text-center">
            <p className="text-xs text-ink/60 font-bold">
              Nada planejado em {catConfig.label} para hoje. Adicione uma ideia acima! 💡
            </p>
          </div>
        ) : (
          topicosFiltrados.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 card-brut px-3.5 py-2.5 shadow-brutsm transition ${
                item.concluida ? 'opacity-60 bg-white/70' : 'bg-white'
              }`}
            >
              <button
                onClick={() => handleToggleTopico(item)}
                className={`w-6 h-6 rounded-lg border-3 border-ink flex items-center justify-center shrink-0 font-black text-xs ${
                  item.concluida ? `${catConfig.cor} text-ink` : 'bg-white'
                }`}
                title={item.concluida ? 'Marcar como não concluído' : 'Marcar como concluído'}
              >
                {item.concluida && '✓'}
              </button>

              <div className="flex-1 min-w-0">
                <span
                  className={`block text-xs font-bold break-words leading-tight ${
                    item.concluida ? 'line-through text-ink/50' : 'text-ink'
                  }`}
                >
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
                aria-label="Excluir item"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Conversas do Dia (Feed de Recados) */}
      <div className="border-t-3 border-white/20 pt-6">
        <h2 className="font-display font-extrabold text-white text-xl mb-3 flex items-center gap-2">
          💬 Recados & Conversas do Dia
        </h2>

        {/* Input Chat */}
        <div className="card-brut p-4 mb-4 shadow-brut">
          <textarea
            value={novoChatTexto}
            onChange={(e) => setNovoChatTexto(e.target.value)}
            placeholder={`Deixe um recado carinhoso para ${outroNome}...`}
            rows={2}
            className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs resize-none font-medium mb-2.5 placeholder:text-ink/40"
          />

          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            {/* Emojis rápidos */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 max-w-full">
              {EMOJIS_CHAT.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmojiChat(em)}
                  className={`w-7 h-7 rounded-full text-sm border-2 shrink-0 transition ${
                    emojiChat === em
                      ? 'border-ink bg-yellow scale-110'
                      : 'border-transparent hover:bg-ink/5'
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
              {enviandoChat ? 'Enviando...' : 'Enviar 💌'}
            </button>
          </div>
        </div>

        {/* Feed de Recados */}
        <div className="space-y-2.5">
          {mensagens.length === 0 ? (
            <p className="text-center text-xs text-white/70 font-medium py-4">
              Nenhum recadinho ainda hoje. Seja o primeiro a mandar! 💌
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

                      {/* Botões de Ação para Ambos */}
                      {editandoMsgId !== msg.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditandoMsgId(msg.id);
                              setTextoEdicao(msg.texto);
                            }}
                            className="text-ink/40 hover:text-royal text-xs p-0.5"
                            title="Editar mensagem"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, type: 'mensagem', id: msg.id })}
                            className="text-ink/40 hover:text-pink text-xs p-0.5"
                            title="Excluir mensagem"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {editandoMsgId === msg.id ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={textoEdicao}
                        onChange={(e) => setTextoEdicao(e.target.value)}
                        className="flex-1 rounded-lg border-2 border-ink px-2.5 py-1 text-xs font-bold outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSalvarEdicao(msg.id)}
                        className="btn-brut px-2.5 py-1 bg-yellow text-ink text-xs"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditandoMsgId(null)}
                        className="btn-brut px-2 py-1 bg-white text-ink text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-ink font-semibold leading-relaxed break-words">
                      {msg.texto}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
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
        <p>Você tem certeza que deseja remover este item? Essa ação não pode ser desfeita.</p>
      </Modal>

      {/* Sorteador Roleta */}
      <RouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        items={topicosFiltrados.filter((t) => !t.concluida)}
        title={`Sortear ${catConfig.label} 🎲`}
        emptyMessage={`Adicione algumas opções pendentes em ${catConfig.label} para poder sortear!`}
      />
    </div>
  );
}
