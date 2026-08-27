/**
 * Gerenciador de Notificações Web Push & Sistema de Som para o Sintonia
 */

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Erro ao pedir permissão de notificação:', err);
    return 'denied';
  }
}

/**
 * Toca um som suave de sino romântico usando Web Audio API (sem precisar de arquivos externos)
 */
export function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Nota 1 (Dó)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    // Nota 2 (Mi)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.2);

    // Nota 3 (Sol)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(783.99, now + 0.24); // G5
    gain3.gain.setValueAtTime(0.25, now + 0.24);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 1.5);
  } catch (err) {
    // Falha silenciosa se áudio não for permitido antes de interação
  }
}

/**
 * Dispara uma notificação nativa do sistema operacional (celular / computador)
 */
export async function sendAppNotification(title, { body, icon = '/favicon.svg', tag = 'sintonia-notification' } = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  playChimeSound();

  try {
    // Tenta via Service Worker primeiro (ideal para celulares / PWA)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag,
          vibrate: [200, 100, 200],
          data: { url: '/' },
        });
        return true;
      }
    }

    // Fallback para Notification API padrão
    new Notification(title, {
      body,
      icon,
      badge: icon,
      tag,
    });
    return true;
  } catch (err) {
    console.error('Erro ao disparar notificação:', err);
    return false;
  }
}
