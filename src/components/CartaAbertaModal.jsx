import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';

function formatDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function CartaAbertaModal({ carta, settings, nomeQuemAbriu, onClose }) {
  useEffect(() => {
    if (!carta) return;

    // Confetes românticos ao abrir a carta
    const timeout = setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#FFD93D', '#FF4D97', '#8B7FFF', '#33DDF3'],
        shapes: ['circle', 'square'],
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [carta]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!carta) return null;

  const ehP1 = carta.escrita_por === 'parceiro1';
  const nomeEscritor = ehP1 ? settings?.apelido1 || 'Jeniffer' : settings?.apelido2 || 'Alvaro';
  const emojiEscritor = ehP1 ? settings?.emoji1 || '🐰' : settings?.emoji2 || '🦊';
  const fotoEscritor = ehP1 ? settings?.foto1 : settings?.foto2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col animate-popIn">
        {/* Envelope topo decorativo */}
        <div className="text-center mb-2 shrink-0">
          <span className="text-4xl sm:text-5xl animate-bounceShort inline-block select-none">💌</span>
          <p className="text-[11px] font-black text-yellow uppercase tracking-widest mt-0.5">
            Carta Aberta com Amor
          </p>
        </div>

        {/* Card Principal da Carta com Scroll Suave */}
        <div className="card-brut bg-white shadow-brutlg flex flex-col overflow-hidden max-h-[78vh] relative">
          {/* Faixa decorativa superior */}
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow via-pink to-purple shrink-0" />

          {/* Cabeçalho da Carta (Fixo no topo da carta) */}
          <div className="p-4 sm:p-5 pb-3 border-b-2 border-ink/10 shrink-0 bg-white">
            <span className="badge-brut bg-pink text-ink text-[10px] sm:text-xs mb-2 inline-block">
              "{carta.titulo}"
            </span>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Avatar
                  foto={fotoEscritor}
                  emoji={emojiEscritor}
                  nome={nomeEscritor}
                  size="sm"
                  corFundo={ehP1 ? 'bg-yellow' : 'bg-pink'}
                />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-ink leading-tight">
                    De: {nomeEscritor}
                  </p>
                  <p className="text-[10px] text-ink/50 font-bold">
                    Escrita em {formatDataHora(carta.criado_em)}
                  </p>
                </div>
              </div>

              {carta.aberta_em && (
                <span className="badge-brut bg-cyan text-ink text-[9px] sm:text-[10px] py-0.5 px-2">
                  Aberta por {nomeQuemAbriu} 💜
                </span>
              )}
            </div>
          </div>

          {/* Corpo da Mensagem (Rolagem Livre para Textos Longos em Desk e Mobile) */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 overscroll-contain">
            {/* Foto anexada à carta (se houver) */}
            {carta.foto_url && (
              <div className="rounded-2xl border-3 border-ink overflow-hidden shadow-brutsm bg-ink/5">
                <img
                  src={carta.foto_url}
                  alt="Foto da carta"
                  className="w-full max-h-72 object-cover"
                />
              </div>
            )}

            {/* Papel de Carta com Texto Formatado */}
            <div className="bg-yellow/15 rounded-2xl p-4 sm:p-5 border-2 border-ink/20 shadow-inner">
              <p className="text-sm sm:text-base font-semibold text-ink leading-relaxed whitespace-pre-wrap break-words select-text font-sans">
                {carta.mensagem}
              </p>
            </div>
          </div>

          {/* Rodapé da Carta (Fixo no botão de fechar) */}
          <div className="p-3.5 sm:p-4 border-t-2 border-ink/10 bg-white shrink-0">
            <button
              onClick={onClose}
              className="btn-brut w-full py-3 bg-yellow text-ink text-xs sm:text-sm font-black shadow-brut hover:scale-101 active:scale-98 transition"
            >
              Guardar carta no coração ✨💜
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
