import React from 'react';

// Extrai ID ou URL de embed do YouTube
export function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }
  return null;
}

// Extrai URL de embed do Spotify
export function getSpotifyEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist|episode)\/([a-zA-Z0-9]+)/);
  if (match && match[1] && match[2]) {
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  }
  return null;
}

export function detectMediaType(url) {
  if (!url) return null;
  if (getYouTubeEmbedUrl(url)) return 'youtube';
  if (getSpotifyEmbedUrl(url)) return 'spotify';
  if (url.startsWith('http://') || url.startsWith('https://')) return 'link';
  return null;
}

export default function MediaEmbed({ url, compact = false }) {
  if (!url) return null;

  const ytEmbed = getYouTubeEmbedUrl(url);
  const spotifyEmbed = getSpotifyEmbedUrl(url);

  if (spotifyEmbed) {
    return (
      <div className="rounded-2xl border-2 border-ink overflow-hidden shadow-brutsm bg-[#121212] my-2">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#181818] border-b-2 border-ink text-white text-[10px] font-black">
          <span className="flex items-center gap-1.5 text-[#1DB954]">
            <span>🟢</span> Spotify do Momento
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-white/70 hover:text-white underline"
          >
            Abrir no app ↗
          </a>
        </div>
        <iframe
          src={spotifyEmbed}
          width="100%"
          height={compact ? "80" : "152"}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full block"
        />
      </div>
    );
  }

  if (ytEmbed) {
    return (
      <div className="rounded-2xl border-2 border-ink overflow-hidden shadow-brutsm bg-black my-2">
        <div className="flex items-center justify-between px-3 py-1.5 bg-ink text-white text-[10px] font-black">
          <span className="flex items-center gap-1.5 text-[#FF0000]">
            <span>▶️</span> YouTube do Momento
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-white/70 hover:text-white underline"
          >
            Abrir no YouTube ↗
          </a>
        </div>
        <div className="relative aspect-video w-full">
          <iframe
            src={ytEmbed}
            title="Vídeo ou Música no YouTube"
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="w-full h-full"
          />
        </div>
      </div>
    );
  }

  // Link comum (caso coloquem outro link web)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 border-ink bg-white text-ink text-xs font-bold hover:bg-yellow shadow-brutsm transition my-1 truncate max-w-full"
    >
      <span>🔗</span>
      <span className="truncate">{url}</span>
    </a>
  );
}
