// =============================================
//  APP.JS – Relatório Notas de Entrada SINTEC
// =============================================
'use strict';

const API_BASE = '';   // mesma origem; ajuste se o server.js rodar em porta diferente
let _dados = [];       // cache dos dados carregados
let _sortCol = null;
let _sortDir = 1;

// Colunas da tabela (cabeçalho principal)
const COLUNAS = [
  { key: 'IDEMPRESA',         label: 'Empresa',                type: 'num' },
  { key: '_direcao',          label: 'Direção',                type: 'txt' },
  { key: '_estornada',        label: 'Estornada',              type: 'txt' },
  { key: '_cfop',             label: 'CFOP',                   type: 'txt' },
  { key: 'DTLANCAMENTO',      label: 'Dt Lanct',               type: 'dat' },
  { key: 'DTEMISSAO',         label: 'Data do documento',      type: 'dat' },
  { key: 'NUMNOTA',           label: 'Nº da Nota',             type: 'txt' },
  { key: 'SERIENOTA',         label: 'Série',                  type: 'txt' },
  { key: 'VALICMS',           label: 'Valor ICMS',             type: 'brl' },
  { key: '_csticms',          label: 'CST ICMS',               type: 'txt' },
  { key: 'VALIPI',            label: 'Valor IPI',              type: 'brl' },
  { key: '_cstipi',           label: 'CST IPI',                type: 'txt' },
  { key: 'IDPESSOA',          label: 'Cliente/Fornec',         type: 'num' },
  { key: 'NOME',              label: 'Nome Cliente/Forn',      type: 'txt' },
  { key: 'UF',                label: 'UF',                     type: 'txt' },
  { key: '_ncm',              label: 'NCM',                    type: 'txt' },
  { key: 'VALPRODUTOS',       label: 'Valor Contábil',         type: 'brl' },
  { key: 'VALBASEICMS',       label: 'Base ICMS',              type: 'brl' },
  { key: '_aliqicms',         label: 'Alíquota do ICMS',       type: 'pct' },
  { key: 'VALBASEIPI',        label: 'Base IPI',               type: 'brl' },
  { key: '_aliqipi',          label: 'Alíquota do IPI',        type: 'pct' },
  { key: 'MODELO',            label: 'Modelo da nota',         type: 'txt' },
  { key: 'CHAVEACESSODANFE',  label: 'Chave NFe',              type: 'txt' },
  { key: '_local',            label: 'Local',                  type: 'txt' },
  { key: 'IDPLANILHA',        label: 'Documento contábil',     type: 'num' },
  { key: '_incoterms',        label: 'Incoterms',              type: 'txt' },
  { key: 'DESCR_OPERACAO',    label: 'Regime de Tributação - Descrição', type: 'txt' },
  { key: 'TIPOPESSOA',        label: 'Tipo Pessoa',            type: 'txt' },
];

// Colunas dos itens/produtos (sub-linha)
const COL_PROD = [
  { key: 'IDPRODUTO',       label: 'Material' },
  { key: 'DESCR',           label: 'Descrição do item' },
  { key: 'QTDPRODUTO',      label: 'Quantidade',          type: 'num' },
  { key: 'EMBALAGEMENTRADA',label: 'Unidade de medida' },
  { key: 'VALUNITLIQUIDO',  label: 'Preço líq.',          type: 'brl6' },
  { key: 'VALTOTLIQUIDO',   label: 'Valor líquido',       type: 'brl' },
  { key: 'CFOP',            label: 'CFOP' },
  { key: 'CODNCM',          label: 'NCM' },
  { key: 'SITTRIB',         label: 'Sit.Trib.' },
  { key: 'PERICMS',         label: 'Alíq.ICMS',           type: 'pct' },
  { key: 'VALBASEICMS',     label: 'Base ICMS',           type: 'brl' },
  { key: 'VALICMS',         label: 'Valor ICMS',          type: 'brl' },
  { key: 'PERIPI',          label: 'Alíq.IPI',            type: 'pct' },
  { key: 'VALBASEIPI',      label: 'Base IPI',            type: 'brl' },
  { key: 'VALIPI',          label: 'Valor IPI',           type: 'brl' },
];

// =============================================
//  UTILITÁRIOS
// =============================================
const fmt = {
  brl: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }),
  brl6: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits:6, maximumFractionDigits:6 }),
  pct: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + '%',
  num: v => v == null ? '' : Number(v).toLocaleString('pt-BR'),
  dat: v => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleDateString('pt-BR');
  },
  txt: v => v == null ? '' : String(v),
};

function cell(val, type) {
  if (!type || type === 'txt') return fmt.txt(val);
  if (type === 'brl')  return fmt.brl(val);
  if (type === 'brl6') return fmt.brl6(val);
  if (type === 'pct')  return fmt.pct(val);
  if (type === 'num')  return fmt.num(val);
  if (type === 'dat')  return fmt.dat(val);
  return val ?? '';
}

