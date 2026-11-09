import { useEffect, useRef } from 'react';
import {
  supabase,
  registrarOuvinteBroadcast,
  buscarNotificacoesCasalNuvem,
} from '../lib/supabase';
import { sendAppNotification } from '../lib/notifications';
import { useToast } from '../context/ToastContext';

export function useNotificationWatcher(quemSouEu, settings, onNovaNotificacao) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings?.apelido1 || 'Jeniffer' : settings?.apelido2 || 'Alvaro';
  const outroNome = ehP1 ? settings?.apelido2 || 'Alvaro' : settings?.apelido1 || 'Jeniffer';
  const outroEmoji = ehP1 ? settings?.emoji2 || '🦊' : settings?.emoji1 || '🐰';

  const processedNotifsRef = useRef(new Map());

  function dispararNotificacaoSegura(titulo, corpo, tag = 'alerta') {
    const agora = Date.now();
    const chave = `${tag}:${titulo}:${corpo}`;

    // Evita duplicar o mesmo alerta dentro de 5 segundos
    if (processedNotifsRef.current.has(chave)) {
      const last = processedNotifsRef.current.get(chave);
      if (agora - last < 5000) return;
    }
    processedNotifsRef.current.set(chave, agora);

    sendAppNotification(titulo, { body: corpo, tag });
    toast.love(titulo);

    if (onNovaNotificacao) {
      onNovaNotificacao({ titulo, corpo, tag, timestamp: agora });
    }
  }

  useEffect(() => {
    if (!quemSouEu) return;

    // 1. Busca alertas pendentes na nuvem (que aconteceram enquanto o app estava fechado)
    async function verificarAlertasPerdidos() {
      try {
        const nuvemNotifs = await buscarNotificacoesCasalNuvem(quemSouEu);
        if (nuvemNotifs && nuvemNotifs.length > 0) {
          const lastSeen = Number(localStorage.getItem('sintonia_last_seen_notif') || '0');
          const novos = nuvemNotifs.filter((n) => {
            const t = n.timestamp || new Date(n.criado_em).getTime();
            return t > lastSeen;
          });

          if (novos.length > 0) {
            // Dispara para o mais recente que não foi visto
            const maisRecente = novos[0];
            dispararNotificacaoSegura(
              maisRecente.titulo,
              maisRecente.corpo,
              maisRecente.tag || 'alerta-nuvem'
            );
            const maiorTimestamp = Math.max(
              ...novos.map((n) => n.timestamp || new Date(n.criado_em).getTime())
            );
            localStorage.setItem('sintonia_last_seen_notif', String(maiorTimestamp));
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar alertas perdidos:', err);
      }
    }

    verificarAlertasPerdidos();

    // 2. Reconecta e checa ao voltar para a aba ou ligar a tela
    const handleVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        verificarAlertasPerdidos();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilidade);
    window.addEventListener('focus', handleVisibilidade);

    // 3. Ouvinte WebSocket Broadcast (0ms quando ambos os celulares estão no app)
    const unsubBroadcast = registrarOuvinteBroadcast((data) => {
      if (data && data.remetente !== quemSouEu && data.remetente !== meuNome) {
        dispararNotificacaoSegura(data.titulo, data.corpo, data.tag || 'notificacao-casal');
        localStorage.setItem('sintonia_last_seen_notif', String(Date.now()));
      }
    });

    // 4. Canal unificado do Supabase para escutar inserções nas tabelas
    const centralChannel = supabase
      .channel(`watcher:central:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'respostas_diarias' },
        (payload) => {
          const item = payload.new;
          if (item && item.parceiro !== quemSouEu) {
            // Alerta Unificado em Nuvem (data = 2099-09-09)
            if (item.data === '2099-09-09' && item.respostas?.tipo === 'alerta_casal') {
              dispararNotificacaoSegura(
                item.respostas.titulo,
                item.respostas.corpo,
                item.respostas.tag || 'alerta-casal'
              );
              localStorage.setItem('sintonia_last_seen_notif', String(Date.now()));
              return;
            }

            // Teste acionado pelo parceiro (data = 2099-05-05)
            if (item.data === '2099-05-05') {
              const titulo = `🔔 ${outroEmoji} Notificação de Teste de ${outroNome}!`;
              const msg = item.respostas?.mensagem || `${outroNome} acabou de testar as notificações com você! 💜`;
              dispararNotificacaoSegura(titulo, msg, 'teste-casal');
              return;
            }

            // Coordenadas do Radar (data = 2099-01-01)
            if (item.data === '2099-01-01') {
              const titulo = `📍 ${outroEmoji} ${outroNome} atualizou a localização!`;
              const msg = item.respostas?.endereco
                ? `Localização: ${item.respostas.endereco}`
                : 'Abra a aba Distância para conferir a quantos km vocês estão! 💜';
              dispararNotificacaoSegura(titulo, msg, 'radar-localizacao');
              return;
            }

            // Registro de humor do Termômetro
            if (item.data && item.data.length === 10 && item.respostas?.nivel !== undefined) {
              const nivel = item.respostas?.nivel ?? '';
              const titulo = `🌡️ ${outroEmoji} ${outroNome} atualizou o humor!`;
              const msg = `Nível de felicidade: ${nivel}/100. Veja o que fez seu amor se sentir assim 💜`;
              dispararNotificacaoSegura(titulo, msg, 'termometro-humor');
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_posts' },
        (payload) => {
          const post = payload.new;
          if (post && post.parceiro !== quemSouEu) {
            const titulo = `📸 ${outroEmoji} ${outroNome} postou no Feed!`;
            const msg = post.texto ? `"${post.texto.slice(0, 70)}..."` : 'Confira a nova foto no Feed do casal! 💜';
            dispararNotificacaoSegura(titulo, msg, 'feed-post');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cartas_abra_quando' },
        (payload) => {
          const carta = payload.new;
          if (carta && carta.escrita_por !== quemSouEu) {
            const titulo = `💌 ${outroEmoji} ${outroNome} te escreveu uma carta!`;
            const msg = `"${carta.titulo}" — Abra quando você quiser! 💜`;
            dispararNotificacaoSegura(titulo, msg, 'carta-secreta');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_conversa' },
        (payload) => {
          const msgItem = payload.new;
          if (msgItem && msgItem.parceiro !== quemSouEu) {
            const titulo = `💬 ${outroEmoji} Recado de ${outroNome}`;
            const msg = msgItem.texto && msgItem.texto !== '📸' ? msgItem.texto : 'Enviou uma nova foto no chat! 📷';
            dispararNotificacaoSegura(titulo, msg, 'chat-message');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'memorias' },
        (payload) => {
          const mem = payload.new;
          if (mem && mem.titulo !== '__CONFIG_PERFIL__' && mem.criado_por !== meuNome) {
            const titulo = `📖 ${outroEmoji} ${outroNome} colou uma foto na Galeria!`;
            const msg = mem.titulo ? `"${mem.titulo}" foi adicionada à galeria! 💜` : 'Uma nova foto foi colada no álbum!';
            dispararNotificacaoSegura(titulo, msg, 'novo-album');
          }
        }
      )
      .subscribe();

    return () => {
      unsubBroadcast();
      document.removeEventListener('visibilitychange', handleVisibilidade);
      window.removeEventListener('focus', handleVisibilidade);
      supabase.removeChannel(centralChannel);
    };
  }, [quemSouEu, meuNome, outroNome, outroEmoji]);
}
