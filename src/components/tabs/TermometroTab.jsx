import React, { useState, useEffect } from 'react';
import {
  salvarRespostaDiaria,
  buscarRespostasDiarias,
  salvarCapsulaSintonia,
  getTodayDateString,
  subscribeToTable,
} from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

function getMoodEmoji(level) {
  if (level >= 90) return '🥰';
  if (level >= 75) return '😍';
  if (level >= 60) return '😊';
  if (level >= 45) return '😌';
  if (level >= 30) return '😐';
  if (level >= 15) return '😕';
  return '😢';
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
  return `${ehHoje ? 'Hoje' : dataFormatada}, ${horaFormatada}`;
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
  const outroNome = quemSouEu === 'parceiro1' ? settings.apelido2 : settings.apelido1;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [respostas, setRespostas] = useState([]);
  const [nivel, setNivel] = useState(75);
  const [motivo, setMotivo] = useState('');

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

      // Recarrega e calcula sintonia se ambos responderam hoje
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
    <div className="px-4 sm:px-6 pt-5 max-w-md mx-auto pb-12 animate-fadeIn">
      <p className="badge-brut bg-yellow text-ink mb-2">Diário do Amor</p>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1">
        Como está o coração agora?
      </h1>
      <p className="text-xs text-white/80 font-medium mb-5">
        Toda vez que você registrar, fica guardado para sempre na nossa história.
      </p>

      {/* Card Sintonia Atual */}
      {sintoniaAtual !== null && (
        <div className="card-brut p-4 text-center mb-5 bg-cyan shadow-brut animate-popIn">
          <p className="badge-brut bg-white text-ink text-[10px] mb-2">
            Compatibilidade Recente
          </p>
          <p className="font-display text-5xl font-extrabold text-ink leading-tight">
            {sintoniaAtual}%
          </p>
          <p className="text-xs font-black text-ink/80 mt-1">
            {getFraseSintonia(sintoniaAtual)}
          </p>
        </div>
      )}

      {/* Formulário de Registro */}
      <div className="card-brut p-5 mb-6 shadow-brut">
        <div className="flex items-center justify-between mb-3">
          <p className="badge-brut bg-purple text-ink">
            {meuNome} (Você)
          </p>
          <span className="text-xs font-black text-ink/60">
            {nivel}/100
          </span>
        </div>

        <div className="text-center my-3">
          <p className="text-5xl animate-bounceShort select-none">
            {getMoodEmoji(nivel)}
          </p>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={nivel}
          onChange={(e) => setNivel(Number(e.target.value))}
          className="w-full cursor-pointer"
        />

        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="O que fez você se sentir assim agora? (opcional)"
          rows={2}
          className="mt-4 w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-sm resize-none font-medium placeholder:text-ink/40"
        />

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="btn-brut mt-4 w-full py-3 bg-yellow text-ink text-sm font-extrabold disabled:opacity-50 shadow-brut"
        >
          {salvando ? 'Registrando com carinho...' : '💜 Registrar Meu Momento'}
        </button>
      </div>

      {/* Histórico Recente */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-extrabold text-white text-lg">
          📜 Linha do Tempo
        </h2>
        <span className="text-[11px] font-bold text-white/70">
          {respostas.length} registro(s)
        </span>
      </div>

      <div className="space-y-3">
        {respostas.length === 0 ? (
          <div className="card-brut p-6 text-center">
            <p className="text-sm text-ink/60 font-bold">
              Nenhum registro ainda. Seja o primeiro a registrar hoje! ✨
            </p>
          </div>
        ) : (
          respostas.map((item) => {
            const ehParceiro1 = item.parceiro === 'parceiro1';
            const nomeAutor = ehParceiro1 ? settings.apelido1 : settings.apelido2;
            const corBadge = ehParceiro1 ? 'bg-yellow' : 'bg-pink';

            return (
              <div key={item.id} className="card-brut p-3.5 shadow-brutsm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`badge-brut ${corBadge} text-ink text-[10px]`}>
                    {nomeAutor}
                  </span>
                  <span className="text-[10px] text-ink/50 font-bold">
                    {formatarDataHora(item.criado_em)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getMoodEmoji(item.respostas?.nivel)}</span>
                  <span className="text-sm font-extrabold text-ink">
                    {item.respostas?.nivel}/100
                  </span>
                </div>

                {item.respostas?.motivo && (
                  <p className="text-xs text-ink/80 font-medium mt-1.5 italic bg-ink/5 p-2 rounded-lg">
                    "{item.respostas.motivo}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
