// Lê a página oficial do Tema Repetitivo 1.373 no STJ e atualiza tema_1373.json (raiz do repositório).
// Roda no GitHub Actions (.github/workflows/tema1373.yml) todo dia. Sem dependências: Node 20+.
import fs from 'node:fs';
const ARQ = process.argv[2] || 'tema_1373.json';
const URL = 'https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=1373&cod_tema_final=1373';
const agora = new Date().toISOString().slice(0, 19);
let ant = null; try { ant = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) { }
const grava = o => fs.writeFileSync(ARQ, JSON.stringify(o, null, 2) + '\n');
const M = (t, re) => { const m = t.match(re); return m ? m[1].trim() : ''; };
const ent = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&([a-z]+);/gi, (m, n) => ({ aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ', ccedil: 'ç', acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à', Aacute: 'Á', Eacute: 'É', Oacute: 'Ó', Uacute: 'Ú', Ccedil: 'Ç', Atilde: 'Ã' }[n] || m));
try {
  const r = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; acompanhamento-tema-1373)' }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  let t = new TextDecoder('latin1').decode(await r.arrayBuffer());
  t = ent(t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/[\uE000-\uF8FF]/g, ' ').replace(/\s+/g, ' ');
  const i = t.indexOf('Tema Repetitivo 1373'); if (i < 0) throw new Error('Página sem o bloco do Tema 1373');
  t = t.slice(i);
  const novo = {
    situacao: M(t, /Situa\S+o\s+(.*?)\s+\S+rg\S+o julgador/), orgao: M(t, /rg\S+o julgador\s+(.*?)\s+Ramo do direito/),
    questao: M(t, /submetida a julgamento\s+(.*?)\s+Tese Firmada/), tese: M(t, /Tese Firmada\s+(.*?)\s+Anota\S+es NUGEPNAC/),
    repercussao: M(t, /Repercuss\S+o Geral\s+(.*?)\s+REsp \d/), atualizacaoStj: M(t, /\S+ltima atualiza\S+o:\s*(\d\d\/\d\d\/\d{4})/), processos: []
  };
  for (const p of t.split(/(?=REsp \d+\/[A-Z]{2})/).filter(s => /^REsp \d+\/[A-Z]{2}/.test(s))) {
    const emb = M(p, /Embargos de Declara\S+o\s+(.*?)\s+Afeta\S+o/);
    novo.processos.push({
      numero: M(p, /^(REsp \d+\/[A-Z]{2})/), origem: M(p, /Tribunal de Origem\s+(\S+)/), afetacao: M(p, /Afeta\S+o\s+(\d\d\/\d\d\/\d{4}|-)/),
      julgado: M(p, /Julgado em\s+(\d\d\/\d\d\/\d{4}|-)/), publicado: M(p, /publicado em\s+(\d\d\/\d\d\/\d{4}|-)/),
      embargos: emb.match(/\d\d\/\d\d\/\d{4}/g) || [], transito: M(p, /Tr\S+nsito em Julgado\s+(\d\d\/\d\d\/\d{4}|-)/)
    });
  }
  if (!novo.situacao || !novo.tese || !novo.processos.length) throw new Error('Não encontrei situação, tese ou processos (layout mudou?)');
  const mud = [];
  if (ant && ant.atual) {
    for (const c of ['situacao', 'questao', 'tese', 'repercussao']) if ((ant.atual[c] || '') !== novo[c]) mud.push({ campo: c, de: ant.atual[c] || '', para: novo[c] });
    for (const p of novo.processos) {
      const q = (ant.atual.processos || []).find(x => x.numero === p.numero);
      if (!q) { mud.push({ campo: 'processo', processo: p.numero, de: '', para: 'novo processo vinculado' }); continue; }
      for (const c of ['julgado', 'publicado', 'transito']) if ((q[c] || '') !== p[c]) mud.push({ campo: c, processo: p.numero, de: q[c] || '', para: p[c] });
      const e1 = (q.embargos || []).join(', '), e2 = p.embargos.join(', ');
      if (e1 !== e2) mud.push({ campo: 'embargos', processo: p.numero, de: e1, para: e2 });
    }
  }
  const hist = (ant && ant.historico) || [];
  if (mud.length) hist.unshift({ data: agora, mudancas: mud });
  grava({ fonte: URL, inicio: (ant && ant.inicio) || agora, verificadoEm: agora, ok: true, erro: '', atual: novo, historico: hist });
  console.log('OK', novo.situacao, '| mudanças:', mud.length);
} catch (e) {
  console.error('ERRO', e.message);
  if (ant) { ant.ok = false; ant.erro = e.message; ant.tentativaEm = agora; grava(ant); }
  process.exitCode = 1;
}
