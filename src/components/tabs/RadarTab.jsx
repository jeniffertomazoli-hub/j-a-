import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  salvarLocalizacaoRadar,
  buscarLocalizacoesRadar,
  enviarAbracoVirtual,
  subscribeToTable,
} from '../../lib/supabase';
import {
  calcularDistanciaKm,
  formatarDistanciaAmor,
  formatarTempoAtras,
  obterBateriaDispositivo,
  obterLocalizacaoAtual,
} from '../../lib/geoUtils';
import { useToast } from '../../context/ToastContext';
import Avatar from '../Avatar';

export default function RadarTab({ quemSouEu, settings }) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';

  const meuNome = ehP1 ? settings.apelido1 : settings.apelido2;
  const meuEmoji = ehP1 ? settings.emoji1 : settings.emoji2;
  const meuFoto = ehP1 ? settings.foto1 : settings.foto2;

  const outroNome = ehP1 ? settings.apelido2 : settings.apelido1;
  const outroEmoji = ehP1 ? settings.emoji2 : settings.emoji1;
  const outroFoto = ehP1 ? settings.foto2 : settings.foto1;

  const [loading, setLoading] = useState(true);
  const [atualizandoGps, setAtualizandoGps] = useState(false);
  const [enviandoAbraco, setEnviandoAbraco] = useState(false);
  const [locP1, setLocP1] = useState(null);
  const [locP2, setLocP2] = useState(null);

  // Referências para o mapa Leaflet
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerP1Ref = useRef(null);
  const markerP2Ref = useRef(null);
  const polylineRef = useRef(null);

  useEffect(() => {
    carregarLocalizacoes();

    // Inscrição em tempo real para sincronização instantânea
    const unsubscribe = subscribeToTable('respostas_diarias', (payload) => {
      if (payload.new && payload.new.data === '2099-01-01') {
        carregarLocalizacoes(false);
      }
      if (
        payload.new &&
        payload.new.data === '2099-01-02' &&
        payload.new.respostas?.tipo === 'abraco_virtual'
      ) {
        const abraco = payload.new.respostas;
        if (abraco.para === quemSouEu && Date.now() - abraco.timestamp < 30000) {
          receberAbracoVirtual(abraco);
        }
      }
    });

    return () => {
      unsubscribe();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [quemSouEu]);

  async function carregarLocalizacoes(mostrarLoading = true) {
    if (mostrarLoading) setLoading(true);
    try {
      const data = await buscarLocalizacoesRadar();
      setLocP1(data.parceiro1);
      setLocP2(data.parceiro2);
    } catch (err) {
      console.error('Erro ao buscar localizações do radar:', err);
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  }

  // Inicializa ou atualiza o Mapa Leaflet quando as coordenadas mudam
  useEffect(() => {
    if (loading) return;

    // Aguarda o container DOM estar montado
    const timer = setTimeout(() => {
      atualizarMapaLeaflet();
    }, 150);

    return () => clearTimeout(timer);
  }, [loading, locP1, locP2]);

  function criarHtmlIconeAvatar(foto, emoji, nome, corBg) {
    return `
      <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
        <div style="
          width: 46px; 
          height: 46px; 
          border-radius: 9999px; 
          border: 3px solid #111; 
          background-color: ${corBg}; 
          box-shadow: 3px 3px 0px #111;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          ${
            foto
              ? `<img src="${foto}" style="width:100%; height:100%; object-fit:cover;" />`
              : `<span style="font-size:22px;">${emoji || '❤️'}</span>`
          }
        </div>
        <div style="
          background:#111; 
          color:#fff; 
          font-weight:900; 
          font-size:10px; 
          padding: 2px 7px; 
          border-radius:9999px; 
          margin-top:3px;
          white-space:nowrap;
          border: 1px solid #FFD93D;
        ">
          ${nome}
        </div>
      </div>
    `;
  }

  function atualizarMapaLeaflet() {
    if (!window.L || !mapContainerRef.current) return;

    const latLng1 = locP1 ? [locP1.latitude, locP1.longitude] : null;
    const latLng2 = locP2 ? [locP2.latitude, locP2.longitude] : null;

    // Se ninguém compartilhou ainda, não inicializa mapa
    if (!latLng1 && !latLng2) return;

    const centroPadrao = latLng1 || latLng2 || [-23.55052, -46.633308];

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(centroPadrao, 14);

      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      window.L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Marcador Jeniffer (Parceiro 1)
    if (latLng1) {
      const customIconP1 = window.L.divIcon({
        className: 'custom-radar-marker',
        html: criarHtmlIconeAvatar(settings.foto1, settings.emoji1 || '🐰', settings.apelido1 || 'Jeniffer', '#FFD93D'),
        iconSize: [46, 68],
        iconAnchor: [23, 68],
      });

      if (!markerP1Ref.current) {
        markerP1Ref.current = window.L.marker(latLng1, { icon: customIconP1 }).addTo(map);
      } else {
        markerP1Ref.current.setLatLng(latLng1);
        markerP1Ref.current.setIcon(customIconP1);
      }
    }

    // Marcador Alvaro (Parceiro 2)
    if (latLng2) {
      const customIconP2 = window.L.divIcon({
        className: 'custom-radar-marker',
        html: criarHtmlIconeAvatar(settings.foto2, settings.emoji2 || '🦊', settings.apelido2 || 'Alvaro', '#FF4D97'),
        iconSize: [46, 68],
        iconAnchor: [23, 68],
      });

      if (!markerP2Ref.current) {
        markerP2Ref.current = window.L.marker(latLng2, { icon: customIconP2 }).addTo(map);
      } else {
        markerP2Ref.current.setLatLng(latLng2);
        markerP2Ref.current.setIcon(customIconP2);
      }
    }

    // Linha do Amor conectando os dois pontos
    if (latLng1 && latLng2) {
      if (!polylineRef.current) {
        polylineRef.current = window.L.polyline([latLng1, latLng2], {
          color: '#2F3FE0',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.85,
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs([latLng1, latLng2]);
      }

      // Enquadra os dois pontos com margem suave
      const bounds = window.L.latLngBounds([latLng1, latLng2]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (latLng1 || latLng2) {
      map.setView(latLng1 || latLng2, 15);
    }
  }

  function handleCentralizar(alvo) {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const latLng1 = locP1 ? [locP1.latitude, locP1.longitude] : null;
    const latLng2 = locP2 ? [locP2.latitude, locP2.longitude] : null;

    if (alvo === 'ambos' && latLng1 && latLng2) {
      const bounds = window.L.latLngBounds([latLng1, latLng2]);
      map.fitBounds(bounds, { padding: [60, 60] });
    } else if (alvo === 'p1' && latLng1) {
      map.setView(latLng1, 16);
    } else if (alvo === 'p2' && latLng2) {
      map.setView(latLng2, 16);
    } else if (alvo === 'mim') {
      const meuLatLng = ehP1 ? latLng1 : latLng2;
      if (meuLatLng) map.setView(meuLatLng, 16);
    }
  }

  async function handleAtualizarMinhaLocalizacao() {
    setAtualizandoGps(true);
    try {
      toast.info('Obtendo sinal de GPS e bateria do celular...');
      const coords = await obterLocalizacaoAtual();
      const bateriaInfo = await obterBateriaDispositivo();

      await salvarLocalizacaoRadar(quemSouEu, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        precisao: coords.precisao,
        bateria: bateriaInfo ? bateriaInfo.nivel : null,
        carregando: bateriaInfo ? bateriaInfo.carregando : false,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#2F3FE0', '#FFD93D', '#FF4D97'],
      });

      toast.love('Sua localização foi atualizada com sucesso no radar! 📍');
      await carregarLocalizacoes(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao obter localização. Verifique a permissão de GPS.');
    } finally {
      setAtualizandoGps(false);
    }
  }

  async function handleMandarAbraco() {
    setEnviandoAbraco(true);
    try {
      const distanciaKm = locP1 && locP2
        ? calcularDistanciaKm(locP1.latitude, locP1.longitude, locP2.latitude, locP2.longitude)
        : null;

      const outroParceiroId = ehP1 ? 'parceiro2' : 'parceiro1';
      await enviarAbracoVirtual(quemSouEu, outroParceiroId, distanciaKm);

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF4D97', '#FFD93D', '#8B7FFF'],
      });

      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      toast.love(`Abraço virtual enviado para ${outroNome}! 🫂💜`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar abraço virtual.');
    } finally {
      setEnviandoAbraco(false);
    }
  }

  function receberAbracoVirtual(abraco) {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#FF4D97', '#FFD93D', '#33DDF3', '#2F3FE0'],
    });

    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);

    const distInfo = abraco.distanciaKm ? ` de ${abraco.distanciaKm.toFixed(1)} km de distância` : '';
    toast.love(`🫂 ${outroNome} acabou de te mandar um abraço virtual quentinho${distInfo}! 💜`);
  }

  // Cálculos de Distância e Bateria
  const distanciaKm = locP1 && locP2
    ? calcularDistanciaKm(locP1.latitude, locP1.longitude, locP2.latitude, locP2.longitude)
    : null;

  const distanciaInfo = formatarDistanciaAmor(distanciaKm);

  const minhaLoc = ehP1 ? locP1 : locP2;
  const outraLoc = ehP1 ? locP2 : locP1;

  return (
    <div className="px-3.5 sm:px-6 pt-4 max-w-md mx-auto pb-14 animate-fadeIn">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-yellow text-ink text-[10px]">
          Couple 360 · Radar do Amor 📍
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings.apelido1} & {settings.apelido2}
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1 leading-tight">
        Onde está meu amor?
      </h1>
      <p className="text-xs text-white/80 font-medium mb-4">
        Acompanhe a distância em tempo real, bateria e envie abraços virtuais.
      </p>

      {/* CARD PRINCIPAL DE DISTÂNCIA (COUPLE 360) */}
      <div
        className={`card-brut p-4 sm:p-5 mb-4 shadow-brut relative overflow-hidden transition-all ${
          distanciaInfo?.ehJuntinho ? 'bg-cyan' : 'bg-white'
        }`}
      >
        {/* Conexão Visual dos Avatares */}
        <div className="flex items-center justify-between gap-3 mb-3">
          {/* Avatar Jeniffer */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar
                foto={settings.foto1}
                emoji={settings.emoji1 || '🐰'}
                nome={settings.apelido1}
                size="md"
                corFundo="bg-yellow"
              />
              {locP1?.bateria !== null && locP1?.bateria !== undefined && (
                <span className="absolute -bottom-1 -right-1 badge-brut bg-ink text-white text-[8px] py-0 px-1 border">
                  {locP1.carregando ? '⚡' : '🔋'} {locP1.bateria}%
                </span>
              )}
            </div>
            <span className="text-xs font-black text-ink mt-1.5">{settings.apelido1}</span>
            <span className="text-[9px] text-ink/60 font-bold">
              {formatarTempoAtras(locP1?.atualizado_em)}
            </span>
          </div>

          {/* Linha Pulsante & Distância no Meio */}
          <div className="flex-1 flex flex-col items-center px-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs">📍</span>
              <span className="text-xs sm:text-sm font-black text-ink tracking-tight">
                {distanciaInfo ? distanciaInfo.valorFormatado : 'Sincronizando...'}
              </span>
            </div>
            <div className="w-full relative flex items-center justify-center">
              <div className="h-1 w-full bg-ink/15 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow via-pink to-purple w-full animate-pulse" />
              </div>
              <span className="absolute text-sm animate-bounceShort select-none">💜</span>
            </div>
            <span className="text-[9px] font-bold text-ink/50 mt-1 text-center">
              {distanciaInfo?.ehJuntinho ? 'Juntinhos!' : 'Distância em linha reta'}
            </span>
          </div>

          {/* Avatar Alvaro */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar
                foto={settings.foto2}
                emoji={settings.emoji2 || '🦊'}
                nome={settings.apelido2}
                size="md"
                corFundo="bg-pink"
              />
              {locP2?.bateria !== null && locP2?.bateria !== undefined && (
                <span className="absolute -bottom-1 -right-1 badge-brut bg-ink text-white text-[8px] py-0 px-1 border">
                  {locP2.carregando ? '⚡' : '🔋'} {locP2.bateria}%
                </span>
              )}
            </div>
            <span className="text-xs font-black text-ink mt-1.5">{settings.apelido2}</span>
            <span className="text-[9px] text-ink/60 font-bold">
              {formatarTempoAtras(locP2?.atualizado_em)}
            </span>
          </div>
        </div>

        {/* Mensagem Carinhosa de Proximidade */}
        <div className="bg-yellow/20 rounded-xl p-2.5 border-2 border-ink/15 text-center mt-1">
          <p className="text-xs font-black text-ink">
            {distanciaInfo ? distanciaInfo.textoPrincipal : 'Aguardando atualização de GPS de vocês'}
          </p>
          <p className="text-[10px] text-ink/70 font-semibold mt-0.5">
            {distanciaInfo ? distanciaInfo.subtexto : 'Toque no botão abaixo para compartilhar onde você está.'}
          </p>
        </div>
      </div>

      {/* MAPA INTERATIVO (LOVE MAP COUPLE 360) */}
      <div className="card-brut p-3 mb-4 bg-white shadow-brut relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase text-ink flex items-center gap-1">
            <span>🗺️</span> Mapa do Casal ao Vivo
          </p>

          {/* Atalhos de Foco do Mapa */}
          <div className="flex items-center gap-1">
            {locP1 && locP2 && (
              <button
                type="button"
                onClick={() => handleCentralizar('ambos')}
                className="px-2 py-0.5 rounded-full border border-ink text-[9px] font-black bg-yellow text-ink shadow-brutsm active:scale-95 transition"
              >
                Ver Ambos
              </button>
            )}
            <button
              type="button"
              onClick={() => handleCentralizar('mim')}
              className="px-2 py-0.5 rounded-full border border-ink text-[9px] font-black bg-white text-ink shadow-brutsm active:scale-95 transition"
            >
              Meu Local
            </button>
          </div>
        </div>

        {/* Container do Mapa Leaflet */}
        <div
          ref={mapContainerRef}
          className="w-full h-64 sm:h-72 rounded-xl border-3 border-ink overflow-hidden shadow-inner relative bg-[#E5E9EC]"
        >
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/70 flex items-center justify-center">
              <div className="spinner" />
            </div>
          )}

          {!locP1 && !locP2 && !loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-white/90">
              <span className="text-3xl mb-1">📍</span>
              <p className="text-xs font-black text-ink">Nenhum local compartilhado ainda</p>
              <p className="text-[10px] text-ink/60 font-semibold mt-0.5">
                Toque em "Atualizar Meu Local" abaixo para ligar o radar de vocês!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BOTÕES DE AÇÃO DO RADAR */}
      <div className="space-y-2.5">
        {/* Botão Atualizar GPS & Bateria */}
        <button
          onClick={handleAtualizarMinhaLocalizacao}
          disabled={atualizandoGps}
          className="btn-brut w-full py-3 bg-yellow text-ink text-xs font-black shadow-brut flex items-center justify-center gap-2 hover:scale-101 active:scale-98 transition disabled:opacity-50"
        >
          <span>{atualizandoGps ? '⏳' : '📡'}</span>
          <span>{atualizandoGps ? 'Buscando GPS e Bateria...' : 'Atualizar Meu Local no Radar'}</span>
        </button>

        {/* Botão Mandar Abraço Virtual */}
        <button
          onClick={handleMandarAbraco}
          disabled={enviandoAbraco}
          className="btn-brut w-full py-2.5 bg-pink text-ink text-xs font-black shadow-brut flex items-center justify-center gap-2 hover:scale-101 active:scale-98 transition disabled:opacity-50"
        >
          <span>{enviandoAbraco ? '💜' : '🫂'}</span>
          <span>{enviandoAbraco ? 'Enviando carinho...' : `Mandar Abraço Virtual para ${outroNome}`}</span>
        </button>
      </div>

      {/* STATUS DE BATERIA DETALHADO */}
      <div className="card-brut p-3.5 mt-4 bg-white/95 shadow-brut">
        <p className="text-[10px] font-black uppercase text-ink/70 mb-2 flex items-center gap-1">
          <span>🔋</span> Status dos Aparelhos
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Aparelho Jeniffer */}
          <div className="p-2.5 rounded-xl border-2 border-ink bg-yellow/15 flex items-center gap-2">
            <span className="text-xl">{locP1?.carregando ? '⚡' : '🔋'}</span>
            <div className="min-w-0">
              <p className="font-black text-ink text-[11px] truncate">{settings.apelido1}</p>
              <p className="text-[10px] font-bold text-ink/70">
                {locP1?.bateria !== null && locP1?.bateria !== undefined
                  ? `${locP1.bateria}% ${locP1.carregando ? '(na tomada)' : ''}`
                  : 'Não disponível'}
              </p>
            </div>
          </div>

          {/* Aparelho Alvaro */}
          <div className="p-2.5 rounded-xl border-2 border-ink bg-pink/15 flex items-center gap-2">
            <span className="text-xl">{locP2?.carregando ? '⚡' : '🔋'}</span>
            <div className="min-w-0">
              <p className="font-black text-ink text-[11px] truncate">{settings.apelido2}</p>
              <p className="text-[10px] font-bold text-ink/70">
                {locP2?.bateria !== null && locP2?.bateria !== undefined
                  ? `${locP2.bateria}% ${locP2.carregando ? '(na tomada)' : ''}`
                  : 'Não disponível'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
