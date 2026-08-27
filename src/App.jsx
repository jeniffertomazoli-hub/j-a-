import React, { useState, useEffect } from 'react';
import {
  isUserAuthenticated,
  getActiveProfile,
  setActiveProfile,
  getCoupleSettings,
} from './lib/storage';
import { ToastProvider } from './context/ToastContext';
import PinLock from './components/PinLock';
import ProfilePicker from './components/ProfilePicker';
import Header from './components/Header';
import Navigation from './components/Navigation';
import CoupleSettingsModal from './components/CoupleSettingsModal';

import TermometroTab from './components/tabs/TermometroTab';
import TopicosTab from './components/tabs/TopicosTab';
import CartasTab from './components/tabs/CartasTab';
import FilmesTab from './components/tabs/FilmesTab';
import QuizTab from './components/tabs/QuizTab';
import MemoriasTab from './components/tabs/MemoriasTab';
import PainelTab from './components/tabs/PainelTab';

export function AppContent() {
  const [autenticado, setAutenticado] = useState(isUserAuthenticated());
  const [quemSouEu, setQuemSouEu] = useState(getActiveProfile());
  const [tabAtiva, setTabAtiva] = useState('termometro');
  const [settings, setSettings] = useState(getCoupleSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  function handleEscolherPerfil(perfil) {
    setActiveProfile(perfil);
    setQuemSouEu(perfil);
  }

  function handleTrocarPerfil() {
    setActiveProfile(null);
    setQuemSouEu(null);
  }

  if (!autenticado) {
    return <PinLock onEntrar={() => setAutenticado(true)} />;
  }

  if (!quemSouEu) {
    return <ProfilePicker onEscolher={handleEscolherPerfil} />;
  }

  const meuNome = quemSouEu === 'parceiro1' ? settings.apelido1 : settings.apelido2;
  const meuEmoji = quemSouEu === 'parceiro1' ? settings.emoji1 : settings.emoji2;

  return (
    <div className="min-h-screen bg-royal text-ink flex flex-col">
      <header
        className="sticky top-0 z-30 bg-royal border-b-3 border-ink"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Header
          nomeEu={meuNome}
          emojiEu={meuEmoji}
          onTrocarPerfil={handleTrocarPerfil}
          onOpenSettings={() => setIsSettingsOpen(true)}
          settings={settings}
        />
        <Navigation tabAtiva={tabAtiva} onMudarTab={setTabAtiva} />
      </header>

      <main className="flex-1">
        {tabAtiva === 'termometro' && (
          <TermometroTab quemSouEu={quemSouEu} settings={settings} />
        )}
        {tabAtiva === 'topicos' && (
          <TopicosTab quemSouEu={quemSouEu} settings={settings} />
        )}
        {tabAtiva === 'cartas' && (
          <CartasTab quemSouEu={quemSouEu} settings={settings} />
        )}
        {tabAtiva === 'filmes' && (
          <FilmesTab quemSouEu={quemSouEu} settings={settings} />
        )}
        {tabAtiva === 'quiz' && (
          <QuizTab quemSouEu={quemSouEu} settings={settings} />
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
        onSettingsUpdated={(updated) => setSettings(updated)}
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
