import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function CartaAbertaModal({ carta, nomeQuemAbriu, onClose }) {
  useEffect(() => {
    if (!carta) return;

    // Confetes românticos ao abrir a carta
    const timeout = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#FFD93D', '#FF4D97', '#8B7FFF', '#33DDF3'],
        shapes: ['circle', 'square'],
      });
    }, 300);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm animate-popIn">
        {/* Envelope topo */}
        <div className="text-center mb-3">
          <span className="text-5xl animate-bounceShort inline-block">💌</span>
          <p className="text-xs font-black text-yellow mt-1 uppercase tracking-widest">
            Carta Aberta!
          </p>
        </div>

        {/* Card da Carta */}
        <div className="card-brut bg-white p-5 shadow-brutlg relative overflow-hidden">
          {/* Decoração de papel de carta */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow via-pink to-purple" />

          <div className="pt-1">
            {/* Título da Carta */}
            <div className="mb-3">
              <p className="badge-brut bg-pink text-ink text-[10px] mb-2">
                "{carta.titulo}"
              </p>
              <p className="text-[10px] text-ink/50 font-bold">
                Escrita com amor por{' '}
                <span className="text-ink/80 font-black">{carta.escrita_por === 'parceiro1' ? 'Jeniffer 🐰' : 'Alvaro 🦊'}</span>
              </p>
            </div>

            {/* Foto (se existir) */}
            {carta.foto_url && (
              <img
                src={carta.foto_url}
                alt="Foto da carta"
                className="w-full max-h-52 object-cover rounded-xl border-3 border-ink mb-3 shadow-brutsm"
              />
            )}

            {/* Mensagem */}
            <div className="bg-yellow/20 rounded-xl p-3.5 border-2 border-ink/20 mb-4">
              <p className="text-sm font-semibold text-ink leading-relaxed whitespace-pre-wrap">
                {carta.mensagem}
              </p>
            </div>

            {/* Data e quem abriu */}
            <p className="text-[10px] text-ink/40 font-bold text-center mb-4">
              Aberta por {nomeQuemAbriu} com muito carinho 💜
            </p>

            <button
              onClick={onClose}
              className="btn-brut w-full py-3 bg-yellow text-ink text-xs font-black shadow-brut"
            >
              Guardar carta com carinho ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
