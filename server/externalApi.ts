/**
 * API REST Externa - Endpoints públicos protegidos por API Key
 * Permite que aplicações externas acedam aos dados da plataforma
 * 
 * Base URL: /api/external
 * Autenticação: Header "X-API-Key: <chave>"
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from './db';
import { apiKeys, lojas, resultadosMensais, npsDados } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// ========== MIDDLEWARE: Validação de API Key ==========

interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: number;
    nome: string;
    permissoes: string[];
  };
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function validateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'] as string;

  if (!key) {
    return res.status(401).json({
      error: 'API key em falta',
      message: 'Inclua o header X-API-Key com a sua chave de acesso',
    });
  }

  try {
    const hash = hashKey(key);
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Base de dados indisponível' });
    }
    const [found] = await db
      .select({
        id: apiKeys.id,
        nome: apiKeys.nome,
        permissoes: apiKeys.permissoes,
        ativo: apiKeys.ativo,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, hash))
      .limit(1);

    if (!found) {
      return res.status(401).json({
        error: 'API key inválida',
        message: 'A chave fornecida não é reconhecida',
      });
    }

    if (!found.ativo) {
      return res.status(403).json({
        error: 'API key desativada',
        message: 'Esta chave foi desativada pelo administrador',
      });
    }

    if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
      return res.status(403).json({
        error: 'API key expirada',
        message: 'Esta chave expirou. Contacte o administrador para renovação',
      });
    }

    // Atualizar último uso e contador (fire-and-forget)
    db!.update(apiKeys)
      .set({
        ultimoUso: new Date(),
        totalRequests: sql`${apiKeys.totalRequests} + 1`,
      })
      .where(eq(apiKeys.id, found.id))
      .catch(() => {});

    req.apiKey = {
      id: found.id,
      nome: found.nome,
      permissoes: found.permissoes as string[],
    };

    next();
  } catch (error) {
    console.error('[External API] Erro na validação de API key:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey?.permissoes.includes(permission) && !req.apiKey?.permissoes.includes('*')) {
      return res.status(403).json({
        error: 'Permissão insuficiente',
        message: `Esta chave não tem permissão "${permission}". Permissões disponíveis: ${req.apiKey?.permissoes.join(', ')}`,
      });
    }
    next();
  };
}

// Aplicar middleware a todas as rotas
router.use(validateApiKey as any);

// ========== ENDPOINTS ==========

/**
 * GET /api/external/lojas
 * Lista todas as lojas
 * Permissão: "lojas" ou "resultados"
 */
