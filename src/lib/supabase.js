import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://duvpdskqriegldzwheho.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dnBkc2txcmllZ2xkendoZWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzYwNzIsImV4cCI6MjEwMzA1MjA3Mn0.xafDOGYpHEzVpRGTmYymAoR5okm3EX_WkWJMZ_4UXpQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// -------------------------------------------------------------
// CENTRAL CONECTADA DE BROADCAST & ALERTAS EM TEMPO REAL
// -------------------------------------------------------------
let canalBroadcastConectado = null;
let statusInscricaoCanal = 'connecting';
const ouvintesBroadcast = new Set();

export function registrarOuvinteBroadcast(callback) {
  ouvintesBroadcast.add(callback);
  return () => {
    ouvintesBroadcast.delete(callback);
  };
}

export function obterCanalBroadcastCasal() {
  if (!canalBroadcastConectado) {
    canalBroadcastConectado = supabase.channel('canal_sintonia_notificacoes_v2', {
      config: { broadcast: { self: false } },
    });

    canalBroadcastConectado
      .on('broadcast', { event: 'notificacao_casal' }, (event) => {
        const payload = event.payload;
        ouvintesBroadcast.forEach((cb) => {
          try {
            cb(payload);
          } catch (e) {
            console.warn('Erro no ouvinte broadcast:', e);
          }
        });
      })
      .subscribe((status) => {
        statusInscricaoCanal = status;
        console.log('Realtime canal_sintonia_notificacoes status:', status);
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setTimeout(() => {
            if (statusInscricaoCanal !== 'SUBSCRIBED') {
              try {
                supabase.removeChannel(canalBroadcastConectado);
              } catch {}
              canalBroadcastConectado = null;
              obterCanalBroadcastCasal();
            }
          }, 1500);
        }
      });
  }
  return canalBroadcastConectado;
}

// Inicia inscrição do canal imediatamente ao carregar
obterCanalBroadcastCasal();

// Reconexão automática em celulares ao desbloquear tela ou voltar para o app
if (typeof window !== 'undefined') {
  const reconectarSeNecessario = () => {
    if (document.visibilityState === 'visible' || navigator.onLine) {
      if (statusInscricaoCanal !== 'SUBSCRIBED') {
        console.log('Reconectando Realtime canal_sintonia_notificacoes...');
        if (canalBroadcastConectado) {
          try {
            supabase.removeChannel(canalBroadcastConectado);
          } catch {}
          canalBroadcastConectado = null;
        }
        obterCanalBroadcastCasal();
      }
    }
  };

  document.addEventListener('visibilitychange', reconectarSeNecessario);
  window.addEventListener('focus', reconectarSeNecessario);
  window.addEventListener('online', reconectarSeNecessario);
}

export async function enviarBroadcastCasal(payload) {
  try {
    const ch = obterCanalBroadcastCasal();

    // Se ainda não estiver conectado, aguarda conexão (máximo 2s)
    if (statusInscricaoCanal !== 'SUBSCRIBED') {
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (statusInscricaoCanal === 'SUBSCRIBED') {
            clearInterval(check);
            resolve(true);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(check);
          resolve(false);
        }, 2000);
      });
    }

    const res = await ch.send({
      type: 'broadcast',
      event: 'notificacao_casal',
      payload,
    });
    return res;
  } catch (err) {
    console.warn('Falha no envio do broadcast:', err);
  }
}

