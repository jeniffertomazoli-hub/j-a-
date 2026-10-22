// 🛰️ UTILITÁRIOS DE GEOLOCALIZAÇÃO (RADAR DO CASAL)

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

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (Number.isNaN(nLat1) || Number.isNaN(nLon1) || Number.isNaN(nLat2) || Number.isNaN(nLon2)) {
    return null;
  }

  const R = 6371; // Raio médio da Terra em km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
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

// Obtém o nome da cidade / bairro a partir das coordenadas
export async function obterNomeLocalizacao(lat, lon) {
  if (!lat || !lon) return null;

  // 1. Tenta API BigDataCloud (rápida, gratuita, sem chave de API e com suporte a CORS)
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const localidade = data.locality || data.city;
      const estado = data.principalSubdivision;
      const partes = [localidade, estado].filter(Boolean);
      if (partes.length > 0) return partes.join(' - ');
    }
  } catch {}

  // 2. Tenta OpenStreetMap Nominatim como fallback
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SintoniaApp' } });
    if (res.ok) {
      const data = await res.json();
      const bairro = data.address?.suburb || data.address?.neighbourhood;
      const cidade = data.address?.city || data.address?.town || data.address?.municipality;
      const partes = [bairro, cidade].filter(Boolean);
      if (partes.length > 0) return partes.join(', ');
      if (data.display_name) return data.display_name.split(',').slice(0, 3).join(',');
    }
  } catch {}

  return `Lat: ${Number(lat).toFixed(4)}, Lon: ${Number(lon).toFixed(4)}`;
}

// Obtém coordenadas de GPS com fallback multinível (GPS Alta Precisão -> Rede/Wi-Fi -> IP)
export async function obterLocalizacaoAtual() {
  // 1. Tenta obter pelo GPS de alta precisão do navegador
  try {
    const coords = await obterGpsNavegador({ enableHighAccuracy: true, timeout: 6000, maximumAge: 0 });
    return coords;
  } catch (errHigh) {
    console.warn('GPS alta precisão indisponível, tentando baixa precisão (Wi-Fi/Rede):', errHigh);
  }

  // 2. Tenta obter por baixa precisão (Wi-Fi / Torres celulares)
  try {
    const coords = await obterGpsNavegador({ enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 });
    return coords;
  } catch (errLow) {
    console.warn('GPS baixa precisão falhou, recorrendo a geolocalização por IP:', errLow);
  }

  // 3. Fallback infalível por IP da conexão
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          precisao: 1000,
          origem: 'ip',
        };
      }
    }
  } catch (errIp) {
    console.warn('Fallback por IP falhou:', errIp);
  }

  throw new Error('Não foi possível obter sua localização. Permita o acesso ao GPS no navegador.');
}

function obterGpsNavegador(options) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Navegador sem suporte a GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao: pos.coords.accuracy,
          origem: 'gps',
        });
      },
      (err) => {
        reject(err);
      },
      options
    );
  });
}
