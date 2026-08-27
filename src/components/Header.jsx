import React, { useState, useEffect } from 'react';
import { calculateDaysTogether } from '../lib/storage';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendAppNotification,
} from '../lib/notifications';
import { useToast } from '../context/ToastContext';

export default function Header({
  nomeEu,
  emojiEu,
  onTrocarPerfil,
  onOpenSettings,
  settings,
}) {
  const toast = useToast();
  const timeTogether = calculateDaysTogether(settings?.dataInicio);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  async function handleToggleNotifications() {
    if (!isNotificationSupported()) {
      toast.error('Seu navegador não suporta notificações.');
      return;
    }

    if (notifPermission === 'granted') {
      // Testar notificação
      sendAppNotification('🔔 Notificações Ativas!', {
        body: 'Você receberá avisos quando seu amor postar no Feed ou escrever uma carta 💜',
      });
      toast.love('Notificações estão ativas! Enviamos um teste para você 🔔');
    } else {
      const res = await requestNotificationPermission();
      setNotifPermission(res);

      if (res === 'granted') {
        sendAppNotification('💜 Sintonia Conectada!', {
          body: 'Prontinho! Você será avisado(a) sempre que tiver novidades do seu amor.',
        });
        toast.love('Notificações ativadas com sucesso! 💜');
      } else if (res === 'denied') {
        toast.error('Permissão de notificação negada nas configurações do navegador.');
      }
    }
  }

  return (
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
              {settings.apelido1} & {settings.apelido2}
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Botão de Notificações */}
        <button
          onClick={handleToggleNotifications}
          className={`w-8 h-8 rounded-full border-3 border-ink flex items-center justify-center text-xs sm:text-sm shadow-brutsm transition active:scale-95 ${
            notifPermission === 'granted'
              ? 'bg-yellow text-ink'
              : 'bg-white/80 text-ink/70 hover:bg-yellow'
          }`}
          title={
            notifPermission === 'granted'
              ? 'Notificações Ativas (clique para testar)'
              : 'Ativar Notificações no Celular'
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

        {/* Avatar */}
        <div className="flex items-center gap-1 pl-0.5">
          <span className="text-xs font-bold text-white hidden sm:inline whitespace-nowrap">
            Olá, {nomeEu}!
          </span>
          <span
            className="w-8 h-8 rounded-full bg-cyan border-3 border-ink flex items-center justify-center text-sm shrink-0 shadow-brutsm"
            title={`Você é ${nomeEu}`}
          >
            {emojiEu || '🐰'}
          </span>
        </div>
      </div>
    </div>
  );
}
