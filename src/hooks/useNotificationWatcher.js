import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { sendAppNotification } from '../lib/notifications';
import { useToast } from '../context/ToastContext';

export function useNotificationWatcher(quemSouEu, settings) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings?.apelido1 || 'Jeniffer' : settings?.apelido2 || 'Alvaro';
  const outroNome = ehP1 ? settings?.apelido2 || 'Alvaro' : settings?.apelido1 || 'Jeniffer';
  const outroEmoji = ehP1 ? settings?.emoji2 || '🦊' : settings?.emoji1 || '🐰';

  useEffect(() => {
    if (!quemSouEu) return;

    // 1. Canal Broadcast em tempo real para disparos instantâneos (teste / toques)
    const broadcastChannel = supabase
      .channel('canal_sintonia_notificacoes')
      .on('broadcast', { event: 'notificacao_casal' }, (event) => {
        const data = event.payload;
        if (data && data.remetente !== quemSouEu) {
          sendAppNotification(data.titulo, { body: data.corpo, tag: data.tag || 'notificacao-casal' });
          toast.love(data.titulo);
        }
      })
      .subscribe();

    // 2. Escuta Feed Posts
    const feedChannel = supabase
      .channel(`watcher:feed_posts:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_posts' },
        (payload) => {
          const post = payload.new;
          if (post && post.parceiro !== quemSouEu) {
            const titulo = `📸 ${outroEmoji} ${outroNome} postou no Feed!`;
            const msg = post.texto ? `"${post.texto.slice(0, 70)}..."` : 'Confira a nova foto no Feed do casal! 💜';
            sendAppNotification(titulo, { body: msg, tag: 'feed-post' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    // 3. Escuta Cartas Secretas
    const cartasChannel = supabase
      .channel(`watcher:cartas:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cartas_abra_quando' },
        (payload) => {
          const carta = payload.new;
          if (carta && carta.escrita_por !== quemSouEu) {
            const titulo = `💌 ${outroEmoji} ${outroNome} te escreveu uma carta!`;
            const msg = `"${carta.titulo}" — Abra quando você quiser! 💜`;
            sendAppNotification(titulo, { body: msg, tag: 'carta-secreta' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    // 4. Escuta Recados no Chat
    const chatChannel = supabase
      .channel(`watcher:chat:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_conversa' },
        (payload) => {
          const msgItem = payload.new;
          if (msgItem && msgItem.parceiro !== quemSouEu) {
            const titulo = `💬 ${outroEmoji} Recado de ${outroNome}`;
            const msg = msgItem.texto && msgItem.texto !== '📸' ? msgItem.texto : 'Enviou uma nova foto no chat! 📷';
            sendAppNotification(titulo, { body: msg, tag: 'chat-message' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    // 5. Escuta Registro de Humor (Termômetro), Radar de Distância e Teste
    const humorChannel = supabase
      .channel(`watcher:humor:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'respostas_diarias' },
        (payload) => {
          const item = payload.new;
          if (item && item.parceiro !== quemSouEu) {
            // Teste de notificação acionado pelo parceiro
            if (item.data === '2099-05-05') {
              const titulo = `🔔 ${outroEmoji} Notificação de Teste de ${outroNome}!`;
              const msg = item.respostas?.mensagem || `${outroNome} acabou de testar as notificações com você! 💜`;
              sendAppNotification(titulo, { body: msg, tag: 'teste-casal' });
              toast.love(titulo);
              return;
            }

            // Registro de coordenadas do Radar de Distância
            if (item.data === '2099-01-01') {
              const titulo = `📍 ${outroEmoji} ${outroNome} atualizou a localização!`;
              const msg = item.respostas?.endereco
                ? `Localização: ${item.respostas.endereco}`
                : 'Abra a aba Distância para conferir a quantos km vocês estão! 💜';
              sendAppNotification(titulo, { body: msg, tag: 'radar-localizacao' });
              toast.love(titulo);
              return;
            }

            // Registro de humor do Termômetro
            const nivel = item.respostas?.nivel ?? '';
            const titulo = `🌡️ ${outroEmoji} ${outroNome} atualizou o humor!`;
            const msg = `Nível de felicidade: ${nivel}/100. Veja o que fez seu amor se sentir assim 💜`;
            sendAppNotification(titulo, { body: msg, tag: 'termometro-humor' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    // 6. Escuta Memórias no Álbum
    const memoriasChannel = supabase
      .channel(`watcher:memorias:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'memorias' },
        (payload) => {
          const mem = payload.new;
          if (mem && mem.titulo !== '__CONFIG_PERFIL__' && mem.criado_por !== meuNome) {
            const titulo = `🎞️ ${outroEmoji} ${outroNome} adicionou uma nova memória!`;
            const msg = mem.titulo ? `"${mem.titulo}" foi guardado no álbum de vocês 💜` : 'Uma nova foto foi adicionada ao álbum!';
            sendAppNotification(titulo, { body: msg, tag: 'nova-memoria' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    // 7. Escuta Respostas ao Quiz
    const quizChannel = supabase
      .channel(`watcher:quiz:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quiz_respostas_v2' },
        (payload) => {
          const resp = payload.new;
          if (resp && resp.parceiro !== quemSouEu) {
            const titulo = `🎯 ${outroEmoji} ${outroNome} respondeu ao Quiz!`;
            const msg = 'Abra o Quiz para ver o que vocês responderam! 💜';
            sendAppNotification(titulo, { body: msg, tag: 'quiz-resposta' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    // 8. Escuta Novos Planos / Lista dos Sonhos
    const topicosChannel = supabase
      .channel(`watcher:topicos:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'topicos' },
        (payload) => {
          const topico = payload.new;
          if (topico && topico.adicionado_por !== meuNome && topico.parceiro !== quemSouEu) {
            const titulo = `✨ ${outroEmoji} ${outroNome} adicionou um sonho à Lista!`;
            const msg = topico.titulo ? `"${topico.titulo}"` : 'Um novo plano foi adicionado à lista do casal! 💜';
            sendAppNotification(titulo, { body: msg, tag: 'lista-sonhos' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    // 9. Escuta Filmes e Séries
    const filmesChannel = supabase
      .channel(`watcher:filmes:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'filmes_series' },
        (payload) => {
          const item = payload.new;
          if (item && item.sugerido_por !== meuNome) {
            const titulo = `🍿 ${outroEmoji} ${outroNome} adicionou um filme/série!`;
            const msg = item.titulo ? `"${item.titulo}" para assistirem juntos 🎬` : 'Novo filme recomendado na lista!';
            sendAppNotification(titulo, { body: msg, tag: 'filme-serie' });
            toast.love(titulo);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(feedChannel);
      supabase.removeChannel(cartasChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(humorChannel);
      supabase.removeChannel(memoriasChannel);
      supabase.removeChannel(quizChannel);
      supabase.removeChannel(topicosChannel);
      supabase.removeChannel(filmesChannel);
    };
  }, [quemSouEu, meuNome, outroNome, outroEmoji, toast]);
}
