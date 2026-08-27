import React, { useState, useEffect } from 'react';
import {
  salvarRespostaDiaria,
  editarRespostaDiaria,
  excluirRespostaDiaria,
  buscarRespostasDiarias,
  salvarCapsulaSintonia,
  getTodayDateString,
  subscribeToTable,
} from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';

function getMoodEmoji(level) {
  if (level >= 90) return '🥰';
  if (level >= 75) return '😍';
  if (level >= 60) return '😊';
  if (level >= 45) return '😌';
  if (level >= 30) return '😐';
  if (level >= 15) return '😕';
  return '😢';
}

function getMoodLabel(level) {
  if (level >= 90) return 'Explodindo de amor & felicidade!';
  if (level >= 75) return 'Muito bem & conectado(a)';
  if (level >= 60) return 'Feliz e tranquilo(a)';
  if (level >= 45) return 'Em paz / descansando';
  if (level >= 30) return 'Neutro(a) / dia comum';
  if (level >= 15) return 'Um pouco cansado(a) / pensativo(a)';
  return 'Precisando de carinho e dengo 🥺';
}

function calcularCompatibilidade(n1, n2) {
  const diff = Math.abs(Number(n1) - Number(n2));
  return Math.max(0, Math.round(100 - diff * 0.8));
}

function getFraseSintonia(pct) {
  if (pct >= 85) return 'Vocês estão em sintonia total 💜';
  if (pct >= 65) return 'Vocês estão bem próximos hoje!';
  return 'Hoje os corações estão em compassos um pouco diferentes — e tudo bem.';
}

function formatarDataHora(isoString) {
  const d = new Date(isoString);
  const hoje = new Date();
  const horaFormatada = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const ehHoje = d.toDateString() === hoje.toDateString();
  const dataFormatada = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  return `${ehHoje ? 'Hoje' : dataFormatada}, às ${horaFormatada}`;
}

function temRespostaValida(item) {
  return (
    item &&
    typeof item.respostas?.nivel === 'number' &&
    !Number.isNaN(item.respostas.nivel)
  );
}

