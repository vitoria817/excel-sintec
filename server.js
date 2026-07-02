//tem que arumar do CST para trazer certo os valores, so ele
//arrumar o desingner para os fornecedores se destacarem no topo, não so um se destacar
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

    const conds = [`UPPER(TRIM(pa.flagentrada)) = 'T'`, `ne.flagnotacancelada = 'F'`];

    if (idempresa  && idempresa.trim())  conds.push(`pa.idempresa = ${parseInt(idempresa)}`);
    if (dtinicio   && dtinicio.trim())   conds.push(`ne.dtlancamento >= '${dtinicio}'`);
    if (dtfim      && dtfim.trim())      conds.push(`ne.dtlancamento <= '${dtfim} 23:59:59'`);

    if (idfornecedor && idcliente) {
      conds.push(`ne.idpessoa IN (${parseInt(idfornecedor)}, ${parseInt(idcliente)})`);
    } else if (idfornecedor && idfornecedor.trim()) {
      conds.push(`ne.idpessoa = ${parseInt(idfornecedor)}`);
    } else if (idcliente && idcliente.trim()) {
      conds.push(`ne.idpessoa = ${parseInt(idcliente)}`);
    }

    const where = conds.join(' AND ');

    // Mesmos campos/alias do RelatorioNotasEntrada.jrxml
    const sql = `
      SELECT
        pa.idempresa,
        pa.idplanilha,
        pa.idproduto,
        trim(prod.codbar)                                                       AS codbar,
        trim(prod.descr) || ' ' || of_nomeloteproduto(pa.idproduto, pa.idlote)   AS descr,
        pa.qtdproduto,
        trim(pa.embalagementrada)                                               AS embalagementrada,
        pa.gramaentrada,
        pa.qtdembalagem,
        pa.valbaseipi,
        pa.peripi,
        pa.valipi,
        pa.pericms,
        CAST(pa.valbaseicms AS DECIMAL(12,6))                                   AS valbaseicms,
        pa.permargsubstituicao,
        CAST(pa.valicms AS DECIMAL(12,6))                                       AS valicms,
        pa.valbaseicmssubstituido,
        pa.pericmsubstituido,
        pa.valicmsubstituido,
        trim(pa.sittrib)                                                        AS sittrib,
        CASE
            WHEN CAST(pa.cfop AS VARCHAR(10)) = '1102' THEN '102'
            WHEN pa.codtrib IS NULL THEN ''
            WHEN pa.codtrib = '' THEN ''
            ELSE CAST(pa.codtrib AS VARCHAR(10))
        END                                                                     AS codtrib,
        pa.valembalagembruto                                                    AS valunitbruto,
        pa.valunitbruto                                                         AS valembalagembruto,
        pa.valunitliquido,
        pa.valtotbruto,
        pa.valtotliquido,
        pa.numsequencia,
        pa.valdescontoprod,
        pa.valfrete,
        pa.valseguro,
        pa.valdespesasacessorias,
        pa.flagestoque,
        pa.qtdpedido,
        pa.perredtribaseicm,
        pa.perredtribicmsent,
        pa.valbasereduzidaicment,
        pa.valreduzidoicment,
        pa.idbonifica,
        pa.qtdunitbonifica,
        pa.qtdembbonifica,
        pa.valunitbonificado,
        pa.valtotbonificado,
        pa.valbasepis,
        pa.valbaseconfins,
        pa.perpis,
        pa.percofins,
        pa.valpis,
        pa.valcofins,
        CAST(pa.cfop AS VARCHAR(10))                                            AS cfop,
        pa.custonf,
        pa.custofornecedor,
        trim(pa.codncm)                                                         AS codncm,
        trim(pa.cstipi)                                                         AS cstipi,
        pa.valdifalentrada,
        pa.idpessoa                                                             AS pa_idpessoa,
        trim(pa.numnota)                                                        AS pa_numnota,
        trim(pa.serienota)                                                      AS pa_serienota,
        pa.idlote,
        pa.tipopis,
        pa.tipocofins,
        pa.cstpis,
        pa.cstcofins,
        trim(pa.numcodfornecedor)                                               AS numcodfornecedor,
        pa.flagavu,
        pa.preconormal,
        pa.precovendaalterar,
        pa.valsugestaoprecovenda,
        pa.numetiquetas,
        trim(pa.cfopinverso)                                                    AS cfopinverso,
        pa.valdescontonota,
        of_loteslcto(pa.idempresa, pa.idplanilha, pa.idproduto, pa.numsequencia, pa.idlote) AS lotes,
        re.idrepositorio,
        trim(COALESCE(re.descr, ''))                                            AS descr_estoque,

        ne.idpessoa                                                             AS ne_idpessoa,
        trim(pes.nome)                                                          AS nome,
        trim(pes.tipopessoa)                                                    AS tipopessoa,
        trim(ne.numnota)                                                        AS numnota,
        trim(ne.serienota)                                                      AS serienota,
        ne.dtemissao,
        ne.dtlancamento,
        ne.valnota,
        ne.valprodutos,
        ne.valbaseicms                                                          AS nota_valbaseicms,
        ne.valicms                                                              AS nota_valicms,
        ne.valbaseipi                                                           AS nota_valbaseipi,
        ne.valipi                                                               AS nota_valipi,
        ne.valbaseicmsub,
        ne.valicmsub,
        ne.valfrete                                                             AS nota_valfrete,
        ne.valseguro                                                            AS nota_valseguro,
        ne.valdesconto,
        ne.valoutrasdespesas,
        ne.valdifalentrada                                                      AS nota_valdifalentrada,
        trim(ne.chaveacessodanfe)                                               AS chaveacessodanfe,
        ne.modelo,
        ne.situacaonfe,
        CAST(ne.dhrecbto AS VARCHAR(30))                                        AS dhrecbto,
        ne.nroprotocolo,
        trim(ne.obsnota)                                                        AS obsnota,
        trim(ne.obssistema)                                                     AS obssistema,
        ne.dtcriacao,
        ne.dtalteracao,
        trim(top2.descr)                                                        AS descr_operacao,
        ne.flagnotacancelada,
        trim(CAST((SELECT nome FROM usuarios_sistema WHERE idusersystem = ne.idcriador)   AS CHAR(25))) AS criador,
        trim(CAST((SELECT nome FROM usuarios_sistema WHERE idusersystem = ne.idalterador) AS CHAR(25))) AS alterador
      FROM produto_analitico pa
        INNER JOIN produtos        prod ON prod.idproduto      = pa.idproduto
        INNER JOIN notas_entrada   ne   ON ne.idempresa        = pa.idempresa
                                       AND ne.idplanilha        = pa.idplanilha
        INNER JOIN pessoas         pes  ON pes.idpessoa         = ne.idpessoa
        INNER JOIN tipos_operacoes top2 ON top2.idtipooperacao  = ne.idoperacao
                                       AND top2.idempresa        = ne.idempresa
        LEFT JOIN repositorios_estoque re ON re.idrepositorio   = pa.idrepositorio
      WHERE ${where}
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
          modelo:            r.modelo            || '',
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
          valfrete:          r.nota_valfrete     || 0,
          valseguro:         r.nota_valseguro    || 0,
          valdesconto:       r.valdesconto       || 0,
          valoutrasdespesas: r.valoutrasdespesas || 0,
          valdifalentrada:   r.nota_valdifalentrada || 0,
          chaveacessodanfe:  r.chaveacessodanfe  || '',
          situacaonfe:       r.situacaonfe       || '',
          dhrecbto:          r.dhrecbto          || '',
          nroprotocolo:      r.nroprotocolo      || '',
          obsnota:           r.obsnota           || '',
          obssistema:        r.obssistema        || '',
          dtcriacao:         r.dtcriacao,
          dtalteracao:       r.dtalteracao,
          descr_operacao:    r.descr_operacao    || '',
          flagnotacancelada: r.flagnotacancelada || 'F',
          criador:           r.criador           || '',
          alterador:         r.alterador         || '',
          produtos: []
        });
      }
      notasMap.get(key).produtos.push({
        idproduto:               r.idproduto,
        codbar:                  r.codbar                  || '',
        descr:                   r.descr                   || '',
        codncm:                  r.codncm                  || '',
        numcodfornecedor:        r.numcodfornecedor        || '',
        codtrib:                 r.codtrib != null ? String(r.codtrib) : '',
        sittrib:                 r.sittrib                 || '',
        cfopinverso:             r.cfopinverso             || '',
        cfop:                    r.cfop                    || '',
        embalagementrada:        r.embalagementrada        || '',
        gramaentrada:            r.gramaentrada            || 0,
        qtdembalagem:            r.qtdembalagem            || 0,
        qtdproduto:              r.qtdproduto              || 0,
        valunitbruto:            r.valunitbruto            || 0,
        valembalagembruto:       r.valembalagembruto       || 0,
        valtotbruto:             r.valtotbruto             || 0,
        valdescontoprod:         r.valdescontoprod         || 0,
        valdescontonota:         r.valdescontonota         || 0,
        valfrete:                r.valfrete                || 0,
        valseguro:               r.valseguro               || 0,
        valdespesasacessorias:   r.valdespesasacessorias   || 0,
        valbaseipi:              r.valbaseipi              || 0,
        peripi:                  r.peripi                  || 0,
        valipi:                  r.valipi                  || 0,
        valbaseicms:             r.valbaseicms             || 0,
        perredtribaseicm:        r.perredtribaseicm        || 0,
        valbasereduzidaicment:   r.valbasereduzidaicment   || 0,
        pericms:                 r.pericms                 || 0,
        valreduzidoicment:       r.valreduzidoicment        || 0,
        valicms:                 r.valicms                 || 0,
        valbaseicmssubstituido:  r.valbaseicmssubstituido  || 0,
        permargsubstituicao:     r.permargsubstituicao     || 0,
        pericmsubstituido:       r.pericmsubstituido       || 0,
        valicmsubstituido:       r.valicmsubstituido       || 0,
        qtdpedido:               r.qtdpedido               || 0,
        idbonifica:              r.idbonifica              || '',
        qtdunitbonifica:         r.qtdunitbonifica         || 0,
        qtdembbonifica:          r.qtdembbonifica          || 0,
        valunitbonificado:       r.valunitbonificado       || 0,
        valtotbonificado:        r.valtotbonificado        || 0,
        valtotliquido:           r.valtotliquido           || 0,
        tipopis:                 r.tipopis                 || '',
        cstpis:                  r.cstpis                  || '',
        valbasepis:              r.valbasepis              || 0,
        perpis:                  r.perpis                  || 0,
        valpis:                  r.valpis                  || 0,
        tipocofins:              r.tipocofins              || '',
        cstcofins:               r.cstcofins               || '',
        valbaseconfins:          r.valbaseconfins          || 0,
        percofins:               r.percofins               || 0,
        valcofins:               r.valcofins                || 0,
        idlote:                  r.idlote                  || '',
        lotes:                   r.lotes                   || '',
        descr_estoque:           r.descr_estoque           || '',
        cstipi:                  r.cstipi                  || '',
        custonf:                 r.custonf                 || 0,
        custofornecedor:         r.custofornecedor         || 0,
        valdifalentrada:         r.valdifalentrada         || 0,
        numnota:                 r.pa_numnota              || '',
        serienota:               r.pa_serienota            || '',
        flagestoque:             r.flagestoque             || '',
        flagavu:                 r.flagavu                 || '',
        preconormal:             r.preconormal             || 0,
        precovendaalterar:       r.precovendaalterar       || 0,
        valsugestaoprecovenda:   r.valsugestaoprecovenda   || 0,
        numetiquetas:            r.numetiquetas            || 0,
        numsequencia:            r.numsequencia            || 0
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