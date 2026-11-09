import React, { useState, useEffect } from 'react';
import {
  isUserAuthenticated,
  getActiveProfile,
  setActiveProfile,
  getCoupleSettings,
  saveCoupleSettings,
} from './lib/storage';
import {
  buscarConfiguracoesCasalNuvem,
  salvarConfiguracoesCasalNuvem,
  subscribeToTable,
  obterCanalBroadcastCasal,
} from './lib/supabase';
import { ToastProvider } from './context/ToastContext';
import { useNotificationWatcher } from './hooks/useNotificationWatcher';
import PinLock from './components/PinLock';
import ProfilePicker from './components/ProfilePicker';
import Header from './components/Header';
import Navigation from './components/Navigation';
import CoupleSettingsModal from './components/CoupleSettingsModal';

import TermometroTab from './components/tabs/TermometroTab';
import RadarTab from './components/tabs/RadarTab';
import FeedTab from './components/tabs/FeedTab';
import CartasTab from './components/tabs/CartasTab';
import FilmesTab from './components/tabs/FilmesTab';
import MemoriasTab from './components/tabs/MemoriasTab';
import PainelTab from './components/tabs/PainelTab';

export function AppContent() {
  const [autenticado, setAutenticado] = useState(isUserAuthenticated());
  const [quemSouEu, setQuemSouEu] = useState(getActiveProfile());
  const [tabAtiva, setTabAtiva] = useState('termometro');
  const [settings, setSettings] = useState(getCoupleSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notifsNaoLidas, setNotifsNaoLidas] = useState(0);

  // Sincroniza configurações e fotos de perfil em tempo real via nuvem (Supabase)
  useEffect(() => {
    async function carregarSettingsNuvem() {
      try {
        const nuvem = await buscarConfiguracoesCasalNuvem();
        if (nuvem && (nuvem.foto1 || nuvem.foto2 || nuvem.apelido1 || nuvem.apelido2)) {
          saveCoupleSettings(nuvem);
          setSettings((prev) => ({ ...prev, ...nuvem }));
        }
      } catch (e) {
        console.warn('Erro ao carregar settings nuvem:', e);
      }
    }
    carregarSettingsNuvem();

    // 1. Canal Broadcast em tempo real para sincronização imediata (0ms) de fotos e dados
    const canal = obterCanalBroadcastCasal();
    const subBroadcast = canal.on('broadcast', { event: 'sintonia_notificacao' }, ({ payload }) => {
      if (payload?.tag === 'config-atualizada' && payload?.payload) {
        saveCoupleSettings(payload.payload);
        setSettings((prev) => ({ ...prev, ...payload.payload }));
      }
    });

    // 2. Mudanças na tabela memorias
    const unsubMem = subscribeToTable('memorias', (payload) => {
      if (payload?.new?.titulo === '__CONFIG_PERFIL__' || payload?.eventType === 'INSERT') {
        carregarSettingsNuvem();
      }
    });

    // 3. Mudanças na tabela respostas_diarias
    const unsubRd = subscribeToTable('respostas_diarias', (payload) => {
      if (payload?.new?.data === '2099-01-02' || payload?.new?.respostas?.tipo === 'config_casal') {
        carregarSettingsNuvem();
      }
    });

    return () => {
      unsubMem && unsubMem();
      unsubRd && unsubRd();
    };
  }, []);

  // Monitora e dispara notificações em tempo real para ações do parceiro
  useNotificationWatcher(quemSouEu, settings, () => {
    setNotifsNaoLidas((prev) => prev + 1);
  });

  function handleEscolherPerfil(perfil) {
    setActiveProfile(perfil);
    setQuemSouEu(perfil);
  }

  function handleTrocarPerfil() {
    setActiveProfile(null);
    setQuemSouEu(null);
  }

  function handleSettingsUpdated(updated) {
    setSettings(updated);
    salvarConfiguracoesCasalNuvem(updated);
  }

  if (!autenticado) {
    return <PinLock settings={settings} onEntrar={() => setAutenticado(true)} />;
  }

  if (!quemSouEu) {
    return <ProfilePicker settings={settings} onEscolher={handleEscolherPerfil} />;
  }

  const meuNome = quemSouEu === 'parceiro1' ? settings.apelido1 : settings.apelido2;
  const meuEmoji = quemSouEu === 'parceiro1' ? settings.emoji1 : settings.emoji2;
  const meuFoto = quemSouEu === 'parceiro1' ? settings.foto1 : settings.foto2;

  return (
    <div className="min-h-screen bg-royal text-ink flex flex-col w-full max-w-full overflow-x-hidden">
      <header
        className="sticky top-0 z-30 bg-royal border-b-3 border-ink w-full max-w-full"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Header
          nomeEu={meuNome}
          emojiEu={meuEmoji}
          fotoEu={meuFoto}
          onTrocarPerfil={handleTrocarPerfil}
          onOpenSettings={() => setIsSettingsOpen(true)}
          settings={settings}
          notifsNaoLidas={notifsNaoLidas}
          onLimparNotifsNaoLidas={() => setNotifsNaoLidas(0)}
        />
        <Navigation tabAtiva={tabAtiva} onMudarTab={setTabAtiva} />
      </header>

      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {tabAtiva === 'termometro' && (
          <TermometroTab
            quemSouEu={quemSouEu}
            settings={settings}
            onIrParaFeed={() => setTabAtiva('feed')}
            onIrParaRadar={() => setTabAtiva('radar')}
          />
        )}
        {tabAtiva === 'radar' && (
          <RadarTab quemSouEu={quemSouEu} settings={settings} />
        )}
        {tabAtiva === 'feed' && (
          <FeedTab quemSouEu={quemSouEu} settings={settings} />
        )}
        {tabAtiva === 'cartas' && (
          <CartasTab quemSouEu={quemSouEu} settings={settings} />
        )}
        {tabAtiva === 'filmes' && (
          <FilmesTab quemSouEu={quemSouEu} settings={settings} />
        )}
        {tabAtiva === 'memorias' && (
          <MemoriasTab quemSouEu={quemSouEu} settings={settings} />
        )}
        {tabAtiva === 'historico' && (
          <PainelTab quemSouEu={quemSouEu} settings={settings} />
        )}
      </main>

      <CoupleSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsUpdated={handleSettingsUpdated}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
