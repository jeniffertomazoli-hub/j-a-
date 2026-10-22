/**
 * Gerenciador de Notificações Web Push & Sistema de Som para o Sintonia
 * Compatível com iOS (PWA Standalone), Android Chrome e Desktop
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

export async function requestNotificationPermission() {
  if (isIosDevice() && !isStandaloneApp() && !('Notification' in window)) {
    return 'ios-requires-install';
  }
  if (!isNotificationSupported()) return 'unsupported';

  try {
    // Garante que o Service Worker esteja registrado
    if ('serviceWorker' in navigator) {
      try {
        const existing = await navigator.serviceWorker.getRegistration();
        if (!existing) {
          await navigator.serviceWorker.register('/sw.js');
        }
      } catch (e) {
        console.warn('Erro ao pré-registrar service worker:', e);
      }
    }

    let permission;
    const req = Notification.requestPermission();
    if (req && typeof req.then === 'function') {
      permission = await req;
    } else {
      permission = await new Promise((resolve) => Notification.requestPermission(resolve));
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
    // Silencioso se áudio não for permitido antes de interação
  }
}

/**
 * Dispara uma notificação nativa do sistema operacional (celular / computador)
 * Usa /icon-192.png (PNG bitmap compatível com Android & iOS)
 */
export async function sendAppNotification(
  title,
  { body, icon = '/icon-192.png', badge = '/icon-192.png', tag = 'sintonia-notification' } = {}
) {
  if (typeof window === 'undefined') return false;
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  playChimeSound();

  const notifOptions = {
    body,
    icon,
    badge,
    tag,
    vibrate: [200, 100, 200],
    data: { url: '/' },
    renotify: true,
  };

  // 1. Tenta via Service Worker showNotification (Obrigatório no Android Chrome, ideal para PWA)
  if ('serviceWorker' in navigator) {
    try {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
      const reg =
        (await Promise.race([navigator.serviceWorker.ready, timeoutPromise])) ||
        (await navigator.serviceWorker.getRegistration());

      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notifOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('Falha em registration.showNotification:', swErr);
    }

    // 2. Mensagem direta para o Service Worker ativo (caso ready tenha demorado)
    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options: notifOptions,
        });
        return true;
      }
    } catch (msgErr) {
      console.warn('Falha ao enviar mensagem de notificação para SW:', msgErr);
    }
  }

  // 3. Fallback para Notification API padrão (Desktop / navegadores que suportam construtor)
  try {
    new Notification(title, {
      body,
      icon,
      badge,
      tag,
    });
    return true;
  } catch (err) {
    // No Android Chrome, 'new Notification()' gera 'TypeError: Illegal constructor'
    console.warn('Fallback Notification constructor indisponível no aparelho:', err);
    return false;
  }
}
