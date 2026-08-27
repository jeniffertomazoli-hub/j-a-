import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { sendAppNotification } from '../lib/notifications';
import { useToast } from '../context/ToastContext';

export function useNotificationWatcher(quemSouEu, settings) {
  const toast = useToast();
  const outroNome = quemSouEu === 'parceiro1' ? settings?.apelido2 || 'Alvaro' : settings?.apelido1 || 'Jeniffer';
  const outroEmoji = quemSouEu === 'parceiro1' ? settings?.emoji2 || '🦊' : settings?.emoji1 || '🐰';

  useEffect(() => {
    if (!quemSouEu) return;

    // Escuta Feed Posts
    const feedChannel = supabase
      .channel(`watcher:feed_posts:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_posts' },
        (payload) => {
          const post = payload.new;
          if (post && post.parceiro !== quemSouEu) {
            const titulo = `📸 ${outroEmoji} ${outroNome} postou no Feed!`;
            const msg = post.texto ? `"${post.texto.slice(0, 70)}..."` : 'Confira a nova foto no Feed do casal!';
            sendAppNotification(titulo, { body: msg, tag: 'feed-post' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    // Escuta Cartas Secretas
    const cartasChannel = supabase
      .channel(`watcher:cartas:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cartas_abra_quando' },
        (payload) => {
          const carta = payload.new;
          if (carta && carta.escrita_por !== quemSouEu) {
            const titulo = `💌 ${outroEmoji} ${outroNome} te escreveu uma carta!`;
            const msg = `"${carta.titulo}" — Abra quando você quiser!`;
            sendAppNotification(titulo, { body: msg, tag: 'carta-secreta' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    // Escuta Recados no Chat
    const chatChannel = supabase
      .channel(`watcher:chat:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_conversa' },
        (payload) => {
          const msgItem = payload.new;
          if (msgItem && msgItem.parceiro !== quemSouEu) {
            const titulo = `💬 ${outroEmoji} Recado de ${outroNome}`;
            const msg = msgItem.texto && msgItem.texto !== '📸' ? msgItem.texto : 'Enviou uma nova foto!';
            sendAppNotification(titulo, { body: msg, tag: 'chat-message' });
          }
        }
      )
      .subscribe();

    // Escuta Registro de Humor (Termômetro)
    const humorChannel = supabase
      .channel(`watcher:humor:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'respostas_diarias' },
        (payload) => {
          const item = payload.new;
          if (item && item.parceiro !== quemSouEu) {
            const nivel = item.respostas?.nivel ?? '';
            const titulo = `🌡️ ${outroEmoji} ${outroNome} atualizou o humor!`;
            const msg = `Nível de felicidade: ${nivel}/100. Veja o que fez seu amor se sentir assim 💜`;
            sendAppNotification(titulo, { body: msg, tag: 'termometro-humor' });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feedChannel);
      supabase.removeChannel(cartasChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(humorChannel);
    };
  }, [quemSouEu, outroNome, outroEmoji, toast]);
}
