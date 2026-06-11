'use strict';

const API_BASE = '';
let dadosNotas = [];
let sortIndex = null;
let sortDir = 1;
let debounceTimer = {};

const colunasNota = [
  { key: 'idempresa', label: 'Empresa', type: 'num' },
  { key: 'dtlancamento', label: 'Lançamento', type: 'dat' },
  { key: 'dtemissao', label: 'Emissão', type: 'dat' },
  { key: 'numnota', label: 'Nº Nota', type: 'txt' },
  { key: 'serienota', label: 'Série', type: 'txt' },
  { key: 'modelo', label: 'Modelo', type: 'txt' },
  { key: 'idpessoa', label: 'ID Pessoa', type: 'num' },
  { key: 'nome', label: 'Fornecedor/Cliente', type: 'txt' },
  { key: 'tipopessoa', label: 'Tipo', type: 'badge' },
  { key: 'descr_operacao', label: 'Operação', type: 'txt' },
  { key: '_cfop', label: 'CFOP Nota', type: 'txt' },
  { key: 'valprodutos', label: 'Vl. Produtos', type: 'brl' },
  { key: 'valnota', label: 'Vl. Nota', type: 'brl' },
  { key: 'valbaseicms', label: 'Base ICMS', type: 'brl' },
  { key: 'valicms', label: 'ICMS', type: 'brl' },
  { key: 'valbaseipi', label: 'Base IPI', type: 'brl' },
  { key: 'valipi', label: 'IPI', type: 'brl' },
  { key: 'valfrete', label: 'Frete', type: 'brl' },
  { key: 'valdesconto', label: 'Desconto', type: 'brl' },
  { key: 'chaveacessodanfe', label: 'Chave NFe', type: 'txt' }
];

const colunasProduto = [
  { key: 'numsequencia', label: 'Seq', type: 'num' },
  { key: 'codbar', label: 'Cód. Barras', type: 'txt' },
  { key: 'descr', label: 'Descrição', type: 'txt' },
  { key: 'codncm', label: 'NCM', type: 'txt' },
  { key: 'numcodfornecedor', label: 'Cód. Fornecedor', type: 'txt' },
  { key: 'sittrib', label: 'CST', type: 'txt' },
  { key: 'cfop', label: 'CFOP', type: 'txt' },
  { key: 'embalagementrada', label: 'UN', type: 'txt' },
  { key: 'qtdproduto', label: 'Qtd', type: 'num' },
  { key: 'valunitliquido', label: 'R$ Unit.', type: 'brl6' },
  { key: 'valtotliquido', label: 'R$ Total', type: 'brl' },
  { key: 'pericms', label: '% ICMS', type: 'pct' },
  { key: 'valicms', label: 'ICMS', type: 'brl' },
  { key: 'peripi', label: '% IPI', type: 'pct' },
  { key: 'valipi', label: 'IPI', type: 'brl' },
  { key: 'percofins', label: '% COFINS', type: 'pct' },
  { key: 'valcofins', label: 'COFINS', type: 'brl' },
  { key: 'idlote', label: 'Lote', type: 'txt' },
  { key: 'flagestoque', label: 'Estoque', type: 'txt' }
];

const fmt = {
  brl: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  brl6: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 }),
  pct: v => v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%',
  num: v => v == null ? '' : Number(v).toLocaleString('pt-BR'),
  dat: v => { if (!v) return ''; let d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString('pt-BR'); },
  txt: v => v == null ? '' : String(v)
};

function cellFormat(val, type) {
  if (type === 'badge') {
    let cls = val === 'J' ? 'badge-j' : 'badge-f';
    let label = val === 'J' ? 'Jurídica' : val === 'F' ? 'Física' : (val || '');
    return `<span class="badge ${cls}">${label}</span>`;
  }
  return fmt[type] ? fmt[type](val) : fmt.txt(val);
}

function alignType(t) {
  return ['brl', 'brl6', 'pct', 'num'].includes(t);
}

function normalizeNota(notaRaw) {
  let nota = {};
  Object.keys(notaRaw).forEach(k => { nota[k.toLowerCase()] = notaRaw[k]; });
  nota.produtos = (nota.produtos || []).map(p => {
    let obj = {};
    Object.keys(p).forEach(k => { obj[k.toLowerCase()] = p[k]; });
    return obj;
  });
  nota._cfop = nota.produtos[0]?.cfop || '';
  return nota;
}

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
  document.getElementById('summaryBar').style.display = 'none';
  document.getElementById('btnExport').disabled = true;

  try {
    let resp = await fetch(`/api/relatorio?${params.toString()}`);
    if (!resp.ok) throw new Error('Erro na consulta');
    let data = await resp.json();
    dadosNotas = data.map(normalizeNota);
    renderizarTabela(dadosNotas);
  } catch (err) {
    document.getElementById('tableArea').innerHTML = `<div class="state-msg"><h3>❌ Erro</h3><p>${err.message}</p></div>`;
  }
}

