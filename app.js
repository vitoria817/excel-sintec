'use strict';

const API_BASE = '';
let dadosNotas = [];
let sortIndex = null;
let sortDir = 1;
let currentSortKey = null;
let debounceTimer = {};

// ==================== COLUNAS DA NOTA ====================
const colunasNota = [
  { key: 'idempresa', label: 'Empresa', type: 'num' },
  { key: 'idplanilha', label: 'Planilha', type: 'num' },
  { key: 'idpessoa', label: 'Id Fornecedor', type: 'num' },
  { key: 'nome', label: 'Nome', type: 'txt' },
  { key: 'tipopessoa', label: 'Tipo', type: 'badge' },
  { key: 'numnota', label: 'Nota', type: 'txt' },
  { key: 'serienota', label: 'Série', type: 'txt' },
  { key: 'modelo', label: 'Modelo', type: 'txt' },
  { key: 'dtemissao', label: 'Emissão', type: 'dat' },
  { key: 'dtlancamento', label: 'Lançamento', type: 'dat' },
  { key: 'valnota', label: 'Valor Nota', type: 'brl' },
  { key: 'flagnotacancelada', label: 'Cancelada', type: 'flag' },
  { key: 'situacaonfe', label: 'Sit. NFE', type: 'txt' },
  { key: 'obsnota', label: 'Observação Nota', type: 'txt' },
  { key: 'obssistema', label: 'Obs. Fiscal', type: 'txt' },
  { key: 'descr_operacao', label: 'Operação', type: 'txt' },
  { key: 'criador', label: 'Usuário Lançamento', type: 'txt' },
  { key: 'dtcriacao', label: 'Data/Hora Lançamento', type: 'datahora' },
  { key: 'alterador', label: 'Usuário Alteração', type: 'txt' },
  { key: 'dtalteracao', label: 'Data/Hora Alteração', type: 'datahora' },
  { key: 'dhrecbto', label: 'Data/Hora Recebimento NFE', type: 'txt' },
  { key: 'nroprotocolo', label: 'Protocolo NFE', type: 'txt' },
  { key: 'valprodutos', label: 'Valor Produtos', type: 'brl' },
  { key: 'valbaseipi', label: 'Base IPI', type: 'brl' },
  { key: 'valipi', label: 'Valor IPI', type: 'brl' },
  { key: 'valbaseicms', label: 'Base ICMS', type: 'brl' },
  { key: 'valicms', label: 'Valor ICMS', type: 'brl' },
  { key: 'valbaseicmsub', label: 'Base Subst.', type: 'brl' },
  { key: 'valicmsub', label: 'Valor Subst.', type: 'brl' },
  { key: 'valfrete', label: 'Frete', type: 'brl' },
  { key: 'valseguro', label: 'Seguro', type: 'brl' },
  { key: 'valdesconto', label: 'Desconto', type: 'brl' },
  { key: 'valoutrasdespesas', label: 'Outras Despesas', type: 'brl' },
  { key: 'valdifalentrada', label: 'R$ DIFAL', type: 'brl' },
  { key: 'chaveacessodanfe', label: 'Chave DANFE', type: 'txt' }
];

