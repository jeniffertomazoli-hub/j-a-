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

function formatDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function QuizTab({ quemSouEu, settings }) {
  const toast = useToast();
  const outroParceiro = quemSouEu === 'parceiro1' ? 'parceiro2' : 'parceiro1';
  const meuNome = quemSouEu === 'parceiro1' ? settings.apelido1 : settings.apelido2;
  const outroNome = quemSouEu === 'parceiro1' ? settings.apelido2 : settings.apelido1;

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
          {perguntas.map((pergunta) => (
            <PerguntaCard
              key={pergunta.id}
              pergunta={pergunta}
              quemSouEu={quemSouEu}
              meuNome={meuNome}
              outroNome={outroNome}
              respostaMinha={respostas.find(
                (r) => r.pergunta_id === pergunta.id && r.parceiro === quemSouEu
              )}
              respostaOutro={respostas.find(
                (r) => r.pergunta_id === pergunta.id && r.parceiro === outroParceiro
              )}
              onAtualizar={carregar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PerguntaCard({
  pergunta,
  quemSouEu,
  meuNome,
  outroNome,
  respostaMinha,
  respostaOutro,
  onAtualizar,
}) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function handleResponder(opcao) {
    setSalvando(true);
    try {
      await salvarRespostaQuiz(
        pergunta.id,
        quemSouEu,
        opcao,
        Boolean(respostaMinha)
      );
      setEditando(false);
      onAtualizar();

      if (respostaOutro && respostaOutro.resposta === opcao) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#33DDF3', '#FF4D97', '#FFD93D'],
        });
        toast.love('Vocês deram MATCH nessa pergunta! 💙✨');
      } else {
        toast.success('Resposta salva com sucesso!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Não consegui salvar sua resposta.');
    } finally {
      setSalvando(false);
    }
  }

  const ambosResponderam = Boolean(respostaMinha && respostaOutro);
  const deuMatch = ambosResponderam && respostaMinha.resposta === respostaOutro.resposta;

  return (
    <div className="card-brut p-4 shadow-brut">
      <p className="font-display text-base font-bold text-ink mb-3 leading-snug">
        {pergunta.texto}
      </p>

      {/* Se ainda não respondi ou estou editando minha resposta */}
      {!respostaMinha || editando ? (
        <div className="flex flex-col gap-2">
          {pergunta.opcoes.map((opcao) => (
            <button
              key={opcao}
              onClick={() => handleResponder(opcao)}
              disabled={salvando}
              className="py-2.5 px-3 rounded-xl border-3 border-ink text-ink text-xs font-extrabold text-left bg-white hover:bg-yellow active:scale-98 transition shadow-brutsm disabled:opacity-50"
            >
              {opcao}
            </button>
          ))}
          {editando && (
            <button
              onClick={() => setEditando(false)}
              className="text-xs font-black text-ink/50 self-start mt-1 hover:underline"
            >
              Cancelar edição
            </button>
          )}
        </div>
      ) : (
        /* Minha Resposta Registrada */
        <div className="bg-purple/15 rounded-xl p-3 mb-2 border-2 border-ink/20">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-ink/60 uppercase">
              {meuNome} (Você)
            </p>
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
        <p className="text-[10px] font-black text-ink/60 uppercase">
          {outroNome}
        </p>
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

  // Modal de confirmação
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

  async function handleSalvarEdit(id) {
    const opcoesArr = opcoesEdit.split(',').map((s) => s.trim()).filter(Boolean);
    if (!textoEdit.trim() || opcoesArr.length < 2) {
      toast.error('Preencha o texto e pelo menos 2 opções.');
      return;
    }

    try {
      await editarPerguntaQuiz(id, textoEdit.trim(), opcoesArr);
      setEditandoId(null);
      toast.success('Pergunta atualizada!');
      recarregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar pergunta.');
    }
  }

  async function handleAbrirExclusao(item) {
    try {
      const count = await contarRespostasPergunta(item.id);
      setDeleteModal({
        isOpen: true,
        id: item.id,
        totalRespostas: count,
      });
    } catch {
      setDeleteModal({ isOpen: true, id: item.id, totalRespostas: 0 });
    }
  }

  async function handleConfirmDelete() {
    if (!deleteModal.id) return;
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

  async function recarregar() {
    const data = await buscarPerguntasQuiz();
    setLista(data);
  }

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-md mx-auto pb-12 animate-fadeIn">
      <p className="badge-brut bg-pink text-ink mb-2">Gerenciador</p>
      <h1 className="font-display text-2xl font-extrabold text-white mb-5">
        Perguntas do Quiz
      </h1>

      {/* Formulário de Nova Pergunta */}
      <div className="card-brut p-4 mb-5 shadow-brut">
        <p className="text-xs font-black uppercase text-ink/70 mb-2">
          Nova pergunta
        </p>
        <input
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          placeholder="Ex: Qual o nosso rolê perfeito?"
          className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs font-bold mb-2 shadow-brutsm placeholder:text-ink/40"
        />
        <input
          value={novasOpcoes}
          onChange={(e) => setNovasOpcoes(e.target.value)}
          placeholder="Opções separadas por vírgula (Ex: Praia, Cinema, Restaurante)"
          className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs font-bold mb-3 shadow-brutsm placeholder:text-ink/40"
        />
        <button
          onClick={handleAdd}
          className="btn-brut w-full py-2.5 bg-yellow text-ink text-xs font-black shadow-brut"
        >
          + Adicionar Pergunta
        </button>
      </div>

      {/* Lista de Perguntas */}
      <div className="space-y-3">
        {lista.map((p) => (
          <div key={p.id} className="card-brut p-4 shadow-brutsm">
            {editandoId === p.id ? (
              <div className="space-y-2">
                <input
                  value={textoEdit}
                  onChange={(e) => setTextoEdit(e.target.value)}
                  className="w-full rounded-xl border-3 border-ink px-3 py-1.5 outline-none bg-white text-xs font-bold"
                />
                <input
                  value={opcoesEdit}
                  onChange={(e) => setOpcoesEdit(e.target.value)}
                  className="w-full rounded-xl border-3 border-ink px-3 py-1.5 outline-none bg-white text-xs font-bold"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleSalvarEdit(p.id)}
                    className="btn-brut flex-1 py-1.5 bg-yellow text-ink text-xs font-black"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="btn-brut flex-1 py-1.5 bg-white text-ink text-xs font-black"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-bold text-ink text-xs leading-snug">
                  {p.texto}
                </p>
                <p className="text-[10px] text-ink/60 font-medium mt-1">
                  {p.opcoes.join(' · ')}
                </p>
                <div className="flex gap-3 mt-2.5">
                  <button
                    onClick={() => {
                      setEditandoId(p.id);
                      setTextoEdit(p.texto);
                      setOpcoesEdit(p.opcoes.join(', '));
                    }}
                    className="text-[10px] font-black text-royal underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleAbrirExclusao(p)}
                    className="text-[10px] font-black text-pink underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onVoltar}
        className="btn-brut mt-6 w-full py-3 bg-white text-ink text-xs font-black shadow-brut"
      >
        ← Voltar ao Quiz
      </button>

      {/* Modal de Exclusão */}
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
          {deleteModal.totalRespostas > 0
            ? `Esta pergunta já possui ${deleteModal.totalRespostas} resposta(s) registrada(s). Excluir também vai apagar as respostas. Deseja continuar?`
            : 'Tem certeza que deseja excluir esta pergunta?'}
        </p>
      </Modal>
    </div>
  );
}
