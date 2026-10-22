import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  salvarLocalizacaoRadar,
  buscarLocalizacoesRadar,
  salvarRegistroHistoricoDistancia,
  buscarHistoricoDistancias,
  excluirItemHistoricoDistancia,
  subscribeToTable,
} from '../../lib/supabase';
import {
  calcularDistanciaKm,
  formatarDistanciaAmor,
  obterLocalizacaoAtual,
  obterNomeLocalizacao,
} from '../../lib/geoUtils';
import { useToast } from '../../context/ToastContext';
import Avatar from '../Avatar';

function formatarDataHora(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const agora = new Date();
  const ehHoje = d.toDateString() === agora.toDateString();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (ehHoje) {
    return `Hoje às ${hora}`;
  }
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${dia} às ${hora}`;
}

export default function RadarTab({ quemSouEu, settings }) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';

  const meuNome = ehP1 ? settings?.apelido1 || 'Jeniffer' : settings?.apelido2 || 'Alvaro';
  const meuEmoji = ehP1 ? settings?.emoji1 || '🐰' : settings?.emoji2 || '🦊';
  const meuFoto = ehP1 ? settings?.foto1 : settings?.foto2;

  const outroNome = ehP1 ? settings?.apelido2 || 'Alvaro' : settings?.apelido1 || 'Jeniffer';
  const outroEmoji = ehP1 ? settings?.emoji2 || '🦊' : settings?.emoji1 || '🐰';
  const outroFoto = ehP1 ? settings?.foto2 : settings?.foto1;

  const [loading, setLoading] = useState(true);
  const [atualizandoGps, setAtualizandoGps] = useState(false);
  const [locP1, setLocP1] = useState(null);
  const [locP2, setLocP2] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [excluindoId, setExcluindoId] = useState(null);

  useEffect(() => {
    carregarTudo();

    // Sincronização em tempo real quando houver atualização de GPS ou Histórico
    const unsubscribe = subscribeToTable('respostas_diarias', (payload) => {
      const d = payload.new ? payload.new.data : payload.old ? payload.old.data : '';
      if (d === '2099-01-01' || d === '2099-01-03') {
        carregarTudo(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function carregarTudo(mostrarLoading = true) {
    if (mostrarLoading) setLoading(true);
    try {
      const [dataLoc, dataHist] = await Promise.all([
        buscarLocalizacoesRadar(),
        buscarHistoricoDistancias(40),
      ]);
      setLocP1(dataLoc.parceiro1);
      setLocP2(dataLoc.parceiro2);
      setHistorico(dataHist || []);
    } catch (err) {
      console.error('Erro ao buscar dados do Radar:', err);
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  }

  async function handleAtualizarMinhaLocalizacao() {
    setAtualizandoGps(true);
    try {
      toast.show('Buscando sinal do satélite GPS...');
      const coords = await obterLocalizacaoAtual();
      const endereco = await obterNomeLocalizacao(coords.latitude, coords.longitude);

      // 1. Salva a localização atual
      await salvarLocalizacaoRadar(quemSouEu, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        precisao: coords.precisao,
        endereco,
      });

      // 2. Calcula a distância com o parceiro naquele momento
      const parceiroLoc = ehP1 ? locP2 : locP1;
      let distKmCalc = null;
      let distFormatadaCalc = null;
      if (parceiroLoc && parceiroLoc.latitude && parceiroLoc.longitude) {
        distKmCalc = calcularDistanciaKm(
          coords.latitude,
          coords.longitude,
          parceiroLoc.latitude,
          parceiroLoc.longitude
        );
        const info = formatarDistanciaAmor(distKmCalc);
        distFormatadaCalc = info?.valorFormatado || null;
      }

      // 3. Registra no histórico de distâncias
      await salvarRegistroHistoricoDistancia({
        parceiro: quemSouEu,
        latitude: coords.latitude,
        longitude: coords.longitude,
        endereco,
        distanciaKm: distKmCalc,
        distanciaFormatada: distFormatadaCalc,
        outroNome,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#2F3FE0', '#FFD93D', '#FF4D97'],
      });

      toast.love('Sua localização foi atualizada com sucesso! 📍');
      await carregarTudo(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao obter GPS. Permita o acesso à localização.');
    } finally {
      setAtualizandoGps(false);
    }
  }

  async function handleExcluirHistorico(id) {
    if (!id) return;
    setExcluindoId(id);
    try {
      await excluirItemHistoricoDistancia(id);
      setHistorico((prev) => prev.filter((item) => item.id !== id));
      toast.success('Registro removido do histórico!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir registro.');
    } finally {
      setExcluindoId(null);
    }
  }

  // Cálculo da Distância Atual em Km
  const distanciaKm =
    locP1 && locP2
      ? calcularDistanciaKm(locP1.latitude, locP1.longitude, locP2.latitude, locP2.longitude)
      : null;

  const distanciaInfo = formatarDistanciaAmor(distanciaKm);

  const minhaLoc = ehP1 ? locP1 : locP2;
  const outraLoc = ehP1 ? locP2 : locP1;

  return (
    <div className="px-3.5 sm:px-6 pt-4 max-w-md mx-auto pb-16 animate-fadeIn">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-yellow text-ink text-[10px]">
          Distância do Casal 📍
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings?.apelido1} & {settings?.apelido2}
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1 leading-tight">
        Distância entre nós dois
      </h1>
      <p className="text-xs text-white/80 font-medium mb-4">
        Veja a quantos quilômetros vocês estão um do outro e acompanhe o histórico.
      </p>

      {/* CARD PRINCIPAL DE DISTÂNCIA */}
      <div
        className={`card-brut p-5 mb-4 shadow-brut relative overflow-hidden transition-all ${
          distanciaInfo?.ehJuntinho ? 'bg-cyan' : 'bg-white'
        }`}
      >
        {/* Avatares conectados com o Coração */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Avatar Jeniffer */}
          <div className="flex flex-col items-center">
            <Avatar
              foto={settings?.foto1}
              emoji={settings?.emoji1 || '🐰'}
              nome={settings?.apelido1}
              size="lg"
              corFundo="bg-yellow"
            />
            <span className="text-xs font-black text-ink mt-2">{settings?.apelido1}</span>
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
              foto={settings?.foto2}
              emoji={settings?.emoji2 || '🦊'}
              nome={settings?.apelido2}
              size="lg"
              corFundo="bg-pink"
            />
            <span className="text-xs font-black text-ink mt-2">{settings?.apelido2}</span>
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
                ? `Falta ${settings?.apelido1} atualizar a localização.`
                : `Falta ${settings?.apelido2} atualizar a localização.`}
            </p>
          </div>
        )}
      </div>

      {/* BOTÃO PRINCIPAL DE ATUALIZAÇÃO */}
      <button
        onClick={handleAtualizarMinhaLocalizacao}
        disabled={atualizandoGps}
        className="btn-brut w-full py-3.5 bg-yellow text-ink text-xs sm:text-sm font-black shadow-brut flex items-center justify-center gap-2 hover:scale-101 active:scale-98 transition disabled:opacity-50 mb-5"
      >
        <span>{atualizandoGps ? '⏳' : '📡'}</span>
        <span>
          {atualizandoGps ? 'Obtendo Localização...' : 'Atualizar Minha Localização Agora'}
        </span>
      </button>

      {/* 📍 SEÇÃO: NOSSA LOCALIZAÇÃO ATUAL */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-extrabold text-white text-base flex items-center gap-1.5">
            <span>📍</span>
            <span>Nossa Localização Atual</span>
          </h2>
          <span className="text-[10px] font-bold text-white/70">
            Tempo Real 📡
          </span>
        </div>

        {/* Card: Minha Localização Atual */}
        <div className="card-brut p-4 bg-white shadow-brutsm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar
                foto={meuFoto}
                emoji={meuEmoji}
                nome={meuNome}
                size="xs"
                corFundo={ehP1 ? 'bg-yellow' : 'bg-pink'}
              />
              <span className="badge-brut bg-yellow text-ink text-[10px] font-black">
                Sua Localização ({meuNome})
              </span>
            </div>
            {minhaLoc && (
              <a
                href={`https://www.google.com/maps?q=${minhaLoc.latitude},${minhaLoc.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brut px-2.5 py-1 bg-white text-ink text-[10px] font-black shadow-brutsm inline-flex items-center gap-1 hover:bg-yellow transition"
              >
                Ver no Maps ↗
              </a>
            )}
          </div>

          {minhaLoc ? (
            <div className="space-y-1">
              <p className="text-xs font-black text-ink">
                {minhaLoc.endereco || 'Localização obtida via GPS'}
              </p>
              <div className="flex items-center justify-between text-[10px] text-ink/60 font-semibold pt-1 border-t border-ink/10">
                <span>
                  {minhaLoc.atualizado_em
                    ? `Atualizado: ${formatarDataHora(minhaLoc.atualizado_em)}`
                    : 'Recente'}
                </span>
                <span>
                  GPS: {minhaLoc.latitude.toFixed(4)}, {minhaLoc.longitude.toFixed(4)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink/60 font-medium py-1">
              Você ainda não atualizou sua localização hoje. Toque no botão acima para registrar!
            </p>
          )}
        </div>

        {/* Card: Localização Atual do Parceiro */}
        <div className="card-brut p-4 bg-white/95 shadow-brutsm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar
                foto={outroFoto}
                emoji={outroEmoji}
                nome={outroNome}
                size="xs"
                corFundo={ehP1 ? 'bg-pink' : 'bg-yellow'}
              />
              <span className="badge-brut bg-pink text-ink text-[10px] font-black">
                Localização de {outroNome}
              </span>
            </div>
            {outraLoc && (
              <a
                href={`https://www.google.com/maps?q=${outraLoc.latitude},${outraLoc.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brut px-2.5 py-1 bg-white text-ink text-[10px] font-black shadow-brutsm inline-flex items-center gap-1 hover:bg-pink transition"
              >
                Ver no Maps ↗
              </a>
            )}
          </div>

          {outraLoc ? (
            <div className="space-y-1">
              <p className="text-xs font-black text-ink">
                {outraLoc.endereco || 'Localização obtida via GPS'}
              </p>
              <div className="flex items-center justify-between text-[10px] text-ink/60 font-semibold pt-1 border-t border-ink/10">
                <span>
                  {outraLoc.atualizado_em
                    ? `Atualizado: ${formatarDataHora(outraLoc.atualizado_em)}`
                    : 'Recente'}
                </span>
                <span>
                  GPS: {outraLoc.latitude.toFixed(4)}, {outraLoc.longitude.toFixed(4)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink/60 font-medium py-1">
              {outroNome} ainda não atualizou a localização pelo aparelho dele(a).
            </p>
          )}
        </div>
      </div>

      {/* 📜 SEÇÃO: HISTÓRICO DAS DISTÂNCIAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-extrabold text-white text-base flex items-center gap-1.5">
            <span>📜</span>
            <span>Histórico de Distâncias</span>
          </h2>
          <span className="badge-brut bg-white text-ink text-[10px]">
            {historico.length} registro(s)
          </span>
        </div>

        {historico.length === 0 ? (
          <div className="card-brut p-4 bg-white/90 text-center space-y-1 shadow-brutsm">
            <p className="text-2xl py-1">🗺️</p>
            <p className="text-xs font-black text-ink">
              Nenhuma medição no histórico ainda
            </p>
            <p className="text-[11px] text-ink/60 font-semibold">
              Cada vez que você ou {outroNome} tocar em "Atualizar Minha Localização", o histórico guardará a distância e os bairros em que vocês estavam!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {historico.map((item) => {
              const resp = item.respostas || {};
              const quemRegistrou = item.parceiro;
              const ehEu = quemRegistrou === quemSouEu;
              const nomeRegistrou = quemRegistrou === 'parceiro1' ? settings?.apelido1 || 'Jeniffer' : settings?.apelido2 || 'Alvaro';
              const emojiRegistrou = quemRegistrou === 'parceiro1' ? settings?.emoji1 || '🐰' : settings?.emoji2 || '🦊';
              const fotoRegistrou = quemRegistrou === 'parceiro1' ? settings?.foto1 : settings?.foto2;

              return (
                <div
                  key={item.id}
                  className="card-brut p-3.5 bg-white shadow-brutsm space-y-2 relative animate-popIn"
                >
                  {/* Topo do Card de Histórico */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        foto={fotoRegistrou}
                        emoji={emojiRegistrou}
                        nome={nomeRegistrou}
                        size="xs"
                        corFundo={quemRegistrou === 'parceiro1' ? 'bg-yellow' : 'bg-pink'}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-ink truncate leading-tight">
                          {nomeRegistrou} {ehEu ? '(Você)' : ''}
                        </p>
                        <p className="text-[10px] text-ink/60 font-bold leading-none mt-0.5">
                          {formatarDataHora(resp.atualizado_em || item.criado_em)}
                        </p>
                      </div>
                    </div>

                    {/* Badge da Distância Calculada naquele momento */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {resp.distancia_formatada ? (
                        <span
                          className={`badge-brut text-[10px] font-black ${
                            resp.distancia_km !== null && resp.distancia_km < 0.15
                              ? 'bg-cyan text-ink'
                              : 'bg-yellow text-ink'
                          }`}
                        >
                          {resp.distancia_km !== null && resp.distancia_km < 0.15
                            ? 'Juntinhos! 💕'
                            : resp.distancia_formatada}
                        </span>
                      ) : (
                        <span className="badge-brut bg-ink/10 text-ink text-[10px] font-bold">
                          📍 Ponto Marcado
                        </span>
                      )}

                      {/* Botão Excluir Registro */}
                      <button
                        onClick={() => handleExcluirHistorico(item.id)}
                        disabled={excluindoId === item.id}
                        className="text-ink/40 hover:text-pink text-xs p-1 transition"
                        title="Remover este registro do histórico"
                        aria-label="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Detalhes do Local Registrado */}
                  <div className="bg-ink/5 p-2 rounded-xl border border-ink/10 text-xs font-bold text-ink space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] leading-tight text-ink/90">
                        📍 {resp.endereco || 'Localização obtida via satélite'}
                      </p>
                      {resp.latitude && resp.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${resp.latitude},${resp.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-ink/60 hover:text-royal underline shrink-0 whitespace-nowrap"
                        >
                          Maps ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
