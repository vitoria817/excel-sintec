const express = require('express');
const odbc = require('odbc');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;
const DSN_NAME = 'SINTEC';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

async function getConnection() {
    return await odbc.connect(`DSN=${DSN_NAME}`);
}

// =============================================
//  ROTA PRINCIPAL
// =============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =============================================
//  RELATÓRIO PARA POSTGRESQL
// =============================================
app.get('/api/relatorio', async (req, res) => {
    const { idempresa, dtinicio, dtfim, idfornecedor } = req.query;

    let conditions = [];
    
    if (idempresa) conditions.push(`produto_analitico.idempresa = ${parseInt(idempresa)}`);
    if (idfornecedor) conditions.push(`produto_analitico.idpessoa = ${parseInt(idfornecedor)}`);
    if (dtinicio) conditions.push(`notas_entrada.dtlancamento >= '${dtinicio}'`);
    if (dtfim) conditions.push(`notas_entrada.dtlancamento <= '${dtfim}'`);
    
    conditions.push(`UPPER(TRIM(produto_analitico.flagentrada)) = 'T'`);
    
    const whereClause = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
        SELECT
            produto_analitico.idempresa,
            produto_analitico.idplanilha,
            produto_analitico.idproduto,
            produtos.codbar,
            TRIM(produtos.descr) || ' ' || COALESCE(of_nomeloteproduto(produto_analitico.idproduto, produto_analitico.idlote), '') AS descr,
            CAST('' AS CHAR(1)) AS bnt1,
            produto_analitico.qtdproduto,
            produto_analitico.embalagementrada,
            produto_analitico.gramaentrada,
            produto_analitico.qtdembalagem,
            produto_analitico.valbaseipi,
            produto_analitico.peripi,
            produto_analitico.valipi,
            produto_analitico.pericms,
            CAST(produto_analitico.valbaseicms AS DECIMAL(12,6)) AS valbaseicms,
            produto_analitico.permargsubstituicao,
            CAST(produto_analitico.valicms AS DECIMAL(12,6)) AS valicms,
            produto_analitico.valbaseicmssubstituido,
            produto_analitico.pericmsubstituido,
            produto_analitico.valicmsubstituido,
            produto_analitico.sittrib,
            produto_analitico.valunitbruto,
            produto_analitico.valembalagembruto,
            produto_analitico.valunitliquido,
            produto_analitico.valtotbruto,
            produto_analitico.valtotliquido,
            produto_analitico.idoperacao,
            produto_analitico.numsequencia,
            produto_analitico.dtvenda,
            produto_analitico.idusuario,
            produto_analitico.valdescontoprod,
            produto_analitico.valfrete,
            produto_analitico.valseguro,
            produto_analitico.valdespesasacessorias,
            produto_analitico.flagsaida,
            produto_analitico.flagentrada,
            produto_analitico.flagestoque,
            produto_analitico.qtdpedido,
            produto_analitico.perredtribaseicm,
            produto_analitico.perredtribicmsent,
            produto_analitico.valbasereduzidaicment,
            produto_analitico.valreduzidoicment,
            produto_analitico.idrepositorio,
            produto_analitico.idbonifica,
            produto_analitico.qtdunitbonifica,
            produto_analitico.qtdembbonifica,
            produto_analitico.flagatuacusto,
            produto_analitico.valunitbonificado,
            produto_analitico.valtotbonificado,
            produto_analitico.valbasepis,
            produto_analitico.valbaseconfins,
            produto_analitico.perpis,
            produto_analitico.percofins,
            produto_analitico.valpis,
            produto_analitico.valcofins,
            TRIM(produto_analitico.cfop) AS cfop,
            produto_analitico.flagcontrole,
            produto_analitico.custonf,
            produto_analitico.custoaquisicao,
            produto_analitico.custoequilibrio,
            produto_analitico.custofornecedor,
            TRIM(produto_analitico.cfopinverso) AS cfopinverso,
            produto_analitico.flaggeracreditoicms,
            produto_analitico.valdescontonota,
            produto_analitico.tipopis,
            produto_analitico.tipocofins,
            produto_analitico.flagutilizacfopinverso,
            produto_analitico.codtrib,
            TRIM(produto_analitico.codncm) AS codncm,
            produto_analitico.valoutrosfiscal,
            produto_analitico.valisentofiscal,
            produto_analitico.valicmsfiscal,
            produto_analitico.valbaseicmsfiscal,
            produto_analitico.aliquotaicmsfiscal,
            produto_analitico.valdiffiscal,
            produto_analitico.flagatuaprodsintetico,
            produto_analitico.flaglctotroca,
            produto_analitico.flagavu,
            produto_analitico.cstpis,
            produto_analitico.cstcofins,
            produto_analitico.valoutrospis,
            produto_analitico.valoutroscofins,
            produto_analitico.valisentopis,
            produto_analitico.valisentocofins,
            produto_analitico.flagautamixfornecedor,
            produto_analitico.idpessoa,
            TRIM(produto_analitico.numnota) AS numnota,
            TRIM(produto_analitico.serienota) AS serienota,
            produto_analitico.precovendaalterar,
            produto_analitico.tipoalteracaoprecovenda,
            produto_analitico.valsugestaoprecovenda,
            produto_analitico.preconormal,
            produto_analitico.numetiquetas,
            TRIM(produto_analitico.numcodfornecedor) AS numcodfornecedor,
            produto_analitico.idlote,
            produto_analitico.tipocomposicao,
            of_loteslcto(produto_analitico.idempresa, produto_analitico.idplanilha, produto_analitico.idproduto, produto_analitico.numsequencia, produto_analitico.idlote) AS lotes,
            
            -- Dados da nota
            notas_entrada.dtemissao,
            notas_entrada.dtlancamento,
            notas_entrada.chaveacessodanfe,
            notas_entrada.valnota,
            TRIM(pessoas.nome) AS nome_fornecedor,
            pessoas.tipopessoa
            
        FROM produto_analitico
        INNER JOIN produtos ON produto_analitico.idproduto = produtos.idproduto
        LEFT JOIN notas_entrada ON notas_entrada.idempresa = produto_analitico.idempresa AND notas_entrada.idplanilha = produto_analitico.idplanilha
        LEFT JOIN pessoas ON pessoas.idpessoa = produto_analitico.idpessoa
        WHERE 1=1
            ${whereClause}
        ORDER BY notas_entrada.dtlancamento DESC, produto_analitico.idplanilha DESC, produto_analitico.numsequencia
        LIMIT 500
    `;

    let connection;
    try {
        connection = await getConnection();
        console.log('[SQL] Executando consulta...');
        const result = await connection.query(query);
        console.log(`[OK] ${result.length} registros encontrados`);
        
        const notasMap = new Map();
        
        result.forEach(row => {
            const key = `${row.idempresa}_${row.idplanilha}`;
            
            if (!notasMap.has(key)) {
                notasMap.set(key, {
                    IDEMPRESA: row.idempresa,
                    IDPLANILHA: row.idplanilha,
                    IDPESSOA: row.idpessoa,
                    NOME_FORNECEDOR: row.nome_fornecedor,
                    NUMNOTA: row.numnota,
                    SERIENOTA: row.serienota,
                    DTEMISSAO: row.dtemissao,
                    DTLANCAMENTO: row.dtlancamento,
                    CHAVEACESSODANFE: row.chaveacessodanfe,
                    VALNOTA: row.valnota,
                    TIPOPESSOA: row.tipopessoa,
                    produtos: []
                });
            }
            
            if (row.idproduto) {
                notasMap.get(key).produtos.push({
                    IDPRODUTO: row.idproduto,
                    CODBAR: row.codbar,
                    DESCR: row.descr,
                    QTDPRODUTO: row.qtdproduto,
                    EMBALAGEMENTRADA: row.embalagementrada,
                    VALUNITLIQUIDO: row.valunitliquido,
                    VALTOTLIQUIDO: row.valtotliquido,
                    CFOP: row.cfop,
                    CODNCM: row.codncm,
                    PERICMS: row.pericms,
                    PERIPI: row.peripi,
                    SITTRIB: row.sittrib,
                    VALICMS: row.valicms,
                    VALBASEICMS: row.valbaseicms
                });
            }
        });
        
        const resultado = Array.from(notasMap.values());
        res.json(resultado);
        
    } catch (error) {
        console.error('[ERRO]', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.close();
    }
});

// =============================================
//  BUSCA PESSOA POR ID
// =============================================
app.get('/api/pessoa/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.json(null);
    
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.query(`
            SELECT idpessoa, TRIM(nome) as nome, TRIM(tipopessoa) as tipopessoa 
            FROM pessoas 
            WHERE idpessoa = ${id}
        `);
        res.json(result[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.close();
    }
});

// =============================================
//  START
// =============================================
app.listen(port, () => {
    console.log(`\n✅ Servidor rodando em http://localhost:${port}`);
    console.log(`📊 Relatório: http://localhost:${port}/`);
    console.log(`🔌 DSN ODBC: ${DSN_NAME}\n`);
});