router.get('/lojas', requirePermission('resultados') as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { zona } = req.query;

    const db = await getDb();
    if (!db) return res.status(500).json({ error: 'Base de dados indisponível' });

    const result = await db
      .select({
        id: lojas.id,
        nome: lojas.nome,
        numeroLoja: lojas.numeroLoja,
        subZona: lojas.subZona,
        localidade: lojas.localidade,
      })
      .from(lojas);

    // Filtrar por zona se fornecido
    const filtered = zona
      ? result.filter((l: any) => l.subZona?.toLowerCase().includes(String(zona).toLowerCase()))
      : result;

    return res.json({
      total: filtered.length,
      lojas: filtered,
    });
  } catch (error) {
    console.error('[External API] Erro ao listar lojas:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/external/resultados
 * Resultados mensais de todas as lojas ou filtrados
 * Permissão: "resultados"
 * 
 * Query params:
 *   - mes: número do mês (1-12)
 *   - ano: ano (ex: 2026)
 *   - lojaId: ID da loja (opcional)
 *   - zona: filtrar por zona (opcional)
 */
router.get('/resultados', requirePermission('resultados') as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mes, ano, lojaId, zona } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios em falta',
        message: 'Forneça os parâmetros "mes" (1-12) e "ano" (ex: 2026)',
        exemplo: '/api/external/resultados?mes=1&ano=2026',
      });
    }

    const mesNum = parseInt(String(mes));
    const anoNum = parseInt(String(ano));

    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({ error: 'Parâmetro "mes" inválido (1-12)' });
    }
    if (isNaN(anoNum) || anoNum < 2020 || anoNum > 2030) {
      return res.status(400).json({ error: 'Parâmetro "ano" inválido (2020-2030)' });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: 'Base de dados indisponível' });

    const conditions = [
      eq(resultadosMensais.mes, mesNum),
      eq(resultadosMensais.ano, anoNum),
    ];

    if (lojaId) {
      conditions.push(eq(resultadosMensais.lojaId, parseInt(String(lojaId))));
    }

    const resultados = await db
      .select({
        lojaId: resultadosMensais.lojaId,
        lojaNome: lojas.nome,
        zona: resultadosMensais.zona,
        mes: resultadosMensais.mes,
        ano: resultadosMensais.ano,
        totalServicos: resultadosMensais.totalServicos,
        objetivoMensal: resultadosMensais.objetivoMensal,
        objetivoDiaAtual: resultadosMensais.objetivoDiaAtual,
        desvioObjetivoAcumulado: resultadosMensais.desvioObjetivoAcumulado,
        desvioPercentualDia: resultadosMensais.desvioPercentualDia,
        desvioPercentualMes: resultadosMensais.desvioPercentualMes,
        taxaReparacao: resultadosMensais.taxaReparacao,
        qtdReparacoes: resultadosMensais.qtdReparacoes,
        qtdParaBrisas: resultadosMensais.qtdParaBrisas,
        gapReparacoes22: resultadosMensais.gapReparacoes22,
        servicosPorColaborador: resultadosMensais.servicosPorColaborador,
        numColaboradores: resultadosMensais.numColaboradores,
      })
      .from(resultadosMensais)
      .leftJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
      .where(and(...conditions));

    // Filtrar por zona se fornecido
    const filtered = zona
      ? resultados.filter((r: any) => r.zona?.toLowerCase().includes(String(zona).toLowerCase()))
      : resultados;

    // Calcular totais
    const totais = {
      totalServicos: filtered.reduce((s: number, r: any) => s + (r.totalServicos || 0), 0),
      totalObjetivo: filtered.reduce((s: number, r: any) => s + (r.objetivoMensal || 0), 0),
      totalReparacoes: filtered.reduce((s: number, r: any) => s + (r.qtdReparacoes || 0), 0),
      totalParaBrisas: filtered.reduce((s: number, r: any) => s + (r.qtdParaBrisas || 0), 0),
      mediaReparacao: 0,
    };
    if (totais.totalParaBrisas > 0) {
      totais.mediaReparacao = Math.round((totais.totalReparacoes / (totais.totalReparacoes + totais.totalParaBrisas)) * 10000) / 100;
    }

    return res.json({
      periodo: { mes: mesNum, ano: anoNum },
      total: filtered.length,
      totais,
      resultados: filtered.map((r: any) => ({
        ...r,
        // Converter decimais para números
        taxaReparacao: r.taxaReparacao ? parseFloat(String(r.taxaReparacao)) : null,
        desvioPercentualDia: r.desvioPercentualDia ? parseFloat(String(r.desvioPercentualDia)) : null,
        desvioPercentualMes: r.desvioPercentualMes ? parseFloat(String(r.desvioPercentualMes)) : null,
        objetivoDiaAtual: r.objetivoDiaAtual ? parseFloat(String(r.objetivoDiaAtual)) : null,
        desvioObjetivoAcumulado: r.desvioObjetivoAcumulado ? parseFloat(String(r.desvioObjetivoAcumulado)) : null,
        servicosPorColaborador: r.servicosPorColaborador ? parseFloat(String(r.servicosPorColaborador)) : null,
      })),
    });
  } catch (error) {
    console.error('[External API] Erro ao obter resultados:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/external/resultados/:lojaId
 * Resultados de uma loja específica (todos os meses disponíveis ou filtrado)
 * Permissão: "resultados"
 */
router.get('/resultados/:lojaId', requirePermission('resultados') as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lojaId = parseInt(req.params.lojaId);
    const { ano } = req.query;

    if (isNaN(lojaId)) {
      return res.status(400).json({ error: 'lojaId inválido' });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: 'Base de dados indisponível' });

    // Verificar se a loja existe
    const [loja] = await db.select().from(lojas).where(eq(lojas.id, lojaId)).limit(1);
    if (!loja) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    const conditions = [eq(resultadosMensais.lojaId, lojaId)];
    if (ano) {
      conditions.push(eq(resultadosMensais.ano, parseInt(String(ano))));
    }

    const resultados = await db
      .select()
      .from(resultadosMensais)
      .where(and(...conditions))
      .orderBy(resultadosMensais.ano, resultadosMensais.mes);

    return res.json({
      loja: {
        id: loja.id,
        nome: loja.nome,
        numeroLoja: loja.numeroLoja,
        subZona: loja.subZona,
      },
      total: resultados.length,
      resultados: resultados.map((r: any) => ({
        mes: r.mes,
        ano: r.ano,
        zona: r.zona,
        totalServicos: r.totalServicos,
        objetivoMensal: r.objetivoMensal,
        taxaReparacao: r.taxaReparacao ? parseFloat(String(r.taxaReparacao)) : null,
        qtdReparacoes: r.qtdReparacoes,
        qtdParaBrisas: r.qtdParaBrisas,
        gapReparacoes22: r.gapReparacoes22,
        desvioPercentualMes: r.desvioPercentualMes ? parseFloat(String(r.desvioPercentualMes)) : null,
        servicosPorColaborador: r.servicosPorColaborador ? parseFloat(String(r.servicosPorColaborador)) : null,
        numColaboradores: r.numColaboradores,
      })),
    });
  } catch (error) {
    console.error('[External API] Erro ao obter resultados da loja:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/external/nps
 * Dados NPS de todas as lojas para um ano
 * Permissão: "resultados"
 * 
 * Query params:
 *   - ano: ano (ex: 2026) - obrigatório
 *   - lojaId: ID da loja (opcional)
 */
router.get('/nps', requirePermission('resultados') as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ano, lojaId } = req.query;

    if (!ano) {
      return res.status(400).json({
        error: 'Parâmetro obrigatório em falta',
        message: 'Forneça o parâmetro "ano" (ex: 2026)',
        exemplo: '/api/external/nps?ano=2026',
      });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: 'Base de dados indisponível' });

    const anoNum = parseInt(String(ano));
    const conditions = [eq(npsDados.ano, anoNum)];
    if (lojaId) {
      conditions.push(eq(npsDados.lojaId, parseInt(String(lojaId))));
    }

    const dados = await db
      .select({
        lojaId: npsDados.lojaId,
        lojaNome: lojas.nome,
        ano: npsDados.ano,
        npsJan: npsDados.npsJan,
        npsFev: npsDados.npsFev,
        npsMar: npsDados.npsMar,
        npsAbr: npsDados.npsAbr,
        npsMai: npsDados.npsMai,
        npsJun: npsDados.npsJun,
        npsJul: npsDados.npsJul,
        npsAgo: npsDados.npsAgo,
        npsSet: npsDados.npsSet,
        npsOut: npsDados.npsOut,
        npsNov: npsDados.npsNov,
        npsDez: npsDados.npsDez,
        npsAnoTotal: npsDados.npsAnoTotal,
        taxaRespostaJan: npsDados.taxaRespostaJan,
        taxaRespostaFev: npsDados.taxaRespostaFev,
        taxaRespostaMar: npsDados.taxaRespostaMar,
        taxaRespostaAbr: npsDados.taxaRespostaAbr,
        taxaRespostaMai: npsDados.taxaRespostaMai,
        taxaRespostaJun: npsDados.taxaRespostaJun,
        taxaRespostaJul: npsDados.taxaRespostaJul,
        taxaRespostaAgo: npsDados.taxaRespostaAgo,
        taxaRespostaSet: npsDados.taxaRespostaSet,
        taxaRespostaOut: npsDados.taxaRespostaOut,
        taxaRespostaNov: npsDados.taxaRespostaNov,
        taxaRespostaDez: npsDados.taxaRespostaDez,
        taxaRespostaAnoTotal: npsDados.taxaRespostaAnoTotal,
      })
      .from(npsDados)
      .leftJoin(lojas, eq(npsDados.lojaId, lojas.id))
      .where(and(...conditions));

    // Converter decimais para percentagens
    const mesesKeys = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const formatted = dados.map((d: any) => {
      const nps: Record<string, number | null> = {};
      const taxaResposta: Record<string, number | null> = {};
      
      mesesKeys.forEach((m, i) => {
        const npsKey = `nps${m}` as keyof typeof d;
        const taxaKey = `taxaResposta${m}` as keyof typeof d;
        nps[m.toLowerCase()] = d[npsKey] ? Math.round(parseFloat(String(d[npsKey])) * 10000) / 100 : null;
        taxaResposta[m.toLowerCase()] = d[taxaKey] ? Math.round(parseFloat(String(d[taxaKey])) * 10000) / 100 : null;
      });

      return {
        lojaId: d.lojaId,
        lojaNome: d.lojaNome,
        ano: d.ano,
        nps,
        npsAnual: d.npsAnoTotal ? Math.round(parseFloat(String(d.npsAnoTotal)) * 10000) / 100 : null,
        taxaResposta,
        taxaRespostaAnual: d.taxaRespostaAnoTotal ? Math.round(parseFloat(String(d.taxaRespostaAnoTotal)) * 10000) / 100 : null,
      };
    });

    return res.json({
      ano: anoNum,
      total: formatted.length,
      dados: formatted,
    });
  } catch (error) {
    console.error('[External API] Erro ao obter NPS:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/external/docs
 * Documentação da API
 */
router.get('/docs', (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    nome: 'PoweringEG External API',
    versao: '1.0',
    autenticacao: {
      tipo: 'API Key',
      header: 'X-API-Key',
      descricao: 'Inclua a sua chave de API no header X-API-Key de cada request',
    },
    endpoints: [
      {
        metodo: 'GET',
        path: '/api/external/lojas',
        descricao: 'Lista todas as lojas',
        permissao: 'resultados',
        parametros: [
          { nome: 'zona', tipo: 'string', obrigatorio: false, descricao: 'Filtrar por zona (parcial)' },
        ],
      },
      {
        metodo: 'GET',
        path: '/api/external/resultados',
        descricao: 'Resultados mensais de todas as lojas',
        permissao: 'resultados',
        parametros: [
          { nome: 'mes', tipo: 'number', obrigatorio: true, descricao: 'Mês (1-12)' },
          { nome: 'ano', tipo: 'number', obrigatorio: true, descricao: 'Ano (ex: 2026)' },
          { nome: 'lojaId', tipo: 'number', obrigatorio: false, descricao: 'Filtrar por ID da loja' },
          { nome: 'zona', tipo: 'string', obrigatorio: false, descricao: 'Filtrar por zona (parcial)' },
        ],
      },
      {
        metodo: 'GET',
        path: '/api/external/resultados/:lojaId',
        descricao: 'Histórico de resultados de uma loja específica',
        permissao: 'resultados',
        parametros: [
          { nome: 'ano', tipo: 'number', obrigatorio: false, descricao: 'Filtrar por ano' },
        ],
      },
      {
        metodo: 'GET',
        path: '/api/external/nps',
        descricao: 'Dados NPS e Taxa de Resposta de todas as lojas',
        permissao: 'resultados',
        parametros: [
          { nome: 'ano', tipo: 'number', obrigatorio: true, descricao: 'Ano (ex: 2026)' },
          { nome: 'lojaId', tipo: 'number', obrigatorio: false, descricao: 'Filtrar por ID da loja' },
        ],
      },
    ],
    notas: [
      'Todos os valores NPS e Taxa de Resposta são devolvidos em percentagem (0-100)',
      'Os valores de desvio percentual são devolvidos em decimal (0.0-1.0)',
      'A API tem rate limiting implícito - evite mais de 60 requests/minuto',
    ],
  });
});

export { router as externalApiRouter };