function renderizarTabela(notas) {
  let area = document.getElementById('tableArea');
  let countSpan = document.getElementById('resultCount');
  let btnExport = document.getElementById('btnExport');

  if (!notas.length) {
    area.innerHTML = `<div class="state-msg"><h3>📭 Nenhuma nota encontrada</h3><p>Altere os filtros e tente novamente.</p></div>`;
    countSpan.innerText = '0 notas';
    btnExport.disabled = true;
    document.getElementById('summaryBar').style.display = 'none';
    return;
  }

  countSpan.innerText = `${notas.length} nota(s)`;
  btnExport.disabled = false;

  let html = `<table class="data-table"><thead><tr>`;
  
  html += `<th style="width:45px; text-align:center;"></th>`;
  
  const larguras = [60, 95, 95, 100, 70, 70, 80, 200, 80, 130, 80, 120, 120, 120, 100, 100, 100, 100, 100, 350];
  
  colunasNota.forEach((col, idx) => {
    let icon = sortIndex === idx ? (sortDir === 1 ? '▲' : '▼') : '↕';
    let width = larguras[idx] || 100;
    html += `<th style="width:${width}px;" onclick="ordenarPor(${idx})">${col.label} <span class="sort-icon">${icon}</span></th>`;
  });
  html += `</thead><tbody>`;

  let notaIndex = 0;
  for (let nota of notas) {
    const notaId = notaIndex;
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
      
      html += `<table>`;
      html += `</td>`;
    }
    
    notaIndex++;
  }
  html += `</tbody>`;
  area.innerHTML = html;

  let totals = notas.reduce((acc, n) => {
    acc.qtd++;
    acc.valnota += +n.valnota || 0;
    acc.valprodutos += +n.valprodutos || 0;
    acc.baseicms += +n.valbaseicms || 0;
    acc.icms += +n.valicms || 0;
    acc.baseipi += +n.valbaseipi || 0;
    acc.ipi += +n.valipi || 0;
    acc.frete += +n.valfrete || 0;
    acc.desconto += +n.valdesconto || 0;
    return acc;
  }, { qtd: 0, valnota: 0, valprodutos: 0, baseicms: 0, icms: 0, baseipi: 0, ipi: 0, frete: 0, desconto: 0 });

  document.getElementById('totNotas').innerText = totals.qtd;
  document.getElementById('totValnota').innerText = fmt.brl(totals.valnota);
  document.getElementById('totProdutos').innerText = fmt.brl(totals.valprodutos);
  document.getElementById('totBaseIcms').innerText = fmt.brl(totals.baseicms);
  document.getElementById('totIcms').innerText = fmt.brl(totals.icms);
  document.getElementById('totBaseIpi').innerText = fmt.brl(totals.baseipi);
  document.getElementById('totIpi').innerText = fmt.brl(totals.ipi);
  document.getElementById('totFrete').innerText = fmt.brl(totals.frete);
  document.getElementById('totDesconto').innerText = fmt.brl(totals.desconto);
  document.getElementById('summaryBar').style.display = 'flex';
}

function ordenarPor(colIdx) {
  if (sortIndex === colIdx) sortDir *= -1;
  else { sortIndex = colIdx; sortDir = 1; }
  let key = colunasNota[colIdx].key;
  dadosNotas.sort((a, b) => {
    let va = a[key] ?? '';
    let vb = b[key] ?? '';
    let isNum = !isNaN(parseFloat(va)) && isFinite(va);
    if (isNum && !isNaN(parseFloat(vb))) return (va - vb) * sortDir;
    return String(va).localeCompare(String(vb), 'pt') * sortDir;
  });
  renderizarTabela(dadosNotas);
}

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
      } else if (col.type === 'brl' || col.type === 'brl6') {
        linhaNota.push(Number(val || 0));
      } else if (col.type === 'pct') {
        linhaNota.push(Number(val || 0));
      } else if (col.type === 'dat') {
        linhaNota.push(fmt.dat(val));
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
          if (prodCol.type === 'brl' || prodCol.type === 'brl6') {
            linhaProduto.push(Number(v || 0));
          } else if (prodCol.type === 'pct') {
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
  
  let dataStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  XLSX.writeFile(wb, `notas_entrada_${dataStr}.xlsx`);
}

function limparFiltros() {
  document.getElementById('f_empresa').value = '';
  document.getElementById('f_dtinicio').value = '';
  document.getElementById('f_dtfim').value = '';
  document.getElementById('f_fornecedor').value = '';
  document.getElementById('f_cliente').value = '';
  document.getElementById('lbl_fornecedor').textContent = '';
  document.getElementById('lbl_cliente').textContent = '';
}

document.getElementById('f_fornecedor').addEventListener('input', () => lookupPessoa('f_fornecedor', 'lbl_fornecedor'));
document.getElementById('f_cliente').addEventListener('input', () => lookupPessoa('f_cliente', 'lbl_cliente'));
document.querySelectorAll('.filter-group input, .filter-group select').forEach(el => {
  el.addEventListener('keypress', e => { if (e.key === 'Enter') buscarNotas(); });
});

(function setDefaultDates() {
  let hoje = new Date();
  let primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  document.getElementById('f_dtinicio').value = primeiroDia.toISOString().slice(0, 10);
  document.getElementById('f_dtfim').value = hoje.toISOString().slice(0, 10);
})();

function updateClock() {
  document.getElementById('liveClock').innerText = new Date().toLocaleString('pt-BR');
}
setInterval(updateClock, 1000);
updateClock();

carregarEmpresas();