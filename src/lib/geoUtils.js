// 🛰️ UTILITÁRIOS DE GEOLOCALIZAÇÃO E BATERIA (RADAR 360 DO CASAL)

// Cálculo da distância exata entre duas coordenadas usando a fórmula de Haversine
export function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined || lat1 === null ||
    lon1 === undefined || lon1 === null ||
    lat2 === undefined || lat2 === null ||
    lon2 === undefined || lon2 === null
  ) {
    return null;
  }

  const R = 6371; // Raio médio da Terra em km
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  return km;
}

export function formatarDistanciaAmor(km) {
  if (km === null || km === undefined || Number.isNaN(km)) return null;

  // Se estiver a menos de 150 metros, estão juntos!
  if (km < 0.15) {
    return {
      textoPrincipal: 'Juntinhos agora! 🥰',
      subtexto: 'Vocês estão no mesmo lugar dividindo o mesmo ar 💜',
      ehJuntinho: true,
      valorFormatado: `${Math.round(km * 1000)}m`,
    };
  }

  // Se estiver a menos de 1 km
  if (km < 1) {
    const metros = Math.round(km * 1000);
    return {
      textoPrincipal: `${metros} metros de distância`,
      subtexto: 'Pertinho um do outro! Dá pra se ver rapidinho 🚲',
      ehJuntinho: false,
      valorFormatado: `${metros}m`,
    };
  }

  // Se estiver a mais de 1 km
  const kmFormatado = km.toFixed(1).replace('.', ',');
  return {
    textoPrincipal: `${kmFormatado} km de distância`,
    subtexto: 'O amor de vocês encurta qualquer distância no mapa 💜',
    ehJuntinho: false,
    valorFormatado: `${kmFormatado} km`,
  };
}

// Formatação amigável de tempo decorrido ("há 3 min", "há 1h")
export function formatarTempoAtras(isoString) {
  if (!isoString) return 'Não informado';
  try {
    const data = new Date(isoString);
    const agora = new Date();
    const diffSeg = Math.max(0, Math.floor((agora - data) / 1000));

    if (diffSeg < 60) return 'Agora mesmo';
    const diffMin = Math.floor(diffSeg / 60);
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Há ${diffHoras}h`;
    const diffDias = Math.floor(diffHoras / 24);
    return `Há ${diffDias}d`;
  } catch {
    return 'Recentemente';
  }
}

// Obtém informações da bateria do celular (se o navegador suportar)
export async function obterBateriaDispositivo() {
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const b = await navigator.getBattery();
      return {
        nivel: Math.round(b.level * 100),
        carregando: Boolean(b.charging),
      };
    } catch {
      return null;
    }
  }
  return null;
}

// Obtém coordenadas de GPS com timeout e precisão
export function obterLocalizacaoAtual() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocalização não é suportada neste navegador ou aparelho.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = 'Não foi possível obter sua localização.';
        if (err.code === 1) msg = 'Permissão de GPS negada. Ative a localização no navegador.';
        if (err.code === 2) msg = 'Sinal de GPS indisponível no momento.';
        if (err.code === 3) msg = 'Tempo esgotado ao buscar sinal de GPS.';
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
}