// ==================== COLUNAS DO PRODUTO (EXATAMENTE AS DO RELATÓRIO) ====================
const colunasProduto = [
  { key: 'numsequencia', label: 'Seq.', type: 'num' },
  { key: 'idproduto', label: 'Código Interno', type: 'num' },
  { key: 'codbar', label: 'Código de Barras', type: 'txt' },
  { key: 'descr', label: 'Descrição do Produto', type: 'txt' },
  { key: 'codncm', label: 'NCM', type: 'txt' },
  { key: 'numcodfornecedor', label: 'Código Fornecedor', type: 'txt' },
  { key: 'codtrib', label: 'CST', type: 'txt' },
  { key: 'sittrib', label: 'Situação Tributária', type: 'txt' },
  { key: 'cfopinverso', label: 'CFOP Inverso', type: 'txt' },
  { key: 'cfop', label: 'CFOP Gravado', type: 'txt' },
  { key: 'embalagementrada', label: 'UN', type: 'txt' },
  { key: 'gramaentrada', label: 'Qtd Na Embalagem', type: 'num3' },
  { key: 'qtdembalagem', label: 'QTD Embalagem', type: 'num3' },
  { key: 'qtdproduto', label: 'QTD Unidades', type: 'num3' },
  { key: 'valunitbruto', label: 'Valor Unitário', type: 'brl6' },
  { key: 'valembalagembruto', label: 'Valor Embalagem', type: 'brl' },
  { key: 'valtotbruto', label: 'R$ Total Bruto', type: 'brl' },
  { key: 'valdescontoprod', label: 'R$ Desconto Produto', type: 'brl' },
  { key: 'valdescontonota', label: 'Desconto NOTA', type: 'brl' },
  { key: 'valfrete', label: 'Valor Frete', type: 'brl' },
  { key: 'valseguro', label: 'Valor Seguro', type: 'brl' },
  { key: 'valdespesasacessorias', label: 'Valor Despesas', type: 'brl' },
  { key: 'valbaseipi', label: 'Base IPI', type: 'brl' },
  { key: 'peripi', label: 'Alíquota IPI', type: 'pct' },
  { key: 'valipi', label: 'Valor IPI', type: 'brl' },
  { key: 'valbaseicms', label: 'Base ICMS', type: 'brl' },
  { key: 'perredtribaseicm', label: '%Red.Base ICMS', type: 'pct' },
  { key: 'valbasereduzidaicment', label: 'Vl.Red.Base ICMS', type: 'brl' },
  { key: 'pericms', label: 'Alíquota ICMS', type: 'pct' },
  { key: 'valreduzidoicment', label: 'Vl.Red. ICMS', type: 'brl' },
  { key: 'valicms', label: 'Valor ICMS', type: 'brl' },
  { key: 'valbaseicmssubstituido', label: 'Base Subst.', type: 'brl' },
  { key: 'permargsubstituicao', label: 'Margem Subst.', type: 'pct' },
  { key: 'pericmsubstituido', label: 'Alíquota Subst.', type: 'pct' },
  { key: 'valicmsubstituido', label: 'Valor Subst.', type: 'brl' },
  { key: 'qtdpedido', label: 'Qtd. Pedido', type: 'num3' },
  { key: 'qtdunitbonifica', label: 'Un. Bonif.', type: 'num3' },
  { key: 'qtdembbonifica', label: 'Emb. Bonif.', type: 'num3' },
  { key: 'valunitbonificado', label: 'Vl.Unit. Bonif.', type: 'brl6' },
  { key: 'valtotbonificado', label: 'Total Bonif.', type: 'brl' },
  { key: 'valtotliquido', label: 'Total Líquido', type: 'brl' },
  { key: 'tipopis', label: 'Tipo PIS', type: 'txt' },
  { key: 'cstpis', label: 'CST PIS', type: 'txt' },
  { key: 'valbasepis', label: 'Base PIS', type: 'brl' },
  { key: 'perpis', label: '%PIS', type: 'pct' },
  { key: 'valpis', label: 'Valor PIS', type: 'brl' },
  { key: 'tipocofins', label: 'Tipo COFINS', type: 'txt' },
  { key: 'cstcofins', label: 'CST COFINS', type: 'txt' },
  { key: 'valbaseconfins', label: 'Base COFINS', type: 'brl' },
  { key: 'percofins', label: '%COFINS', type: 'pct' },
  { key: 'valcofins', label: 'Valor COFINS', type: 'brl' },
  { key: 'lotes', label: 'Lote', type: 'txt' },
  { key: 'descr_estoque', label: 'Est', type: 'txt' }
];

// ==================== FORMATAÇÃO ====================
const fmt = {
  brl: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  brl6: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 }),
  pct: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%',
  num: v => v == null ? '' : Number(v).toLocaleString('pt-BR'),
  num3: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
  dat: v => { if (!v) return ''; let d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString('pt-BR'); },
  datahora: v => { if (!v) return ''; let d = new Date(v); return isNaN(d) ? v : d.toLocaleString('pt-BR'); },
  txt: v => v == null ? '' : String(v)
};

