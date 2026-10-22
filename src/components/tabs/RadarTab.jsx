import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  salvarLocalizacaoRadar,
  buscarLocalizacoesRadar,
  subscribeToTable,
} from '../../lib/supabase';
import {
  calcularDistanciaKm,
  formatarDistanciaAmor,
  obterLocalizacaoAtual,
} from '../../lib/geoUtils';
import { useToast } from '../../context/ToastContext';
import Avatar from '../Avatar';

export default function RadarTab({ quemSouEu, settings }) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';

  const meuNome = ehP1 ? settings.apelido1 : settings.apelido2;
  const outroNome = ehP1 ? settings.apelido2 : settings.apelido1;

  const [loading, setLoading] = useState(true);
  const [atualizandoGps, setAtualizandoGps] = useState(false);
  const [locP1, setLocP1] = useState(null);
  const [locP2, setLocP2] = useState(null);

  useEffect(() => {
    carregarLocalizacoes();

    // Sincronização em tempo real quando o parceiro atualizar
    const unsubscribe = subscribeToTable('respostas_diarias', (payload) => {
      if (payload.new && payload.new.data === '2099-01-01') {
        carregarLocalizacoes(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function carregarLocalizacoes(mostrarLoading = true) {
    if (mostrarLoading) setLoading(true);
    try {
      const data = await buscarLocalizacoesRadar();
      setLocP1(data.parceiro1);
      setLocP2(data.parceiro2);
    } catch (err) {
      console.error('Erro ao buscar coordenadas:', err);
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  }

  async function handleAtualizarMinhaLocalizacao() {
    setAtualizandoGps(true);
    try {
      toast.show('Buscando sinal de localização...');
      const coords = await obterLocalizacaoAtual();

      await salvarLocalizacaoRadar(quemSouEu, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        precisao: coords.precisao,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#2F3FE0', '#FFD93D', '#FF4D97'],
      });

      toast.love('Sua localização foi atualizada com sucesso! 📍');
      await carregarLocalizacoes(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao obter GPS. Permita a localização no navegador.');
    } finally {
      setAtualizandoGps(false);
    }
  }

  // Cálculo da Distância em Km
  const distanciaKm = locP1 && locP2
    ? calcularDistanciaKm(locP1.latitude, locP1.longitude, locP2.latitude, locP2.longitude)
    : null;

  const distanciaInfo = formatarDistanciaAmor(distanciaKm);

  return (
    <div className="px-3.5 sm:px-6 pt-4 max-w-md mx-auto pb-14 animate-fadeIn">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-yellow text-ink text-[10px]">
          Distância do Casal 📍
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings.apelido1} & {settings.apelido2}
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1 leading-tight">
        Distância entre nós dois
      </h1>
      <p className="text-xs text-white/80 font-medium mb-4">
        Veja a quantos quilômetros vocês estão um do outro agora.
      </p>

      {/* CARD PRINCIPAL DE DISTÂNCIA */}
      <div
        className={`card-brut p-5 mb-5 shadow-brut relative overflow-hidden transition-all ${
          distanciaInfo?.ehJuntinho ? 'bg-cyan' : 'bg-white'
        }`}
      >
        {/* Avatares conectados com o Coração */}
        <div className="flex items-center justify-between gap-3 mb-5">
          {/* Avatar Jeniffer */}
          <div className="flex flex-col items-center">
            <Avatar
              foto={settings.foto1}
              emoji={settings.emoji1 || '🐰'}
              nome={settings.apelido1}
              size="lg"
              corFundo="bg-yellow"
            />
            <span className="text-xs font-black text-ink mt-2">{settings.apelido1}</span>
          </div>

          {/* Linha do Amor e Distância no Centro */}
          <div className="flex-1 flex flex-col items-center px-2">
            <div className="w-full relative flex items-center justify-center my-2">
              <div className="h-1.5 w-full bg-ink/15 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow via-pink to-purple w-full animate-pulse" />
              </div>
              <span className="absolute text-xl animate-bounceShort select-none">💜</span>
            </div>
          </div>

          {/* Avatar Alvaro */}
          <div className="flex flex-col items-center">
            <Avatar
              foto={settings.foto2}
              emoji={settings.emoji2 || '🦊'}
              nome={settings.apelido2}
              size="lg"
              corFundo="bg-pink"
            />
            <span className="text-xs font-black text-ink mt-2">{settings.apelido2}</span>
          </div>
        </div>

        {/* Destaque do Km */}
        {distanciaInfo ? (
          <div className="text-center bg-yellow/20 rounded-2xl p-4 border-2 border-ink/20">
            <p className="text-3xl sm:text-4xl font-display font-extrabold text-ink tracking-tight mb-1">
              {distanciaInfo.valorFormatado}
            </p>
            <p className="text-xs font-black text-ink">
              {distanciaInfo.textoPrincipal}
            </p>
            <p className="text-[10px] text-ink/70 font-semibold mt-0.5">
              {distanciaInfo.subtexto}
            </p>
          </div>
        ) : (
          <div className="text-center bg-ink/5 rounded-2xl p-4 border-2 border-dashed border-ink/20">
            <p className="text-sm font-black text-ink mb-1">
              Aguardando localização de ambos 📡
            </p>
            <p className="text-[11px] text-ink/60 font-semibold">
              {!locP1 && !locP2
                ? 'Nenhum dos dois atualizou a localização ainda.'
                : !locP1
                ? `Falta ${settings.apelido1} atualizar a localização.`
                : `Falta ${settings.apelido2} atualizar a localização.`}
            </p>
          </div>
        )}
      </div>

      {/* BOTÃO PRINCIPAL DE ATUALIZAÇÃO */}
      <button
        onClick={handleAtualizarMinhaLocalizacao}
        disabled={atualizandoGps}
        className="btn-brut w-full py-3.5 bg-yellow text-ink text-xs sm:text-sm font-black shadow-brut flex items-center justify-center gap-2 hover:scale-101 active:scale-98 transition disabled:opacity-50"
      >
        <span>{atualizandoGps ? '⏳' : '📡'}</span>
        <span>
          {atualizandoGps ? 'Obtendo GPS...' : 'Atualizar Minha Localização'}
        </span>
      </button>
    </div>
  );
}
