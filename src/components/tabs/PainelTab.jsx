import React, { useState, useEffect, useMemo } from 'react';
import {
  buscarHistoricoHumor,
  buscarCapsulaMemorias,
  buscarMemorias,
} from '../../lib/supabase';
import Avatar from '../Avatar';

function formatDiaMes(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function GaugeChart({ pct }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28 sm:w-32 sm:h-32 select-none">
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#14142B"
        strokeWidth="12"
        opacity="0.08"
      />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#FF4D97"
        strokeWidth="12"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <text
        x="60"
        y="67"
        textAnchor="middle"
        className="font-display"
        fontSize="24"
        fontWeight="800"
        fill="#14142B"
      >
        {pct}%
      </text>
    </svg>
  );
}

export default function PainelTab({ quemSouEu, settings }) {
  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState([]);
  const [capsula, setCapsula] = useState([]);
  const [totalMemorias, setTotalMemorias] = useState(0);

  useEffect(() => {
    async function carregar() {
      try {
        const [hData, cData, mData] = await Promise.all([
          buscarHistoricoHumor(30),
          buscarCapsulaMemorias(),
          buscarMemorias(),
        ]);
        setHistorico(hData);
        setCapsula(cData);
        setTotalMemorias(mData.length);
      } catch (err) {
        console.error('Erro no painel:', err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const ultimosRegistros = useMemo(() => {
    return historico.slice(-6).reverse();
  }, [historico]);

  const stats = useMemo(() => {
    if (capsula.length === 0) return null;
    const validos = capsula.filter((c) => c.sintonia_pct !== null);
    if (validos.length === 0) return null;

    const soma = validos.reduce((acc, curr) => acc + curr.sintonia_pct, 0);
    const media = Math.round(soma / validos.length);
    return {
      media,
      totalDias: capsula.length,
      diasComMatch: validos.filter((c) => c.sintonia_pct >= 85).length,
    };
  }, [capsula]);

  const sintoniaScore = capsula[0]?.sintonia_pct ?? stats?.media ?? 75;

  const conquistas = [
    {
      id: 'semana',
      emoji: '⏱️',
      titulo: 'Primeira Semana',
      sub: '7+ dias registrando juntos',
      desbloqueada: (stats?.totalDias || 0) >= 7,
    },
    {
      id: 'sintonia',
      emoji: '💜',
      titulo: 'Sintonizados',
      sub: '90%+ em um dia',
      desbloqueada: capsula.some((c) => (c.sintonia_pct ?? 0) >= 90),
    },
    {
      id: 'memorias',
      emoji: '📸',
      titulo: 'Colecionadores',
      sub: '5+ memórias salvas',
      desbloqueada: totalMemorias >= 5,
    },
    {
      id: 'centenario',
      emoji: '💯',
      titulo: 'Amor Centenário',
      sub: '100+ dias juntos no app',
      desbloqueada: (stats?.totalDias || 0) >= 100,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="px-3.5 sm:px-6 pt-4 max-w-2xl mx-auto pb-14 animate-fadeIn">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-cyan text-ink text-[10px]">
          Painel de Insights 📊
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings.apelido1} & {settings.apelido2}
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-5 leading-tight">
        Insights do Casal
      </h1>

      {stats ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Card Compatibilidade */}
          <div className="card-brut p-5 flex flex-col items-center text-center shadow-brut">
            <span className="badge-brut bg-cyan text-ink text-[10px] mb-3">
              Humor Médio
            </span>
            <GaugeChart pct={sintoniaScore} />
            <p className="text-xs font-black text-ink/70 mt-2">
              Índice Médio de Sintonia
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Avatar
                foto={settings.foto1}
                emoji={settings.emoji1 || '🐰'}
                nome={settings.apelido1}
                size="sm"
                corFundo="bg-yellow"
              />
              <span className="text-base">💜</span>
              <Avatar
                foto={settings.foto2}
                emoji={settings.emoji2 || '🦊'}
                nome={settings.apelido2}
                size="sm"
                corFundo="bg-pink"
              />
            </div>
            <p className="text-xs text-ink/70 font-medium mt-2 leading-relaxed">
              {sintoniaScore >= 80
                ? `${settings.apelido1} e ${settings.apelido2}, vocês estão com excelente harmonia nesta semana!`
                : 'Acompanhem a evolução diária dos sentimentos e planejem um momento especial juntos!'}
            </p>
          </div>

          {/* Card Últimas Respostas Lado a Lado */}
          <div className="card-brut p-4 sm:p-5 shadow-brut">
            <p className="font-display font-extrabold text-ink mb-3 text-sm">
              Últimas Respostas Lado a Lado
            </p>
            <div className="space-y-2.5">
              {ultimosRegistros.length === 0 ? (
                <p className="text-xs text-ink/60 font-medium">
                  Ainda não há registros suficientes.
                </p>
              ) : (
                ultimosRegistros.map((item) => {
                  const temAmbos = item.parceiro1 !== null && item.parceiro2 !== null;
                  const sintoniaOk = temAmbos && Math.abs(item.parceiro1 - item.parceiro2) <= 15;

                  return (
                    <div
                      key={item.data}
                      className="border-b-2 border-ink/10 pb-2.5 last:border-0"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-ink/70">
                          {formatDiaMes(item.data)}
                        </span>
                        {temAmbos && (
                          <span
                            className={`badge-brut text-[8px] py-0.5 px-2 ${
                              sintoniaOk ? 'bg-cyan' : 'bg-pink'
                            } text-ink`}
                          >
                            {sintoniaOk ? 'Sintonia 💜' : 'Divergente'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="badge-brut bg-yellow text-ink text-[10px] flex items-center justify-center gap-1 py-1 truncate">
                          <Avatar
                            foto={settings.foto1}
                            emoji={settings.emoji1 || '🐰'}
                            nome={settings.apelido1}
                            size="xs"
                            corFundo="bg-yellow"
                          />
                          <span className="truncate">{settings.apelido1}: {item.parceiro1 ?? '—'}</span>
                        </div>
                        <div className="badge-brut bg-pink text-ink text-[10px] flex items-center justify-center gap-1 py-1 truncate">
                          <Avatar
                            foto={settings.foto2}
                            emoji={settings.emoji2 || '🦊'}
                            nome={settings.apelido2}
                            size="xs"
                            corFundo="bg-pink"
                          />
                          <span className="truncate">{settings.apelido2}: {item.parceiro2 ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card-brut p-8 text-center shadow-brut">
          <p className="text-xs font-bold text-ink/70">
            Registrem alguns dias no termômetro para os gráficos e insights aparecerem aqui! ✨
          </p>
        </div>
      )}

      {/* Conquistas do Casal */}
      <h2 className="font-display font-extrabold text-white text-lg mt-7 mb-3">
        Conquistas do Casal 🏆
      </h2>

      <div className="card-brut p-4 shadow-brut">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {conquistas.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border-3 border-ink p-3 flex items-center gap-3 transition shadow-brutsm ${
                c.desbloqueada ? 'bg-white' : 'bg-white/40 opacity-50'
              }`}
            >
              <span className="text-2xl shrink-0 select-none">{c.emoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-ink truncate">{c.titulo}</p>
                  {c.desbloqueada && (
                    <span className="badge-brut bg-yellow text-ink text-[8px] py-0 px-1.5">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-ink/60 font-bold truncate mt-0.5">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
