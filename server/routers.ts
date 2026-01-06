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
import { notifyOwner } from "./_core/notification";

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
    
    update: gestorProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        email: z.string().email().optional().nullable(),
        contacto: z.string().optional().nullable(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        minimoRelatoriosLivres: z.number().min(0).optional(),
        minimoRelatoriosCompletos: z.number().min(0).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Verificar se gestor tem acesso à loja
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          if (!lojasGestor.some(l => l.id === id)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
          }
          // Gestor só pode editar email e contacto, não nome ou mínimos
          const gestorData: any = {};
          if (data.email !== undefined) gestorData.email = data.email;
          if (data.contacto !== undefined) gestorData.contacto = data.contacto;
          await db.updateLoja(id, gestorData);
        } else {
          // Admin pode editar tudo
          await db.updateLoja(id, data);
        }
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLoja(input.id);
        return { success: true };
      }),
    
    deleteMany: adminProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ input }) => {
        let deleted = 0;
        for (const id of input.ids) {
          try {
            await db.deleteLoja(id);
            deleted++;
          } catch (error) {
            console.error(`Erro ao eliminar loja ${id}:`, error);
          }
        }
        return { success: true, deleted };
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

    contarRelatoriosMesAtual: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        return await db.contarRelatoriosMesAtualPorLoja(input.lojaId);
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
    // Endpoint para gestor obter os seus próprios dados (acessível por gestores)
    me: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'gestor' && ctx.user.role !== 'admin') {
        return null;
      }
      const gestor = await db.getGestorByUserId(ctx.user.id);
      if (!gestor) return null;
      
      // Buscar lojas associadas ao gestor
      const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
      
      return {
        ...gestor,
        lojas: lojasDoGestor,
        user: ctx.user
      };
    }),
    
    list: adminProcedure.query(async () => {
      return await db.getAllGestores();
    }),
    
    // Listar utilizadores para atribuição de tarefas (acessível por gestores e admins)
    listarParaTodos: gestorProcedure.query(async () => {
      return await db.getAllUsersParaTodos();
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
    
    deleteMany: adminProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ input }) => {
        let deleted = 0;
        for (const id of input.ids) {
          try {
            await db.deleteGestor(id);
            deleted++;
          } catch (error) {
            console.error(`Erro ao eliminar gestor ${id}:`, error);
          }
        }
        return { success: true, deleted };
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
        
        const relatoriosCriados = [];
        
        // Criar um relatório individual para cada loja selecionada
        for (const lojaId of lojasIds) {
          const relatorio = await db.createRelatorioLivre({
            ...relatorioData,
            lojaId,
            lojasIds: JSON.stringify([lojaId]), // Apenas esta loja
            gestorId: ctx.gestor.id,
          });
          
          relatoriosCriados.push(relatorio);
          
          // Criar pendentes se existirem (para esta loja)
          if (pendentes && pendentes.length > 0) {
            for (const descricao of pendentes) {
              await db.createPendente({
                lojaId,
                relatorioId: relatorio.id,
                tipoRelatorio: 'livre',
                descricao,
              });
              
              // Registar atividade de pendente criado
              await db.registarAtividade({
                gestorId: ctx.gestor.id,
                lojaId,
                tipo: 'pendente_criado',
                descricao: `Novo pendente criado: ${descricao.substring(0, 50)}...`,
              });
            }
          }
          
          // Registar atividade de relatório criado
          const loja = await db.getLojaById(lojaId);
          await db.registarAtividade({
            gestorId: ctx.gestor.id,
            lojaId,
            tipo: 'relatorio_livre',
            descricao: `Relatório livre criado para ${loja?.nome || 'loja'}`,
            metadata: { relatorioId: relatorio.id },
          });
          
          // Gerar sugestões de melhoria com IA (async, não bloqueia)
          const conteudo = formatarRelatorioLivre({
            descricao: input.descricao,
            dataVisita: input.dataVisita,
          });
          gerarSugestoesMelhoria(relatorio.id, 'livre', lojaId, ctx.gestor.id, conteudo)
            .catch(err => console.error('[Sugestões] Erro ao gerar:', err));
          
          // Se admin criou o relatório, notificar gestor responsável pela loja
          if (ctx.user.role === 'admin') {
            notificarGestorRelatorioAdmin(relatorio.id, 'livre', lojaId, ctx.user.name || 'Admin')
              .catch((err: unknown) => console.error('[Email] Erro ao notificar gestor:', err));
          }
        }
        
        // Retornar primeiro relatório (para compatibilidade com frontend)
        return relatoriosCriados[0];
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataVisita: z.date().optional(),
        descricao: z.string().min(1).optional(),
        fotos: z.string().optional(),
        comentarioAdmin: z.string().optional(),
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
        
        // Apenas admin pode editar comentário admin
        const updateData: any = {
          dataVisita: input.dataVisita,
          descricao: input.descricao,
          fotos: input.fotos,
        };
        
        if (ctx.user.role === 'admin' && input.comentarioAdmin !== undefined) {
          updateData.comentarioAdmin = input.comentarioAdmin;
        }
        
        return await db.updateRelatorioLivre(input.id, updateData);
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
        comentarioAdmin: z.string().optional(),
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
        
        const { id, comentarioAdmin, ...updateData } = input;
        
        // Apenas admin pode editar comentário admin
        const finalUpdateData: any = { ...updateData };
        if (ctx.user.role === 'admin' && comentarioAdmin !== undefined) {
          finalUpdateData.comentarioAdmin = comentarioAdmin;
        }
        
        return await db.updateRelatorioCompleto(id, finalUpdateData);
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
        periodo: z.enum(["diario", "semanal", "mensal", "mes_anterior", "mes_atual", "trimestre_anterior", "semestre_anterior", "ano_anterior", "trimestral", "semestral", "anual"]),
        filtro: z.enum(["pais", "zona", "gestor"]).optional().default("pais"),
        zonaId: z.string().optional(),
        zonasIds: z.array(z.string()).optional(), // Novo: múltiplas zonas
        gestorIdFiltro: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Determinar gestorId baseado no filtro
        let gestorId: number | undefined;
        let lojasIds: number[] | undefined;
        let filtroDescricao = "Todo o País";
        
        if (ctx.user.role !== "admin") {
          // Gestores só vêem as suas lojas
          gestorId = ctx.gestor?.id;
          filtroDescricao = "Minhas Lojas";
          
          // IMPORTANTE: Buscar IDs das lojas do gestor para filtrar dados de ranking
          if (gestorId) {
            const lojasDoGestor = await db.getLojasByGestorId(gestorId);
            lojasIds = lojasDoGestor.map(l => l.id);
          }
        } else {
          // Admin pode filtrar
          if (input.filtro === "gestor" && input.gestorIdFiltro) {
            // Filtrar por gestor específico
            const lojasDoGestor = await db.getLojasByGestorId(input.gestorIdFiltro);
            lojasIds = lojasDoGestor.map(l => l.id);
            const gestorInfo = await db.getGestorById(input.gestorIdFiltro);
            filtroDescricao = `Gestor: ${gestorInfo?.nome || 'N/A'}`;
          } else if (input.filtro === "zona") {
            // Filtrar por zona(s)
            const agora = new Date();
            let mesParaBuscar = agora.getMonth() + 1;
            let anoParaBuscar = agora.getFullYear();
            if (input.periodo === 'mes_anterior') {
              mesParaBuscar = agora.getMonth();
              if (mesParaBuscar === 0) {
                mesParaBuscar = 12;
                anoParaBuscar = agora.getFullYear() - 1;
              }
            }
            
            // Suportar múltiplas zonas ou zona única
            if (input.zonasIds && input.zonasIds.length > 0) {
              lojasIds = await db.getLojaIdsPorZonas(input.zonasIds, mesParaBuscar, anoParaBuscar);
              if (input.zonasIds.length === 1) {
                filtroDescricao = `Zona: ${input.zonasIds[0]}`;
              } else {
                filtroDescricao = `Zonas: ${input.zonasIds.join(', ')}`;
              }
            } else if (input.zonaId) {
              // Compatibilidade com versão anterior (zona única)
              lojasIds = await db.getLojaIdsPorZona(input.zonaId, mesParaBuscar, anoParaBuscar);
              filtroDescricao = `Zona: ${input.zonaId}`;
            }
          }
          // filtro === "pais" → sem filtro, todas as lojas
        }
        
        const analise = await gerarRelatorioComIA(input.periodo, gestorId, lojasIds);
        
        // Adicionar informação do filtro ao resultado
        const analiseComFiltro = {
          ...analise,
          filtroAplicado: filtroDescricao,
        };
        
        // Salvar relatório IA na base de dados
        try {
          await db.createRelatorioIA({
            periodo: input.periodo,
            conteudo: JSON.stringify(analiseComFiltro),
            geradoPor: ctx.user.id,
          });
          console.log('[RelatoriosIA] Relatório salvo com sucesso na BD');
        } catch (error) {
          console.error('[RelatoriosIA] Erro ao salvar relatório:', error);
        }
        
        return analiseComFiltro;
      }),
    
    // Obter lista de zonas disponíveis
    getZonas: adminProcedure
      .query(async () => {
        return await db.getZonasDistintas();
      }),
    
    // Obter lista de gestores para filtro
    getGestoresParaFiltro: adminProcedure
      .query(async () => {
        const gestores = await db.getAllGestores();
        return gestores.map(g => ({
          id: g.id,
          nome: g.user?.name || g.user?.email || 'Sem nome',
        }));
      }),
    
    getHistorico: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role === "admin") {
          // Admin vê todos os relatórios IA
          return await db.getHistoricoRelatoriosIANormal();
        } else {
          // Gestor vê apenas seus próprios relatórios
          return await db.getHistoricoRelatoriosIANormalByGestor(ctx.user.id);
        }
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getRelatorioIAById(input.id);
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
        tipo: z.enum(["pontos_negativos_consecutivos", "pendentes_antigos", "sem_visitas", "performance_baixa"]),
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
    
    // Verificar e criar alertas de performance baixa
    verificarPerformance: adminProcedure
      .input(z.object({
        limiarDesvio: z.number().default(-10), // -10 = 10% abaixo do objetivo
        mes: z.number().min(1).max(12),
        ano: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.verificarECriarAlertasPerformance(
          input.limiarDesvio,
          input.mes,
          input.ano
        );
      }),
    
    // Listar lojas com performance baixa (sem criar alertas)
    lojasPerformanceBaixa: adminProcedure
      .input(z.object({
        limiarDesvio: z.number().default(-10),
        mes: z.number().min(1).max(12),
        ano: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getLojasPerformanceBaixa(
          input.limiarDesvio,
          input.mes,
          input.ano
        );
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
    
    // Listar histórico de relatórios IA gerados com filtros
    getHistoricoRelatoriosIA: adminProcedure
      .input(z.object({
        categoria: z.string().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const historico = await db.getHistoricoRelatoriosIA();
        
        // Aplicar filtros se fornecidos
        let resultado = historico;
        
        if (input?.categoria) {
          const termo = input.categoria.toLowerCase();
          resultado = resultado.filter(r => 
            r.conteudo.toLowerCase().includes(termo)
          );
        }
        
        if (input?.dataInicio) {
          const dataInicio = new Date(input.dataInicio);
          resultado = resultado.filter(r => new Date(r.createdAt) >= dataInicio);
        }
        
        if (input?.dataFim) {
          const dataFim = new Date(input.dataFim);
          dataFim.setHours(23, 59, 59, 999);
          resultado = resultado.filter(r => new Date(r.createdAt) <= dataFim);
        }
        
        return resultado;
      }),
    
    // Enviar relatório IA por email com PDF anexado
    enviarEmailRelatorioIA: adminProcedure
      .input(z.object({
        relatorioId: z.number(),
        emailDestino: z.string().email(),
        assuntoPersonalizado: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Obter o relatório
        const relatorio = await db.getRelatorioIACategoriaById(input.relatorioId);
        
        if (!relatorio) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Relatório não encontrado',
          });
        }
        
        // Gerar PDF do relatório
        const { gerarPDFRelatorioIA } = await import('./pdfRelatorioIA');
        const pdfBase64 = await gerarPDFRelatorioIA(relatorio.conteudo, relatorio.createdAt);
        
        // Enviar email com PDF anexado
        const { sendEmail } = await import('./emailService');
        
        const dataRelatorio = new Date(relatorio.createdAt).toLocaleDateString('pt-PT', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
        
        const assunto = input.assuntoPersonalizado || `Relatório IA - ${dataRelatorio}`;
        
        await sendEmail({
          to: input.emailDestino,
          subject: assunto,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Relatório IA - Análise Executiva</h2>
              <p>Segue em anexo o relatório IA gerado em <strong>${dataRelatorio}</strong>.</p>
              <p>Este relatório contém uma análise executiva dos dados da plataforma PoweringEG.</p>
              <hr style="border: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #666; font-size: 12px;">PoweringEG Platform</p>
            </div>
          `,
          attachments: [{
            filename: `relatorio-ia-${new Date(relatorio.createdAt).toISOString().split('T')[0]}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          }],
        });
        
        return {
          success: true,
          emailEnviadoPara: input.emailDestino,
        };
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
        periodo: z.enum(['mes_atual', 'mes_anterior', 'trimestre_anterior', 'semestre_anterior', 'ano_anterior']).optional().default('mes_anterior'),
      }))
      .query(async ({ input }) => {
        const { generateLojaHistory } = await import('./lojaHistory');
        const result = await generateLojaHistory(input.lojaId, input.periodo);
        return result;
      }),
    
    // Comparação entre períodos (ex: Q4 2024 vs Q4 2025)
    comparar: protectedProcedure
      .input(z.object({
        lojaId: z.number(),
        tipoComparacao: z.enum([
          'q1_ano_anterior_vs_atual',
          'q2_ano_anterior_vs_atual', 
          'q3_ano_anterior_vs_atual',
          'q4_ano_anterior_vs_atual',
          's1_ano_anterior_vs_atual',
          's2_ano_anterior_vs_atual',
          'ano_completo'
        ]),
      }))
      .query(async ({ input }) => {
        const { compararPeriodos } = await import('./lojaHistory');
        const result = await compararPeriodos(input.lojaId, input.tipoComparacao);
        return result;
      }),
  }),

  // ==================== RESUMO GLOBAL (ANTIGO - DEPRECATED) ====================
  resumoGlobal: router({
    gerar: gestorProcedure.query(async ({ ctx }) => {
      const { gerarResumoGlobal } = await import('./resumoGlobalService');
      const resumo = await gerarResumoGlobal(ctx.gestor?.id || 0);
      return resumo;
    }),
  }),

  // ==================== RESUMOS GLOBAIS (NOVO) ====================
  resumosGlobais: router({
    gerar: protectedProcedure
      .input(z.object({
        periodo: z.enum(['mes_atual', 'mes_anterior', 'trimestre_anterior', 'semestre_anterior', 'ano_anterior']),
        dataInicio: z.date(),
        dataFim: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Permitir admin e gestor gerarem resumos
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'gestor') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores e gestores podem gerar resumos globais' });
        }
        
        const { gerarResumoGlobalComIA } = await import('./resumoGlobalService');
        const resumo = await gerarResumoGlobalComIA(
          input.periodo,
          input.dataInicio,
          input.dataFim,
          ctx.user.id
        );
        return resumo;
      }),
    
    getHistorico: protectedProcedure.query(async () => {
      return await db.getHistoricoResumosGlobais();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getResumoGlobalById(input.id);
      }),
    
    getUltimoPorPeriodo: protectedProcedure
      .input(z.object({ periodo: z.enum(['mes_atual', 'mes_anterior', 'trimestre_anterior', 'semestre_anterior', 'ano_anterior']) }))
      .query(async ({ input }) => {
        return await db.getUltimoResumoGlobalPorPeriodo(input.periodo);
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

  // ==================== REUNIÕES OPERACIONAIS ====================
  reunioesGestores: router({
    criar: adminProcedure
      .input(z.object({
        data: z.date(),
        presencas: z.array(z.number()), // IDs dos gestores presentes
        outrosPresentes: z.string().optional(),
        conteudo: z.string(),
        tags: z.array(z.string()).optional(),
        anexos: z.array(z.object({
          nome: z.string(),
          url: z.string(),
          tipo: z.string(), // 'documento' ou 'imagem'
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { gerarResumoReuniaoComIA } = await import('./reuniaoService');
        
        // Gerar resumo com IA
        const resumoIA = await gerarResumoReuniaoComIA(input.conteudo, 'gestores');
        
        // Criar reunião
        const reuniao = await db.createReuniaoGestores({
          data: input.data,
          presencas: JSON.stringify(input.presencas),
          outrosPresentes: input.outrosPresentes || null,
          conteudo: input.conteudo,
          resumoIA: JSON.stringify(resumoIA),
          tags: input.tags ? JSON.stringify(input.tags) : null,
          anexos: input.anexos ? JSON.stringify(input.anexos) : null,
          criadoPor: ctx.user.id,
        });
        
        return { reuniao, resumoIA };
      }),
    
    editar: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.date().optional(),
        presencas: z.array(z.number()).optional(),
        outrosPresentes: z.string().optional(),
        conteudo: z.string().optional(),
        tags: z.array(z.string()).optional(),
        anexos: z.array(z.object({
          nome: z.string(),
          url: z.string(),
          tipo: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        
        // Se conteudo foi alterado, regerar resumo IA
        let resumoIA = undefined;
        if (updateData.conteudo) {
          const { gerarResumoReuniaoComIA } = await import('./reuniaoService');
          resumoIA = await gerarResumoReuniaoComIA(updateData.conteudo, 'gestores');
        }
        
        await db.updateReuniaoGestores(id, {
          ...updateData,
          presencas: updateData.presencas ? JSON.stringify(updateData.presencas) : undefined,
          tags: updateData.tags ? JSON.stringify(updateData.tags) : undefined,
          anexos: updateData.anexos ? JSON.stringify(updateData.anexos) : undefined,
          resumoIA: resumoIA ? JSON.stringify(resumoIA) : undefined,
        });
        
        return { success: true };
      }),
    
    listar: protectedProcedure
      .input(z.object({
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        tags: z.array(z.string()).optional(),
        criadoPor: z.number().optional(),
        pesquisa: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const filtros = input || {};
        return await db.getHistoricoReuniõesGestores(filtros);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getReuniaoGestoresById(input.id);
      }),
    
    atribuirAcoes: adminProcedure
      .input(z.object({
        reuniaoId: z.number(),
        acoes: z.array(z.object({
          descricao: z.string(),
          gestorIds: z.array(z.number()),
        })),
      }))
      .mutation(async ({ input }) => {
        // Criar ações atribuídas a gestores
        for (const acao of input.acoes) {
          await db.createAcaoReuniao({
            reuniaoId: input.reuniaoId,
            tipoReuniao: 'gestores',
            descricao: acao.descricao,
            gestorIds: JSON.stringify(acao.gestorIds),
            status: 'pendente',
          });
        }
        
        return { success: true };
      }),
    
    enviarEmail: adminProcedure
      .input(z.object({
        reuniaoId: z.number(),
        gestorIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const reuniao = await db.getReuniaoGestoresById(input.reuniaoId);
        if (!reuniao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
        
        const gestores = await db.getAllGestores();
        const gestoresSelecionados = gestores.filter(g => input.gestorIds.includes(g.id));
        
        const resumoIA = reuniao.resumoIA ? JSON.parse(reuniao.resumoIA) : null;
        
        // Construir conteúdo do email
        let emailContent = `<h2>Reunião de Gestores - ${new Date(reuniao.data).toLocaleDateString('pt-PT')}</h2>`;
        emailContent += `<p><strong>Data:</strong> ${new Date(reuniao.data).toLocaleDateString('pt-PT')}</p>`;
        
        if (resumoIA) {
          emailContent += `<h3>Resumo</h3><p>${resumoIA.resumo}</p>`;
          
          if (resumoIA.topicos.length > 0) {
            emailContent += `<h3>Tópicos Principais</h3><ul>`;
            resumoIA.topicos.forEach((t: string) => {
              emailContent += `<li>${t}</li>`;
            });
            emailContent += `</ul>`;
          }
          
          if (resumoIA.acoes.length > 0) {
            emailContent += `<h3>Ações Identificadas</h3><ul>`;
            resumoIA.acoes.forEach((a: any) => {
              emailContent += `<li><strong>[${a.prioridade}]</strong> ${a.descricao}</li>`;
            });
            emailContent += `</ul>`;
          }
        }
        
        emailContent += `<h3>Conteúdo Completo</h3><pre>${reuniao.conteudo}</pre>`;
        
        // Adicionar anexos se existirem
        if (reuniao.anexos) {
          const anexos = JSON.parse(reuniao.anexos);
          if (anexos.length > 0) {
            emailContent += `<h3>Anexos (${anexos.length})</h3><ul>`;
            anexos.forEach((anexo: any) => {
              emailContent += `<li><a href="${anexo.url}" target="_blank">${anexo.nome}</a> (${anexo.tipo})</li>`;
            });
            emailContent += `</ul>`;
          }
        }
        
        // Enviar email para cada gestor selecionado
        const { notifyOwner } = await import('./_core/notification');
        for (const gestor of gestoresSelecionados) {
          // TODO: Implementar envio de email real quando tivermos sistema de email
          // Por agora, notificar owner
          await notifyOwner({
            title: `Reunião de Gestores - ${new Date(reuniao.data).toLocaleDateString('pt-PT')}`,
            content: `Email enviado para ${gestor.nome}: ${emailContent.substring(0, 200)}...`,
          });
        }
        
        return { success: true, enviados: gestoresSelecionados.length };
      }),
    
    gerarPDF: protectedProcedure
      .input(z.object({ reuniaoId: z.number() }))
      .query(async ({ input }) => {
        const reuniao = await db.getReuniaoGestoresById(input.reuniaoId);
        if (!reuniao) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const { gerarPDFReuniao } = await import('./reuniaoService');
        const pdfBuffer = await gerarPDFReuniao(reuniao, 'gestores');
        
        // Upload para S3
        const { storagePut } = await import('./storage');
        const fileName = `reuniao-gestores-${reuniao.id}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, 'application/pdf');
        
        return { url };
      }),
  }),

  reunioesLojas: router({
    criar: protectedProcedure
      .input(z.object({
        data: z.date(),
        lojaIds: z.array(z.number()),
        presencas: z.string(),
        conteudo: z.string(),
        tags: z.array(z.string()).optional(),
        anexos: z.array(z.object({
          nome: z.string(),
          url: z.string(),
          tipo: z.string(), // 'documento' ou 'imagem'
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar permissões: gestor só pode criar para suas lojas
        if (ctx.user.role === 'gestor') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
          
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          const lojaIdsGestor = lojasGestor.map((l: any) => l.id);
          
          const todasPermitidas = input.lojaIds.every(id => lojaIdsGestor.includes(id));
          if (!todasPermitidas) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não pode criar reunião para lojas que não gere' });
          }
        }
        
        const { gerarResumoReuniaoComIA } = await import('./reuniaoService');
        
        // Gerar resumo com IA
        const resumoIA = await gerarResumoReuniaoComIA(input.conteudo, 'lojas');
        
        // Criar reunião
        const reuniao = await db.createReuniaoLojas({
          data: input.data,
          lojaIds: JSON.stringify(input.lojaIds),
          presencas: input.presencas,
          conteudo: input.conteudo,
          resumoIA: JSON.stringify(resumoIA),
          tags: input.tags ? JSON.stringify(input.tags) : null,
          anexos: input.anexos ? JSON.stringify(input.anexos) : null,
          criadoPor: ctx.user.id,
        });
        
        return { reuniao, resumoIA };
      }),
    
    editar: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.date().optional(),
        lojaIds: z.array(z.number()).optional(),
        presencas: z.string().optional(),
        conteudo: z.string().optional(),
        tags: z.array(z.string()).optional(),
        anexos: z.array(z.object({
          nome: z.string(),
          url: z.string(),
          tipo: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updateData } = input;
        
        // Verificar permissões
        const reuniaoExistente = await db.getReuniaoLojasById(id);
        if (!reuniaoExistente) throw new TRPCError({ code: 'NOT_FOUND' });
        
        if (ctx.user.role === 'gestor') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
          
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          const lojaIdsGestor = lojasGestor.map((l: any) => l.id);
          
          const lojaIdsReuniao = JSON.parse(reuniaoExistente.lojaIds) as number[];
          const todasPermitidas = lojaIdsReuniao.every(id => lojaIdsGestor.includes(id));
          if (!todasPermitidas) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não pode editar reunião de lojas que não gere' });
          }
        }
        
        // Se conteudo foi alterado, regerar resumo IA
        let resumoIA = undefined;
        if (updateData.conteudo) {
          const { gerarResumoReuniaoComIA } = await import('./reuniaoService');
          resumoIA = await gerarResumoReuniaoComIA(updateData.conteudo, 'lojas');
        }
        
        await db.updateReuniaoLojas(id, {
          ...updateData,
          lojaIds: updateData.lojaIds ? JSON.stringify(updateData.lojaIds) : undefined,
          tags: updateData.tags ? JSON.stringify(updateData.tags) : undefined,
          anexos: updateData.anexos ? JSON.stringify(updateData.anexos) : undefined,
          resumoIA: resumoIA ? JSON.stringify(resumoIA) : undefined,
        });
        
        return { success: true };
      }),
    
    listar: protectedProcedure
      .input(z.object({
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        tags: z.array(z.string()).optional(),
        criadoPor: z.number().optional(),
        pesquisa: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const filtros = input || {};
        // Admin vê todas, gestor vê apenas das suas lojas
        if (ctx.user.role === 'admin') {
          return await db.getHistoricoReuniõesLojas(undefined, filtros);
        } else {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) return [];
          return await db.getHistoricoReuniõesLojas(gestor.id, filtros);
        }
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const reuniao = await db.getReuniaoLojasById(input.id);
        if (!reuniao) return null;
        
        // Verificar permissões para gestor
        if (ctx.user.role === 'gestor') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) return null;
          
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          const lojaIdsGestor = lojasGestor.map((l: any) => l.id);
          
          const lojaIdsReuniao = JSON.parse(reuniao.lojaIds) as number[];
          const temPermissao = lojaIdsReuniao.some(id => lojaIdsGestor.includes(id));
          if (!temPermissao) return null;
        }
        
        return reuniao;
      }),
    
    getMiniResumo: protectedProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        const ultimaReuniao = await db.getUltimaReuniaoLoja(input.lojaId);
        const { gerarMiniResumoReuniaoAnterior } = await import('./reuniaoService');
        return await gerarMiniResumoReuniaoAnterior(ultimaReuniao);
      }),
    
    atribuirAcoes: protectedProcedure
      .input(z.object({
        reuniaoId: z.number(),
        acoes: z.array(z.object({
          descricao: z.string(),
          gestorIds: z.array(z.number()),
        })),
      }))
      .mutation(async ({ input }) => {
        // Criar ações atribuídas a gestores
        for (const acao of input.acoes) {
          await db.createAcaoReuniao({
            reuniaoId: input.reuniaoId,
            tipoReuniao: 'lojas',
            descricao: acao.descricao,
            gestorIds: JSON.stringify(acao.gestorIds),
            status: 'pendente',
          });
        }
        
        return { success: true };
      }),
    
    enviarEmail: protectedProcedure
      .input(z.object({
        reuniaoId: z.number(),
        emailDestino: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const reuniao = await db.getReuniaoLojasById(input.reuniaoId);
        if (!reuniao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
        
        // Buscar nomes das lojas
        const lojaIds = JSON.parse(reuniao.lojaIds) as number[];
        const lojas = await db.getAllLojas();
        const lojasNomes = lojas.filter(l => lojaIds.includes(l.id)).map(l => l.nome);
        
        const resumoIA = reuniao.resumoIA ? JSON.parse(reuniao.resumoIA) : null;
        
        // Construir conteúdo do email
        let emailContent = `<h2>Reunião de Loja - ${new Date(reuniao.data).toLocaleDateString('pt-PT')}</h2>`;
        emailContent += `<p><strong>Data:</strong> ${new Date(reuniao.data).toLocaleDateString('pt-PT')}</p>`;
        emailContent += `<p><strong>Lojas:</strong> ${lojasNomes.join(', ')}</p>`;
        emailContent += `<p><strong>Presenças:</strong> ${reuniao.presencas}</p>`;
        
        if (resumoIA) {
          emailContent += `<h3>Resumo</h3><p>${resumoIA.resumo}</p>`;
          
          if (resumoIA.topicos.length > 0) {
            emailContent += `<h3>Tópicos Principais</h3><ul>`;
            resumoIA.topicos.forEach((t: string) => {
              emailContent += `<li>${t}</li>`;
            });
            emailContent += `</ul>`;
          }
          
          if (resumoIA.acoes.length > 0) {
            emailContent += `<h3>Ações Identificadas</h3><ul>`;
            resumoIA.acoes.forEach((a: any) => {
              emailContent += `<li><strong>[${a.prioridade}]</strong> ${a.descricao}</li>`;
            });
            emailContent += `</ul>`;
          }
        }
        
        emailContent += `<h3>Conteúdo Completo</h3><pre>${reuniao.conteudo}</pre>`;
        
        // Adicionar anexos se existirem
        if (reuniao.anexos) {
          const anexos = JSON.parse(reuniao.anexos);
          if (anexos.length > 0) {
            emailContent += `<h3>Anexos (${anexos.length})</h3><ul>`;
            anexos.forEach((anexo: any) => {
              emailContent += `<li><a href="${anexo.url}" target="_blank">${anexo.nome}</a> (${anexo.tipo})</li>`;
            });
            emailContent += `</ul>`;
          }
        }
        
        // Enviar email
        const { notifyOwner } = await import('./_core/notification');
        await notifyOwner({
          title: `Reunião de Loja - ${new Date(reuniao.data).toLocaleDateString('pt-PT')}`,
          content: `Email enviado para ${input.emailDestino}: ${emailContent.substring(0, 200)}...`,
        });
        
        return { success: true };
      }),
    
    gerarPDF: protectedProcedure
      .input(z.object({ reuniaoId: z.number() }))
      .query(async ({ input }) => {
        const reuniao = await db.getReuniaoLojasById(input.reuniaoId);
        if (!reuniao) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const { gerarPDFReuniao } = await import('./reuniaoService');
        const pdfBuffer = await gerarPDFReuniao(reuniao, 'lojas');
        
        // Upload para S3
        const { storagePut } = await import('./storage');
        const fileName = `reuniao-lojas-${reuniao.id}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, 'application/pdf');
        
        return { url };
      }),
  }),

  // ==================== RESULTADOS MENSAIS ====================
  resultados: router({
    upload: adminProcedure
      .input(z.object({
        fileData: z.string(), // Base64
        fileName: z.string(),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      }))
      .mutation(async ({ input, ctx }) => {
        const { processarExcelResultados, processarExcelComplementares } = await import('./excelProcessor');
        
        // Decodificar base64
        const buffer = Buffer.from(input.fileData, 'base64');
        
        // Processar folha Faturados
        const resultadoFaturados = await processarExcelResultados(
          buffer,
          input.mes,
          input.ano,
          ctx.user.id,
          input.fileName
        );
        
        // Processar folha Complementares (se existir)
        const resultadoComplementares = await processarExcelComplementares(
          buffer,
          input.mes,
          input.ano,
          ctx.user.id,
          input.fileName
        );
        
        return {
          sucesso: resultadoFaturados.sucesso,
          erros: resultadoFaturados.erros,
          complementares: {
            sucesso: resultadoComplementares.sucesso,
            erros: resultadoComplementares.erros,
          }
        };
      }),
    
    listar: protectedProcedure
      .input(z.object({
        mes: z.number().optional(),
        ano: z.number().optional(),
        lojaId: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        return await db.getResultadosMensais(input || {}, ctx.user);
      }),
    
    periodos: protectedProcedure
      .query(async () => {
        return await db.getPeriodosDisponiveis();
      }),
    
    comparar: protectedProcedure
      .input(z.object({
        periodo1: z.object({ mes: z.number(), ano: z.number() }),
        periodo2: z.object({ mes: z.number(), ano: z.number() }),
        lojaId: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        return await db.compararPeriodos(input, ctx.user);
      }),
    
    // Dashboard - Evolução mensal de uma loja
    evolucao: protectedProcedure
      .input(z.object({
        lojaId: z.number(),
        mesesAtras: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getEvolucaoMensal(input.lojaId, input.mesesAtras);
      }),
    
    // Dashboard - Evolução agregada de todas as lojas do gestor
    evolucaoAgregada: protectedProcedure
      .input(z.object({
        gestorId: z.number(),
        mesesAtras: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getEvolucaoAgregadaPorGestor(input.gestorId, input.mesesAtras);
      }),
    
    // Dashboard - Ranking de lojas
    ranking: protectedProcedure
      .input(z.object({
        metrica: z.enum(['totalServicos', 'taxaReparacao', 'desvioPercentualMes', 'servicosPorColaborador']),
        mes: z.number().min(1).max(12),
        ano: z.number(),
        limit: z.number().optional(),
        lojasIds: z.array(z.number()).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getRankingLojas(input.metrica, input.mes, input.ano, input.limit, input.lojasIds);
      }),
    
    // Dashboard - Comparar duas lojas
    compararLojas: protectedProcedure
      .input(z.object({
        lojaId1: z.number(),
        lojaId2: z.number(),
        mes: z.number().min(1).max(12),
        ano: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.compararLojas(input.lojaId1, input.lojaId2, input.mes, input.ano);
      }),
    
    // Dashboard - Resultados por zona
    porZona: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getResultadosPorZona(input.mes, input.ano);
      }),
    
    // Dashboard - Estatísticas do período
    estatisticas: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number(),
        lojaId: z.number().optional(),
        lojasIds: z.array(z.number()).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getEstatisticasPeriodo(input.mes, input.ano, input.lojaId, input.lojasIds);
      }),
    
    // Obter totais globais (incluindo PROMOTOR)
    totaisGlobais: protectedProcedure
      .input(z.object({
        mes: z.number(),
        ano: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getTotaisMensais(input.mes, input.ano);
      }),
    
    // Obter evolução global (todas as lojas agregadas ao longo do tempo)
    evolucaoGlobal: protectedProcedure
      .input(z.object({
        mesesAtras: z.number().optional().default(12),
      }))
      .query(async ({ input }) => {
        return await db.getEvolucaoGlobal(input.mesesAtras);
      }),
    
    // Exportar relatório Excel "Minhas Lojas"
    exportarExcel: protectedProcedure
      .input(z.object({
        gestorId: z.number(),
        gestorNome: z.string(),
        gestorEmail: z.string(),
        mes: z.number().min(1).max(12),
        ano: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { gerarExcelMinhasLojas } = await import('./relatorioExporter');
        const buffer = await gerarExcelMinhasLojas(
          input.gestorId,
          input.gestorNome,
          input.gestorEmail,
          input.mes,
          input.ano
        );
        
        // Retornar base64 para download no frontend
        return {
          fileName: `Minhas_Lojas_${input.mes}_${input.ano}.xlsx`,
          fileData: buffer.toString('base64'),
        };
      }),
  }),

  // ==================== VENDAS COMPLEMENTARES ====================
  complementares: router({
    // Listar vendas complementares
    listar: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number(),
        lojaId: z.number().optional(),
        lojasIds: z.array(z.number()).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getVendasComplementares(input.mes, input.ano, input.lojaId, input.lojasIds);
      }),
    
    // Estatísticas agregadas
    estatisticas: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number(),
        lojaId: z.number().optional(),
        lojasIds: z.array(z.number()).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getEstatisticasComplementares(input.mes, input.ano, input.lojaId, input.lojasIds);
      }),
    
    // Ranking de vendas complementares
    ranking: protectedProcedure
      .input(z.object({
        metrica: z.enum(['totalVendas', 'escovasVendas', 'escovasPercent', 'polimentoVendas']),
        mes: z.number().min(1).max(12),
        ano: z.number(),
        limit: z.number().optional(),
        lojasIds: z.array(z.number()).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getRankingComplementares(input.metrica, input.mes, input.ano, input.limit, input.lojasIds);
      }),
    
    // Verificar se existem dados
    temDados: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.temDadosComplementares(input.mes, input.ano);
      }),
  }),

  // ==================== UPLOAD DE ANEXOS ====================
  uploadAnexo: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileData: z.string(), // Base64
      contentType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import('./storage');
      
      // Decodificar base64
      const buffer = Buffer.from(input.fileData, 'base64');
      
      // Criar nome único para o arquivo
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `reunioes-anexos/${timestamp}-${randomSuffix}-${input.fileName}`;
      
      // Upload para S3
      const { url } = await storagePut(fileKey, buffer, input.contentType);
      
      return { url, fileKey };
    }),
  
  // Upload de anexos para Portal da Loja (público, validação por token)
  uploadAnexoPortalLoja: publicProcedure
    .input(z.object({
      token: z.string(),
      fileName: z.string(),
      fileData: z.string(), // Base64
      contentType: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Validar token da loja
      const auth = await db.validarTokenLoja(input.token);
      if (!auth) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
      }
      
      const { storagePut } = await import('./storage');
      
      // Decodificar base64
      const buffer = Buffer.from(input.fileData, 'base64');
      
      // Criar nome único para o arquivo
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `tarefas-loja-anexos/${auth.loja.id}/${timestamp}-${randomSuffix}-${input.fileName}`;
      
      // Upload para S3
      const { url } = await storagePut(fileKey, buffer, input.contentType);
      
      return { url, fileKey };
    }),

  // ==================== REUNIÕES QUINZENAIS (LOJAS) ====================
  reunioesQuinzenais: router({
    // Autenticar loja via token
    autenticarLoja: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const result = await db.validarTokenLoja(input.token);
        if (!result) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido ou inativo' });
        }
        return {
          lojaId: result.loja.id,
          lojaNome: result.loja.nome,
          lojaEmail: result.loja.email,
        };
      }),
    
    // Listar pendentes da loja (para a loja ver)
    listarPendentes: publicProcedure
      .input(z.object({
        token: z.string(),
        apenasAtivos: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.listarPendentesLoja(auth.loja.id, input.apenasAtivos ?? true);
      }),
    
    // Atualizar estado de pendente (pela loja)
    atualizarPendente: publicProcedure
      .input(z.object({
        token: z.string(),
        pendenteId: z.number(),
        estado: z.enum(['pendente', 'em_progresso', 'resolvido']),
        comentario: z.string().optional(),
        reuniaoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        await db.atualizarPendenteLoja(input.pendenteId, input.estado, input.comentario, input.reuniaoId);
        return { success: true };
      }),
    
    // Criar nova reunião quinzenal
    criarReuniao: publicProcedure
      .input(z.object({
        token: z.string(),
        dataReuniao: z.string(),
        participantes: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.criarReuniaoQuinzenal({
          lojaId: auth.loja.id,
          dataReuniao: new Date(input.dataReuniao),
          participantes: JSON.stringify(input.participantes),
          estado: 'rascunho',
        });
      }),
    
    // Atualizar reunião quinzenal
    atualizarReuniao: publicProcedure
      .input(z.object({
        token: z.string(),
        reuniaoId: z.number(),
        temasDiscutidos: z.string().optional(),
        decisoesTomadas: z.string().optional(),
        observacoes: z.string().optional(),
        analiseResultados: z.string().optional(),
        planosAcao: z.string().optional(),
        participantes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const { token, reuniaoId, participantes, ...data } = input;
        
        const updateData: Record<string, unknown> = { ...data };
        if (participantes) {
          updateData.participantes = JSON.stringify(participantes);
        }
        
        await db.atualizarReuniaoQuinzenal(reuniaoId, updateData);
        
        return { success: true };
      }),
    
    // Concluir e enviar reunião ao gestor
    concluirReuniao: publicProcedure
      .input(z.object({
        token: z.string(),
        reuniaoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Buscar gestor da loja
        const gestor = await db.getGestorDaLoja(auth.loja.id);
        if (!gestor || !gestor.email) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado ou sem email' });
        }
        
        // Buscar dados da reunião
        const reuniao = await db.getReuniaoQuinzenal(input.reuniaoId);
        if (!reuniao) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
        }
        
        // Buscar pendentes resolvidos nesta reunião
        const pendentes = await db.listarPendentesLoja(auth.loja.id, false);
        
        // Gerar HTML do email
        const participantes = JSON.parse(reuniao.participantes || '[]');
        const htmlEmail = gerarHTMLReuniaoQuinzenal({
          lojaNome: auth.loja.nome,
          dataReuniao: reuniao.dataReuniao,
          participantes,
          temasDiscutidos: reuniao.temasDiscutidos || '',
          decisoesTomadas: reuniao.decisoesTomadas || '',
          observacoes: reuniao.observacoes || '',
          analiseResultados: reuniao.analiseResultados || '',
          planosAcao: reuniao.planosAcao || '',
          pendentes,
        });
        
        // Enviar email
        await sendEmail({
          to: gestor.email,
          subject: `Reunião Quinzenal - ${auth.loja.nome} - ${new Date(reuniao.dataReuniao).toLocaleDateString('pt-PT')}`,
          html: htmlEmail,
        });
        
        // Marcar reunião como enviada
        await db.marcarReuniaoEnviada(input.reuniaoId, gestor.email);
        
        return { success: true, emailEnviadoPara: gestor.email };
      }),
    
    // Listar reuniões da loja (histórico)
    listarReunioesLoja: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.listarReunioesQuinzenaisLoja(auth.loja.id);
      }),
    
    // Obter reunião por ID
    getReuniao: publicProcedure
      .input(z.object({
        token: z.string(),
        reuniaoId: z.number(),
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.getReuniaoQuinzenal(input.reuniaoId);
      }),
    
    // Obter dados da loja para o dashboard
    getDadosLoja: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const pendentesAtivos = await db.contarPendentesLojaAtivos(auth.loja.id);
        const ultimaReuniao = await db.getUltimaReuniaoQuinzenal(auth.loja.id);
        const gestor = await db.getGestorDaLoja(auth.loja.id);
        
        return {
          loja: auth.loja,
          pendentesAtivos,
          ultimaReuniao,
          gestorNome: gestor?.nome || null,
        };
      }),
  }),
  
  // ==================== GESTÃO DE TOKENS DE LOJA (ADMIN/GESTOR) ====================
  tokensLoja: router({
    // Listar tokens (admin vê todos, gestor vê apenas das suas lojas)
    listar: gestorProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        return await db.listarTokensLoja();
      }
      // Gestor: apenas tokens das suas lojas
      const gestor = await db.getGestorByUserId(ctx.user.id);
      if (!gestor) return [];
      return await db.listarTokensLojaByGestor(gestor.id);
    }),
    
    // Criar/obter token para uma loja (gestor só pode criar para suas lojas)
    criarToken: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verificar se gestor tem acesso à loja
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          if (!lojasGestor.some(l => l.id === input.lojaId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
          }
        }
        return await db.getOrCreateTokenLoja(input.lojaId);
      }),
    
    // Ativar/desativar token (gestor só pode para suas lojas)
    toggleAtivo: gestorProcedure
      .input(z.object({
        tokenId: z.number(),
        ativo: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar acesso
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          const tokens = await db.listarTokensLojaByGestor(gestor.id);
          if (!tokens.some(t => t.id === input.tokenId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a este token' });
          }
        }
        await db.toggleTokenLoja(input.tokenId, input.ativo);
        return { success: true };
      }),
    
    // Regenerar token (gestor só pode para suas lojas)
    regenerar: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verificar acesso
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          if (!lojasGestor.some(l => l.id === input.lojaId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
          }
        }
        return await db.regenerarTokenLoja(input.lojaId);
      }),
    
    // Enviar token por email para a loja
    enviarEmail: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verificar acesso
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          if (!lojasGestor.some(l => l.id === input.lojaId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
          }
        }
        
        // Obter loja e token
        const loja = await db.getLojaById(input.lojaId);
        if (!loja) throw new TRPCError({ code: 'NOT_FOUND', message: 'Loja não encontrada' });
        if (!loja.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Loja não tem email configurado' });
        
        const token = await db.getOrCreateTokenLoja(input.lojaId);
        if (!token) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar token' });
        
        // Construir URL do portal
        const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg.manus.space';
        const portalUrl = `${baseUrl}/portal-loja?token=${token.token}`;
        
        // Enviar email
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">PoweringEG Platform</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #1e3a5f;">Olá ${loja.nome}!</h2>
              <p style="color: #374151; line-height: 1.6;">
                Foi-lhe enviado um link de acesso ao Portal de Reuniões Quinzenais.
              </p>
              <p style="color: #374151; line-height: 1.6;">
                Através deste portal poderá:
              </p>
              <ul style="color: #374151; line-height: 1.8;">
                <li>Ver os pendentes atribuídos à sua loja</li>
                <li>Registar as reuniões quinzenais</li>
                <li>Enviar a ata da reunião automaticamente</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" style="background: #1e3a5f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Aceder ao Portal
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                Este link é único e permanente. Guarde-o para acesso futuro.
              </p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                Se não conseguir clicar no botão, copie e cole este link no seu navegador:<br/>
                <a href="${portalUrl}" style="color: #2563eb;">${portalUrl}</a>
              </p>
            </div>
            <div style="background: #1e3a5f; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} PoweringEG Platform - Express Glass
              </p>
            </div>
          </div>
        `;
        
        const enviado = await sendEmail({
          to: loja.email,
          subject: `Acesso ao Portal de Reuniões Quinzenais - ${loja.nome}`,
          html,
        });
        
        if (!enviado) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao enviar email' });
        }
        
        return { success: true, email: loja.email };
      }),
  }),
  
  // ==================== PENDENTES DE LOJA (ADMIN/GESTOR) ====================
  pendentesLoja: router({
    // Criar pendente para uma loja
    criar: protectedProcedure
      .input(z.object({
        lojaId: z.number(),
        descricao: z.string(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.criarPendenteLoja({
          lojaId: input.lojaId,
          criadoPor: ctx.user.id,
          descricao: input.descricao,
          prioridade: input.prioridade || 'media',
        });
      }),
    
    // Listar pendentes de uma loja (para gestor/admin ver)
    listar: protectedProcedure
      .input(z.object({
        lojaId: z.number(),
        apenasAtivos: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return await db.listarPendentesLoja(input.lojaId, input.apenasAtivos);
      }),
    
    // Listar todos os pendentes das lojas do gestor
    listarTodos: gestorProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        // Admin vê todos
        const todasLojas = await db.getAllLojas();
        const pendentes = [];
        for (const loja of todasLojas) {
          const p = await db.listarPendentesLoja(loja.id, true);
          pendentes.push(...p.map(pend => ({ ...pend, lojaNome: loja.nome })));
        }
        return pendentes;
      } else if (ctx.gestor) {
        // Gestor vê apenas das suas lojas
        const lojas = await db.getLojasByGestorId(ctx.gestor.id);
        const pendentes = [];
        for (const loja of lojas) {
          const p = await db.listarPendentesLoja(loja.id, true);
          pendentes.push(...p.map(pend => ({ ...pend, lojaNome: loja.nome })));
        }
        return pendentes;
      }
      return [];
    }),
  }),
  
  // ==================== CONSULTA DE REUNIÕES (ADMIN/GESTOR) ====================
  consultaReunioes: router({
    // Listar todas as reuniões quinzenais
    listar: gestorProcedure
      .input(z.object({
        estado: z.enum(['rascunho', 'concluida', 'enviada']).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role === 'admin') {
          return await db.listarTodasReunioesQuinzenais(undefined, input?.estado);
        } else if (ctx.gestor) {
          const lojas = await db.getLojasByGestorId(ctx.gestor.id);
          const lojasIds = lojas.map(l => l.id);
          return await db.listarTodasReunioesQuinzenais(lojasIds, input?.estado);
        }
        return [];
      }),
    
    // Obter reunião por ID
    getById: gestorProcedure
      .input(z.object({ reuniaoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getReuniaoQuinzenal(input.reuniaoId);
      }),
    
    // Adicionar feedback a uma reunião
    adicionarFeedback: gestorProcedure
      .input(z.object({
        reuniaoId: z.number(),
        feedback: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.adicionarFeedbackReuniao(input.reuniaoId, input.feedback);
        return { success: true };
      }),
    
    // Lojas atrasadas (sem reunião há mais de 15 dias)
    lojasAtrasadas: gestorProcedure
      .input(z.object({ diasLimite: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getLojasAtrasadasReuniao(input?.diasLimite || 15);
      }),
    
    // Estatísticas de reuniões
    estatisticas: adminProcedure.query(async () => {
      return await db.getEstatisticasReunioesQuinzenais();
    }),
  }),
  
  // ==================== TO-DO CATEGORIES ====================
  todoCategories: router({
    // Listar todas as categorias (para gestores autenticados)
    listar: gestorProcedure
      .input(z.object({ apenasAtivas: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllTodoCategories(input?.apenasAtivas ?? true);
      }),
    
    // Listar categorias para Portal da Loja (via token)
    listarPublico: publicProcedure
      .input(z.object({ 
        token: z.string(),
        apenasAtivas: z.boolean().optional() 
      }))
      .query(async ({ input }) => {
        // Validar token da loja
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.getAllTodoCategories(input.apenasAtivas ?? true);
      }),
    
    // Criar categoria (apenas admin)
    criar: adminProcedure
      .input(z.object({
        nome: z.string().min(1),
        cor: z.string().optional(),
        icone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createTodoCategory(input);
      }),
    
    // Atualizar categoria (apenas admin)
    atualizar: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        cor: z.string().optional(),
        icone: z.string().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTodoCategory(id, data);
        return { success: true };
      }),
    
    // Eliminar categoria (apenas admin - soft delete)
    eliminar: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTodoCategory(input.id);
        return { success: true };
      }),
  }),
  
  // ==================== TO-DO ====================
  todos: router({
    // Listar todos os To-Dos com filtros
    listar: gestorProcedure
      .input(z.object({
        lojaId: z.number().optional(),
        userId: z.number().optional(),
        estado: z.string().optional(),
        categoriaId: z.number().optional(),
        prioridade: z.string().optional(),
        criadoPorId: z.number().optional(),
        apenasMeus: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const filtros = { ...input };
        
        // Se apenasMeus, filtrar por user atual
        if (input?.apenasMeus) {
          filtros.userId = ctx.user.id;
        }
        
        // Obter contexto do utilizador para filtrar visibilidade
        let lojasIds: number[] = [];
        let gestorId: number | undefined;
        
        if (ctx.user.role === 'gestor') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (gestor) {
            gestorId = gestor.id;
            const lojasGestor = await db.getLojasByGestorId(gestor.id);
            lojasIds = lojasGestor.map(l => l.id);
          }
        }
        
        const userContext = {
          userId: ctx.user.id,
          role: ctx.user.role,
          gestorId,
          lojasIds,
        };
        
        return await db.getAllTodos(filtros, userContext);
      }),
    
    // Obter To-Do por ID
    getById: gestorProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTodoById(input.id);
      }),
    
    // Criar To-Do
    criar: gestorProcedure
      .input(z.object({
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        categoriaId: z.number().optional(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
        atribuidoLojaId: z.number().optional(),
        atribuidoUserId: z.number().optional(),
        dataLimite: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const todo = await db.createTodo({
          ...input,
          criadoPorId: ctx.user.id,
          dataLimite: input.dataLimite ? new Date(input.dataLimite) : undefined,
        });
        
        // Enviar notificação por email se atribuído a uma loja
        if (input.atribuidoLojaId && todo) {
          const loja = await db.getLojaById(input.atribuidoLojaId);
          if (loja?.email) {
            try {
              await sendEmail({
                to: loja.email,
                subject: `Nova Tarefa Atribuída: ${input.titulo}`,
                html: gerarHTMLNotificacaoTodo({
                  tipo: 'nova',
                  titulo: input.titulo,
                  descricao: input.descricao || '',
                  prioridade: input.prioridade || 'media',
                  criadoPor: ctx.user.name || 'Gestor',
                  lojaNome: loja.nome,
                }),
              });
            } catch (e) {
              console.error('Erro ao enviar email de notificação:', e);
            }
          }
        }
        
        return todo;
      }),
    
    // Atualizar To-Do
    atualizar: gestorProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        categoriaId: z.number().nullable().optional(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
        estado: z.enum(['pendente', 'em_progresso', 'concluida', 'devolvida']).optional(),
        atribuidoLojaId: z.number().nullable().optional(),
        atribuidoUserId: z.number().nullable().optional(),
        dataLimite: z.string().nullable().optional(),
        comentario: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTodo(id, {
          ...data,
          dataLimite: data.dataLimite ? new Date(data.dataLimite) : null,
        });
        return { success: true };
      }),
    
    // Concluir To-Do
    concluir: gestorProcedure
      .input(z.object({
        id: z.number(),
        comentario: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.concluirTodo(input.id, input.comentario);
        return { success: true };
      }),
    
    // Devolver To-Do ao criador
    devolver: gestorProcedure
      .input(z.object({
        id: z.number(),
        comentario: z.string().min(1, 'Deve indicar o motivo da devolução'),
      }))
      .mutation(async ({ input }) => {
        await db.devolverTodo(input.id, input.comentario);
        return { success: true };
      }),
    
    // Reatribuir To-Do
    reatribuir: gestorProcedure
      .input(z.object({
        id: z.number(),
        lojaId: z.number().optional(),
        userId: z.number().optional(),
        motivo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.reatribuirTodo(
          input.id,
          { lojaId: input.lojaId, userId: input.userId },
          input.motivo
        );
        
        // Enviar notificação por email se reatribuído a uma loja
        if (input.lojaId) {
          const loja = await db.getLojaById(input.lojaId);
          const todo = await db.getTodoById(input.id);
          if (loja?.email && todo) {
            try {
              await sendEmail({
                to: loja.email,
                subject: `Tarefa Reatribuída: ${todo.titulo}`,
                html: gerarHTMLNotificacaoTodo({
                  tipo: 'reatribuida',
                  titulo: todo.titulo,
                  descricao: todo.descricao || '',
                  prioridade: todo.prioridade,
                  criadoPor: ctx.user.name || 'Gestor',
                  lojaNome: loja.nome,
                }),
              });
            } catch (e) {
              console.error('Erro ao enviar email de notificação:', e);
            }
          }
        }
        
        return { success: true };
      }),
    
    // Eliminar To-Do
    eliminar: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTodo(input.id);
        return { success: true };
      }),
    
    // Marcar To-Do como visto
    marcarVisto: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.marcarTodoComoVisto(input.id);
        return { success: true };
      }),
    
    // Marcar múltiplos To-Dos como vistos
    marcarMultiplosVistos: gestorProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        for (const id of input.ids) {
          await db.marcarTodoComoVisto(id);
        }
        return { success: true };
      }),
    
    // Marcar To-Do como visto pelo gestor (para controlar animação do botão)
    marcarVistoGestor: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.marcarTodoComoVistoGestor(input.id);
        return { success: true };
      }),
    
    // Marcar múltiplos To-Dos como vistos pelo gestor
    marcarMultiplosVistosGestor: gestorProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.marcarMultiplosTodosComoVistoGestor(input.ids);
        return { success: true };
      }),
    
    // Contar To-Dos não vistos
    countNaoVistos: gestorProcedure.query(async ({ ctx }) => {
      // Obter contexto do utilizador
      let lojasIds: number[] = [];
      if (ctx.user.role === 'gestor') {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (gestor) {
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          lojasIds = lojasGestor.map(l => l.id);
        }
      }
      return await db.countTodosNaoVistos(ctx.user.id, ctx.user.role, lojasIds);
    }),
    
    // Estatísticas de To-Dos
    estatisticas: gestorProcedure.query(async () => {
      return await db.contarTodosPorEstado();
    }),
    
    // Contar tarefas pendentes atribuídas ao utilizador
    countPendentesAtribuidosAMim: gestorProcedure.query(async ({ ctx }) => {
      return await db.countTodosPendentesAtribuidosAMim(ctx.user.id);
    }),
    
    // Mudar status com resposta (notifica a loja)
    mudarStatusComResposta: gestorProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(['pendente', 'em_progresso', 'concluida', 'devolvida']),
        resposta: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const todo = await db.getTodoById(input.id);
        if (!todo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' });
        }
        
        // Atualizar o estado e adicionar resposta ao comentário
        const comentarioAtualizado = input.resposta 
          ? `[${new Date().toLocaleDateString('pt-PT')} - ${ctx.user.name}] ${input.resposta}${todo.comentario ? '\n\n--- Histórico ---\n' + todo.comentario : ''}`
          : todo.comentario;
        
        await db.updateTodo(input.id, {
          estado: input.estado,
          comentario: comentarioAtualizado,
          // Marcar como não visto para a loja ver a atualização
          visto: false,
          vistoEm: null,
        });
        
        // Notificar a loja por email se a tarefa estava atribuída a uma loja
        if (todo.atribuidoLojaId) {
          const loja = await db.getLojaById(todo.atribuidoLojaId);
          if (loja?.email) {
            try {
              const estadoTexto = {
                'pendente': 'Pendente',
                'em_progresso': 'Em Progresso',
                'concluida': 'Concluída',
                'devolvida': 'Devolvida'
              }[input.estado] || input.estado;
              
              await sendEmail({
                to: loja.email,
                subject: `Atualização de Tarefa: ${todo.titulo} - ${estadoTexto}`,
                html: gerarHTMLNotificacaoTodo({
                  tipo: 'status_atualizado',
                  titulo: todo.titulo,
                  descricao: todo.descricao || '',
                  prioridade: todo.prioridade,
                  criadoPor: ctx.user.name || 'Gestor',
                  lojaNome: loja.nome,
                  novoEstado: estadoTexto,
                  resposta: input.resposta,
                }),
              });
            } catch (e) {
              console.error('Erro ao enviar email de notificação:', e);
            }
          }
        }
        
        return { success: true };
      }),
  }),
  
  // ==================== TO-DO PORTAL LOJA ====================
  todosPortalLoja: router({
    // Listar To-Dos da loja (via token)
    listar: publicProcedure
      .input(z.object({
        token: z.string(),
        apenasAtivos: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.getTodosByLojaId(auth.loja.id, input.apenasAtivos ?? true);
      }),
    
    // Contar To-Dos ativos da loja
    contar: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.contarTodosLojaAtivos(auth.loja.id);
      }),
    
    // Atualizar estado do To-Do (pela loja)
    atualizarEstado: publicProcedure
      .input(z.object({
        token: z.string(),
        todoId: z.number(),
        estado: z.enum(['pendente', 'em_progresso']),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se o To-Do pertence a esta loja
        const todo = await db.getTodoById(input.todoId);
        if (!todo || todo.atribuidoLojaId !== auth.loja.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para alterar esta tarefa' });
        }
        
        await db.updateTodo(input.todoId, { estado: input.estado });
        return { success: true };
      }),
    
    // Concluir To-Do (pela loja)
    concluir: publicProcedure
      .input(z.object({
        token: z.string(),
        todoId: z.number(),
        comentario: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se o To-Do pertence a esta loja
        const todo = await db.getTodoById(input.todoId);
        if (!todo || todo.atribuidoLojaId !== auth.loja.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para alterar esta tarefa' });
        }
        
        await db.concluirTodo(input.todoId, input.comentario);
        return { success: true };
      }),
    
    // Devolver To-Do ao criador (pela loja)
    devolver: publicProcedure
      .input(z.object({
        token: z.string(),
        todoId: z.number(),
        comentario: z.string().min(1, 'Deve indicar o motivo da devolução'),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se o To-Do pertence a esta loja
        const todo = await db.getTodoById(input.todoId);
        if (!todo || todo.atribuidoLojaId !== auth.loja.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para alterar esta tarefa' });
        }
        
        await db.devolverTodo(input.todoId, input.comentario);
        
        // Notificar criador por email
        const criador = await db.getUserById(todo.criadoPorId);
        if (criador?.email) {
          try {
            await sendEmail({
              to: criador.email,
              subject: `Tarefa Devolvida: ${todo.titulo}`,
              html: gerarHTMLNotificacaoTodo({
                tipo: 'devolvida',
                titulo: todo.titulo,
                descricao: todo.descricao || '',
                prioridade: todo.prioridade,
                criadoPor: criador.name || 'Gestor',
                lojaNome: auth.loja.nome,
                comentario: input.comentario,
              }),
            });
          } catch (e) {
            console.error('Erro ao enviar email de notificação:', e);
          }
        }
        
        return { success: true };
      }),
    
    // Criar To-Do (pela loja, atribuído ao gestor responsável)
    criar: publicProcedure
      .input(z.object({
        token: z.string(),
        titulo: z.string().min(1, 'Título é obrigatório'),
        descricao: z.string().optional(),
        categoriaId: z.number().optional(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
        anexos: z.array(z.object({
          url: z.string(),
          nome: z.string(),
          tipo: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Obter o gestor responsável pela loja
        const gestorDaLoja = await db.getGestorDaLoja(auth.loja.id);
        if (!gestorDaLoja) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Não foi encontrado um gestor responsável por esta loja' });
        }
        
        // Criar a tarefa atribuída ao gestor
        const todo = await db.createTodo({
          titulo: input.titulo,
          descricao: input.descricao,
          categoriaId: input.categoriaId,
          prioridade: input.prioridade || 'media',
          atribuidoUserId: gestorDaLoja.userId, // Atribuir ao gestor
          atribuidoLojaId: null, // Não é atribuída à loja, é criada pela loja
          criadoPorId: gestorDaLoja.userId, // Usar o userId do gestor como proxy (a loja não tem userId)
          criadoPorLojaId: auth.loja.id, // Guardar que foi criada pela loja
          anexos: input.anexos ? JSON.stringify(input.anexos) : null,
        });
        
        if (!todo) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar tarefa' });
        }
        
        // Notificar gestor por email
        if (gestorDaLoja.email) {
          try {
            await sendEmail({
              to: gestorDaLoja.email,
              subject: `Nova Tarefa da Loja ${auth.loja.nome}: ${input.titulo}`,
              html: gerarHTMLNotificacaoTodo({
                tipo: 'nova_da_loja',
                titulo: input.titulo,
                descricao: input.descricao || '',
                prioridade: input.prioridade || 'media',
                criadoPor: auth.loja.nome,
                lojaNome: auth.loja.nome,
              }),
            });
          } catch (e) {
            console.error('Erro ao enviar email de notificação:', e);
          }
        }
        
        return { success: true, todoId: todo.id };
      }),
    
    // Listar histórico de tarefas enviadas ao gestor (criadas pela loja)
    historicoEnviadas: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.getTodosEnviadosPelaLoja(auth.loja.id);
      }),
    
    // Criar tarefa interna (fica só na loja, não vai ao gestor)
    criarInterna: publicProcedure
      .input(z.object({
        token: z.string(),
        titulo: z.string().min(1, 'Título é obrigatório'),
        descricao: z.string().optional(),
        categoriaId: z.number().optional(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
        dataLimite: z.string().optional(),
        anexos: z.array(z.object({
          url: z.string(),
          nome: z.string(),
          tipo: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Obter o gestor responsável pela loja (para usar como criadoPorId)
        const gestorDaLoja = await db.getGestorDaLoja(auth.loja.id);
        if (!gestorDaLoja) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Não foi encontrado um gestor responsável por esta loja' });
        }
        
        // Criar a tarefa interna (atribuída à própria loja)
        const todo = await db.createTodo({
          titulo: input.titulo,
          descricao: input.descricao,
          categoriaId: input.categoriaId,
          prioridade: input.prioridade || 'media',
          atribuidoLojaId: auth.loja.id, // Atribuída à própria loja
          atribuidoUserId: null,
          criadoPorId: gestorDaLoja.userId, // Usar o userId do gestor como proxy
          criadoPorLojaId: auth.loja.id, // Criada pela loja
          isInterna: true, // Marcar como interna
          dataLimite: input.dataLimite ? new Date(input.dataLimite) : undefined,
          anexos: input.anexos ? JSON.stringify(input.anexos) : null,
        });
        
        if (!todo) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar tarefa' });
        }
        
        return { success: true, todoId: todo.id };
      }),
    
    // Listar tarefas internas da loja
    listarInternas: publicProcedure
      .input(z.object({
        token: z.string(),
        apenasAtivas: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.getTodosInternosDaLoja(auth.loja.id, input.apenasAtivas ?? true);
      }),
    
    // Atualizar tarefa interna
    atualizarInterna: publicProcedure
      .input(z.object({
        token: z.string(),
        todoId: z.number(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        estado: z.enum(['pendente', 'em_progresso', 'concluida']).optional(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se a tarefa é interna e pertence a esta loja
        const todo = await db.getTodoById(input.todoId);
        if (!todo || !todo.isInterna || todo.criadoPorLojaId !== auth.loja.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para alterar esta tarefa' });
        }
        
        const { token, todoId, ...data } = input;
        await db.updateTodo(todoId, data);
        return { success: true };
      }),
    
    // Eliminar tarefa interna
    eliminarInterna: publicProcedure
      .input(z.object({
        token: z.string(),
        todoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se a tarefa é interna e pertence a esta loja
        const todo = await db.getTodoById(input.todoId);
        if (!todo || !todo.isInterna || todo.criadoPorLojaId !== auth.loja.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para eliminar esta tarefa' });
        }
        
        await db.deleteTodo(input.todoId);
        return { success: true };
      }),
    
    // Responder a tarefa (quando o gestor já respondeu, a loja pode responder de volta)
    responder: publicProcedure
      .input(z.object({
        token: z.string(),
        todoId: z.number(),
        resposta: z.string().min(1, 'A resposta não pode estar vazia'),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se a tarefa foi criada pela loja (tarefas enviadas ao gestor)
        const todo = await db.getTodoById(input.todoId);
        if (!todo || todo.criadoPorLojaId !== auth.loja.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para responder a esta tarefa' });
        }
        
        // Verificar se o gestor já respondeu (tem comentário)
        if (!todo.comentario) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Só pode responder após o gestor ter respondido' });
        }
        
        // Atualizar a resposta da loja
        await db.updateTodo(input.todoId, { respostaLoja: input.resposta });
        
        // Notificar o gestor por email
        const gestorDaLoja = await db.getGestorDaLoja(auth.loja.id);
        if (gestorDaLoja?.email) {
          try {
            await sendEmail({
              to: gestorDaLoja.email,
              subject: `Resposta da Loja ${auth.loja.nome}: ${todo.titulo}`,
              html: gerarHTMLNotificacaoTodo({
                tipo: 'resposta_loja',
                titulo: todo.titulo,
                descricao: todo.descricao || '',
                prioridade: todo.prioridade,
                criadoPor: auth.loja.nome,
                lojaNome: auth.loja.nome,
                comentario: input.resposta,
              }),
            });
          } catch (e) {
            console.error('Erro ao enviar email de notificação:', e);
          }
        }
        
        return { success: true };
      }),
    
    // Adicionar observação a tarefa RECEBIDA (do gestor)
    adicionarObservacao: publicProcedure
      .input(z.object({
        token: z.string(),
        todoId: z.number(),
        observacao: z.string().min(1, 'A observação não pode estar vazia'),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se a tarefa está atribuída a esta loja (tarefas recebidas do gestor)
        const todo = await db.getTodoById(input.todoId);
        if (!todo || todo.atribuidoLojaId !== auth.loja.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para adicionar observação a esta tarefa' });
        }
        
        // Atualizar a resposta da loja (usamos o mesmo campo respostaLoja)
        await db.updateTodo(input.todoId, { respostaLoja: input.observacao });
        
        // Notificar o gestor por email
        const criador = await db.getUserById(todo.criadoPorId);
        if (criador?.email) {
          try {
            await sendEmail({
              to: criador.email,
              subject: `Observação da Loja ${auth.loja.nome}: ${todo.titulo}`,
              html: gerarHTMLNotificacaoTodo({
                tipo: 'observacao_loja',
                titulo: todo.titulo,
                descricao: todo.descricao || '',
                prioridade: todo.prioridade,
                criadoPor: auth.loja.nome,
                lojaNome: auth.loja.nome,
                comentario: input.observacao,
              }),
            });
          } catch (e) {
            console.error('Erro ao enviar email de notificação:', e);
          }
        }
        
        return { success: true };
      }),
  }),
  
  // ==================== RELATÓRIO BOARD (ADMINISTRAÇÃO) ====================
  relatorioBoard: router({
    // Gerar dados completos do relatório board
    gerarDados: adminProcedure
      .input(z.object({
        periodo: z.enum(['mes_atual', 'mes_anterior', 'trimestre_anterior', 'semestre_anterior', 'ano_anterior']).optional(),
      }).optional())
      .query(async ({ input }) => {
        const { gerarDadosRelatorioBoard } = await import('./relatorioBoardService');
        return await gerarDadosRelatorioBoard(input?.periodo || 'mes_atual');
      }),
    
    // Gerar análise IA do relatório board
    gerarAnaliseIA: adminProcedure
      .input(z.object({
        periodo: z.enum(['mes_atual', 'mes_anterior', 'trimestre_anterior', 'semestre_anterior', 'ano_anterior']).optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const { gerarDadosRelatorioBoard, gerarAnaliseIARelatorioBoard } = await import('./relatorioBoardService');
        const dados = await gerarDadosRelatorioBoard(input?.periodo || 'mes_atual');
        const analise = await gerarAnaliseIARelatorioBoard(dados);
        return { dados, analise };
      }),
  }),
  
  // ==================== OCORRÊNCIAS ESTRUTURAIS ====================
  ocorrenciasEstruturais: router({
    // Buscar todos os temas para autocomplete
    getTemas: gestorProcedure.query(async () => {
      return await db.getAllTemasOcorrencias();
    }),
    
    // Buscar temas por texto (autocomplete)
    searchTemas: gestorProcedure
      .input(z.object({ texto: z.string() }))
      .query(async ({ input }) => {
        if (input.texto.length < 1) {
          return await db.getAllTemasOcorrencias();
        }
        return await db.searchTemasOcorrencias(input.texto);
      }),
    
    // Criar nova ocorrência estrutural
    criar: gestorProcedure
      .input(z.object({
        tema: z.string().min(1, 'Tema é obrigatório'),
        descricao: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
        abrangencia: z.enum(['nacional', 'regional', 'zona']),
        zonaAfetada: z.string().optional(),
        lojasAfetadas: z.array(z.number()).optional(),
        impacto: z.enum(['baixo', 'medio', 'alto', 'critico']),
        fotos: z.array(z.string()).optional(),
        sugestaoAcao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Admin pode criar ocorrências sem ser gestor
        const gestorId = ctx.gestor?.id || null;
        
        // Criar ou obter o tema
        const tema = await db.getOrCreateTemaOcorrencia(input.tema, ctx.user.id);
        
        // Criar a ocorrência
        const ocorrencia = await db.createOcorrenciaEstrutural({
          gestorId: gestorId,
          temaId: tema.id,
          descricao: input.descricao,
          abrangencia: input.abrangencia,
          zonaAfetada: input.zonaAfetada,
          lojasAfetadas: input.lojasAfetadas,
          impacto: input.impacto,
          fotos: input.fotos,
          sugestaoAcao: input.sugestaoAcao,
        });
        
        // Registar atividade (apenas se for gestor)
        if (gestorId) {
          await db.registarAtividade({
            gestorId: gestorId,
            tipo: 'ocorrencia_estrutural',
            descricao: `Nova ocorrência estrutural: ${input.tema}`,
          });
        }
        
        return ocorrencia;
      }),
    
    // Listar todas as ocorrências (admin)
    listAll: adminProcedure.query(async () => {
      return await db.getAllOcorrenciasEstruturais();
    }),
    
    // Listar ocorrências do gestor atual
    listMinhas: gestorProcedure.query(async ({ ctx }) => {
      if (!ctx.gestor) {
        return [];
      }
      return await db.getOcorrenciasEstruturaisByGestorId(ctx.gestor.id);
    }),
    
    // Buscar ocorrência por ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getOcorrenciaEstruturalById(input.id);
      }),
    
    // Atualizar estado da ocorrência (admin)
    updateEstado: adminProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(['reportado', 'em_analise', 'em_resolucao', 'resolvido']),
        notasAdmin: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateOcorrenciaEstruturalEstado(input.id, input.estado, input.notasAdmin);
        return { success: true };
      }),
    
    // Contar ocorrências por estado
    countPorEstado: protectedProcedure.query(async () => {
      return await db.countOcorrenciasEstruturaisPorEstado();
    }),
    
    // Contar ocorrências não resolvidas (para badge)
    countNaoResolvidas: protectedProcedure.query(async () => {
      return await db.countOcorrenciasEstruturaisNaoResolvidas();
    }),
    
    // Contar ocorrências por estado para o gestor atual
    countPorEstadoGestor: gestorProcedure.query(async ({ ctx }) => {
      if (!ctx.gestor) {
        return { reportado: 0, emAnalise: 0, emResolucao: 0, resolvido: 0, total: 0 };
      }
      return await db.countOcorrenciasEstruturaisPorEstadoByGestor(ctx.gestor.id);
    }),
    
    // Editar ocorrência (gestor pode editar as suas, admin pode editar todas)
    editar: protectedProcedure
      .input(z.object({
        id: z.number(),
        tema: z.string().min(1).optional(),
        descricao: z.string().min(10).optional(),
        abrangencia: z.enum(['nacional', 'regional', 'zona']).optional(),
        zonaAfetada: z.string().nullable().optional(),
        lojasAfetadas: z.array(z.number()).nullable().optional(),
        impacto: z.enum(['baixo', 'medio', 'alto', 'critico']).optional(),
        fotos: z.array(z.string()).nullable().optional(),
        sugestaoAcao: z.string().nullable().optional(),
        estado: z.enum(['reportado', 'em_analise', 'em_resolucao', 'resolvido']).optional(),
        notasAdmin: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar se a ocorrência existe
        const ocorrencia = await db.getOcorrenciaEstruturalById(input.id);
        if (!ocorrencia) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ocorrência não encontrada' });
        }
        
        // Verificar permissões: admin pode editar tudo, gestor só as suas
        const isAdmin = ctx.user.role === 'admin';
        const gestor = await db.getGestorByUserId(ctx.user.id);
        const isOwner = gestor && ocorrencia.gestorId === gestor.id;
        
        if (!isAdmin && !isOwner) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para editar esta ocorrência' });
        }
        
        // Se for gestor, não pode alterar estado ou notas admin
        const updateData: Parameters<typeof db.updateOcorrenciaEstrutural>[1] = {};
        
        if (input.descricao !== undefined) updateData.descricao = input.descricao;
        if (input.abrangencia !== undefined) updateData.abrangencia = input.abrangencia;
        if (input.zonaAfetada !== undefined) updateData.zonaAfetada = input.zonaAfetada;
        if (input.lojasAfetadas !== undefined) updateData.lojasAfetadas = input.lojasAfetadas;
        if (input.impacto !== undefined) updateData.impacto = input.impacto;
        if (input.fotos !== undefined) updateData.fotos = input.fotos;
        if (input.sugestaoAcao !== undefined) updateData.sugestaoAcao = input.sugestaoAcao;
        
        // Apenas admin pode alterar tema, estado e notas
        if (isAdmin) {
          if (input.tema) {
            const tema = await db.getOrCreateTemaOcorrencia(input.tema, ctx.user.id);
            updateData.temaId = tema.id;
          }
          if (input.estado !== undefined) updateData.estado = input.estado;
          if (input.notasAdmin !== undefined) updateData.notasAdmin = input.notasAdmin;
        }
        
        await db.updateOcorrenciaEstrutural(input.id, updateData);
        return { success: true };
      }),
    
    // Enviar ocorrência por email para o admin
    enviarEmail: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const ocorrencia = await db.getOcorrenciaEstruturalById(input.id);
        if (!ocorrencia) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ocorrência não encontrada' });
        }
        
        // Verificar se é o dono da ocorrência
        if (!ctx.gestor || ocorrencia.gestorId !== ctx.gestor.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Só pode enviar as suas próprias ocorrências' });
        }
        
        const gestorNome = ocorrencia.gestorNome || ctx.user.name || 'Gestor';
        const temaNome = ocorrencia.temaNome;
        
        // Obter email do admin real (Mauro Furtado - mfurtado@expressglass.pt)
        // Excluir Marco Amorim (admin de teste) e outros admins de teste
        const admins = await db.getAllUsers();
        const adminReal = admins.find(u => 
          u.role === 'admin' && 
          u.email && 
          !u.email.includes('test') &&
          u.name?.toLowerCase() !== 'marco amorim'
        );
        
        if (!adminReal || !adminReal.email) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Admin não encontrado para envio de email' });
        }
        
        // Parsear fotos do JSON
        let fotos: string[] = [];
        if (ocorrencia.fotos) {
          try {
            fotos = JSON.parse(ocorrencia.fotos as string);
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
              // Detectar extensão da imagem
              const ext = fotoUrl.toLowerCase().includes('.png') ? 'png' : 'jpg';
              const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
              return {
                filename: `foto_ocorrencia_${index + 1}.${ext}`,
                content: base64,
                contentType,
              };
            } catch (error) {
              console.error(`Erro ao fazer download da foto ${index + 1}:`, error);
              return null;
            }
          })
        );
        
        // Filtrar anexos que falharam
        const validAttachments = fotoAttachments.filter(a => a !== null) as Array<{filename: string; content: string; contentType: string}>;
        
        // Gerar HTML do email (sem fotos inline, pois serão anexos)
        const htmlContent = gerarHTMLOcorrenciaEstrutural({
          gestorNome,
          temaNome,
          descricao: ocorrencia.descricao,
          abrangencia: ocorrencia.abrangencia,
          zonaAfetada: ocorrencia.zonaAfetada,
          impacto: ocorrencia.impacto,
          sugestaoAcao: ocorrencia.sugestaoAcao,
          fotos: [], // Não incluir fotos inline, serão anexos
          criadoEm: ocorrencia.createdAt,
        });
        
        // Adicionar nota sobre anexos no HTML
        const htmlComNota = validAttachments.length > 0 
          ? htmlContent.replace(
              '</body>',
              `<div style="text-align: center; padding: 20px; background: #f0fdf4; margin: 20px 30px; border-radius: 8px; border: 1px solid #22c55e;">
                <p style="margin: 0; color: #166534; font-weight: 600;">📎 ${validAttachments.length} foto(s) anexada(s) a este email</p>
                <p style="margin: 5px 0 0; color: #15803d; font-size: 12px;">Verifique os anexos para visualizar as imagens.</p>
              </div>
              </body>`
            )
          : htmlContent;
        
        // Enviar email via SMTP Gmail (egpowering@gmail.com)
        const assunto = `Ocorrência: ${temaNome} - Reportado por ${gestorNome}`;
        
        // Enviar para o admin
        const enviadoAdmin = await sendEmail({
          to: adminReal.email,
          subject: assunto,
          html: htmlComNota,
          attachments: validAttachments,
        });
        
        if (!enviadoAdmin) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao enviar email para o admin' });
        }
        
        // Enviar cópia para o gestor que reportou
        const gestorEmail = ctx.user.email;
        let copiaEnviada = false;
        if (gestorEmail) {
          // Gerar HTML da cópia com nota de que é uma cópia
          const htmlCopia = htmlComNota.replace(
            '</body>',
            `<div style="text-align: center; padding: 15px; background: #eff6ff; margin: 20px 30px; border-radius: 8px; border: 1px solid #3b82f6;">
              <p style="margin: 0; color: #1d4ed8; font-size: 13px;">📋 Esta é uma cópia da ocorrência que reportou. O email original foi enviado para ${adminReal.name || 'o administrador'}.</p>
            </div>
            </body>`
          );
          
          copiaEnviada = await sendEmail({
            to: gestorEmail,
            subject: `[Cópia] ${assunto}`,
            html: htmlCopia,
            attachments: validAttachments,
          });
          
          if (!copiaEnviada) {
            console.error(`Falha ao enviar cópia para o gestor: ${gestorEmail}`);
          }
        }
        
        const mensagemSucesso = copiaEnviada 
          ? `Email enviado com sucesso para ${adminReal.name || adminReal.email} e cópia enviada para ${gestorEmail}`
          : `Email enviado com sucesso para ${adminReal.name || adminReal.email}`;
        
        return { success: true, message: mensagemSucesso };
      }),
  }),
});

// Função auxiliar para gerar HTML do email de reunião quinzenal
function gerarHTMLReuniaoQuinzenal(dados: {
  lojaNome: string;
  dataReuniao: Date;
  participantes: string[];
  temasDiscutidos: string;
  decisoesTomadas: string;
  observacoes: string;
  analiseResultados: string;
  planosAcao: string;
  pendentes: Array<{ descricao: string; estado: string; comentarioLoja: string | null }>;
}): string {
  const dataFormatada = new Date(dados.dataReuniao).toLocaleDateString('pt-PT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const pendentesResolvidos = dados.pendentes.filter(p => p.estado === 'resolvido');
  const pendentesPendentes = dados.pendentes.filter(p => p.estado !== 'resolvido');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reunião Quinzenal - ${dados.lojaNome}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 16px; font-weight: 600; color: #2563eb; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #e5e7eb; }
        .section-content { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .participantes { display: flex; flex-wrap: wrap; gap: 8px; }
        .participante { background: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
        .pendente { padding: 10px; margin: 5px 0; border-radius: 6px; }
        .pendente.resolvido { background: #dcfce7; border-left: 4px solid #22c55e; }
        .pendente.pendente-status { background: #fef3c7; border-left: 4px solid #f59e0b; }
        .footer { background: #1f2937; color: white; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px; }
        pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; font-family: inherit; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📝 Reunião Quinzenal</h1>
        <p>${dados.lojaNome} - ${dataFormatada}</p>
      </div>
      
      <div class="content">
        <div class="section">
          <div class="section-title">👥 Participantes</div>
          <div class="section-content">
            <div class="participantes">
              ${dados.participantes.map(p => `<span class="participante">${p}</span>`).join('')}
            </div>
          </div>
        </div>
        
        ${dados.temasDiscutidos ? `
        <div class="section">
          <div class="section-title">💬 Temas Discutidos</div>
          <div class="section-content"><pre>${dados.temasDiscutidos}</pre></div>
        </div>
        ` : ''}
        
        ${dados.decisoesTomadas ? `
        <div class="section">
          <div class="section-title">✅ Decisões Tomadas</div>
          <div class="section-content"><pre>${dados.decisoesTomadas}</pre></div>
        </div>
        ` : ''}
        
        ${dados.analiseResultados ? `
        <div class="section">
          <div class="section-title">📊 Análise de Resultados</div>
          <div class="section-content"><pre>${dados.analiseResultados}</pre></div>
        </div>
        ` : ''}
        
        ${dados.planosAcao ? `
        <div class="section">
          <div class="section-title">🎯 Planos de Ação</div>
          <div class="section-content"><pre>${dados.planosAcao}</pre></div>
        </div>
        ` : ''}
        
        ${pendentesResolvidos.length > 0 ? `
        <div class="section">
          <div class="section-title">✅ Pendentes Resolvidos (${pendentesResolvidos.length})</div>
          <div class="section-content">
            ${pendentesResolvidos.map(p => `
              <div class="pendente resolvido">
                <strong>${p.descricao}</strong>
                ${p.comentarioLoja ? `<br><small>💬 ${p.comentarioLoja}</small>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        ${pendentesPendentes.length > 0 ? `
        <div class="section">
          <div class="section-title">⚠️ Pendentes em Aberto (${pendentesPendentes.length})</div>
          <div class="section-content">
            ${pendentesPendentes.map(p => `
              <div class="pendente pendente-status">
                <strong>${p.descricao}</strong>
                ${p.comentarioLoja ? `<br><small>💬 ${p.comentarioLoja}</small>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        ${dados.observacoes ? `
        <div class="section">
          <div class="section-title">📝 Observações</div>
          <div class="section-content"><pre>${dados.observacoes}</pre></div>
        </div>
        ` : ''}
      </div>
      
      <div class="footer">
        <p>PoweringEG Platform 2.0 - Sistema de Reuniões Quinzenais</p>
        <p>Este email foi gerado automaticamente após a conclusão da reunião.</p>
      </div>
    </body>
    </html>
  `;
}

// Função auxiliar para gerar HTML do email de notificação de To-Do
function gerarHTMLNotificacaoTodo(dados: {
  tipo: 'nova' | 'reatribuida' | 'devolvida' | 'concluida' | 'nova_da_loja' | 'status_atualizado' | 'resposta_loja' | 'observacao_loja';
  titulo: string;
  descricao: string;
  prioridade: string;
  criadoPor: string;
  lojaNome: string;
  comentario?: string;
  novoEstado?: string;
  resposta?: string;
}): string {
  const corPrioridade = {
    baixa: '#22c55e',
    media: '#3b82f6',
    alta: '#f59e0b',
    urgente: '#ef4444',
  }[dados.prioridade] || '#3b82f6';
  
  const tipoTexto = {
    nova: 'Nova Tarefa Atribuída',
    reatribuida: 'Tarefa Reatribuída',
    devolvida: 'Tarefa Devolvida',
    concluida: 'Tarefa Concluída',
    nova_da_loja: 'Nova Tarefa da Loja',
    status_atualizado: `Atualização de Tarefa: ${dados.novoEstado || 'Atualizado'}`,
    resposta_loja: 'Resposta da Loja',
    observacao_loja: 'Observação da Loja',
  }[dados.tipo];
  
  const corTipo = {
    nova: '#3b82f6',
    reatribuida: '#8b5cf6',
    devolvida: '#f59e0b',
    concluida: '#22c55e',
    nova_da_loja: '#10b981',
    status_atualizado: '#6366f1',
    resposta_loja: '#06b6d4',
    observacao_loja: '#14b8a6',
  }[dados.tipo];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${tipoTexto}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6; }
        .container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: ${corTipo}; color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 24px; }
        .task-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .badge-prioridade { background: ${corPrioridade}20; color: ${corPrioridade}; }
        .info-row { display: flex; margin: 12px 0; }
        .info-label { font-weight: 600; color: #6b7280; width: 100px; }
        .info-value { flex: 1; }
        .descricao { background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${corTipo}; }
        .comentario { background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b; }
        .footer { text-align: center; padding: 16px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
        .btn { display: inline-block; background: ${corTipo}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${tipoTexto}</h1>
        </div>
        <div class="content">
          <div class="task-title">${dados.titulo}</div>
          <span class="badge badge-prioridade">Prioridade: ${dados.prioridade}</span>
          
          <div class="info-row">
            <span class="info-label">Loja:</span>
            <span class="info-value">${dados.lojaNome}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Criado por:</span>
            <span class="info-value">${dados.criadoPor}</span>
          </div>
          
          ${dados.descricao ? `
          <div class="descricao">
            <strong>Descrição:</strong><br>
            ${dados.descricao}
          </div>
          ` : ''}
          
          ${dados.comentario ? `
          <div class="comentario">
            <strong>Comentário:</strong><br>
            ${dados.comentario}
          </div>
          ` : ''}
          
          ${dados.novoEstado ? `
          <div style="background: #e0e7ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #6366f1;">
            <strong>Novo Estado:</strong> ${dados.novoEstado}
          </div>
          ` : ''}
          
          ${dados.resposta ? `
          <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;">
            <strong>Resposta do Gestor:</strong><br>
            ${dados.resposta}
          </div>
          ` : ''}
          
          <p style="text-align: center;">
            <a href="#" class="btn">Ver no Portal</a>
          </p>
        </div>
        <div class="footer">
          <p>PoweringEG Platform 2.0 - Sistema de Tarefas</p>
          <p>Este email foi gerado automaticamente.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Função auxiliar para gerar HTML do email de ocorrência estrutural
// Layout profissional consistente com outros emails da plataforma
function gerarHTMLOcorrenciaEstrutural(dados: {
  gestorNome: string;
  temaNome: string;
  descricao: string;
  abrangencia: string;
  zonaAfetada: string | null;
  impacto: string;
  sugestaoAcao: string | null;
  fotos: string[];
  criadoEm: Date;
}): string {
  const dataFormatada = new Date(dados.criadoEm).toLocaleDateString('pt-PT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const impactoColors: Record<string, { bg: string; text: string; label: string }> = {
    baixo: { bg: '#dcfce7', text: '#166534', label: 'Baixo' },
    medio: { bg: '#fef3c7', text: '#92400e', label: 'Médio' },
    alto: { bg: '#fed7aa', text: '#c2410c', label: 'Alto' },
    critico: { bg: '#fecaca', text: '#dc2626', label: 'Crítico' },
  };
  
  const impactoStyle = impactoColors[dados.impacto] || impactoColors.baixo;
  
  const abrangenciaLabels: Record<string, string> = {
    nacional: 'Nacional',
    regional: 'Regional',
    zona: 'Zona',
  };
  
  // Gerar HTML das fotos com imagens embutidas
  const fotosHtml = dados.fotos.length > 0 
    ? `
      <tr>
        <td style="padding: 20px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 15px 20px; border-bottom: 2px solid #dc2626;">
                <span style="font-size: 16px; font-weight: 600; color: #dc2626;">📷 Anexos (${dados.fotos.length} foto(s))</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px;">
                ${dados.fotos.map((foto, i) => `
                  <a href="${foto}" target="_blank" style="display: inline-block; margin: 5px; padding: 8px 16px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">Ver Foto ${i + 1}</a>
                `).join('')}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : '';
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ocorrência - ${dados.temaNome}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header com Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 180px; height: auto; margin-bottom: 15px;" />
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">⚠️ Ocorrência</h1>
              <p style="margin: 10px 0 0; font-size: 18px; color: rgba(255,255,255,0.9);">${dados.temaNome}</p>
            </td>
          </tr>
          
          <!-- Informações Gerais -->
          <tr>
            <td style="padding: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 2px solid #dc2626;">
                    <span style="font-size: 16px; font-weight: 600; color: #dc2626;">📝 Informações Gerais</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="10">
                      <tr>
                        <td width="50%" style="background: #f9fafb; padding: 15px; border-radius: 8px; vertical-align: top;">
                          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Reportado por</div>
                          <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${dados.gestorNome}</div>
                        </td>
                        <td width="50%" style="background: #f9fafb; padding: 15px; border-radius: 8px; vertical-align: top;">
                          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Data</div>
                          <div style="font-size: 14px; font-weight: 600; color: #1f2937;">${dataFormatada}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="background: #f9fafb; padding: 15px; border-radius: 8px; vertical-align: top;">
                          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Abrangência</div>
                          <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${abrangenciaLabels[dados.abrangencia] || dados.abrangencia}${dados.zonaAfetada ? ` - ${dados.zonaAfetada}` : ''}</div>
                        </td>
                        <td width="50%" style="background: #f9fafb; padding: 15px; border-radius: 8px; vertical-align: top;">
                          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Impacto</div>
                          <div style="font-size: 16px; font-weight: 600;">
                            <span style="display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; background: ${impactoStyle.bg}; color: ${impactoStyle.text};">${impactoStyle.label}</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Descrição -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 2px solid #dc2626;">
                    <span style="font-size: 16px; font-weight: 600; color: #dc2626;">📄 Descrição</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 14px; line-height: 1.6; color: #374151; white-space: pre-wrap;">${dados.descricao}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${dados.sugestaoAcao ? `
          <!-- Sugestão de Ação -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 2px solid #10b981;">
                    <span style="font-size: 16px; font-weight: 600; color: #10b981;">💡 Sugestão de Ação</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px; background: #f0fdf4;">
                    <div style="font-size: 14px; line-height: 1.6; color: #166534; white-space: pre-wrap;">${dados.sugestaoAcao}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          ${fotosHtml}
          
          <!-- Footer -->
          <tr>
            <td style="background: #1f2937; padding: 25px; text-align: center;">
              <p style="margin: 0 0 5px; font-size: 14px; color: #ffffff; font-weight: 600;">PoweringEG Platform 2.0</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Ocorrências Estruturais</p>
              <p style="margin: 10px 0 0; font-size: 11px; color: #6b7280;">Este email foi enviado automaticamente. Por favor não responda.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export type AppRouter = typeof appRouter;
