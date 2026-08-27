const AUTH_KEY = 'termometro-felicidade:autenticado';
const PROFILE_KEY = 'termometro-felicidade:quem-sou-eu';
const SETTINGS_KEY = 'sintonia:configuracoes-casal';

export const DEFAULT_COUPLE_SETTINGS = {
  apelido1: 'Jeniffer',
  apelido2: 'Alvaro',
  emoji1: '🐰',
  emoji2: '🦊',
  dataInicio: '', // 'AAAA-MM-DD'
  pinCode: '1234',
};

export function isUserAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'sim';
}

export function setAuthenticated(val = true) {
  if (val) {
    localStorage.setItem(AUTH_KEY, 'sim');
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function getActiveProfile() {
  return localStorage.getItem(PROFILE_KEY);
}

export function setActiveProfile(profile) {
  if (profile) {
    localStorage.setItem(PROFILE_KEY, profile);
  } else {
    localStorage.removeItem(PROFILE_KEY);
  }
}

export function getCoupleSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_COUPLE_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_COUPLE_SETTINGS,
      ...parsed,
      // Garante que se ainda estiver com os nomes genéricos antigos, use Jeniffer e Alvaro
      apelido1: parsed.apelido1 && parsed.apelido1 !== 'Parceiro(a) 1' && parsed.apelido1 !== 'Parceiro 1' ? parsed.apelido1 : 'Jeniffer',
      apelido2: parsed.apelido2 && parsed.apelido2 !== 'Parceiro(a) 2' && parsed.apelido2 !== 'Parceiro 2' ? parsed.apelido2 : 'Alvaro',
    };
  } catch {
    return DEFAULT_COUPLE_SETTINGS;
  }
}

export function saveCoupleSettings(settings) {
  try {
    const merged = { ...getCoupleSettings(), ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return DEFAULT_COUPLE_SETTINGS;
  }
}

export function calculateDaysTogether(startDateString) {
  if (!startDateString) return null;
  const start = new Date(startDateString + 'T00:00:00');
  const now = new Date();
  const diffTime = Math.abs(now - start);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { totalDays: diffDays, years, months, days };
}
