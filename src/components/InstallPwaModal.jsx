import React, { useState, useEffect } from 'react';
import Modal from './Modal';

export default function InstallPwaModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando como PWA instalado
    const inStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(inStandalone);

    // Detecta se é dispositivo iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Captura evento de instalação nativo (Android Chrome / Edge / etc.)
    function handleBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  async function handleInstalarAndroid() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
      onClose();
    }
  }

  if (isStandalone) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="App Já Instalado! ✨"
        badgeText="Instalação"
        badgeColor="bg-cyan"
      >
        <div className="text-center py-2 space-y-3">
          <p className="text-4xl">🎉</p>
          <p className="text-sm font-bold text-ink">
            O <strong>Sintonia</strong> já está instalado como aplicativo no seu aparelho!
          </p>
          <button
            onClick={onClose}
            className="btn-brut w-full py-2.5 bg-yellow text-ink text-xs font-black shadow-brut"
          >
            Entendido 💜
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Instalar App no Celular 📲"
      badgeText="PWA"
      badgeColor="bg-pink"
    >
      <div className="space-y-4 py-1">
        {/* Card do Ícone e Título */}
        <div className="flex items-center gap-3 bg-yellow/20 p-3 rounded-2xl border-2 border-ink shadow-brutsm">
          <img
            src="/icon-192.png"
            alt="Ícone Sintonia"
            className="w-14 h-14 rounded-2xl border-2 border-ink shadow-brutsm object-cover shrink-0"
          />
          <div className="min-w-0">
            <h4 className="font-display font-extrabold text-sm text-ink truncate">
              Sintonia 💜
            </h4>
            <p className="text-[11px] text-ink/70 font-semibold leading-tight mt-0.5">
              Abre em tela cheia como um aplicativo de verdade, sem barras de navegador!
            </p>
          </div>
        </div>

        {/* Botão de instalação nativa no Android */}
        {deferredPrompt && (
          <button
            onClick={handleInstalarAndroid}
            className="btn-brut w-full py-3 bg-yellow text-ink text-sm font-black shadow-brut flex items-center justify-center gap-2 hover:scale-102 transition"
          >
            <span>📲</span>
            <span>Instalar Aplicativo Agora</span>
          </button>
        )}

        {/* Instruções para iPhone / iOS */}
        {isIos ? (
          <div className="bg-white rounded-2xl border-2 border-ink p-3.5 space-y-2.5 shadow-brutsm">
            <p className="text-xs font-black text-ink flex items-center gap-1.5">
              <span>🍎</span> No iPhone (Safari):
            </p>
            <ol className="text-xs font-semibold text-ink/80 space-y-2 pl-4 list-decimal">
              <li>
                Toque no botão <strong>Compartilhar</strong> <span className="inline-block px-1.5 py-0.5 bg-ink/10 rounded font-black text-ink">📤</span> na barra inferior do Safari.
              </li>
              <li>
                Role as opções e toque em <strong>"Adicionar à Tela de Início"</strong> <span className="inline-block px-1.5 py-0.5 bg-ink/10 rounded font-black text-ink">➕</span>.
              </li>
              <li>
                Toque em <strong>"Adicionar"</strong> no canto superior direito.
              </li>
            </ol>
            <p className="text-[10px] text-pink font-black text-center pt-1">
              O ícone do Sintonia vai aparecer direto na sua tela inicial! 📱✨
            </p>
          </div>
        ) : !deferredPrompt ? (
          /* Instruções para Android Chrome / Outros navegadores */
          <div className="bg-white rounded-2xl border-2 border-ink p-3.5 space-y-2.5 shadow-brutsm">
            <p className="text-xs font-black text-ink flex items-center gap-1.5">
              <span>🤖</span> No Android (Chrome):
            </p>
            <ol className="text-xs font-semibold text-ink/80 space-y-2 pl-4 list-decimal">
              <li>
                Toque no menu de <strong>3 pontinhos (⋮)</strong> no canto superior do navegador.
              </li>
              <li>
                Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong> 📲.
              </li>
              <li>
                Confirme e o ícone será criado no seu celular!
              </li>
            </ol>
          </div>
        ) : null}

        <button
          onClick={onClose}
          className="btn-brut w-full py-2.5 bg-white text-ink text-xs font-black"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
}
