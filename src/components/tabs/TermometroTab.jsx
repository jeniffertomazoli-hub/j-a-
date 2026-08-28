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
import Avatar from '../Avatar';

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
  if (!isoString) return '';
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
  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings.apelido1 : settings.apelido2;
  const meuEmoji = ehP1 ? settings.emoji1 : settings.emoji2;
  const meuFoto = ehP1 ? settings.foto1 : settings.foto2;

  const outroNome = ehP1 ? settings.apelido2 : settings.apelido1;
  const outroEmoji = ehP1 ? settings.emoji2 : settings.emoji1;
  const outroFoto = ehP1 ? settings.foto2 : settings.foto1;

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

  useEffect(() => {
    carregar();
    const unsubscribe = subscribeToTable('respostas_diarias', () => {
      carregar();
    });
    return () => unsubscribe();
  }, []);

  async function carregar() {
    try {
      const data = await buscarRespostasDiarias(60);
      setRespostas(data);

      const p1 = data.find((r) => r.parceiro === 'parceiro1' && temRespostaValida(r));
      const p2 = data.find((r) => r.parceiro === 'parceiro2' && temRespostaValida(r));

      if (p1 && p2) {
        const pct = calcularCompatibilidade(p1.respostas.nivel, p2.respostas.nivel);
        await salvarCapsulaSintonia(getTodayDateString(), {
          porcentagem: pct,
          humor_p1: p1.respostas.nivel,
          humor_p2: p2.respostas.nivel,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar termômetro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      await salvarRespostaDiaria(quemSouEu, { nivel, motivo });
      setMotivo('');
      toast.love('Momento registrado com sucesso! 💜');
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Não consegui salvar o momento agora. Tente de novo!');
    } finally {
      setSalvando(false);
    }
  }

  function handleAbrirEdicao(item) {
    setEditModal({
      isOpen: true,
      id: item.id,
      nivel: item.respostas?.nivel ?? 80,
      motivo: item.respostas?.motivo ?? '',
    });
  }

  async function handleSalvarEdicao() {
    if (!editModal.id) return;
    try {
      await editarRespostaDiaria(editModal.id, {
        nivel: editModal.nivel,
        motivo: editModal.motivo,
      });
      toast.success('Momento atualizado com sucesso!');
      setEditModal({ isOpen: false, id: null, nivel: 80, motivo: '' });
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao editar. Tente novamente.');
    }
  }

  async function handleConfirmarExclusao() {
    if (!deleteModal.id) return;
    try {
      await excluirRespostaDiaria(deleteModal.id);
      toast.success('Momento excluído do feed!');
      setDeleteModal({ isOpen: false, id: null });
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir momento.');
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
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <Avatar
              foto={settings.foto1}
              emoji={settings.emoji1 || '🐰'}
              nome={settings.apelido1}
              size="xs"
              corFundo="bg-yellow"
            />
            <p className="badge-brut bg-white text-ink text-[9px]">
              Sintonia Atual: {sintoniaAtual}%
            </p>
            <Avatar
              foto={settings.foto2}
              emoji={settings.emoji2 || '🦊'}
              nome={settings.apelido2}
              size="xs"
              corFundo="bg-pink"
            />
          </div>
          <p className="text-xs font-black text-ink/90">
            {getFraseSintonia(sintoniaAtual)}
          </p>
        </div>
      )}

      {/* Formulário Novo Registro de Humor */}
      <div className="card-brut p-4 sm:p-5 mb-6 shadow-brut">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar
              foto={meuFoto}
              emoji={meuEmoji}
              nome={meuNome}
              size="sm"
              corFundo={ehP1 ? 'bg-yellow' : 'bg-pink'}
            />
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
            const fotoAutor = ehParceiro1 ? settings.foto1 : settings.foto2;
            const corBadge = ehParceiro1 ? 'bg-yellow' : 'bg-pink';

            return (
              <div key={item.id} className="card-brut p-4 shadow-brutsm relative">
                {/* Header do Card */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar
                      foto={fotoAutor}
                      emoji={emojiAutor}
                      nome={nomeAutor}
                      size="sm"
                      corFundo={corBadge}
                    />
                    <span className={`badge-brut ${corBadge} text-ink text-[10px]`}>
                      {nomeAutor}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink/50 font-bold">
                      {formatarDataHora(item.criado_em)}
                    </span>

                    {/* Botões de Ação */}
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

                {/* Conteúdo do Registro */}
                <div className="flex items-center gap-3 my-2">
                  <span className="text-3xl select-none">
                    {getMoodEmoji(item.respostas?.nivel ?? 50)}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-ink">
                        {item.respostas?.nivel ?? 0}/100
                      </span>
                      <span className="text-[10px] font-bold text-ink/60">
                        {getMoodLabel(item.respostas?.nivel ?? 50)}
                      </span>
                    </div>
                    <div className="w-full bg-ink/10 rounded-full h-2 mt-1 overflow-hidden border border-ink/20">
                      <div
                        className={`h-full ${corBadge}`}
                        style={{ width: `${Math.min(100, Math.max(0, item.respostas?.nivel ?? 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {item.respostas?.motivo && (
                  <p className="text-xs font-semibold text-ink/80 mt-2 bg-ink/5 p-2.5 rounded-xl border border-ink/10 leading-relaxed break-words">
                    "{item.respostas.motivo}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Edição */}
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
          <div className="text-center">
            <p className="text-4xl">{getMoodEmoji(editModal.nivel)}</p>
            <p className="text-xs font-bold text-ink/70 mt-1">{getMoodLabel(editModal.nivel)}</p>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={editModal.nivel}
            onChange={(e) => setEditModal((prev) => ({ ...prev, nivel: Number(e.target.value) }))}
            className="w-full"
          />
          <textarea
            value={editModal.motivo}
            onChange={(e) => setEditModal((prev) => ({ ...prev, motivo: e.target.value }))}
            rows={3}
            placeholder="Atualize o motivo..."
            className="w-full rounded-xl border-3 border-ink px-3 py-2 text-xs font-medium outline-none bg-white resize-none"
          />
        </div>
      </Modal>

      {/* Modal Exclusão */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Excluir Momento"
        badgeText="Atenção"
        badgeColor="bg-pink"
        confirmText="Sim, Excluir"
        onConfirm={handleConfirmarExclusao}
        isDestructive={true}
      >
        <p>Tem certeza que deseja excluir este momento do histórico do casal?</p>
      </Modal>
    </div>
  );
}
