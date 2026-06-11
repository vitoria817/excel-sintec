//tem que arumar do CST para trazer certo os valores
const express = require('express');
const odbc    = require('odbc');
const cors    = require('cors');
const path    = require('path');

const app      = express();
const PORT     = 3000;
const DSN_NAME = 'SINTEC';

process.on('uncaughtException',  e => console.error('[UNCAUGHT]', e.message, e.odbcErrors || ''));
process.on('unhandledRejection', e => console.error('[UNHANDLED]', e));

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

async function queryDB(sql) {
  let conn;
  try {
    conn = await odbc.connect(`DSN=${DSN_NAME}`);
    const result = await conn.query(sql);
    return result;
  } catch(e) {
    console.error('[queryDB ERROR] message   :', e.message);
    console.error('[queryDB ERROR] odbcErrors:', JSON.stringify(e.odbcErrors || null));
    console.error('[queryDB ERROR] stack     :', e.stack);
    throw e;
  } finally {
    if (conn) try { await conn.close(); } catch(_) {}
  }
}

app.get('/api/empresas', async (req, res) => {
  try {
    const rows = await queryDB(`
      SELECT DISTINCT idempresa
      FROM notas_entrada
      WHERE flagnotacancelada = 'F'
      ORDER BY idempresa
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message, odbc: e.odbcErrors || null });
  }
});

app.get('/api/pessoa/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.json(null);
    const rows = await queryDB(
      `SELECT idpessoa, trim(nome) AS nome, trim(tipopessoa) AS tipopessoa
       FROM pessoas WHERE idpessoa = ${id}`
    );
    res.json(rows[0] || null);
  } catch (e) {
    res.status(500).json({ error: e.message, odbc: e.odbcErrors || null });
  }
});

app.get('/api/relatorio', async (req, res) => {
  try {
    const { idempresa, dtinicio, dtfim, idfornecedor, idcliente } = req.query;

    const conds = [`UPPER(TRIM(pa.flagentrada)) = 'T'`];

    if (idempresa  && idempresa.trim())  conds.push(`pa.idempresa = ${parseInt(idempresa)}`);
    if (dtinicio   && dtinicio.trim())   conds.push(`ne.dtlancamento >= '${dtinicio}'`);
    if (dtfim      && dtfim.trim())      conds.push(`ne.dtlancamento <= '${dtfim}'`);

    if (idfornecedor && idcliente) {
      conds.push(`ne.idpessoa IN (${parseInt(idfornecedor)}, ${parseInt(idcliente)})`);
    } else if (idfornecedor && idfornecedor.trim()) {
      conds.push(`ne.idpessoa = ${parseInt(idfornecedor)}`);
    } else if (idcliente && idcliente.trim()) {
      conds.push(`ne.idpessoa = ${parseInt(idcliente)}`);
    }

    const where = conds.join(' AND ');

    const sql = `
      SELECT
        pa.idempresa,
        pa.idplanilha,
        pa.idproduto,
        trim(prod.codbar)                        AS codbar,
        trim(prod.descr)                         AS descr,
        pa.qtdproduto,
        trim(pa.embalagementrada)                AS embalagementrada,
        pa.valbaseipi,
        pa.peripi,
        pa.valipi,
        pa.pericms,
        CAST(pa.valbaseicms AS DECIMAL(12,6))    AS valbaseicms,
        pa.permargsubstituicao,
        CAST(pa.valicms     AS DECIMAL(12,6))    AS valicms,
        pa.valbaseicmssubstituido,
        pa.pericmsubstituido,
        pa.valicmsubstituido,
        CASE 
            WHEN CAST(pa.cfop AS VARCHAR(10)) = '1102' THEN '102'
            WHEN pa.sittrib IS NULL THEN ''
            WHEN pa.sittrib = '' THEN ''
            ELSE CAST(pa.sittrib AS VARCHAR(10))
        END AS sittrib,
        pa.valunitliquido,
        pa.valtotbruto,
        pa.valtotliquido,
        pa.numsequencia,
        pa.valdescontoprod,
        pa.valfrete,
        pa.valseguro,
        pa.valbasepis,
        pa.valbaseconfins,
        pa.perpis,
        pa.percofins,
        pa.valpis,
        pa.valcofins,
        CAST(pa.cfop AS VARCHAR(10))             AS cfop,
        pa.custonf,
        pa.custofornecedor,
        trim(pa.codncm)                          AS codncm,
        trim(pa.cstipi)                          AS cstipi,
        pa.valdifalentrada,
        pa.idpessoa                              AS pa_idpessoa,
        trim(pa.numnota)                         AS pa_numnota,
        trim(pa.serienota)                       AS pa_serienota,
        pa.idlote,
        pa.tipopis,
        pa.tipocofins,
        pa.cstpis,
        pa.cstcofins,
        trim(pa.numcodfornecedor)                AS numcodfornecedor,
        pa.flagestoque,
        pa.valunitbruto,
        pa.valembalagembruto,
        pa.valdespesasacessorias,
        pa.flagavu,
        pa.preconormal,
        pa.precovendaalterar,
        pa.valsugestaoprecovenda,
        pa.numetiquetas,

        ne.idpessoa                              AS ne_idpessoa,
        trim(pes.nome)                           AS nome,
        trim(pes.tipopessoa)                     AS tipopessoa,
        trim(ne.numnota)                         AS numnota,
        trim(ne.serienota)                       AS serienota,
        ne.dtemissao,
        ne.dtlancamento,
        ne.valnota,
        ne.valprodutos,
        ne.valbaseicms                           AS nota_valbaseicms,
        ne.valicms                               AS nota_valicms,
        ne.valbaseipi                            AS nota_valbaseipi,
        ne.valipi                                AS nota_valipi,
        ne.valbaseicmsub,
        ne.valicmsub,
        ne.valfrete,
        ne.valseguro,
        ne.valdesconto,
        ne.valoutrasdespesas,
        ne.valdifalentrada                       AS nota_valdifalentrada,
        trim(ne.chaveacessodanfe)                AS chaveacessodanfe,
        ne.modelo,
        ne.situacaonfe,
        ne.nroprotocolo,
        trim(ne.obsnota)                         AS obsnota,
        trim(ne.obssistema)                      AS obssistema,
        ne.dtcriacao,
        ne.dtalteracao,
        trim(top2.descr)                         AS descr_operacao
      FROM produto_analitico pa
        INNER JOIN produtos        prod ON prod.idproduto       = pa.idproduto
        INNER JOIN notas_entrada   ne   ON ne.idempresa         = pa.idempresa
                                       AND ne.idplanilha        = pa.idplanilha
        INNER JOIN pessoas         pes  ON pes.idpessoa         = ne.idpessoa
        INNER JOIN tipos_operacoes top2 ON top2.idtipooperacao  = ne.idoperacao
                                       AND top2.idempresa       = ne.idempresa
      WHERE ${where}
        AND ne.flagnotacancelada = 'F'
      ORDER BY ne.dtlancamento DESC, pa.idplanilha DESC, pa.numsequencia
      LIMIT 2000
    `;

    console.log('[SQL] Executando consulta...');
    const rows = await queryDB(sql);
    console.log(`[OK] ${rows.length} linha(s)`);

    const notasMap = new Map();
    rows.forEach(r => {
      const key = `${r.idempresa}_${r.idplanilha}`;
      if (!notasMap.has(key)) {
        notasMap.set(key, {
          idempresa:         r.idempresa,
          idplanilha:        r.idplanilha,
          idpessoa:          r.ne_idpessoa,
          nome:              r.nome              || '',
          tipopessoa:        r.tipopessoa        || '',
          numnota:           r.numnota           || '',
          serienota:         r.serienota         || '',
          dtemissao:         r.dtemissao,
          dtlancamento:      r.dtlancamento,
          valnota:           r.valnota           || 0,
          valprodutos:       r.valprodutos       || 0,
          valbaseicms:       r.nota_valbaseicms  || 0,
          valicms:           r.nota_valicms      || 0,
          valbaseipi:        r.nota_valbaseipi   || 0,
          valipi:            r.nota_valipi       || 0,
          valbaseicmsub:     r.valbaseicmsub     || 0,
          valicmsub:         r.valicmsub         || 0,
          valfrete:          r.valfrete          || 0,
          valseguro:         r.valseguro         || 0,
          valdesconto:       r.valdesconto       || 0,
          valoutrasdespesas: r.valoutrasdespesas || 0,
          valdifalentrada:   r.nota_valdifalentrada || 0,
          chaveacessodanfe:  r.chaveacessodanfe  || '',
          modelo:            r.modelo            || '',
          situacaonfe:       r.situacaonfe       || '',
          nroprotocolo:      r.nroprotocolo      || '',
          obsnota:           r.obsnota           || '',
          obssistema:        r.obssistema        || '',
          dtcriacao:         r.dtcriacao,
          dtalteracao:       r.dtalteracao,
          descr_operacao:    r.descr_operacao    || '',
          produtos: []
        });
      }
      notasMap.get(key).produtos.push({
        idproduto:               r.idproduto,
        codbar:                  r.codbar                  || '',
        descr:                   r.descr                   || '',
        qtdproduto:              r.qtdproduto              || 0,
        embalagementrada:        r.embalagementrada        || '',
        valunitliquido:          r.valunitliquido          || 0,
        valtotliquido:           r.valtotliquido           || 0,
        valtotbruto:             r.valtotbruto             || 0,
        cfop:                    r.cfop                    || '',
        codncm:                  r.codncm                  || '',
        pericms:                 r.pericms                 || 0,
        valbaseicms:             r.valbaseicms             || 0,
        valicms:                 r.valicms                 || 0,
        peripi:                  r.peripi                  || 0,
        valbaseipi:              r.valbaseipi              || 0,
        valipi:                  r.valipi                  || 0,
        sittrib:                 r.sittrib != null ? String(r.sittrib) : '',
        cstipi:                  r.cstipi                  || '',
        pericmsubstituido:       r.pericmsubstituido       || 0,
        valbaseicmssubstituido:  r.valbaseicmssubstituido  || 0,
        valicmsubstituido:       r.valicmsubstituido       || 0,
        perpis:                  r.perpis                  || 0,
        valbasepis:              r.valbasepis              || 0,
        valpis:                  r.valpis                  || 0,
        percofins:               r.percofins               || 0,
        valbaseconfins:          r.valbaseconfins          || 0,
        valcofins:               r.valcofins               || 0,
        custonf:                 r.custonf                 || 0,
        custofornecedor:         r.custofornecedor         || 0,
        valfrete:                r.valfrete                || 0,
        valseguro:               r.valseguro               || 0,
        valdescontoprod:         r.valdescontoprod         || 0,
        numsequencia:            r.numsequencia            || 0,
        idlote:                  r.idlote                  || '',
        numnota:                 r.pa_numnota              || '',
        serienota:               r.pa_serienota            || '',
        tipopis:                 r.tipopis                 || '',
        tipocofins:              r.tipocofins              || '',
        cstpis:                  r.cstpis                  || '',
        cstcofins:               r.cstcofins               || '',
        numcodfornecedor:        r.numcodfornecedor        || '',
        flagestoque:             r.flagestoque             || '',
        valunitbruto:            r.valunitbruto            || 0,
        valembalagembruto:       r.valembalagembruto       || 0,
        valdespesasacessorias:   r.valdespesasacessorias   || 0,
        flagavu:                 r.flagavu                 || '',
        preconormal:             r.preconormal             || 0,
        precovendaalterar:       r.precovendaalterar       || 0,
        valsugestaoprecovenda:   r.valsugestaoprecovenda   || 0,
        numetiquetas:            r.numetiquetas            || 0
      });
    });

    res.json(Array.from(notasMap.values()));
  } catch (e) {
    console.error('[ERRO /api/relatorio] message   :', e.message);
    console.error('[ERRO /api/relatorio] odbcErrors:', JSON.stringify(e.odbcErrors || null));
    res.status(500).json({ error: e.message, odbc: e.odbcErrors || null });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Servidor: http://localhost:${PORT}`);
  console.log(`🔌 DSN: ${DSN_NAME}\n`);
});