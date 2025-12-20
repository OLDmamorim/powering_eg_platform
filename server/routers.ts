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
import { gerarPrevisoes, gerarEGuardarPrevisoes } from "./previsaoService";
import { gerarSugestoesMelhoria, formatarRelatorioLivre, formatarRelatorioCompleto } from "./sugestaoService";
import { gerarPlanoVisitasSemanal, gerarPlanosSemanaisParaTodosGestores, verificarEGerarPlanosSexta } from "./planoVisitasService";
import { notificarGestorRelatorioAdmin } from "./notificacaoGestor";

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
        email: z.string().email().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        minimoRelatoriosLivres: z.number().min(0).optional(),
        minimoRelatoriosCompletos: z.number().min(0).optional(),
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
      // Admin vê todas as lojas (verificar ANTES de ctx.gestor)
      if (ctx.user?.role === 'admin') {
        return await db.getAllLojas();
      }
      // Gestor vê apenas as suas lojas
      if (!ctx.gestor) return [];
      return await db.getLojasByGestorId(ctx.gestor.id);
    }),
    
    importExcel: adminProcedure
      .input(z.object({
        base64Data: z.string(),
      }))
      .mutation(async ({ input }) => {
        const XLSX = await import('xlsx');
        
        // Converter base64 para buffer
        const buffer = Buffer.from(input.base64Data, 'base64');
        
        // Ler ficheiro Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converter para JSON
        const data = XLSX.utils.sheet_to_json(worksheet) as Array<{
          Nome?: string;
          Email?: string;
        }>;
        
        const resultados = {
          importadas: 0,
          ignoradas: 0,
          erros: [] as Array<{ linha: number; motivo: string }>,
        };
        
        // Obter lojas existentes para verificar duplicados
        const lojasExistentes = await db.getAllLojas();
        const nomesExistentes = new Set(lojasExistentes.map(l => l.nome.toLowerCase().trim()));
        
        // Processar cada linha
        for (let i = 0; i < data.length; i++) {
          const linha = data[i];
          const numeroLinha = i + 2; // +2 porque linha 1 é cabeçalho e arrays começam em 0
          
          try {
            // Validar campos obrigatórios
            if (!linha.Nome || linha.Nome.trim() === '') {
              resultados.erros.push({
                linha: numeroLinha,
                motivo: 'Nome é obrigatório',
              });
              continue;
            }
            
            // Verificar se loja já existe (ignorar duplicados)
            if (nomesExistentes.has(linha.Nome.trim().toLowerCase())) {
              resultados.ignoradas++;
              continue;
            }
            
            // Validar email se fornecido
            if (linha.Email && linha.Email.trim() !== '') {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(linha.Email)) {
                resultados.erros.push({
                  linha: numeroLinha,
                  motivo: 'Email inválido',
                });
                continue;
              }
            }
            
            // Criar loja
            await db.createLoja({
              nome: linha.Nome.trim(),
              email: linha.Email?.trim() || undefined,
            });
            
            // Adicionar ao set para evitar duplicados no mesmo ficheiro
            nomesExistentes.add(linha.Nome.trim().toLowerCase());
            
            resultados.importadas++;
          } catch (error) {
            resultados.erros.push({
              linha: numeroLinha,
              motivo: error instanceof Error ? error.message : 'Erro desconhecido',
            });
          }
        }
        
        return resultados;
      }),
    
    getProgresso: protectedProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        return await db.calcularProgressoRelatorios(input.lojaId);
      }),
    
    getProgressoGestor: gestorProcedure
      .query(async ({ ctx }) => {
        if (!ctx.gestor) return [];
        return await db.getProgressoTodasLojasGestor(ctx.gestor.id);
      }),
    
    getAtrasosGestor: gestorProcedure
      .query(async ({ ctx }) => {
        if (!ctx.gestor) return [];
        return await db.verificarAtrasosGestor(ctx.gestor.id);
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
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1),
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        await db.updateGestor(input.id, input.nome, input.email);
        return { success: true };
      }),
    
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
    
    checkReminder: gestorProcedure
      .query(async ({ ctx }) => {
        if (!ctx.gestor) return { needed: false };
        const needed = await db.checkReminderNeeded(ctx.gestor.id);
        return { needed };
      }),
    
    dismissReminder: gestorProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.gestor) throw new TRPCError({ code: 'UNAUTHORIZED' });
        await db.updateReminderDate(ctx.gestor.id);
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
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const relatorio = await db.getRelatorioLivreById(input.id);
        if (!relatorio) return null;
        
        // Obter dados relacionados
        const loja = await db.getLojaById(relatorio.lojaId);
        const gestor = await db.getGestorById(relatorio.gestorId);
        
        return {
          ...relatorio,
          loja,
          gestor,
        };
      }),
    
    create: gestorProcedure
      .input(z.object({
        lojasIds: z.array(z.number()).min(1),
        dataVisita: z.date(),
        descricao: z.string().min(1),
        comentarioAdmin: z.string().optional(),
        fotos: z.string().optional(),
        pendentes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        }
        
        const { pendentes, lojasIds, ...relatorioData } = input;
        
        // Criar relatório com primeira loja (compatibilidade) e array de lojas
        const relatorio = await db.createRelatorioLivre({
          ...relatorioData,
          lojaId: lojasIds[0], // Primeira loja para compatibilidade
          lojasIds: JSON.stringify(lojasIds), // Array de lojas em JSON
          gestorId: ctx.gestor.id,
        });
        
        // Criar pendentes se existirem (apenas para primeira loja)
        if (pendentes && pendentes.length > 0) {
          for (const descricao of pendentes) {
            await db.createPendente({
              lojaId: lojasIds[0],
              relatorioId: relatorio.id,
              tipoRelatorio: 'livre',
              descricao,
            });
            
            // Registar atividade de pendente criado
            await db.registarAtividade({
              gestorId: ctx.gestor.id,
              lojaId: lojasIds[0],
              tipo: 'pendente_criado',
              descricao: `Novo pendente criado: ${descricao.substring(0, 50)}...`,
            });
          }
        }
        
        // Registar atividade de relatório criado para cada loja
        for (const lojaId of lojasIds) {
          const loja = await db.getLojaById(lojaId);
          await db.registarAtividade({
            gestorId: ctx.gestor.id,
            lojaId,
            tipo: 'relatorio_livre',
            descricao: `Relatório livre criado para ${loja?.nome || 'loja'}`,
            metadata: { relatorioId: relatorio.id },
          });
        }
        
        // Gerar sugestões de melhoria com IA (async, não bloqueia)
        const conteudo = formatarRelatorioLivre({
          descricao: input.descricao,
          dataVisita: input.dataVisita,
        });
        gerarSugestoesMelhoria(relatorio.id, 'livre', lojasIds[0], ctx.gestor.id, conteudo)
          .catch(err => console.error('[Sugestões] Erro ao gerar:', err));
        
        // Se admin criou o relatório, notificar gestor responsável pela loja
        if (ctx.user.role === 'admin') {
          notificarGestorRelatorioAdmin(relatorio.id, 'livre', lojasIds[0], ctx.user.name || 'Admin')
            .catch((err: unknown) => console.error('[Email] Erro ao notificar gestor:', err));
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
        
        // Parsear fotos do JSON
        let fotos: string[] = [];
        if (relatorio.fotos) {
          try {
            fotos = JSON.parse(relatorio.fotos);
          } catch (e) {
            console.error('Erro ao parsear fotos:', e);
          }
        }
        
        // Preparar anexos de fotos (fazer download do S3 e converter para base64)
        const fotoAttachments = await Promise.all(
          fotos.map(async (fotoUrl, index) => {
            try {
              const response = await fetch(fotoUrl);
              const buffer = await response.arrayBuffer();
              const base64 = Buffer.from(buffer).toString('base64');
              return {
                filename: `foto_${index + 1}.jpg`,
                content: base64,
                contentType: 'image/jpeg',
              };
            } catch (error) {
              console.error(`Erro ao fazer download da foto ${index + 1}:`, error);
              return null;
            }
          })
        );
        
        // Filtrar anexos que falharam
        const validAttachments = fotoAttachments.filter(a => a !== null) as Array<{filename: string; content: string; contentType: string}>;
        
        // Gerar HTML do relatório (sem fotos inline, pois serão anexos)
        const html = gerarHTMLRelatorioLivre({
          lojaNome: loja.nome,
          gestorNome: gestor?.nome || 'Desconhecido',
          dataVisita: relatorio.dataVisita,
          observacoes: relatorio.descricao || '',
          pendentes: pendentes.map(p => ({ descricao: p.descricao, resolvido: p.resolvido })),
          fotos: undefined, // Não incluir fotos inline, serão anexos
        });
        
        // Enviar email com fotos como anexos
        const enviado = await sendEmail({
          to: loja.email,
          subject: `Relatório de Visita - ${loja.nome} - ${new Date(relatorio.dataVisita).toLocaleDateString('pt-PT')}`,
          html: html + (validAttachments.length > 0 ? `<p style="margin-top: 20px; color: #10b981;"><strong>📷 ${validAttachments.length} foto(s) anexada(s) a este email</strong></p>` : ''),
          attachments: validAttachments,
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
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const relatorio = await db.getRelatorioCompletoById(input.id);
        if (!relatorio) return null;
        
        // Obter dados relacionados
        const loja = await db.getLojaById(relatorio.lojaId);
        const gestor = await db.getGestorById(relatorio.gestorId);
        
        return {
          ...relatorio,
          loja,
          gestor,
        };
      }),
    
    create: gestorProcedure
      .input(z.object({
        lojasIds: z.array(z.number()).min(1),
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
        comentarioAdmin: z.string().optional(),
        fotos: z.string().optional(),
        pendentes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        }
        
        const { pendentes, lojasIds, ...relatorioData } = input;
        
        // Criar relatório com primeira loja (compatibilidade) e array de lojas
        const relatorio = await db.createRelatorioCompleto({
          ...relatorioData,
          lojaId: lojasIds[0], // Primeira loja para compatibilidade
          lojasIds: JSON.stringify(lojasIds), // Array de lojas em JSON
          gestorId: ctx.gestor.id,
        });
        
        // Criar pendentes se existirem (apenas para primeira loja)
        if (pendentes && pendentes.length > 0) {
          for (const descricao of pendentes) {
            await db.createPendente({
              lojaId: lojasIds[0],
              relatorioId: relatorio.id,
              tipoRelatorio: 'completo',
              descricao,
            });
            
            // Registar atividade de pendente criado
            await db.registarAtividade({
              gestorId: ctx.gestor.id,
              lojaId: lojasIds[0],
              tipo: 'pendente_criado',
              descricao: `Novo pendente criado: ${descricao.substring(0, 50)}...`,
            });
          }
        }
        
        // Registar atividade de relatório criado para cada loja
        for (const lojaId of lojasIds) {
          const lojaInfo = await db.getLojaById(lojaId);
          await db.registarAtividade({
            gestorId: ctx.gestor.id,
            lojaId,
            tipo: 'relatorio_completo',
            descricao: `Relatório completo criado para ${lojaInfo?.nome || 'loja'}`,
            metadata: { relatorioId: relatorio.id },
          });
        }
        
        // Gerar sugestões de melhoria com IA (async, não bloqueia)
        const { lojasIds: _, ...inputSemLojasIds } = input;
        const conteudoCompleto = formatarRelatorioCompleto(inputSemLojasIds);
        gerarSugestoesMelhoria(relatorio.id, 'completo', lojasIds[0], ctx.gestor.id, conteudoCompleto)
          .catch(err => console.error('[Sugestões] Erro ao gerar:', err));
        
        // Se admin criou o relatório, notificar gestor responsável pela loja
        if (ctx.user.role === 'admin') {
          notificarGestorRelatorioAdmin(relatorio.id, 'completo', lojasIds[0], ctx.user.name || 'Admin')
            .catch((err: unknown) => console.error('[Email] Erro ao notificar gestor:', err));
        }
        
        // Verificar alertas de pontos negativos consecutivos (apenas primeira loja)
        if (input.pontosNegativos && input.pontosNegativos.trim()) {
          const loja = await db.getLojaById(lojasIds[0]);
          if (loja) {
            // Verificar e notificar em background (não bloquear a resposta)
            verificarENotificarAlertas(lojasIds[0], loja.nome).catch(err => {
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
    
    enviarEmail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const relatorio = await db.getRelatorioCompletoById(input.id);
        if (!relatorio) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Relatório não encontrado' });
        }
        
        // Obter dados da loja e gestor
        const loja = await db.getLojaById(relatorio.lojaId);
        const gestor = await db.getGestorById(relatorio.gestorId);
        
        if (!loja) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Loja não encontrada' });
        }
        
        // Obter pendentes
        const pendentes = await db.getPendentesByRelatorio(relatorio.id, 'completo');
        
        // Parsear fotos do JSON
        let fotos: string[] = [];
        if (relatorio.fotos) {
          try {
            fotos = JSON.parse(relatorio.fotos);
          } catch (e) {
            console.error('Erro ao parsear fotos:', e);
          }
        }
        
        // Preparar anexos de fotos (fazer download do S3 e converter para base64)
        const fotoAttachments = await Promise.all(
          fotos.map(async (fotoUrl, index) => {
            try {
              const response = await fetch(fotoUrl);
              const buffer = await response.arrayBuffer();
              const base64 = Buffer.from(buffer).toString('base64');
              return {
                filename: `foto_${index + 1}.jpg`,
                content: base64,
                contentType: 'image/jpeg',
              };
            } catch (error) {
              console.error(`Erro ao fazer download da foto ${index + 1}:`, error);
              return null;
            }
          })
        );
        
        // Filtrar anexos que falharam
        const validAttachments = fotoAttachments.filter(a => a !== null) as Array<{filename: string; content: string; contentType: string}>;
        
        // Gerar HTML do relatório (sem fotos inline, pois serão anexos)
        const html = gerarHTMLRelatorioCompleto({
          lojaNome: loja.nome,
          gestorNome: gestor?.nome || 'Desconhecido',
          dataVisita: relatorio.dataVisita,
          observacoesGerais: relatorio.resumoSupervisao || '',
          pontosPositivos: relatorio.pontosPositivos || '',
          pontosNegativos: relatorio.pontosNegativos || '',
          pendentes: pendentes.map(p => ({ descricao: p.descricao, resolvido: p.resolvido })),
          fotos: undefined, // Não incluir fotos inline, serão anexos
        });
        
        // Enviar email
        if (!loja.email) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Loja não tem email configurado' });
        }
        
        const enviado = await sendEmail({
          to: loja.email,
          subject: `Relatório Completo de Visita - ${loja.nome} - ${new Date(relatorio.dataVisita).toLocaleDateString('pt-PT')}`,
          html: html + (validAttachments.length > 0 ? `<p style="margin-top: 20px; color: #10b981;"><strong>📷 ${validAttachments.length} foto(s) anexada(s) a este email</strong></p>` : ''),
          attachments: validAttachments,
        });
        
        if (!enviado) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao enviar email' });
        }
        
        return { success: true, email: loja.email };
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
    
    getHistorico: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role === "admin") {
          // Admin vê todos os relatórios IA
          return await db.getHistoricoRelatoriosIA();
        } else {
          // Gestor vê apenas seus próprios relatórios
          return await db.getHistoricoRelatoriosIAByGestor(ctx.user.id);
        }
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getRelatorioIACategoriaById(input.id);
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
        pendentes.push(...lojasPendentes);
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
      .mutation(async ({ input, ctx }) => {
        // Obter info do pendente antes de resolver
        const pendente = await db.getPendenteById(input.id);
        
        await db.resolvePendente(input.id);
        
        // Registar atividade de pendente resolvido
        if (pendente && ctx.gestor) {
          await db.registarAtividade({
            gestorId: ctx.gestor.id,
            lojaId: pendente.lojaId,
            tipo: 'pendente_resolvido',
            descricao: `Pendente resolvido: ${pendente.descricao?.substring(0, 50) || 'sem descrição'}...`,
          });
        }
        
        return { success: true };
      }),
    
    unresolve: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.unresolvePendente(input.id);
        return { success: true };
      }),
    
    delete: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePendente(input.id);
        return { success: true };
      }),
    
    // Criar novo pendente (admin)
    criar: adminProcedure
      .input(z.object({
        lojaId: z.number(),
        descricao: z.string().min(1),
        dataLimite: z.string().optional(), // ISO date string
      }))
      .mutation(async ({ input }) => {
        const pendente = await db.createPendente({
          lojaId: input.lojaId,
          descricao: input.descricao,
          dataLimite: input.dataLimite ? new Date(input.dataLimite) : undefined,
        });
        
        // Enviar notificação ao gestor responsável pela loja
        try {
          const loja = await db.getLojaById(input.lojaId);
          const gestoresLoja = await db.getGestoresByLojaId(input.lojaId);
          
          if (gestoresLoja.length > 0 && loja) {
            const gestorNomes = gestoresLoja.map((g: any) => g.user?.name || 'Gestor').join(', ');
            const prazoTexto = input.dataLimite 
              ? ` com prazo até ${new Date(input.dataLimite).toLocaleDateString('pt-PT')}`
              : '';
            
            // Registar atividade para notificar gestores
            await db.registarAtividade({
              gestorId: gestoresLoja[0].id,
              lojaId: input.lojaId,
              tipo: 'pendente_criado',
              descricao: `Novo pendente criado pelo admin para ${loja.nome}${prazoTexto}: ${input.descricao.substring(0, 50)}...`,
            });
          }
        } catch (e) {
          console.error('Erro ao notificar gestor:', e);
        }
        
        return pendente;
      }),
    
    // Atualizar múltiplos pendentes (resolvido ou continua)
    updateBatch: gestorProcedure
      .input(z.object({
        pendentes: z.array(z.object({
          id: z.number(),
          status: z.enum(['resolvido', 'continua']),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        for (const p of input.pendentes) {
          if (p.status === 'resolvido') {
            const pendente = await db.getPendenteById(p.id);
            await db.resolvePendente(p.id);
            
            // Registar atividade
            if (pendente && ctx.gestor) {
              await db.registarAtividade({
                gestorId: ctx.gestor.id,
                lojaId: pendente.lojaId,
                tipo: 'pendente_resolvido',
                descricao: `Pendente resolvido: ${pendente.descricao?.substring(0, 50) || 'sem descrição'}...`,
              });
            }
          }
          // Se "continua", não fazemos nada - o pendente permanece ativo
        }
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

  // ==================== PREVISÕES ====================
  previsoes: router({
    // Obter previsões ativas
    list: adminProcedure.query(async () => {
      return await db.getPrevisoesAtivas();
    }),
    
    // Gerar novas previsões com IA
    gerar: adminProcedure.mutation(async () => {
      const resultado = await gerarPrevisoes();
      return resultado;
    }),
    
    // Gerar e guardar previsões
    gerarEGuardar: adminProcedure.mutation(async () => {
      const count = await gerarEGuardarPrevisoes();
      return { count };
    }),
    
    // Atualizar estado de uma previsão
    atualizarEstado: adminProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(['ativa', 'confirmada', 'descartada']),
      }))
      .mutation(async ({ input }) => {
        await db.atualizarEstadoPrevisao(input.id, input.estado);
        return { success: true };
      }),
  }),

  // ==================== ATIVIDADES (Feed) ====================
  atividades: router({
    // Obter atividades recentes
    list: adminProcedure
      .input(z.object({ limite: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAtividadesRecentes(input?.limite || 50);
      }),
  }),

  // ==================== PLANOS DE VISITAS ====================
  planosVisitas: router({
    // Obter plano atual do gestor
    atual: gestorProcedure.query(async ({ ctx }) => {
      if (!ctx.gestor) return null;
      return await db.getPlanoVisitasAtual(ctx.gestor.id);
    }),
    
    // Obter plano da próxima semana
    proximaSemana: gestorProcedure.query(async ({ ctx }) => {
      if (!ctx.gestor) return null;
      return await db.getPlanoVisitasProximaSemana(ctx.gestor.id);
    }),
    
    // Gerar plano para um gestor específico (admin)
    gerarParaGestor: adminProcedure
      .input(z.object({ gestorId: z.number() }))
      .mutation(async ({ input }) => {
        const plano = await gerarPlanoVisitasSemanal(input.gestorId);
        return plano;
      }),
    
    // Gerar planos para todos os gestores (admin)
    gerarParaTodos: adminProcedure.mutation(async () => {
      const count = await gerarPlanosSemanaisParaTodosGestores();
      return { count };
    }),
    
    // Atualizar estado do plano
    atualizarEstado: gestorProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(['pendente', 'aceite', 'modificado', 'rejeitado']),
      }))
      .mutation(async ({ input }) => {
        await db.atualizarEstadoPlanoVisitas(input.id, input.estado);
        return { success: true };
      }),
  }),

  // ==================== SUGESTÕES DE MELHORIA ====================
  sugestoes: router({
    // Obter sugestões por relatório
    byRelatorio: protectedProcedure
      .input(z.object({
        relatorioId: z.number(),
        tipoRelatorio: z.enum(['livre', 'completo']),
      }))
      .query(async ({ input }) => {
        return await db.getSugestoesByRelatorio(input.relatorioId, input.tipoRelatorio);
      }),
    
    // Obter sugestões recentes por loja
    byLoja: protectedProcedure
      .input(z.object({
        lojaId: z.number(),
        limite: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getSugestoesRecentesByLoja(input.lojaId, input.limite || 10);
      }),
  }),

  // ==================== CATEGORIZAÇÃO DE RELATÓRIOS ====================
  categorizacao: router({
    // Obter todas as categorias únicas
    getCategorias: adminProcedure
      .query(async () => {
        return await db.getCategoriasUnicas();
      }),
    
    // Atualizar categoria de um relatório
    updateCategoria: adminProcedure
      .input(z.object({
        relatorioId: z.number(),
        tipoRelatorio: z.enum(['livre', 'completo']),
        categoria: z.string().min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        if (input.tipoRelatorio === 'livre') {
          await db.updateCategoriaRelatorioLivre(input.relatorioId, input.categoria);
        } else {
          await db.updateCategoriaRelatorioCompleto(input.relatorioId, input.categoria);
        }
        return { success: true };
      }),
    
    // Atualizar estado de acompanhamento
    updateEstado: adminProcedure
      .input(z.object({
        relatorioId: z.number(),
        tipoRelatorio: z.enum(['livre', 'completo']),
        estado: z.enum(['acompanhar', 'em_tratamento', 'tratado']),
      }))
      .mutation(async ({ input }) => {
        if (input.tipoRelatorio === 'livre') {
          await db.updateEstadoRelatorioLivre(input.relatorioId, input.estado);
        } else {
          await db.updateEstadoRelatorioCompleto(input.relatorioId, input.estado);
        }
        return { success: true };
      }),
    
    // Obter relatórios agrupados por categoria
    getRelatoriosPorCategoria: adminProcedure
      .query(async () => {
        return await db.getRelatoriosPorCategoria();
      }),
    
    // Obter estatísticas de categorias
    getEstatisticas: adminProcedure
      .query(async () => {
        return await db.getEstatisticasCategorias();
      }),
    
    // Atualizar comentário do admin
    updateComentario: adminProcedure
      .input(z.object({
        relatorioId: z.number(),
        tipoRelatorio: z.enum(['livre', 'completo']),
        comentario: z.string(),
      }))
      .mutation(async ({ input }) => {
        if (input.tipoRelatorio === 'livre') {
          await db.updateComentarioRelatorioLivre(input.relatorioId, input.comentario);
        } else {
          await db.updateComentarioRelatorioCompleto(input.relatorioId, input.comentario);
        }
        return { success: true };
      }),
    
    // Gerar relatório IA estruturado por categorias para reuniões de board
    gerarRelatorioIA: adminProcedure
      .mutation(async ({ ctx }) => {
        const { gerarRelatorioIACategorias } = await import('./relatorioCategoriasService');
        const resultado = await gerarRelatorioIACategorias(ctx.user.id);
        return resultado;
      }),
    
    // Listar histórico de relatórios IA gerados
    getHistoricoRelatoriosIA: adminProcedure
      .query(async () => {
        const historico = await db.getHistoricoRelatoriosIA();
        return historico;
      }),
  }),
  
  // ==================== TRANSCRIÇÃO DE VOZ ====================
  voiceTranscription: router({
    uploadAudio: gestorProcedure
      .input(z.object({
        audioBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        
        // Converter base64 para buffer
        const audioBuffer = Buffer.from(input.audioBase64, 'base64');
        
        // Determinar extensão baseada no mimeType
        const extension = input.mimeType.includes('mp4') ? 'mp4' : 
                         input.mimeType.includes('mpeg') ? 'mp3' : 'webm';
        
        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `voice-recordings/${timestamp}-${randomSuffix}.${extension}`;
        
        // Upload para S3
        const { url } = await storagePut(fileKey, audioBuffer, input.mimeType);
        
        return { url };
      }),
    
    transcribe: gestorProcedure
      .input(z.object({
        audioUrl: z.string(),
        language: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { transcribeAndProcess } = await import('./voiceTranscription');
        const result = await transcribeAndProcess(input.audioUrl, input.language);
        return result;
      }),
    
    processRelatorioLivre: gestorProcedure
      .input(z.object({
        transcription: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { processTranscriptionRelatorioLivre } = await import('./voiceTranscription');
        const result = await processTranscriptionRelatorioLivre(input.transcription);
        return result;
      }),
    
    processRelatorioCompleto: gestorProcedure
      .input(z.object({
        transcription: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { processTranscriptionRelatorioCompleto } = await import('./voiceTranscription');
        const result = await processTranscriptionRelatorioCompleto(input.transcription);
        return result;
      }),
  }),
  
  // ==================== ANÁLISE DE FOTOS ====================
  photoAnalysis: router({
    uploadPhoto: gestorProcedure
      .input(z.object({
        photoBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import('./storage');
        
        // Converter base64 para buffer
        const photoBuffer = Buffer.from(input.photoBase64, 'base64');
        
        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const gestorId = ctx.gestor?.id || 0;
        const fileKey = `relatorio-fotos/${gestorId}/${timestamp}-${randomSuffix}.jpg`;
        
        // Upload para S3
        const { url } = await storagePut(fileKey, photoBuffer, input.mimeType);
        
        return { url };
      }),
    
    analyzePhoto: gestorProcedure
      .input(z.object({
        imageUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { analyzePhoto } = await import('./photoAnalysis');
        const result = await analyzePhoto(input.imageUrl);
        return result;
      }),
    
    analyzePhotos: gestorProcedure
      .input(z.object({
        imageUrls: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { analyzePhotos } = await import('./photoAnalysis');
        const results = await analyzePhotos(input.imageUrls);
        return results;
      }),
  }),
  
  // ==================== HISTÓRICO DA LOJA ====================
  lojaHistory: router({
    generate: protectedProcedure
      .input(z.object({
        lojaId: z.number(),
      }))
      .query(async ({ input }) => {
        const { generateLojaHistory } = await import('./lojaHistory');
        const result = await generateLojaHistory(input.lojaId);
        return result;
      }),
  }),

  // ==================== RESUMO GLOBAL ====================
  resumoGlobal: router({
    gerar: gestorProcedure.query(async ({ ctx }) => {
      const { gerarResumoGlobal } = await import('./resumoGlobalService');
      const resumo = await gerarResumoGlobal(ctx.gestor?.id || 0);
      return resumo;
    }),
  }),

  // ==================== GESTÃO DE UTILIZADORES (ADMIN) ====================
  utilizadores: router({
    getAll: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    update: adminProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['user', 'admin', 'gestor']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { userId, ...data } = input;
        await db.updateUser(userId, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.userId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
