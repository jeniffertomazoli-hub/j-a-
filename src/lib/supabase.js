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
// TERMÔMETRO / DIÁRIO ÍNTIMO
// -------------------------------------------------------------
export async function salvarRespostaDiaria(parceiro, { nivel, motivo }) {
  const { error } = await supabase.from('respostas_diarias').insert({
    data: getTodayDateString(),
    parceiro,
    respostas: { nivel, motivo },
  });
  if (error) throw error;
}

export async function editarRespostaDiaria(id, { nivel, motivo }) {
  const { error } = await supabase
    .from('respostas_diarias')
    .update({ respostas: { nivel, motivo } })
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
// 📸 FEED DO CASAL (ESTILO INSTAGRAM ÍNTIMO)
// -------------------------------------------------------------
export async function criarPostFeed({ parceiro, autor_nome, texto, foto_url }) {
  const { data, error } = await supabase.from('feed_posts').insert({
    parceiro,
    autor_nome,
    texto: texto || '',
    foto_url: foto_url || null,
    curtidas: [],
    comentarios: [],
  }).select();

  if (error) {
    console.error('Erro ao criar post no feed:', error);
    throw new Error(`Erro no banco: ${error.message || error.details || 'Falha ao salvar post'}`);
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

export async function alternarCurtidaPost(postId, parceiro, curtidasAtuais = []) {
  const jaCurtiu = curtidasAtuais.includes(parceiro);
  const novasCurtidas = jaCurtiu
    ? curtidasAtuais.filter((p) => p !== parceiro)
    : [...curtidasAtuais, parceiro];

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
  const novosComentarios = [...comentariosAtuais, novoComentario];

  const { error } = await supabase
    .from('feed_posts')
    .update({ comentarios: novosComentarios })
    .eq('id', postId);
  if (error) throw error;
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
}

export async function buscarCartas() {
  const { data, error } = await supabase
    .from('cartas_abra_quando')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data || [];
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