function cellFormat(val, type) {
  if (type === 'badge') {
    let cls = val === 'J' ? 'badge-j' : 'badge-f';
    let label = val === 'J' ? 'Jurídica' : val === 'F' ? 'Física' : (val || '');
    return `<span class="badge ${cls}">${label}</span>`;
  }
  if (type === 'flag') {
    return (val == null || val === 'F') ? 'N' : 'S';
  }
  return fmt[type] ? fmt[type](val) : fmt.txt(val);
}

function alignType(t) {
  return ['brl', 'brl6', 'pct', 'num', 'num3'].includes(t);
}

// ==================== NORMALIZAÇÃO ====================
function normalizeNota(notaRaw) {
  let nota = {};
  Object.keys(notaRaw).forEach(k => { nota[k.toLowerCase()] = notaRaw[k]; });
  nota.produtos = (nota.produtos || []).map(p => {
    let obj = {};
    Object.keys(p).forEach(k => { obj[k.toLowerCase()] = p[k]; });
    return obj;
  });
  return nota;
}

// ==================== EXPANDIR/RECOLHER ====================
function toggleProdutos(id) {
  const row = document.getElementById(`produtos_${id}`);
  const btn = document.getElementById(`btn_${id}`);
  if (row.style.display === 'none' || !row.style.display) {
    row.style.display = 'table-row';
    btn.innerHTML = '−';
    btn.title = 'Recolher produtos';
  } else {
    row.style.display = 'none';
    btn.innerHTML = '+';
    btn.title = 'Expandir produtos';
  }
}

// ==================== BUSCAR PESSOA ====================
async function lookupPessoa(inputId, labelId) {
  let val = document.getElementById(inputId).value.trim();
  let lbl = document.getElementById(labelId);
  if (debounceTimer[inputId]) clearTimeout(debounceTimer[inputId]);
  if (!val) { lbl.textContent = ''; return; }
  lbl.textContent = '⏳ carregando...';
  debounceTimer[inputId] = setTimeout(async () => {
    try {
      let resp = await fetch(`/api/pessoa/${val}`);
      let data = await resp.json();
      lbl.textContent = data?.nome || 'não encontrado';
      lbl.className = data?.nome ? 'pessoa-label found' : 'pessoa-label notfound';
    } catch { lbl.textContent = 'erro'; }
  }, 500);
}

// ==================== CARREGAR EMPRESAS ====================
async function carregarEmpresas() {
  try {
    let res = await fetch('/api/empresas');
    let rows = await res.json();
    let select = document.getElementById('f_empresa');
    select.innerHTML = '<option value="">Todas</option>';
    rows.forEach(e => {
      let opt = document.createElement('option');
      opt.value = e.idempresa ?? e.IDEMPRESA;
      opt.textContent = `Empresa ${opt.value}`;
      select.appendChild(opt);
    });
  } catch (e) { console.warn(e); }
}

// ==================== BUSCAR NOTAS ====================
async function buscarNotas() {
  let params = new URLSearchParams();
  let empresa = document.getElementById('f_empresa').value;
  let dtInicio = document.getElementById('f_dtinicio').value;
  let dtFim = document.getElementById('f_dtfim').value;
  let fornecedor = document.getElementById('f_fornecedor').value.trim();
  let cliente = document.getElementById('f_cliente').value.trim();

  if (empresa) params.set('idempresa', empresa);
  if (dtInicio) params.set('dtinicio', dtInicio);
  if (dtFim) params.set('dtfim', dtFim);
  if (fornecedor) params.set('idfornecedor', fornecedor);
  if (cliente) params.set('idcliente', cliente);

  document.getElementById('tableArea').innerHTML = `<div class="state-msg"><p>⏳ Carregando notas fiscais...</p></div>`;
  document.getElementById('btnExport').disabled = true;

  try {
    let resp = await fetch(`/api/relatorio?${params.toString()}`);
    if (!resp.ok) throw new Error('Erro na consulta');
    let data = await resp.json();
    dadosNotas = data.map(normalizeNota);
    currentSortKey = 'dtlancamento';
    sortDir = -1;
    renderizarTabela(dadosNotas);
  } catch (err) {
    document.getElementById('tableArea').innerHTML = `<div class="state-msg"><h3>❌ Erro</h3><p>${err.message}</p></div>`;
  }
}