// -------------------------------------------------------------
// HISTÓRICO PERSISTENTE DE NOTIFICAÇÕES (NUVEM ANTI-PERDA)
// -------------------------------------------------------------
export async function salvarNotificacaoCasalNuvem({ remetente, titulo, corpo, tag, payload }) {
  try {
    const p = remetente === 'parceiro2' || remetente === 'Alvaro' ? 'parceiro2' : 'parceiro1';
    await supabase.from('respostas_diarias').insert({
      data: '2099-09-09',
      parceiro: p,
      respostas: {
        tipo: 'alerta_casal',
        remetente,
        titulo,
        corpo,
        tag: tag || 'notificacao',
        payload: payload || null,
        timestamp: Date.now(),
        criado_em: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn('Erro ao persistir alerta em nuvem:', err);
  }
}

export async function buscarNotificacoesCasalNuvem(quemSouEu) {
  try {
    const { data, error } = await supabase
      .from('respostas_diarias')
      .select('*')
      .eq('data', '2099-09-09')
      .order('criado_em', { ascending: false })
      .limit(20);

    if (error) throw error;
    if (!data) return [];

    return data
      .map((item) => ({
        id: item.id,
        criado_em: item.criado_em,
        parceiro: item.parceiro,
        ...item.respostas,
      }))
      .filter((n) => n.remetente !== quemSouEu);
  } catch (err) {
    console.warn('Erro ao buscar notificacoes casal:', err);
    return [];
  }
}

/**
 * Disparo Unificado e 100% Confiável:
 * Envia instantaneamente por WebSocket e salva na nuvem para entrega garantida
 */
export async function enviarAlertaCasalTotal({ remetente, titulo, corpo, tag, payload }) {
  await enviarBroadcastCasal({ remetente, titulo, corpo, tag, payload });
  await salvarNotificacaoCasalNuvem({ remetente, titulo, corpo, tag, payload });
}

// -------------------------------------------------------------
// ⚙️ CONFIGURAÇÕES DO CASAL & FOTOS DE PERFIL (DUPLA PERSISTÊNCIA EM NUVEM + BROADCAST)
// -------------------------------------------------------------
export async function buscarConfiguracoesCasalNuvem() {
  // 1. Tenta buscar da tabela memorias (__CONFIG_PERFIL__)
  try {
    const { data: memData, error: memError } = await supabase
      .from('memorias')
      .select('*')
      .eq('titulo', '__CONFIG_PERFIL__')
      .order('criado_em', { ascending: false })
      .limit(1);

    if (!memError && memData && memData.length > 0) {
      let parsed = {};
      try {
        parsed = typeof memData[0].descricao === 'string'
          ? JSON.parse(memData[0].descricao)
          : (memData[0].descricao || {});
      } catch {
        parsed = {};
      }

      const foto1Final = parsed.foto1 || memData[0].imagem_url || '';
      const foto2Final = parsed.foto2 || memData[0].link || '';

      if (foto1Final || foto2Final || parsed.apelido1 || parsed.apelido2) {
        return {
          apelido1: parsed.apelido1 || 'Jeniffer',
          emoji1: parsed.emoji1 || '🐰',
          foto1: foto1Final,
          apelido2: parsed.apelido2 || 'Alvaro',
          emoji2: parsed.emoji2 || '🦊',
          foto2: foto2Final,
          dataInicio: parsed.dataInicio || '',
          pinCode: parsed.pinCode || '1234',
        };
      }
    }
  } catch (err) {
    console.warn('memorias config fetch:', err);
  }

  // 2. Fallback na tabela respostas_diarias (data = '2099-01-02', parceiro = 'parceiro1')
  try {
    const { data: rdData, error: rdError } = await supabase
      .from('respostas_diarias')
      .select('*')
      .eq('data', '2099-01-02')
      .order('criado_em', { ascending: false })
      .limit(1);

    if (!rdError && rdData && rdData.length > 0 && rdData[0].respostas) {
      const c = rdData[0].respostas;
      if (c.foto1 || c.foto2 || c.apelido1 || c.apelido2) {
        return {
          apelido1: c.apelido1 || 'Jeniffer',
          emoji1: c.emoji1 || '🐰',
          foto1: c.foto1 || '',
          apelido2: c.apelido2 || 'Alvaro',
          emoji2: c.emoji2 || '🦊',
          foto2: c.foto2 || '',
          dataInicio: c.dataInicio || '',
          pinCode: c.pinCode || '1234',
        };
      }
    }
  } catch (err) {
    console.warn('rd 2099-01-02 fetch:', err);
  }

  return null;
}

export async function salvarConfiguracoesCasalNuvem(settings) {
  let atualNuvem = {};
  try {
    atualNuvem = (await buscarConfiguracoesCasalNuvem()) || {};
  } catch {}

  const payload = {
    apelido1: settings.apelido1 || atualNuvem.apelido1 || 'Jeniffer',
    emoji1: settings.emoji1 || atualNuvem.emoji1 || '🐰',
    foto1: settings.foto1 !== undefined && settings.foto1 !== null
      ? (settings.foto1 === '__REMOVE__' ? '' : (settings.foto1 || atualNuvem.foto1 || ''))
      : (atualNuvem.foto1 || ''),
    apelido2: settings.apelido2 || atualNuvem.apelido2 || 'Alvaro',
    emoji2: settings.emoji2 || atualNuvem.emoji2 || '🦊',
    foto2: settings.foto2 !== undefined && settings.foto2 !== null
      ? (settings.foto2 === '__REMOVE__' ? '' : (settings.foto2 || atualNuvem.foto2 || ''))
      : (atualNuvem.foto2 || ''),
    dataInicio: settings.dataInicio || atualNuvem.dataInicio || '',
    pinCode: settings.pinCode || atualNuvem.pinCode || '1234',
    atualizado_em: new Date().toISOString(),
  };

  // 1. Salva na tabela memorias (__CONFIG_PERFIL__) com imagem_url (foto1) e link (foto2)
  try {
    await supabase.from('memorias').delete().eq('titulo', '__CONFIG_PERFIL__');
    const { error: memErr } = await supabase.from('memorias').insert({
      data: getTodayDateString(),
      titulo: '__CONFIG_PERFIL__',
      descricao: JSON.stringify(payload),
      imagem_url: payload.foto1 || null,
      link: payload.foto2 || null,
    });
    if (memErr) console.warn('Erro memorias insert config:', memErr);
  } catch (err) {
    console.warn('Erro ao salvar config em memorias:', err);
  }

  // 2. Salva em respostas_diarias com data = '2099-01-02' e parceiro = 'parceiro1' (em conformidade com check constraint)
  try {
    await supabase.from('respostas_diarias').delete().eq('data', '2099-01-02');
    const { error: rdErr } = await supabase.from('respostas_diarias').insert({
      data: '2099-01-02',
      parceiro: 'parceiro1',
      respostas: {
        tipo: 'config_casal',
        ...payload,
      },
    });
    if (rdErr) console.warn('Erro respostas_diarias insert config:', rdErr);
  } catch (err) {
    console.warn('Erro ao salvar config em respostas_diarias:', err);
  }

  // 3. Dispara Broadcast em tempo real para sincronização imediata (0ms) no celular do parceiro
  try {
    await enviarBroadcastCasal({
      remetente: 'sistema',
      titulo: '⚙️ Perfil Atualizado',
      corpo: 'Novas fotos de perfil ou configurações sincronizadas 💜',
      tag: 'config-atualizada',
      payload,
    });
  } catch (err) {
    console.warn('Erro ao emitir broadcast config:', err);
  }

  return payload;
}

export async function atualizarFotoPerfilNuvem(parceiro, fotoUrl) {
  const isP1 = parceiro === 'p1' || parceiro === 'parceiro1';
  let atual = {};
  try {
    atual = (await buscarConfiguracoesCasalNuvem()) || {};
  } catch {}

  const novoPayload = {
    ...atual,
    [isP1 ? 'foto1' : 'foto2']: fotoUrl || '',
  };

  return await salvarConfiguracoesCasalNuvem(novoPayload);
}

// -------------------------------------------------------------
// TERMÔMETRO / DIÁRIO ÍNTIMO DE HUMOR (COM SPOTIFY E YOUTUBE)
// -------------------------------------------------------------
export async function salvarRespostaDiaria(parceiro, { nivel, motivo, musica_url = '' }) {
  const { error } = await supabase.from('respostas_diarias').insert({
    data: getTodayDateString(),
    parceiro,
    respostas: {
      nivel,
      motivo,
      musica_url: musica_url ? musica_url.trim() : '',
      reacoes: {},
    },
  });
  if (error) throw error;

  // Disparo em tempo real + gravação na nuvem (100% garantido)
  try {
    await enviarAlertaCasalTotal({
      remetente: parceiro,
      titulo: `🌡️ ${parceiro === 'parceiro1' ? '🐰 Jeniffer' : '🦊 Alvaro'} atualizou o humor!`,
      corpo: `Nível de felicidade: ${nivel}/100. Veja o que fez seu amor se sentir assim 💜`,
      tag: 'termometro-humor',
    });
  } catch (bErr) {
    console.warn('Alerta humor err:', bErr);
  }
}

export async function reagirRespostaDiaria(id, parceiro, emoji, respostasAtuais = {}) {
  const objReacoes = typeof respostasAtuais.reacoes === 'object' && respostasAtuais.reacoes !== null
    ? { ...respostasAtuais.reacoes }
    : {};

  if (objReacoes[parceiro] === emoji) {
    delete objReacoes[parceiro];
  } else {
    objReacoes[parceiro] = emoji;
  }

  const novasRespostas = { ...respostasAtuais, reacoes: objReacoes };

  const { error } = await supabase
    .from('respostas_diarias')
    .update({ respostas: novasRespostas })
    .eq('id', id);

  if (error) throw error;
  return objReacoes;
}

export async function editarRespostaDiaria(id, { nivel, motivo, musica_url = '', reacoes = {} }) {
  const { error } = await supabase
    .from('respostas_diarias')
    .update({
      respostas: {
        nivel,
        motivo,
        musica_url: musica_url ? musica_url.trim() : '',
        reacoes,
      },
    })
    .eq('id', id);
  if (error) throw error;
}

export async function excluirRespostaDiaria(id) {
  const { error } = await supabase.from('respostas_diarias').delete().eq('id', id);
  if (error) throw error;
}

export async function buscarRespostasDiarias(limit = 60) {
  const { data, error } = await supabase
    .from('respostas_diarias')
    .select('*')
    .neq('parceiro', 'config_casal')
    .lt('data', '2099-01-01')
    .order('criado_em', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function buscarHistoricoHumor(dias = 30) {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);
  const dataIso = dataLimite.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('respostas_diarias')
    .select('*')
    .neq('parceiro', 'config_casal')
    .lt('data', '2099-01-01')
    .gte('data', dataIso)
    .order('criado_em', { ascending: true });

  if (error) throw error;

  const agrupado = {};
  for (const item of (data || [])) {
    if (!agrupado[item.data]) agrupado[item.data] = { data: item.data };
    agrupado[item.data][item.parceiro] = item.respostas?.nivel ?? null;
  }
  return Object.values(agrupado);
}

export async function salvarCapsulaSintonia(data, payload) {
  const { error } = await supabase
    .from('capsula_memorias')
    .upsert({ data, ...payload }, { onConflict: 'data' });
  if (error) throw error;
}

export async function buscarCapsulaMemorias() {
  const { data, error } = await supabase
    .from('capsula_memorias')
    .select('*')
    .order('data', { ascending: false });
  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// 📸 FEED DO CASAL (POSTS, REAÇÕES COM EMOJI E COMENTÁRIOS)
// -------------------------------------------------------------
export async function criarPostFeed({ parceiro, autor_nome, texto, foto_url }) {
  const { data, error } = await supabase.from('feed_posts').insert({
    parceiro,
    autor_nome,
    texto: texto || '',
    foto_url: foto_url || null,
    curtidas: [],
    reacoes: {},
    comentarios: [],
  }).select();

  if (error) {
    console.error('Erro ao criar post no feed:', error);
    throw new Error(`Erro no banco: ${error.message || error.details || 'Falha ao salvar post'}`);
  }

  // Disparo em tempo real + gravação na nuvem (100% garantido)
  try {
    await enviarAlertaCasalTotal({
      remetente: parceiro,
      titulo: `📸 ${parceiro === 'parceiro1' ? '🐰' : '🦊'} ${autor_nome || 'Seu amor'} postou no Feed!`,
      corpo: texto ? `"${texto.slice(0, 70)}..."` : 'Confira a nova foto no Feed do casal! 💜',
      tag: 'feed-post',
    });
  } catch (bErr) {
    console.warn('Alerta feed err:', bErr);
  }

  return data;
}

export async function buscarPostsFeed(limit = 50) {
  const { data, error } = await supabase
    .from('feed_posts')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Erro ao buscar posts:', error);
    throw error;
  }
  return data || [];
}

export async function reagirPostFeed(postId, parceiro, emoji, reacoesAtuais = {}) {
  const objReacoes = typeof reacoesAtuais === 'object' && reacoesAtuais !== null && !Array.isArray(reacoesAtuais)
    ? { ...reacoesAtuais }
    : {};

  if (objReacoes[parceiro] === emoji) {
    delete objReacoes[parceiro];
  } else {
    objReacoes[parceiro] = emoji;
  }

  const curtidasArray = Object.keys(objReacoes);

  const { error } = await supabase
    .from('feed_posts')
    .update({ reacoes: objReacoes, curtidas: curtidasArray })
    .eq('id', postId);

  if (error) {
    await alternarCurtidaPost(postId, parceiro);
  }

  // Notifica o parceiro sobre a reação
  if (emoji) {
    try {
      await enviarAlertaCasalTotal({
        remetente: parceiro,
        titulo: `❤️ ${parceiro === 'parceiro1' ? '🐰 Jeniffer' : '🦊 Alvaro'} reagiu com ${emoji}!`,
        corpo: 'Seu amor acabou de reagir a uma foto no Feed 💜',
        tag: 'feed-reacao',
      });
    } catch {}
  }

  return objReacoes;
}

export async function alternarCurtidaPost(postId, parceiro, curtidasAtuais = []) {
  const jaCurtiu = Array.isArray(curtidasAtuais) && curtidasAtuais.includes(parceiro);
  const novasCurtidas = jaCurtiu
    ? curtidasAtuais.filter((p) => p !== parceiro)
    : [...(Array.isArray(curtidasAtuais) ? curtidasAtuais : []), parceiro];

  const { error } = await supabase
    .from('feed_posts')
    .update({ curtidas: novasCurtidas })
    .eq('id', postId);
  if (error) throw error;
  return novasCurtidas;
}

export async function adicionarComentarioPost(postId, { parceiro, autor_nome, texto }, comentariosAtuais = []) {
  const novoComentario = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    parceiro,
    autor_nome,
    texto,
    criado_em: new Date().toISOString(),
  };
  const novosComentarios = [...(Array.isArray(comentariosAtuais) ? comentariosAtuais : []), novoComentario];

  const { error } = await supabase
    .from('feed_posts')
    .update({ comentarios: novosComentarios })
    .eq('id', postId);
  if (error) throw error;

  // Notifica o parceiro sobre o comentário
  try {
    await enviarAlertaCasalTotal({
      remetente: parceiro,
      titulo: `💬 ${parceiro === 'parceiro1' ? '🐰' : '🦊'} ${autor_nome || 'Seu amor'} comentou no Feed!`,
      corpo: `"${texto.slice(0, 65)}"`,
      tag: 'feed-comentario',
    });
  } catch {}

  return novosComentarios;
}

export async function editarPostFeed(postId, novoTexto) {
  const { error } = await supabase
    .from('feed_posts')
    .update({ texto: novoTexto })
    .eq('id', postId);
  if (error) throw error;
}

export async function excluirPostFeed(postId) {
  const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
  if (error) throw error;
}

// -------------------------------------------------------------
// TÓPICOS & ATIVIDADES
// -------------------------------------------------------------
export async function criarTopico(topico) {
  const { error } = await supabase.from('topicos').insert(topico);
  if (error) throw error;
}

export async function buscarTopicosDoDia(data = getTodayDateString()) {
  const { data: res, error } = await supabase
    .from('topicos')
    .select('*')
    .eq('data', data)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return res || [];
}

export async function alternarTopicoConcluido(id, concluida) {
  const { error } = await supabase.from('topicos').update({ concluida }).eq('id', id);
  if (error) throw error;
}

export async function excluirTopico(id) {
  const { error } = await supabase.from('topicos').delete().eq('id', id);
  if (error) throw error;
}

// -------------------------------------------------------------
// JOGAR DO DIA
// -------------------------------------------------------------
export async function responderJogarDoDia(parceiro, querJogar) {
  const { error } = await supabase.from('jogar_do_dia').insert({
    data: getTodayDateString(),
    parceiro,
    quer_jogar: querJogar,
  });
  if (error) throw error;
}

export async function buscarJogarDoDia(data = getTodayDateString()) {
  const { data: res, error } = await supabase
    .from('jogar_do_dia')
    .select('*')
    .eq('data', data)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return res || [];
}

// -------------------------------------------------------------
// CONVERSAS DO DIA (CHAT + FOTOS)
// -------------------------------------------------------------
export async function enviarMensagemConversa(parceiro, texto, emoji, fotoUrl = null) {
  const { error } = await supabase.from('mensagens_conversa').insert({
    data: getTodayDateString(),
    parceiro,
    texto,
    emoji,
    foto_url: fotoUrl,
  });
  if (error) throw error;

  // Disparo em tempo real + gravação na nuvem (100% garantido)
  try {
    await enviarAlertaCasalTotal({
      remetente: parceiro,
      titulo: `💬 ${parceiro === 'parceiro1' ? '🐰' : '🦊'} Recado do seu amor!`,
      corpo: texto && texto !== '📸' ? texto : 'Enviou uma nova foto no chat! 📷',
      tag: 'chat-message',
    });
  } catch (bErr) {
    console.warn('Alerta chat err:', bErr);
  }
}

export async function editarMensagemConversa(id, texto) {
  const { error } = await supabase
    .from('mensagens_conversa')
    .update({ texto, editado: true, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function excluirMensagemConversa(id) {
  const { error } = await supabase.from('mensagens_conversa').delete().eq('id', id);
  if (error) throw error;
}

export async function buscarMensagensConversa(data = getTodayDateString()) {
  const { data: res, error } = await supabase
    .from('mensagens_conversa')
    .select('*')
    .eq('data', data)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return res || [];
}

export async function uploadFotoConversa(file) {
  return uploadImagemMemoria(file);
}

// -------------------------------------------------------------
// FILMES & SÉRIES
// -------------------------------------------------------------
export async function adicionarFilmeSerie(item) {
  const { error } = await supabase.from('filmes_series').insert(item);
  if (error) throw error;

  try {
    await enviarAlertaCasalTotal({
      remetente: item.sugerido_por,
      titulo: `🍿 ${item.sugerido_por || 'Seu amor'} sugeriu um ${item.tipo === 'serie' ? 'uma série' : 'um filme'}!`,
      corpo: `"${item.titulo}" para assistirem juntos 🎬`,
      tag: 'filme-serie',
    });
  } catch {}
}

export async function buscarFilmesSeries() {
  const { data, error } = await supabase
    .from('filmes_series')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function alternarAssistidoFilmeSerie(id, assistido) {
  const { error } = await supabase.from('filmes_series').update({ assistido }).eq('id', id);
  if (error) throw error;
}

export async function excluirFilmeSerie(id) {
  const { error } = await supabase.from('filmes_series').delete().eq('id', id);
  if (error) throw error;
}

// -------------------------------------------------------------
// QUIZ DE COMPATIBILIDADE
// -------------------------------------------------------------
export async function buscarPerguntasQuiz() {
  const { data, error } = await supabase
    .from('quiz_perguntas_v2')
    .select('*')
    .order('ordem', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function criarPerguntaQuiz(texto, opcoes) {
  const { data: ultima } = await supabase
    .from('quiz_perguntas_v2')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1);

  const proximaOrdem = (ultima?.[0]?.ordem ?? 0) + 1;
  const { error } = await supabase.from('quiz_perguntas_v2').insert({ texto, opcoes, ordem: proximaOrdem });
  if (error) throw error;
}

export async function editarPerguntaQuiz(id, texto, opcoes) {
  const { error } = await supabase.from('quiz_perguntas_v2').update({ texto, opcoes }).eq('id', id);
  if (error) throw error;
}

export async function excluirPerguntaQuiz(id) {
  const { error } = await supabase.from('quiz_perguntas_v2').delete().eq('id', id);
  if (error) throw error;
}

export async function contarRespostasPergunta(perguntaId) {
  const { count, error } = await supabase
    .from('quiz_respostas_v2')
    .select('id', { count: 'exact', head: true })
    .eq('pergunta_id', perguntaId);
  if (error) throw error;
  return count || 0;
}

export async function salvarRespostaQuiz(perguntaId, parceiro, resposta, isEdicao = false) {
  if (isEdicao) {
    const { error } = await supabase
      .from('quiz_respostas_v2')
      .update({ resposta, editado: true, atualizado_em: new Date().toISOString() })
      .eq('pergunta_id', perguntaId)
      .eq('parceiro', parceiro);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('quiz_respostas_v2').insert({ pergunta_id: perguntaId, parceiro, resposta });
    if (error) throw error;
  }
}

export async function buscarRespostasQuiz() {
  const { data, error } = await supabase.from('quiz_respostas_v2').select('*');
  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// MEMÓRIAS & STORAGE DE IMAGENS
// -------------------------------------------------------------
export async function salvarMemoria(memoria) {
  const { error } = await supabase.from('memorias').insert(memoria);
  if (error) throw error;

  // Disparo em tempo real + gravação na nuvem (100% garantido)
  try {
    await enviarAlertaCasalTotal({
      remetente: memoria.criado_por,
      titulo: `🖼️ ${memoria.criado_por || 'Seu amor'} adicionou uma foto na Galeria!`,
      corpo: memoria.titulo ? `"${memoria.titulo}" foi adicionada à galeria do casal 💜` : 'Uma nova foto foi guardada na galeria!',
      tag: 'novo-album',
    });
  } catch (bErr) {
    console.warn('Alerta memoria err:', bErr);
  }
}

export async function uploadImagemMemoria(file) {
  try {
    const rawExt = file && file.name ? file.name.split('.').pop() : 'jpg';
    const ext = (rawExt || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = `upload-${timestamp}-${randomId}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memorias-imagens')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      throw new Error(`Falha no Storage: ${uploadError.message || uploadError.error || 'Verifique as permissões do bucket memorias-imagens'}`);
    }

    const { data } = supabase.storage
      .from('memorias-imagens')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error('uploadImagemMemoria error:', err);
    throw err;
  }
}

export async function buscarMemorias() {
  const { data, error } = await supabase
    .from('memorias')
    .select('*')
    .neq('titulo', '__CONFIG_PERFIL__')
    .order('data', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function excluirMemoria(id) {
  const { error } = await supabase.from('memorias').delete().eq('id', id);
  if (error) throw error;
}

// -------------------------------------------------------------
// 💌 CARTAS "ABRA QUANDO..."
// -------------------------------------------------------------
export async function criarCartaAbraQuando({ titulo, mensagem, escrita_por, foto_url }) {
  const { error } = await supabase.from('cartas_abra_quando').insert({
    titulo,
    mensagem,
    escrita_por,
    foto_url: foto_url || null,
    aberta: false,
  });
  if (error) throw error;

  // Dispara notificação imediata + salva na nuvem para o parceiro
  try {
    await enviarAlertaCasalTotal({
      remetente: escrita_por,
      titulo: `💌 ${escrita_por === 'parceiro1' || escrita_por === 'Jeniffer' ? '🐰 Jeniffer' : '🦊 Alvaro'} te escreveu uma carta secreta!`,
      corpo: `"${titulo}" — Abra quando quiser! 💜`,
      tag: 'carta-secreta',
    });
  } catch {}
}

export async function buscarCartas() {
  const { data, error } = await supabase
    .from('cartas_abra_quando')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function editarCartaAbraQuando(id, { titulo, mensagem, foto_url }) {
  const payload = { titulo, mensagem };
  if (foto_url !== undefined) payload.foto_url = foto_url;
  const { data, error } = await supabase
    .from('cartas_abra_quando')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function abrirCarta(id, aberta_por) {
  const { data, error } = await supabase
    .from('cartas_abra_quando')
    .update({
      aberta: true,
      aberta_por,
      aberta_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function excluirCarta(id) {
  const { error } = await supabase.from('cartas_abra_quando').delete().eq('id', id);
  if (error) throw error;
}

// -------------------------------------------------------------
// 💭 PERGUNTA DO DIA
// -------------------------------------------------------------
export async function marcarPerguntaRespondida(parceiro) {
  const data = getTodayDateString();
  const { error } = await supabase
    .from('pergunta_do_dia')
    .upsert({ data, parceiro, respondeu: true }, { onConflict: 'data,parceiro' });
  if (error) throw error;
}

export async function buscarRespostasPerguntaHoje() {
  const data = getTodayDateString();
  const { data: res, error } = await supabase
    .from('pergunta_do_dia')
    .select('*')
    .eq('data', data);
  if (error) throw error;
  return res || [];
}

// -------------------------------------------------------------
// 📍 DISTÂNCIA ENTRE O CASAL (GPS EM KM)
// -------------------------------------------------------------
export async function salvarLocalizacaoRadar(parceiro, { latitude, longitude, precisao, endereco }) {
  const p = parceiro === 'parceiro2' ? 'parceiro2' : 'parceiro1';

  // Remove o registro anterior de GPS deste parceiro
  try {
    await supabase
      .from('respostas_diarias')
      .delete()
      .eq('data', '2099-01-01')
      .eq('parceiro', p);
  } catch {}

  const payload = {
    tipo: 'gps_localizacao',
    latitude: Number(latitude),
    longitude: Number(longitude),
    precisao: precisao ? Number(precisao) : null,
    endereco: endereco || null,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await supabase.from('respostas_diarias').insert({
    data: '2099-01-01',
    parceiro: p,
    respostas: payload,
  });

  if (error) throw error;

  // Notifica o parceiro sobre a atualização de GPS
  try {
    await enviarAlertaCasalTotal({
      remetente: p,
      titulo: `📍 ${p === 'parceiro1' ? '🐰 Jeniffer' : '🦊 Alvaro'} atualizou a localização!`,
      corpo: endereco ? `Está em: ${endereco}` : 'Abra a aba Distância para conferir a quantos km vocês estão! 💜',
      tag: 'radar-localizacao',
    });
  } catch {}

  return payload;
}

export async function buscarLocalizacoesRadar() {
  const { data, error } = await supabase
    .from('respostas_diarias')
    .select('*')
    .eq('data', '2099-01-01');

  if (error) throw error;

  const resultado = { parceiro1: null, parceiro2: null };
  for (const item of (data || [])) {
    if (item.parceiro === 'parceiro1' && item.respostas?.tipo === 'gps_localizacao') {
      resultado.parceiro1 = item.respostas;
    }
    if (item.parceiro === 'parceiro2' && item.respostas?.tipo === 'gps_localizacao') {
      resultado.parceiro2 = item.respostas;
    }
  }
  return resultado;
}

export async function salvarRegistroHistoricoDistancia({
  parceiro,
  latitude,
  longitude,
  endereco,
  distanciaKm,
  distanciaFormatada,
  outroNome,
}) {
  try {
    const payload = {
      tipo: 'historico_distancia',
      parceiro,
      latitude: Number(latitude),
      longitude: Number(longitude),
      endereco: endereco || 'Localização obtida via GPS',
      distancia_km: distanciaKm !== null && distanciaKm !== undefined ? Number(distanciaKm) : null,
      distancia_formatada: distanciaFormatada || null,
      outro_nome: outroNome || null,
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('respostas_diarias').insert({
      data: '2099-01-03',
      parceiro,
      respostas: payload,
    }).select();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Erro ao salvar no historico de distancias:', err);
    return null;
  }
}

export async function buscarHistoricoDistancias(limit = 40) {
  try {
    const { data, error } = await supabase
      .from('respostas_diarias')
      .select('*')
      .eq('data', '2099-01-03')
      .order('criado_em', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar histórico de distâncias:', err);
    return [];
  }
}

export async function excluirItemHistoricoDistancia(id) {
  const { error } = await supabase.from('respostas_diarias').delete().eq('id', id);
  if (error) throw error;
}

// -------------------------------------------------------------
// REALTIME SUBSCRIPTION HELPER
// -------------------------------------------------------------
export function subscribeToTable(table, onPayload) {
  const channel = supabase
    .channel(`public:${table}:${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      onPayload(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// -------------------------------------------------------------
// NOTIFICAÇÃO DE TESTE E INTERAÇÃO EM TEMPO REAL ENTRE O CASAL
// -------------------------------------------------------------
export async function enviarNotificacaoTeste(quemSouEu, meuNome, meuEmoji, outroNome) {
  // Disparo Total: broadcast instantâneo (0ms) + persistência em nuvem (data = 2099-09-09 e 2099-05-05)
  try {
    await enviarAlertaCasalTotal({
      remetente: quemSouEu,
      titulo: `🔔 ${meuEmoji} Notificação de Teste de ${meuNome}!`,
      corpo: `${meuNome} acabou de testar as notificações com você agora mesmo! 💜`,
      tag: 'teste-casal',
    });
  } catch (err) {
    console.warn('Alerta teste erro:', err);
  }

  // Persiste em respostas_diarias para acionamento redundante via postgres_changes
  try {
    await supabase.from('respostas_diarias').insert({
      data: '2099-05-05',
      parceiro: quemSouEu,
      respostas: {
        tipo: 'teste_notificacao',
        remetente: quemSouEu,
        nome: meuNome,
        emoji: meuEmoji,
        mensagem: `${meuNome} acabou de testar as notificações com você! 💜`,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.warn('Persist teste erro:', err);
  }
}
