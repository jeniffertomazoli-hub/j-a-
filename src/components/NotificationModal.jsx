import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import {
  isIosDevice,
  isStandaloneApp,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendAppNotification,
} from '../lib/notifications';
import { enviarNotificacaoTeste } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function NotificationModal({
  isOpen,
  onClose,
  quemSouEu,
  settings,
  onOpenInstallPwa,
}) {
  const toast = useToast();
  const [permission, setPermission] = useState(getNotificationPermission());
  const [enviandoTesteAmor, setEnviandoTesteAmor] = useState(false);
  const [testandoLocal, setTestandoLocal] = useState(false);

  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings?.apelido1 || 'Jeniffer' : settings?.apelido2 || 'Alvaro';
  const meuEmoji = ehP1 ? settings?.emoji1 || '🐰' : settings?.emoji2 || '🦊';
  const outroNome = ehP1 ? settings?.apelido2 || 'Alvaro' : settings?.apelido1 || 'Jeniffer';
  const outroEmoji = ehP1 ? settings?.emoji2 || '🦊' : settings?.emoji1 || '🐰';

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  async function handlePedirPermissao() {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      await sendAppNotification('💜 Notificações Ativadas!', {
        body: `Prontinho, ${meuNome}! Agora você receberá avisos quando ${outroNome} fizer qualquer ação.`,
      });
      toast.love('Notificações ativadas com sucesso! 💜');
    } else if (res === 'denied') {
      toast.error('Notificações bloqueadas! Libere no cadeado 🔒 da barra de endereço.');
    } else if (res === 'ios-requires-install') {
      if (onOpenInstallPwa) {
        onClose();
        onOpenInstallPwa();
      }
    }
  }

  async function handleTestarNoMeuAparelho() {
    setTestandoLocal(true);
    try {
      if (permission !== 'granted') {
        const res = await requestNotificationPermission();
        setPermission(res);
        if (res !== 'granted') {
          toast.error('Ative as notificações primeiro tocando no botão acima.');
          return;
        }
      }

      const sucesso = await sendAppNotification('🔔 Teste do Sintonia 💜', {
        body: `${meuNome}, seu aparelho está recebendo notificações perfeitamente!`,
        tag: 'teste-local',
      });

      if (sucesso) {
        toast.love('Notificação enviada no seu aparelho! Ouviu o sininho? 🔔');
      } else {
        toast.love('Alerta disparado na tela! 🔔');
      }
    } finally {
      setTestandoLocal(false);
    }
  }

  async function handleEnviarTesteParaAmor() {
    setEnviandoTesteAmor(true);
    try {
      await enviarNotificacaoTeste(quemSouEu, meuNome, meuEmoji, outroNome);
      toast.love(`Notificação de teste enviada para ${outroNome}! 💌 O celular dele(a) vai apitar agora!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar sinal para o parceiro.');
    } finally {
      setEnviandoTesteAmor(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notificações do Casal 🔔"
      badgeText="Central de Alertas"
      badgeColor="bg-yellow"
    >
      <div className="space-y-4 py-1 text-ink">
        {/* Card de Status da Permissão */}
        {permission === 'granted' ? (
          <div className="p-3 bg-green-50 rounded-2xl border-2 border-ink shadow-brutsm space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-xs font-black text-ink">
                  Permissão Concedida no Navegador
                </p>
                <p className="text-[11px] text-ink/75 font-semibold leading-tight">
                  Seu navegador está autorizado a receber avisos de {outroNome}!
                </p>
              </div>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-ink/20 text-[10px] text-ink/80 space-y-1">
              <p className="font-bold">⚠️ Dica importante para Celulares (Android & iOS):</p>
              <p>• <strong>Android:</strong> Se o banner não subir, veja em <em>Configurações do Celular ➔ Aplicativos ➔ Chrome/Samsung Internet ➔ Notificações ➔ Permitir</em>.</p>
              <p>• <strong>iPhone:</strong> O app precisa estar na <em>Tela de Início</em> para receber notificações pelo sistema da Apple.</p>
            </div>
          </div>
        ) : permission === 'denied' ? (
          <div className="p-3 bg-red-50 rounded-2xl border-2 border-ink shadow-brutsm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <p className="text-xs font-black text-ink">Notificações Bloqueadas no Celular</p>
            </div>
            <p className="text-[11px] text-ink/80 font-medium leading-relaxed">
              O navegador bloqueou as notificações. Como o navegador não pergunta de novo automaticamente, siga este passo a passo para destravar:
            </p>
            <div className="bg-white p-2.5 rounded-xl border-2 border-ink/30 text-[10px] font-bold text-ink/90 space-y-1">
              <p>1. Toque no ícone de cadeado 🔒 ou de configurações na barra de endereço (ao lado do link do site).</p>
              <p>2. Toque em <strong>Permissões</strong> ou <strong>Configurações do Site</strong>.</p>
              <p>3. Altere <strong>Notificações</strong> para <strong>Permitir</strong>.</p>
              <p>4. Recarregue a página!</p>
            </div>
          </div>
        ) : permission === 'ios-requires-install' ? (
          <div className="p-3 bg-yellow/30 rounded-2xl border-2 border-ink shadow-brutsm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍎</span>
              <p className="text-xs font-black text-ink">Exigência Obrigatória do iPhone (iOS)</p>
            </div>
            <p className="text-[11px] text-ink/80 font-medium leading-tight">
              A Apple não autoriza notificações em abas comuns do Safari. É obrigatório instalar como app:
            </p>
            <div className="bg-white/80 p-2 rounded-xl border border-ink/30 text-[10px] font-bold text-ink/90 space-y-0.5">
              <p>1. Toque no botão de <strong>Compartilhar</strong> (quadrado com seta ⬆️).</p>
              <p>2. Escolha <strong>Adicionar à Tela de Início</strong>.</p>
              <p>3. Abra pelo ícone na tela inicial e autorize as notificações!</p>
            </div>
            <button
              onClick={() => {
                onClose();
                if (onOpenInstallPwa) onOpenInstallPwa();
              }}
              className="btn-brut w-full py-2 bg-yellow text-ink text-xs font-black shadow-brut flex items-center justify-center gap-1.5"
            >
              <span>📲</span>
              <span>Ver Passo a Passo com Fotos</span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-pink/20 rounded-2xl border-2 border-ink shadow-brutsm space-y-2 text-center">
            <p className="text-xs font-black text-ink">
              Receba avisos quando {outroNome} postar ou registrar algo! 💜
            </p>
            <button
              onClick={handlePedirPermissao}
              className="btn-brut w-full py-2.5 bg-yellow text-ink text-xs font-black shadow-brut flex items-center justify-center gap-2"
            >
              <span>🔔</span>
              <span>Autorizar Notificações Agora</span>
            </button>
          </div>
        )}

        {/* Área de Testes */}
        <div className="bg-white rounded-2xl border-2 border-ink p-3 space-y-2 shadow-brutsm">
          <p className="text-[11px] font-black text-ink uppercase tracking-wider flex items-center gap-1">
            <span>🧪</span> Testar Notificações em Tempo Real:
          </p>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {/* Botão Testar no Meu Aparelho */}
            <button
              onClick={handleTestarNoMeuAparelho}
              disabled={testandoLocal}
              className="btn-brut w-full py-2.5 bg-cyan text-ink text-xs font-black shadow-brutsm flex items-center justify-center gap-2 hover:bg-cyan/90 transition active:scale-98"
            >
              <span>📱</span>
              <span>Testar no Meu Celular</span>
            </button>

            {/* Botão Testar no Celular do Parceiro */}
            <button
              onClick={handleEnviarTesteParaAmor}
              disabled={enviandoTesteAmor}
              className="btn-brut w-full py-2.5 bg-yellow text-ink text-xs font-black shadow-brutsm flex items-center justify-center gap-2 hover:bg-yellow/90 transition active:scale-98"
            >
              <span>💌</span>
              <span>Fazer o Celular do(a) {outroNome} Tocar Agora!</span>
            </button>
          </div>
          <p className="text-[10px] text-ink/60 font-semibold text-center pt-0.5">
            Toca o sino musical e vibra o celular do seu parceiro na mesma hora! ✨
          </p>
        </div>

        {/* Resumo do que gera notificação */}
        <div className="bg-ink/5 rounded-2xl border-2 border-ink/20 p-3 space-y-1.5">
          <p className="text-[11px] font-black text-ink">
            O que avisa você e seu amor automaticamente?
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-ink/80 pt-1">
            <span className="flex items-center gap-1">📸 Foto no Feed</span>
            <span className="flex items-center gap-1">🌡️ Humor no Termômetro</span>
            <span className="flex items-center gap-1">📍 Localização no Radar</span>
            <span className="flex items-center gap-1">💌 Carta Secreta</span>
            <span className="flex items-center gap-1">🎞️ Foto no Álbum</span>
            <span className="flex items-center gap-1">🍿 Filme ou Série</span>
          </div>
        </div>

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
