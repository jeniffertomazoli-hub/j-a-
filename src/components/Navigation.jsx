import React, { useRef, useEffect } from 'react';

export const TABS = [
  { id: 'termometro', label: 'Termômetro', emoji: '🌡️' },
  { id: 'topicos', label: 'Tópicos', emoji: '📋' },
  { id: 'cartas', label: 'Cartas', emoji: '💌' },
  { id: 'filmes', label: 'Filmes', emoji: '🎬' },
  { id: 'quiz', label: 'Quiz', emoji: '💞' },
  { id: 'memorias', label: 'Memórias', emoji: '📸' },
  { id: 'historico', label: 'Painel', emoji: '📊' },
];

export default function Navigation({ tabAtiva, onMudarTab }) {
  const containerRef = useRef(null);
  const tabRefs = useRef({});

  useEffect(() => {
    const el = tabRefs.current[tabAtiva];
    if (el && containerRef.current) {
      el.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [tabAtiva]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="max-w-3xl mx-auto flex gap-2 overflow-x-auto scrollbar-none px-3 sm:px-5 pb-2.5 pt-0.5"
      >
        {TABS.map((tab) => {
          const isActive = tabAtiva === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[tab.id] = el)}
              onClick={() => onMudarTab(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold border-3 border-ink transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-yellow text-ink shadow-brutsm scale-102'
                  : 'bg-white text-ink hover:bg-yellow/30'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              {/* Badge especial na aba de Cartas */}
              {tab.id === 'cartas' && isActive === false && (
                <span className="w-1.5 h-1.5 rounded-full bg-pink inline-block" />
              )}
            </button>
          );
        })}
      </div>

      {/* Edge fades para indicar scroll horizontal */}
      <div className="pointer-events-none absolute top-0.5 bottom-2.5 left-0 w-5 bg-gradient-to-r from-royal to-transparent" />
      <div className="pointer-events-none absolute top-0.5 bottom-2.5 right-0 w-5 bg-gradient-to-l from-royal to-transparent" />
    </div>
  );
}
