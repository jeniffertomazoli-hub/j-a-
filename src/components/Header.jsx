import React, { useState, useEffect } from 'react';
import { calculateDaysTogether } from '../lib/storage';
import {
  isIosDevice,
  isStandaloneApp,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendAppNotification,
} from '../lib/notifications';
import { useToast } from '../context/ToastContext';
import Avatar from './Avatar';
import InstallPwaModal from './InstallPwaModal';
import NotificationModal from './NotificationModal';

export default function Header({
  nomeEu,
  emojiEu,
  fotoEu,
  onTrocarPerfil,
  onOpenSettings,
  settings,
}) {
  const toast = useToast();
  const timeTogether = calculateDaysTogether(settings?.dataInicio);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  const quemSouEu = nomeEu === (settings?.apelido1 || 'Jeniffer') ? 'parceiro1' : 'parceiro2';

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  async function handleToggleNotifications() {
    const currentPerm = getNotificationPermission();

    if (currentPerm === 'ios-requires-install') {
      toast.info('No iPhone, instale o app na Tela de Início para ativar as notificações! 📲');
      setIsInstallOpen(true);
      return;
    }

    if (!isNotificationSupported()) {
      toast.error('Seu aparelho não suporta notificações de navegador.');
      return;
    }

    if (currentPerm === 'denied') {
      toast.error('Notificações bloqueadas! Toque no cadeado 🔒 ao lado da URL para liberar.');
      return;
    }

    if (currentPerm === 'granted') {
      await sendAppNotification('🔔 Notificações Ativas!', {
        body: 'Você receberá avisos quando seu amor postar no Feed, atualizar o humor ou escrever uma carta 💜',
      });
      toast.love('Notificações ativas! Enviamos um aviso de teste no seu celular 🔔');
    } else {
      const res = await requestNotificationPermission();
      setNotifPermission(res);

      if (res === 'granted') {
        await sendAppNotification('💜 Sintonia Conectada!', {
          body: 'Prontinho! Você será avisado(a) sempre que tiver novidades do seu amor.',
        });
        toast.love('Notificações ativadas com sucesso! 💜');
      } else if (res === 'denied') {
        toast.error('Notificações bloqueadas! Toque no cadeado 🔒 ao lado da URL para permitir.');
      } else if (res === 'ios-requires-install') {
        toast.info('No iPhone, instale o app na Tela de Início para ativar notificações! 📲');
        setIsInstallOpen(true);
      }
    }
  }

  return (
    <>
      <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-2.5 pb-2 flex items-center justify-between gap-2">
        {/* Brand & Days Counter */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-yellow border-3 border-ink flex items-center justify-center font-display font-extrabold text-ink shrink-0 text-sm shadow-brutsm">
            S
          </div>
          <div className="min-w-0">
            <span className="font-display font-extrabold text-white text-sm sm:text-base truncate block leading-tight">
              Sintonia
            </span>
            {timeTogether ? (
              <span className="text-[10px] font-bold text-yellow/90 block truncate leading-none mt-0.5">
                💜 {timeTogether.totalDays} dias juntos
              </span>
            ) : (
              <span className="text-[10px] font-bold text-white/70 block truncate leading-none mt-0.5">
                {settings?.apelido1 || 'Jeniffer'} & {settings?.apelido2 || 'Alvaro'}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botão Instalar App (PWA) */}
          <button
            onClick={() => setIsInstallOpen(true)}
            className="w-8 h-8 rounded-full border-3 border-ink bg-white text-ink flex items-center justify-center text-xs shadow-brutsm hover:bg-yellow transition active:scale-95"
            title="Instalar App no Celular 📲"
            aria-label="Instalar App"
          >
            📲
          </button>

          {/* Botão Notificações */}
          <button
            onClick={() => setIsNotifModalOpen(true)}
            className={`w-8 h-8 rounded-full border-3 border-ink flex items-center justify-center text-xs sm:text-sm shadow-brutsm transition active:scale-95 ${
              notifPermission === 'granted'
                ? 'bg-yellow text-ink'
                : 'bg-white/80 text-ink/70 hover:bg-yellow'
            }`}
            title={
              notifPermission === 'granted'
                ? 'Notificações Ativas (toque para testar e gerenciar) 🔔'
                : notifPermission === 'ios-requires-install'
                ? 'Instale na Tela de Início para ativar notificações 📲'
                : notifPermission === 'denied'
                ? 'Notificações Bloqueadas (toque para instruções) 🔕'
                : 'Ativar Notificações no Celular 🔔'
            }
            aria-label="Notificações"
          >
            {notifPermission === 'granted' ? '🔔' : '🔕'}
          </button>

          {/* Configurações */}
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-full border-3 border-ink bg-white text-ink flex items-center justify-center text-xs sm:text-sm shadow-brutsm hover:bg-yellow transition active:scale-95"
            title="Configurações do Casal"
            aria-label="Configurações"
          >
            ⚙️
          </button>

          {/* Trocar Perfil */}
          <button
            onClick={onTrocarPerfil}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border-3 border-ink bg-white text-ink whitespace-nowrap shadow-brutsm hover:bg-yellow transition active:scale-95"
          >
            Trocar
          </button>

          {/* Avatar com Foto Real ou Emoji */}
          <div className="flex items-center gap-1 pl-0.5">
            <span className="text-xs font-bold text-white hidden sm:inline whitespace-nowrap">
              Olá, {nomeEu}!
            </span>
            <Avatar
              foto={fotoEu}
              emoji={emojiEu || '🐰'}
              nome={nomeEu}
              size="sm"
              corFundo="bg-cyan"
            />
          </div>
        </div>
      </div>

      <InstallPwaModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => {
          setIsNotifModalOpen(false);
          setNotifPermission(getNotificationPermission());
        }}
        quemSouEu={quemSouEu}
        settings={settings}
        onOpenInstallPwa={() => setIsInstallOpen(true)}
      />
    </>
  );
}