export default function TermometroTab({ quemSouEu, settings }) {
  const toast = useToast();
  const meuNome = quemSouEu === 'parceiro1' ? settings.apelido1 : settings.apelido2;
  const meuEmoji = quemSouEu === 'parceiro1' ? settings.emoji1 : settings.emoji2;
  const outroNome = quemSouEu === 'parceiro1' ? settings.apelido2 : settings.apelido1;
  const outroEmoji = quemSouEu === 'parceiro1' ? settings.emoji2 : settings.emoji1;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [respostas, setRespostas] = useState([]);
  const [nivel, setNivel] = useState(80);
  const [motivo, setMotivo] = useState('');

  // Modais de Edição e Exclusão
  const [editModal, setEditModal] = useState({
    isOpen: false,
    id: null,
    nivel: 80,
    motivo: '',
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
  });

  // Carrega e escuta em tempo real
  useEffect(() => {
    carregar();
    const unsubscribe = subscribeToTable('respostas_diarias', () => {
      carregar();
    });
    return () => unsubscribe();
  }, []);

  async function carregar() {
    try {
      const data = await buscarRespostasDiarias();
      setRespostas(data);
    } catch (err) {
      console.error('Erro ao buscar respostas:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      await salvarRespostaDiaria(quemSouEu, {
        nivel,
        motivo: motivo.trim(),
      });

      toast.love(`Seu coração foi registrado com sucesso, ${meuNome}! 💜`);
      setMotivo('');

      // Recarrega e calcula sintonia
      const listaAtualizada = await buscarRespostasDiarias();
      setRespostas(listaAtualizada);

      const r1 = listaAtualizada.find(
        (r) => r.parceiro === 'parceiro1' && temRespostaValida(r)
      );
      const r2 = listaAtualizada.find(
        (r) => r.parceiro === 'parceiro2' && temRespostaValida(r)
      );

      if (r1 && r2) {
        const pct = calcularCompatibilidade(
          r1.respostas.nivel,
          r2.respostas.nivel
        );
        salvarCapsulaSintonia(getTodayDateString(), { sintonia_pct: pct }).catch(
          () => {}
        );
      }
    } catch (err) {
      console.error(err);
      toast.error('Não consegui salvar seu registro agora. Tente de novo!');
    } finally {
      setSalvando(false);
    }
  }

  // Abrir Modal de Edição
  function handleAbrirEdicao(item) {
    setEditModal({
      isOpen: true,
      id: item.id,
      nivel: item.respostas?.nivel ?? 80,
      motivo: item.respostas?.motivo ?? '',
    });
  }

  // Salvar Edição
  async function handleSalvarEdicao() {
    if (!editModal.id) return;
    try {
      await editarRespostaDiaria(editModal.id, {
        nivel: editModal.nivel,
        motivo: editModal.motivo.trim(),
      });
      toast.success('Registro de humor atualizado!');
      setEditModal({ isOpen: false, id: null, nivel: 80, motivo: '' });
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar registro.');
    }
  }

  // Confirmar Exclusão
  async function handleConfirmDelete() {
    if (!deleteModal.id) return;
    try {
      await excluirRespostaDiaria(deleteModal.id);
      toast.success('Registro excluído do feed.');
      setDeleteModal({ isOpen: false, id: null });
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir registro.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const p1 = respostas.find((r) => r.parceiro === 'parceiro1' && temRespostaValida(r));
  const p2 = respostas.find((r) => r.parceiro === 'parceiro2' && temRespostaValida(r));
  const sintoniaAtual = p1 && p2 ? calcularCompatibilidade(p1.respostas.nivel, p2.respostas.nivel) : null;

  return (
    <div className="px-3.5 sm:px-6 pt-4 max-w-md mx-auto pb-14 animate-fadeIn">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-yellow text-ink text-[10px]">
          Diário Íntimo 💜
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings.apelido1} & {settings.apelido2}
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1 leading-tight">
        Como está o coração agora?
      </h1>
      <p className="text-xs text-white/80 font-medium mb-4">
        Registre como você está se sentindo para que {outroNome} veja no feed em tempo real.
      </p>

      {/* Card Sintonia do Casal */}
      {sintoniaAtual !== null && (
        <div className="card-brut p-4 text-center mb-5 bg-cyan shadow-brut animate-popIn">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <span className="text-sm">{settings.emoji1}</span>
            <p className="badge-brut bg-white text-ink text-[9px]">
              Sintonia Atual: {sintoniaAtual}%
            </p>
            <span className="text-sm">{settings.emoji2}</span>
          </div>
          <p className="text-xs font-black text-ink/90">
            {getFraseSintonia(sintoniaAtual)}
          </p>
        </div>
      )}

      {/* Formulário Novo Registro de Humor */}
      <div className="card-brut p-4 sm:p-5 mb-6 shadow-brut">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{meuEmoji}</span>
            <p className="badge-brut bg-purple text-ink text-[10px]">
              {meuNome} (Você)
            </p>
          </div>
          <span className="text-xs font-black text-ink">
            {nivel}/100
          </span>
        </div>

        {/* Emoji & Label Dinâmico */}
        <div className="text-center my-2.5">
          <p className="text-5xl animate-bounceShort select-none">
            {getMoodEmoji(nivel)}
          </p>
          <p className="text-[11px] font-black text-ink/70 mt-1">
            {getMoodLabel(nivel)}
          </p>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={nivel}
          onChange={(e) => setNivel(Number(e.target.value))}
          className="w-full cursor-pointer my-2"
        />

        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={`Conte para ${outroNome} o que te fez se sentir assim... (opcional)`}
          rows={2}
          className="mt-2 w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs resize-none font-medium placeholder:text-ink/40"
        />

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="btn-brut mt-3 w-full py-3 bg-yellow text-ink text-xs font-black disabled:opacity-50 shadow-brut"
        >
          {salvando ? 'Registrando...' : '💜 Publicar no Feed do Casal'}
        </button>
      </div>

      {/* Feed Íntimo de Momentos */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-extrabold text-white text-lg flex items-center gap-1.5">
          💌 Feed do Casal
        </h2>
        <span className="text-[11px] font-bold text-white/70">
          {respostas.length} momento(s)
        </span>
      </div>

      <div className="space-y-3">
        {respostas.length === 0 ? (
          <div className="card-brut p-6 text-center shadow-brut">
            <p className="text-xs text-ink/60 font-bold">
              Nenhum momento registrado ainda. Publique como está seu dia acima! ✨
            </p>
          </div>
        ) : (
          respostas.map((item) => {
            const ehParceiro1 = item.parceiro === 'parceiro1';
            const nomeAutor = ehParceiro1 ? settings.apelido1 : settings.apelido2;
            const emojiAutor = ehParceiro1 ? settings.emoji1 : settings.emoji2;
            const corBadge = ehParceiro1 ? 'bg-yellow' : 'bg-pink';
            const ehMeu = item.parceiro === quemSouEu;

            return (
              <div key={item.id} className="card-brut p-4 shadow-brutsm relative">
                {/* Header do Card */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{emojiAutor}</span>
                    <span className={`badge-brut ${corBadge} text-ink text-[10px]`}>
                      {nomeAutor}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink/50 font-bold">
                      {formatarDataHora(item.criado_em)}
                    </span>

                    {/* Botões de Ação para Qualquer Entrada */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAbrirEdicao(item)}
                        className="text-xs text-ink/40 hover:text-royal p-1 rounded-md hover:bg-ink/5 transition"
                        title="Editar registro"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, id: item.id })}
                        className="text-xs text-ink/40 hover:text-pink p-1 rounded-md hover:bg-ink/5 transition"
                        title="Excluir registro"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nível de Humor & Barra Visual */}
                <div className="bg-ink/5 rounded-xl p-3 border-2 border-ink/10 my-1.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl select-none">
                        {getMoodEmoji(item.respostas?.nivel)}
                      </span>
                      <div>
                        <p className="text-xs font-black text-ink">
                          {getMoodLabel(item.respostas?.nivel)}
                        </p>
                        <p className="text-[10px] font-bold text-ink/50">
                          {item.respostas?.nivel}/100 de felicidade
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mini barra de progresso */}
                  <div className="w-full bg-white rounded-full h-2.5 border-2 border-ink overflow-hidden">
                    <div
                      className="h-full bg-pink transition-all"
                      style={{ width: `${Math.max(5, item.respostas?.nivel || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Motivo / Mensagem do Humor */}
                {item.respostas?.motivo && (
                  <p className="text-xs text-ink/80 font-medium mt-2 italic bg-purple/10 p-2.5 rounded-xl border border-ink/10 leading-relaxed">
                    "{item.respostas.motivo}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Edição */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, id: null, nivel: 80, motivo: '' })}
        title="Editar Momento ✏️"
        badgeText="Editar"
        badgeColor="bg-yellow"
        confirmText="Salvar Alterações"
        onConfirm={handleSalvarEdicao}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-ink">
              Nível: {editModal.nivel}/100
            </span>
            <span className="text-3xl">
              {getMoodEmoji(editModal.nivel)}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={editModal.nivel}
            onChange={(e) =>
              setEditModal((prev) => ({ ...prev, nivel: Number(e.target.value) }))
            }
            className="w-full cursor-pointer"
          />

          <textarea
            value={editModal.motivo}
            onChange={(e) =>
              setEditModal((prev) => ({ ...prev, motivo: e.target.value }))
            }
            placeholder="O que te fez se sentir assim?"
            rows={2}
            className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs font-medium resize-none"
          />
        </div>
      </Modal>

      {/* Modal de Exclusão */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Excluir Momento"
        badgeText="Atenção"
        badgeColor="bg-pink"
        confirmText="Sim, Excluir"
        onConfirm={handleConfirmDelete}
        isDestructive={true}
      >
        <p>Tem certeza que deseja remover este momento do feed do casal?</p>
      </Modal>
    </div>
  );
}
