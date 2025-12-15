import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { gerarRelatorioComIA, gerarDicaDashboard } from "./aiService";
import { sendEmail, gerarHTMLRelatorioLivre, gerarHTMLRelatorioCompleto } from "./emailService";
import { enviarResumoSemanal, verificarENotificarAlertas } from "./weeklyReport";

// Middleware para verificar se o utilizador é admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  }
  return next({ ctx });
});

// Middleware para verificar se o utilizador é gestor
const gestorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'gestor' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a gestores' });
  }
  
  // Buscar o gestor associado ao user
  const gestor = await db.getGestorByUserId(ctx.user.id);
  if (!gestor && ctx.user.role === 'gestor') {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
  }
  
  return next({ 
    ctx: { 
      ...ctx, 
      gestor: gestor || null 
    } 
  });
});

export const appRouter = router({
  system: systemRouter,
  
  // ==================== NOTIFICAÇÕES ====================
  notificacoes: router({
    enviarResumoSemanal: adminProcedure.mutation(async () => {
      const enviado = await enviarResumoSemanal();
      return { success: enviado };
    }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ==================== LOJAS ====================
  lojas: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllLojas();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getLojaById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        nome: z.string().min(1),
        contacto: z.string().optional(),
        email: z.string().email().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createLoja(input);
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        contacto: z.string().optional(),
        email: z.string().email().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateLoja(id, data);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLoja(input.id);
        return { success: true };
      }),
    
    getByGestor: gestorProcedure.query(async ({ ctx }) => {
      if (!ctx.gestor) return [];
      return await db.getLojasByGestorId(ctx.gestor.id);
    }),
  }),

  // ==================== GESTORES ====================
  gestores: router({
    list: adminProcedure.query(async () => {
      return await db.getAllGestores();
    }),
    
    create: adminProcedure
      .input(z.object({
        nome: z.string().min(1),
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const gestor = await db.createGestor(input.nome, input.email);
        return gestor;
      }),
    
    // update: Removido porque não há campos para atualizar
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGestor(input.id);
        return { success: true };
      }),
    
    associateLoja: adminProcedure
      .input(z.object({
        gestorId: z.number(),
        lojaId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.associateGestorLoja(input.gestorId, input.lojaId);
        return { success: true };
      }),
    
    removeLoja: adminProcedure
      .input(z.object({
        gestorId: z.number(),
        lojaId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.removeGestorLoja(input.gestorId, input.lojaId);
        return { success: true };
      }),
    
    getLojas: adminProcedure
      .input(z.object({ gestorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLojasByGestorId(input.gestorId);
      }),
    
    promoteToAdmin: adminProcedure
      .input(z.object({ gestorId: z.number() }))
      .mutation(async ({ input }) => {
        await db.promoteGestorToAdmin(input.gestorId);
        return { success: true };
      }),
  }),

  // ==================== RELATÓRIOS LIVRES ====================
  relatoriosLivres: router({
    list: gestorProcedure
      .input(z.object({ apenasNaoVistos: z.boolean().optional() }).optional())
      .query(async ({ ctx, input }) => {
      if (ctx.user.role === 'admin') {
        // Se filtro ativo, não marcar como vistos
        if (!input?.apenasNaoVistos) {
          await db.marcarRelatoriosLivresComoVistos();
        }
        const todos = await db.getAllRelatoriosLivres();
        if (input?.apenasNaoVistos) {
          return todos.filter((r: any) => !r.visto);
        }
        return todos;
      }
      if (!ctx.gestor) return [];
      return await db.getRelatoriosLivresByGestorId(ctx.gestor.id);
    }),
    
    countNaoVistos: adminProcedure.query(async () => {
      return await db.countRelatoriosLivresNaoVistos();
    }),
    
    create: gestorProcedure
      .input(z.object({
        lojaId: z.number(),
        dataVisita: z.date(),
        descricao: z.string().min(1),
        fotos: z.string().optional(),
        pendentes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        }
        
        const { pendentes, ...relatorioData } = input;
        const relatorio = await db.createRelatorioLivre({
          ...relatorioData,
          gestorId: ctx.gestor.id,
        });
        
        // Criar pendentes se existirem
        if (pendentes && pendentes.length > 0) {
          for (const descricao of pendentes) {
            await db.createPendente({
              lojaId: input.lojaId,
              relatorioId: relatorio.id,
              tipoRelatorio: 'livre',
              descricao,
            });
          }
        }
        
        return relatorio;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataVisita: z.date().optional(),
        descricao: z.string().min(1).optional(),
        fotos: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const relatorio = await db.getRelatorioLivreById(input.id);
        if (!relatorio) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Relatório não encontrado' });
        }
        
        // Admin pode editar qualquer relatório, gestor só os seus
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor || relatorio.gestorId !== gestor.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para editar este relatório' });
          }
        }
        
        return await db.updateRelatorioLivre(input.id, {
          dataVisita: input.dataVisita,
          descricao: input.descricao,
          fotos: input.fotos,
        });
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const relatorio = await db.getRelatorioLivreById(input.id);
        if (!relatorio) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Relatório não encontrado' });
        }
        
        // Admin pode apagar qualquer relatório, gestor só os seus
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor || relatorio.gestorId !== gestor.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para apagar este relatório' });
          }
        }
        
        // Apagar pendentes associados primeiro
        await db.deletePendentesByRelatorio(input.id, 'livre');
        
        return await db.deleteRelatorioLivre(input.id);
      }),
    
    enviarEmail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const relatorio = await db.getRelatorioLivreById(input.id);
        if (!relatorio) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Relatório não encontrado' });
        }
        
        // Obter dados da loja e gestor
        const loja = await db.getLojaById(relatorio.lojaId);
        const gestor = await db.getGestorById(relatorio.gestorId);
        
        if (!loja) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Loja não encontrada' });
        }
        
        if (!loja.email) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A loja não tem email configurado' });
        }
        
        // Obter pendentes do relatório
        const pendentes = await db.getPendentesByRelatorio(input.id, 'livre');
        
        // Gerar HTML do relatório
        const html = gerarHTMLRelatorioLivre({
          lojaNome: loja.nome,
          gestorNome: gestor?.nome || 'Desconhecido',
          dataVisita: relatorio.dataVisita,
          observacoes: relatorio.descricao || '',
          pendentes: pendentes.map(p => ({ descricao: p.descricao, resolvido: p.resolvido })),
        });
        
        // Enviar email
        const enviado = await sendEmail({
          to: loja.email,
          subject: `Relatório de Visita - ${loja.nome} - ${new Date(relatorio.dataVisita).toLocaleDateString('pt-PT')}`,
          html,
        });
        
        if (!enviado) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao enviar email' });
        }
        
        return { success: true, email: loja.email };
      }),
  }),

  // ==================== RELATÓRIOS COMPLETOS ====================
  relatoriosCompletos: router({
    list: gestorProcedure
      .input(z.object({ apenasNaoVistos: z.boolean().optional() }).optional())
      .query(async ({ ctx, input }) => {
      if (ctx.user.role === 'admin') {
        // Se filtro ativo, não marcar como vistos
        if (!input?.apenasNaoVistos) {
          await db.marcarRelatoriosCompletosComoVistos();
        }
        const todos = await db.getAllRelatoriosCompletos();
        if (input?.apenasNaoVistos) {
          return todos.filter((r: any) => !r.visto);
        }
        return todos;
      }
      if (!ctx.gestor) return [];
      return await db.getRelatoriosCompletosByGestorId(ctx.gestor.id);
    }),
    
    countNaoVistos: adminProcedure.query(async () => {
      return await db.countRelatoriosCompletosNaoVistos();
    }),
    
    create: gestorProcedure
      .input(z.object({
        lojaId: z.number(),
        dataVisita: z.date(),
        episFardamento: z.string().optional(),
        kitPrimeirosSocorros: z.string().optional(),
        consumiveis: z.string().optional(),
        espacoFisico: z.string().optional(),
        reclamacoes: z.string().optional(),
        vendasComplementares: z.string().optional(),
        fichasServico: z.string().optional(),
        documentacaoObrigatoria: z.string().optional(),
        reuniaoQuinzenal: z.boolean().optional(),
        resumoSupervisao: z.string().optional(),
        colaboradoresPresentes: z.string().optional(),
        pontosPositivos: z.string().optional(),
        pontosNegativos: z.string().optional(),
        fotos: z.string().optional(),
        pendentes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        }
        
        const { pendentes, ...relatorioData } = input;
        const relatorio = await db.createRelatorioCompleto({
          ...relatorioData,
          gestorId: ctx.gestor.id,
        });
        
        // Criar pendentes se existirem
        if (pendentes && pendentes.length > 0) {
          for (const descricao of pendentes) {
            await db.createPendente({
              lojaId: input.lojaId,
              relatorioId: relatorio.id,
              tipoRelatorio: 'completo',
              descricao,
            });
          }
        }
        
        // Verificar alertas de pontos negativos consecutivos
        if (input.pontosNegativos && input.pontosNegativos.trim()) {
          const loja = await db.getLojaById(input.lojaId);
          if (loja) {
            // Verificar e notificar em background (não bloquear a resposta)
            verificarENotificarAlertas(input.lojaId, loja.nome).catch(err => {
              console.error('[Alertas] Erro ao verificar alertas:', err);
            });
          }
        }
        
        return relatorio;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataVisita: z.date().optional(),
        episFardamento: z.string().optional(),
        kitPrimeirosSocorros: z.string().optional(),
        consumiveis: z.string().optional(),
        espacoFisico: z.string().optional(),
        reclamacoes: z.string().optional(),
        vendasComplementares: z.string().optional(),
        fichasServico: z.string().optional(),
        documentacaoObrigatoria: z.string().optional(),
        reuniaoQuinzenal: z.boolean().optional(),
        resumoSupervisao: z.string().optional(),
        colaboradoresPresentes: z.string().optional(),
        pontosPositivos: z.string().optional(),
        pontosNegativos: z.string().optional(),
        fotos: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const relatorio = await db.getRelatorioCompletoById(input.id);
        if (!relatorio) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Relatório não encontrado' });
        }
        
        // Admin pode editar qualquer relatório, gestor só os seus
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor || relatorio.gestorId !== gestor.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para editar este relatório' });
          }
        }
        
        const { id, ...updateData } = input;
        return await db.updateRelatorioCompleto(id, updateData);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const relatorio = await db.getRelatorioCompletoById(input.id);
        if (!relatorio) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Relatório não encontrado' });
        }
        
        // Admin pode apagar qualquer relatório, gestor só os seus
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor || relatorio.gestorId !== gestor.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para apagar este relatório' });
          }
        }
        
        // Apagar pendentes associados primeiro
        await db.deletePendentesByRelatorio(input.id, 'completo');
        
        return await db.deleteRelatorioCompleto(input.id);
      }),
  }),

  // ==================== RELATÓRIOS COM IA ====================
  relatoriosIA: router({    
    gerar: gestorProcedure
      .input(z.object({
        periodo: z.enum(["diario", "semanal", "mensal", "trimestral"])
      }))
      .query(async ({ input, ctx }) => {
        const gestorId = ctx.user.role === "admin" ? undefined : ctx.gestor?.id;
        return await gerarRelatorioComIA(input.periodo, gestorId);
      }),
  }),

  // ==================== DICA IA DASHBOARD ====================
  dicaIA: router({
    gerar: protectedProcedure
      .input(z.object({
        totalLojas: z.number(),
        totalGestores: z.number(),
        relatoriosLivresMes: z.number(),
        relatoriosCompletosMes: z.number(),
        pendentesAtivos: z.number(),
        alertasPendentes: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const dica = await gerarDicaDashboard({
          ...input,
          userName: ctx.user.name || 'Utilizador',
          userRole: ctx.user.role || 'user',
        });
        return { dica };
      }),
  }),

  // ==================== PENDENTES ====================
  pendentes: router({
    list: gestorProcedure
      .input(z.object({ apenasNaoVistos: z.boolean().optional() }).optional())
      .query(async ({ ctx, input }) => {
      if (ctx.user.role === 'admin') {
        // Se filtro ativo, não marcar como vistos
        if (!input?.apenasNaoVistos) {
          await db.marcarPendentesComoVistos();
        }
        const todos = await db.getAllPendentes();
        if (input?.apenasNaoVistos) {
          return todos.filter((p: any) => !p.visto && !p.resolvido);
        }
        return todos;
      }
      // Para gestores, retornar pendentes das suas lojas
      if (!ctx.gestor) return [];
      const lojas = await db.getLojasByGestorId(ctx.gestor.id);
      const pendentes = [];
      for (const loja of lojas) {
        const lojasPendentes = await db.getPendentesByLojaId(loja.id);
        pendentes.push(...lojasPendentes.map(p => ({ ...p, loja })));
      }
      return pendentes;
    }),
    
    countNaoVistos: adminProcedure.query(async () => {
      return await db.countPendentesNaoVistos();
    }),
    
    getByLoja: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPendentesByLojaId(input.lojaId);
      }),
    
    resolve: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.resolvePendente(input.id);
        return { success: true };
      }),
    
    delete: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePendente(input.id);
        return { success: true };
      }),
  }),

  // ==================== HISTÓRICO DE PONTOS ====================
  historicoPontos: router({
    byLoja: protectedProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        return await db.getHistoricoPontosByLojaId(input.lojaId);
      }),
    
    all: protectedProcedure.query(async () => {
      return await db.getHistoricoPontosAllLojas();
    }),
  }),

  // ==================== ALERTAS ====================
  alertas: router({
    checkLoja: protectedProcedure
      .input(z.object({ lojaId: z.number(), threshold: z.number().optional() }))
      .query(async ({ input }) => {
        const temAlerta = await db.checkAlertasPontosNegativos(input.lojaId, input.threshold || 3);
        return { temAlerta };
      }),
    
    lojasComAlertas: adminProcedure
      .input(z.object({ threshold: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getLojasComAlertasNegativos(input?.threshold || 3);
      }),
    
    // Listar todos os alertas
    list: adminProcedure.query(async () => {
      return await db.getAllAlertas();
    }),
    
    // Listar apenas alertas pendentes
    listPendentes: adminProcedure.query(async () => {
      return await db.getAlertasPendentes();
    }),
    
    // Obter alerta por ID
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAlertaById(input.id);
      }),
    
    // Criar novo alerta
    create: adminProcedure
      .input(z.object({
        lojaId: z.number(),
        tipo: z.enum(["pontos_negativos_consecutivos", "pendentes_antigos", "sem_visitas"]),
        descricao: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Verificar se já existe alerta pendente
        const existe = await db.existeAlertaPendente(input.lojaId, input.tipo);
        if (existe) {
          throw new Error("Já existe um alerta pendente deste tipo para esta loja");
        }
        return await db.createAlerta(input);
      }),
    
    // Atualizar estado do alerta
    updateEstado: adminProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(["pendente", "resolvido"]),
        notasResolucao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateAlertaEstado(input.id, input.estado, input.notasResolucao);
      }),
    
    // Eliminar alerta
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteAlerta(input.id);
      }),
  }),

  // ==================== CONFIGURAÇÕES DE ALERTAS ====================
  configuracoes: router({
    // Obter todas as configurações
    list: adminProcedure.query(async () => {
      return await db.getAllConfiguracoes();
    }),
    
    // Obter uma configuração específica
    get: adminProcedure
      .input(z.object({ chave: z.string() }))
      .query(async ({ input }) => {
        return await db.getConfiguracao(input.chave);
      }),
    
    // Atualizar uma configuração
    update: adminProcedure
      .input(z.object({
        chave: z.string(),
        valor: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.setConfiguracao(input.chave, input.valor);
      }),
    
    // Atualizar múltiplas configurações de uma vez
    updateMultiple: adminProcedure
      .input(z.array(z.object({
        chave: z.string(),
        valor: z.string(),
      })))
      .mutation(async ({ input }) => {
        const results = [];
        for (const config of input) {
          const result = await db.setConfiguracao(config.chave, config.valor);
          results.push(result);
        }
        return results;
      }),
  }),
});

export type AppRouter = typeof appRouter;
