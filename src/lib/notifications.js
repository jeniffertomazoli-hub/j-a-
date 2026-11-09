/**
 * Gerenciador de Notificações Web Push & Sistema de Som para o Sintonia
 * Compatível com iOS (PWA Standalone), Android Chrome, Samsung Internet e Desktop
 */

export function isIosDevice() {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isNotificationSupported() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

export function getNotificationPermission() {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIosDevice() && !isStandaloneApp() && !('Notification' in window)) {
    return 'ios-requires-install';
  }
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Desbloqueio proativo do áudio em celulares (necessário para tocar o som sem interação síncrona)
 */
let sharedAudioCtx = null;

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContext();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  ['touchstart', 'touchend', 'click', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { once: true, passive: true });
  });
}

/**
 * Pede permissão de notificação. No iOS PWA, deve ser chamado IMEDIATAMENTE no clique.
 */
export async function requestNotificationPermission() {
  if (isIosDevice() && !isStandaloneApp() && !('Notification' in window)) {
    return 'ios-requires-install';
  }
  if (!isNotificationSupported()) return 'unsupported';

  try {
    unlockAudio();

    let permission;
    const req = Notification.requestPermission();
    if (req && typeof req.then === 'function') {
      permission = await req;
    } else {
      permission = await new Promise((resolve) => Notification.requestPermission(resolve));
    }

    if (permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return permission;
  } catch (err) {
    console.error('Erro ao pedir permissão de notificação:', err);
    return 'denied';
  }
}

/**
 * Toca um som suave de sino romântico usando Web Audio API
 */
export function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContext();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;

    // Nota 1 (Dó)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    // Nota 2 (Mi)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.2);

    // Nota 3 (Sol)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(783.99, now + 0.24);
    gain3.gain.setValueAtTime(0.28, now + 0.24);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 1.5);
  } catch (err) {}
}

/**
 * Dispara uma notificação nativa do sistema operacional (celular / computador)
 */
export async function sendAppNotification(
  title,
  { body, icon = '/icon-192.png', badge = '/icon-192.png', tag = 'sintonia-notification' } = {}
) {
  if (typeof window === 'undefined') return false;

  // 1. Sempre emite áudio e vibração tátil no aparelho
  playChimeSound();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 300]);
    } catch {}
  }

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const origin = window.location.origin;
  const fullIcon = icon.startsWith('http') ? icon : `${origin}${icon.startsWith('/') ? icon : '/' + icon}`;
  const fullBadge = badge.startsWith('http') ? badge : `${origin}${badge.startsWith('/') ? badge : '/' + badge}`;

  const notifOptions = {
    body: body || 'Novidade do seu amor no Sintonia 💜',
    icon: fullIcon,
    badge: fullBadge,
    tag: tag || `sintonia-${Date.now()}`,
    vibrate: [300, 100, 300, 100, 300],
    data: { url: '/' },
    renotify: true,
  };

  // 2. Nos celulares (Android Chrome, Samsung Internet, iOS PWA), chama ServiceWorker.showNotification
  if ('serviceWorker' in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }

      if (reg) {
        if (!reg.active) {
          try {
            await Promise.race([
              navigator.serviceWorker.ready,
              new Promise((res) => setTimeout(res, 800)),
            ]);
          } catch {}
        }

        if (typeof reg.showNotification === 'function') {
          await reg.showNotification(title, notifOptions);
          return true;
        }
      }
    } catch (swErr) {
      console.warn('Tentativa via getRegistration falhou:', swErr);
    }

    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options: notifOptions,
        });
        return true;
      }
    } catch {}
  }

  // 3. Fallback para Notification API padrão de navegadores desktop
  try {
    new Notification(title, notifOptions);
    return true;
  } catch (err) {
    return false;
  }
}