function isRight(type) { return ['brl','brl6','pct','num'].includes(type); }

// Enriquece linha com campos derivados
function enriquecer(nota) {
  nota._direcao   = 'Entrada';
  nota._estornada = 'Não';
  nota._csticms   = '';
  nota._cstipi    = '';
  nota._ncm       = '';
  nota._aliqicms  = nota.produtos?.[0]?.PERICMS ?? '';
  nota._aliqipi   = nota.produtos?.[0]?.PERIPI ?? '';
  nota._cfop      = nota.produtos?.[0]?.CFOP ?? '';
  nota._ncm       = nota.produtos?.[0]?.CODNCM ?? '';
  nota._csticms   = nota.produtos?.[0]?.SITTRIB ?? '';
  nota._cstipi    = nota.produtos?.[0]?.CSTIPI ?? '';
  nota._local     = '';
  nota._incoterms = '';
  return nota;
}

// =============================================
//  BUSCA
// =============================================
async function buscar() {
  const empresa  = document.getElementById('f_empresa').value.trim();
  const dtinicio = document.getElementById('f_dtinicio').value;
  const dtfim    = document.getElementById('f_dtfim').value;
  const pessoa   = document.getElementById('f_pessoa').value.trim();

  const params = new URLSearchParams();
  if (empresa)  params.set('idempresa',  empresa);
  if (dtinicio) params.set('dtinicio',   dtinicio);
  if (dtfim)    params.set('dtfim',      dtfim);
  if (pessoa)   params.set('idpessoa',   pessoa);

  mostrarLoading();

  try {
    const res = await fetch(`${API_BASE}/api/relatorio?${params}`);
    if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
    const dados = await res.json();
    _dados = dados.map(enriquecer);
    renderTabela(_dados);
  } catch (e) {
    mostrarErro(e.message);
  }
}

