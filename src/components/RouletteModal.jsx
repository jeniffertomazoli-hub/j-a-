import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import Modal from './Modal';

export default function RouletteModal({
  isOpen,
  onClose,
  items = [],
  title = 'Sorteador da Decisão 🎲',
  emptyMessage = 'Nenhum item disponível para sortear.',
  itemLabelProp = 'titulo',
}) {
  const [spinning, setSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [displayItem, setDisplayItem] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedItem(null);
      setDisplayItem(null);
      setSpinning(false);
    }
  }, [isOpen]);

  function startSpin() {
    if (!items || items.length === 0 || spinning) return;

    setSpinning(true);
    setSelectedItem(null);

    let counter = 0;
    const totalSteps = 25 + Math.floor(Math.random() * 10);
    const speed = 70;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * items.length);
      setDisplayItem(items[randomIndex]);
      counter++;

      if (counter >= totalSteps) {
        clearInterval(interval);
        const finalWinner = items[Math.floor(Math.random() * items.length)];
        setDisplayItem(finalWinner);
        setSelectedItem(finalWinner);
        setSpinning(false);

        // Confetti celebration
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD93D', '#FF4D97', '#33DDF3', '#8B7FFF'],
        });
      }
    }, speed);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      badgeText="Roleta"
      badgeColor="bg-yellow"
      cancelText="Fechar"
    >
      {items.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm font-bold text-ink/70">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <p className="text-xs text-ink/70 font-bold mb-4">
            Indecisos sobre o que escolher hoje? Deixe a sorte decidir! ✨
          </p>

          {/* Display Card */}
          <div className="w-full min-h-[90px] rounded-2xl border-3 border-ink bg-purple/10 p-4 flex flex-col items-center justify-center mb-4 transition-all">
            {displayItem ? (
              <div className="animate-popIn">
                <span className="text-xs font-black uppercase text-pink block mb-1">
                  {selectedItem ? '🎉 Escolhido pelo destino!' : 'Girando...'}
                </span>
                <p className="font-display text-xl font-bold text-ink">
                  {typeof displayItem === 'string'
                    ? displayItem
                    : displayItem[itemLabelProp] || displayItem.titulo || displayItem.texto}
                </p>
                {displayItem.tipo && (
                  <span className="badge-brut bg-cyan text-ink text-[9px] mt-2">
                    {displayItem.tipo}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs font-extrabold text-ink/50">
                Toque no botão abaixo para girar a roleta!
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={startSpin}
            disabled={spinning}
            className="btn-brut w-full py-3 bg-yellow text-ink text-sm disabled:opacity-50 hover:bg-yellow shadow-brut"
          >
            {spinning ? '🎲 Sorteando...' : selectedItem ? '🔄 Sortear Outro' : '🎲 Girar Roleta!'}
          </button>
        </div>
      )}
    </Modal>
  );
}
