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
  { id: 'filmes', label: 'Filmes & Séries', emoji: '🎬', cor: 'bg-pink' },
  { id: 'roles', label: 'Rolês', emoji: '🚶', cor: 'bg-cyan' },
  { id: 'casa', label: 'Em casa', emoji: '🏡', cor: 'bg-purple' },
];

const EMOJIS_CHAT = ['🥰', '😊', '😌', '😐', '😕', '😢', '😤'];

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TopicosTab({ quemSouEu, settings }) {
  const toast = useToast();
  const hojeIso = getTodayDateString();
  const meuNome = quemSouEu === 'parceiro1' ? settings.apelido1 : settings.apelido2;

  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState('roles');
  const [novoTopicoTexto, setNovoTopicoTexto] = useState('');
  const [topicos, setTopicos] = useState([]);
  const [jogosHoje, setJogosHoje] = useState([]);
  const [mensagens, setMensagens] = useState([]);

  // Modais de confirmação
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'topico' | 'mensagem'
    id: null,
  });

  // Modal Sorteador
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

  // Ações de Tópicos
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
      toast.success('Atividade adicionada aos planos de hoje!');
      carregarTudo();
    } catch (err) {
      console.error(err);
      toast.error('Não consegui salvar o item agora.');
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

  function confirmarExclusao(type, id) {
    setDeleteModal({ isOpen: true, type, id });
  }

  async function handleExecutarExclusao() {
    try {
      if (deleteModal.type === 'topico') {
        await excluirTopico(deleteModal.id);
        toast.success('Item removido com sucesso!');
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

  // Ações de Jogar
  async function handleResponderJogar(querJogar) {
    try {
      await responderJogarDoDia(quemSouEu, querJogar);
      toast.love(querJogar ? '🎮 Boa! Avisado que você quer jogar hoje!' : 'Tudo bem, descansar também é ótimo! ✨');
      carregarTudo();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar resposta.');
    }
  }

  // Ações de Chat
  async function handleEnviarChat() {
    if (!novoChatTexto.trim()) return;
    setEnviandoChat(true);
    try {
      await enviarMensagemConversa(quemSouEu, novoChatTexto.trim(), emojiChat);
      setNovoChatTexto('');
      toast.love('Mensagem enviada com carinho! 💌');
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
  const catConfig = CATEGORIAS.find((c) => c.id === categoriaAtiva);

  const statusJogar1 = jogosHoje.find((j) => j.parceiro === 'parceiro1');
  const statusJogar2 = jogosHoje.find((j) => j.parceiro === 'parceiro2');

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-md mx-auto pb-12 animate-fadeIn">
      <p className="badge-brut bg-purple text-ink mb-2">Planos & Conexão</p>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-5">
        O que vamos viver hoje?
      </h1>

      {/* Card "Você quer jogar hoje? 🎮" */}
      <div className="card-brut p-4 mb-4 bg-yellow shadow-brut">
        <p className="text-sm font-black text-ink mb-2">
          Você quer jogar hoje? 🎮
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleResponderJogar(true)}
            className="flex-1 py-2 rounded-full text-xs font-black border-3 border-ink bg-white text-ink hover:bg-ink hover:text-yellow transition shadow-brutsm active:scale-95"
          >
            Sim, vamos! ✅
          </button>
          <button
            onClick={() => handleResponderJogar(false)}
            className="flex-1 py-2 rounded-full text-xs font-black border-3 border-ink bg-white text-ink hover:bg-ink hover:text-yellow transition shadow-brutsm active:scale-95"
          >
            Hoje não 💤
          </button>
        </div>

        <div className="text-xs font-extrabold text-ink/80 mt-3 pt-2 border-t-2 border-ink/20 flex justify-between">
          <span>
            {settings.apelido1}: {statusJogar1 ? (statusJogar1.quer_jogar ? 'Quer jogar ✅' : 'Não hoje 💤') : 'Ainda não respondeu'}
          </span>
          <span>
            {settings.apelido2}: {statusJogar2 ? (statusJogar2.quer_jogar ? 'Quer jogar ✅' : 'Não hoje 💤') : 'Ainda não respondeu'}
          </span>
        </div>
      </div>

      {/* Categorias Tabs + Sorteador */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIAS.map((cat) => {
            const isActive = categoriaAtiva === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black border-3 border-ink transition shadow-brutsm ${
                  isActive ? `${cat.cor} text-ink scale-102` : 'bg-white text-ink'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Botão de Sortear Rolê */}
        <button
          onClick={() => setIsRouletteOpen(true)}
          className="btn-brut px-2.5 py-1.5 bg-yellow text-ink text-xs shrink-0 shadow-brutsm"
          title="Sortear o que fazer"
        >
          🎲 Sortear
        </button>
      </div>

      {/* Input de Adicionar Tópico */}
      <div className="flex gap-2 mb-4">
        <input
          value={novoTopicoTexto}
          onChange={(e) => setNovoTopicoTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTopico()}
          placeholder={`Adicionar em ${catConfig.label}...`}
          className="flex-1 rounded-full border-3 border-ink px-4 py-2 outline-none bg-white text-xs font-bold placeholder:text-ink/40 shadow-brutsm"
        />
        <button
          onClick={handleAddTopico}
          className="btn-brut px-4 bg-ink text-white text-sm"
        >
          +
        </button>
      </div>

      {/* Lista de Itens da Categoria */}
      <div className="space-y-2 mb-8">
        {topicosFiltrados.length === 0 ? (
          <div className="card-brut p-4 text-center">
            <p className="text-xs text-ink/60 font-bold">
              Nada planejado em {catConfig.label} para hoje ainda.
            </p>
          </div>
        ) : (
          topicosFiltrados.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 card-brut px-3.5 py-2.5 shadow-brutsm transition ${
                item.concluida ? 'opacity-60 bg-white/70' : 'bg-white'
              }`}
            >
              <button
                onClick={() => handleToggleTopico(item)}
                className={`w-6 h-6 rounded-full border-3 border-ink flex items-center justify-center shrink-0 font-black text-xs ${
                  item.concluida ? `${catConfig.cor} text-ink` : 'bg-white'
                }`}
              >
                {item.concluida && '✓'}
              </button>

              <div className="flex-1 min-w-0">
                <span
                  className={`block text-xs font-bold truncate ${
                    item.concluida ? 'line-through text-ink/50' : 'text-ink'
                  }`}
                >
                  {item.titulo}
                </span>
                {item.adicionado_por && (
                  <span className="block text-[9px] text-ink/40 font-normal">
                    por {item.adicionado_por}
                  </span>
                )}
              </div>

              {item.parceiro === quemSouEu && (
                <button
                  onClick={() => confirmarExclusao('topico', item.id)}
                  className="text-ink/40 hover:text-pink font-black text-base px-1"
                  aria-label="Excluir"
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Conversas do Dia (Chat / Reflexões) */}
      <div className="border-t-3 border-white/20 pt-6">
        <h2 className="font-display font-extrabold text-white text-xl mb-3 flex items-center gap-2">
          💬 Conversas do Dia
        </h2>

        {/* Input Chat */}
        <div className="card-brut p-4 mb-4 shadow-brut">
          <textarea
            value={novoChatTexto}
            onChange={(e) => setNovoChatTexto(e.target.value)}
            placeholder="Deixe um recado, ideia ou como foi o seu dia..."
            rows={2}
            className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs resize-none font-medium mb-2.5 placeholder:text-ink/40"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {EMOJIS_CHAT.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmojiChat(em)}
                  className={`w-7 h-7 rounded-full text-sm border-2 transition ${
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
              className="btn-brut px-4 py-2 bg-pink text-ink text-xs disabled:opacity-50 shrink-0"
            >
              {enviandoChat ? 'Enviando...' : 'Enviar 💌'}
            </button>
          </div>
        </div>

        {/* Feed de Mensagens */}
        <div className="space-y-2.5">
          {mensagens.length === 0 ? (
            <p className="text-center text-xs text-white/70 font-medium py-4">
              Nenhuma conversa registrada hoje. Mande um recadinho! 💌
            </p>
          ) : (
            mensagens.map((msg) => {
              const ehEu = msg.parceiro === quemSouEu;
              const autorNome = msg.parceiro === 'parceiro1' ? settings.apelido1 : settings.apelido2;
              const corBadge = msg.parceiro === 'parceiro1' ? 'bg-yellow' : 'bg-pink';

              return (
                <div key={msg.id} className="card-brut px-4 py-3 shadow-brutsm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`badge-brut ${corBadge} text-ink text-[10px]`}>
                      {msg.emoji} {autorNome}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink/40 font-bold">
                        {formatHora(msg.criado_em)}
                        {msg.editado && ' · editado'}
                      </span>

                      {ehEu && editandoMsgId !== msg.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditandoMsgId(msg.id);
                              setTextoEdicao(msg.texto);
                            }}
                            className="text-ink/40 hover:text-royal text-xs px-1"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => confirmarExclusao('mensagem', msg.id)}
                            className="text-ink/40 hover:text-pink text-xs px-1"
                            title="Excluir"
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
                    <p className="text-xs text-ink font-semibold leading-relaxed">
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