// =============================================
//  RENDER
// =============================================
function renderTabela(dados) {
  const area  = document.getElementById('tableArea');
  const count = document.getElementById('resultCount');
  const btnEx = document.getElementById('btnExport');
  const showP = document.getElementById('chkProdutos').checked;

  if (!dados.length) {
    area.innerHTML = `<div class="state-msg">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <h3>Nenhum resultado encontrado</h3><p>Tente ajustar os filtros.</p></div>`;
    count.textContent = '';
    btnEx.disabled = true;
    document.getElementById('summaryBar').style.display = 'none';
    return;
  }

  count.textContent = `${dados.length} nota(s) encontrada(s)`;
  btnEx.disabled = false;

  // Monta thead
  const ths = COLUNAS.map((c, i) => {
    const sorted = _sortCol === i ? 'sorted' : '';
    const icon   = _sortCol === i ? (_sortDir === 1 ? '▲' : '▼') : '↕';
    return `<th class="${sorted}" onclick="ordenar(${i})">${c.label} <span class="sort-icon">${icon}</span></th>`;
  }).join('');

  // Monta tbody
  let rows = '';
  dados.forEach(nota => {
    const tds = COLUNAS.map(c => {
      let v = nota[c.key];
      let content = cell(v, c.type);

      // Tipo pessoa como badge
      if (c.key === 'TIPOPESSOA') {
        const cls = v === 'J' ? 'badge-j' : 'badge-f';
        const lab = v === 'J' ? 'Jurídica' : v === 'F' ? 'Física' : v || '';
        content = `<span class="badge ${cls}">${lab}</span>`;
      }

      return `<td class="${isRight(c.type)?'num':''}" title="${String(content).replace(/"/g,'&quot;')}">${content}</td>`;
    }).join('');
    rows += `<tr>${tds}</tr>`;

    // Sub-linhas de produtos
    if (showP && nota.produtos?.length) {
      nota.produtos.forEach(p => {
        const ptds = COL_PROD.map(cp => {
          let v = p[cp.key];
          let content = cp.type === 'brl'  ? fmt.brl(v)
                      : cp.type === 'brl6' ? fmt.brl6(v)
                      : cp.type === 'pct'  ? fmt.pct(v)
                      : cp.type === 'num'  ? fmt.num(v)
                      : (v ?? '');
          return `<td>${content}</td>`;
        });
        // Preenche colunas faltando com espaços
        const totalCols = COLUNAS.length;
        while (ptds.length < totalCols) ptds.push('<td></td>');
        rows += `<tr class="prod-row">${ptds.join('')}</tr>`;
      });
    }
  });

  area.innerHTML = `
    <table class="data-table" id="mainTable">
      <thead><tr>${ths}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  // Totais
  const tot = dados.reduce((a, n) => {
    a.nota   += 1;
    a.valnota += Number(n.VALNOTA  || 0);
    a.icms    += Number(n.VALICMS  || 0);
    a.baseicms+= Number(n.VALBASEICMS || 0);
    a.ipi     += Number(n.VALIPI   || 0);
    a.frete   += Number(n.VALFRETE || 0);
    return a;
  }, { nota:0, valnota:0, icms:0, baseicms:0, ipi:0, frete:0 });

  document.getElementById('totNotas').textContent    = tot.nota;
  document.getElementById('totValnota').textContent  = fmt.brl(tot.valnota);
  document.getElementById('totIcms').textContent     = fmt.brl(tot.icms);
  document.getElementById('totBaseIcms').textContent = fmt.brl(tot.baseicms);
  document.getElementById('totIpi').textContent      = fmt.brl(tot.ipi);
  document.getElementById('totFrete').textContent    = fmt.brl(tot.frete);
  document.getElementById('summaryBar').style.display = 'flex';
}

function mostrarLoading() {
  document.getElementById('tableArea').innerHTML =
    `<div class="state-msg"><div class="spinner"></div><p>Buscando dados...</p></div>`;
  document.getElementById('summaryBar').style.display = 'none';
  document.getElementById('btnExport').disabled = true;
  document.getElementById('resultCount').textContent = '';
}

function mostrarErro(msg) {
  document.getElementById('tableArea').innerHTML =
    `<div class="state-msg">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <h3 style="color:#c0392b">Erro ao buscar dados</h3>
      <p>${msg}</p></div>`;
}

// =============================================
//  ORDENAÇÃO
// =============================================
function ordenar(colIdx) {
  if (_sortCol === colIdx) _sortDir *= -1;
  else { _sortCol = colIdx; _sortDir = 1; }

  const key = COLUNAS[colIdx].key;
  _dados.sort((a, b) => {
    let va = a[key], vb = b[key];
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (!isNaN(Number(va)) && !isNaN(Number(vb))) return (Number(va) - Number(vb)) * _sortDir;
    return String(va).localeCompare(String(vb), 'pt-BR') * _sortDir;
  });
  renderTabela(_dados);
}

// =============================================
//  EXPORTAR EXCEL (via CSV – abre no Excel)
// =============================================
function exportarExcel() {
  if (!_dados.length) return;

  const showP = document.getElementById('chkProdutos').checked;

  // BOM + separador ponto-e-vírgula para Excel pt-BR
  let csv = '\uFEFF';

  // Cabeçalho principal
  csv += COLUNAS.map(c => `"${c.label}"`).join(';') + '\n';

  _dados.forEach(nota => {
    const rowMain = COLUNAS.map(c => {
      let v = nota[c.key];
      if (c.type === 'brl' || c.type === 'brl6') v = Number(v || 0).toFixed(c.type === 'brl6' ? 6 : 2).replace('.', ',');
      else if (c.type === 'pct') v = Number(v || 0).toFixed(2).replace('.', ',') + '%';
      else if (c.type === 'dat') v = fmt.dat(v);
      else v = v ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    });
    csv += rowMain.join(';') + '\n';

    // Sub-linhas de produto
    if (showP && nota.produtos?.length) {
      // Linha de cabeçalho dos produtos (apenas uma vez seria ideal; aqui inline)
      const hProd = COL_PROD.map(c => `"  >> ${c.label}"`);
      while (hProd.length < COLUNAS.length) hProd.push('""');
      csv += hProd.join(';') + '\n';

      nota.produtos.forEach(p => {
        const rProd = COL_PROD.map(cp => {
          let v = p[cp.key];
          if (cp.type === 'brl') v = Number(v || 0).toFixed(2).replace('.', ',');
          else if (cp.type === 'brl6') v = Number(v || 0).toFixed(6).replace('.', ',');
          else if (cp.type === 'pct') v = Number(v || 0).toFixed(2).replace('.', ',') + '%';
          else if (cp.type === 'num') v = Number(v || 0).toFixed(3).replace('.', ',');
          else v = v ?? '';
          return `"${String(v).replace(/"/g, '""')}"`;
        });
        while (rProd.length < COLUNAS.length) rProd.push('""');
        csv += rProd.join(';') + '\n';
      });
    }
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `notas_entrada_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// =============================================
//  CONTROLES GERAIS
// =============================================
function limparFiltros() {
  ['f_empresa','f_dtinicio','f_dtfim','f_pessoa'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// Re-renderiza ao marcar/desmarcar itens
document.getElementById('chkProdutos').addEventListener('change', () => {
  if (_dados.length) renderTabela(_dados);
});

// Enter nos inputs dispara busca
document.querySelectorAll('.filter-bar input').forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
});

// Data/hora no header
(function tick() {
  document.getElementById('now').textContent =
    new Date().toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'medium' });
  setTimeout(tick, 1000);
})();

// Datas padrão: último mês
(function initDatas() {
  const hoje   = new Date();
  const primDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  document.getElementById('f_dtinicio').value = primDia.toISOString().slice(0,10);
  document.getElementById('f_dtfim').value    = hoje.toISOString().slice(0,10);
})();