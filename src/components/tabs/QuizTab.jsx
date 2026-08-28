import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  buscarPerguntasQuiz,
  buscarRespostasQuiz,
  salvarRespostaQuiz,
  criarPerguntaQuiz,
  editarPerguntaQuiz,
  excluirPerguntaQuiz,
  contarRespostasPergunta,
  subscribeToTable,
} from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';
import Avatar from '../Avatar';

function formatDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function QuizTab({ quemSouEu, settings }) {
  const toast = useToast();
  const outroParceiro = quemSouEu === 'parceiro1' ? 'parceiro2' : 'parceiro1';
  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings.apelido1 : settings.apelido2;
  const meuEmoji = ehP1 ? settings.emoji1 : settings.emoji2;
  const meuFoto = ehP1 ? settings.foto1 : settings.foto2;

  const outroNome = ehP1 ? settings.apelido2 : settings.apelido1;
  const outroEmoji = ehP1 ? settings.emoji2 : settings.emoji1;
  const outroFoto = ehP1 ? settings.foto2 : settings.foto1;

  const [loading, setLoading] = useState(true);
  const [perguntas, setPerguntas] = useState([]);
  const [respostas, setRespostas] = useState([]);
  const [modoGerenciar, setModoGerenciar] = useState(false);

  useEffect(() => {
    carregar();
    const unsubPerguntas = subscribeToTable('quiz_perguntas_v2', () => carregar());
    const unsubRespostas = subscribeToTable('quiz_respostas_v2', () => carregar());
    return () => {
      unsubPerguntas();
      unsubRespostas();
    };
  }, []);

  async function carregar() {
    try {
      const [pData, rData] = await Promise.all([
        buscarPerguntasQuiz(),
        buscarRespostasQuiz(),
      ]);
      setPerguntas(pData);
      setRespostas(rData);
    } catch (err) {
      console.error('Erro ao carregar quiz:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return modoGerenciar ? (
    <GerenciarPerguntasView
      perguntas={perguntas}
      onVoltar={() => {
        setModoGerenciar(false);
        carregar();
      }}
    />
  ) : (
    <div className="px-4 sm:px-6 pt-5 max-w-md mx-auto pb-12 animate-fadeIn">
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-pink text-ink">Sintonia & Amor 💞</p>
        <button
          onClick={() => setModoGerenciar(true)}
          className="text-xs font-black text-yellow underline hover:text-yellow/80"
        >
          Gerenciar perguntas
        </button>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1">
        Quiz de Compatibilidade
      </h1>
      <p className="text-xs text-white/80 font-medium mb-5">
        Responda às perguntas para ver se vocês pensam igual! 💙
      </p>

      {perguntas.length === 0 ? (
        <div className="card-brut p-6 text-center">
          <p className="text-sm font-bold text-ink/70">
            Nenhuma pergunta cadastrada ainda.
          </p>
          <button
            onClick={() => setModoGerenciar(true)}
            className="btn-brut mt-4 px-5 py-2.5 bg-yellow text-ink text-xs font-black shadow-brut"
          >
            + Adicionar Perguntas
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {perguntas.map((p, index) => (
            <QuizCard
              key={p.id}
              numero={index + 1}
              pergunta={p}
              respostas={respostas.filter((r) => r.pergunta_id === p.id)}
              quemSouEu={quemSouEu}
              meuNome={meuNome}
              meuEmoji={meuEmoji}
              meuFoto={meuFoto}
              outroParceiro={outroParceiro}
              outroNome={outroNome}
              outroEmoji={outroEmoji}
              outroFoto={outroFoto}
              onRespostaSalva={carregar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizCard({
  numero,
  pergunta,
  respostas,
  quemSouEu,
  meuNome,
  meuEmoji,
  meuFoto,
  outroParceiro,
  outroNome,
  outroEmoji,
  outroFoto,
  onRespostaSalva,
}) {
  const toast = useToast();
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);

  const respostaMinha = respostas.find((r) => r.parceiro === quemSouEu);
  const respostaOutro = respostas.find((r) => r.parceiro === outroParceiro);

  const ambosResponderam = Boolean(respostaMinha && respostaOutro);
  const deuMatch = ambosResponderam && respostaMinha.resposta === respostaOutro.resposta;

  async function handleResponder(opcao) {
    setSalvando(true);
    try {
      const isEdicao = Boolean(respostaMinha);
      await salvarRespostaQuiz(pergunta.id, quemSouEu, opcao, isEdicao);

      if (respostaOutro && respostaOutro.resposta === opcao) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD93D', '#FF4D97', '#8B7FFF'],
        });
        toast.love('DEU MATCH! Vocês pensaram exatamente igual! 💙');
      } else {
        toast.success('Resposta salva!');
      }

      setEditando(false);
      onRespostaSalva();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar resposta.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card-brut p-4 sm:p-5 relative shadow-brut">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="badge-brut bg-yellow text-ink text-[10px]">
          Pergunta #{numero}
        </span>
        {ambosResponderam && (
          <span
            className={`badge-brut text-[10px] ${
              deuMatch ? 'bg-cyan text-ink' : 'bg-pink text-white'
            }`}
          >
            {deuMatch ? '🎉 DEU MATCH!' : '💭 Respostas Diferentes'}
          </span>
        )}
      </div>

      <h3 className="font-display font-extrabold text-sm sm:text-base text-ink mb-4 leading-snug">
        {pergunta.texto}
      </h3>

      {/* Opções para Responder */}
      {!respostaMinha || editando ? (
        <div className="space-y-2 mb-3">
          {pergunta.opcoes.map((opcao) => {
            const selecionada = respostaMinha?.resposta === opcao;
            return (
              <button
                key={opcao}
                disabled={salvando}
                onClick={() => handleResponder(opcao)}
                className={`w-full py-2.5 px-3 rounded-xl border-3 border-ink font-extrabold text-xs text-left transition-all shadow-brutsm active:scale-98 ${
                  selecionada
                    ? 'bg-yellow text-ink'
                    : 'bg-white text-ink hover:bg-yellow/20'
                }`}
              >
                {opcao}
              </button>
            );
          })}

          {editando && (
            <button
              onClick={() => setEditando(false)}
              className="text-[10px] font-black text-ink/50 underline block mt-1"
            >
              Cancelar edição
            </button>
          )}
        </div>
      ) : (
        /* Minha Resposta Registrada */
        <div className="bg-purple/15 rounded-xl p-3 mb-2 border-2 border-ink/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Avatar
                foto={meuFoto}
                emoji={meuEmoji}
                nome={meuNome}
                size="xs"
                corFundo="bg-purple"
              />
              <p className="text-[10px] font-black text-ink/60 uppercase">
                {meuNome} (Você)
              </p>
            </div>
            <button
              onClick={() => setEditando(true)}
              className="text-[10px] font-black text-royal underline"
            >
              Editar
            </button>
          </div>
          <p className="text-xs font-extrabold text-ink mt-1">
            {respostaMinha.resposta}
          </p>
          <p className="text-[9px] text-ink/40 font-bold mt-1">
            {formatDataHora(respostaMinha.atualizado_em || respostaMinha.criado_em)}
            {respostaMinha.editado && ' · editado'}
          </p>
        </div>
      )}

      {/* Resposta do Outro Parceiro */}
      <div className="bg-cyan/15 rounded-xl p-3 mt-2 border-2 border-ink/20">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Avatar
            foto={outroFoto}
            emoji={outroEmoji}
            nome={outroNome}
            size="xs"
            corFundo="bg-cyan"
          />
          <p className="text-[10px] font-black text-ink/60 uppercase">
            {outroNome}
          </p>
        </div>
        {respostaOutro ? (
          <div>
            <p className="text-xs font-extrabold text-ink mt-1">
              {respostaOutro.resposta}
            </p>
            <p className="text-[9px] text-ink/40 font-bold mt-1">
              {formatDataHora(respostaOutro.atualizado_em || respostaOutro.criado_em)}
              {respostaOutro.editado && ' · editado'}
            </p>
          </div>
        ) : (
          <p className="text-xs text-ink/50 font-medium mt-1 italic">
            {outroNome} ainda não respondeu esta pergunta.
          </p>
        )}
      </div>

      {/* Match Banner */}
      {ambosResponderam && (
        <div
          className={`mt-3 text-center py-1.5 px-3 rounded-lg font-black text-xs border-2 border-ink ${
            deuMatch ? 'bg-cyan text-ink' : 'bg-pink text-white'
          }`}
        >
          {deuMatch ? '💙 Sintonia Total! Vocês combinaram!' : '👀 Vocês pensam diferente — que tal conversar sobre?'}
        </div>
      )}
    </div>
  );
}

function GerenciarPerguntasView({ perguntas, onVoltar }) {
  const toast = useToast();
  const [lista, setLista] = useState(perguntas);
  const [novoTexto, setNovoTexto] = useState('');
  const [novasOpcoes, setNovasOpcoes] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [textoEdit, setTextoEdit] = useState('');
  const [opcoesEdit, setOpcoesEdit] = useState('');

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    totalRespostas: 0,
  });

  async function handleAdd() {
    if (!novoTexto.trim() || !novasOpcoes.trim()) {
      toast.error('Preencha o texto e as opções da pergunta.');
      return;
    }
    const opcoesArr = novasOpcoes.split(',').map((s) => s.trim()).filter(Boolean);
    if (opcoesArr.length < 2) {
      toast.error('Informe pelo menos 2 opções separadas por vírgula.');
      return;
    }

    try {
      await criarPerguntaQuiz(novoTexto.trim(), opcoesArr);
      setNovoTexto('');
      setNovasOpcoes('');
      toast.success('Pergunta adicionada com sucesso!');
      recarregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar pergunta.');
    }
  }

  async function recarregar() {
    const data = await buscarPerguntasQuiz();
    setLista(data);
  }

  function handleIniciarEdicao(item) {
    setEditandoId(item.id);
    setTextoEdit(item.texto);
    setOpcoesEdit(item.opcoes.join(', '));
  }

  async function handleSalvarEdicao(id) {
    if (!textoEdit.trim() || !opcoesEdit.trim()) return;
    const opcoesArr = opcoesEdit.split(',').map((s) => s.trim()).filter(Boolean);
    if (opcoesArr.length < 2) return;

    try {
      await editarPerguntaQuiz(id, textoEdit.trim(), opcoesArr);
      setEditandoId(null);
      toast.success('Pergunta atualizada!');
      recarregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar alteração.');
    }
  }

  async function handleAbrirDelete(id) {
    try {
      const total = await contarRespostasPergunta(id);
      setDeleteModal({ isOpen: true, id, totalRespostas: total });
    } catch {
      setDeleteModal({ isOpen: true, id, totalRespostas: 0 });
    }
  }

  async function handleConfirmDelete() {
    try {
      await excluirPerguntaQuiz(deleteModal.id);
      toast.success('Pergunta excluída!');
      setDeleteModal({ isOpen: false, id: null, totalRespostas: 0 });
      recarregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir pergunta.');
    }
  }

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-md mx-auto pb-12 animate-fadeIn">
      <button
        onClick={onVoltar}
        className="btn-brut py-1.5 px-3 bg-white text-ink text-xs font-black mb-4 shadow-brutsm flex items-center gap-1"
      >
        ← Voltar ao Quiz
      </button>

      <h1 className="font-display text-2xl font-extrabold text-white mb-4">
        Gerenciar Perguntas
      </h1>

      {/* Adicionar Pergunta */}
      <div className="card-brut p-4 mb-6 shadow-brut">
        <h2 className="font-display font-extrabold text-sm text-ink mb-2">
          Nova Pergunta
        </h2>
        <input
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          placeholder="Ex: Qual nosso plano perfeito para o fim de semana?"
          className="w-full rounded-xl border-3 border-ink px-3 py-2 text-xs font-bold mb-2 bg-white outline-none"
        />
        <input
          value={novasOpcoes}
          onChange={(e) => setNovasOpcoes(e.target.value)}
          placeholder="Opções separadas por vírgula (ex: Praia, Cinema, Ficar na cama)"
          className="w-full rounded-xl border-3 border-ink px-3 py-2 text-xs font-bold mb-3 bg-white outline-none"
        />
        <button
          onClick={handleAdd}
          className="btn-brut w-full py-2.5 bg-yellow text-ink text-xs font-black shadow-brut"
        >
          + Adicionar Pergunta
        </button>
      </div>

      {/* Lista Atual */}
      <div className="space-y-3">
        {lista.map((item, index) => (
          <div key={item.id} className="card-brut p-3.5 shadow-brutsm">
            {editandoId === item.id ? (
              <div className="space-y-2">
                <input
                  value={textoEdit}
                  onChange={(e) => setTextoEdit(e.target.value)}
                  className="w-full rounded-lg border-2 border-ink px-2.5 py-1 text-xs font-bold bg-white outline-none"
                />
                <input
                  value={opcoesEdit}
                  onChange={(e) => setOpcoesEdit(e.target.value)}
                  className="w-full rounded-lg border-2 border-ink px-2.5 py-1 text-xs font-bold bg-white outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSalvarEdicao(item.id)}
                    className="btn-brut px-3 py-1 bg-yellow text-ink text-xs font-black"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="btn-brut px-3 py-1 bg-white text-ink text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-display font-extrabold text-xs text-ink">
                    #{index + 1} {item.texto}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleIniciarEdicao(item)}
                      className="text-ink/40 hover:text-royal text-xs p-1"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleAbrirDelete(item.id)}
                      className="text-ink/40 hover:text-pink text-xs p-1"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-ink/60 font-semibold">
                  Opções: {item.opcoes.join(' • ')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, totalRespostas: 0 })}
        title="Excluir Pergunta"
        badgeText="Atenção"
        badgeColor="bg-pink"
        confirmText="Sim, Excluir"
        onConfirm={handleConfirmDelete}
        isDestructive={true}
      >
        <p>
          Tem certeza que deseja remover esta pergunta?{' '}
          {deleteModal.totalRespostas > 0 &&
            `Ela já possui ${deleteModal.totalRespostas} resposta(s) registrada(s).`}
        </p>
      </Modal>
    </div>
  );
}