// ==================== RENDERIZAR TABELA ====================
function renderizarTabela(notas) {
  let area = document.getElementById('tableArea');
  let countSpan = document.getElementById('resultCount');
  let btnExport = document.getElementById('btnExport');

  if (!notas.length) {
    area.innerHTML = `<div class="state-msg"><h3>📭 Nenhuma nota encontrada</h3><p>Altere os filtros e tente novamente.</p></div>`;
    countSpan.innerText = '0 notas';
    btnExport.disabled = true;
    return;
  }

  countSpan.innerText = `${notas.length} nota(s)`;
  btnExport.disabled = false;

  const sortKey = currentSortKey || 'dtlancamento';
  const sortDirLocal = sortDir || 1;

  const notasOrdenadas = [...notas].sort((a, b) => {
    const idA = a.idpessoa ?? 0;
    const idB = b.idpessoa ?? 0;
    if (idA !== idB) return idA - idB;
    let va = a[sortKey] ?? '';
    let vb = b[sortKey] ?? '';
    let isNum = !isNaN(parseFloat(va)) && isFinite(va);
    if (isNum && !isNaN(parseFloat(vb))) return (va - vb) * sortDirLocal;
    return String(va).localeCompare(String(vb), 'pt') * sortDirLocal;
  });

  let html = `<table class="data-table"><thead><tr>`;
  html += `<th style="width:45px; text-align:center;"></th>`;
  colunasNota.forEach((col, idx) => {
    let icon = (sortIndex === idx) ? (sortDir === 1 ? '▲' : '▼') : '↕';
    html += `<th onclick="ordenarPor(${idx})">${col.label} <span class="sort-icon">${icon}</span></th>`;
  });
  html += `</tr></thead><tbody>`;

  let currentFornecedor = null;
  let grupoCor = 0;

  notasOrdenadas.forEach((nota, index) => {
    const idFornecedor = nota.idpessoa;
    if (currentFornecedor !== idFornecedor) {
      currentFornecedor = idFornecedor;
      grupoCor = (grupoCor + 1) % 2;
      const nomeFornecedor = nota.nome || `Fornecedor ${idFornecedor}`;
      const corFundo = grupoCor === 0 ? '#e6f2f9' : '#f0f4fa';
      html += `<tr class="grupo-fornecedor" style="background:${corFundo}; border-top:3px solid #1e3a5f;">`;
      html += `<td colspan="${colunasNota.length + 1}" style="padding:8px 15px; font-weight:700; color:#0d1b3e; text-align:left;">`;
      html += `🏢 Fornecedor: <strong>${nomeFornecedor}</strong> (ID: ${idFornecedor})`;
      html += `</td></tr>`;
    }

    const notaId = index;
    const hasProdutos = nota.produtos && nota.produtos.length;
    html += `<tr class="nota-row">`;
    html += `<td class="expand-col" style="text-align:center;">`;
    if (hasProdutos) {
      html += `<button class="expand-btn" id="btn_${notaId}" onclick="toggleProdutos(${notaId})" title="Expandir produtos">+</button>`;
    } else {
      html += `<span style="opacity:0.3;">-</span>`;
    }
    html += `</td>`;

    for (let col of colunasNota) {
      let val = nota[col.key];
      let cellHtml = cellFormat(val, col.type);
      let align = alignType(col.type) ? 'num' : '';
      html += `<td class="${align}">${cellHtml}</td>`;
    }
    html += `</tr>`;

    if (hasProdutos) {
      html += `<tr id="produtos_${notaId}" style="display:none;" class="produtos-expand">`;
      html += `<td colspan="${colunasNota.length + 1}" style="padding:0;">`;
      html += `<table class="prod-table" style="width:100%; border-collapse:collapse;">`;
      html += `<tr class="prod-hdr">`;
      for (let prodCol of colunasProduto) {
        html += `<td style="padding:8px 12px; font-weight:700; background:#e6f2f9; font-size:0.7rem; border-bottom:2px solid #cbd5e1;">${prodCol.label}</td>`;
      }
      html += `</tr>`;
      for (let prod of nota.produtos) {
        html += `<tr>`;
        for (let prodCol of colunasProduto) {
          let pVal = prod[prodCol.key];
          let pFmt = cellFormat(pVal, prodCol.type);
          let pAlign = alignType(prodCol.type) ? 'num' : '';
          html += `<td style="padding:6px 12px; border-bottom:1px solid #e2e8f0; font-size:0.7rem;" class="${pAlign}">${pFmt}</td>`;
        }
        html += `</tr>`;
      }
      html += `</table>`;
      html += `</td></tr>`;
    }
  });

  html += `</tbody></table>`;
  area.innerHTML = html;
}

// ==================== ORDENAÇÃO ====================
function ordenarPor(colIdx) {
  if (sortIndex === colIdx) sortDir *= -1;
  else { sortIndex = colIdx; sortDir = 1; }
  currentSortKey = colunasNota[colIdx].key;
  renderizarTabela(dadosNotas);
}

// ==================== EXPORTAR EXCEL ====================
function exportarExcel() {
  if (!dadosNotas.length) return;

  let workbookData = [];
  let headerNota = colunasNota.map(c => c.label);
  workbookData.push(headerNota);

  for (let nota of dadosNotas) {
    let linhaNota = [];
    for (let col of colunasNota) {
      let val = nota[col.key];
      if (col.type === 'badge') {
        linhaNota.push(val === 'J' ? 'Jurídica' : val === 'F' ? 'Física' : val || '');
      } else if (col.type === 'flag') {
        linhaNota.push((val == null || val === 'F') ? 'N' : 'S');
      } else if (['brl','brl6','pct'].includes(col.type)) {
        linhaNota.push(Number(val || 0));
      } else if (col.type === 'dat') {
        linhaNota.push(fmt.dat(val));
      } else if (col.type === 'datahora') {
        linhaNota.push(fmt.datahora(val));
      } else {
        linhaNota.push(val ?? '');
      }
    }
    workbookData.push(linhaNota);

    if (nota.produtos && nota.produtos.length) {
      let headerProdutos = colunasProduto.map(p => p.label);
      workbookData.push(headerProdutos);
      for (let prod of nota.produtos) {
        let linhaProduto = [];
        for (let prodCol of colunasProduto) {
          let v = prod[prodCol.key] ?? '';
          if (['brl','brl6','pct'].includes(prodCol.type)) {
            linhaProduto.push(Number(v || 0));
          } else {
            linhaProduto.push(v);
          }
        }
        workbookData.push(linhaProduto);
      }
    }
    workbookData.push([]);
  }

  let ws = XLSX.utils.aoa_to_sheet(workbookData);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Notas Entrada');
  let dataStr = new Date().toISOString().slice(0,19).replace(/:/g,'-');
  XLSX.writeFile(wb, `notas_entrada_${dataStr}.xlsx`);
}

// ==================== LIMPAR FILTROS ====================
function limparFiltros() {
  document.getElementById('f_empresa').value = '';
  document.getElementById('f_dtinicio').value = '';
  document.getElementById('f_dtfim').value = '';
  document.getElementById('f_fornecedor').value = '';
  document.getElementById('f_cliente').value = '';
  document.getElementById('lbl_fornecedor').textContent = '';
  document.getElementById('lbl_cliente').textContent = '';
}

// ==================== EVENTOS ====================
document.getElementById('f_fornecedor').addEventListener('input', () => lookupPessoa('f_fornecedor', 'lbl_fornecedor'));
document.getElementById('f_cliente').addEventListener('input', () => lookupPessoa('f_cliente', 'lbl_cliente'));
document.querySelectorAll('.filter-group input, .filter-group select').forEach(el => {
  el.addEventListener('keypress', e => { if (e.key === 'Enter') buscarNotas(); });
});

// ==================== DATAS PADRÃO ====================
(function setDefaultDates() {
  let hoje = new Date();
  let primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  document.getElementById('f_dtinicio').value = primeiroDia.toISOString().slice(0, 10);
  document.getElementById('f_dtfim').value = hoje.toISOString().slice(0, 10);
})();

// ==================== RELÓGIO ====================
function updateClock() {
  document.getElementById('liveClock').innerText = new Date().toLocaleString('pt-BR');
}
setInterval(updateClock, 1000);
updateClock();

// ==================== INICIALIZAÇÃO ====================
carregarEmpresas();