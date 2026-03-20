import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

import { gerarRelatorioComIA, gerarDicaDashboard, gerarRelatorioIAGestor, gerarRelatorioIAGestorMultiplosMeses } from "./aiService";
import { sendEmail, gerarHTMLRelatorioLivre, gerarHTMLRelatorioCompleto, gerarHTMLPedidoAprovado, gerarHTMLPedidoReprovado, gerarHTMLPedidoAnulado, gerarHTMLPedidoEditado, gerarHTMLNovoPedidoApoio } from "./emailService";
import { enviarResumoSemanal, verificarENotificarAlertas } from "./weeklyReport";
import { gerarPrevisoes, gerarEGuardarPrevisoes } from "./previsaoService";
import { gerarSugestoesMelhoria, formatarRelatorioLivre, formatarRelatorioCompleto } from "./sugestaoService";
import { gerarPlanoVisitasSemanal, gerarPlanosSemanaisParaTodosGestores, verificarEGerarPlanosSexta } from "./planoVisitasService";
import { notificarGestorRelatorioAdmin } from "./notificacaoGestor";
import { notifyOwner } from "./_core/notification";
import { processarPergunta, getSugestoesPergunta } from "./chatbotService";
import { vapidPublicKey, notificarGestorNovaTarefa, notificarLojaNovaTarefa, notificarGestorRespostaLoja, notificarLojaRespostaGestor } from "./pushService";
import { notificarNovoPedidoApoio, notificarPedidoAnulado, notificarPedidoEditado, notificarAgendamentoCriado } from "./telegramService";
import { processarAnalise, ResultadoAnalise, RelatorioLoja, gerarHTMLEmailAnalise } from "./analiseFichasService";
import { gerarPDFRelacaoRH } from "./pdfRelacaoRH";
import { enviarLembretesRH, isDia20 } from "./lembreteRHService";
import { storagePut } from "./storage";
import { gerarExcelControloStock } from "./stockExcelService";

// Função para obter feriados portugueses de um ano específico
function obterFeriadosPortugueses(ano: number): string[] {
  const feriados: string[] = [];
  
  // Feriados fixos
  feriados.push(`${ano}-01-01`); // Ano Novo
  feriados.push(`${ano}-04-25`); // 25 de Abril
  feriados.push(`${ano}-05-01`); // Dia do Trabalhador
  feriados.push(`${ano}-06-10`); // Dia de Portugal
  feriados.push(`${ano}-08-15`); // Assunção de Nossa Senhora
  feriados.push(`${ano}-10-05`); // Implantação da República
  feriados.push(`${ano}-11-01`); // Todos os Santos
  feriados.push(`${ano}-12-01`); // Restauração da Independência
  feriados.push(`${ano}-12-08`); // Imaculada Conceição
  feriados.push(`${ano}-12-25`); // Natal
  
  // Feriados móveis (Páscoa e Carnaval)
  // Cálculo simplificado da Páscoa usando o algoritmo de Meeus/Jones/Butcher
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  
  const pascoa = new Date(ano, mes - 1, dia);
  
  // Carnaval (47 dias antes da Páscoa)
  const carnaval = new Date(pascoa);
  carnaval.setDate(pascoa.getDate() - 47);
  feriados.push(carnaval.toISOString().split('T')[0]);
  
  // Sexta-feira Santa (2 dias antes da Páscoa)
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);
  feriados.push(sextaSanta.toISOString().split('T')[0]);
  
  // Corpo de Deus (60 dias depois da Páscoa)
  const corpoDeus = new Date(pascoa);
  corpoDeus.setDate(pascoa.getDate() + 60);
  feriados.push(corpoDeus.toISOString().split('T')[0]);
  
  return feriados;
}

// Função auxiliar para gerar alerta de processos repetidos
// diasDesdeIdentificacao: número de dias desde a primeira identificação do processo
function gerarAlertaProcessosRepetidos(
  processosRepetidos: Array<{ obrano: number; matricula: string; categoria: string; diasAberto: number }>,
  diasDesdeIdentificacao: number = 0
): string {
  const categoriasNomes: Record<string, string> = {
    'abertas5Dias': 'Aberta +5 dias',
    'aposAgendamento': 'Após Agendamento',
    'statusAlerta': 'Status Alerta',
    'semNotas': 'Sem Notas',
    'notasAntigas': 'Notas Antigas',
    'devolverVidro': 'Devolver Vidro',
    'semEmailCliente': 'Sem Email Cliente',
  };
  
  // Quadro MUITO destacado - vermelho forte com borda grossa
  let html = `<div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 4px solid #dc2626; padding: 20px; margin-bottom: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">`;
  
  // Cabeçalho com ícone grande e texto de alerta
  html += `<div style="text-align: center; margin-bottom: 15px;">`;
  html += `<span style="font-size: 48px;">🚨</span><br>`;
  html += `<strong style="color: #dc2626; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">AÇÃO IMEDIATA NECESSÁRIA!</strong>`;
  html += `</div>`;
  
  // Mensagem principal com dias desde identificação
  html += `<div style="background: #dc2626; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center;">`;
  if (diasDesdeIdentificacao > 0) {
    html += `<strong style="font-size: 18px;">⚠️ PROCESSOS IDENTIFICADOS HÁ ${diasDesdeIdentificacao} DIAS SEM INTERVENÇÃO!</strong><br><br>`;
    html += `<span style="font-size: 14px;">Estes ${processosRepetidos.length} processos foram identificados na análise de há ${diasDesdeIdentificacao} dias e permanecem EXATAMENTE IGUAIS.</span>`;
  } else {
    html += `<strong style="font-size: 18px;">⚠️ ${processosRepetidos.length} PROCESSOS REPETIDOS DA ANÁLISE ANTERIOR!</strong><br><br>`;
    html += `<span style="font-size: 14px;">Estes processos já tinham sido identificados e NÃO TIVERAM NENHUMA INTERVENÇÃO.</span>`;
  }
  html += `</div>`;
  
  // Lista de processos agrupados por categoria
  html += `<div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #fca5a5;">`;
  
  // Agrupar por categoria
  const porCategoria: Record<string, typeof processosRepetidos> = {};
  for (const p of processosRepetidos) {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
    porCategoria[p.categoria].push(p);
  }
  
  for (const [categoria, processos] of Object.entries(porCategoria)) {
    html += `<div style="margin-bottom: 12px;">`;
    html += `<strong style="color: #991b1b; font-size: 14px; text-transform: uppercase;">${categoriasNomes[categoria] || categoria} (${processos.length})</strong><br>`;
    html += `<div style="margin-left: 15px; margin-top: 5px;">`;
    for (const p of processos.slice(0, 10)) {
      html += `<span style="display: inline-block; background: #fef2f2; padding: 3px 8px; margin: 2px; border-radius: 4px; border: 1px solid #fca5a5; font-size: 13px;">`;
      html += `<strong>FS ${p.obrano}</strong> // ${p.matricula} <span style="color: #dc2626;">(${p.diasAberto} dias)</span>`;
      html += `</span><br>`;
    }
    if (processos.length > 10) {
      html += `<em style="color: #991b1b; font-size: 12px;">... e mais ${processos.length - 10} processos</em><br>`;
    }
    html += `</div></div>`;
  }
  
  html += `</div>`;
  
  // Rodapé com chamada à ação
  html += `<div style="background: #7f1d1d; color: white; padding: 12px; border-radius: 8px; margin-top: 15px; text-align: center;">`;
  html += `<strong style="font-size: 16px;">⚡ DEVERÁ ATUAR IMEDIATAMENTE NESTES PROCESSOS! ⚡</strong><br>`;
  html += `<span style="font-size: 13px;">Não permita que estes processos se acumulem. Trate-os HOJE.</span>`;
  html += `</div>`;
  
  html += `</div>`;
  
  return html;
}

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

// Clean up old background jobs every 10 minutes
setInterval(() => { db.cleanOldBackgroundJobs().catch(() => {}); }, 10 * 60 * 1000);

export const appRouter = router({
  system: systemRouter,
  
  // ==================== NOTIFICAÇÕES ====================
  notificacoes: router({
    enviarResumoSemanal: adminProcedure.mutation(async () => {
      const enviado = await enviarResumoSemanal();
      return { success: enviado };
    }),
  }),
  
  // ==================== PUSH NOTIFICATIONS ====================
  push: router({
    // Obter chave pública VAPID para o cliente
    getVapidPublicKey: publicProcedure.query(() => {
      return { publicKey: vapidPublicKey };
    }),
    
    // Subscrever para push notifications (utilizador autenticado)
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.upsertPushSubscription({
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
        });
        return { success: !!result, subscriptionId: result?.id };
      }),
    
    // Cancelar subscrição
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await db.removePushSubscription(input.endpoint);
        return { success: true };
      }),
  }),
  
  // Push para Portal da Loja (sem autenticação OAuth)
  pushPortalLoja: router({
    subscribe: publicProcedure
      .input(z.object({
        token: z.string(),
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const result = await db.upsertPushSubscription({
          lojaId: auth.loja.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
        });
        return { success: !!result, subscriptionId: result?.id };
      }),
    
    unsubscribe: publicProcedure
      .input(z.object({
        token: z.string(),
        endpoint: z.string(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        await db.removePushSubscription(input.endpoint);
        return { success: true };
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
    
    listByGestor: protectedProcedure.query(async ({ ctx }) => {
      const gestor = await db.getGestorByUserId(ctx.user.id);
      if (!gestor) return [];
      return await db.getLojasByGestorId(gestor.id);
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getLojaById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        nome: z.string().min(1),
        numeroLoja: z.number().optional().nullable(),
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
        numeroLoja: z.number().optional().nullable(),
        email: z.string().email().optional().nullable(),
        contacto: z.string().optional().nullable(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        minimoRelatoriosLivres: z.number().min(0).optional(),
        minimoRelatoriosCompletos: z.number().min(0).optional(),
        // Informações complementares (facultativas)
        telefone: z.string().optional().nullable(),
        telemovel: z.string().optional().nullable(),
        morada: z.string().optional().nullable(),
        codigoPostal: z.string().optional().nullable(),
        localidade: z.string().optional().nullable(),
        renda: z.string().optional().nullable(),
        senhorio: z.string().optional().nullable(),
        contactoSenhorio: z.string().optional().nullable(),
        areaM2: z.string().optional().nullable(),
        observacoesImovel: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Campos complementares que gestores também podem editar
        const camposComplementares = ['telefone', 'telemovel', 'morada', 'codigoPostal', 'localidade', 'renda', 'senhorio', 'contactoSenhorio', 'areaM2', 'observacoesImovel'] as const;
        
        // Verificar se gestor tem acesso à loja
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          if (!lojasGestor.some(l => l.id === id)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
          }
          // Gestor pode editar email, contacto, numeroLoja e campos complementares
          const gestorData: any = {};
          if (data.email !== undefined) gestorData.email = data.email;
          if (data.contacto !== undefined) gestorData.contacto = data.contacto;
          if (data.numeroLoja !== undefined) gestorData.numeroLoja = data.numeroLoja;
          for (const campo of camposComplementares) {
            if ((data as any)[campo] !== undefined) gestorData[campo] = (data as any)[campo];
          }
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
    
    // ==================== RELAÇÕES ENTRE LOJAS ====================
    
    // Listar relações de lojas (gestor vê as suas, admin vê todas)
    listarRelacoes: gestorProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        return await db.getAllRelacoesLojas();
      }
      if (!ctx.gestor) return [];
      return await db.getRelacoesLojasByGestorId(ctx.gestor.id);
    }),
    
    // Criar relação entre lojas
    criarRelacao: gestorProcedure
      .input(z.object({
        lojaPrincipalId: z.number(),
        lojaRelacionadaId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar se gestor tem acesso às duas lojas
        if (ctx.user.role !== 'admin' && ctx.gestor) {
          const lojasGestor = await db.getLojasByGestorId(ctx.gestor.id);
          const lojasIds = lojasGestor.map(l => l.id);
          if (!lojasIds.includes(input.lojaPrincipalId) || !lojasIds.includes(input.lojaRelacionadaId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a uma das lojas' });
          }
        }
        
        // Não permitir relacionar uma loja consigo mesma
        if (input.lojaPrincipalId === input.lojaRelacionadaId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não pode relacionar uma loja consigo mesma' });
        }
        
        const relacao = await db.criarRelacaoLojas(
          input.lojaPrincipalId,
          input.lojaRelacionadaId,
          ctx.gestor?.id
        );
        return { success: true, relacao };
      }),
    
    // Remover relação entre lojas
    removerRelacao: gestorProcedure
      .input(z.object({ relacaoId: z.number() }))
      .mutation(async ({ input }) => {
        await db.removerRelacaoLojas(input.relacaoId);
        return { success: true };
      }),
    
    // Obter lojas relacionadas com uma loja
    getLojasRelacionadas: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLojasRelacionadas(input.lojaId);
      }),
    
    // ==================== PORTAL DO GESTOR ====================
    // Obter dados da loja para o gestor (sem token, usa autenticação normal)
    getDadosLojaGestor: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verificar se o gestor tem acesso a esta loja
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não é gestor' });
        }
        
        const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
        const temAcesso = lojasDoGestor.some(l => l.id === input.lojaId);
        if (!temAcesso) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
        }
        
        const loja = await db.getLojaById(input.lojaId);
        const pendentesAtivos = await db.contarPendentesLojaAtivos(input.lojaId);
        const ultimaReuniao = await db.getUltimaReuniaoQuinzenal(input.lojaId);
        const gestorDaLoja = await db.getGestorDaLoja(input.lojaId);
        
        return {
          loja,
          pendentesAtivos,
          ultimaReuniao,
          gestorNome: gestorDaLoja?.nome || null,
        };
      }),
    
    // Obter pendentes da loja para o gestor
    getPendentesLojaGestor: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ ctx, input }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não é gestor' });
        }
        
        const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
        const temAcesso = lojasDoGestor.some(l => l.id === input.lojaId);
        if (!temAcesso) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
        }
        
        return await db.getPendentesByLojaId(input.lojaId);
      }),
    
    // Obter reuniões da loja para o gestor
    getReunioesLojaGestor: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ ctx, input }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não é gestor' });
        }
        
        const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
        const temAcesso = lojasDoGestor.some(l => l.id === input.lojaId);
        if (!temAcesso) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
        }
        
        return await db.listarReunioesQuinzenaisLoja(input.lojaId);
      }),
    
    // Obter todos/tarefas da loja para o gestor
    getTodosLojaGestor: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ ctx, input }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não é gestor' });
        }
        
        const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
        const temAcesso = lojasDoGestor.some(l => l.id === input.lojaId);
        if (!temAcesso) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
        }
        
        return await db.getTodosByLojaId(input.lojaId);
      }),
    
    // Dashboard completo da loja para o gestor
    dashboardCompletoGestor: gestorProcedure
      .input(z.object({
        lojaId: z.number(),
        meses: z.array(z.object({ mes: z.number().min(1).max(12), ano: z.number() })).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não é gestor' });
        }
        
        const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
        const temAcesso = lojasDoGestor.some(l => l.id === input.lojaId);
        if (!temAcesso) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
        }
        
        const now = new Date();
        const anoAtual = now.getFullYear();
        const mesAtual = now.getMonth() + 1;
        
        let mesesConsulta: { mes: number; ano: number }[] = [];
        let periodoLabel = '';
        
        if (input.meses && input.meses.length > 0) {
          mesesConsulta = input.meses;
          if (mesesConsulta.length === 1) {
            periodoLabel = new Date(mesesConsulta[0].ano, mesesConsulta[0].mes - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
          } else {
            const mesesOrdenados = [...mesesConsulta].sort((a, b) => {
              if (a.ano !== b.ano) return a.ano - b.ano;
              return a.mes - b.mes;
            });
            const primeiro = mesesOrdenados[0];
            const ultimo = mesesOrdenados[mesesOrdenados.length - 1];
            periodoLabel = `${new Date(primeiro.ano, primeiro.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} - ${new Date(ultimo.ano, ultimo.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} (${mesesConsulta.length} meses)`;
          }
        } else {
          mesesConsulta = [{ mes: mesAtual, ano: anoAtual }];
          periodoLabel = new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        }
        
        // Buscar dados agregados para todos os meses do período
        let totalServicos = 0;
        let totalObjetivo = 0;
        let totalReparacoes = 0;
        let totalParaBrisas = 0;
        let taxaReparacaoExcel: number | null = null;
        let desvioPercentualDiaExcel: number | null = null;
        let totalEscovas = 0;
        let totalPolimento = 0;
        let totalTratamento = 0;
        let totalLavagens = 0;
        let totalOutros = 0;
        let dataUltimaAtualizacao: Date | null = null;
        let resultadosAgregados: any = null;
        
        for (const p of mesesConsulta) {
          const resultadosArr = await db.getResultadosMensaisPorLoja(input.lojaId, p.mes, p.ano);
          if (resultadosArr) {
            totalServicos += Number(resultadosArr.totalServicos) || 0;
            totalObjetivo += Number(resultadosArr.objetivoMensal) || 0;
            totalReparacoes += Number(resultadosArr.qtdReparacoes) || 0;
            if (resultadosArr.updatedAt) {
            totalParaBrisas += Number(resultadosArr.qtdParaBrisas) || 0;
              const dataAtual = new Date(resultadosArr.updatedAt);
            if (resultadosArr.taxaReparacao !== null && resultadosArr.taxaReparacao !== undefined) {
              taxaReparacaoExcel = parseFloat(String(resultadosArr.taxaReparacao));
            }
              if (!dataUltimaAtualizacao || dataAtual > dataUltimaAtualizacao) {
                dataUltimaAtualizacao = dataAtual;
              }
            }
            if (!resultadosAgregados) resultadosAgregados = resultadosArr;
          }
          
          const complementaresArr = await db.getVendasComplementares(p.mes, p.ano, input.lojaId);
          if (complementaresArr && complementaresArr.length > 0) {
            const c = complementaresArr[0];
            totalEscovas += Number(c.escovasQtd) || 0;
            totalPolimento += Number(c.polimentoQtd) || 0;
            totalTratamento += Number(c.tratamentoQtd) || 0;
            totalLavagens += Number(c.lavagensTotal) || 0;
            totalOutros += Number(c.outrosQtd) || 0;
          }
        }
        
        // Calcular métricas agregadas
        const desvioPercentual = totalObjetivo > 0 ? (totalServicos - totalObjetivo) / totalObjetivo : null;
        const taxaReparacao = taxaReparacaoExcel;
        const escovasPercent = totalServicos > 0 ? totalEscovas / totalServicos : null;
        
        // Obter dados de objetivo diário do primeiro mês (mais recente)
        const objetivoDiaAtual = resultadosAgregados?.objetivoDiaAtual ? parseFloat(String(resultadosAgregados.objetivoDiaAtual)) : null;
        const desvioObjetivoAcumulado = resultadosAgregados?.desvioObjetivoAcumulado ? parseFloat(String(resultadosAgregados.desvioObjetivoAcumulado)) : null;
        const desvioPercentualDia = resultadosAgregados?.desvioPercentualDia ? parseFloat(String(resultadosAgregados.desvioPercentualDia)) : null;
        
        const resultados = {
          totalServicos,
          objetivoMensal: totalObjetivo,
          objetivoDiaAtual,
          desvioObjetivoAcumulado,
          desvioPercentualDia,
          desvioPercentualMes: desvioPercentual,
          taxaReparacao,
          totalReparacoes,
          gapReparacoes22: taxaReparacao !== null && taxaReparacao < 0.22 
            ? Math.ceil(totalServicos * 0.22 - totalReparacoes) 
            : 0,
        };
        
        const complementares = {
          escovasQtd: totalEscovas,
          escovasPercent,
          polimentoQtd: totalPolimento,
          tratamentoQtd: totalTratamento,
          lavagensTotal: totalLavagens,
          outrosQtd: totalOutros,
        };
        
        // Buscar dados do mês anterior para comparativo
        const mesAnteriorData = mesesConsulta[0];
        const mesCompMes = mesAnteriorData.mes === 1 ? 12 : mesAnteriorData.mes - 1;
        const mesCompAno = mesAnteriorData.mes === 1 ? mesAnteriorData.ano - 1 : mesAnteriorData.ano;
        const resultadosMesAnterior = await db.getResultadosMensaisPorLoja(input.lojaId, mesCompMes, mesCompAno);
        const complementaresMesAnterior = await db.getVendasComplementares(mesCompMes, mesCompAno, input.lojaId);
        
        // Calcular variações
        const variacaoServicos = resultadosMesAnterior && resultadosMesAnterior.totalServicos 
          ? ((totalServicos - Number(resultadosMesAnterior.totalServicos)) / Number(resultadosMesAnterior.totalServicos)) * 100 
          : null;
        const variacaoReparacoes = resultadosMesAnterior && resultadosMesAnterior.qtdReparacoes 
          ? ((totalReparacoes - Number(resultadosMesAnterior.qtdReparacoes)) / Number(resultadosMesAnterior.qtdReparacoes)) * 100 
          : null;
        const escovasAnterior = complementaresMesAnterior && complementaresMesAnterior.length > 0 
          ? Number(complementaresMesAnterior[0].escovasQtd) || 0 
          : 0;
        const variacaoEscovas = escovasAnterior > 0 
          ? ((totalEscovas - escovasAnterior) / escovasAnterior) * 100 
          : null;
        
        const comparativoMesAnterior = {
          servicosAnterior: resultadosMesAnterior?.totalServicos || 0,
          variacaoServicos,
          reparacoesAnterior: resultadosMesAnterior?.qtdReparacoes || 0,
          variacaoReparacoes,
          escovasAnterior,
          variacaoEscovas,
        };
        
        const evolucao = await db.getEvolucaoMensal(input.lojaId, 12);
        
        // Gerar alertas
        const alertas: { tipo: 'warning' | 'danger' | 'success'; mensagem: string }[] = [];
        
        if (resultados) {
          // Alerta taxa de reparação
          const taxaRep = resultados.taxaReparacao !== null ? parseFloat(String(resultados.taxaReparacao)) : null;
          if (taxaRep !== null && taxaRep < 0.22) {
            alertas.push({
              tipo: 'warning',
              mensagem: `Taxa de reparação (${(taxaRep * 100).toFixed(1)}%) abaixo do objetivo de 22%`
            });
          }
          
          // Alerta desvio objetivo diário
          const desvioDia = resultados.desvioPercentualDia !== null ? parseFloat(String(resultados.desvioPercentualDia)) : null;
          if (desvioDia !== null && desvioDia < -0.1) {
            alertas.push({
              tipo: 'danger',
              mensagem: `Desvio de ${(desvioDia * 100).toFixed(1)}% abaixo do objetivo diário acumulado`
            });
          } else if (desvioDia !== null && desvioDia >= 0) {
            alertas.push({
              tipo: 'success',
              mensagem: `Parabéns! Objetivo diário acumulado atingido (+${(desvioDia * 100).toFixed(1)}%)`
            });
          }
          
          // Alerta gap reparações
          if (resultados.gapReparacoes22 !== null && resultados.gapReparacoes22 > 0) {
            alertas.push({
              tipo: 'warning',
              mensagem: `Faltam ${resultados.gapReparacoes22} reparações para atingir 22%`
            });
          }
        }
        
        if (complementares) {
          // Alerta escovas
          const escovasPerc = complementares.escovasPercent !== null ? parseFloat(String(complementares.escovasPercent)) : null;
          if (escovasPerc !== null && escovasPerc < 0.075) {
            alertas.push({
              tipo: 'warning',
              mensagem: `Escovas (${(escovasPerc * 100).toFixed(1)}%) abaixo do objetivo de 7.5%`
            });
          } else if (escovasPerc !== null && escovasPerc >= 0.10) {
            alertas.push({
              tipo: 'success',
              mensagem: `Excelente! Escovas acima de 10% (${(escovasPerc * 100).toFixed(1)}%)`
            });
          }
        }
        
        // Usar desvio objetivo diário do Excel (v6.11.13) em vez de recalcular
        const desvioObjetivoDiario = resultados?.desvioPercentualDia !== null && resultados?.desvioPercentualDia !== undefined
          ? parseFloat(String(resultados.desvioPercentualDia)) * 100
          : 0;
        
        // ==================== NPS ====================
        let dadosNPS: { mes: number; ano: number; nps: number | null; taxaResposta: number | null; totalRespostas: number | null; totalConvites: number | null }[] = [];
        let historicoNPS: { mes: number; ano: number; nps: number | null; taxaResposta: number | null; totalRespostas: number | null; totalConvites: number | null }[] = [];
        let npsElegivel = false;
        let npsMedio: number | null = null;
        let taxaRespostaNPS: number | null = null;
        let motivoInelegibilidade: string | null = null;
        
        try {
          const npsFieldMap: Record<number, { nps: string; taxa: string }> = {
            1: { nps: 'npsJan', taxa: 'taxaRespostaJan' },
            2: { nps: 'npsFev', taxa: 'taxaRespostaFev' },
            3: { nps: 'npsMar', taxa: 'taxaRespostaMar' },
            4: { nps: 'npsAbr', taxa: 'taxaRespostaAbr' },
            5: { nps: 'npsMai', taxa: 'taxaRespostaMai' },
            6: { nps: 'npsJun', taxa: 'taxaRespostaJun' },
            7: { nps: 'npsJul', taxa: 'taxaRespostaJul' },
            8: { nps: 'npsAgo', taxa: 'taxaRespostaAgo' },
            9: { nps: 'npsSet', taxa: 'taxaRespostaSet' },
            10: { nps: 'npsOut', taxa: 'taxaRespostaOut' },
            11: { nps: 'npsNov', taxa: 'taxaRespostaNov' },
            12: { nps: 'npsDez', taxa: 'taxaRespostaDez' },
          };
          
          const anoActual = new Date().getFullYear();
          const anosHistorico = [anoActual - 1, anoActual];
          const anosConsulta = [...new Set([...mesesConsulta.map(m => m.ano), ...anosHistorico])];
          
          for (const ano of anosConsulta) {
            const npsLoja = await db.getNPSDadosLoja(input.lojaId, ano);
            if (npsLoja) {
              for (let mes = 1; mes <= 12; mes++) {
                const fields = npsFieldMap[mes];
                if (!fields) continue;
                const npsVal = (npsLoja as any)[fields.nps];
                const taxaVal = (npsLoja as any)[fields.taxa];
                if (npsVal !== null && npsVal !== undefined) {
                  historicoNPS.push({
                    mes,
                    ano,
                    nps: parseFloat(String(npsVal)),
                    taxaResposta: taxaVal !== null && taxaVal !== undefined ? parseFloat(String(taxaVal)) : null,
                    totalRespostas: null,
                    totalConvites: null,
                  });
                }
              }
              
              for (const mesInfo of mesesConsulta) {
                if (mesInfo.ano !== ano) continue;
                const fields = npsFieldMap[mesInfo.mes];
                if (!fields) continue;
                const npsVal = (npsLoja as any)[fields.nps];
                const taxaVal = (npsLoja as any)[fields.taxa];
                if (npsVal !== null && npsVal !== undefined) {
                  dadosNPS.push({
                    mes: mesInfo.mes,
                    ano: mesInfo.ano,
                    nps: parseFloat(String(npsVal)),
                    taxaResposta: taxaVal !== null && taxaVal !== undefined ? parseFloat(String(taxaVal)) : null,
                    totalRespostas: null,
                    totalConvites: null,
                  });
                }
              }
            }
          }
          
          historicoNPS.sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
          
          const npsValidos = dadosNPS.filter(d => d.nps !== null);
          if (npsValidos.length > 0) {
            npsMedio = npsValidos.reduce((sum, d) => sum + (d.nps || 0), 0) / npsValidos.length;
            const taxasValidas = npsValidos.filter(d => d.taxaResposta !== null);
            if (taxasValidas.length > 0) {
              taxaRespostaNPS = taxasValidas.reduce((sum, d) => sum + (d.taxaResposta || 0), 0) / taxasValidas.length;
            }
            
            const npsPercent = npsMedio * 100;
            const taxaPercent = (taxaRespostaNPS || 0) * 100;
            
            if (npsPercent >= 80 && taxaPercent >= 7.5) {
              npsElegivel = true;
            } else {
              if (npsPercent < 80 && taxaPercent < 7.5) {
                motivoInelegibilidade = `NPS (${npsPercent.toFixed(0)}%) abaixo de 80% e Taxa de Resposta (${taxaPercent.toFixed(1)}%) abaixo de 7,5%`;
              } else if (npsPercent < 80) {
                motivoInelegibilidade = `NPS (${npsPercent.toFixed(0)}%) abaixo de 80%`;
              } else {
                motivoInelegibilidade = `Taxa de Resposta (${taxaPercent.toFixed(1)}%) abaixo de 7,5%`;
              }
            }
            
            if (!npsElegivel && motivoInelegibilidade) {
              alertas.push({
                tipo: 'danger',
                mensagem: `Sem direito a prémio NPS: ${motivoInelegibilidade}`
              });
            } else if (npsElegivel) {
              alertas.push({
                tipo: 'success',
                mensagem: `Elegível para prémio NPS! (NPS: ${(npsMedio * 100).toFixed(0)}%, Taxa Resposta: ${((taxaRespostaNPS || 0) * 100).toFixed(1)}%)`
              });
            }
          }
        } catch (e) {
          console.error('[Portal Gestor] Erro ao buscar NPS:', e);
        }
        
        return {
          kpis: {
            servicosRealizados: totalServicos,
            objetivoMensal: totalObjetivo,
            taxaReparacao: taxaReparacao !== null ? taxaReparacao * 100 : 0,
            desvioObjetivoDiario,
            vendasComplementares: totalEscovas + totalPolimento + totalTratamento + totalLavagens + totalOutros,
          },
          resultados,
          complementares,
          evolucao,
          alertas,
          mesesSelecionados: mesesConsulta,
          periodoAtual: mesesConsulta[0],
          periodoLabel,
          dataAtualizacao: dataUltimaAtualizacao?.toISOString() || null,
          comparativoMesAnterior,
          mesesConsultados: mesesConsulta,
          nps: {
            dadosMensais: dadosNPS,
            historicoCompleto: historicoNPS,
            npsMedio,
            taxaRespostaNPS,
            elegivel: npsElegivel,
            motivoInelegibilidade,
          },
        };
      }),
    
    // Análise IA para o Portal do Gestor
    analiseIAGestor: gestorProcedure
      .input(z.object({
        lojaId: z.number(),
        meses: z.array(z.object({
          mes: z.number().min(1).max(12),
          ano: z.number().min(2020).max(2100)
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import('./_core/llm');
        
        // Verificar acesso
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não é gestor' });
        }
        
        const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
        const loja = lojasDoGestor.find(l => l.id === input.lojaId);
        if (!loja) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
        }
        
        // Determinar período
        const hoje = new Date();
        const mesesConsulta = input.meses && input.meses.length > 0 
          ? input.meses 
          : [{ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }];
        
        // Buscar dados da loja
        let totalServicos = 0;
        let totalObjetivo = 0;
        let totalReparacoes = 0;
        let totalEscovas = 0;
        let totalParaBrisas = 0;
        let taxaReparacaoExcel: number | null = null;
        let totalPolimento = 0;
        let totalTratamento = 0;
        let totalLavagens = 0;
        
        for (const p of mesesConsulta) {
          const resultados = await db.getResultadosMensaisPorLoja(input.lojaId, p.mes, p.ano);
          if (resultados) {
            totalServicos += Number(resultados.totalServicos) || 0;
            totalObjetivo += Number(resultados.objetivoMensal) || 0;
            totalReparacoes += Number(resultados.qtdReparacoes) || 0;
            totalParaBrisas += Number(resultados.qtdParaBrisas) || 0;
            if (resultados.taxaReparacao !== null && resultados.taxaReparacao !== undefined) {
              taxaReparacaoExcel = parseFloat(String(resultados.taxaReparacao));
            }
          }
          const complementares = await db.getVendasComplementares(p.mes, p.ano, input.lojaId);
          if (complementares && complementares.length > 0) {
            const c = complementares[0];
            totalEscovas += Number(c.escovasQtd) || 0;
            totalPolimento += Number(c.polimentoQtd) || 0;
            totalTratamento += Number(c.tratamentoQtd) || 0;
            totalLavagens += Number(c.lavagensTotal) || 0;
          }
        }
        
        // Calcular métricas
        const desvioPercentual = totalObjetivo > 0 ? ((totalServicos - totalObjetivo) / totalObjetivo) * 100 : 0;
        const taxaReparacao = taxaReparacaoExcel !== null ? taxaReparacaoExcel * 100 : 0;
        const escovasPercent = totalServicos > 0 ? (totalEscovas / totalServicos) * 100 : 0;
        const servicosFaltam = Math.max(0, totalObjetivo - totalServicos);
        const reparacoesFaltam = Math.max(0, Math.ceil(totalServicos * 0.22) - totalReparacoes);
        
        // Buscar dados do mês anterior para comparativo
        const mesAnterior = mesesConsulta[0].mes === 1 ? 12 : mesesConsulta[0].mes - 1;
        const anoAnterior = mesesConsulta[0].mes === 1 ? mesesConsulta[0].ano - 1 : mesesConsulta[0].ano;
        const resultadosAnt = await db.getResultadosMensaisPorLoja(input.lojaId, mesAnterior, anoAnterior);
        const servicosAnteriores = resultadosAnt ? Number(resultadosAnt.totalServicos) || 0 : 0;
        const variacaoServicos = servicosAnteriores > 0 ? ((totalServicos - servicosAnteriores) / servicosAnteriores) * 100 : 0;
        
        // Calcular dias úteis restantes
        const mesAtual = mesesConsulta[0];
        const ultimoDia = new Date(mesAtual.ano, mesAtual.mes, 0).getDate();
        const diaAtual = hoje.getDate();
        let diasUteisRestantes = 0;
        for (let d = diaAtual + 1; d <= ultimoDia; d++) {
          const data = new Date(mesAtual.ano, mesAtual.mes - 1, d);
          const diaSemana = data.getDay();
          if (diaSemana !== 0 && diaSemana !== 6) diasUteisRestantes++;
        }
        
        // Calcular ritmo necessário
        const servicosPorDia = diasUteisRestantes > 0 ? Math.ceil(servicosFaltam / diasUteisRestantes) : 0;
        
        // Gerar análise com IA
        const prompt = `
Analisa os resultados da loja ${loja.nome} e gera uma análise simples e motivacional.

DADOS DO MÊS:
- Serviços realizados: ${totalServicos} / Objetivo: ${totalObjetivo} (Desvio: ${desvioPercentual.toFixed(1)}%)
- Taxa de reparação: ${taxaReparacao.toFixed(1)}% (objetivo: 22%)
- Escovas: ${escovasPercent.toFixed(1)}% (objetivo: 10%)
- Dias úteis restantes: ${diasUteisRestantes}
- Ritmo necessário: ${servicosPorDia} serviços/dia

Gera uma resposta em JSON com esta estrutura exata:
{
  "focoUrgente": ["lista de 1-2 pontos de foco urgente, diretos e práticos"],
  "pontosPositivos": ["lista de 1-2 pontos positivos da loja"],
  "resumo": "mensagem de síntese e motivação (2-3 frases, tom positivo e encorajador, dar força para os dias que faltam)"
}

IMPORTANTE:
- Sê direto e prático no foco urgente
- O resumo deve ser genuino, positivo e dar força
- Se o objetivo já foi atingido, celebra e incentiva a superar
- Usa linguagem portuguesa de Portugal (não brasileiro)
- Responde APENAS com o JSON, sem texto adicional`;
        
        try {
          const response = await invokeLLM({
            messages: [
              { role: 'system', content: 'És um analista de performance de lojas ExpressGlass. Geras análises estratégicas e motivacionais em português de Portugal. Respondes sempre em JSON válido.' },
              { role: 'user', content: prompt }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'analise_loja',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    focoUrgente: { type: 'array', items: { type: 'string' } },
                    pontosPositivos: { type: 'array', items: { type: 'string' } },
                    resumo: { type: 'string' }
                  },
                  required: ['focoUrgente', 'pontosPositivos', 'resumo'],
                  additionalProperties: false
                }
              }
            }
          });
          
          const messageContent = response.choices?.[0]?.message?.content;
          const content = typeof messageContent === 'string' ? messageContent : '{}';
          const analise = JSON.parse(content);
          
          return {
            ...analise,
            metricas: {
              totalServicos,
              totalObjetivo,
              desvioPercentual,
              taxaReparacao,
              escovasPercent,
              servicosFaltam,
              reparacoesFaltam,
              diasUteisRestantes,
              servicosPorDia,
              variacaoServicos
            }
          };
        } catch (error) {
          console.error('Erro ao gerar análise IA:', error);
          // Retornar análise básica em caso de erro
          return {
            focoUrgente: servicosFaltam > 0 
              ? [`Faltam ${servicosFaltam} serviços para atingir o objetivo`]
              : ['Manter o ritmo atual para superar o objetivo'],
            pontosPositivos: desvioPercentual >= 0 
              ? ['Objetivo mensal atingido!']
              : taxaReparacao >= 22 ? ['Taxa de reparação acima do objetivo!'] : [],
            resumo: desvioPercentual >= 0
              ? 'Parabéns pelo excelente trabalho! Continuem assim e superem ainda mais os objetivos!'
              : `Faltam apenas ${servicosFaltam} serviços! Com foco e determinação, vão conseguir! Força equipa!`,
            metricas: {
              totalServicos,
              totalObjetivo,
              desvioPercentual,
              taxaReparacao,
              escovasPercent,
              servicosFaltam,
              reparacoesFaltam,
              diasUteisRestantes,
              servicosPorDia,
              variacaoServicos
            }
          };
        }
      }),
    
    // Exportar PDF dos resultados da loja (gestor)
    exportarPDFResultados: gestorProcedure
      .input(z.object({
        lojaId: z.number(),
        meses: z.array(z.object({ mes: z.number().min(1).max(12), ano: z.number() })).optional(),
        incluirAnaliseIA: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { gerarPDFResultados } = await import('./pdfService');
        
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não é gestor' });
        }
        
        const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
        const loja = lojasDoGestor.find(l => l.id === input.lojaId);
        if (!loja) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
        }
        
        const now = new Date();
        const anoAtual = now.getFullYear();
        const mesAtual = now.getMonth() + 1;
        
        let mesesConsulta: { mes: number; ano: number }[] = [];
        let periodoLabel = '';
        
        if (input.meses && input.meses.length > 0) {
          mesesConsulta = input.meses;
          if (mesesConsulta.length === 1) {
            periodoLabel = new Date(mesesConsulta[0].ano, mesesConsulta[0].mes - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
          } else {
            const mesesOrdenados = [...mesesConsulta].sort((a, b) => {
              if (a.ano !== b.ano) return a.ano - b.ano;
              return a.mes - b.mes;
            });
            const primeiro = mesesOrdenados[0];
            const ultimo = mesesOrdenados[mesesOrdenados.length - 1];
            periodoLabel = `${new Date(primeiro.ano, primeiro.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} - ${new Date(ultimo.ano, ultimo.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}`;
          }
        } else {
          mesesConsulta = [{ mes: mesAtual, ano: anoAtual }];
          periodoLabel = new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        }
        
        // Buscar dados agregados
        let totalServicos = 0;
        let totalObjetivo = 0;
        let totalReparacoes = 0;
        let totalParaBrisas = 0;
        let taxaReparacaoExcel: number | null = null;
        let desvioPercentualDiaExcel: number | null = null;
        let totalEscovas = 0;
        let totalPolimento = 0;
        let totalTratamento = 0;
        let totalLavagens = 0;
        let totalOutros = 0;
        
        for (const p of mesesConsulta) {
          const resultadosArr = await db.getResultadosMensaisPorLoja(input.lojaId, p.mes, p.ano);
          if (resultadosArr) {
            totalServicos += Number(resultadosArr.totalServicos) || 0;
            totalObjetivo += Number(resultadosArr.objetivoMensal) || 0;
            totalReparacoes += Number(resultadosArr.qtdReparacoes) || 0;
            totalParaBrisas += Number(resultadosArr.qtdParaBrisas) || 0;
            if (resultadosArr.taxaReparacao !== null && resultadosArr.taxaReparacao !== undefined) {
              taxaReparacaoExcel = parseFloat(String(resultadosArr.taxaReparacao));
            }
            if (resultadosArr.desvioPercentualDia !== null && resultadosArr.desvioPercentualDia !== undefined) {
              desvioPercentualDiaExcel = parseFloat(String(resultadosArr.desvioPercentualDia));
            }
          }
          
          const complementaresArr = await db.getVendasComplementares(p.mes, p.ano, input.lojaId);
          if (complementaresArr && complementaresArr.length > 0) {
            const c = complementaresArr[0];
            totalEscovas += Number(c.escovasQtd) || 0;
            totalPolimento += Number(c.polimentoQtd) || 0;
            totalTratamento += Number(c.tratamentoQtd) || 0;
            totalLavagens += Number(c.lavagensTotal) || 0;
            totalOutros += Number(c.outrosQtd) || 0;
          }
        }
        
        // Calcular métricas
        const desvioPercentual = totalObjetivo > 0 ? (totalServicos - totalObjetivo) / totalObjetivo : null;
        const taxaReparacao = taxaReparacaoExcel;
        const escovasPercent = totalServicos > 0 ? totalEscovas / totalServicos : null;
        
        // Usar desvio objetivo diário do Excel (v6.11.13) em vez de recalcular
        const diaAtual = new Date().getDate();
        const desvioObjetivoDiario = desvioPercentualDiaExcel !== null
          ? desvioPercentualDiaExcel * 100
          : 0;
        
        // Buscar dados do mês anterior
        const mesAnteriorData = mesesConsulta[0];
        const mesCompMes = mesAnteriorData.mes === 1 ? 12 : mesAnteriorData.mes - 1;
        const mesCompAno = mesAnteriorData.mes === 1 ? mesAnteriorData.ano - 1 : mesAnteriorData.ano;
        const resultadosMesAnterior = await db.getResultadosMensaisPorLoja(input.lojaId, mesCompMes, mesCompAno);
        const complementaresMesAnterior = await db.getVendasComplementares(mesCompMes, mesCompAno, input.lojaId);
        
        const variacaoServicos = resultadosMesAnterior && resultadosMesAnterior.totalServicos 
          ? ((totalServicos - Number(resultadosMesAnterior.totalServicos)) / Number(resultadosMesAnterior.totalServicos)) * 100 
          : null;
        const variacaoReparacoes = resultadosMesAnterior && resultadosMesAnterior.qtdReparacoes 
          ? ((totalReparacoes - Number(resultadosMesAnterior.qtdReparacoes)) / Number(resultadosMesAnterior.qtdReparacoes)) * 100 
          : null;
        const escovasAnterior = complementaresMesAnterior && complementaresMesAnterior.length > 0 
          ? Number(complementaresMesAnterior[0].escovasQtd) || 0 
          : 0;
        const variacaoEscovas = escovasAnterior > 0 
          ? ((totalEscovas - escovasAnterior) / escovasAnterior) * 100 
          : null;
        
        // Gerar alertas
        const alertas: { tipo: 'warning' | 'danger' | 'success'; mensagem: string }[] = [];
        
        const taxaRep = taxaReparacao !== null ? taxaReparacao : null;
        if (taxaRep !== null && taxaRep < 0.22) {
          alertas.push({
            tipo: 'warning',
            mensagem: `Taxa de reparação (${(taxaRep * 100).toFixed(1)}%) abaixo do objetivo de 22%`
          });
        }
        
        if (desvioObjetivoDiario < -10) {
          alertas.push({
            tipo: 'danger',
            mensagem: `Desvio de ${desvioObjetivoDiario.toFixed(1)}% abaixo do objetivo diário acumulado`
          });
        } else if (desvioObjetivoDiario >= 0) {
          alertas.push({
            tipo: 'success',
            mensagem: `Parabéns! Objetivo diário acumulado atingido (+${desvioObjetivoDiario.toFixed(1)}%)`
          });
        }
        
        const escovasPerc = escovasPercent !== null ? escovasPercent : null;
        if (escovasPerc !== null && escovasPerc < 0.075) {
          alertas.push({
            tipo: 'warning',
            mensagem: `Escovas (${(escovasPerc * 100).toFixed(1)}%) abaixo do objetivo de 7.5%`
          });
        } else if (escovasPerc !== null && escovasPerc >= 0.10) {
          alertas.push({
            tipo: 'success',
            mensagem: `Excelente! Escovas acima de 10% (${(escovasPerc * 100).toFixed(1)}%)`
          });
        }
        
        // Calcular dias úteis restantes e ritmo necessário
        const mesAtualData = mesesConsulta[0];
        const ultimoDiaMes = new Date(mesAtualData.ano, mesAtualData.mes, 0).getDate();
        let diasUteisRestantes = 0;
        for (let d = diaAtual + 1; d <= ultimoDiaMes; d++) {
          const data = new Date(mesAtualData.ano, mesAtualData.mes - 1, d);
          const diaSemana = data.getDay();
          if (diaSemana !== 0 && diaSemana !== 6) diasUteisRestantes++;
        }
        const servicosFaltam = Math.max(0, totalObjetivo - totalServicos);
        const servicosPorDia = diasUteisRestantes > 0 ? Math.ceil(servicosFaltam / diasUteisRestantes) : 0;
        const gapReparacoes = taxaReparacao !== null && taxaReparacao < 0.22 
          ? Math.ceil(totalServicos * 0.22 - totalReparacoes) 
          : 0;
        
        // Buscar evolução mensal (6 meses)
        const evolucao = await db.getEvolucaoMensal(input.lojaId, 6);
        console.log('[ExportPDF] Evolução mensal:', JSON.stringify(evolucao));
        console.log('[ExportPDF] Evolução length:', evolucao?.length);
        
        const dashboardData = {
          kpis: {
            servicosRealizados: totalServicos,
            objetivoMensal: totalObjetivo,
            taxaReparacao: taxaReparacao !== null ? taxaReparacao * 100 : 0,
            desvioObjetivoDiario,
            vendasComplementares: totalEscovas + totalPolimento + totalTratamento + totalLavagens + totalOutros,
          },
          resultados: {
            totalServicos,
            objetivoMensal: totalObjetivo,
            desvioPercentualMes: desvioPercentual,
            taxaReparacao,
            totalReparacoes,
            gapReparacoes22: gapReparacoes,
          },
          complementares: {
            escovasQtd: totalEscovas,
            escovasPercent,
            polimentoQtd: totalPolimento,
            tratamentoQtd: totalTratamento,
            lavagensTotal: totalLavagens,
            outrosQtd: totalOutros,
          },
          alertas,
          periodoLabel,
          comparativoMesAnterior: {
            servicosAnterior: Number(resultadosMesAnterior?.totalServicos) || 0,
            variacaoServicos,
            reparacoesAnterior: Number(resultadosMesAnterior?.qtdReparacoes) || 0,
            variacaoReparacoes,
            escovasAnterior,
            variacaoEscovas,
          },
          ritmo: {
            servicosFaltam,
            diasUteisRestantes,
            servicosPorDia,
            gapReparacoes,
          },
          evolucao: evolucao || [],
        };
        
        // Sempre gerar análise IA para o PDF
        let analiseIA = null;
        {
          try {
            const { invokeLLM } = await import('./_core/llm');
            const desvioPercentualCalc = totalObjetivo > 0 ? ((totalServicos - totalObjetivo) / totalObjetivo) * 100 : 0;
            const taxaReparacaoCalc = totalServicos > 0 ? (totalReparacoes / totalServicos) * 100 : 0;
            const escovasPercentCalc = totalServicos > 0 ? (totalEscovas / totalServicos) * 100 : 0;
            const servicosFaltam = Math.max(0, totalObjetivo - totalServicos);
            
            const prompt = `
Analisa os resultados da loja ${loja.nome} e gera uma análise simples e motivacional.

DADOS DO MÊS:
- Serviços realizados: ${totalServicos} / Objetivo: ${totalObjetivo} (Desvio: ${desvioPercentualCalc.toFixed(1)}%)
- Taxa de reparação: ${taxaReparacaoCalc.toFixed(1)}% (objetivo: 22%)
- Escovas: ${escovasPercentCalc.toFixed(1)}% (objetivo: 10%)

Gera uma resposta em JSON com esta estrutura exata:
{
  "focoUrgente": ["lista de 1-2 pontos de foco urgente, diretos e práticos"],
  "pontosPositivos": ["lista de 1-2 pontos positivos da loja"],
  "resumo": "mensagem de síntese e motivação (2-3 frases, tom positivo e encorajador)"
}

IMPORTANTE:
- Sê direto e prático no foco urgente
- O resumo deve ser genuino, positivo e dar força
- Usa linguagem portuguesa de Portugal (não brasileiro)
- Responde APENAS com o JSON, sem texto adicional`;
            
            const response = await invokeLLM({
              messages: [
                { role: 'system', content: 'És um analista de performance de lojas ExpressGlass. Geras análises estratégicas e motivacionais em português de Portugal. Respondes sempre em JSON válido.' },
                { role: 'user', content: prompt }
              ],
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'analise_loja',
                  strict: true,
                  schema: {
                    type: 'object',
                    properties: {
                      focoUrgente: { type: 'array', items: { type: 'string' } },
                      pontosPositivos: { type: 'array', items: { type: 'string' } },
                      resumo: { type: 'string' }
                    },
                    required: ['focoUrgente', 'pontosPositivos', 'resumo'],
                    additionalProperties: false
                  }
                }
              }
            });
            
            const messageContent = response.choices?.[0]?.message?.content;
            const content = typeof messageContent === 'string' ? messageContent : '{}';
            analiseIA = JSON.parse(content);
            console.log('[ExportPDF] Análise IA gerada:', JSON.stringify(analiseIA));
          } catch (error) {
            console.error('Erro ao gerar análise IA para PDF:', error);
          }
        }
        
        // Gerar PDF
        const pdfBuffer = await gerarPDFResultados(loja.nome, dashboardData, analiseIA);
        
        // Retornar como base64
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `resultados_${loja.nome.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
        };
      }),
  }),

  // ==================== COLABORADORES ====================
  colaboradores: router({
    // Listar todos os colaboradores (admin vê todos, gestor vê os seus)
    list: gestorProcedure
      .input(z.object({ apenasAtivos: z.boolean().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === 'admin') {
          return await db.getAllColaboradores(input?.apenasAtivos ?? true);
        }
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) return [];
        return await db.getAllColaboradoresByGestorId(gestor.id, input?.apenasAtivos ?? true);
      }),
    
    // Listar colaboradores de uma loja
    byLoja: gestorProcedure
      .input(z.object({ 
        lojaId: z.number(),
        apenasAtivos: z.boolean().optional()
      }))
      .query(async ({ input, ctx }) => {
        // Verificar se gestor tem acesso à loja
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          const lojasGestor = await db.getLojasByGestorId(gestor.id);
          if (!lojasGestor.some(l => l.id === input.lojaId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
          }
        }
        return await db.getColaboradoresByLojaId(input.lojaId, input.apenasAtivos ?? true);
      }),
    
    // Listar volantes de um gestor
    volantes: gestorProcedure
      .input(z.object({ apenasAtivos: z.boolean().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) return [];
        return await db.getColaboradoresVolantesByGestorId(gestor.id, input?.apenasAtivos ?? true);
      }),
    
    // Obter colaborador por ID
    byId: gestorProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getColaboradorById(input.id);
      }),
    
    // Criar colaborador (loja, volante ou recalbra)
    create: gestorProcedure
      .input(z.object({
        lojaId: z.number().optional().nullable(),
        gestorId: z.number().optional().nullable(),
        nome: z.string().min(1),
        codigoColaborador: z.string().optional().nullable(),
        cargo: z.enum(["responsavel_loja", "tecnico", "administrativo"]).optional(),
        tipo: z.enum(["loja", "volante", "recalbra"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const tipo = input.tipo || "loja";
        
        // Se é tipo loja, verificar acesso à loja
        if (tipo === "loja" && input.lojaId) {
          if (ctx.user.role !== 'admin') {
            const gestor = await db.getGestorByUserId(ctx.user.id);
            if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
            const lojasGestor = await db.getLojasByGestorId(gestor.id);
            if (!lojasGestor.some(l => l.id === input.lojaId)) {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
            }
          }
        }
        
        // Se é volante ou recalbra, associar ao gestor
        let gestorId = input.gestorId;
        if ((tipo === "volante" || tipo === "recalbra") && !gestorId) {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (gestor) gestorId = gestor.id;
        }
        
        return await db.createColaborador({
          ...input,
          gestorId: gestorId || undefined,
          lojaId: tipo === "loja" ? input.lojaId || undefined : undefined,
          tipo: tipo,
          cargo: input.cargo || "tecnico",
        });
      }),
    
    // Atualizar colaborador
    update: gestorProcedure
      .input(z.object({
        id: z.number(),
        lojaId: z.number().optional().nullable(),
        gestorId: z.number().optional().nullable(),
        nome: z.string().min(1).optional(),
        codigoColaborador: z.string().optional().nullable(),
        cargo: z.enum(["responsavel_loja", "tecnico", "administrativo"]).optional(),
        tipo: z.enum(["loja", "volante", "recalbra"]).optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateColaborador(id, data);
        return { success: true };
      }),
    
    // Eliminar colaborador (soft delete)
    delete: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteColaborador(input.id);
        return { success: true };
      }),
    
    // Contar colaboradores ativos de uma loja
    count: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        return await db.countColaboradoresAtivos(input.lojaId);
      }),
    
    // Contar volantes ativos do gestor
    countVolantes: gestorProcedure.query(async ({ ctx }) => {
      const gestor = await db.getGestorByUserId(ctx.user.id);
      if (!gestor) return 0;
      return await db.countVolantesAtivosByGestor(gestor.id);
    }),
    
    // Obter lojas com contagem de colaboradores
    lojasComColaboradores: gestorProcedure.query(async () => {
      return await db.getLojasComColaboradores();
    }),
    
    // Gerar pré-visualização da relação de colaboradores para RH
    previewRelacaoRH: gestorProcedure.query(async ({ ctx }) => {
      let lojasGestor: Awaited<ReturnType<typeof db.getLojasByGestorId>>;
      let volantes: Awaited<ReturnType<typeof db.getColaboradoresVolantesByGestorId>>;
      let recalbras: Awaited<ReturnType<typeof db.getAllColaboradoresByGestorId>>;
      
      // Se for admin, obter todas as lojas; se for gestor, obter apenas as suas lojas
      if (ctx.user.role === 'admin') {
        lojasGestor = await db.getAllLojas();
        // Admin não tem volantes/recalbras associados diretamente
        volantes = [];
        recalbras = [];
      } else {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        
        lojasGestor = await db.getLojasByGestorId(gestor.id);
        volantes = await db.getColaboradoresVolantesByGestorId(gestor.id, true);
        recalbras = await db.getAllColaboradoresByGestorId(gestor.id, true);
      }
      
      // Obter colaboradores de cada loja
      const colaboradoresPorLoja: Array<{
        loja: { id: number; nome: string; numeroLoja?: number | null };
        colaboradores: Array<{ nome: string; codigoColaborador?: string | null; cargo: string; tipo: string }>;
      }> = [];
      
      for (const loja of lojasGestor) {
        const colabs = await db.getColaboradoresByLojaId(loja.id, true);
        colaboradoresPorLoja.push({
          loja: { id: loja.id, nome: loja.nome, numeroLoja: loja.numeroLoja },
          colaboradores: colabs.map(c => ({
            nome: c.nome,
            codigoColaborador: c.codigoColaborador,
            cargo: c.cargo,
            tipo: c.tipo
          }))
        });
      }
      
      const recalbrasList = recalbras.filter(c => c.tipo === 'recalbra');
      
      return {
        gestorNome: ctx.user.name || 'Gestor',
        gestorEmail: ctx.user.email || '',
        mes: new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
        colaboradoresPorLoja,
        volantes: volantes.map(v => ({
          nome: v.nome,
          codigoColaborador: v.codigoColaborador,
          cargo: v.cargo
        })),
        recalbras: recalbrasList.map(r => ({
          nome: r.nome,
          codigoColaborador: r.codigoColaborador,
          cargo: r.cargo
        })),
        totalColaboradores: colaboradoresPorLoja.reduce((acc, l) => acc + l.colaboradores.length, 0) + volantes.length + recalbrasList.length
      };
    }),
    
    // Enviar relação de colaboradores para RH
    enviarRelacaoRH: gestorProcedure
      .input(z.object({
        observacoes: z.string().optional()
      }).optional())
      .mutation(async ({ input, ctx }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        
        // Obter lojas do gestor
        const lojasGestor = await db.getLojasByGestorId(gestor.id);
        
        // Obter colaboradores de cada loja
        const colaboradoresPorLoja: Array<{
          loja: { id: number; nome: string; numeroLoja?: number | null };
          colaboradores: Array<{ nome: string; codigoColaborador?: string | null; cargo: string; tipo: string }>;
        }> = [];
        
        for (const loja of lojasGestor) {
          const colabs = await db.getColaboradoresByLojaId(loja.id, true);
          colaboradoresPorLoja.push({
            loja: { id: loja.id, nome: loja.nome, numeroLoja: loja.numeroLoja },
            colaboradores: colabs.map(c => ({
              nome: c.nome,
              codigoColaborador: c.codigoColaborador,
              cargo: c.cargo,
              tipo: c.tipo
            }))
          });
        }
        
        // Obter volantes e recalbra do gestor
        const volantes = await db.getColaboradoresVolantesByGestorId(gestor.id, true);
        const recalbras = await db.getAllColaboradoresByGestorId(gestor.id, true);
        const recalbrasList = recalbras.filter(c => c.tipo === 'recalbra');
        
        const gestorNome = ctx.user.name || 'Gestor';
        const mes = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
        const totalColaboradores = colaboradoresPorLoja.reduce((acc, l) => acc + l.colaboradores.length, 0) + volantes.length + recalbrasList.length;
        
        // Gerar PDF da relação de colaboradores
        const pdfBuffer = await gerarPDFRelacaoRH({
          gestorNome,
          mes,
          totalColaboradores,
          colaboradoresPorLoja,
          volantes: volantes.map(v => ({
            nome: v.nome,
            codigoColaborador: v.codigoColaborador,
            cargo: v.cargo,
            tipo: v.tipo
          })),
          recalbras: recalbrasList.map(r => ({
            nome: r.nome,
            codigoColaborador: r.codigoColaborador,
            cargo: r.cargo,
            tipo: r.tipo
          })),
          observacoes: input?.observacoes
        });
        
        // Gerar HTML do email (texto de introdução simples)
        const dataEnvio = new Date().toLocaleDateString('pt-PT', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric'
        });
        
        const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #059669; }
    .logo { font-size: 24px; font-weight: bold; color: #059669; }
    .content { padding: 20px 0; }
    .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { margin-bottom: 10px; }
    .info-label { font-weight: bold; color: #166534; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
    .attachment-note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
      <h2 style="margin: 15px 0 5px 0; color: #059669; font-size: 18px;">Relacao de Colaboradores</h2>
      <p style="margin: 5px 0 0 0; color: #6b7280;">${mesCapitalizado}</p>
    </div>
    
    <div class="content">
      <p>Exmos(as). Senhores(as),</p>
      
      <p>Serve o presente email para enviar a <strong>Relação de Colaboradores</strong> referente ao mês de <strong>${mesCapitalizado}</strong>.</p>
      
      <div class="info-box">
        <div class="info-row"><span class="info-label">Gestor:</span> ${gestorNome}</div>
        <div class="info-row"><span class="info-label">Total de Colaboradores:</span> ${totalColaboradores}</div>
        <div class="info-row"><span class="info-label">Data de Envio:</span> ${dataEnvio}</div>
      </div>
      
      <div class="attachment-note">
        <strong>📎 Anexo:</strong> Em anexo segue o ficheiro PDF com a relação completa de colaboradores.
      </div>
      
      ${input?.observacoes ? `
      <p><strong>Observações:</strong></p>
      <p style="background: #f9fafb; padding: 15px; border-radius: 8px;">${input.observacoes}</p>
      ` : ''}
      
      <p>Com os melhores cumprimentos,</p>
      <p><strong>${gestorNome}</strong><br>
      Gestor de Zona</p>
    </div>
    
    <div class="footer">
      Este email foi enviado automaticamente através da plataforma PoweringEG.<br>
      ExpressGlass - Especialistas em Vidro Automóvel
    </div>
  </div>
</body>
</html>
        `;
        
        // Nome do ficheiro PDF
        const nomeArquivo = `Relacao_Colaboradores_${gestorNome.replace(/\s+/g, '_')}_${mesCapitalizado.replace(/\s+/g, '_')}.pdf`;
        
        // Enviar email para RH com PDF em anexo
        const emailDestino = 'recursoshumanos@expressglass.pt';
        const enviado = await sendEmail({
          to: emailDestino,
          subject: `Relação de Colaboradores - ${gestorNome} - ${mesCapitalizado}`,
          html,
          attachments: [{
            filename: nomeArquivo,
            content: pdfBuffer.toString('base64'),
            contentType: 'application/pdf'
          }]
        });
        
        if (!enviado) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao enviar email para RH' });
        }
        
        // Calcular totais por tipo
        const totalEmLojas = colaboradoresPorLoja.reduce((acc, l) => acc + l.colaboradores.length, 0);
        const totalVolantes = volantes.length;
        const totalRecalbra = recalbrasList.length;
        
        // Registar envio no histórico
        await db.registarEnvioRH({
          gestorId: gestor.id,
          mesReferencia: mesCapitalizado,
          totalColaboradores,
          totalEmLojas,
          totalVolantes,
          totalRecalbra,
          emailDestino,
          emailEnviado: true
        });
        
        // Registar data de envio no gestor
        await db.updateGestorEnvioRH(gestor.id);
        
        return { 
          success: true, 
          message: `Relação de ${totalColaboradores} colaboradores enviada com sucesso para ${emailDestino} (PDF em anexo)` 
        };
      }),
    
    // Executar envio de lembretes RH (para cron job ou execução manual)
    executarLembretesRH: adminProcedure.mutation(async () => {
      const resultado = await enviarLembretesRH();
      return resultado;
    }),
    
    // Verificar se deve mostrar lembrete de envio para RH (dia 20 ou posterior)
    verificarLembreteRH: gestorProcedure.query(async ({ ctx }) => {
      const gestor = await db.getGestorByUserId(ctx.user.id);
      if (!gestor) return { mostrarLembrete: false };
      
      const hoje = new Date();
      const diaAtual = hoje.getDate();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      
      // Só mostrar lembrete a partir do dia 20
      if (diaAtual < 20) {
        return { mostrarLembrete: false, diaAtual };
      }
      
      // Verificar se já enviou este mês
      const lastEnvio = gestor.lastEnvioRH;
      if (lastEnvio) {
        const envioDate = new Date(lastEnvio);
        const mesEnvio = envioDate.getMonth();
        const anoEnvio = envioDate.getFullYear();
        
        // Se já enviou este mês, não mostrar lembrete
        if (mesEnvio === mesAtual && anoEnvio === anoAtual) {
          return { 
            mostrarLembrete: false, 
            diaAtual,
            jaEnviouEsteMes: true,
            dataUltimoEnvio: lastEnvio
          };
        }
      }
      
      // Mostrar lembrete - dia 20 ou posterior e ainda não enviou este mês
      return { 
        mostrarLembrete: true, 
        diaAtual,
        diasRestantes: new Date(anoAtual, mesAtual + 1, 0).getDate() - diaAtual,
        mesReferencia: hoje.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
      };
    }),
    
    // Obter histórico de envios RH do gestor atual
    historicoEnviosRH: gestorProcedure.query(async ({ ctx }) => {
      const gestor = await db.getGestorByUserId(ctx.user.id);
      if (!gestor) return [];
      
      return await db.getEnviosRHByGestorId(gestor.id);
    }),
    
    // Obter todos os envios RH (para admin)
    todosEnviosRH: adminProcedure.query(async () => {
      return await db.getAllEnviosRH();
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
    
    // Alias para listar (acessível por todos os users autenticados)
    listar: protectedProcedure.query(async () => {
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
        const htmlComAnexos = html + (validAttachments.length > 0 ? `<p style="margin-top: 20px; color: #10b981;"><strong>📷 ${validAttachments.length} foto(s) anexada(s) a este email</strong></p>` : '');
        
        const enviado = await sendEmail({
          to: loja.email,
          subject: `Relatório de Visita - ${loja.nome} - ${new Date(relatorio.dataVisita).toLocaleDateString('pt-PT')}`,
          html: htmlComAnexos,
          attachments: validAttachments,
        });
        
        if (!enviado) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao enviar email' });
        }
        
        // Enviar cópia para o gestor
        if (gestor?.email && gestor.email !== loja.email) {
          try {
            const htmlCopia = htmlComAnexos.replace(
              '</body>',
              `<div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                <p style="margin: 0; color: #0369a1; font-size: 13px;">📋 Esta é uma cópia do relatório enviado para <strong>${loja.email}</strong>.</p>
              </div>
              </body>`
            );
            
            await sendEmail({
              to: gestor.email,
              subject: `[Cópia] Relatório de Visita - ${loja.nome} - ${new Date(relatorio.dataVisita).toLocaleDateString('pt-PT')}`,
              html: htmlCopia,
              attachments: validAttachments,
            });
            console.log(`[Email] Cópia do relatório livre enviada para gestor: ${gestor.email}`);
          } catch (e) {
            console.error(`[Email] Erro ao enviar cópia do relatório livre para gestor:`, e);
          }
        }
        
        return { success: true, email: loja.email, copiaEnviada: gestor?.email };
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
        
        // Gerar HTML do relatório completo com todos os campos
        const html = gerarHTMLRelatorioCompleto({
          lojaNome: loja.nome,
          gestorNome: gestor?.nome || 'Desconhecido',
          dataVisita: relatorio.dataVisita,
          // Campos do formulário Zoho
          episFardamento: relatorio.episFardamento || undefined,
          kitPrimeirosSocorros: relatorio.kitPrimeirosSocorros || undefined,
          consumiveis: relatorio.consumiveis || undefined,
          espacoFisico: relatorio.espacoFisico || undefined,
          reclamacoes: relatorio.reclamacoes || undefined,
          vendasComplementares: relatorio.vendasComplementares || undefined,
          fichasServico: relatorio.fichasServico || undefined,
          documentacaoObrigatoria: relatorio.documentacaoObrigatoria || undefined,
          reuniaoQuinzenal: relatorio.reuniaoQuinzenal ?? undefined,
          resumoSupervisao: relatorio.resumoSupervisao || undefined,
          colaboradoresPresentes: relatorio.colaboradoresPresentes || undefined,
          pontosPositivos: relatorio.pontosPositivos || undefined,
          pontosNegativos: relatorio.pontosNegativos || undefined,
          pendentes: pendentes.map(p => ({ descricao: p.descricao, resolvido: p.resolvido })),
          fotos: undefined, // Não incluir fotos inline, serão anexos
        });
        
        // Enviar email
        if (!loja.email) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Loja não tem email configurado' });
        }
        
        const htmlComAnexos = html + (validAttachments.length > 0 ? `<p style="margin-top: 20px; color: #10b981;"><strong>📷 ${validAttachments.length} foto(s) anexada(s) a este email</strong></p>` : '');
        
        const enviado = await sendEmail({
          to: loja.email,
          subject: `Relatório Completo de Visita - ${loja.nome} - ${new Date(relatorio.dataVisita).toLocaleDateString('pt-PT')}`,
          html: htmlComAnexos,
          attachments: validAttachments,
        });
        
        if (!enviado) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao enviar email' });
        }
        
        // Enviar cópia para o gestor
        if (gestor?.email && gestor.email !== loja.email) {
          try {
            const htmlCopia = htmlComAnexos.replace(
              '</body>',
              `<div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                <p style="margin: 0; color: #0369a1; font-size: 13px;">📋 Esta é uma cópia do relatório enviado para <strong>${loja.email}</strong>.</p>
              </div>
              </body>`
            );
            
            await sendEmail({
              to: gestor.email,
              subject: `[Cópia] Relatório Completo de Visita - ${loja.nome} - ${new Date(relatorio.dataVisita).toLocaleDateString('pt-PT')}`,
              html: htmlCopia,
              attachments: validAttachments,
            });
            console.log(`[Email] Cópia do relatório completo enviada para gestor: ${gestor.email}`);
          } catch (e) {
            console.error(`[Email] Erro ao enviar cópia do relatório completo para gestor:`, e);
          }
        }
        
        return { success: true, email: loja.email, copiaEnviada: gestor?.email };
      }),
  }),

  // ==================== RELATÓRIOS COM IA ====================
  relatoriosIA: router({    
    gerar: gestorProcedure
      .input(z.object({
        periodo: z.string(), // Agora aceita períodos personalizados como "meses_10/2025, 11/2025"
        filtro: z.enum(["pais", "zona", "gestor"]).optional().default("pais"),
        zonaId: z.string().optional(),
        zonasIds: z.array(z.string()).optional(), // Novo: múltiplas zonas
        gestorIdFiltro: z.number().optional(),
        lojaIdFiltro: z.number().optional(), // Novo: filtrar por loja específica
        ambitoRelatorio: z.enum(["nacional", "minhas", "loja"]).optional().default("minhas"), // Novo: âmbito do relatório
        dataInicio: z.date().optional(), // Novo: data de início do período
        dataFim: z.date().optional(), // Novo: data de fim do período
      }))
      .query(async ({ input, ctx }) => {
        // Determinar gestorId baseado no filtro
        let gestorId: number | undefined;
        let lojasIds: number[] | undefined;
        let filtroDescricao = "Todo o País";
        
        // Primeiro, verificar o âmbito do relatório
        if (input.ambitoRelatorio === 'loja' && input.lojaIdFiltro) {
          // Filtrar por loja específica
          lojasIds = [input.lojaIdFiltro];
          const lojaInfo = await db.getLojaById(input.lojaIdFiltro);
          filtroDescricao = `Loja: ${lojaInfo?.nome || 'N/A'}`;
        } else if (input.ambitoRelatorio === 'nacional') {
          // Nacional - mostrar todas as lojas (sem filtro de gestor)
          // Gestores também podem ver dados nacionais para comparação
          lojasIds = undefined;
          filtroDescricao = "Nacional";
        } else if (input.ambitoRelatorio === 'minhas') {
          // Filtrar pelas lojas do gestor
          gestorId = ctx.gestor?.id;
          if (gestorId) {
            const lojasDoGestor = await db.getLojasByGestorId(gestorId);
            lojasIds = lojasDoGestor.map(l => l.id);
            filtroDescricao = "Minhas Lojas";
          }
        } else {
          // Default: se não especificado, gestores veem suas lojas, admins veem tudo
          if (ctx.user.role !== "admin" && ctx.gestor?.id) {
            const lojasDoGestor = await db.getLojasByGestorId(ctx.gestor.id);
            lojasIds = lojasDoGestor.map(l => l.id);
            filtroDescricao = "Minhas Lojas";
          } else {
            lojasIds = undefined;
            filtroDescricao = "Nacional";
          }
        }
        
        // Se admin e âmbito nacional, aplicar filtros adicionais de admin
        if (ctx.user.role === "admin" && input.ambitoRelatorio === 'nacional') {
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
        
        // CORREÇÃO: Gestores com "Minhas Lojas" devem usar gerarRelatorioIAGestor
        // que retorna a estrutura correcta (relatorios.totalLivres, pontosDestacados, pendentes, etc.)
        const isGestor = ctx.user.role !== 'admin';
        const usarRelatorioGestor = isGestor && (input.ambitoRelatorio === 'minhas' || (!input.ambitoRelatorio));
        
        let analiseComFiltro: any;
        
        if (usarRelatorioGestor && gestorId) {
          // Usar função específica para gestores que retorna estrutura com relatorios, pendentes, etc.
          console.log('[RelatoriosIA] Usando gerarRelatorioIAGestor para gestorId:', gestorId);
          const analiseGestor = await gerarRelatorioIAGestor(input.periodo, gestorId, input.dataInicio, input.dataFim);
          analiseComFiltro = {
            ...analiseGestor,
            filtroAplicado: filtroDescricao,
            tipoRelatorio: 'gestor' as const,
          };
        } else {
          // Usar função genérica para admin/nacional
          console.log('[RelatoriosIA] Usando gerarRelatorioComIA, gestorId:', gestorId, 'lojasIds:', lojasIds?.length);
          const analise = await gerarRelatorioComIA(input.periodo, gestorId, lojasIds, input.dataInicio, input.dataFim);
          analiseComFiltro = {
            ...analise,
            filtroAplicado: filtroDescricao,
            tipoRelatorio: isGestor ? 'gestor' as const : 'admin' as const,
          };
        }
        
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
    
    // Gerar relatório IA com múltiplos meses selecionados
    gerarMultiplosMeses: gestorProcedure
      .input(z.object({
        mesesSelecionados: z.array(z.object({
          mes: z.number().min(1).max(12),
          ano: z.number().min(2020).max(2030),
        })).min(1),
        filtro: z.enum(["pais", "zona", "gestor"]).optional().default("pais"),
        zonaId: z.string().optional(),
        zonasIds: z.array(z.string()).optional(),
        gestorIdFiltro: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        let gestorId: number | undefined;
        let lojasIds: number[] | undefined;
        let filtroDescricao = "Todo o País";
        
        // DEBUG: Log para identificar problema com gestores
        console.log('[RelatoriosIA DEBUG] User:', ctx.user.id, ctx.user.email, 'Role:', ctx.user.role);
        console.log('[RelatoriosIA DEBUG] Gestor context:', ctx.gestor?.id);
        
        if (ctx.user.role !== "admin") {
          // Gestores usam análise de RESULTADOS das suas lojas (não relatórios/pendentes)
          gestorId = ctx.gestor?.id;
          
          // Fallback: buscar gestor diretamente se não estiver no contexto
          if (!gestorId) {
            const gestorDireto = await db.getGestorByUserId(ctx.user.id);
            gestorId = gestorDireto?.id;
          }
          
          if (gestorId) {
            // Buscar lojas do gestor para filtrar resultados
            const lojasDoGestor = await db.getLojasByGestorId(gestorId);
            lojasIds = lojasDoGestor.map(l => l.id);
            filtroDescricao = "Minhas Lojas";
            // Continua para usar gerarRelatorioComIAMultiplosMeses com filtro de lojas
          }
        } else {
          if (input.filtro === "gestor" && input.gestorIdFiltro) {
            const lojasDoGestor = await db.getLojasByGestorId(input.gestorIdFiltro);
            lojasIds = lojasDoGestor.map(l => l.id);
            const gestorInfo = await db.getGestorById(input.gestorIdFiltro);
            filtroDescricao = `Gestor: ${gestorInfo?.nome || 'N/A'}`;
          } else if (input.filtro === "zona" && input.zonasIds && input.zonasIds.length > 0) {
            const primeiroMes = input.mesesSelecionados[0];
            lojasIds = await db.getLojaIdsPorZonas(input.zonasIds, primeiroMes.mes, primeiroMes.ano);
            filtroDescricao = input.zonasIds.length === 1 ? `Zona: ${input.zonasIds[0]}` : `Zonas: ${input.zonasIds.join(', ')}`;
          }
        }
        
        // CORREÇÃO: Gestores devem usar gerarRelatorioIAGestorMultiplosMeses
        const isGestor = ctx.user.role !== 'admin';
        
        let analiseComFiltro: any;
        
        if (isGestor && gestorId) {
          // Usar função específica para gestores
          console.log('[RelatoriosIA] Usando gerarRelatorioIAGestorMultiplosMeses para gestorId:', gestorId);
          const analiseGestor = await gerarRelatorioIAGestorMultiplosMeses(input.mesesSelecionados, gestorId);
          analiseComFiltro = {
            ...analiseGestor,
            filtroAplicado: filtroDescricao,
            tipoRelatorio: 'gestor' as const,
          };
        } else {
          // Usar função genérica para admin/nacional
          const { gerarRelatorioComIAMultiplosMeses } = await import('./aiService');
          const analise = await gerarRelatorioComIAMultiplosMeses(input.mesesSelecionados, gestorId, lojasIds);
          analiseComFiltro = {
            ...analise,
            filtroAplicado: filtroDescricao,
            tipoRelatorio: isGestor ? 'gestor' as const : 'admin' as const,
          };
        }
        
        // Salvar relatório IA na base de dados
        try {
          const labelMeses = input.mesesSelecionados.map(m => `${m.mes}/${m.ano}`).join(', ');
          await db.createRelatorioIA({
            periodo: `meses_${labelMeses}`,
            conteudo: JSON.stringify(analiseComFiltro),
            geradoPor: ctx.user.id,
          });
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
    
    // Obter meses que têm dados de resultados disponíveis
    getMesesDisponiveis: protectedProcedure
      .query(async () => {
        return await db.getMesesComDadosDisponiveis();
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
        language: z.enum(['pt', 'en']).optional().default('pt'),
      }))
      .query(async ({ input, ctx }) => {
        const dica = await gerarDicaDashboard({
          ...input,
          userName: ctx.user.name || 'Utilizador',
          userRole: ctx.user.role || 'user',
          language: input.language,
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

  // ==================== PROJEÇÃO DE VISITAS ====================
  projecaoVisitas: router({
    // Obter dados de priorização das lojas do gestor
    getDadosPriorizacao: gestorProcedure.query(async ({ ctx }) => {
      if (!ctx.gestor) return [];
      return await db.getDadosPriorizacaoLojas(ctx.gestor.id);
    }),
    
    // Gerar projeção de visitas para uma semana
    gerar: gestorProcedure
      .input(z.object({
        tipoPeriodo: z.enum(['esta_semana', 'proxima_semana']),
      }))
      .mutation(async ({ ctx, input }) => {
        // Para admins sem gestor associado, usar um gestor padrão ou mostrar todas as lojas
        const gestorId = ctx.gestor?.id;
        if (!gestorId && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
        }
        
        // Calcular datas da semana
        const hoje = new Date();
        const diaSemana = hoje.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
        
        let semanaInicio: Date;
        let semanaFim: Date;
        
        if (input.tipoPeriodo === 'esta_semana') {
          // Encontrar a segunda-feira desta semana
          const diasParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
          semanaInicio = new Date(hoje);
          semanaInicio.setDate(hoje.getDate() + diasParaSegunda);
          semanaInicio.setHours(0, 0, 0, 0);
          
          // Sexta-feira desta semana
          semanaFim = new Date(semanaInicio);
          semanaFim.setDate(semanaInicio.getDate() + 4);
          semanaFim.setHours(23, 59, 59, 999);
        } else {
          // Próxima semana
          const diasParaProximaSegunda = diaSemana === 0 ? 1 : 8 - diaSemana;
          semanaInicio = new Date(hoje);
          semanaInicio.setDate(hoje.getDate() + diasParaProximaSegunda);
          semanaInicio.setHours(0, 0, 0, 0);
          
          // Sexta-feira da próxima semana
          semanaFim = new Date(semanaInicio);
          semanaFim.setDate(semanaInicio.getDate() + 4);
          semanaFim.setHours(23, 59, 59, 999);
        }
        
        // Obter dados de priorização
        // Para admins sem gestor, obter todas as lojas; para gestores, apenas as suas lojas
        const dadosPriorizacao = gestorId 
          ? await db.getDadosPriorizacaoLojas(gestorId)
          : await db.getDadosPriorizacaoTodasLojas();
        
        // Calcular dias úteis disponíveis
        const diasUteis: Date[] = [];
        const feriadosPortugueses = obterFeriadosPortugueses(semanaInicio.getFullYear());
        
        for (let i = 0; i <= 4; i++) {
          const dia = new Date(semanaInicio);
          dia.setDate(semanaInicio.getDate() + i);
          
          // Verificar se é dia útil (não é fim de semana e não é feriado)
          const diaSem = dia.getDay();
          if (diaSem !== 0 && diaSem !== 6) {
            const dataStr = dia.toISOString().split('T')[0];
            if (!feriadosPortugueses.includes(dataStr)) {
              // Para "esta semana", só incluir dias a partir de hoje
              if (input.tipoPeriodo === 'esta_semana') {
                if (dia >= hoje || dia.toDateString() === hoje.toDateString()) {
                  diasUteis.push(new Date(dia));
                }
              } else {
                diasUteis.push(new Date(dia));
              }
            }
          }
        }
        
        // Criar projeção
        const visitasPlaneadasJson = diasUteis.slice(0, dadosPriorizacao.length).map((dia, index) => {
          const loja = dadosPriorizacao[index];
          return {
            data: dia.toISOString(),
            lojaId: loja.lojaId,
            lojaNome: loja.lojaNome,
            motivo: loja.motivo,
            prioridade: index + 1,
            detalheMotivo: loja.detalheMotivo,
          };
        });
        
        const projecaoId = await db.criarProjecaoVisitas({
          gestorId: gestorId || 0, // 0 para admin sem gestor associado
          semanaInicio,
          semanaFim,
          tipoPeriodo: input.tipoPeriodo,
          visitasPlaneadas: JSON.stringify(visitasPlaneadasJson),
          estado: 'gerada',
        });
        
        // Criar visitas individuais
        const visitasParaCriar = diasUteis.slice(0, dadosPriorizacao.length).map((dia, index) => {
          const loja = dadosPriorizacao[index];
          return {
            projecaoId,
            lojaId: loja.lojaId,
            dataVisita: dia,
            horaInicio: '09:00',
            horaFim: '12:00',
            motivo: loja.motivo,
            prioridade: index + 1,
            detalheMotivo: loja.detalheMotivo,
            estado: 'planeada' as const,
          };
        });
        
        await db.criarVisitasPlaneadas(visitasParaCriar);
        
        return { projecaoId, visitasCount: visitasParaCriar.length };
      }),
    
    // Obter projeção atual do gestor
    atual: gestorProcedure.query(async ({ ctx }) => {
      const gestorId = ctx.gestor?.id || 0;
      return await db.getProjecaoVisitasAtual(gestorId);
    }),
    
    // Obter visitas de uma projeção
    getVisitas: gestorProcedure
      .input(z.object({ projecaoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getVisitasPlaneadasPorProjecao(input.projecaoId);
      }),
    
    // Atualizar estado de uma visita
    atualizarEstadoVisita: gestorProcedure
      .input(z.object({
        visitaId: z.number(),
        estado: z.enum(['planeada', 'confirmada', 'realizada', 'cancelada']),
      }))
      .mutation(async ({ input }) => {
        await db.atualizarEstadoVisita(input.visitaId, input.estado);
        return { success: true };
      }),
    
    // Gerar links de calendário para uma visita
    gerarLinksCalendario: gestorProcedure
      .input(z.object({
        visitaId: z.number(),
        lojaId: z.number(),
        lojaNome: z.string(),
        lojaEndereco: z.string().optional(),
        dataVisita: z.string(),
        horaInicio: z.string(),
        horaFim: z.string(),
        motivo: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Buscar pendentes da loja
        const pendentesLoja = await db.listarPendentesLoja(input.lojaId, true);
        const pendentesAtivos = pendentesLoja;
        
        // Construir lista de pendentes para a descrição
        let listaPendentes = '';
        if (pendentesAtivos.length > 0) {
          listaPendentes = '\n\n📋 PENDENTES A RESOLVER:\n';
          pendentesAtivos.slice(0, 10).forEach((p, i) => {
            const prioridade = p.prioridade || 'normal';
            const descPendente = p.descricao?.substring(0, 80) || 'Sem descrição';
            listaPendentes += `${i + 1}. [${prioridade.toUpperCase()}] ${descPendente}${p.descricao && p.descricao.length > 80 ? '...' : ''}\n`;
          });
          if (pendentesAtivos.length > 10) {
            listaPendentes += `... e mais ${pendentesAtivos.length - 10} pendente(s)\n`;
          }
        }
        
        const titulo = `Visita ExpressGlass - ${input.lojaNome}`;
        const descricao = `Visita de supervisão à loja ${input.lojaNome}\n\nMotivo: ${input.motivo}${listaPendentes}`;
        const local = input.lojaEndereco || input.lojaNome;
        
        // Formatar datas para calendário
        const dataBase = input.dataVisita.split('T')[0];
        const inicio = `${dataBase}T${input.horaInicio}:00`;
        const fim = `${dataBase}T${input.horaFim}:00`;
        
        // Formato para Google Calendar
        const inicioGoogle = inicio.replace(/[-:]/g, '').replace('T', 'T');
        const fimGoogle = fim.replace(/[-:]/g, '').replace('T', 'T');
        const linkGoogle = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${inicioGoogle}/${fimGoogle}&details=${encodeURIComponent(descricao)}&location=${encodeURIComponent(local)}`;
        
        // Formato para Outlook Web
        const linkOutlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(titulo)}&startdt=${encodeURIComponent(inicio)}&enddt=${encodeURIComponent(fim)}&body=${encodeURIComponent(descricao)}&location=${encodeURIComponent(local)}`;
        
        // Formato ICS para Apple Calendar
        const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//PoweringEG//Visitas//PT',
          'BEGIN:VEVENT',
          `DTSTART:${inicioGoogle}`,
          `DTEND:${fimGoogle}`,
          `SUMMARY:${titulo}`,
          `DESCRIPTION:${descricao.replace(/\n/g, '\\n')}`,
          `LOCATION:${local}`,
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\n');
        const linkICS = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
        
        // Guardar links na base de dados
        await db.atualizarLinksCalendario(input.visitaId, {
          linkGoogleCalendar: linkGoogle,
          linkOutlook: linkOutlook,
          linkICS: linkICS,
        });
        
        return {
          linkGoogleCalendar: linkGoogle,
          linkOutlook: linkOutlook,
          linkICS: linkICS,
        };
      }),
    
    // Função auxiliar para escapar texto ICS (RFC 5545)
    // Escapa caracteres especiais e formata corretamente para ICS
    
    // Exportar toda a semana num único ficheiro ICS
    exportarSemanaICS: gestorProcedure
      .input(z.object({ projecaoId: z.number() }))
      .mutation(async ({ input }) => {
        // Função para escapar texto ICS conforme RFC 5545
        const escapeICS = (text: string): string => {
          return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
        };
        
        // Função para formatar data/hora no formato ICS com timezone
        const formatICSDateTime = (dateStr: string, time: string): string => {
          const cleanDate = dateStr.replace(/-/g, '');
          const cleanTime = time.replace(/:/g, '') + '00';
          return `${cleanDate}T${cleanTime}`;
        };
        
        // Buscar todas as visitas da projeção
        const visitas = await db.getVisitasPlaneadasPorProjecao(input.projecaoId);
        
        if (visitas.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Nenhuma visita encontrada' });
        }
        
        // Construir eventos ICS para cada visita
        const eventos: string[] = [];
        const now = new Date();
        const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        for (let i = 0; i < visitas.length; i++) {
          const visita = visitas[i];
          // Buscar pendentes da loja
          const pendentesLoja = await db.listarPendentesLoja(visita.lojaId, true);
          
          // Construir lista de pendentes (simplificada para ICS)
          let listaPendentes = '';
          if (pendentesLoja.length > 0) {
            listaPendentes = '\n\nPENDENTES A RESOLVER:';
            pendentesLoja.slice(0, 5).forEach((p, idx) => {
              const prioridade = p.prioridade || 'normal';
              const descPendente = (p.descricao?.substring(0, 60) || 'Sem descricao').replace(/[\n\r]/g, ' ');
              listaPendentes += `\n${idx + 1}. [${prioridade.toUpperCase()}] ${descPendente}`;
            });
            if (pendentesLoja.length > 5) {
              listaPendentes += `\n... e mais ${pendentesLoja.length - 5} pendente(s)`;
            }
          }
          
          // Remover acentos para maior compatibilidade
          const removeAcentos = (str: string): string => {
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          };
          
          const titulo = removeAcentos(`Visita ExpressGlass - ${visita.lojaNome}`);
          const descricao = removeAcentos(`Visita de supervisao a loja ${visita.lojaNome}\n\nMotivo: ${visita.detalheMotivo || 'Visita planeada'}${listaPendentes}`);
          const local = removeAcentos(visita.lojaNome);
          
          // Formatar datas
          const dataBase = visita.dataVisita instanceof Date 
            ? visita.dataVisita.toISOString().split('T')[0] 
            : new Date(visita.dataVisita).toISOString().split('T')[0];
          const horaInicio = visita.horaInicio || '09:00';
          const horaFim = visita.horaFim || '12:00';
          
          const inicio = formatICSDateTime(dataBase, horaInicio);
          const fim = formatICSDateTime(dataBase, horaFim);
          
          // Gerar UID único para cada evento (com índice para garantir unicidade)
          const uid = `visita-${visita.id}-${i}-${Date.now()}@poweringeg.com`;
          
          eventos.push([
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${inicio}`,
            `DTEND:${fim}`,
            `SUMMARY:${escapeICS(titulo)}`,
            `DESCRIPTION:${escapeICS(descricao)}`,
            `LOCATION:${escapeICS(local)}`,
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            'END:VEVENT'
          ].join('\r\n'));
        }
        
        // Construir ficheiro ICS completo (usar CRLF conforme RFC 5545)
        const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//PoweringEG//Visitas//PT',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'X-WR-CALNAME:Projecao Visitas ExpressGlass',
          ...eventos,
          'END:VCALENDAR'
        ].join('\r\n');
        
        return {
          icsContent,
          filename: `projecao-visitas-${new Date().toISOString().split('T')[0]}.ics`,
          totalVisitas: visitas.length
        };
      }),
    
    // Obter histórico de projeções
    historico: gestorProcedure
      .input(z.object({ limite: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.gestor) return [];
        return await db.getHistoricoProjecoes(ctx.gestor.id, input.limite || 10);
      }),
    
    // Eliminar projeção
    eliminar: gestorProcedure
      .input(z.object({ projecaoId: z.number() }))
      .mutation(async ({ input }) => {
        await db.eliminarProjecaoVisitas(input.projecaoId);
        return { success: true };
      }),
    
    // Apagar uma visita individual
    apagarVisita: gestorProcedure
      .input(z.object({ visitaId: z.number() }))
      .mutation(async ({ input }) => {
        await db.apagarVisitaPlaneada(input.visitaId);
        return { success: true };
      }),
    
    // Trocar ordem de duas visitas (trocar datas)
    trocarOrdem: gestorProcedure
      .input(z.object({ 
        visitaId1: z.number(), 
        visitaId2: z.number() 
      }))
      .mutation(async ({ input }) => {
        // Buscar as duas visitas
        const visita1 = await db.getVisitaPlaneadaById(input.visitaId1);
        const visita2 = await db.getVisitaPlaneadaById(input.visitaId2);
        
        if (!visita1 || !visita2) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Visita não encontrada' });
        }
        
        // Trocar as datas entre as duas visitas
        await db.atualizarDataVisita(input.visitaId1, visita2.dataVisita);
        await db.atualizarDataVisita(input.visitaId2, visita1.dataVisita);
        
        return { success: true };
      }),
    
    // Mover visita para cima (trocar com a anterior)
    moverParaCima: gestorProcedure
      .input(z.object({ visitaId: z.number(), projecaoId: z.number() }))
      .mutation(async ({ input }) => {
        const visitas = await db.getVisitasPlaneadasPorProjecao(input.projecaoId);
        const index = visitas.findIndex(v => v.id === input.visitaId);
        
        if (index <= 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível mover para cima' });
        }
        
        const visitaAtual = visitas[index];
        const visitaAnterior = visitas[index - 1];
        
        // Trocar as datas
        await db.atualizarDataVisita(visitaAtual.id, visitaAnterior.dataVisita);
        await db.atualizarDataVisita(visitaAnterior.id, visitaAtual.dataVisita);
        
        return { success: true };
      }),
    
    // Mover visita para baixo (trocar com a próxima)
    moverParaBaixo: gestorProcedure
      .input(z.object({ visitaId: z.number(), projecaoId: z.number() }))
      .mutation(async ({ input }) => {
        const visitas = await db.getVisitasPlaneadasPorProjecao(input.projecaoId);
        const index = visitas.findIndex(v => v.id === input.visitaId);
        
        if (index < 0 || index >= visitas.length - 1) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível mover para baixo' });
        }
        
        const visitaAtual = visitas[index];
        const visitaProxima = visitas[index + 1];
        
        // Trocar as datas
        await db.atualizarDataVisita(visitaAtual.id, visitaProxima.dataVisita);
        await db.atualizarDataVisita(visitaProxima.id, visitaAtual.dataVisita);
        
        return { success: true };
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
    
    // Comparar meses individuais (ex: Dezembro 2025 vs Janeiro 2026)
    compararMeses: protectedProcedure
      .input(z.object({
        lojaId: z.number(),
        mes1: z.number().min(1).max(12),
        ano1: z.number().min(2020).max(2030),
        mes2: z.number().min(1).max(12),
        ano2: z.number().min(2020).max(2030),
      }))
      .query(async ({ input }) => {
        const { compararMesesIndividuais } = await import('./lojaHistory');
        const result = await compararMesesIndividuais(input.lojaId, input.mes1, input.ano1, input.mes2, input.ano2);
        return result;
      }),

    // Gerar histórico com múltiplos meses selecionados
    generateMultiplosMeses: protectedProcedure
      .input(z.object({
        lojaId: z.number(),
        mesesSelecionados: z.array(z.object({
          mes: z.number().min(1).max(12),
          ano: z.number().min(2020).max(2030),
        })).min(1),
      }))
      .query(async ({ input }) => {
        const { generateLojaHistoryMultiplosMeses } = await import('./lojaHistory');
        const result = await generateLojaHistoryMultiplosMeses(input.lojaId, input.mesesSelecionados);
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

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(['user', 'admin', 'gestor']),
      }))
      .mutation(async ({ input }) => {
        const user = await db.createUser(input.name, input.email, input.role);
        return user;
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

    deleteInBatch: adminProcedure
      .input(z.object({
        userIds: z.array(z.number()).min(1),
      }))
      .mutation(async ({ input }) => {
        const result = await db.deleteUsersInBatch(input.userIds);
        return { success: true, deleted: result.deleted };
      }),
  }),

  // ==================== REUNIÕES OPERACIONAIS ====================
  reunioesGestores: router({
    criar: adminProcedure
      .input(z.object({
        titulo: z.string().optional(),
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
        titulo: z.string().optional(),
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
    
    // ==================== TÓPICOS DE REUNIÃO ====================
    
    // Listar tópicos pendentes (admin e gestor vêem todos, com indicação de quem criou)
    listarTopicosPendentes: protectedProcedure
      .query(async ({ ctx }) => {
        // Todos vêem todos os tópicos pendentes com informação do gestor
        const topicos = await db.getTopicosPendentesComGestor();
        
        // Para gestores, adicionar flag indicando se é dono do tópico
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          const gestorId = gestor?.id || 0;
          return topicos.map(t => ({
            ...t,
            isOwner: t.gestorId === gestorId,
          }));
        }
        
        // Admin pode editar todos
        return topicos.map(t => ({ ...t, isOwner: true }));
      }),
    
    // Criar tópico (gestor submete para discussão)
    criarTopico: gestorProcedure
      .input(z.object({
        titulo: z.string().min(1),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
        
        return await db.createTopicoReuniao({
          gestorId: gestor.id,
          titulo: input.titulo,
          descricao: input.descricao || null,
          estado: 'pendente',
        });
      }),
    
    // Atualizar tópico (gestor pode editar os seus enquanto pendentes)
    atualizarTopico: gestorProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().min(1).optional(),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const topico = await db.getTopicoById(input.id);
        if (!topico) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tópico não encontrado' });
        
        // Verificar permissão (apenas o próprio gestor ou admin)
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor || topico.gestorId !== gestor.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para editar este tópico' });
          }
        }
        
        // Só pode editar se ainda estiver pendente
        if (topico.estado !== 'pendente') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Só pode editar tópicos pendentes' });
        }
        
        await db.updateTopico(input.id, {
          titulo: input.titulo,
          descricao: input.descricao,
        });
        
        const topicoAtualizado = await db.getTopicoById(input.id);
        return topicoAtualizado;
      }),
    
    // Eliminar tópico (gestor pode eliminar os seus enquanto pendentes)
    eliminarTopico: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const topico = await db.getTopicoById(input.id);
        if (!topico) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tópico não encontrado' });
        
        // Verificar permissão (apenas o próprio gestor ou admin)
        if (ctx.user.role !== 'admin') {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (!gestor || topico.gestorId !== gestor.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para eliminar este tópico' });
          }
        }
        
        // Só pode eliminar se ainda estiver pendente
        if (topico.estado !== 'pendente') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Só pode eliminar tópicos pendentes' });
        }
        
        await db.deleteTopico(input.id);
        return { success: true };
      }),
    
    // Marcar tópico como analisado (admin inclui na reunião)
    marcarAnalisado: adminProcedure
      .input(z.object({
        topicoId: z.number(),
        reuniaoId: z.number(),
        notasAdmin: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.marcarTopicoAnalisado(input.topicoId, input.reuniaoId, input.notasAdmin);
        return { success: true };
      }),
    
    // Desmarcar tópico (admin remove da reunião, volta a pendente)
    desmarcarAnalisado: adminProcedure
      .input(z.object({ topicoId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateTopico(input.topicoId, {
          estado: 'pendente',
          reuniaoId: null,
          notasAdmin: null,
        });
        return { success: true };
      }),
    
    // Obter tópicos de uma reunião
    getTopicosReuniao: protectedProcedure
      .input(z.object({ reuniaoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTopicosReuniaoComGestor(input.reuniaoId);
      }),
    
    // Finalizar reunião: marcar tópicos como discutidos/não discutidos
    finalizarTopicos: adminProcedure
      .input(z.object({
        reuniaoId: z.number(),
        topicos: z.array(z.object({
          id: z.number(),
          discutido: z.boolean(),
          resultadoDiscussao: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        for (const topico of input.topicos) {
          if (topico.discutido) {
            await db.marcarTopicoDiscutido(topico.id, topico.resultadoDiscussao);
          } else {
            await db.marcarTopicoNaoDiscutido(topico.id);
          }
        }
        return { success: true };
      }),
    
    // Libertar tópicos não discutidos (voltam a pendente)
    libertarTopicosNaoDiscutidos: adminProcedure
      .input(z.object({ reuniaoId: z.number() }))
      .mutation(async ({ input }) => {
        await db.libertarTopicosNaoDiscutidos(input.reuniaoId);
        return { success: true };
      }),
    
    // Finalizar reunião completa: marcar tópicos + gerar relatório + libertar não discutidos
    finalizarReuniaoCompleta: adminProcedure
      .input(z.object({
        reuniaoId: z.number(),
        topicos: z.array(z.object({
          id: z.number(),
          discutido: z.boolean(),
          resultadoDiscussao: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        // 1. Marcar tópicos como discutidos/não discutidos
        for (const topico of input.topicos) {
          if (topico.discutido) {
            await db.marcarTopicoDiscutido(topico.id, topico.resultadoDiscussao);
          } else {
            await db.marcarTopicoNaoDiscutido(topico.id);
          }
        }
        
        // 2. Libertar automaticamente tópicos não discutidos (voltam a pendente)
        await db.libertarTopicosNaoDiscutidos(input.reuniaoId);
        
        // 3. Gerar relatório com IA
        const reuniao = await db.getReuniaoGestoresById(input.reuniaoId);
        if (!reuniao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
        
        const topicos = await db.getTopicosReuniaoComGestor(input.reuniaoId);
        const topicosDiscutidos = topicos.filter(t => t.estado === 'discutido');
        
        const { gerarRelatorioReuniaoComIA } = await import('./reuniaoService');
        const relatorio = await gerarRelatorioReuniaoComIA(reuniao, topicosDiscutidos);
        
        // 4. Guardar relatório
        const existente = await db.getRelatorioByReuniaoId(input.reuniaoId);
        
        if (existente) {
          await db.updateRelatorioReuniao(existente.id, {
            resumoExecutivo: relatorio.resumoExecutivo,
            topicosDiscutidos: JSON.stringify(relatorio.topicosDiscutidos),
            decisoesTomadas: relatorio.decisoesTomadas,
            acoesDefinidas: JSON.stringify(relatorio.acoesDefinidas),
          });
        } else {
          await db.createRelatorioReuniao({
            reuniaoId: input.reuniaoId,
            resumoExecutivo: relatorio.resumoExecutivo,
            topicosDiscutidos: JSON.stringify(relatorio.topicosDiscutidos),
            decisoesTomadas: relatorio.decisoesTomadas,
            acoesDefinidas: JSON.stringify(relatorio.acoesDefinidas),
          });
        }
        
        return {
          success: true,
          relatorio,
          topicosDiscutidosCount: topicosDiscutidos.length,
          topicosLibertadosCount: input.topicos.filter(t => !t.discutido).length,
        };
      }),
    
    // Gerar relatório da reunião com IA
    gerarRelatorioReuniao: adminProcedure
      .input(z.object({ reuniaoId: z.number() }))
      .mutation(async ({ input }) => {
        const reuniao = await db.getReuniaoGestoresById(input.reuniaoId);
        if (!reuniao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
        
        const topicos = await db.getTopicosReuniaoComGestor(input.reuniaoId);
        const topicosDiscutidos = topicos.filter(t => t.estado === 'discutido');
        
        // Gerar relatório com IA
        const { gerarRelatorioReuniaoComIA } = await import('./reuniaoService');
        const relatorio = await gerarRelatorioReuniaoComIA(reuniao, topicosDiscutidos);
        
        // Verificar se já existe relatório
        const existente = await db.getRelatorioByReuniaoId(input.reuniaoId);
        
        if (existente) {
          await db.updateRelatorioReuniao(existente.id, {
            resumoExecutivo: relatorio.resumoExecutivo,
            topicosDiscutidos: JSON.stringify(relatorio.topicosDiscutidos),
            decisoesTomadas: relatorio.decisoesTomadas,
            acoesDefinidas: JSON.stringify(relatorio.acoesDefinidas),
          });
        } else {
          await db.createRelatorioReuniao({
            reuniaoId: input.reuniaoId,
            resumoExecutivo: relatorio.resumoExecutivo,
            topicosDiscutidos: JSON.stringify(relatorio.topicosDiscutidos),
            decisoesTomadas: relatorio.decisoesTomadas,
            acoesDefinidas: JSON.stringify(relatorio.acoesDefinidas),
          });
        }
        
        return relatorio;
      }),
    
    // Obter relatório da reunião
    getRelatorioReuniao: protectedProcedure
      .input(z.object({ reuniaoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRelatorioByReuniaoId(input.reuniaoId);
      }),
    
    // Criar pendentes a partir das ações do relatório
    criarPendentesDeAcoes: adminProcedure
      .input(z.object({
        reuniaoId: z.number(),
        acoes: z.array(z.object({
          descricao: z.string(),
          gestorId: z.number(),
          prazo: z.date().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        // Buscar lojas de cada gestor para criar pendentes
        for (const acao of input.acoes) {
          const lojasGestor = await db.getLojasByGestorId(acao.gestorId);
          
          // Criar pendente para a primeira loja do gestor (ou criar um pendente geral)
          if (lojasGestor.length > 0) {
            await db.createPendente({
              lojaId: lojasGestor[0].id,
              descricao: `[Reunião Gestores] ${acao.descricao}`,
              dataLimite: acao.prazo || null,
            });
          }
        }
        
        return { success: true };
      }),
    
    // Gerar PDF do relatório da reunião
    gerarPDFRelatorio: protectedProcedure
      .input(z.object({ reuniaoId: z.number() }))
      .query(async ({ input }) => {
        const reuniao = await db.getReuniaoGestoresById(input.reuniaoId);
        if (!reuniao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
        
        const relatorio = await db.getRelatorioByReuniaoId(input.reuniaoId);
        const topicos = await db.getTopicosReuniaoComGestor(input.reuniaoId);
        
        const { gerarPDFRelatorioReuniao } = await import('./reuniaoService');
        const pdfBuffer = await gerarPDFRelatorioReuniao(reuniao, relatorio, topicos);
        
        // Upload para S3
        const { storagePut } = await import('./storage');
        const fileName = `relatorio-reuniao-gestores-${reuniao.id}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, 'application/pdf');
        
        // Atualizar URL do PDF no relatório
        if (relatorio) {
          await db.updateRelatorioReuniao(relatorio.id, { pdfUrl: url });
        }
        
        return { url };
      }),
    
    // Enviar relatório por email aos gestores
    enviarRelatorioEmail: adminProcedure
      .input(z.object({
        reuniaoId: z.number(),
        gestorIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const reuniao = await db.getReuniaoGestoresById(input.reuniaoId);
        if (!reuniao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
        
        let relatorio = await db.getRelatorioByReuniaoId(input.reuniaoId);
        const topicos = await db.getTopicosReuniaoComGestor(input.reuniaoId);
        
        // Se o relatório não existe, gerar automaticamente com IA antes de enviar
        if (!relatorio) {
          try {
            const topicosDiscutidos = topicos.filter(t => t.estado === 'discutido');
            const { gerarRelatorioReuniaoComIA } = await import('./reuniaoService');
            const relatorioGerado = await gerarRelatorioReuniaoComIA(reuniao, topicosDiscutidos);
            
            // Guardar relatório na base de dados
            relatorio = await db.createRelatorioReuniao({
              reuniaoId: input.reuniaoId,
              resumoExecutivo: relatorioGerado.resumoExecutivo,
              topicosDiscutidos: JSON.stringify(relatorioGerado.topicosDiscutidos),
              decisoesTomadas: relatorioGerado.decisoesTomadas,
              acoesDefinidas: JSON.stringify(relatorioGerado.acoesDefinidas),
            });
            console.log(`Relatório gerado automaticamente para reunião ${input.reuniaoId}`);
          } catch (error) {
            console.error('Erro ao gerar relatório automaticamente:', error);
            // Continua com relatorio = null, o HTML mostrará fallbacks
          }
        }
        
        const gestores = await db.getAllGestores();
        const gestoresSelecionados = gestores.filter(g => input.gestorIds.includes(g.id));
        const emailsEnviados: string[] = [];
        
        // Gerar HTML do email
        const { gerarHTMLRelatorioReuniao } = await import('./reuniaoService');
        const htmlContent = gerarHTMLRelatorioReuniao(reuniao, relatorio, topicos);
        
        // Enviar para cada gestor selecionado
        for (const gestor of gestoresSelecionados) {
          if (gestor.email) {
            try {
              await sendEmail({
                to: gestor.email,
                subject: reuniao.titulo || `Relatório Reunião de Gestores - ${new Date(reuniao.data).toLocaleDateString('pt-PT')}`,
                html: htmlContent,
              });
              emailsEnviados.push(gestor.email);
            } catch (error) {
              console.error(`Erro ao enviar email para ${gestor.email}:`, error);
            }
          }
        }
        
        // Enviar também para o admin que criou a reunião
        if (reuniao.criadoPor) {
          const adminCriador = await db.getUserById(reuniao.criadoPor);
          if (adminCriador?.email && !emailsEnviados.includes(adminCriador.email)) {
            try {
              await sendEmail({
                to: adminCriador.email,
                subject: reuniao.titulo || `Relatório Reunião de Gestores - ${new Date(reuniao.data).toLocaleDateString('pt-PT')}`,
                html: htmlContent,
              });
              emailsEnviados.push(adminCriador.email);
              console.log(`Email enviado ao admin criador: ${adminCriador.email}`);
            } catch (error) {
              console.error(`Erro ao enviar email para admin ${adminCriador.email}:`, error);
            }
          }
        }
        
        // Atualizar relatório com info de envio
        if (relatorio && emailsEnviados.length > 0) {
          await db.updateRelatorioReuniao(relatorio.id, {
            emailEnviadoEm: new Date(),
            destinatariosEmail: JSON.stringify(emailsEnviados),
          });
        }
        
        return { success: true, enviados: emailsEnviados.length, emails: emailsEnviados };
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
        emailDestino: z.string().email().optional(), // Agora opcional - usa email da loja se não fornecido
      }))
      .mutation(async ({ input }) => {
        const reuniao = await db.getReuniaoLojasById(input.reuniaoId);
        if (!reuniao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
        
        // Buscar nomes das lojas
        const lojaIds = JSON.parse(reuniao.lojaIds) as number[];
        const lojas = await db.getAllLojas();
        const lojasReuniao = lojas.filter(l => lojaIds.includes(l.id));
        const lojasNomes = lojasReuniao.map(l => l.nome);
        
        // Determinar email de destino - usar da loja se não fornecido
        let emailDestino: string = input.emailDestino || '';
        if (!emailDestino) {
          // Usar email da primeira loja que tenha email configurado
          const lojaComEmail = lojasReuniao.find(l => l.email);
          if (!lojaComEmail || !lojaComEmail.email) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: 'Nenhuma loja desta reunião tem email configurado. Configure o email no perfil da loja.' 
            });
          }
          emailDestino = lojaComEmail.email;
        }
        
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
        
        // Enviar email real para o destinatário
        const { sendEmail } = await import('./emailService');
        
        // Construir HTML completo do email
        const htmlEmail = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header img { max-width: 150px; margin-bottom: 15px; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; }
    .content { padding: 30px; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .info-row { margin-bottom: 8px; }
    .info-label { font-weight: bold; color: #666; }
    h3 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 8px; margin-top: 25px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; line-height: 1.5; }
    pre { background: #f8f9fa; padding: 15px; border-radius: 8px; white-space: pre-wrap; word-wrap: break-word; font-size: 14px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .priority-alta { color: #dc2626; font-weight: bold; }
    .priority-media { color: #f59e0b; font-weight: bold; }
    .priority-baixa { color: #10b981; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" />
      <h1>Reunião de Loja</h1>
      <p>${new Date(reuniao.data).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    <div class="content">
      ${emailContent}
    </div>
    <div class="footer">
      <p>Email enviado automaticamente pela PoweringEG Platform 2.0</p>
      <p>${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  </div>
</body>
</html>
        `;
        
        const emailEnviado = await sendEmail({
          to: emailDestino,
          subject: `Reunião de Loja - ${lojasNomes.join(', ')} - ${new Date(reuniao.data).toLocaleDateString('pt-PT')}`,
          html: htmlEmail,
        });
        
        if (!emailEnviado) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao enviar email' });
        }
        
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
    
    // Dashboard - Estatísticas de múltiplos períodos (meses)
    estatisticasMultiplosMeses: protectedProcedure
      .input(z.object({
        periodos: z.array(z.object({ mes: z.number().min(1).max(12), ano: z.number() })),
        lojaId: z.number().optional(),
        lojasIds: z.array(z.number()).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getEstatisticasMultiplosMeses(input.periodos, input.lojaId, input.lojasIds);
      }),
    
    // Dashboard - Ranking de lojas para múltiplos períodos
    rankingMultiplosMeses: protectedProcedure
      .input(z.object({
        metrica: z.enum(['totalServicos', 'taxaReparacao', 'desvioPercentualMes', 'servicosPorColaborador']),
        periodos: z.array(z.object({ mes: z.number().min(1).max(12), ano: z.number() })),
        limit: z.number().optional(),
        lojasIds: z.array(z.number()).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getRankingLojasMultiplosMeses(input.metrica, input.periodos, input.limit, input.lojasIds);
      }),
    
    // Dashboard - Totais globais para múltiplos períodos
    totaisGlobaisMultiplosMeses: protectedProcedure
      .input(z.object({
        periodos: z.array(z.object({ mes: z.number().min(1).max(12), ano: z.number() })),
      }))
      .query(async ({ input }) => {
        return await db.getTotaisMensaisMultiplosMeses(input.periodos);
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
    
    // Chatbot IA para consultas sobre dados
    chatbot: protectedProcedure
      .input(z.object({
        pergunta: z.string().min(1),
        historico: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const resultado = await processarPergunta(
          input.pergunta,
          input.historico || [],
          ctx.user.id,
          ctx.user.role
        );
        return resultado;
      }),
    
    // Sugestões de perguntas para o chatbot
    sugestoesChatbot: protectedProcedure
      .query(async () => {
        return await getSugestoesPergunta();
      }),
  }),

  // ==================== NPS - NET PROMOTER SCORE ====================
  nps: router({
    // Upload de ficheiro NPS (Excel ou PDF)
    upload: adminProcedure
      .input(z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        ano: z.number(),
        fileType: z.enum(['excel', 'pdf']).default('excel'),
      }))
      .mutation(async ({ ctx, input }) => {
        const fileBuffer = Buffer.from(input.fileBase64, 'base64');
        
        if (input.fileType === 'pdf' || input.fileName.toLowerCase().endsWith('.pdf')) {
          // Processar PDF
          const { processarPdfNPS } = await import('./pdfNpsProcessor');
          const resultado = await processarPdfNPS(
            fileBuffer,
            input.ano,
            ctx.user.id,
            input.fileName
          );
          return resultado;
        } else {
          // Processar Excel
          const { processarExcelNPS } = await import('./excelProcessor');
          const resultado = await processarExcelNPS(
            fileBuffer,
            input.ano,
            ctx.user.id,
            input.fileName
          );
          return resultado;
        }
      }),
    
    // Obter dados NPS de uma loja específica
    getDadosLoja: protectedProcedure
      .input(z.object({
        lojaId: z.number(),
        ano: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getNPSDadosLoja(input.lojaId, input.ano);
      }),
    
    // Obter dados NPS de múltiplas lojas (para gestor)
    getDadosLojas: protectedProcedure
      .input(z.object({
        lojasIds: z.array(z.number()),
        ano: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getNPSDadosLojas(input.lojasIds, input.ano);
      }),
    
    // Obter dados NPS de todas as lojas (para admin)
    getDadosTodasLojas: adminProcedure
      .input(z.object({
        ano: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getNPSDadosTodasLojas(input.ano);
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
        
        // Obter lojas relacionadas
        const lojasRelacionadas = await db.getLojasRelacionadas(result.loja.id);
        
        return {
          lojaId: result.loja.id,
          lojaNome: result.loja.nome,
          lojaEmail: result.loja.email,
          tipoToken: result.tokenData.tipo,
          lojasRelacionadas: lojasRelacionadas.map(l => ({
            id: l.lojaId,
            nome: l.lojaNome,
          })),
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
    
    // Criar pendente (pela loja)
    criarPendente: publicProcedure
      .input(z.object({
        token: z.string(),
        descricao: z.string().min(1, 'Descrição é obrigatória'),
        prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se é responsável (não colaborador)
        if (auth.tokenData.tipo !== 'responsavel') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas responsáveis podem criar pendentes' });
        }
        
        return await db.criarPendenteLoja({
          lojaId: auth.loja.id,
          criadoPelaLoja: true,
          descricao: input.descricao,
          prioridade: input.prioridade || 'media',
        });
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
      .input(z.object({ 
        token: z.string(),
        lojaId: z.number().optional(), // Para ver dados de loja relacionada
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Determinar qual loja usar
        let lojaIdParaConsulta = auth.loja.id;
        let lojaParaRetornar = auth.loja;
        
        if (input.lojaId && input.lojaId !== auth.loja.id) {
          // Verificar se a loja solicitada é uma loja relacionada
          const lojasRelacionadas = await db.getLojasRelacionadas(auth.loja.id);
          const lojaRelacionada = lojasRelacionadas.find(l => l.lojaId === input.lojaId);
          
          if (lojaRelacionada) {
            lojaIdParaConsulta = input.lojaId;
            // Buscar dados completos da loja relacionada
            const lojaCompleta = await db.getLojaById(input.lojaId);
            if (lojaCompleta) {
              lojaParaRetornar = lojaCompleta;
            }
          }
        }
        
        const pendentesAtivos = await db.contarPendentesLojaAtivos(lojaIdParaConsulta);
        const ultimaReuniao = await db.getUltimaReuniaoQuinzenal(lojaIdParaConsulta);
        const gestor = await db.getGestorDaLoja(lojaIdParaConsulta);
        
        return {
          loja: lojaParaRetornar,
          pendentesAtivos,
          ultimaReuniao,
          gestorNome: gestor?.nome || null,
        };
      }),

    // Obter últimas análises de stock da loja
    analisesStock: publicProcedure
      .input(z.object({
        token: z.string(),
        lojaId: z.number().optional(),
        limite: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        let lojaIdParaConsulta = auth.loja.id;
        
        if (input.lojaId && input.lojaId !== auth.loja.id) {
          const lojasRelacionadas = await db.getLojasRelacionadas(auth.loja.id);
          const lojaRelacionada = lojasRelacionadas.find(l => l.lojaId === input.lojaId);
          if (lojaRelacionada) {
            lojaIdParaConsulta = input.lojaId;
          }
        }
        
        const analises = await db.getAnalisesStockPorLoja(lojaIdParaConsulta, input.limite || 5);
        
        // Obter classificações com_ficha_servico para ajustar KPIs
        const classificacoes = await db.getClassificacoesEurocode(lojaIdParaConsulta);
        const linhasComFichaServico = new Set(
          classificacoes
            .filter((c: any) => c.classificacao === 'com_ficha_servico')
            .map((c: any) => c.eurocode)
        ).size;
        
        return analises.map((a: any) => ({
          ...a,
          // Ajustar KPIs com reclassificações
          totalComFichasAjustado: a.totalComFichas + linhasComFichaServico,
          totalSemFichasAjustado: Math.max(0, a.totalSemFichas - linhasComFichaServico),
        }));
      }),

    // Obter detalhe de uma análise de stock (para o portal da loja)
    detalheStock: publicProcedure
      .input(z.object({
        token: z.string(),
        analiseId: z.number(),
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const analise = await db.getAnaliseStockById(input.analiseId);
        if (!analise) throw new TRPCError({ code: 'NOT_FOUND', message: 'Análise não encontrada' });
        
        // Verificar que a análise pertence à loja
        if (analise.lojaId !== auth.loja.id) {
          // Verificar lojas relacionadas
          const lojasRelacionadas = await db.getLojasRelacionadas(auth.loja.id);
          const lojaRelacionada = lojasRelacionadas.find(l => l.lojaId === analise.lojaId);
          if (!lojaRelacionada) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para ver esta análise' });
          }
        }
        
        // Obter classificações e recorrências
        const classificacoes = await db.getClassificacoesEurocode(analise.lojaId);
        const recorrencias = await db.getRecorrenciaEurocodes(analise.lojaId);
        
        return {
          ...analise,
          resultadoAnalise: analise.resultadoAnalise ? JSON.parse(analise.resultadoAnalise) : null,
          dadosStock: analise.dadosStock ? JSON.parse(analise.dadosStock) : null,
          classificacoes,
          recorrencias,
        };
      }),

    // Classificar um eurocode sem ficha (via portal da loja)
    classificarStock: publicProcedure
      .input(z.object({
        token: z.string(),
        lojaId: z.number(),
        eurocode: z.string(),
        unitIndex: z.number().default(1),
        classificacao: z.enum(['devolucao_rejeitada', 'usado', 'com_danos', 'para_devolver', 'para_realizar', 'com_ficha_servico', 'nao_existe', 'outros']),
        observacao: z.string().max(255).optional(),
        analiseId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Verificar token da loja
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar que a loja tem acesso
        if (input.lojaId !== auth.loja.id) {
          const lojasRelacionadas = await db.getLojasRelacionadas(auth.loja.id);
          const lojaRelacionada = lojasRelacionadas.find(l => l.lojaId === input.lojaId);
          if (!lojaRelacionada) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
          }
        }
        
        return db.classificarEurocode({
          lojaId: input.lojaId,
          eurocode: input.eurocode,
          unitIndex: input.unitIndex,
          classificacao: input.classificacao,
          observacao: input.observacao,
          analiseId: input.analiseId,
        });
      }),

    // Remover classificação de um eurocode (via portal da loja)
    removerClassificacaoStock: publicProcedure
      .input(z.object({
        token: z.string(),
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return db.removerClassificacaoEurocode(input.id);
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
      .input(z.object({ 
        lojaId: z.number(),
        tipo: z.enum(['responsavel', 'colaborador']).optional().default('responsavel'),
      }))
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
        return await db.getOrCreateTokenLoja(input.lojaId, input.tipo);
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
      .input(z.object({ 
        lojaId: z.number(),
        tipo: z.enum(['responsavel', 'colaborador']).optional().default('responsavel'),
      }))
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
        
        const token = await db.getOrCreateTokenLoja(input.lojaId, input.tipo);
        if (!token) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar token' });
        
        // Construir URL do portal - usar o domínio publicado correto
        const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg-3c9mozlh.manus.space';
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
                Foi-lhe enviado um link de acesso ao Portal da Loja.
              </p>
              <p style="color: #374151; line-height: 1.6;">
                Através deste portal poderá:
              </p>
              <ul style="color: #374151; line-height: 1.8;">
                <li>Ver e responder às <strong>Tarefas</strong> atribuídas à sua loja</li>
                <li>Enviar novas tarefas para o gestor</li>
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
          subject: `Acesso ao Portal da Loja - ${loja.nome}`,
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
          
          // Enviar notificação push para a loja
          try {
            await notificarLojaNovaTarefa(input.atribuidoLojaId, input.titulo);
          } catch (e) {
            console.error('Erro ao enviar push notification:', e);
          }
        }
        
        return todo;
      }),
    
    // Atualizar To-Do (apenas se não foi visto pelo destinatário)
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
        forcarEdicao: z.boolean().optional(), // Para permitir edição de estado mesmo após visto
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, forcarEdicao, ...data } = input;
        
        // Verificar se a tarefa já foi vista pelo destinatário
        const todo = await db.getTodoById(id);
        if (!todo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' });
        }
        
        // Se não é forçar edição (edição de conteúdo), verificar se foi visto
        // Apenas o criador pode editar, e apenas se não foi visto
        if (!forcarEdicao && (data.titulo !== undefined || data.descricao !== undefined)) {
          // Verificar se o utilizador é o criador
          if (todo.criadoPorId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas o criador pode editar a tarefa' });
          }
          
          // Verificar se já foi visto pelo destinatário
          if (todo.visto) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não é possível editar uma tarefa já lida pelo destinatário' });
          }
        }
        
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
    // Para admin: conta TODAS as tarefas criadas por lojas (pendentes)
    // Para gestor: conta apenas as tarefas atribuídas a ele
    countPendentesAtribuidosAMim: gestorProcedure.query(async ({ ctx }) => {
      // Tanto admin como gestor veem apenas tarefas atribuídas a eles
      return await db.countTodosPendentesAtribuidosAMim(ctx.user.id);
    }),
    
    // Contar tarefas NÃO VISTAS pelo gestor (para animação pulse)
    countNaoVistosGestor: gestorProcedure.query(async ({ ctx }) => {
      // Tanto admin como gestor veem apenas tarefas não vistas atribuídas a eles
      return await db.countTodosNaoVistosGestor(ctx.user.id);
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
    
    // Responder a tarefa da loja (apenas adiciona comentário sem mudar status)
    responder: gestorProcedure
      .input(z.object({
        id: z.number(),
        resposta: z.string().min(1, 'A resposta não pode estar vazia'),
      }))
      .mutation(async ({ ctx, input }) => {
        const todo = await db.getTodoById(input.id);
        if (!todo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' });
        }
        
        // Adicionar resposta ao comentário
        const comentarioAtualizado = `[${new Date().toLocaleDateString('pt-PT')} - ${ctx.user.name}] ${input.resposta}${todo.comentario ? '\n\n--- Histórico ---\n' + todo.comentario : ''}`;
        
        await db.updateTodo(input.id, {
          comentario: comentarioAtualizado,
          // Marcar como não visto para a loja ver a resposta
          visto: false,
          vistoEm: null,
        });
        
        // Notificar a loja por email se a tarefa foi criada por uma loja
        if (todo.criadoPorLojaId) {
          const loja = await db.getLojaById(todo.criadoPorLojaId);
          if (loja?.email) {
            try {
              await sendEmail({
                to: loja.email,
                subject: `Resposta do Gestor: ${todo.titulo}`,
                html: gerarHTMLNotificacaoTodo({
                  tipo: 'resposta_gestor',
                  titulo: todo.titulo,
                  descricao: todo.descricao || '',
                  prioridade: todo.prioridade,
                  criadoPor: ctx.user.name || 'Gestor',
                  lojaNome: loja.nome,
                  comentario: input.resposta,
                }),
              });
            } catch (e) {
              console.error('Erro ao enviar email de notificação:', e);
            }
          }
        }
        
        // Notificar também se a tarefa está atribuída a uma loja
        if (todo.atribuidoLojaId && todo.atribuidoLojaId !== todo.criadoPorLojaId) {
          const loja = await db.getLojaById(todo.atribuidoLojaId);
          if (loja?.email) {
            try {
              await sendEmail({
                to: loja.email,
                subject: `Resposta do Gestor: ${todo.titulo}`,
                html: gerarHTMLNotificacaoTodo({
                  tipo: 'resposta_gestor',
                  titulo: todo.titulo,
                  descricao: todo.descricao || '',
                  prioridade: todo.prioridade,
                  criadoPor: ctx.user.name || 'Gestor',
                  lojaNome: loja.nome,
                  comentario: input.resposta,
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
    
    // Contar To-Dos NÃO VISTOS pela loja (para alerta/badge)
    contarNaoVistos: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return await db.contarTodosLojaNaoVistos(auth.loja.id);
      }),
    
    // Marcar To-Do como visto pela loja
    marcarVisto: publicProcedure
      .input(z.object({
        token: z.string(),
        todoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        // Verificar se o To-Do pertence a esta loja
        const todo = await db.getTodoById(input.todoId);
        if (!todo || todo.atribuidoLojaId !== auth.loja.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para marcar esta tarefa' });
        }
        await db.marcarTodoComoVisto(input.todoId);
        return { success: true };
      }),
    
    // Marcar múltiplos To-Dos como vistos pela loja
    marcarMultiplosVistos: publicProcedure
      .input(z.object({
        token: z.string(),
        todoIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        // Verificar se todos os To-Dos pertencem a esta loja
        for (const todoId of input.todoIds) {
          const todo = await db.getTodoById(todoId);
          if (!todo || todo.atribuidoLojaId !== auth.loja.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para marcar esta tarefa' });
          }
        }
        await db.marcarMultiplosTodosComoVistoLoja(input.todoIds);
        return { success: true };
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
        
        // Enviar notificação push ao gestor
        try {
          await notificarGestorRespostaLoja(todo.criadoPorId, auth.loja.nome, todo.titulo);
        } catch (e) {
          console.error('Erro ao enviar push notification:', e);
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
        
        // Enviar notificação push ao gestor
        try {
          await notificarGestorNovaTarefa(gestorDaLoja.userId, auth.loja.nome, input.titulo);
        } catch (e) {
          console.error('Erro ao enviar push notification:', e);
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
    
    // Editar tarefa enviada (apenas se não foi vista pelo gestor)
    editarEnviada: publicProcedure
      .input(z.object({
        token: z.string(),
        todoId: z.number(),
        titulo: z.string().min(1, 'Título é obrigatório').optional(),
        descricao: z.string().optional(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
        categoriaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se a tarefa foi criada pela loja
        const todo = await db.getTodoById(input.todoId);
        if (!todo || todo.criadoPorLojaId !== auth.loja.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem permissão para editar esta tarefa' });
        }
        
        // Verificar se o gestor já viu a tarefa
        if (todo.visto) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não pode editar uma tarefa que já foi vista pelo gestor' });
        }
        
        // Atualizar a tarefa
        const { token, todoId, ...data } = input;
        await db.updateTodo(todoId, data);
        
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
    
    // Dashboard completo da loja (KPIs, alertas, objetivos)
    dashboardCompleto: publicProcedure
      .input(z.object({
        token: z.string(),
        meses: z.array(z.object({ mes: z.number().min(1).max(12), ano: z.number() })).optional(),
        lojaId: z.number().optional(), // Para ver dados de loja relacionada
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Determinar qual loja usar
        let lojaIdParaConsulta = auth.loja.id;
        
        if (input.lojaId && input.lojaId !== auth.loja.id) {
          // Verificar se a loja solicitada é uma loja relacionada
          const lojasRelacionadas = await db.getLojasRelacionadas(auth.loja.id);
          const lojaRelacionada = lojasRelacionadas.find(l => l.lojaId === input.lojaId);
          
          if (lojaRelacionada) {
            lojaIdParaConsulta = input.lojaId;
          }
        }
        
        const now = new Date();
        const anoAtual = now.getFullYear();
        const mesAtual = now.getMonth() + 1;
        
        // Usar meses fornecidos ou mês anterior por defeito
        let mesesConsulta: { mes: number; ano: number }[] = [];
        let periodoLabel = '';
        
        if (input.meses && input.meses.length > 0) {
          mesesConsulta = input.meses;
          // Gerar label baseado nos meses selecionados
          if (mesesConsulta.length === 1) {
            periodoLabel = new Date(mesesConsulta[0].ano, mesesConsulta[0].mes - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
          } else {
            const mesesOrdenados = [...mesesConsulta].sort((a, b) => {
              if (a.ano !== b.ano) return a.ano - b.ano;
              return a.mes - b.mes;
            });
            const primeiro = mesesOrdenados[0];
            const ultimo = mesesOrdenados[mesesOrdenados.length - 1];
            periodoLabel = `${new Date(primeiro.ano, primeiro.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} - ${new Date(ultimo.ano, ultimo.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} (${mesesConsulta.length} meses)`;
          }
        } else {
          // Por defeito, mês anterior
          const mesAnt = mesAtual === 1 ? 12 : mesAtual - 1;
          const anoAnt = mesAtual === 1 ? anoAtual - 1 : anoAtual;
          mesesConsulta = [{ mes: mesAnt, ano: anoAnt }];
          periodoLabel = new Date(anoAnt, mesAnt - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        }
        
        // Buscar dados agregados para todos os meses do período
        let totalServicos = 0;
        let totalObjetivo = 0;
        let totalReparacoes = 0;
        let totalParaBrisas = 0;
        let taxaReparacaoExcel: number | null = null;
        let totalEscovas = 0;
        let totalPolimento = 0;
        let totalTratamento = 0;
        let totalLavagens = 0;
        let totalOutros = 0;
        let dataUltimaAtualizacao: Date | null = null;
        let resultadosAgregados: any = null;
        let complementaresAgregados: any = null;
        
        for (const p of mesesConsulta) {
          const resultadosArr = await db.getResultadosMensaisPorLoja(lojaIdParaConsulta, p.mes, p.ano);
          if (resultadosArr) {
            totalServicos += Number(resultadosArr.totalServicos) || 0;
            totalObjetivo += Number(resultadosArr.objetivoMensal) || 0;
            totalReparacoes += Number(resultadosArr.qtdReparacoes) || 0;
            totalParaBrisas += Number(resultadosArr.qtdParaBrisas) || 0;
            if (resultadosArr.updatedAt) {
            if (resultadosArr.taxaReparacao !== null && resultadosArr.taxaReparacao !== undefined) {
              taxaReparacaoExcel = parseFloat(String(resultadosArr.taxaReparacao));
            }
              const dataAtual = new Date(resultadosArr.updatedAt);
              if (!dataUltimaAtualizacao || dataAtual > dataUltimaAtualizacao) {
                dataUltimaAtualizacao = dataAtual;
              }
            }
            if (!resultadosAgregados) resultadosAgregados = resultadosArr;
          }
          
          const complementaresArr = await db.getVendasComplementares(p.mes, p.ano, lojaIdParaConsulta);
          if (complementaresArr && complementaresArr.length > 0) {
            const c = complementaresArr[0];
            totalEscovas += Number(c.escovasQtd) || 0;
            totalPolimento += Number(c.polimentoQtd) || 0;
            totalTratamento += Number(c.tratamentoQtd) || 0;
            totalLavagens += Number(c.lavagensTotal) || 0;
            totalOutros += Number(c.outrosQtd) || 0;
            if (!complementaresAgregados) complementaresAgregados = c;
          }
        }
        
        // Calcular métricas agregadas
        const desvioPercentual = totalObjetivo > 0 ? (totalServicos - totalObjetivo) / totalObjetivo : null;
        const taxaReparacao = taxaReparacaoExcel;
        const escovasPercent = totalServicos > 0 ? totalEscovas / totalServicos : null;
        
        // Criar objeto de resultados agregados
        // Obter dados de objetivo diário do primeiro mês (mais recente)
        const objetivoDiaAtual = resultadosAgregados?.objetivoDiaAtual ? parseFloat(String(resultadosAgregados.objetivoDiaAtual)) : null;
        const desvioObjetivoAcumulado = resultadosAgregados?.desvioObjetivoAcumulado ? parseFloat(String(resultadosAgregados.desvioObjetivoAcumulado)) : null;
        const desvioPercentualDia = resultadosAgregados?.desvioPercentualDia ? parseFloat(String(resultadosAgregados.desvioPercentualDia)) : null;
        
        const resultados = {
          totalServicos,
          objetivoMensal: totalObjetivo,
          objetivoDiaAtual,
          desvioObjetivoAcumulado,
          desvioPercentualDia,
          desvioPercentualMes: desvioPercentual,
          taxaReparacao,
          totalReparacoes,
          gapReparacoes22: taxaReparacao !== null && taxaReparacao < 0.22 
            ? Math.ceil(totalServicos * 0.22 - totalReparacoes) 
            : 0,
        };
        
        const complementares = {
          escovasQtd: totalEscovas,
          escovasPercent,
          polimentoQtd: totalPolimento,
          tratamentoQtd: totalTratamento,
          lavagensTotal: totalLavagens,
          outrosQtd: totalOutros,
        };
        
        // Buscar dados do mês anterior para comparativo
        const mesAnteriorData = mesesConsulta[0];
        const mesCompMes = mesAnteriorData.mes === 1 ? 12 : mesAnteriorData.mes - 1;
        const mesCompAno = mesAnteriorData.mes === 1 ? mesAnteriorData.ano - 1 : mesAnteriorData.ano;
        const resultadosMesAnterior = await db.getResultadosMensaisPorLoja(lojaIdParaConsulta, mesCompMes, mesCompAno);
        const complementaresMesAnterior = await db.getVendasComplementares(mesCompMes, mesCompAno, lojaIdParaConsulta);
        
        // Calcular variações
        const variacaoServicos = resultadosMesAnterior && resultadosMesAnterior.totalServicos 
          ? ((totalServicos - Number(resultadosMesAnterior.totalServicos)) / Number(resultadosMesAnterior.totalServicos)) * 100 
          : null;
        const variacaoReparacoes = resultadosMesAnterior && resultadosMesAnterior.qtdReparacoes 
          ? ((totalReparacoes - Number(resultadosMesAnterior.qtdReparacoes)) / Number(resultadosMesAnterior.qtdReparacoes)) * 100 
          : null;
        const escovasAnterior = complementaresMesAnterior && complementaresMesAnterior.length > 0 
          ? Number(complementaresMesAnterior[0].escovasQtd) || 0 
          : 0;
        const variacaoEscovas = escovasAnterior > 0 
          ? ((totalEscovas - escovasAnterior) / escovasAnterior) * 100 
          : null;
        
        const comparativoMesAnterior = {
          servicosAnterior: resultadosMesAnterior?.totalServicos || 0,
          variacaoServicos,
          reparacoesAnterior: resultadosMesAnterior?.qtdReparacoes || 0,
          variacaoReparacoes,
          escovasAnterior,
          variacaoEscovas,
        };
        
        const evolucao = await db.getEvolucaoMensal(lojaIdParaConsulta, 12);
        
        // Gerar alertas
        const alertas: { tipo: 'warning' | 'danger' | 'success'; mensagem: string }[] = [];
        
        if (resultados) {
          // Alerta taxa de reparação
          const taxaRep = resultados.taxaReparacao !== null ? parseFloat(String(resultados.taxaReparacao)) : null;
          if (taxaRep !== null && taxaRep < 0.22) {
            alertas.push({
              tipo: 'warning',
              mensagem: `Taxa de reparação (${(taxaRep * 100).toFixed(1)}%) abaixo do objetivo de 22%`
            });
          }
          
          // Alerta desvio objetivo diário
          const desvioDia = resultados.desvioPercentualDia !== null ? parseFloat(String(resultados.desvioPercentualDia)) : null;
          if (desvioDia !== null && desvioDia < -0.1) {
            alertas.push({
              tipo: 'danger',
              mensagem: `Desvio de ${(desvioDia * 100).toFixed(1)}% abaixo do objetivo diário acumulado`
            });
          } else if (desvioDia !== null && desvioDia >= 0) {
            alertas.push({
              tipo: 'success',
              mensagem: `Parabéns! Objetivo diário acumulado atingido (+${(desvioDia * 100).toFixed(1)}%)`
            });
          }
          
          // Alerta gap reparações
          if (resultados.gapReparacoes22 !== null && resultados.gapReparacoes22 > 0) {
            alertas.push({
              tipo: 'warning',
              mensagem: `Faltam ${resultados.gapReparacoes22} reparações para atingir 22%`
            });
          }
        }
        
        if (complementares) {
          // Alerta escovas
          const escovasPerc = complementares.escovasPercent !== null ? parseFloat(String(complementares.escovasPercent)) : null;
          if (escovasPerc !== null && escovasPerc < 0.075) {
            alertas.push({
              tipo: 'warning',
              mensagem: `Escovas (${(escovasPerc * 100).toFixed(1)}%) abaixo do objetivo de 7.5%`
            });
          } else if (escovasPerc !== null && escovasPerc >= 0.10) {
            alertas.push({
              tipo: 'success',
              mensagem: `Excelente! Escovas acima de 10% (${(escovasPerc * 100).toFixed(1)}%)`
            });
          }
        }
        
        // ==================== NPS ====================
        // Buscar dados NPS da loja - todos os 12 meses do ano para histórico + meses selecionados para KPIs
        let dadosNPS: { mes: number; ano: number; nps: number | null; taxaResposta: number | null; totalRespostas: number | null; totalConvites: number | null }[] = [];
        let historicoNPS: { mes: number; ano: number; nps: number | null; taxaResposta: number | null; totalRespostas: number | null; totalConvites: number | null }[] = [];
        let npsElegivel = false;
        let npsMedio: number | null = null;
        let taxaRespostaNPS: number | null = null;
        let motivoInelegibilidade: string | null = null;
        
        try {
          // Mapeamento de mês para campos da tabela nps_dados (colunas por mês)
          const npsFieldMap: Record<number, { nps: string; taxa: string }> = {
            1: { nps: 'npsJan', taxa: 'taxaRespostaJan' },
            2: { nps: 'npsFev', taxa: 'taxaRespostaFev' },
            3: { nps: 'npsMar', taxa: 'taxaRespostaMar' },
            4: { nps: 'npsAbr', taxa: 'taxaRespostaAbr' },
            5: { nps: 'npsMai', taxa: 'taxaRespostaMai' },
            6: { nps: 'npsJun', taxa: 'taxaRespostaJun' },
            7: { nps: 'npsJul', taxa: 'taxaRespostaJul' },
            8: { nps: 'npsAgo', taxa: 'taxaRespostaAgo' },
            9: { nps: 'npsSet', taxa: 'taxaRespostaSet' },
            10: { nps: 'npsOut', taxa: 'taxaRespostaOut' },
            11: { nps: 'npsNov', taxa: 'taxaRespostaNov' },
            12: { nps: 'npsDez', taxa: 'taxaRespostaDez' },
          };
          
          // Buscar TODOS os meses do ano actual e anterior para histórico completo
          const anoActual = new Date().getFullYear();
          const anosHistorico = [anoActual - 1, anoActual];
          const anosConsulta = [...new Set([...mesesConsulta.map(m => m.ano), ...anosHistorico])];
          
          for (const ano of anosConsulta) {
            const npsLoja = await db.getNPSDadosLoja(lojaIdParaConsulta, ano);
            if (npsLoja) {
              // Carregar TODOS os 12 meses para o histórico
              for (let mes = 1; mes <= 12; mes++) {
                const fields = npsFieldMap[mes];
                if (!fields) continue;
                const npsVal = (npsLoja as any)[fields.nps];
                const taxaVal = (npsLoja as any)[fields.taxa];
                if (npsVal !== null && npsVal !== undefined) {
                  historicoNPS.push({
                    mes,
                    ano,
                    nps: parseFloat(String(npsVal)),
                    taxaResposta: taxaVal !== null && taxaVal !== undefined ? parseFloat(String(taxaVal)) : null,
                    totalRespostas: null,
                    totalConvites: null,
                  });
                }
              }
              
              // Carregar apenas os meses selecionados para KPIs
              for (const mesInfo of mesesConsulta) {
                if (mesInfo.ano !== ano) continue;
                const fields = npsFieldMap[mesInfo.mes];
                if (!fields) continue;
                const npsVal = (npsLoja as any)[fields.nps];
                const taxaVal = (npsLoja as any)[fields.taxa];
                if (npsVal !== null && npsVal !== undefined) {
                  dadosNPS.push({
                    mes: mesInfo.mes,
                    ano: mesInfo.ano,
                    nps: parseFloat(String(npsVal)),
                    taxaResposta: taxaVal !== null && taxaVal !== undefined ? parseFloat(String(taxaVal)) : null,
                    totalRespostas: null,
                    totalConvites: null,
                  });
                }
              }
            }
          }
          
          // Ordenar histórico por data
          historicoNPS.sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
          
          // Calcular NPS médio e taxa de resposta média (dos meses selecionados)
          const npsValidos = dadosNPS.filter(d => d.nps !== null);
          if (npsValidos.length > 0) {
            npsMedio = npsValidos.reduce((sum, d) => sum + (d.nps || 0), 0) / npsValidos.length;
            const taxasValidas = npsValidos.filter(d => d.taxaResposta !== null);
            if (taxasValidas.length > 0) {
              taxaRespostaNPS = taxasValidas.reduce((sum, d) => sum + (d.taxaResposta || 0), 0) / taxasValidas.length;
            }
            
            // Verificar elegibilidade: NPS >= 80% E Taxa Resposta >= 7.5%
            const npsPercent = npsMedio * 100;
            const taxaPercent = (taxaRespostaNPS || 0) * 100;
            
            if (npsPercent >= 80 && taxaPercent >= 7.5) {
              npsElegivel = true;
            } else {
              if (npsPercent < 80 && taxaPercent < 7.5) {
                motivoInelegibilidade = `NPS (${npsPercent.toFixed(0)}%) abaixo de 80% e Taxa de Resposta (${taxaPercent.toFixed(1)}%) abaixo de 7,5%`;
              } else if (npsPercent < 80) {
                motivoInelegibilidade = `NPS (${npsPercent.toFixed(0)}%) abaixo de 80%`;
              } else {
                motivoInelegibilidade = `Taxa de Resposta (${taxaPercent.toFixed(1)}%) abaixo de 7,5%`;
              }
            }
            
            // Adicionar alertas NPS
            if (!npsElegivel && motivoInelegibilidade) {
              alertas.push({
                tipo: 'danger',
                mensagem: `Sem direito a prémio NPS: ${motivoInelegibilidade}`
              });
            } else if (npsElegivel) {
              alertas.push({
                tipo: 'success',
                mensagem: `Elegível para prémio NPS! (NPS: ${(npsMedio * 100).toFixed(0)}%, Taxa Resposta: ${((taxaRespostaNPS || 0) * 100).toFixed(1)}%)`
              });
            }
          }
        } catch (e) {
          // NPS não disponível - não bloquear o dashboard
          console.error('[Portal Loja] Erro ao buscar NPS:', e);
        }
        
        return {
          resultados,
          complementares,
          evolucao,
          alertas,
          mesesSelecionados: mesesConsulta,
          periodoAtual: mesesConsulta[0],
          periodoLabel,
          dataAtualizacao: dataUltimaAtualizacao?.toISOString() || null,
          comparativoMesAnterior,
          nps: {
            dadosMensais: dadosNPS,
            historicoCompleto: historicoNPS,
            npsMedio,
            taxaRespostaNPS,
            elegivel: npsElegivel,
            motivoInelegibilidade,
          },
        };
      }),
    
    // Exportar PDF de resultados (para Portal da Loja)
    exportarPDFResultados: publicProcedure
      .input(z.object({
        token: z.string(),
        meses: z.array(z.object({ mes: z.number().min(1).max(12), ano: z.number() })).optional(),
        incluirAnaliseIA: z.boolean().optional(),
        lojaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { gerarPDFResultados } = await import('./pdfService');
        
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Determinar qual loja usar
        let lojaIdParaConsulta = auth.loja.id;
        let lojaNome = auth.loja.nome;
        
        if (input.lojaId && input.lojaId !== auth.loja.id) {
          const lojasRelacionadas = await db.getLojasRelacionadas(auth.loja.id);
          const lojaRelacionada = lojasRelacionadas.find(l => l.lojaId === input.lojaId);
          if (lojaRelacionada) {
            lojaIdParaConsulta = input.lojaId;
            lojaNome = lojaRelacionada.lojaNome;
          }
        }
        
        const now = new Date();
        const anoAtual = now.getFullYear();
        const mesAtual = now.getMonth() + 1;
        
        let mesesConsulta: { mes: number; ano: number }[] = [];
        let periodoLabel = '';
        
        if (input.meses && input.meses.length > 0) {
          mesesConsulta = input.meses;
          if (mesesConsulta.length === 1) {
            periodoLabel = new Date(mesesConsulta[0].ano, mesesConsulta[0].mes - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
          } else {
            const mesesOrdenados = [...mesesConsulta].sort((a, b) => {
              if (a.ano !== b.ano) return a.ano - b.ano;
              return a.mes - b.mes;
            });
            const primeiro = mesesOrdenados[0];
            const ultimo = mesesOrdenados[mesesOrdenados.length - 1];
            periodoLabel = `${new Date(primeiro.ano, primeiro.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} - ${new Date(ultimo.ano, ultimo.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}`;
          }
        } else {
          mesesConsulta = [{ mes: mesAtual, ano: anoAtual }];
          periodoLabel = new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        }
        
        // Buscar dados agregados
        let totalServicos = 0;
        let totalObjetivo = 0;
        let totalReparacoes = 0;
        let taxaReparacaoExcel: number | null = null;
        let totalParaBrisas = 0;
        let desvioPercentualDiaExcel: number | null = null;
        let totalEscovas = 0;
        let totalPolimento = 0;
        let totalTratamento = 0;
        let totalLavagens = 0;
        let totalOutros = 0;
        
        for (const p of mesesConsulta) {
          const resultadosArr = await db.getResultadosMensaisPorLoja(lojaIdParaConsulta, p.mes, p.ano);
          if (resultadosArr) {
            totalServicos += Number(resultadosArr.totalServicos) || 0;
            totalObjetivo += Number(resultadosArr.objetivoMensal) || 0;
            totalReparacoes += Number(resultadosArr.qtdReparacoes) || 0;
            totalParaBrisas += Number(resultadosArr.qtdParaBrisas) || 0;
            if (resultadosArr.taxaReparacao !== null && resultadosArr.taxaReparacao !== undefined) {
              taxaReparacaoExcel = parseFloat(String(resultadosArr.taxaReparacao));
            }
            if (resultadosArr.desvioPercentualDia !== null && resultadosArr.desvioPercentualDia !== undefined) {
              desvioPercentualDiaExcel = parseFloat(String(resultadosArr.desvioPercentualDia));
            }
          }
          const complementaresArr = await db.getVendasComplementares(p.mes, p.ano, lojaIdParaConsulta);
          if (complementaresArr && complementaresArr.length > 0) {
            const c = complementaresArr[0];
            totalEscovas += Number(c.escovasQtd) || 0;
            totalPolimento += Number(c.polimentoQtd) || 0;
            totalTratamento += Number(c.tratamentoQtd) || 0;
            totalLavagens += Number(c.lavagensTotal) || 0;
            totalOutros += Number(c.outrosQtd) || 0;
          }
        }
        
        // Calcular métricas
        const desvioPercentual = totalObjetivo > 0 ? (totalServicos - totalObjetivo) / totalObjetivo : null;
        const taxaReparacao = taxaReparacaoExcel;
        const escovasPercent = totalServicos > 0 ? totalEscovas / totalServicos : null;
        
        // Usar desvio objetivo diário do Excel (v6.11.13) em vez de recalcular
        const desvioObjetivoDiario = desvioPercentualDiaExcel !== null
          ? desvioPercentualDiaExcel
          : null;
        
        // Buscar evolução mensal (6 meses)
        const evolucao = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(anoAtual, mesAtual - 1 - i, 1);
          const m = d.getMonth() + 1;
          const a = d.getFullYear();
          const res = await db.getResultadosMensaisPorLoja(lojaIdParaConsulta, m, a);
          evolucao.push({
            mes: m,
            ano: a,
            label: d.toLocaleDateString('pt-PT', { month: 'short' }),
            servicos: res ? Number(res.totalServicos) || 0 : 0,
            objetivo: res ? Number(res.objetivoMensal) || 0 : 0,
            reparacoes: res ? Number(res.qtdReparacoes) || 0 : 0,
          });
        }
        
        // Buscar alertas (simplificado - sem função específica)
        const alertas: Array<{ tipo: string; mensagem: string }> = [];
        
        // Adicionar alertas baseados nos dados
        if (desvioPercentual !== null && desvioPercentual < -0.15) {
          alertas.push({ tipo: 'warning', mensagem: `Desvio de ${(desvioPercentual * 100).toFixed(1)}% abaixo do objetivo` });
        }
        if (taxaReparacao !== null && taxaReparacao < 0.22) {
          alertas.push({ tipo: 'warning', mensagem: `Taxa de reparação (${(taxaReparacao * 100).toFixed(1)}%) abaixo do objetivo de 22%` });
        }
        if (escovasPercent !== null && escovasPercent < 0.10) {
          alertas.push({ tipo: 'info', mensagem: `Escovas (${(escovasPercent * 100).toFixed(1)}%) abaixo do objetivo de 10%` });
        }
        
        // Gerar análise IA se solicitado
        let analiseIA = null;
        if (input.incluirAnaliseIA) {
          try {
            const { invokeLLM } = await import('./_core/llm');
            const prompt = `Analisa os resultados da loja ${lojaNome}:
- Serviços: ${totalServicos} (Objetivo: ${totalObjetivo})
- Desvio: ${desvioPercentual ? (desvioPercentual * 100).toFixed(1) : 0}%
- Taxa Reparação: ${taxaReparacao ? (taxaReparacao * 100).toFixed(1) : 0}%
- Escovas: ${totalEscovas} (${escovasPercent ? (escovasPercent * 100).toFixed(1) : 0}%)

Fornece uma análise breve com:
1. Foco Urgente (1 frase)
2. Pontos Positivos (1-2 pontos)
3. Resumo (2 frases)`;
            
            const response = await invokeLLM({
              messages: [
                { role: 'system', content: 'És um analista de performance de lojas ExpressGlass. Responde em português de forma concisa.' },
                { role: 'user', content: prompt }
              ]
            });
            analiseIA = response.choices[0]?.message?.content || null;
          } catch (e) {
            console.error('Erro ao gerar análise IA:', e);
          }
        }
        
        // Comparativo com mês anterior
        const mesAnt = mesAtual === 1 ? 12 : mesAtual - 1;
        const anoAnt = mesAtual === 1 ? anoAtual - 1 : anoAtual;
        const resAnt = await db.getResultadosMensaisPorLoja(lojaIdParaConsulta, mesAnt, anoAnt);
        const servicosAnt = resAnt ? Number(resAnt.totalServicos) || 0 : 0;
        const objetivoAnt = resAnt ? Number(resAnt.objetivoMensal) || 0 : 0;
        const reparacoesAnt = resAnt ? Number(resAnt.qtdReparacoes) || 0 : 0;
        
        // Calcular ritmo para atingir objetivo
        // Calcular dias úteis restantes no mês
        const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const diaAtualMes = now.getDate();
        let diasUteisRestantes = 0;
        for (let d = diaAtualMes + 1; d <= ultimoDiaMes; d++) {
          const data = new Date(now.getFullYear(), now.getMonth(), d);
          const diaSemana = data.getDay();
          if (diaSemana !== 0 && diaSemana !== 6) diasUteisRestantes++;
        }
        const servicosFaltam = Math.max(0, totalObjetivo - totalServicos);
        const servicosPorDia = diasUteisRestantes > 0 ? servicosFaltam / diasUteisRestantes : 0;
        const reparacoesNecessarias = Math.ceil(totalServicos * 0.22);
        const gapReparacoes = Math.max(0, reparacoesNecessarias - totalReparacoes);
        
        // Preparar dados no formato DashboardData
        const dashboardData = {
          kpis: {
            servicosRealizados: totalServicos,
            objetivoMensal: totalObjetivo,
            taxaReparacao: taxaReparacao ? taxaReparacao * 100 : 0,
            desvioObjetivoDiario: desvioPercentual ? desvioPercentual * 100 : 0,
            vendasComplementares: totalEscovas + totalPolimento + totalTratamento + totalLavagens + totalOutros,
          },
          resultados: {
            totalServicos,
            objetivoMensal: totalObjetivo,
            desvioPercentualMes: desvioPercentual,
            taxaReparacao,
            totalReparacoes,
            gapReparacoes22: gapReparacoes,
          },
          complementares: {
            escovasQtd: totalEscovas,
            escovasPercent,
            polimentoQtd: totalPolimento,
            tratamentoQtd: totalTratamento,
            lavagensTotal: totalLavagens,
            outrosQtd: totalOutros,
          },
          alertas: alertas.map((a: { tipo: string; mensagem: string }) => ({ 
            tipo: a.tipo as 'warning' | 'danger' | 'success', 
            mensagem: a.mensagem 
          })),
          periodoLabel,
          comparativoMesAnterior: {
            servicosAnterior: servicosAnt,
            variacaoServicos: servicosAnt > 0 ? ((totalServicos - servicosAnt) / servicosAnt) * 100 : null,
            reparacoesAnterior: reparacoesAnt,
            variacaoReparacoes: reparacoesAnt > 0 ? ((totalReparacoes - reparacoesAnt) / reparacoesAnt) * 100 : null,
            escovasAnterior: 0,
            variacaoEscovas: null,
          },
          ritmo: {
            servicosFaltam,
            diasUteisRestantes,
            servicosPorDia: Math.ceil(servicosPorDia),
            gapReparacoes,
          },
          evolucao: evolucao.map((e: { mes: number; ano: number; servicos: number; objetivo: number; reparacoes: number }) => ({
            mes: e.mes,
            ano: e.ano,
            totalServicos: e.servicos,
            objetivoMensal: e.objetivo,
            qtdReparacoes: e.reparacoes,
          })),
        };
        
        // Preparar análise IA no formato correto (interface: focoUrgente: string[], pontosPositivos: string[], resumo: string)
        let analiseIAFormatada = null;
        if (analiseIA && typeof analiseIA === 'string') {
          // Parsing mais robusto da análise IA
          const linhas = analiseIA.split('\n').filter((l: string) => l.trim());
          const focoUrgente: string[] = [];
          const pontosPositivos: string[] = [];
          let resumo = '';
          
          let secaoAtual = '';
          for (const linha of linhas) {
            const linhaLower = linha.toLowerCase();
            if (linhaLower.includes('foco urgente') || linhaLower.includes('1.')) {
              secaoAtual = 'foco';
              // Se a linha contém mais que o título, extrair o conteúdo
              const match = linha.match(/(?:foco urgente|1\.)\s*[:\-]?\s*(.+)/i);
              if (match && match[1]) focoUrgente.push(match[1].trim());
            } else if (linhaLower.includes('pontos positivos') || linhaLower.includes('2.')) {
              secaoAtual = 'positivos';
              const match = linha.match(/(?:pontos positivos|2\.)\s*[:\-]?\s*(.+)/i);
              if (match && match[1]) pontosPositivos.push(match[1].trim());
            } else if (linhaLower.includes('resumo') || linhaLower.includes('3.')) {
              secaoAtual = 'resumo';
              const match = linha.match(/(?:resumo|3\.)\s*[:\-]?\s*(.+)/i);
              if (match && match[1]) resumo = match[1].trim();
            } else if (linha.trim().startsWith('-') || linha.trim().startsWith('•')) {
              // Linha de lista
              const conteudo = linha.replace(/^[\-•]\s*/, '').trim();
              if (secaoAtual === 'foco') focoUrgente.push(conteudo);
              else if (secaoAtual === 'positivos') pontosPositivos.push(conteudo);
              else if (secaoAtual === 'resumo') resumo += ' ' + conteudo;
            } else if (secaoAtual === 'resumo') {
              resumo += ' ' + linha.trim();
            } else if (secaoAtual === 'foco' && focoUrgente.length === 0) {
              focoUrgente.push(linha.trim());
            } else if (secaoAtual === 'positivos') {
              pontosPositivos.push(linha.trim());
            }
          }
          
          // Se não conseguiu parsear, usar a análise completa como resumo
          if (focoUrgente.length === 0 && pontosPositivos.length === 0 && !resumo) {
            resumo = analiseIA;
          }
          
          analiseIAFormatada = {
            focoUrgente: focoUrgente.filter(f => f),
            pontosPositivos: pontosPositivos.filter(p => p),
            resumo: resumo.trim(),
          };
          
          console.log('[PDF] Análise IA formatada:', JSON.stringify(analiseIAFormatada));
        }
        
        // Gerar PDF
        const pdfBuffer = await gerarPDFResultados(
          lojaNome,
          dashboardData,
          analiseIAFormatada
        );
        
        const dataAtual = new Date().toISOString().split('T')[0];
        const filename = `resultados_${lojaNome.replace(/\s+/g, '_').toLowerCase()}_${dataAtual}.pdf`;
        
        return {
          pdf: pdfBuffer.toString('base64'),
          filename,
        };
      }),
    
    // Chatbot IA para o Portal da Loja
    chatbot: publicProcedure
      .input(z.object({
        token: z.string(),
        pergunta: z.string().min(1),
        historico: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const { processarPerguntaPortalLoja } = await import('./chatbotServicePortais');
        const resultado = await processarPerguntaPortalLoja(
          input.pergunta,
          input.historico || [],
          auth.loja.id,
          auth.loja.nome
        );
        return resultado;
      }),
  }),
  
  // ==================== RELATÓRIO BOARD (ADMINISTRAÇÃO) ====================
  relatorioBoard: router({
    // Gerar dados completos do relatório board
    gerarDados: adminProcedure
      .input(z.object({
        meses: z.array(z.object({
          mes: z.number().min(1).max(12),
          ano: z.number().min(2020).max(2100)
        })).optional(),
      }).optional())
      .query(async ({ input }) => {
        const { gerarDadosRelatorioBoardPorMeses } = await import('./relatorioBoardService');
        return await gerarDadosRelatorioBoardPorMeses(input?.meses);
      }),
    
    // Gerar análise IA do relatório board
    gerarAnaliseIA: adminProcedure
      .input(z.object({
        meses: z.array(z.object({
          mes: z.number().min(1).max(12),
          ano: z.number().min(2020).max(2100)
        })).optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const { gerarDadosRelatorioBoardPorMeses, gerarAnaliseIARelatorioBoard } = await import('./relatorioBoardService');
        const dados = await gerarDadosRelatorioBoardPorMeses(input?.meses);
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
        
        // ===== ENVIAR EMAILS AUTOMATICAMENTE =====
        const gestorNome = ctx.user.name || 'Gestor';
        const temaNome = input.tema;
        
        // Obter email do admin real (excluir admins de teste)
        const admins = await db.getAllUsers();
        const adminReal = admins.find(u => 
          u.role === 'admin' && 
          u.email && 
          !u.email.includes('test') &&
          u.name?.toLowerCase() !== 'marco amorim'
        );
        
        if (adminReal && adminReal.email) {
          // Parsear fotos
          const fotos = input.fotos || [];
          
          // Preparar anexos de fotos (fazer download do S3 e converter para base64)
          const fotoAttachments = await Promise.all(
            fotos.map(async (fotoUrl, index) => {
              try {
                const response = await fetch(fotoUrl);
                const buffer = await response.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
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
          
          const validAttachments = fotoAttachments.filter(a => a !== null) as Array<{filename: string; content: string; contentType: string}>;
          
          // Gerar HTML do email
          const htmlContent = gerarHTMLOcorrenciaEstrutural({
            gestorNome,
            temaNome,
            descricao: input.descricao,
            abrangencia: input.abrangencia,
            zonaAfetada: input.zonaAfetada || null,
            impacto: input.impacto,
            sugestaoAcao: input.sugestaoAcao || null,
            fotos: [],
            criadoEm: new Date(),
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
          
          const assunto = `Ocorrência: ${temaNome} - Reportado por ${gestorNome}`;
          
          // Enviar para o admin
          try {
            await sendEmail({
              to: adminReal.email,
              subject: assunto,
              html: htmlComNota,
              attachments: validAttachments,
            });
            console.log(`Email de ocorrência enviado para admin: ${adminReal.email}`);
          } catch (e) {
            console.error('Erro ao enviar email para admin:', e);
          }
          
          // Enviar cópia para o gestor que reportou
          const gestorEmail = ctx.user.email;
          if (gestorEmail) {
            const htmlCopia = htmlComNota.replace(
              '</body>',
              `<div style="text-align: center; padding: 15px; background: #eff6ff; margin: 20px 30px; border-radius: 8px; border: 1px solid #3b82f6;">
                <p style="margin: 0; color: #1d4ed8; font-size: 13px;">📋 Esta é uma cópia da ocorrência que reportou. O email original foi enviado para ${adminReal.name || 'o administrador'}.</p>
              </div>
              </body>`
            );
            
            try {
              await sendEmail({
                to: gestorEmail,
                subject: `[Cópia] ${assunto}`,
                html: htmlCopia,
                attachments: validAttachments,
              });
              console.log(`Cópia de ocorrência enviada para gestor: ${gestorEmail}`);
            } catch (e) {
              console.error('Erro ao enviar cópia para gestor:', e);
            }
          }
        } else {
          console.warn('Admin real não encontrado para envio de email de ocorrência');
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
  
  // ==================== ANÁLISE IA DASHBOARD LOJA ====================
  analiseIALoja: router({
    // Gerar análise IA dos resultados da loja
    gerar: publicProcedure
      .input(z.object({
        token: z.string(),
        meses: z.array(z.object({
          mes: z.number().min(1).max(12),
          ano: z.number().min(2020).max(2100)
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import('./_core/llm');
        
        // Validar token
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Determinar período
        const hoje = new Date();
        const mesesConsulta = input.meses && input.meses.length > 0 
          ? input.meses 
          : [{ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }];
        
        // Buscar dados da loja
        let totalServicos = 0;
        let totalObjetivo = 0;
        let totalReparacoes = 0;
        let totalParaBrisas = 0;
        let taxaReparacaoExcel: number | null = null;
        let totalEscovas = 0;
        let totalPolimento = 0;
        let totalTratamento = 0;
        let totalLavagens = 0;
        
        for (const p of mesesConsulta) {
          const resultados = await db.getResultadosMensaisPorLoja(auth.loja.id, p.mes, p.ano);
          if (resultados) {
            totalServicos += Number(resultados.totalServicos) || 0;
            totalObjetivo += Number(resultados.objetivoMensal) || 0;
            totalReparacoes += Number(resultados.qtdReparacoes) || 0;
            totalParaBrisas += Number(resultados.qtdParaBrisas) || 0;
            if (resultados.taxaReparacao !== null && resultados.taxaReparacao !== undefined) {
              taxaReparacaoExcel = parseFloat(String(resultados.taxaReparacao));
            }
          }
          
          const complementares = await db.getVendasComplementares(p.mes, p.ano, auth.loja.id);
          if (complementares && complementares.length > 0) {
            const c = complementares[0];
            totalEscovas += Number(c.escovasQtd) || 0;
            totalPolimento += Number(c.polimentoQtd) || 0;
            totalTratamento += Number(c.tratamentoQtd) || 0;
            totalLavagens += Number(c.lavagensTotal) || 0;
          }
        }
        
        // Calcular métricas
        const desvioPercentual = totalObjetivo > 0 ? ((totalServicos - totalObjetivo) / totalObjetivo) * 100 : 0;
        const taxaReparacao = taxaReparacaoExcel !== null ? taxaReparacaoExcel * 100 : 0;
        const escovasPercent = totalServicos > 0 ? (totalEscovas / totalServicos) * 100 : 0;
        const servicosFaltam = Math.max(0, totalObjetivo - totalServicos);
        const reparacoesFaltam = Math.max(0, Math.ceil(totalServicos * 0.22) - totalReparacoes);
        
        // Buscar dados do mês anterior para comparativo
        const mesAnterior = mesesConsulta[0].mes === 1 ? 12 : mesesConsulta[0].mes - 1;
        const anoAnterior = mesesConsulta[0].mes === 1 ? mesesConsulta[0].ano - 1 : mesesConsulta[0].ano;
        const resultadosAnt = await db.getResultadosMensaisPorLoja(auth.loja.id, mesAnterior, anoAnterior);
        const servicosAnteriores = resultadosAnt ? Number(resultadosAnt.totalServicos) || 0 : 0;
        const variacaoServicos = servicosAnteriores > 0 ? ((totalServicos - servicosAnteriores) / servicosAnteriores) * 100 : 0;
        
        // Calcular dias úteis restantes
        const mesAtual = mesesConsulta[0];
        const ultimoDia = new Date(mesAtual.ano, mesAtual.mes, 0).getDate();
        const diaAtual = hoje.getDate();
        let diasUteisRestantes = 0;
        for (let d = diaAtual + 1; d <= ultimoDia; d++) {
          const data = new Date(mesAtual.ano, mesAtual.mes - 1, d);
          const diaSemana = data.getDay();
          if (diaSemana !== 0 && diaSemana !== 6) diasUteisRestantes++;
        }
        
        // Calcular ritmo necessário
        const servicosPorDia = diasUteisRestantes > 0 ? Math.ceil(servicosFaltam / diasUteisRestantes) : 0;
        
        // Gerar análise com IA
        const prompt = `
Analisa os resultados da loja ${auth.loja.nome} e gera uma análise simples e motivacional.

DADOS DO MÊS:
- Serviços realizados: ${totalServicos} / Objetivo: ${totalObjetivo} (Desvio: ${desvioPercentual.toFixed(1)}%)
- Taxa de reparação: ${taxaReparacao.toFixed(1)}% (objetivo: 22%)
- Escovas: ${escovasPercent.toFixed(1)}% (objetivo: 10%)
- Dias úteis restantes: ${diasUteisRestantes}
- Ritmo necessário: ${servicosPorDia} serviços/dia

Gera uma resposta em JSON com esta estrutura exata:
{
  "focoUrgente": ["lista de 1-2 pontos de foco urgente, diretos e práticos"],
  "pontosPositivos": ["lista de 1-2 pontos positivos da loja"],
  "resumo": "mensagem de síntese e motivação (2-3 frases, tom positivo e encorajador, dar força para os dias que faltam)"
}

IMPORTANTE:
- Sê direto e prático no foco urgente
- O resumo deve ser genuino, positivo e dar força
- Se o objetivo já foi atingido, celebra e incentiva a superar
- Usa linguagem portuguesa de Portugal (não brasileiro)
- Responde APENAS com o JSON, sem texto adicional`;
        
        try {
          const response = await invokeLLM({
            messages: [
              { role: 'system', content: 'És um analista de performance de lojas ExpressGlass. Geras análises estratégicas e motivacionais em português de Portugal. Respondes sempre em JSON válido.' },
              { role: 'user', content: prompt }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'analise_loja',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    focoUrgente: { type: 'array', items: { type: 'string' } },
                    pontosPositivos: { type: 'array', items: { type: 'string' } },
                    resumo: { type: 'string' }
                  },
                  required: ['focoUrgente', 'pontosPositivos', 'resumo'],
                  additionalProperties: false
                }
              }
            }
          });
          
          const messageContent = response.choices?.[0]?.message?.content;
          const content = typeof messageContent === 'string' ? messageContent : '{}';
          const analise = JSON.parse(content);
          
          return {
            ...analise,
            metricas: {
              totalServicos,
              totalObjetivo,
              desvioPercentual,
              taxaReparacao,
              escovasPercent,
              servicosFaltam,
              reparacoesFaltam,
              diasUteisRestantes,
              servicosPorDia,
              variacaoServicos
            }
          };
        } catch (error) {
          console.error('Erro ao gerar análise IA:', error);
          // Retornar análise básica em caso de erro
          return {
            focoUrgente: servicosFaltam > 0 
              ? [`Faltam ${servicosFaltam} serviços para atingir o objetivo`]
              : ['Manter o ritmo atual para superar o objetivo'],
            pontosPositivos: desvioPercentual >= 0 
              ? ['Objetivo mensal atingido!']
              : taxaReparacao >= 22 ? ['Taxa de reparação acima do objetivo!'] : [],
            resumo: desvioPercentual >= 0
              ? 'Parabéns pelo excelente trabalho! Continuem assim e superem ainda mais os objetivos!'
              : `Faltam apenas ${servicosFaltam} serviços! Com foco e determinação, vão conseguir! Força equipa!`,
            metricas: {
              totalServicos,
              totalObjetivo,
              desvioPercentual,
              taxaReparacao,
              escovasPercent,
              servicosFaltam,
              reparacoesFaltam,
              diasUteisRestantes,
              servicosPorDia,
              variacaoServicos
            }
          };
        }
      }),
  }),
  
  // ==================== CHATBOT IA ====================
  chatbot: router({
    // Processar pergunta do utilizador
    pergunta: protectedProcedure
      .input(z.object({
        pergunta: z.string().min(1),
        historico: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const resultado = await processarPergunta(
          input.pergunta,
          input.historico || [],
          ctx.user.id,
          ctx.user.role
        );
        return resultado;
      }),
    
    // Sugestões de perguntas para o chatbot
    sugestoes: protectedProcedure
      .input(z.object({ language: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await getSugestoesPergunta(input?.language || 'pt');
      }),
  }),
  
  // ==================== VOLANTES ====================
  volantes: router({
    // Listar volantes do gestor
    listar: gestorProcedure.query(async ({ ctx }) => {
      if (!ctx.gestor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
      }
      const volantes = await db.getVolantesByGestorId(ctx.gestor.id);
      
      // Para cada volante, buscar as lojas atribuídas (com preferencial) e o token
      const volantesComLojas = await Promise.all(
        volantes.map(async (volante) => {
          const lojas = await db.getLojasComPreferencialByVolanteId(volante.id);
          const token = await db.getTokenVolante(volante.id);
          return { ...volante, lojas, token };
        })
      );
      
      return volantesComLojas;
    }),
    
    // Criar volante
    criar: gestorProcedure
      .input(z.object({
        nome: z.string().min(1),
        email: z.string().email().optional(),
        telefone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
        }
        
        const volante = await db.createVolante({
          nome: input.nome,
          email: input.email,
          telefone: input.telefone,
          gestorId: ctx.gestor.id,
        });
        
        if (!volante) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar volante' });
        }
        
        return volante;
      }),
    
    // Atualizar volante
    atualizar: gestorProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        email: z.string().email().optional().nullable(),
        telefone: z.string().optional().nullable(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar se o volante pertence ao gestor
        const volante = await db.getVolanteById(input.id);
        if (!volante || (ctx.gestor && volante.gestorId !== ctx.gestor.id)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Volante não encontrado' });
        }
        
        const updated = await db.updateVolante(input.id, {
          nome: input.nome,
          email: input.email ?? undefined,
          telefone: input.telefone ?? undefined,
          ativo: input.ativo,
        });
        
        return updated;
      }),
    
    // Eliminar volante
    eliminar: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const volante = await db.getVolanteById(input.id);
        if (!volante || (ctx.gestor && volante.gestorId !== ctx.gestor.id)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Volante não encontrado' });
        }
        
        await db.deleteVolante(input.id);
        return { success: true };
      }),
    
    // Atribuir lojas a um volante (lojas que ele pode apoiar)
    atribuirLojas: gestorProcedure
      .input(z.object({
        volanteId: z.number(),
        lojaIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const volante = await db.getVolanteById(input.volanteId);
        if (!volante || (ctx.gestor && volante.gestorId !== ctx.gestor.id)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Volante não encontrado' });
        }
        
        await db.assignLojasToVolante(input.volanteId, input.lojaIds);
        
        // Também atribuir o volante a cada loja
        for (const lojaId of input.lojaIds) {
          await db.assignVolanteToLoja(lojaId, input.volanteId);
        }
        
        return { success: true };
      }),
    
    // Actualizar preferencial de uma loja para um volante
    actualizarPreferencial: gestorProcedure
      .input(z.object({
        volanteId: z.number(),
        lojaId: z.number(),
        preferencial: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const volante = await db.getVolanteById(input.volanteId);
        if (!volante || (ctx.gestor && volante.gestorId !== ctx.gestor.id)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Volante não encontrado' });
        }
        
        await db.updateLojaPreferencial(input.volanteId, input.lojaId, input.preferencial);
        return { success: true };
      }),
    
    // Log de atribuições inteligentes
    logAtribuicoes: gestorProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).optional().default(50),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
        }
        
        return await db.getLogAtribuicoes(ctx.gestor.id, input?.limit || 50);
      }),
    
    // Obter lojas disponíveis para atribuir (lojas do gestor)
    lojasDisponiveis: gestorProcedure.query(async ({ ctx }) => {
      if (!ctx.gestor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
      }
      
      const lojas = await db.getLojasByGestorId(ctx.gestor.id);
      return lojas;
    }),
    
    // Criar ou obter token de um volante
    criarToken: gestorProcedure
      .input(z.object({ volanteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const volante = await db.getVolanteById(input.volanteId);
        if (!volante || (ctx.gestor && volante.gestorId !== ctx.gestor.id)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Volante não encontrado' });
        }
        
        const token = await db.getOrCreateTokenVolante(input.volanteId);
        return token;
      }),
    
    // Desativar token de um volante
    desativarToken: gestorProcedure
      .input(z.object({ volanteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const volante = await db.getVolanteById(input.volanteId);
        if (!volante || (ctx.gestor && volante.gestorId !== ctx.gestor.id)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Volante não encontrado' });
        }
        
        await db.deactivateTokenVolante(input.volanteId);
        return { success: true };
      }),
    
    // Enviar token por email
    enviarTokenEmail: gestorProcedure
      .input(z.object({ volanteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const volante = await db.getVolanteById(input.volanteId);
        if (!volante || (ctx.gestor && volante.gestorId !== ctx.gestor.id)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Volante não encontrado' });
        }
        
        if (!volante.email) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Volante não tem email configurado' });
        }
        
        const token = await db.getOrCreateTokenVolante(input.volanteId);
        if (!token) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar token' });
        }
        
        // Construir URL do portal
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://poweringeg-3c9mozlh.manus.space'
          : 'http://localhost:3000';
        const portalUrl = `${baseUrl}/portal-volante?token=${token.token}`;
        
        // Enviar email
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">PoweringEG Platform</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Portal do Volante</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #1f2937;">Olá ${volante.nome}!</h2>
              <p style="color: #4b5563;">Foi-lhe atribuído acesso ao Portal do Volante da PoweringEG Platform.</p>
              <p style="color: #4b5563;">Através deste portal poderá:</p>
              <ul style="color: #4b5563;">
                <li>Ver os resultados das lojas atribuídas</li>
                <li>Gerir a sua agenda de apoios</li>
                <li>Aprovar ou reprovar pedidos de apoio das lojas</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Aceder ao Portal</a>
              </div>
              <p style="color: #6b7280; font-size: 12px;">Se o botão não funcionar, copie e cole este link no seu browser:</p>
              <p style="color: #10b981; font-size: 12px; word-break: break-all;">${portalUrl}</p>
            </div>
            <div style="padding: 20px; text-align: center; background: #1f2937;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">PoweringEG Platform 2.0 - ExpressGlass</p>
            </div>
          </div>
        `;
        
        await sendEmail({
          to: volante.email,
          subject: 'Acesso ao Portal do Volante - PoweringEG',
          html,
        });
        
        return { success: true };
      }),
    
    // Obter volante atribuído a uma loja (para o Portal da Loja)
    getVolanteByLoja: publicProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        const volante = await db.getVolanteByLojaId(input.lojaId);
        return volante;
      }),
  }),
  
  // ==================== PEDIDOS DE APOIO (VOLANTES) ====================
  pedidosApoio: router({
    // Criar pedido de apoio (pela loja) - com atribuição inteligente de volante
    criar: publicProcedure
      .input(z.object({
        token: z.string(),
        data: z.string(), // ISO date string
        periodo: z.enum(['manha', 'tarde', 'dia_todo']),
        tipoApoio: z.enum(['cobertura_ferias', 'substituicao_vidros', 'outro']),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Validar token da loja
        const tokenData = await db.validarTokenLoja(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const dataApoio = new Date(input.data);
        
        // ATRIBUIÇÃO INTELIGENTE: Usar algoritmo de scoring para escolher o melhor volante
        const resultado = await db.atribuirVolanteInteligente(
          tokenData.loja.id,
          dataApoio,
          input.periodo,
          input.tipoApoio
        );
        
        if (!resultado) {
          // Nenhum volante disponível - verificar se existem volantes atribuídos
          const volantesLoja = await db.getVolantesByLojaId(tokenData.loja.id);
          if (volantesLoja.length === 0) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Nenhum volante atribuído a esta loja' });
          }
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhum volante disponível para este dia/período. Todos os volantes estão ocupados.' });
        }
        
        const volante = resultado.volante;
        console.log(`[Atribuição Inteligente] Loja ${tokenData.loja.nome} -> Volante ${volante.nome} (score: ${resultado.score})`);
        
        // Criar pedido com informação de atribuição inteligente
        const pedido = await db.createPedidoApoio({
          lojaId: tokenData.loja.id,
          volanteId: volante.id,
          data: dataApoio,
          periodo: input.periodo,
          tipoApoio: input.tipoApoio,
          observacoes: input.observacoes,
          atribuidoPorIA: true,
          scoreAtribuicao: resultado.score.toString(),
          scoreDetalhes: JSON.stringify(resultado.detalhes),
        });
        
        // Enviar email ao volante sobre novo pedido
        if (volante.email) {
          const tipoApoioTexto = input.tipoApoio === 'cobertura_ferias' ? 'Cobertura de Férias' : 
                                input.tipoApoio === 'substituicao_vidros' ? 'Substituição de Vidros' : 'Outro';
          const periodoTexto = input.periodo === 'manha' ? 'Manhã (9h-13h)' : input.periodo === 'tarde' ? 'Tarde (14h-18h)' : 'Dia Todo (9h-18h)';
          const dataFormatada = dataApoio.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          
          try {
            await sendEmail({
              to: volante.email,
              subject: `Novo Pedido de Apoio - ${tokenData.loja.nome}`,
              html: gerarHTMLNovoPedidoApoio({
                volanteNome: volante.nome,
                lojaNome: tokenData.loja.nome,
                data: dataFormatada,
                periodo: periodoTexto,
                tipoApoio: tipoApoioTexto,
                observacoes: input.observacoes,
              }),
            });
            console.log(`[Email] Notificação de novo pedido enviada para volante: ${volante.email}`);
          } catch (e) {
            console.error('[Email] Erro ao enviar notificação ao volante:', e);
          }
        }
        
        // Enviar notificação Telegram ao volante (se configurado)
        if (volante.telegramChatId) {
          try {
            // Obter token do volante para o link do portal
            const tokenVolante = await db.getOrCreateTokenVolante(volante.id);
            const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg-3c9mozlh.manus.space';
            const portalUrl = tokenVolante ? `${baseUrl}/portal-volante?token=${tokenVolante.token}` : baseUrl;
            
            await notificarNovoPedidoApoio(volante.telegramChatId, {
              lojaNome: tokenData.loja.nome,
              data: dataApoio,
              periodo: input.periodo,
              tipoApoio: input.tipoApoio,
              observacoes: input.observacoes,
              portalUrl: portalUrl,
            });
            console.log(`[Telegram] Notificação de novo pedido enviada para volante: ${volante.telegramChatId}`);
          } catch (e) {
            console.error('[Telegram] Erro ao enviar notificação ao volante:', e);
          }
        }
        
        return pedido;
      }),
    
    // Listar pedidos de apoio (para o volante)
    listarPorVolante: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        // Validar token do volante
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const pedidos = await db.getPedidosApoioByVolanteId(tokenData.volante.id);
        return pedidos;
      }),
    
    // Listar pedidos de apoio (para a loja)
    listarPorLoja: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const tokenData = await db.validarTokenLoja(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const pedidos = await db.getPedidosApoioByLojaId(tokenData.loja.id);
        return pedidos;
      }),
    
    // Obter estado dos dias do mês (para o calendário)
    estadoMes: publicProcedure
      .input(z.object({
        token: z.string(),
        ano: z.number(),
        mes: z.number(),
      }))
      .query(async ({ input }) => {
        // Tentar validar como token de volante primeiro
        let volanteId: number | null = null;
        let lojaId: number | null = null;
        
        const tokenVolante = await db.validateTokenVolante(input.token);
        if (tokenVolante) {
          volanteId = tokenVolante.volante.id;
        } else {
          // Tentar como token de loja
          const tokenLoja = await db.validarTokenLoja(input.token);
          if (tokenLoja) {
            lojaId = tokenLoja.loja.id;
            const volante = await db.getVolanteByLojaId(tokenLoja.loja.id);
            if (volante) {
              volanteId = volante.id;
            }
          }
        }
        
        if (!volanteId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inv\u00e1lido ou nenhum volante atribu\u00eddo' });
        }
        
        const estadoDias = await db.getEstadoCompletoDoMes(volanteId, input.ano, input.mes);
        
        // Mostrar ocupação GLOBAL do volante para que as lojas saibam quando está disponível
        // Não filtrar por lojaId - todas as lojas precisam ver todos os agendamentos
        const resultado: Record<string, { estado: string; pedidos: any[]; bloqueios?: any[]; agendamentos?: any[] }> = {};
        estadoDias.forEach((value, key) => {
          resultado[key] = value;
        });
        
        return resultado;
      }),
    
    // Aprovar pedido de apoio (pelo volante)
    aprovar: publicProcedure
      .input(z.object({
        token: z.string(),
        pedidoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Obter dados do pedido para gerar links
        const pedidoExistente = await db.getPedidoApoioById(input.pedidoId);
        if (!pedidoExistente) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pedido não encontrado' });
        }
        
        // Gerar links para calendário
        const dataInicio = new Date(pedidoExistente.data);
        const horaInicio = pedidoExistente.periodo === 'manha' ? 9 : 14;
        const horaFim = pedidoExistente.periodo === 'manha' ? 13 : 18;
        
        dataInicio.setHours(horaInicio, 0, 0, 0);
        const dataFim = new Date(dataInicio);
        dataFim.setHours(horaFim, 0, 0, 0);

        const loja = await db.getLojaById(pedidoExistente.lojaId);
        const tipoApoioTexto = pedidoExistente.tipoApoio === 'cobertura_ferias' ? 'Cobertura Férias' : 
                              pedidoExistente.tipoApoio === 'substituicao_vidros' ? 'Substituição Vidros' : 'Outro';
        
        const titulo = encodeURIComponent(`Apoio: ${loja?.nome || 'Loja'} - ${tipoApoioTexto}`);
        const descricao = encodeURIComponent(pedidoExistente.observacoes || '');
        const local = encodeURIComponent(loja?.nome || '');

        // Formato para Google Calendar
        const formatoGoogle = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${formatoGoogle(dataInicio)}/${formatoGoogle(dataFim)}&details=${descricao}&location=${local}`;

        // Formato para Outlook
        const formatoOutlook = (date: Date) => date.toISOString();
        const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${titulo}&startdt=${formatoOutlook(dataInicio)}&enddt=${formatoOutlook(dataFim)}&body=${descricao}&location=${local}`;

        const links = {
          google: googleUrl,
          outlook: outlookUrl,
          ics: '', // ICS é gerado no cliente
        };
        
        const pedido = await db.aprovarPedidoApoio(input.pedidoId, links);
        
        // Enviar email à loja sobre aprovação
        if (loja?.email) {
          const tipoApoioTexto = pedidoExistente.tipoApoio === 'cobertura_ferias' ? 'Cobertura de Férias' : 
                                pedidoExistente.tipoApoio === 'substituicao_vidros' ? 'Substituição de Vidros' : 'Outro';
          const periodoTexto = pedidoExistente.periodo === 'manha' ? 'Manhã (9h-13h)' : 'Tarde (14h-18h)';
          const dataFormatada = new Date(pedidoExistente.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          
          try {
            await sendEmail({
              to: loja.email,
              subject: `Pedido de Apoio Aprovado - ${dataFormatada}`,
              html: gerarHTMLPedidoAprovado({
                lojaNome: loja.nome,
                volanteNome: tokenData.volante.nome,
                data: dataFormatada,
                periodo: periodoTexto,
                tipoApoio: tipoApoioTexto,
                observacoes: pedidoExistente.observacoes,
              }),
            });
            console.log(`[Email] Notificação de aprovação enviada para loja: ${loja.email}`);
          } catch (e) {
            console.error('[Email] Erro ao enviar notificação à loja:', e);
          }
        }
        
        return pedido;
      }),
    
    // Reprovar pedido de apoio (pelo volante)
    reprovar: publicProcedure
      .input(z.object({
        token: z.string(),
        pedidoId: z.number(),
        motivo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Obter dados do pedido antes de reprovar
        const pedidoExistente = await db.getPedidoApoioById(input.pedidoId);
        if (!pedidoExistente) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pedido não encontrado' });
        }
        
        const pedido = await db.reprovarPedidoApoio(input.pedidoId, input.motivo);
        
        const loja = await db.getLojaById(pedidoExistente.lojaId);
        
        // REDIRECCIONAMENTO AUTOMÁTICO: Tentar atribuir a outro volante
        let pedidoRedireccionado = null;
        const volantesLoja = await db.getVolantesByLojaId(pedidoExistente.lojaId);
        
        // Só redireccionar se há mais de 1 volante atribuído
        if (volantesLoja.length > 1) {
          // Filtrar o volante que reprovou
          const outrosVolantes = volantesLoja.filter(v => v.id !== tokenData.volante.id);
          
          // Verificar disponibilidade dos outros volantes
          for (const outroVolante of outrosVolantes) {
            const disponivel = await db.verificarDisponibilidadeCompleta(
              outroVolante.id, 
              new Date(pedidoExistente.data), 
              pedidoExistente.periodo as 'manha' | 'tarde' | 'dia_todo'
            );
            
            if (disponivel) {
              // Criar novo pedido redireccionado
              pedidoRedireccionado = await db.createPedidoApoio({
                lojaId: pedidoExistente.lojaId,
                volanteId: outroVolante.id,
                data: new Date(pedidoExistente.data),
                periodo: pedidoExistente.periodo as 'manha' | 'tarde' | 'dia_todo',
                tipoApoio: pedidoExistente.tipoApoio as 'cobertura_ferias' | 'substituicao_vidros' | 'outro',
                observacoes: pedidoExistente.observacoes || undefined,
                atribuidoPorIA: true,
                scoreAtribuicao: '1.00',
                scoreDetalhes: JSON.stringify({ disponibilidade: 1.0, carga: 1.0, proximidade: 1.0, historico: 1.0, redireccionado: true }),
                redireccionadoDe: pedidoExistente.id,
              });
              
              console.log(`[Redireccionamento] Pedido ${pedidoExistente.id} reprovado por ${tokenData.volante.nome} -> Redireccionado para ${outroVolante.nome} (pedido ${pedidoRedireccionado?.id})`);
              
              // Notificar o novo volante por email
              if (outroVolante.email) {
                const tipoApoioTexto = pedidoExistente.tipoApoio === 'cobertura_ferias' ? 'Cobertura de Férias' : 
                                      pedidoExistente.tipoApoio === 'substituicao_vidros' ? 'Substituição de Vidros' : 'Outro';
                const periodoTexto = pedidoExistente.periodo === 'manha' ? 'Manhã (9h-13h)' : pedidoExistente.periodo === 'tarde' ? 'Tarde (14h-18h)' : 'Dia Todo (9h-18h)';
                const dataFormatada = new Date(pedidoExistente.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                
                try {
                  await sendEmail({
                    to: outroVolante.email,
                    subject: `Pedido de Apoio Redireccionado - ${loja?.nome || 'Loja'}`,
                    html: gerarHTMLNovoPedidoApoio({
                      volanteNome: outroVolante.nome,
                      lojaNome: loja?.nome || 'Loja',
                      data: dataFormatada,
                      periodo: periodoTexto,
                      tipoApoio: tipoApoioTexto,
                      observacoes: `[REDIRECCIONADO - ${tokenData.volante.nome} não disponível] ${pedidoExistente.observacoes || ''}`,
                    }),
                  });
                } catch (e) {
                  console.error('[Email] Erro ao enviar notificação de redireccionamento:', e);
                }
              }
              
              // Notificar o novo volante por Telegram
              if (outroVolante.telegramChatId) {
                try {
                  const tokenVolante = await db.getOrCreateTokenVolante(outroVolante.id);
                  const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg-3c9mozlh.manus.space';
                  const portalUrl = tokenVolante ? `${baseUrl}/portal-volante?token=${tokenVolante.token}` : baseUrl;
                  
                  await notificarNovoPedidoApoio(outroVolante.telegramChatId, {
                    lojaNome: `${loja?.nome || 'Loja'} (Redireccionado)`,
                    data: new Date(pedidoExistente.data),
                    periodo: pedidoExistente.periodo as 'manha' | 'tarde' | 'dia_todo',
                    tipoApoio: pedidoExistente.tipoApoio as 'cobertura_ferias' | 'substituicao_vidros' | 'outro',
                    observacoes: `Redireccionado de ${tokenData.volante.nome}. ${pedidoExistente.observacoes || ''}`,
                    portalUrl: portalUrl,
                  });
                } catch (e) {
                  console.error('[Telegram] Erro ao enviar notificação de redireccionamento:', e);
                }
              }
              
              break; // Atribuído com sucesso, sair do loop
            }
          }
        }
        
        // Enviar email à loja sobre reprovação (com info de redireccionamento se aplicável)
        if (loja?.email) {
          const tipoApoioTexto = pedidoExistente.tipoApoio === 'cobertura_ferias' ? 'Cobertura de Férias' : 
                                pedidoExistente.tipoApoio === 'substituicao_vidros' ? 'Substituição de Vidros' : 'Outro';
          const periodoTexto = pedidoExistente.periodo === 'manha' ? 'Manhã (9h-13h)' : 'Tarde (14h-18h)';
          const dataFormatada = new Date(pedidoExistente.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          
          const motivoComRedireccao = pedidoRedireccionado 
            ? `${input.motivo || 'Sem motivo indicado'}\n\n\u2705 O pedido foi automaticamente redireccionado para outro volante.`
            : input.motivo;
          
          try {
            await sendEmail({
              to: loja.email,
              subject: pedidoRedireccionado 
                ? `Pedido de Apoio Redireccionado - ${dataFormatada}`
                : `Pedido de Apoio Reprovado - ${dataFormatada}`,
              html: gerarHTMLPedidoReprovado({
                lojaNome: loja.nome,
                volanteNome: tokenData.volante.nome,
                data: dataFormatada,
                periodo: periodoTexto,
                tipoApoio: tipoApoioTexto,
                observacoes: pedidoExistente.observacoes,
                motivo: motivoComRedireccao || 'Sem motivo indicado',
              }),
            });
            console.log(`[Email] Notificação de reprovação${pedidoRedireccionado ? ' + redireccionamento' : ''} enviada para loja: ${loja.email}`);
          } catch (e) {
            console.error('[Email] Erro ao enviar notificação à loja:', e);
          }
        }
        
        return { 
          ...pedido, 
          redireccionado: !!pedidoRedireccionado,
          novoPedidoId: pedidoRedireccionado?.id || null 
        };
      }),
    
    // Cancelar pedido de apoio (pela loja)
    cancelar: publicProcedure
      .input(z.object({
        token: z.string(),
        pedidoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validarTokenLoja(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        await db.cancelarPedidoApoio(input.pedidoId);
        return { success: true };
      }),
    
    // Criar agendamento pelo volante
    criarAgendamento: publicProcedure
      .input(z.object({
        token: z.string(),
        lojaId: z.number().nullable(), // null = compromisso pessoal
        data: z.string(), // ISO date string
        periodo: z.enum(['manha', 'tarde', 'dia_todo']),
        tipoApoio: z.enum(['cobertura_ferias', 'substituicao_vidros', 'outro']).nullable(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const volanteId = tokenData.volante.id;
        // Normalizar data para UTC (apenas data, sem horas)
        // input.data vem como "2026-02-13" do frontend
        const [year, month, day] = input.data.split('-').map(Number);
        const dataAgendamento = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        
        // Verificar se o dia/período está bloqueado
        const bloqueio = await db.verificarBloqueio(volanteId, dataAgendamento, input.periodo);
        if (bloqueio) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este dia/período está bloqueado' });
        }
        
        // Se for para uma loja, verificar se o volante tem acesso
        if (input.lojaId) {
          const lojas = await db.getLojasByVolanteId(volanteId);
          const temAcesso = lojas.some(l => l.id === input.lojaId);
          if (!temAcesso) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
          }
        }
        
        const agendamento = await db.criarAgendamentoVolante({
          volanteId,
          lojaId: input.lojaId,
          data: dataAgendamento,
          agendamento_volante_periodo: input.periodo,
          agendamento_volante_tipo: input.tipoApoio,
          titulo: input.titulo,
          descricao: input.descricao,
        });
        
        // Enviar notificação Telegram para o próprio volante (confirmação do agendamento)
        if (tokenData.volante.telegramChatId) {
          try {
            let lojaNome: string | undefined;
            if (input.lojaId) {
              const loja = await db.getLojaById(input.lojaId);
              lojaNome = loja?.nome;
            }
            // Construir URL do portal do volante
            const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg-3c9mozlh.manus.space';
            const portalUrl = `${baseUrl}/portal-volante?token=${input.token}`;
            
            await notificarAgendamentoCriado(tokenData.volante.telegramChatId, {
              volanteNome: tokenData.volante.nome,
              lojaNome: lojaNome,
              data: dataAgendamento,
              periodo: input.periodo,
              tipoApoio: input.tipoApoio || undefined,
              descricao: input.descricao,
              portalUrl: portalUrl,
            });
            console.log(`[Telegram] Notificação de agendamento enviada para volante: ${tokenData.volante.telegramChatId}`);
          } catch (e) {
            console.error('[Telegram] Erro ao enviar notificação de agendamento:', e);
          }
        }
        
        return agendamento;
      }),
    
    // Listar agendamentos do volante
    listarAgendamentos: publicProcedure
      .input(z.object({
        token: z.string(),
        ano: z.number().optional(),
        mes: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        if (input.ano && input.mes) {
          return await db.getAgendamentosVolanteByMonth(tokenData.volante.id, input.ano, input.mes);
        }
        
        return await db.getAgendamentosVolanteFuturos(tokenData.volante.id);
      }),
    
    // Editar agendamento do volante
    editarAgendamento: publicProcedure
      .input(z.object({
        token: z.string(),
        agendamentoId: z.number(),
        lojaId: z.number().nullable().optional(),
        data: z.string().optional(), // ISO date string
        periodo: z.enum(['manha', 'tarde', 'dia_todo']).optional(),
        tipoApoio: z.enum(['cobertura_ferias', 'substituicao_vidros', 'outro']).nullable().optional(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const volanteId = tokenData.volante.id;
        
        // Verificar se o agendamento pertence ao volante
        const agendamentoExistente = await db.getAgendamentoVolanteById(input.agendamentoId);
        if (!agendamentoExistente || agendamentoExistente.volanteId !== volanteId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
        }
        
        // Se for para uma loja, verificar se o volante tem acesso
        if (input.lojaId !== undefined && input.lojaId !== null) {
          const lojas = await db.getLojasByVolanteId(volanteId);
          const temAcesso = lojas.some(l => l.id === input.lojaId);
          if (!temAcesso) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
          }
        }
        
        const agendamentoAtualizado = await db.atualizarAgendamentoVolante(input.agendamentoId, volanteId, {
          lojaId: input.lojaId,
          data: input.data ? new Date(input.data) : undefined,
          agendamento_volante_periodo: input.periodo,
          agendamento_volante_tipo: input.tipoApoio,
          titulo: input.titulo,
          descricao: input.descricao,
        });
        
        return agendamentoAtualizado;
      }),
    
    // Eliminar agendamento do volante
    eliminarAgendamento: publicProcedure
      .input(z.object({
        token: z.string(),
        agendamentoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        await db.eliminarAgendamentoVolante(input.agendamentoId, tokenData.volante.id);
        return { success: true };
      }),
    
    // Criar bloqueio de dia
    criarBloqueio: publicProcedure
      .input(z.object({
        token: z.string(),
        data: z.string(), // ISO date string
        periodo: z.enum(['manha', 'tarde', 'dia_todo']),
        tipo: z.enum(['ferias', 'falta', 'formacao', 'pessoal', 'outro']),
        motivo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const bloqueio = await db.criarBloqueioVolante({
          volanteId: tokenData.volante.id,
          data: new Date(input.data),
          periodo: input.periodo,
          tipo: input.tipo,
          motivo: input.motivo,
        });
        
        return bloqueio;
      }),
    
    // Listar bloqueios do volante
    listarBloqueios: publicProcedure
      .input(z.object({
        token: z.string(),
        ano: z.number(),
        mes: z.number(),
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        return await db.getBloqueiosVolanteByMonth(tokenData.volante.id, input.ano, input.mes);
      }),
    
    // Eliminar bloqueio
    eliminarBloqueio: publicProcedure
      .input(z.object({
        token: z.string(),
        bloqueioId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        await db.eliminarBloqueioVolante(input.bloqueioId, tokenData.volante.id);
        return { success: true };
      }),
    
    // Obter estado completo do mês (pedidos + bloqueios + agendamentos)
    estadoCompletoMes: publicProcedure
      .input(z.object({
        token: z.string(),
        ano: z.number(),
        mes: z.number(),
      }))
      .query(async ({ input }) => {
        // Tentar validar como token de volante primeiro
        let volanteId: number | null = null;
        
        const tokenVolante = await db.validateTokenVolante(input.token);
        if (tokenVolante) {
          volanteId = tokenVolante.volante.id;
        } else {
          // Tentar como token de loja
          const tokenLoja = await db.validarTokenLoja(input.token);
          if (tokenLoja) {
            const volante = await db.getVolanteByLojaId(tokenLoja.loja.id);
            if (volante) {
              volanteId = volante.id;
            }
          }
        }
        
        if (!volanteId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido ou nenhum volante atribuído' });
        }
        
        const estadoDias = await db.getEstadoCompletoDoMes(volanteId, input.ano, input.mes);
        
        // Converter Map para objeto
        const resultado: Record<string, { estado: string; pedidos: any[]; bloqueios: any[]; agendamentos: any[] }> = {};
        estadoDias.forEach((value, key) => {
          resultado[key] = value;
        });
        
        return resultado;
      }),
  }),
  
  // ==================== PORTAL VOLANTE ====================
  portalVolante: router({
    // Validar token de volante
    validarToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          return { valid: false, volante: null, lojas: [] };
        }
        
        // Obter lojas atribuídas ao volante
        const lojas = await db.getLojasByVolanteId(tokenData.volante.id);
        
        return {
          valid: true,
          volante: tokenData.volante,
          lojas,
        };
      }),
    
    // Obter resultados das lojas do volante
    resultadosLojas: publicProcedure
      .input(z.object({
        token: z.string(),
        ano: z.number().optional(),
        mes: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const lojas = await db.getLojasByVolanteId(tokenData.volante.id);
        const now = new Date();
        const ano = input.ano || now.getFullYear();
        const mes = input.mes || now.getMonth() + 1;
        
        // Obter resultados de cada loja
        const resultados = await Promise.all(
          lojas.map(async (loja) => {
            const resultado = await db.getResultadosMensaisPorLoja(loja.id, mes, ano);
            return {
              loja,
              resultado,
            };
          })
        );
        
        return resultados;
      }),
    // Dashboard completo de uma loja específica (igual ao portal das lojas)
    dashboardLoja: publicProcedure
      .input(z.object({
        token: z.string(),
        lojaId: z.number(),
        meses: z.array(z.object({ mes: z.number().min(1).max(12), ano: z.number() })).optional(),
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Verificar se o volante tem acesso a esta loja
        const lojas = await db.getLojasByVolanteId(tokenData.volante.id);
        const temAcesso = lojas.some(l => l.id === input.lojaId);
        if (!temAcesso) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
        }
        
        const lojaIdParaConsulta = input.lojaId;
        const now = new Date();
        const anoAtual = now.getFullYear();
        const mesAtual = now.getMonth() + 1;
        
        // Usar meses fornecidos ou mês atual por defeito
        let mesesConsulta: { mes: number; ano: number }[] = [];
        let periodoLabel = '';
        
        if (input.meses && input.meses.length > 0) {
          mesesConsulta = input.meses;
          if (mesesConsulta.length === 1) {
            periodoLabel = new Date(mesesConsulta[0].ano, mesesConsulta[0].mes - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
          } else {
            const mesesOrdenados = [...mesesConsulta].sort((a, b) => {
              if (a.ano !== b.ano) return a.ano - b.ano;
              return a.mes - b.mes;
            });
            const primeiro = mesesOrdenados[0];
            const ultimo = mesesOrdenados[mesesOrdenados.length - 1];
            periodoLabel = `${new Date(primeiro.ano, primeiro.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} - ${new Date(ultimo.ano, ultimo.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} (${mesesConsulta.length} meses)`;
          }
        } else {
          mesesConsulta = [{ mes: mesAtual, ano: anoAtual }];
          periodoLabel = new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        }
        
        // Buscar dados agregados para todos os meses do período
        let totalServicos = 0;
        let totalObjetivo = 0;
        let totalReparacoes = 0;
        let totalParaBrisas = 0;
        let taxaReparacaoExcel: number | null = null; // Taxa do Excel (último mês com dados)
        let totalEscovas = 0;
        let totalPolimento = 0;
        let totalTratamento = 0;
        let totalLavagens = 0;
        let totalOutros = 0;
        let dataUltimaAtualizacao: Date | null = null;
        let resultadosAgregados: any = null;
        let complementaresAgregados: any = null;
        
        for (const p of mesesConsulta) {
          const resultadosArr = await db.getResultadosMensaisPorLoja(lojaIdParaConsulta, p.mes, p.ano);
          if (resultadosArr) {
            totalServicos += Number(resultadosArr.totalServicos) || 0;
            totalObjetivo += Number(resultadosArr.objetivoMensal) || 0;
            totalReparacoes += Number(resultadosArr.qtdReparacoes) || 0;
            totalParaBrisas += Number(resultadosArr.qtdParaBrisas) || 0;
            // Guardar a taxa de reparação do Excel (do último mês com dados)
            if (resultadosArr.taxaReparacao !== null && resultadosArr.taxaReparacao !== undefined) {
              taxaReparacaoExcel = parseFloat(String(resultadosArr.taxaReparacao));
            }
            if (resultadosArr.updatedAt) {
              const dataAtual = new Date(resultadosArr.updatedAt);
              if (!dataUltimaAtualizacao || dataAtual > dataUltimaAtualizacao) {
                dataUltimaAtualizacao = dataAtual;
              }
            }
            if (!resultadosAgregados) resultadosAgregados = resultadosArr;
          }
          
          const complementaresArr = await db.getVendasComplementares(p.mes, p.ano, lojaIdParaConsulta);
          if (complementaresArr && complementaresArr.length > 0) {
            const c = complementaresArr[0];
            totalEscovas += Number(c.escovasQtd) || 0;
            totalPolimento += Number(c.polimentoQtd) || 0;
            totalTratamento += Number(c.tratamentoQtd) || 0;
            totalLavagens += Number(c.lavagensTotal) || 0;
            totalOutros += Number(c.outrosQtd) || 0;
            if (!complementaresAgregados) complementaresAgregados = c;
          }
        }
        
        // Calcular métricas agregadas
        const desvioPercentual = totalObjetivo > 0 ? (totalServicos - totalObjetivo) / totalObjetivo : null;
        // Correção v6.11.12: Usar taxa de reparação diretamente do Excel
        const taxaReparacao = taxaReparacaoExcel;
        const escovasPercent = totalServicos > 0 ? totalEscovas / totalServicos : null;
        const objetivoDiaAtual = resultadosAgregados?.objetivoDiaAtual ? parseFloat(String(resultadosAgregados.objetivoDiaAtual)) : null;
        const desvioObjetivoAcumulado = resultadosAgregados?.desvioObjetivoAcumulado ? parseFloat(String(resultadosAgregados.desvioObjetivoAcumulado)) : null;
        const desvioPercentualDia = resultadosAgregados?.desvioPercentualDia ? parseFloat(String(resultadosAgregados.desvioPercentualDia)) : null;
        
        const resultados = {
          totalServicos,
          objetivoMensal: totalObjetivo,
          objetivoDiaAtual,
          desvioObjetivoAcumulado,
          desvioPercentualDia,
          desvioPercentualMes: desvioPercentual,
          taxaReparacao,
          totalReparacoes,
          gapReparacoes22: taxaReparacao !== null && taxaReparacao < 0.22 
            ? Math.ceil(totalServicos * 0.22 - totalReparacoes) 
            : 0,
        };
        
        const complementares = {
          escovasQtd: totalEscovas,
          escovasPercent,
          polimentoQtd: totalPolimento,
          tratamentoQtd: totalTratamento,
          lavagensTotal: totalLavagens,
          outrosQtd: totalOutros,
        };
        
        // Buscar dados do mês anterior para comparativo
        const mesAnteriorData = mesesConsulta[0];
        const mesCompMes = mesAnteriorData.mes === 1 ? 12 : mesAnteriorData.mes - 1;
        const mesCompAno = mesAnteriorData.mes === 1 ? mesAnteriorData.ano - 1 : mesAnteriorData.ano;
        const resultadosMesAnterior = await db.getResultadosMensaisPorLoja(lojaIdParaConsulta, mesCompMes, mesCompAno);
        const complementaresMesAnterior = await db.getVendasComplementares(mesCompMes, mesCompAno, lojaIdParaConsulta);
        
        // Calcular variações
        const variacaoServicos = resultadosMesAnterior && resultadosMesAnterior.totalServicos 
          ? ((totalServicos - Number(resultadosMesAnterior.totalServicos)) / Number(resultadosMesAnterior.totalServicos)) * 100 
          : null;
        const variacaoReparacoes = resultadosMesAnterior && resultadosMesAnterior.qtdReparacoes 
          ? ((totalReparacoes - Number(resultadosMesAnterior.qtdReparacoes)) / Number(resultadosMesAnterior.qtdReparacoes)) * 100 
          : null;
        const escovasAnterior = complementaresMesAnterior && complementaresMesAnterior.length > 0 
          ? Number(complementaresMesAnterior[0].escovasQtd) || 0 
          : 0;
        const variacaoEscovas = escovasAnterior > 0 
          ? ((totalEscovas - escovasAnterior) / escovasAnterior) * 100 
          : null;
        
        const comparativoMesAnterior = {
          servicosAnterior: resultadosMesAnterior?.totalServicos || 0,
          reparacoesAnterior: resultadosMesAnterior?.qtdReparacoes || 0,
          escovasAnterior,
          variacaoServicos,
          variacaoReparacoes,
          variacaoEscovas,
        };
        
        // Gerar alertas
        const alertas: Array<{tipo: string; mensagem: string}> = [];
        
        if (taxaReparacao !== null && taxaReparacao < 0.22) {
          const gapReparacoes = Math.ceil(totalServicos * 0.22 - totalReparacoes);
          alertas.push({
            tipo: 'warning',
            mensagem: `Taxa de reparação abaixo de 22% (${(taxaReparacao * 100).toFixed(1)}%). Faltam ${gapReparacoes} reparações.`,
          });
        }
        
        if (escovasPercent !== null && escovasPercent < 0.075) {
          alertas.push({
            tipo: 'danger',
            mensagem: `Percentagem de escovas abaixo do mínimo (${(escovasPercent * 100).toFixed(1)}% < 7.5%)`,
          });
        } else if (escovasPercent !== null && escovasPercent < 0.10) {
          alertas.push({
            tipo: 'warning',
            mensagem: `Percentagem de escovas abaixo do objetivo (${(escovasPercent * 100).toFixed(1)}% < 10%)`,
          });
        }
        
        if (desvioPercentualDia !== null && desvioPercentualDia < -0.10) {
          alertas.push({
            tipo: 'danger',
            mensagem: `Desvio diário crítico: ${(desvioPercentualDia * 100).toFixed(1)}% abaixo do objetivo`,
          });
        }
        
        // Buscar evolução dos últimos 12 meses
        const evolucao = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(anoAtual, mesAtual - 1 - i, 1);
          const m = d.getMonth() + 1;
          const a = d.getFullYear();
          const res = await db.getResultadosMensaisPorLoja(lojaIdParaConsulta, m, a);
          if (res) {
            evolucao.push({
              mes: m,
              ano: a,
              totalServicos: res.totalServicos,
              objetivoMensal: res.objetivoMensal,
              desvioPercentualMes: res.objetivoMensal && Number(res.objetivoMensal) > 0
                ? (Number(res.totalServicos) - Number(res.objetivoMensal)) / Number(res.objetivoMensal)
                : null,
              taxaReparacao: res.totalServicos && Number(res.totalServicos) > 0
                ? Number(res.qtdReparacoes) / Number(res.totalServicos)
                : null,
            });
          }
        }
        
        // Obter nome da loja
        const lojaInfo = lojas.find(l => l.id === lojaIdParaConsulta);
        
        return {
          lojaNome: lojaInfo?.nome || 'Loja',
          periodoLabel,
          dataAtualizacao: dataUltimaAtualizacao?.toISOString() || null,
          resultados,
          complementares,
          comparativoMesAnterior,
          alertas,
          evolucao,
        };
      }),
    
    // Anular pedido de apoio aprovado (pelo volante)
    anularPedido: publicProcedure
      .input(z.object({
        token: z.string(),
        pedidoId: z.number(),
        motivo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Obter dados do pedido antes de anular
        const pedidoExistente = await db.getPedidoApoioById(input.pedidoId);
        if (!pedidoExistente) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pedido não encontrado' });
        }
        
        if (pedidoExistente.estado !== 'aprovado') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas pedidos aprovados podem ser anulados' });
        }
        
        // Anular o pedido (mudar estado para 'anulado')
        await db.anularPedidoApoio(input.pedidoId, input.motivo);
        
        // Enviar email à loja sobre anulação
        const loja = await db.getLojaById(pedidoExistente.lojaId);
        if (loja?.email) {
          const tipoApoioTexto = pedidoExistente.tipoApoio === 'cobertura_ferias' ? 'Cobertura de Férias' : 
                                pedidoExistente.tipoApoio === 'substituicao_vidros' ? 'Substituição de Vidros' : 'Outro';
          const periodoTexto = pedidoExistente.periodo === 'manha' ? 'Manhã (9h-13h)' : 'Tarde (14h-18h)';
          const dataFormatada = new Date(pedidoExistente.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          
          try {
            await sendEmail({
              to: loja.email,
              subject: `Apoio Anulado - ${dataFormatada}`,
              html: gerarHTMLPedidoAnulado({
                lojaNome: loja.nome,
                volanteNome: tokenData.volante.nome,
                data: dataFormatada,
                periodo: periodoTexto,
                tipoApoio: tipoApoioTexto,
                motivo: input.motivo || 'Sem motivo indicado',
              }),
            });
          } catch (emailError) {
            console.error('Erro ao enviar email de anulação:', emailError);
          }
        }
        
        return { success: true };
      }),
    
    // Editar pedido de apoio (pelo volante)
    editarPedido: publicProcedure
      .input(z.object({
        token: z.string(),
        pedidoId: z.number(),
        data: z.string().optional(),
        periodo: z.enum(['manha', 'tarde', 'dia_todo']).optional(),
        tipoApoio: z.enum(['cobertura_ferias', 'substituicao_vidros', 'outro']).optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Obter dados do pedido antes de editar
        const pedidoExistente = await db.getPedidoApoioById(input.pedidoId);
        if (!pedidoExistente) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pedido não encontrado' });
        }
        
        // Editar o pedido
        const pedidoAtualizado = await db.editarPedidoApoio(input.pedidoId, {
          data: input.data,
          periodo: input.periodo,
          tipoApoio: input.tipoApoio,
          observacoes: input.observacoes,
        });
        
        // Enviar email à loja sobre edição
        const loja = await db.getLojaById(pedidoExistente.lojaId);
        if (loja?.email) {
          const tipoApoioTexto = (input.tipoApoio || pedidoExistente.tipoApoio) === 'cobertura_ferias' ? 'Cobertura de Férias' : 
                                (input.tipoApoio || pedidoExistente.tipoApoio) === 'substituicao_vidros' ? 'Substituição de Vidros' : 'Outro';
          const periodoTexto = (input.periodo || pedidoExistente.periodo) === 'manha' ? 'Manhã (9h-13h)' : 'Tarde (14h-18h)';
          const dataFormatada = new Date(input.data || pedidoExistente.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          
          try {
            await sendEmail({
              to: loja.email,
              subject: `Apoio Alterado - ${dataFormatada}`,
              html: gerarHTMLPedidoEditado({
                lojaNome: loja.nome,
                volanteNome: tokenData.volante.nome,
                data: dataFormatada,
                periodo: periodoTexto,
                tipoApoio: tipoApoioTexto,
                observacoes: input.observacoes || pedidoExistente.observacoes,
              }),
            });
          } catch (emailError) {
            console.error('Erro ao enviar email de edição:', emailError);
          }
        }
        
        return pedidoAtualizado;
      }),
    
    // Configurar Telegram para notificações
    configurarTelegram: publicProcedure
      .input(z.object({
        token: z.string(),
        telegramChatId: z.string().optional(),
        telegramUsername: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Atualizar dados do Telegram no volante
        await db.atualizarTelegramVolante(tokenData.volante.id, {
          telegramChatId: input.telegramChatId || null,
          telegramUsername: input.telegramUsername || null,
        });
        
        return { success: true };
      }),
    
    // Obter configurações do Telegram
    getTelegramConfig: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        return {
          telegramChatId: tokenData.volante.telegramChatId,
          telegramUsername: tokenData.volante.telegramUsername,
        };
      }),
    
    // Chatbot IA para o Portal do Volante
    chatbot: publicProcedure
      .input(z.object({
        token: z.string(),
        pergunta: z.string().min(1),
        historico: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Obter lojas atribuídas ao volante
        const lojas = await db.getLojasByVolanteId(tokenData.volante.id);
        const lojasAtribuidas = lojas.map(l => ({ id: l.id, nome: l.nome }));
        
        const { processarPerguntaPortalVolante } = await import('./chatbotServicePortais');
        const resultado = await processarPerguntaPortalVolante(
          input.pergunta,
          input.historico || [],
          tokenData.volante.nome,
          lojasAtribuidas
        );
        return resultado;
      }),
    
    // Exportar Dashboard para PDF
    exportarDashboardPDF: publicProcedure
      .input(z.object({
        token: z.string(),
        meses: z.array(z.object({ mes: z.number(), ano: z.number() })),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Buscar todos os pedidos aprovados do volante
        const pedidos = await db.getPedidosApoioByVolanteId(tokenData.volante.id);
        const pedidosAprovados = pedidos.filter(p => p.estado === 'aprovado');
        
        // Filtrar por meses selecionados
        const pedidosFiltrados = pedidosAprovados.filter(p => {
          const data = new Date(p.data);
          return input.meses.some(m => 
            data.getMonth() + 1 === m.mes && data.getFullYear() === m.ano
          );
        });
        
        // Calcular estatísticas
        const totalApoios = pedidosFiltrados.length;
        const lojasApoiadas = new Set(pedidosFiltrados.map(p => p.lojaId)).size;
        const coberturaFerias = pedidosFiltrados.filter(p => p.tipoApoio === 'cobertura_ferias').length;
        const substituicoes = pedidosFiltrados.filter(p => p.tipoApoio === 'substituicao_vidros').length;
        const outro = pedidosFiltrados.filter(p => p.tipoApoio === 'outro').length;
        
        // Agrupar por loja para ranking
        const apoiosPorLoja: Record<number, { nome: string; count: number }> = {};
        for (const pedido of pedidosFiltrados) {
          if (!apoiosPorLoja[pedido.lojaId]) {
            const loja = await db.getLojaById(pedido.lojaId);
            apoiosPorLoja[pedido.lojaId] = { nome: loja?.nome || 'Loja', count: 0 };
          }
          apoiosPorLoja[pedido.lojaId].count++;
        }
        
        const rankingLojas = Object.values(apoiosPorLoja)
          .sort((a, b) => b.count - a.count);
        
        // Formatar período
        const mesesOrdenados = [...input.meses].sort((a, b) => 
          a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
        );
        const periodoTexto = mesesOrdenados.length === 1
          ? `${mesesOrdenados[0].mes}/${mesesOrdenados[0].ano}`
          : `${mesesOrdenados[0].mes}/${mesesOrdenados[0].ano} - ${mesesOrdenados[mesesOrdenados.length - 1].mes}/${mesesOrdenados[mesesOrdenados.length - 1].ano}`;
        
        // Gerar PDF
        const { gerarPDFPortalVolanteDashboard } = await import('./pdfPortalVolanteDashboard');
        const pdfBuffer = await gerarPDFPortalVolanteDashboard({
          volanteNome: tokenData.volante.nome,
          periodo: periodoTexto,
          totalApoios,
          lojasApoiadas,
          coberturaFerias,
          substituicoes,
          outro,
          rankingLojas,
        });
        
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `dashboard_volante_${tokenData.volante.nome.replace(/\s+/g, '_')}_${periodoTexto.replace(/\//g, '-')}.pdf`,
        };
      }),
    
    // Registar serviços realizados numa loja
    registarServicos: publicProcedure
      .input(z.object({
        token: z.string(),
        lojaId: z.number().nullable(), // null = Outros (Loja externa)
        data: z.string(), // formato YYYY-MM-DD
        substituicaoLigeiro: z.number().min(0).max(20),
        reparacao: z.number().min(0).max(20),
        calibragem: z.number().min(0).max(20),
        outros: z.number().min(0).max(20),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Se lojaId não é null, verificar se o volante tem acesso a esta loja
        if (input.lojaId !== null) {
          const lojas = await db.getLojasByVolanteId(tokenData.volante.id);
          const temAcesso = lojas.some(l => l.id === input.lojaId);
          if (!temAcesso) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Não tem acesso a esta loja' });
          }
        }
        
        const servico = await db.registarServicosVolante({
          volanteId: tokenData.volante.id,
          lojaId: input.lojaId,
          data: input.data,
          substituicaoLigeiro: input.substituicaoLigeiro,
          reparacao: input.reparacao,
          calibragem: input.calibragem,
          outros: input.outros,
        });
        
        return servico;
      }),
    
    // Obter serviços do dia
    getServicosDia: publicProcedure
      .input(z.object({
        token: z.string(),
        data: z.string(), // formato YYYY-MM-DD
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const servicos = await db.getServicosVolanteByData(tokenData.volante.id, input.data);
        return servicos;
      }),
    
    // Obter histórico de serviços com filtros
    getHistoricoServicos: publicProcedure
      .input(z.object({
        token: z.string(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        lojaId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const historico = await db.getHistoricoServicosVolante(
          tokenData.volante.id,
          input.dataInicio,
          input.dataFim,
          input.lojaId
        );
        return historico;
      }),
    
    // Obter estatísticas mensais
    getEstatisticasMensais: publicProcedure
      .input(z.object({
        token: z.string(),
        ano: z.number(),
        mes: z.number(),
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const estatisticas = await db.getEstatisticasMensaisServicos(
          tokenData.volante.id,
          input.ano,
          input.mes
        );
        return estatisticas;
      }),
    
    // Exportar relatório mensal em PDF
    exportarRelatorioMensal: publicProcedure
      .input(z.object({
        token: z.string(),
        ano: z.number(),
        mes: z.number(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const estatisticas = await db.getEstatisticasMensaisServicos(
          tokenData.volante.id,
          input.ano,
          input.mes
        );
        
        if (!estatisticas) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Sem dados para este período' });
        }
        
        // Gerar PDF (implementar depois)
        const { gerarPDFRelatorioMensalServicos } = await import('./pdfRelatorioMensalServicos');
        const pdfBuffer = await gerarPDFRelatorioMensalServicos({
          volanteNome: tokenData.volante.nome,
          ano: input.ano,
          mes: input.mes,
          totais: estatisticas.totais,
          porLoja: estatisticas.porLoja,
        });
        
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `relatorio_servicos_${input.ano}_${String(input.mes).padStart(2, '0')}.pdf`,
        };
      }),

    // Obter estatísticas gerais de serviços (Dashboard)
    getEstatisticasServicos: publicProcedure
      .input(z.object({
        token: z.string(),
        mesesSelecionados: z.array(z.string()).optional(),
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const estatisticas = await db.getEstatisticasServicos(tokenData.volante.id, input.mesesSelecionados);
        return estatisticas;
      }),
    
    // Obter Top N lojas com mais serviços (Dashboard)
    getTopLojasServicos: publicProcedure
      .input(z.object({
        token: z.string(),
        limit: z.number().optional(),
        mesesSelecionados: z.array(z.string()).optional(),
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const topLojas = await db.getTopLojasServicos(tokenData.volante.id, input.limit || 5, input.mesesSelecionados);
        return topLojas;
      }),

    // Endpoint de teste para enviar notificações manualmente
    testarNotificacoes: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenVolante(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        // Buscar volantes com agendamentos pendentes de registo
        const volantesPendentes = await db.getVolantesSemRegistoHoje();
        
        if (volantesPendentes.length === 0) {
          return {
            sucesso: true,
            mensagem: 'Nenhum volante com agendamentos pendentes de registo hoje',
            enviados: 0,
          };
        }
        
        let sucessos = 0;
        const erros: string[] = [];
        
        for (const volante of volantesPendentes) {
          if (!volante.telegramChatId) {
            erros.push(`Volante ${volante.nome} não tem Telegram configurado`);
            continue;
          }
          
          const { enviarLembreteRegistoServicos } = await import('./telegramService');
          const resultado = await enviarLembreteRegistoServicos(
            volante.telegramChatId,
            {
              volanteNome: volante.nome,
              lojasNaoRegistadas: volante.lojasNaoRegistadas,
            }
          );
          
          if (resultado) {
            sucessos++;
          } else {
            erros.push(`Falha ao enviar para ${volante.nome}`);
          }
        }
        
        return {
          sucesso: true,
          mensagem: `Notificações enviadas: ${sucessos}/${volantesPendentes.length}`,
          enviados: sucessos,
          total: volantesPendentes.length,
          erros: erros.length > 0 ? erros : undefined,
        };
      }),
  }),
  
  // ==================== ANÁLISE DE FICHAS DE SERVIÇO ====================
  // Função auxiliar para gerar alerta de processos repetidos
  
  analiseFichas: router({
    // Upload e análise do ficheiro Excel
    analisar: gestorProcedure
      .input(z.object({
        fileBase64: z.string(),
        nomeArquivo: z.string(),
        gestorIdSelecionado: z.number().optional(), // Admin pode selecionar um gestor
      }))
      .mutation(async ({ input, ctx }) => {
        // Determinar o gestorId a usar
        let gestorIdParaAnalise: number;
        let lojasGestor: Awaited<ReturnType<typeof db.getLojasByGestorId>>;
        
        if (ctx.user.role === 'admin') {
          // Admin DEVE selecionar um gestor
          if (!input.gestorIdSelecionado) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Admin deve selecionar um gestor para ver os relatórios' });
          }
          gestorIdParaAnalise = input.gestorIdSelecionado;
          lojasGestor = await db.getLojasByGestorId(input.gestorIdSelecionado);
        } else {
          // Gestor usa o seu próprio ID
          if (!ctx.gestor) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas gestores podem analisar ficheiros' });
          }
          gestorIdParaAnalise = ctx.gestor.id;
          lojasGestor = await db.getLojasByGestorId(ctx.gestor.id);
        }
        
        // Converter base64 para buffer
        const buffer = Buffer.from(input.fileBase64, 'base64');
        
        // Processar análise
        const resultado = processarAnalise(buffer, input.nomeArquivo);
        
        // Guardar análise na base de dados
        const analise = await db.createAnaliseFichasServico({
          gestorId: gestorIdParaAnalise,
          nomeArquivo: input.nomeArquivo,
          totalFichas: resultado.totalFichas,
          totalLojas: resultado.totalLojas,
          resumoGeral: JSON.stringify(resultado.resumoGeral),
        });
        
        // Guardar relatórios por loja
        const relatoriosGuardados = [];
        console.log('[analiseFichas] === INÍCIO MATCHING DE LOJAS ===');
        console.log('[analiseFichas] Total lojas no resultado:', resultado.relatoriosPorLoja.length);
        console.log('[analiseFichas] Lojas encontradas:', resultado.relatoriosPorLoja.map(r => `${r.nomeLoja} (num: ${r.numeroLoja}, SM: ${r.isServicoMovel})`).join(', '));
        
        for (const relatorio of resultado.relatoriosPorLoja) {
          // Ignorar fichas da loja "Desconhecida" (fichas sem loja identificada)
          if (relatorio.nomeLoja === 'Desconhecida' || relatorio.nomeLoja.toLowerCase() === 'desconhecida') {
            console.log(`[analiseFichas] Ignorando loja "Desconhecida" com ${relatorio.totalFichas} fichas`);
            continue;
          }
          
          // Tentar encontrar a loja no sistema
          // NOVA LÓGICA DE MATCHING:
          // 1. Para Serviço Móvel (SM): usar NOME primeiro (o número no nmdos é enganador)
          //    Ex: "Ficha S.Movel 7-Leiria" tem número 7 mas Leiria SM é 57 na BD (7 = Guimarães)
          // 2. Para FS normais: usar NÚMERO primeiro (ex: "Ficha Servico 7" -> 7 = Guimarães)
          // 3. Fallback: usar nome aproximado
          let lojaId: number | null = null;
          let matchMethod = 'none';
          
          if (relatorio.isServicoMovel) {
            // SM: Priorizar NOME (o número no nmdos de SM não corresponde ao numeroLoja na BD)
            console.log(`[analiseFichas] SM detectado: "${relatorio.nomeLoja}" - usar nome para matching`);
            const lojaPorNome = await db.getLojaByNomeAproximado(relatorio.nomeLoja);
            if (lojaPorNome) {
              lojaId = lojaPorNome.id;
              matchMethod = `SM-nome(${relatorio.nomeLoja})->${lojaPorNome.nome}`;
            } else {
              console.log(`[analiseFichas] FALHA SM por nome: "${relatorio.nomeLoja}" - nome não encontrado na BD`);
            }
          } else {
            // FS normal: Priorizar NÚMERO (ex: "Ficha Servico 7" -> 7 = Guimarães)
            if (relatorio.numeroLoja) {
              const lojaPorNumero = await db.getLojaByNumero(relatorio.numeroLoja);
              if (lojaPorNumero) {
                lojaId = lojaPorNumero.id;
                matchMethod = `FS-numero(${relatorio.numeroLoja})->${lojaPorNumero.nome}`;
              } else {
                console.log(`[analiseFichas] FALHA FS por número: ${relatorio.nomeLoja} (num: ${relatorio.numeroLoja}) - número não encontrado na BD`);
              }
            }
            
            // Fallback: tentar por nome aproximado
            if (!lojaId) {
              const lojaPorNome = await db.getLojaByNomeAproximado(relatorio.nomeLoja);
              if (lojaPorNome) {
                lojaId = lojaPorNome.id;
                matchMethod = `FS-nome(${relatorio.nomeLoja})->${lojaPorNome.nome}`;
              } else {
                console.log(`[analiseFichas] FALHA FS por nome: "${relatorio.nomeLoja}" - nome não encontrado na BD`);
              }
            }
          }
          
          console.log(`[analiseFichas] Loja: "${relatorio.nomeLoja}" | Num: ${relatorio.numeroLoja} | SM: ${relatorio.isServicoMovel} | Match: ${matchMethod} | lojaId: ${lojaId}`);
          
          // Guardar lojaId sempre que encontrado (não restringir ao gestor)
          // A filtragem por gestor é feita na visualização, não no armazenamento
          
          const relatorioGuardado = await db.createRelatorioAnaliseLoja({
            analiseId: analise.id,
            lojaId: lojaId,
            nomeLoja: relatorio.nomeLoja,
            numeroLoja: (typeof relatorio.numeroLoja === 'number' && Number.isFinite(relatorio.numeroLoja)) ? relatorio.numeroLoja : null,
            totalFichas: relatorio.totalFichas,
            fichasAbertas5Dias: relatorio.fichasAbertas5Dias.length,
            fichasAposAgendamento: relatorio.fichasAposAgendamento.length,
            fichasStatusAlerta: relatorio.fichasStatusAlerta.length,
            fichasSemNotas: relatorio.fichasSemNotas.length,
            fichasNotasAntigas: relatorio.fichasNotasAntigas.length,
            fichasDevolverVidro: relatorio.fichasDevolverVidro.length,
            fichasSemEmailCliente: 0, // REMOVIDO da análise
            conteudoRelatorio: relatorio.conteudoHTML,
            resumo: relatorio.resumo,
          });
          
          // Guardar fichas identificadas para comparacao futura
          const fichasParaGuardar: Array<{
            relatorioId: number;
            analiseId: number;
            nomeLoja: string;
            categoria: 'abertas5Dias' | 'aposAgendamento' | 'statusAlerta' | 'semNotas' | 'notasAntigas' | 'devolverVidro' | 'semEmailCliente';
            obrano: number;
            matricula: string | null;
            diasAberto: number | null;
            status: string | null;
          }> = [];
          
          // Mapear fichas por categoria
          const categoriasMap: Array<{ fichas: typeof relatorio.fichasAbertas5Dias; categoria: 'abertas5Dias' | 'aposAgendamento' | 'statusAlerta' | 'semNotas' | 'notasAntigas' | 'devolverVidro' }> = [
            { fichas: relatorio.fichasAbertas5Dias, categoria: 'abertas5Dias' },
            { fichas: relatorio.fichasAposAgendamento, categoria: 'aposAgendamento' },
            { fichas: relatorio.fichasStatusAlerta, categoria: 'statusAlerta' },
            { fichas: relatorio.fichasSemNotas, categoria: 'semNotas' },
            { fichas: relatorio.fichasNotasAntigas, categoria: 'notasAntigas' },
            { fichas: relatorio.fichasDevolverVidro, categoria: 'devolverVidro' },
            // { fichas: relatorio.fichasSemEmailCliente, categoria: 'semEmailCliente' }, // REMOVIDO
          ];
          
          for (const { fichas, categoria } of categoriasMap) {
            for (const ficha of fichas) {
              fichasParaGuardar.push({
                relatorioId: relatorioGuardado.id,
                analiseId: analise.id,
                nomeLoja: relatorio.nomeLoja,
                categoria,
                obrano: ficha.obrano,
                matricula: ficha.matricula || null,
                diasAberto: ficha.diasAberto || null,
                status: ficha.status || null,
              });
            }
          }
          
          // Contador de processos repetidos (inicializado fora do try-catch)
          let numProcessosRepetidos = 0;
          
          // Guardar fichas identificadas e comparar com análise anterior
          // Envolvido em try-catch para não bloquear a análise se houver erro
          try {
            // Validar que analise.id é válido antes de guardar
            if (Number.isFinite(analise.id) && analise.id > 0) {
              // Filtrar fichas com obrano válido
              console.log(`[analiseFichas] fichasParaGuardar total: ${fichasParaGuardar.length} para ${relatorio.nomeLoja}`);
              if (fichasParaGuardar.length > 0) {
                const amostra = fichasParaGuardar[0];
                console.log(`[analiseFichas] Amostra ficha: obrano=${amostra.obrano} (${typeof amostra.obrano}), relatorioId=${amostra.relatorioId} (${typeof amostra.relatorioId}), analiseId=${amostra.analiseId} (${typeof amostra.analiseId})`);
                console.log(`[analiseFichas] isFinite obrano: ${Number.isFinite(amostra.obrano)}, >0: ${amostra.obrano > 0}`);
                console.log(`[analiseFichas] isFinite relatorioId: ${Number.isFinite(amostra.relatorioId)}, >0: ${amostra.relatorioId > 0}`);
                console.log(`[analiseFichas] isFinite analiseId: ${Number.isFinite(amostra.analiseId)}, >0: ${amostra.analiseId > 0}`);
              }
              const fichasValidas = fichasParaGuardar.filter(f => 
                Number.isFinite(f.obrano) && f.obrano >= 0 &&
                Number.isFinite(f.relatorioId) && f.relatorioId > 0 &&
                Number.isFinite(f.analiseId) && f.analiseId > 0
              );
              console.log(`[analiseFichas] fichasValidas: ${fichasValidas.length} de ${fichasParaGuardar.length} para ${relatorio.nomeLoja}`);
              
              if (fichasValidas.length > 0) {
                // Inserir em batches de 100 para evitar queries SQL demasiado grandes
                const BATCH_SIZE = 100;
                for (let i = 0; i < fichasValidas.length; i += BATCH_SIZE) {
                  const batch = fichasValidas.slice(i, i + BATCH_SIZE);
                  await db.saveFichasIdentificadas(batch);
                }
                console.log(`[analiseFichas] Guardadas ${fichasValidas.length} fichas identificadas para ${relatorio.nomeLoja} (em batches de ${BATCH_SIZE})`);
              } else {
                console.warn(`[analiseFichas] NENHUMA ficha válida para guardar em ${relatorio.nomeLoja}! Total antes do filtro: ${fichasParaGuardar.length}`);
              }
              
              // Buscar fichas da analise anterior para comparacao
              const { fichas: fichasAnteriores, dataAnaliseAnterior } = await db.getFichasIdentificadasAnterior(analise.id, relatorio.nomeLoja, gestorIdParaAnalise);
              
              // Identificar processos repetidos (mesmo obrano em categorias problematicas)
              if (fichasAnteriores.length > 0) {
                const obrasAnteriores = new Set(fichasAnteriores.map(f => f.obrano));
                const processosRepetidos: Array<{ obrano: number; matricula: string; categoria: string; diasAberto: number }> = [];
                
                for (const { fichas, categoria } of categoriasMap) {
                  for (const ficha of fichas) {
                    if (obrasAnteriores.has(ficha.obrano)) {
                      processosRepetidos.push({
                        obrano: ficha.obrano,
                        matricula: ficha.matricula || '',
                        categoria,
                        diasAberto: ficha.diasAberto || 0,
                      });
                    }
                  }
                }
                
                numProcessosRepetidos = processosRepetidos.length;
                
                // Se houver processos repetidos, atualizar o resumo com alerta
                if (processosRepetidos.length > 0) {
                  // Calcular dias desde a identificação (desde a análise anterior)
                  let diasDesdeIdentificacao = 0;
                  if (dataAnaliseAnterior) {
                    const hoje = new Date();
                    const diffTime = Math.abs(hoje.getTime() - dataAnaliseAnterior.getTime());
                    diasDesdeIdentificacao = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }
                  
                  const alertaRepetidos = gerarAlertaProcessosRepetidos(processosRepetidos, diasDesdeIdentificacao);
                  const novoResumo = alertaRepetidos + relatorio.resumo;
                  await db.updateRelatorioResumo(relatorioGuardado.id, novoResumo);
                  relatorioGuardado.resumo = novoResumo;
                  console.log(`[analiseFichas] ${processosRepetidos.length} processos repetidos encontrados para ${relatorio.nomeLoja} (identificados há ${diasDesdeIdentificacao} dias)`);
                }
              }
            } else {
              console.warn(`[analiseFichas] analise.id inválido: ${analise.id}, não guardando fichas identificadas`);
            }
          } catch (fichasError: any) {
            // Log do erro mas continua a análise
            console.error('[analiseFichas] Erro ao guardar/comparar fichas identificadas:', fichasError?.message || fichasError);
            console.error('[analiseFichas] Error details - code:', fichasError?.code, 'sqlState:', fichasError?.sqlState, 'errno:', fichasError?.errno);
            console.error('[analiseFichas] Stack:', fichasError?.stack?.substring(0, 500));
          }
          
          // === GUARDAR EUROCODES DE TODAS AS FICHAS PARA CRUZAMENTO COM STOCK ===
          try {
            if (relatorio.fichasCompletas && relatorio.fichasCompletas.length > 0) {
              const eurocodesParaGuardar: Array<{
                analiseId: number;
                lojaId: number | null;
                nomeLoja: string;
                obrano: number;
                matricula: string | null;
                eurocode: string;
                ref: string | null;
                marca: string | null;
                modelo: string | null;
                status: string | null;
                diasAberto: number | null;
              }> = [];
              
              for (const ficha of relatorio.fichasCompletas) {
                // Extrair eurocode do campo eurocode ou ref
                const eurocodeValue = (ficha.eurocode || '').trim();
                const refValue = (ficha.ref || '').trim();
                
                // Usar eurocode se disponível, senão usar ref
                const codigoFinal = eurocodeValue || refValue;
                if (!codigoFinal) continue;
                
                // Pode haver múltiplos eurocodes separados por vírgula
                const codigos = codigoFinal.split(/[,;]/).map(c => c.trim()).filter(c => c.length > 0);
                
                for (const codigo of codigos) {
                  eurocodesParaGuardar.push({
                    analiseId: analise.id,
                    lojaId: lojaId,
                    nomeLoja: relatorio.nomeLoja,
                    obrano: ficha.obrano,
                    matricula: ficha.matricula || null,
                    eurocode: codigo,
                    ref: ficha.ref || null,
                    marca: ficha.marca || null,
                    modelo: ficha.modelo || null,
                    status: ficha.status || null,
                    diasAberto: ficha.diasAberto || null,
                  });
                }
              }
              
              if (eurocodesParaGuardar.length > 0) {
                await db.saveEurocodesFichas(eurocodesParaGuardar);
                console.log(`[analiseFichas] Guardados ${eurocodesParaGuardar.length} eurocodes para ${relatorio.nomeLoja}`);
              }
            }
          } catch (euroErr: any) {
            console.error('[analiseFichas] Erro ao guardar eurocodes:', euroErr?.message || euroErr);
          }
          
          // Verificar se a loja pertence ao gestor
          const lojasGestorIds = lojasGestor.map(l => l.id);
          const pertenceAoGestor = lojaId ? lojasGestorIds.includes(lojaId) : false;
          console.log(`[analiseFichas] pertenceAoGestor: ${pertenceAoGestor} (lojaId: ${lojaId}, lojasGestorIds: [${lojasGestorIds.join(',')}])`);
          
          relatoriosGuardados.push({
            ...relatorioGuardado,
            pertenceAoGestor,
            processosRepetidos: numProcessosRepetidos,
          });
          
          // Verificar evolução em relação à análise anterior
          const relatorioAnterior = await db.getRelatorioAnteriorLoja(analise.id, relatorio.nomeLoja, gestorIdParaAnalise);
          if (relatorioAnterior) {
            const variacaoAbertas = relatorio.fichasAbertas5Dias.length - relatorioAnterior.fichasAbertas5Dias;
            const variacaoApos = relatorio.fichasAposAgendamento.length - relatorioAnterior.fichasAposAgendamento;
            const variacaoAlerta = relatorio.fichasStatusAlerta.length - relatorioAnterior.fichasStatusAlerta;
            const variacaoSemNotas = relatorio.fichasSemNotas.length - relatorioAnterior.fichasSemNotas;
            const variacaoNotasAntigas = relatorio.fichasNotasAntigas.length - relatorioAnterior.fichasNotasAntigas;
            const variacaoDevolver = relatorio.fichasDevolverVidro.length - relatorioAnterior.fichasDevolverVidro;
            
            const totalVariacao = variacaoAbertas + variacaoApos + variacaoAlerta + variacaoSemNotas + variacaoNotasAntigas + variacaoDevolver;
            let evolucaoGeral: 'melhorou' | 'piorou' | 'estavel' = 'estavel';
            let comentario = '';
            
            if (totalVariacao < -2) {
              evolucaoGeral = 'melhorou';
              comentario = `A loja melhorou significativamente! Redução de ${Math.abs(totalVariacao)} problemas em relação à análise anterior.`;
            } else if (totalVariacao > 2) {
              evolucaoGeral = 'piorou';
              comentario = `A loja piorou! Aumento de ${totalVariacao} problemas em relação à análise anterior. Requer atenção imediata.`;
            } else {
              comentario = 'A loja manteve-se estável em relação à análise anterior.';
            }
            
            await db.createEvolucaoAnalise({
              analiseAtualId: analise.id,
              analiseAnteriorId: relatorioAnterior.analiseId,
              lojaId: lojaId,
              nomeLoja: relatorio.nomeLoja,
              variacaoFichasAbertas5Dias: variacaoAbertas,
              variacaoFichasAposAgendamento: variacaoApos,
              variacaoFichasStatusAlerta: variacaoAlerta,
              variacaoFichasSemNotas: variacaoSemNotas,
              variacaoFichasNotasAntigas: variacaoNotasAntigas,
              variacaoFichasDevolverVidro: variacaoDevolver,
              evolucaoGeral,
              comentario,
            });
          }
        }
        
        // NOTA: Eurocodes de fichas excluídas (Serviço Pronto, REVISAR) agora são incluídos
        // automaticamente em fichasCompletas de cada relatório pelo analisarFichas(),
        // portanto são guardados pelo Bloco 1 acima com o matching correcto de lojas.
        
        return {
          analiseId: analise.id,
          totalFichas: resultado.totalFichas,
          totalLojas: resultado.totalLojas,
          resumoGeral: resultado.resumoGeral,
          relatorios: relatoriosGuardados,
        };
      }),
    
    // Listar análises do gestor
    listar: gestorProcedure
      .query(async ({ ctx }) => {
        // Admin vê todas as análises, gestor vê apenas as suas
        if (ctx.user.role === 'admin') {
          return await db.getAllAnalises();
        }
        
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas gestores podem ver análises' });
        }
        
        return await db.getAnalisesByGestorId(ctx.gestor.id);
      }),
    
    // Obter detalhes de uma análise
    detalhes: gestorProcedure
      .input(z.object({ 
        analiseId: z.number(),
        gestorIdFiltro: z.number().optional(), // Admin pode filtrar por gestor
      }))
      .query(async ({ input, ctx }) => {
        const analise = await db.getAnaliseById(input.analiseId);
        if (!analise) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Análise não encontrada' });
        }
        
        // Admin pode ver todas as análises, gestor apenas as suas
        if (ctx.user.role !== 'admin') {
          if (!ctx.gestor) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas gestores podem ver análises' });
          }
          if (analise.gestorId !== ctx.gestor.id) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Análise não encontrada' });
          }
        }
        
        const relatorios = await db.getRelatoriosByAnaliseId(input.analiseId);
        const evolucao = await db.getEvolucaoByAnaliseId(input.analiseId);
        
        // Obter lojas do gestor para marcar quais pertencem a ele
        // Admin pode filtrar por gestor específico, ou ver todas
        let lojasGestorIds: number[] = [];
        let gestorFiltrado: { id: number; nome: string } | null = null;
        
        if (ctx.user.role === 'admin') {
          if (input.gestorIdFiltro) {
            // Admin está a filtrar por um gestor específico
            const lojasGestor = await db.getLojasByGestorId(input.gestorIdFiltro);
            lojasGestorIds = lojasGestor.map(l => l.id);
            const gestor = await db.getGestorById(input.gestorIdFiltro);
            gestorFiltrado = gestor ? { id: gestor.id, nome: gestor.nome } : null;
          } else {
            // Admin vê todas as lojas
            const todasLojas = await db.getAllLojas();
            lojasGestorIds = todasLojas.map(l => l.id);
          }
        } else if (ctx.gestor) {
          const lojasGestor = await db.getLojasByGestorId(ctx.gestor.id);
          lojasGestorIds = lojasGestor.map(l => l.id);
        }
        
        // Filtrar fichas da loja "Desconhecida" (fichas sem loja identificada)
        const relatoriosFiltrados = relatorios.filter(r => 
          r.nomeLoja !== 'Desconhecida' && r.nomeLoja.toLowerCase() !== 'desconhecida'
        );
        
        const relatoriosComInfo = relatoriosFiltrados.map(r => ({
          ...r,
          pertenceAoGestor: r.lojaId ? lojasGestorIds.includes(r.lojaId) : (ctx.user.role === 'admin' && !input.gestorIdFiltro),
          evolucao: evolucao.find(e => e.nomeLoja === r.nomeLoja) || null,
        }));
        
        return {
          analise,
          relatorios: relatoriosComInfo,
          gestorFiltrado, // Informar qual gestor está filtrado (para Admin)
        };
      }),
    
    // Obter relatório individual
    relatorio: gestorProcedure
      .input(z.object({ relatorioId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas gestores podem ver relatórios' });
        }
        
        const relatorio = await db.getRelatorioAnaliseById(input.relatorioId);
        if (!relatorio) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Relatório não encontrado' });
        }
        
        // Verificar se a análise pertence ao gestor
        const analise = await db.getAnaliseById(relatorio.analiseId);
        if (!analise || analise.gestorId !== ctx.gestor.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para ver este relatório' });
        }
        
        return relatorio;
      }),
    
    // Download PDF do relatório
    downloadPDF: gestorProcedure
      .input(z.object({ relatorioId: z.number() }))
      .query(async ({ input, ctx }) => {
        const relatorio = await db.getRelatorioAnaliseById(input.relatorioId);
        if (!relatorio) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Relatório não encontrado' });
        }
        
        // Verificar permissão
        const analise = await db.getAnaliseById(relatorio.analiseId);
        if (!analise) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Análise não encontrada' });
        }
        
        // Admin pode ver todos, gestor apenas os seus
        if (ctx.user.role !== 'admin') {
          if (!ctx.gestor || analise.gestorId !== ctx.gestor.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para ver este relatório' });
          }
        }
        
        // Gerar PDF
        const { gerarPDFAnaliseFichas } = await import('./pdfAnaliseFichas');
        
        const pdfBase64 = await gerarPDFAnaliseFichas({
          nomeLoja: relatorio.nomeLoja,
          numeroLoja: relatorio.numeroLoja,
          totalFichas: relatorio.totalFichas,
          fichasAbertas5Dias: relatorio.fichasAbertas5Dias,
          fichasAposAgendamento: relatorio.fichasAposAgendamento,
          fichasStatusAlerta: relatorio.fichasStatusAlerta,
          fichasSemNotas: relatorio.fichasSemNotas,
          fichasNotasAntigas: relatorio.fichasNotasAntigas,
          fichasDevolverVidro: relatorio.fichasDevolverVidro,
          fichasSemEmailCliente: relatorio.fichasSemEmailCliente,
          resumo: relatorio.resumo || '',
          conteudoRelatorio: relatorio.conteudoRelatorio || '',
        }, new Date(analise.dataUpload));
        
        return {
          pdfBase64,
          filename: `Analise_Fichas_${relatorio.nomeLoja.replace(/\s+/g, '_')}_${new Date(analise.dataUpload).toISOString().split('T')[0]}.pdf`,
        };
      }),
    
    // Enviar relatório por email
    enviarEmail: gestorProcedure
      .input(z.object({ 
        relatorioId: z.number(),
        emailDestino: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas gestores podem enviar relatórios' });
        }
        
        const relatorio = await db.getRelatorioAnaliseById(input.relatorioId);
        if (!relatorio) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Relatório não encontrado' });
        }
        
        // Verificar se a análise pertence ao gestor
        const analise = await db.getAnaliseById(relatorio.analiseId);
        if (!analise || analise.gestorId !== ctx.gestor.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para enviar este relatório' });
        }
        
        // Determinar email de destino
        let emailDestino = input.emailDestino;
        if (!emailDestino && relatorio.lojaId) {
          const loja = await db.getLojaById(relatorio.lojaId);
          emailDestino = loja?.email || undefined;
        }
        
        if (!emailDestino) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email de destino não especificado e loja não tem email configurado' });
        }
        
        // Gerar HTML completo do email com cabeçalho, resumo e métricas
        const dataAnalise = new Date(analise.dataUpload);
        const dataFormatada = dataAnalise.toLocaleDateString('pt-PT');
        
        const htmlEmail = gerarHTMLEmailAnalise({
          nomeLoja: relatorio.nomeLoja,
          numeroLoja: relatorio.numeroLoja,
          totalFichas: relatorio.totalFichas,
          fichasAbertas5Dias: relatorio.fichasAbertas5Dias,
          fichasAposAgendamento: relatorio.fichasAposAgendamento,
          fichasStatusAlerta: relatorio.fichasStatusAlerta,
          fichasSemNotas: relatorio.fichasSemNotas,
          fichasNotasAntigas: relatorio.fichasNotasAntigas,
          fichasDevolverVidro: relatorio.fichasDevolverVidro,
          fichasSemEmailCliente: relatorio.fichasSemEmailCliente,
          resumo: relatorio.resumo || '',
          conteudoRelatorio: relatorio.conteudoRelatorio,
        }, dataAnalise);
        
        // Gerar PDF do relatório
        const { gerarPDFAnaliseFichas } = await import('./pdfAnaliseFichas');
        const pdfBase64 = await gerarPDFAnaliseFichas({
          nomeLoja: relatorio.nomeLoja,
          numeroLoja: relatorio.numeroLoja,
          totalFichas: relatorio.totalFichas,
          fichasAbertas5Dias: relatorio.fichasAbertas5Dias,
          fichasAposAgendamento: relatorio.fichasAposAgendamento,
          fichasStatusAlerta: relatorio.fichasStatusAlerta,
          fichasSemNotas: relatorio.fichasSemNotas,
          fichasNotasAntigas: relatorio.fichasNotasAntigas,
          fichasDevolverVidro: relatorio.fichasDevolverVidro,
          fichasSemEmailCliente: relatorio.fichasSemEmailCliente,
          resumo: relatorio.resumo || '',
          conteudoRelatorio: relatorio.conteudoRelatorio,
        }, dataAnalise);
        
        const nomeLojaSlug = relatorio.nomeLoja.replace(/\s+/g, '_').toLowerCase();
        const dataSlug = dataFormatada.replace(/\//g, '-');
        const pdfFilename = `analise_fichas_${nomeLojaSlug}_${dataSlug}.pdf`;
        
        await sendEmail({
          to: emailDestino,
          subject: `Análise de Fichas de Serviço - ${relatorio.nomeLoja} - ${dataFormatada}`,
          html: htmlEmail,
          attachments: [{
            filename: pdfFilename,
            content: pdfBase64,
            contentType: 'application/pdf',
          }],
        });
        
        // Enviar cópia para o gestor
        const gestorUser = await db.getUserById(ctx.user.id);
        if (gestorUser?.email && gestorUser.email !== emailDestino) {
          try {
            // Adicionar nota de cópia no HTML
            const htmlCopia = htmlEmail.replace(
              '</body>',
              `<div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                <p style="margin: 0; color: #0369a1; font-size: 13px;">📋 Esta é uma cópia do relatório enviado para <strong>${emailDestino}</strong>.</p>
              </div>
              </body>`
            );
            
            await sendEmail({
              to: gestorUser.email,
              subject: `[Cópia] Análise de Fichas de Serviço - ${relatorio.nomeLoja} - ${dataFormatada}`,
              html: htmlCopia,
              attachments: [{
                filename: pdfFilename,
                content: pdfBase64,
                contentType: 'application/pdf',
              }],
            });
            console.log(`[Email] Cópia enviada para gestor: ${gestorUser.email}`);
          } catch (e) {
            console.error(`[Email] Erro ao enviar cópia para gestor:`, e);
          }
        }
        
        // Marcar como enviado
        await db.marcarRelatorioEnviado(input.relatorioId);
        
        return { success: true, emailEnviado: emailDestino, copiaEnviada: gestorUser?.email };
      }),
    
    // Enviar múltiplos relatórios por email
    enviarEmails: gestorProcedure
      .input(z.object({ 
        relatorioIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas gestores podem enviar relatórios' });
        }
        
        const resultados: Array<{ relatorioId: number; sucesso: boolean; email?: string; erro?: string }> = [];
        
        for (const relatorioId of input.relatorioIds) {
          try {
            const relatorio = await db.getRelatorioAnaliseById(relatorioId);
            if (!relatorio) {
              resultados.push({ relatorioId, sucesso: false, erro: 'Relatório não encontrado' });
              continue;
            }
            
            const analise = await db.getAnaliseById(relatorio.analiseId);
            if (!analise || analise.gestorId !== ctx.gestor.id) {
              resultados.push({ relatorioId, sucesso: false, erro: 'Sem permissão' });
              continue;
            }
            
            // Obter email da loja
            let emailDestino: string | undefined;
            if (relatorio.lojaId) {
              const loja = await db.getLojaById(relatorio.lojaId);
              emailDestino = loja?.email || undefined;
            }
            
            if (!emailDestino) {
              resultados.push({ relatorioId, sucesso: false, erro: 'Loja sem email configurado' });
              continue;
            }
            
            // Gerar HTML completo do email
            const dataAnalise = new Date(analise.dataUpload);
            const dataFormatada = dataAnalise.toLocaleDateString('pt-PT');
            
            const htmlEmail = gerarHTMLEmailAnalise({
              nomeLoja: relatorio.nomeLoja,
              numeroLoja: relatorio.numeroLoja,
              totalFichas: relatorio.totalFichas,
              fichasAbertas5Dias: relatorio.fichasAbertas5Dias,
              fichasAposAgendamento: relatorio.fichasAposAgendamento,
              fichasStatusAlerta: relatorio.fichasStatusAlerta,
              fichasSemNotas: relatorio.fichasSemNotas,
              fichasNotasAntigas: relatorio.fichasNotasAntigas,
              fichasDevolverVidro: relatorio.fichasDevolverVidro,
              fichasSemEmailCliente: relatorio.fichasSemEmailCliente,
              resumo: relatorio.resumo || '',
              conteudoRelatorio: relatorio.conteudoRelatorio,
            }, dataAnalise);
            
            // Gerar PDF do relatório
            const { gerarPDFAnaliseFichas } = await import('./pdfAnaliseFichas');
            const pdfBase64 = await gerarPDFAnaliseFichas({
              nomeLoja: relatorio.nomeLoja,
              numeroLoja: relatorio.numeroLoja,
              totalFichas: relatorio.totalFichas,
              fichasAbertas5Dias: relatorio.fichasAbertas5Dias,
              fichasAposAgendamento: relatorio.fichasAposAgendamento,
              fichasStatusAlerta: relatorio.fichasStatusAlerta,
              fichasSemNotas: relatorio.fichasSemNotas,
              fichasNotasAntigas: relatorio.fichasNotasAntigas,
              fichasDevolverVidro: relatorio.fichasDevolverVidro,
              fichasSemEmailCliente: relatorio.fichasSemEmailCliente,
              resumo: relatorio.resumo || '',
              conteudoRelatorio: relatorio.conteudoRelatorio,
            }, dataAnalise);
            
            const nomeLojaSlug = relatorio.nomeLoja.replace(/\s+/g, '_').toLowerCase();
            const dataSlug = dataFormatada.replace(/\//g, '-');
            const pdfFilename = `analise_fichas_${nomeLojaSlug}_${dataSlug}.pdf`;
            
            await sendEmail({
              to: emailDestino,
              subject: `Análise de Fichas de Serviço - ${relatorio.nomeLoja} - ${dataFormatada}`,
              html: htmlEmail,
              attachments: [{
                filename: pdfFilename,
                content: pdfBase64,
                contentType: 'application/pdf',
              }],
            });
            
            await db.marcarRelatorioEnviado(relatorioId);
            resultados.push({ relatorioId, sucesso: true, email: emailDestino });
          } catch (error) {
            resultados.push({ relatorioId, sucesso: false, erro: String(error) });
          }
        }
        
        // Enviar cópia consolidada para o gestor (apenas uma vez com todos os relatórios)
        const gestorUser = await db.getUserById(ctx.user.id);
        const emailsEnviados = resultados.filter(r => r.sucesso).map(r => r.email);
        
        if (gestorUser?.email && emailsEnviados.length > 0) {
          try {
            const lojasEnviadas = resultados.filter(r => r.sucesso).length;
            
            await sendEmail({
              to: gestorUser.email,
              subject: `[Cópia] Análise de Fichas de Serviço - ${lojasEnviadas} loja(s) - ${new Date().toLocaleDateString('pt-PT')}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family: 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
                  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <span style="font-size: 28px; font-weight: 700;">
                        <span style="color: #e53935; font-style: italic;">EXPRESS</span><span style="color: #1a365d;">GLASS</span>
                      </span>
                    </div>
                    
                    <h2 style="color: #333; margin-bottom: 20px;">Relatórios de Análise de Fichas Enviados</h2>
                    
                    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                      <p style="margin: 0; color: #0369a1;">📋 Esta é uma confirmação de que os relatórios foram enviados com sucesso.</p>
                    </div>
                    
                    <h3 style="color: #666; font-size: 16px;">Lojas que receberam o relatório:</h3>
                    <ul style="color: #333;">
                      ${emailsEnviados.map(email => `<li>${email}</li>`).join('')}
                    </ul>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 30px; text-align: center;">
                      PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
                    </p>
                  </div>
                </body>
                </html>
              `,
            });
            console.log(`[Email] Cópia consolidada enviada para gestor: ${gestorUser.email}`);
          } catch (e) {
            console.error(`[Email] Erro ao enviar cópia consolidada para gestor:`, e);
          }
        }
        
        return { resultados, copiaEnviada: gestorUser?.email };
      }),
    
    // Diagnóstico da análise - mostra estado das fichas guardadas e comparação
    diagnostico: gestorProcedure
      .input(z.object({ analiseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const analise = await db.getAnaliseById(input.analiseId);
        if (!analise) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Análise não encontrada' });
        }
        
        // Verificar permissão (admin ou dono da análise)
        if (ctx.user.role !== 'admin') {
          if (!ctx.gestor || analise.gestorId !== ctx.gestor.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
          }
        }
        
        const diagnostico = await db.getDiagnosticoAnalise(input.analiseId);
        
        // Obter relatórios desta análise para contar fichas esperadas
        const relatorios = await db.getRelatoriosByAnaliseId(input.analiseId);
        const totalFichasEsperadas = relatorios.reduce((acc, r) => {
          return acc + (r.fichasAbertas5Dias || 0) + (r.fichasAposAgendamento || 0) + 
            (r.fichasStatusAlerta || 0) + (r.fichasSemNotas || 0) + 
            (r.fichasNotasAntigas || 0) + (r.fichasDevolverVidro || 0) + 
            (r.fichasSemEmailCliente || 0);
        }, 0);
        
        return {
          analiseId: input.analiseId,
          dataAnalise: analise.createdAt,
          totalRelatorios: relatorios.length,
          totalFichasEsperadas,
          ...diagnostico,
          percentagemGuardada: totalFichasEsperadas > 0 
            ? Math.round((diagnostico.totalFichasGuardadas / totalFichasEsperadas) * 100) 
            : 0,
        };
      }),
  }),
  
  // ==================== DASHBOARD VOLANTE ====================
  dashboardVolante: router({
    // Estatísticas avançadas com filtros temporais
    estatisticasAvancadas: protectedProcedure
      .input(z.object({
        dataInicio: z.string().optional(), // ISO date
        dataFim: z.string().optional(), // ISO date
        gestorId: z.number().optional(), // Para admin filtrar por gestor
      }))
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === 'admin';
        const isGestor = ctx.user.role === 'gestor';
        
        if (!isAdmin && !isGestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
        }
        
        // Se é gestor, buscar suas lojas
        let lojasIds: number[] = [];
        if (isGestor) {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (gestor) {
            const lojas = await db.getLojasByGestorId(gestor.id);
            lojasIds = lojas.map(l => l.id);
          }
        }
        
        // Definir período padrão (últimos 30 dias)
        const dataFim = input.dataFim ? new Date(input.dataFim) : new Date();
        const dataInicio = input.dataInicio ? new Date(input.dataInicio) : new Date(dataFim.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Buscar todos os relatórios do período
        const relatoriosLivres = await db.getAllRelatoriosLivres();
        const relatoriosCompletos = await db.getAllRelatoriosCompletos();
        const pendentes = await db.getAllPendentes();
        
        // Filtrar por data e lojas (se gestor)
        const relLivresFiltrados = relatoriosLivres.filter(r => {
          const data = new Date(r.createdAt);
          const dentroData = data >= dataInicio && data <= dataFim;
          const dentrLojas = isAdmin || lojasIds.includes(r.lojaId);
          return dentroData && dentrLojas;
        });
        
        const relCompletosFiltrados = relatoriosCompletos.filter(r => {
          const data = new Date(r.createdAt);
          const dentroData = data >= dataInicio && data <= dataFim;
          const dentrLojas = isAdmin || lojasIds.includes(r.lojaId);
          return dentroData && dentrLojas;
        });
        
        const pendentesFiltrados = pendentes.filter(p => {
          const data = new Date(p.createdAt);
          const dentroData = data >= dataInicio && data <= dataFim;
          const dentrLojas = isAdmin || lojasIds.includes(p.lojaId);
          return dentroData && dentrLojas;
        });
        
        // Calcular estatísticas
        const totalVisitas = relLivresFiltrados.length + relCompletosFiltrados.length;
        const totalPendentes = pendentesFiltrados.length;
        const pendentesResolvidos = pendentesFiltrados.filter(p => p.resolvido).length;
        const pendentesPendentes = totalPendentes - pendentesResolvidos;
        const taxaResolucao = totalPendentes > 0 ? (pendentesResolvidos / totalPendentes) * 100 : 0;
        
        // Agrupar visitas por loja
        const visitasPorLoja: Record<number, { lojaId: number; lojaNome: string; visitas: number }> = {};
        for (const rel of relLivresFiltrados) {
          if (!visitasPorLoja[rel.lojaId]) {
            const loja = await db.getLojaById(rel.lojaId);
            visitasPorLoja[rel.lojaId] = { lojaId: rel.lojaId, lojaNome: loja?.nome || 'Desconhecida', visitas: 0 };
          }
          visitasPorLoja[rel.lojaId].visitas++;
        }
        for (const rel of relCompletosFiltrados) {
          if (!visitasPorLoja[rel.lojaId]) {
            const loja = await db.getLojaById(rel.lojaId);
            visitasPorLoja[rel.lojaId] = { lojaId: rel.lojaId, lojaNome: loja?.nome || 'Desconhecida', visitas: 0 };
          }
          visitasPorLoja[rel.lojaId].visitas++;
        }
        
        // Agrupar pendentes por loja
        const pendentesPorLoja: Record<number, { lojaId: number; lojaNome: string; pendentes: number; resolvidos: number }> = {};
        for (const pend of pendentesFiltrados) {
          if (!pendentesPorLoja[pend.lojaId]) {
            const loja = await db.getLojaById(pend.lojaId);
            pendentesPorLoja[pend.lojaId] = { lojaId: pend.lojaId, lojaNome: loja?.nome || 'Desconhecida', pendentes: 0, resolvidos: 0 };
          }
          pendentesPorLoja[pend.lojaId].pendentes++;
          if (pend.resolvido) pendentesPorLoja[pend.lojaId].resolvidos++;
        }
        
        // Top 5 lojas mais visitadas
        const topLojasVisitadas = Object.values(visitasPorLoja)
          .sort((a, b) => b.visitas - a.visitas)
          .slice(0, 5);
        
        // Top 5 lojas com mais pendentes
        const topLojasPendentes = Object.values(pendentesPorLoja)
          .sort((a, b) => (b.pendentes - b.resolvidos) - (a.pendentes - a.resolvidos))
          .slice(0, 5)
          .map(l => ({ ...l, pendentesPendentes: l.pendentes - l.resolvidos }));
        
        // Evolução temporal (por semana)
        const semanas: Record<string, { semana: string; visitas: number; pendentes: number }> = {};
        const getWeekKey = (date: Date) => {
          const year = date.getFullYear();
          const week = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
          return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-S${week}`;
        };
        
        for (const rel of [...relLivresFiltrados, ...relCompletosFiltrados]) {
          const key = getWeekKey(new Date(rel.createdAt));
          if (!semanas[key]) semanas[key] = { semana: key, visitas: 0, pendentes: 0 };
          semanas[key].visitas++;
        }
        
        for (const pend of pendentesFiltrados) {
          const key = getWeekKey(new Date(pend.createdAt));
          if (!semanas[key]) semanas[key] = { semana: key, visitas: 0, pendentes: 0 };
          semanas[key].pendentes++;
        }
        
        const evolucaoTemporal = Object.values(semanas).sort((a, b) => a.semana.localeCompare(b.semana));
        
        // Distribuição de tipos de relatórios
        const tiposRelatorios = {
          livres: relLivresFiltrados.length,
          completos: relCompletosFiltrados.length,
        };
        
        return {
          periodo: { dataInicio: dataInicio.toISOString(), dataFim: dataFim.toISOString() },
          resumo: {
            totalVisitas,
            totalPendentes,
            pendentesResolvidos,
            pendentesPendentes,
            taxaResolucao: Math.round(taxaResolucao * 10) / 10,
          },
          rankings: {
            topLojasVisitadas,
            topLojasPendentes,
          },
          graficos: {
            evolucaoTemporal,
            tiposRelatorios,
            visitasPorLoja: Object.values(visitasPorLoja),
            pendentesPorLoja: Object.values(pendentesPorLoja),
          },
        };
      }),
    
    // Exportar dashboard para PDF
    exportarPDF: protectedProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === 'admin';
        const isGestor = ctx.user.role === 'gestor';
        
        if (!isAdmin && !isGestor) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
        }
        
        // Buscar estatísticas (reutilizar lógica)
        let lojasIds: number[] = [];
        if (isGestor) {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (gestor) {
            const lojas = await db.getLojasByGestorId(gestor.id);
            lojasIds = lojas.map(l => l.id);
          }
        }
        
        const dataFim = input.dataFim ? new Date(input.dataFim) : new Date();
        const dataInicio = input.dataInicio ? new Date(input.dataInicio) : new Date(dataFim.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const relatoriosLivres = await db.getAllRelatoriosLivres();
        const relatoriosCompletos = await db.getAllRelatoriosCompletos();
        const pendentes = await db.getAllPendentes();
        
        const relLivresFiltrados = relatoriosLivres.filter(r => {
          const data = new Date(r.createdAt);
          return data >= dataInicio && data <= dataFim && (isAdmin || lojasIds.includes(r.lojaId));
        });
        
        const relCompletosFiltrados = relatoriosCompletos.filter(r => {
          const data = new Date(r.createdAt);
          return data >= dataInicio && data <= dataFim && (isAdmin || lojasIds.includes(r.lojaId));
        });
        
        const pendentesFiltrados = pendentes.filter(p => {
          const data = new Date(p.createdAt);
          return data >= dataInicio && data <= dataFim && (isAdmin || lojasIds.includes(p.lojaId));
        });
        
        const totalVisitas = relLivresFiltrados.length + relCompletosFiltrados.length;
        const totalPendentes = pendentesFiltrados.length;
        const pendentesResolvidos = pendentesFiltrados.filter(p => p.resolvido).length;
        const pendentesPendentes = totalPendentes - pendentesResolvidos;
        const taxaResolucao = totalPendentes > 0 ? (pendentesResolvidos / totalPendentes) * 100 : 0;
        
        const visitasPorLoja: Record<number, { lojaId: number; lojaNome: string; visitas: number }> = {};
        for (const rel of [...relLivresFiltrados, ...relCompletosFiltrados]) {
          if (!visitasPorLoja[rel.lojaId]) {
            const loja = await db.getLojaById(rel.lojaId);
            visitasPorLoja[rel.lojaId] = { lojaId: rel.lojaId, lojaNome: loja?.nome || 'Desconhecida', visitas: 0 };
          }
          visitasPorLoja[rel.lojaId].visitas++;
        }
        
        const pendentesPorLoja: Record<number, { lojaId: number; lojaNome: string; pendentes: number; resolvidos: number }> = {};
        for (const pend of pendentesFiltrados) {
          if (!pendentesPorLoja[pend.lojaId]) {
            const loja = await db.getLojaById(pend.lojaId);
            pendentesPorLoja[pend.lojaId] = { lojaId: pend.lojaId, lojaNome: loja?.nome || 'Desconhecida', pendentes: 0, resolvidos: 0 };
          }
          pendentesPorLoja[pend.lojaId].pendentes++;
          if (pend.resolvido) pendentesPorLoja[pend.lojaId].resolvidos++;
        }
        
        const topLojasVisitadas = Object.values(visitasPorLoja)
          .sort((a, b) => b.visitas - a.visitas)
          .slice(0, 5);
        
        const topLojasPendentes = Object.values(pendentesPorLoja)
          .sort((a, b) => (b.pendentes - b.resolvidos) - (a.pendentes - a.resolvidos))
          .slice(0, 5)
          .map(l => ({ ...l, pendentesPendentes: l.pendentes - l.resolvidos }));
        
        // Gerar PDF
        const { gerarPDFDashboardVolante } = await import('./pdfDashboardVolante');
        const pdfBuffer = await gerarPDFDashboardVolante({
          periodo: { dataInicio: dataInicio.toISOString(), dataFim: dataFim.toISOString() },
          resumo: {
            totalVisitas,
            totalPendentes,
            pendentesResolvidos,
            pendentesPendentes,
            taxaResolucao: Math.round(taxaResolucao * 10) / 10,
          },
          rankings: {
            topLojasVisitadas,
            topLojasPendentes,
          },
        });
        
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `dashboard_volante_${dataInicio.toISOString().split('T')[0]}_${dataFim.toISOString().split('T')[0]}.pdf`,
        };
      }),
  }),

  // ==================== DOCUMENTOS/CIRCULARES ====================
  documentos: router({
    // Listar documentos (gestores veem todos os seus, lojas veem os que lhes foram atribuídos)
    listar: protectedProcedure.query(async ({ ctx }) => {
      const documentos = await db.getDocumentos(ctx.user.id, ctx.user.role);
      return documentos;
    }),

    // Listar documentos por loja (para Portal da Loja)
    listarPorLoja: publicProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        const documentos = await db.getDocumentosPorLoja(input.lojaId);
        return documentos;
      }),

    // Upload de documento (apenas gestores)
    upload: gestorProcedure
      .input(z.object({
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        fileData: z.string(), // Base64
        fileName: z.string(),
        fileSize: z.number(),
        targetLojas: z.array(z.number()).optional(), // null = todas as lojas
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import('./storage');
        
        // Upload para S3
        const fileBuffer = Buffer.from(input.fileData, 'base64');
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `documentos/${ctx.gestor!.id}/${randomSuffix}-${input.fileName}`;
        
        const { url } = await storagePut(fileKey, fileBuffer, 'application/pdf');
        
        // Guardar na BD
        const documento = await db.createDocumento({
          titulo: input.titulo,
          descricao: input.descricao || null,
          fileUrl: url,
          fileKey,
          fileName: input.fileName,
          fileSize: input.fileSize,
          createdBy: ctx.user.id,
          targetLojas: input.targetLojas ? JSON.stringify(input.targetLojas) : null,
        });
        
        return documento;
      }),

    // Editar documento (apenas gestor que criou)
    editar: gestorProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        targetLojas: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const documento = await db.getDocumentoById(input.id);
        if (!documento) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado' });
        }
        
        if (documento.createdBy !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
        }
        
        await db.updateDocumento(input.id, {
          titulo: input.titulo,
          descricao: input.descricao || null,
          targetLojas: input.targetLojas ? JSON.stringify(input.targetLojas) : null,
        });
        
        return { success: true };
      }),

    // Eliminar documento (apenas gestor que criou)
    eliminar: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const documento = await db.getDocumentoById(input.id);
        if (!documento) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado' });
        }
        
        if (documento.createdBy !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
        }
        
        // Eliminar do S3 (opcional, pode falhar silenciosamente)
        try {
          const { storageDelete } = await import('./storage');
          await storageDelete(documento.fileKey);
        } catch (e) {
          console.warn('Erro ao eliminar ficheiro do S3:', e);
        }
        
        await db.deleteDocumento(input.id);
        return { success: true };
      }),
  }),

  // ==================== GESTÃO RECALIBRA ====================
  gestaoRecalibra: router({
    // Listar unidades com lojas e token (como Volante)
    listar: gestorProcedure.query(async ({ ctx }) => {
      let unidades;
      if (ctx.gestor) {
        unidades = await db.getUnidadesRecalibraByGestorId(ctx.gestor.id);
      } else if (ctx.user.role === 'admin') {
        unidades = await db.getAllUnidadesRecalibra();
      } else {
        return [];
      }
      
      // Para cada unidade, buscar lojas e token (como Volante faz)
      const unidadesCompletas = await Promise.all(
        unidades.map(async (unidade) => {
          const lojas = await db.getLojasByUnidadeRecalibraId(unidade.id);
          const tokenData = await db.getTokenRecalibra(unidade.id);
          return { ...unidade, lojas, token: tokenData?.token || null };
        })
      );
      
      return unidadesCompletas;
    }),

    // Criar unidade (como Volante - gestor cria para si)
    criar: gestorProcedure
      .input(z.object({
        nome: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
        }
        
        // Criar unidade para o gestor logado
        const unidade = await db.createUnidadeRecalibra({
          nome: input.nome,
          gestorId: ctx.gestor.id,
        });
        
        if (!unidade) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar unidade' });
        }
        
        // Auto-atribuir todas as lojas do gestor
        const minhasLojas = await db.getLojasByGestorId(ctx.gestor.id);
        const lojasIds = minhasLojas.map(l => l.id);
        await db.associarLojasUnidadeRecalibra(unidade.id, lojasIds);
        
        return unidade;
      }),

    // Atualizar unidade (nome, email, profissional, contacto e lojas)
    atualizar: gestorProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        email: z.string().email().optional().nullable(),
        profissionalNome: z.string().optional().nullable(),
        contacto: z.string().optional().nullable(),
        lojasIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
        }
        
        // Atualizar campos da unidade
        const updateData: Record<string, any> = {
          gestorId: ctx.gestor.id,
        };
        
        if (input.nome !== undefined) updateData.nome = input.nome;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.profissionalNome !== undefined) updateData.profissionalNome = input.profissionalNome;
        if (input.contacto !== undefined) updateData.contacto = input.contacto;
        
        await db.updateUnidadeRecalibra(input.id, updateData);
        
        if (input.lojasIds) {
          await db.associarLojasUnidadeRecalibra(input.id, input.lojasIds);
        }
        
        return { success: true };
      }),

    // Eliminar unidade
    eliminar: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
        }
        await db.deleteUnidadeRecalibra(input.id);
        return { success: true };
      }),

    // Gerar token
    gerarToken: gestorProcedure
      .input(z.object({ unidadeId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
        }
        const tokenStr = await db.generateTokenRecalibra(input.unidadeId);
        return { token: tokenStr };
      }),

    // Revogar token
    revogarToken: gestorProcedure
      .input(z.object({ unidadeId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.gestor) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Gestor não encontrado' });
        }
        await db.revokeTokenRecalibra(input.unidadeId);
        return { success: true };
      }),
  }),

  // ==================== PORTAL RECALIBRA ====================
  portalRecalibra: router({
    // Validar token e obter informações da unidade
    validarToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenRecalibra(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return tokenData;
      }),

    // Registar calibragem
    registarCalibragem: publicProcedure
      .input(z.object({
        token: z.string(),
        lojaId: z.number(),
        data: z.string(),
        matricula: z.string(),
        tipoCalibragem: z.enum(['DINÂMICA', 'ESTÁTICA', 'CORE']),
        marca: z.string().optional(),
        tipologiaViatura: z.enum(['LIGEIRO', 'PESADO']).default('LIGEIRO'),
        localidade: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenRecalibra(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const calibragem = await db.createCalibragem({
          unidadeId: tokenData.unidade.id,
          lojaId: input.lojaId,
          data: input.data,
          matricula: input.matricula,
          tipoCalibragem: input.tipoCalibragem,
          marca: input.marca,
          tipologiaViatura: input.tipologiaViatura,
          localidade: input.localidade,
          observacoes: input.observacoes,
        });
        
        return calibragem;
      }),

    // Listar calibragens da unidade
    listarCalibragens: publicProcedure
      .input(z.object({
        token: z.string(),
        mes: z.number().optional(),
        ano: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenRecalibra(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const calibragens = await db.getHistoricoCalibragens(
          tokenData.unidade.id,
          undefined,
          undefined,
          undefined
        );
        
        return calibragens;
      }),

    // Autocomplete de localidades
    pesquisarLocalidades: publicProcedure
      .input(z.object({ termo: z.string().default('') }))
      .query(async ({ input }) => {
        return db.pesquisarLocalidades(input.termo);
      }),

    // Autocomplete de marcas
    pesquisarMarcas: publicProcedure
      .input(z.object({ termo: z.string().default('') }))
      .query(async ({ input }) => {
        return db.pesquisarMarcas(input.termo);
      }),

    // Criar nova localidade (quando utilizador escreve nome completo novo)
    criarLocalidade: publicProcedure
      .input(z.object({ nome: z.string().min(2) }))
      .mutation(async ({ input }) => {
        return db.criarLocalidade(input.nome);
      }),

    // Criar nova marca (quando utilizador escreve nome completo novo)
    criarMarca: publicProcedure
      .input(z.object({ nome: z.string().min(1) }))
      .mutation(async ({ input }) => {
        return db.criarMarca(input.nome);
      }),

    // Editar calibragem
    editarCalibragem: publicProcedure
      .input(z.object({
        token: z.string(),
        calibragemId: z.number(),
        data: z.string().optional(),
        matricula: z.string().optional(),
        tipoCalibragem: z.enum(['DINÂMICA', 'ESTÁTICA', 'CORE']).optional(),
        marca: z.string().optional(),
        tipologiaViatura: z.enum(['LIGEIRO', 'PESADO']).optional(),
        localidade: z.string().optional(),
        observacoes: z.string().optional(),
        lojaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenRecalibra(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        // Verificar se a calibragem pertence à unidade
        const calibragens = await db.getHistoricoCalibragens(
          tokenData.unidade.id, undefined, undefined, undefined
        );
        const calibragem = calibragens.find((c: any) => c.id === input.calibragemId);
        if (!calibragem) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Calibragem não encontrada' });
        }
        // Atualizar usando getDb()
        const { getDb } = await import('./db');
        const { calibragens: calibragensTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        
        const updateData: Record<string, any> = {};
        if (input.data !== undefined) updateData.data = input.data;
        if (input.matricula !== undefined) updateData.matricula = input.matricula;
        if (input.tipoCalibragem !== undefined) updateData.tipoCalibragem = input.tipoCalibragem;
        if (input.marca !== undefined) updateData.marca = input.marca;
        if (input.tipologiaViatura !== undefined) updateData.tipologiaViatura = input.tipologiaViatura;
        if (input.localidade !== undefined) updateData.localidade = input.localidade;
        if (input.observacoes !== undefined) updateData.observacoes = input.observacoes;
        if (input.lojaId !== undefined) updateData.lojaId = input.lojaId;
        
        if (Object.keys(updateData).length > 0) {
          await drizzleDb.update(calibragensTable).set(updateData).where(eq(calibragensTable.id, input.calibragemId));
        }
        return { success: true };
      }),

    // Apagar calibragem
    apagarCalibragem: publicProcedure
      .input(z.object({ token: z.string(), calibragemId: z.number() }))
      .mutation(async ({ input }) => {
        const tokenData = await db.validateTokenRecalibra(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        // Buscar a calibragem e verificar se pertence à unidade
        const calibragens = await db.getHistoricoCalibragens(
          tokenData.unidade.id, undefined, undefined, undefined
        );
        const calibragem = calibragens.find((c: any) => c.id === input.calibragemId);
        if (!calibragem) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Calibragem não encontrada' });
        }
        // Apagar usando getDb()
        const { getDb } = await import('./db');
        const { calibragens: calibragensTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        await drizzleDb.delete(calibragensTable).where(eq(calibragensTable.id, input.calibragemId));
        return { success: true };
      }),

    // Estatísticas de calibragens para dashboard
    estatisticas: publicProcedure
      .input(z.object({ 
        token: z.string(),
        mesesSelecionados: z.array(z.string()).optional(), // formato 'YYYY-MM'
      }))
      .query(async ({ input }) => {
        const tokenData = await db.validateTokenRecalibra(input.token);
        if (!tokenData) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        let todasCalibragens = await db.getHistoricoCalibragens(
          tokenData.unidade.id,
          undefined,
          undefined,
          undefined
        );

        // Guardar todas as calibragens para evolução mensal (sem filtro)
        const todasCalibragensCompleto = [...todasCalibragens];

        // Filtrar por meses selecionados (apenas para stats gerais, não para evolução)
        if (input.mesesSelecionados && input.mesesSelecionados.length > 0) {
          todasCalibragens = todasCalibragens.filter((c: any) => {
            if (!c.data) return false;
            const mesAno = c.data.substring(0, 7); // 'YYYY-MM'
            return input.mesesSelecionados!.includes(mesAno);
          });
        }

        const total = todasCalibragens.length;

        // Por tipo
        const porTipo: Record<string, number> = {};
        todasCalibragens.forEach((c: any) => {
          const tipo = c.tipoCalibragem || 'Sem tipo';
          porTipo[tipo] = (porTipo[tipo] || 0) + 1;
        });

        // Por marca (usa TODAS as calibragens, sem filtro)
        const porMarca: Record<string, number> = {};
        todasCalibragensCompleto.forEach((c: any) => {
          const marca = c.marca || 'Sem marca';
          porMarca[marca] = (porMarca[marca] || 0) + 1;
        });

        // Por localidade
        const porLocalidade: Record<string, number> = {};
        todasCalibragens.forEach((c: any) => {
          const loc = c.localidade || 'Sem localidade';
          porLocalidade[loc] = (porLocalidade[loc] || 0) + 1;
        });

        // Loja mais visitada (apenas calibragens com loja associada)
        const porLoja: Record<string, number> = {};
        todasCalibragens.forEach((c: any) => {
          if (c.lojaId && c.loja?.nome) {
            const loja = c.loja.nome;
            porLoja[loja] = (porLoja[loja] || 0) + 1;
          }
        });
        const lojaEntries = Object.entries(porLoja).sort((a, b) => b[1] - a[1]);
        const lojaTopVisitada = lojaEntries.length > 0 ? { nome: lojaEntries[0][0], count: lojaEntries[0][1] } : null;

        // Evolução mensal (usa TODAS as calibragens, sem filtro)
        const evolucaoMensal: Record<string, number> = {};
        todasCalibragensCompleto.forEach((c: any) => {
          if (c.data) {
            const d = new Date(c.data);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            evolucaoMensal[key] = (evolucaoMensal[key] || 0) + 1;
          }
        });

        // Tipologia (Ligeiro/Pesado)
        const porTipologia: Record<string, number> = {};
        todasCalibragens.forEach((c: any) => {
          const tip = c.tipologiaViatura || 'LIGEIRO';
          porTipologia[tip] = (porTipologia[tip] || 0) + 1;
        });

        // Média diária
        const datasUnicas = new Set(todasCalibragens.map((c: any) => c.data).filter(Boolean));
        const mediaDiaria = datasUnicas.size > 0 ? (total / datasUnicas.size) : 0;

        return {
          total,
          porTipo,
          porMarca,
          porLocalidade,
          lojaTopVisitada,
          evolucaoMensal,
          porTipologia,
          mediaDiaria: Math.round(mediaDiaria * 10) / 10,
          totalDias: datasUnicas.size,
          unidadeNome: tokenData.unidade.nome,
        };
      }),
  }),

  // Relatórios - Histórico de Envios
  relatorios: router({
    getHistoricoEnvios: protectedProcedure
      .input(z.object({
        tipo: z.enum(['volante', 'recalibra']).optional(),
        anoReferencia: z.number().optional(),
        mesReferencia: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const historico = await db.getHistoricoEnviosRelatorios(input);
        return historico;
      }),
    
    // Endpoints de teste para executar manualmente os relatórios mensais
    executarRelatorioMensalVolante: adminProcedure
      .mutation(async () => {
        const { enviarRelatoriosMensaisVolante } = await import('./relatorioMensalVolante.js');
        const resultado = await enviarRelatoriosMensaisVolante();
        return resultado;
      }),
    
    executarRelatorioMensalRecalibra: adminProcedure
      .mutation(async () => {
        const { enviarRelatoriosMensaisRecalibra } = await import('./relatorioMensalRecalibra.js');
        const resultado = await enviarRelatoriosMensaisRecalibra();
        return resultado;
      }),
    
    // Executar lembrete diário de volantes manualmente
    executarLembreteVolantes: adminProcedure
      .mutation(async () => {
        const { executarLembreteVolantes } = await import('./scheduler.js');
        const resultado = await executarLembreteVolantes();
        return resultado;
      }),
  }),

  // ==================== NOTAS / DOSSIERS ====================
  notas: router({
    // Listar notas do utilizador
    listar: protectedProcedure
      .input(z.object({
        estado: z.string().optional(),
        lojaId: z.number().optional(),
        tagId: z.number().optional(),
        arquivada: z.boolean().optional(),
        pesquisa: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return db.listarNotas(ctx.user.id, input || {});
      }),

    // Obter nota por ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getNotaById(input.id, ctx.user.id);
      }),

    // Criar nota
    criar: protectedProcedure
      .input(z.object({
        titulo: z.string().min(1),
        conteudo: z.string().optional(),
        lojaId: z.number().nullable().optional(),
        estado: z.string().optional(),
        cor: z.string().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const notaId = await db.criarNota({
          titulo: input.titulo,
          conteudo: input.conteudo,
          lojaId: input.lojaId,
          userId: ctx.user.id,
          estado: input.estado,
          cor: input.cor,
        });
        if (notaId && input.tagIds && input.tagIds.length > 0) {
          await db.definirTagsNota(notaId, input.tagIds);
        }
        return { id: notaId };
      }),

    // Actualizar nota
    actualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        conteudo: z.string().optional(),
        lojaId: z.number().nullable().optional(),
        estado: z.string().optional(),
        cor: z.string().optional(),
        fixada: z.boolean().optional(),
        arquivada: z.boolean().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, tagIds, ...data } = input;
        await db.actualizarNota(id, ctx.user.id, data);
        if (tagIds !== undefined) {
          await db.definirTagsNota(id, tagIds);
        }
        return { success: true };
      }),

    // Eliminar nota
    eliminar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.eliminarNota(input.id, ctx.user.id);
        return { success: true };
      }),

    // Upload de imagem para nota
    uploadImagem: protectedProcedure
      .input(z.object({
        notaId: z.number(),
        base64: z.string(),
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, 'base64');
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const fileKey = `notas/${ctx.user.id}/${input.notaId}/${randomSuffix}-${input.filename}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const imagemId = await db.adicionarImagemNota({
          notaId: input.notaId,
          url,
          fileKey,
          filename: input.filename,
          mimeType: input.mimeType,
        });
        return { id: imagemId, url };
      }),

    // Remover imagem de nota
    removerImagem: protectedProcedure
      .input(z.object({ imagemId: z.number() }))
      .mutation(async ({ input }) => {
        await db.removerImagemNota(input.imagemId);
        return { success: true };
      }),

    // Listar tags do utilizador
    listarTags: protectedProcedure
      .query(async ({ ctx }) => {
        return db.listarTags(ctx.user.id);
      }),

    // Criar tag
    criarTag: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        cor: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tagId = await db.criarTag({
          nome: input.nome,
          cor: input.cor,
          userId: ctx.user.id,
        });
        return { id: tagId };
      }),

    // Eliminar tag
    eliminarTag: protectedProcedure
      .input(z.object({ tagId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.eliminarTag(input.tagId, ctx.user.id);
        return { success: true };
      }),
  }),

  // ==================== NOTAS DA LOJA ====================
  notasLoja: router({
    // Listar notas de uma loja
    listar: publicProcedure
      .input(z.object({
        token: z.string(),
        incluirArquivadas: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED' });
        return db.listarNotasLoja(auth.loja.id, input.incluirArquivadas || false);
      }),

    // Criar nota
    criar: publicProcedure
      .input(z.object({
        token: z.string(),
        titulo: z.string().min(1),
        conteudo: z.string().optional(),
        tema: z.enum(['stock', 'procedimentos', 'administrativo', 'recursos_humanos', 'ausencias', 'reunioes', 'clientes', 'geral']).optional(),
        cor: z.string().max(20).optional(), // Cor hex livre
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const id = await db.criarNotaLoja({
          lojaId: auth.loja.id,
          titulo: input.titulo,
          conteudo: input.conteudo,
          tema: input.tema || 'geral',
          cor: input.cor,
          criadoPor: auth.loja.nome,
        });
        return { id };
      }),

    // Actualizar nota
    actualizar: publicProcedure
      .input(z.object({
        token: z.string(),
        id: z.number(),
        titulo: z.string().optional(),
        conteudo: z.string().optional(),
        tema: z.enum(['stock', 'procedimentos', 'administrativo', 'recursos_humanos', 'ausencias', 'reunioes', 'clientes', 'geral']).optional(),
        cor: z.string().max(20).optional(), // Cor hex livre
        fixada: z.boolean().optional(),
        arquivada: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const { token, id, ...data } = input;
        await db.actualizarNotaLoja(id, auth.loja.id, data);
        return { success: true };
      }),

    // Eliminar nota
    eliminar: publicProcedure
      .input(z.object({
        token: z.string(),
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED' });
        await db.eliminarNotaLoja(input.id, auth.loja.id);
        return { success: true };
      }),
  }),

  // ==================== RECEPÇÃO DE VIDROS ====================
  vidros: router({
    // Scan de etiqueta: upload foto + OCR via IA
    scanEtiqueta: publicProcedure
      .input(z.object({
        token: z.string(),
        base64Foto: z.string(),
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Validar token da loja
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }

        // 1. Upload da foto para S3
        console.log('[Vidros] base64Foto length:', input.base64Foto?.length);
        const buffer = Buffer.from(input.base64Foto, 'base64');
        console.log('[Vidros] Buffer length after decode:', buffer.length);
        if (buffer.length < 100) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A foto capturada está vazia. Tente novamente ou use "Escolher Foto".' });
        }
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const fileKey = `vidros/${auth.loja.id}/${Date.now()}-${randomSuffix}-${input.filename}`;
        const { url: fotoUrl } = await storagePut(fileKey, buffer, input.mimeType);

        // 2. Enviar foto para IA para OCR
        const { invokeLLM } = await import('./_core/llm');
        console.log('[Vidros] A enviar foto para IA, URL:', fotoUrl);
        
        let ocrResult: any;
        try {
          ocrResult = await invokeLLM({
            messages: [
              {
                role: 'user',
                content: [
                  { 
                    type: 'text', 
                    text: `Analisa esta etiqueta de transporte de materiais automóvel (vidros, frisos, acessórios). Extrai os seguintes dados e responde APENAS com JSON válido (sem markdown, sem \`\`\`):

{
  "destinatario": "nome completo do destinatário (campo DESTINATÁRIO)",
  "eurocodes": ["lista de todos os Eurocodes encontrados"],
  "numeroPedido": "número do pedido (campo PEDIDO)",
  "codAT": "código AT (campo COD AT nas observações)",
  "encomenda": "referência da encomenda com número e data (campo Encomendas Cliente ou OBS:Encomendas)",
  "leitRef": "referência LEIT completa se existir",
  "pickLabels": "PICK_LABELS completo se existir",
  "observacoesCompletas": "texto completo das observações"
}

REGRAS PARA EUROCODES:
- Os Eurocodes são códigos alfanuméricos que identificam peças (vidros, frisos, etc.)
- Podem aparecer em vários locais: campo LEIT (ex: 1018/3733AGN → eurocode é 3733AGN), campo PICK_LABELS (ex: 0526/2488ASGRT → eurocode é 2488ASGRT), ou noutros campos
- O formato típico é: números seguidos de letras (ex: 3733AGN, 2488ASGRT, 2488AGACMVZ)
- Extrai TODOS os eurocodes encontrados na etiqueta como array
- Se houver PICK_LABELS com formato XXXX/YYYYZZZ, o eurocode é a parte YYYYZZZ (após a barra)

Se não conseguires ler algum campo, coloca string vazia "" ou array vazio [].` 
                  },
                  { type: 'image_url', image_url: { url: fotoUrl, detail: 'high' } }
                ]
              }
            ],
          });
        } catch (llmError) {
          console.error('[Vidros] Erro na chamada LLM:', llmError);
          ocrResult = { choices: [{ message: { content: '{}' } }] };
        }

        let dadosExtraidos: any = {};
        try {
          let rawContent = ocrResult.choices[0]?.message?.content;
          console.log('[Vidros] OCR raw content:', rawContent);
          
          if (typeof rawContent === 'string') {
            rawContent = rawContent.trim();
            // Limpar markdown code blocks se existirem
            if (rawContent.startsWith('```')) {
              rawContent = rawContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
            }
            rawContent = rawContent.trim();
            dadosExtraidos = JSON.parse(rawContent);
          }
          console.log('[Vidros] Dados extraidos:', JSON.stringify(dadosExtraidos));
        } catch (e) {
          console.error('[Vidros] Erro ao parsear resposta OCR:', e);
          console.error('[Vidros] Raw content was:', ocrResult?.choices?.[0]?.message?.content);
        }

        // 3. Procurar mapeamento de destinatário
        let destinatarioId: number | null = null;
        let lojaDestinoId: number | null = null;
        let estado: string = 'recebido';

        if (dadosExtraidos.destinatario) {
          const destinatario = await db.procurarDestinatarioVidro(dadosExtraidos.destinatario);
          if (destinatario) {
            destinatarioId = destinatario.id;
            lojaDestinoId = destinatario.lojaId;
            if (!lojaDestinoId) {
              estado = 'pendente_associacao';
            }
          } else {
            // Criar novo registo de destinatário (sem loja associada)
            destinatarioId = await db.criarDestinatarioVidro({
              nomeEtiqueta: dadosExtraidos.destinatario,
            });
            estado = 'pendente_associacao';
          }
        }

        // 4. Registar vidro na BD
        const vidroId = await db.registarVidro({
          destinatarioRaw: dadosExtraidos.destinatario || null,
          eurocode: Array.isArray(dadosExtraidos.eurocodes) && dadosExtraidos.eurocodes.length > 0
            ? dadosExtraidos.eurocodes.join(', ')
            : (dadosExtraidos.eurocode || null),
          numeroPedido: dadosExtraidos.numeroPedido || null,
          codAT: dadosExtraidos.codAT || null,
          encomenda: dadosExtraidos.encomenda || null,
          leitRef: dadosExtraidos.leitRef || null,
          observacoesEtiqueta: dadosExtraidos.observacoesCompletas || null,
          fotoUrl,
          fotoKey: fileKey,
          destinatarioId: destinatarioId ?? undefined,
          lojaScanId: auth.loja.id,
          lojaDestinoId: lojaDestinoId ?? undefined,
          estado,
          registadoPorToken: input.token,
        });

        return {
          id: vidroId,
          dadosExtraidos,
          fotoUrl,
          destinatarioMapeado: !!lojaDestinoId,
          lojaDestinoId,
          estado,
        };
      }),

    // Listar vidros da loja (Portal da Loja via token)
    listarPorLoja: publicProcedure
      .input(z.object({
        token: z.string(),
        limite: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return db.listarVidrosPorLoja(auth.loja.id, input.limite);
      }),

    // Contar vidros da loja (para badge)
    contarPorLoja: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        return db.contarVidrosPorLoja(auth.loja.id);
      }),

    // Confirmar recepção de vidro (loja destino confirma)
    confirmarRecepcao: publicProcedure
      .input(z.object({
        token: z.string(),
        vidroId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        await db.actualizarVidro(input.vidroId, { estado: 'confirmado' });
        return { success: true };
      }),

    // === ADMIN: Gestão de mapeamentos ===
    
    // Listar todos os destinatários mapeados
    listarDestinatarios: protectedProcedure
      .query(async () => {
        return db.listarDestinatariosVidros();
      }),

    // Associar destinatário a loja
    associarDestinatario: protectedProcedure
      .input(z.object({
        destinatarioId: z.number(),
        lojaId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.actualizarDestinatarioVidro(input.destinatarioId, input.lojaId);
        // Actualizar vidros pendentes deste destinatário
        const actualizados = await db.actualizarVidrosPendentesDestinatario(input.destinatarioId, input.lojaId);
        return { success: true, vidrosActualizados: actualizados };
      }),

    // Eliminar mapeamento de destinatário
    eliminarDestinatario: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.eliminarDestinatarioVidro(input.id);
        return { success: true };
      }),

    // Listar todos os vidros (admin)
    listarTodos: protectedProcedure
      .input(z.object({
        lojaId: z.number().optional(),
        estado: z.string().optional(),
        limite: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listarTodosVidros(input || {});
      }),

    // Listar vidros pendentes de associação
    listarPendentes: protectedProcedure
      .query(async () => {
        return db.listarVidrosPendentesAssociacao();
      }),

    // Actualizar vidro (admin - corrigir dados, associar loja)
    actualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        lojaDestinoId: z.number().nullable().optional(),
        destinatarioId: z.number().nullable().optional(),
        estado: z.string().optional(),
        eurocode: z.string().optional(),
        numeroPedido: z.string().optional(),
        codAT: z.string().optional(),
        encomenda: z.string().optional(),
        leitRef: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.actualizarVidro(id, data);
        return { success: true };
      }),

    eliminar: publicProcedure
      .input(z.object({ token: z.string(), vidroId: z.number() }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        await db.eliminarVidro(input.vidroId);
        return { success: true };
      }),
  }),

  // ==================== CONTROLO DE STOCK ====================
  stock: router({
    // Obter info da última análise de fichas (para saber se há eurocodes disponíveis)
    infoAnalise: gestorProcedure
      .input(z.object({
        gestorIdSelecionado: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        let gestorId = ctx.gestor?.id;
        if (ctx.user.role === 'admin' && input.gestorIdSelecionado) {
          gestorId = input.gestorIdSelecionado;
        }
        if (!gestorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        
        const ultimaAnalise = await db.getUltimaAnaliseFichas(gestorId);
        if (!ultimaAnalise) return { temAnalise: false, dataAnalise: null, totalEurocodes: 0, analiseId: null };
        
        const eurocodes = await db.getEurocodesUltimaAnalise(gestorId);
        return {
          temAnalise: true,
          dataAnalise: ultimaAnalise.createdAt,
          totalEurocodes: eurocodes.length,
          analiseId: ultimaAnalise.id,
        };
      }),

    // Obter eurocodes por loja da última análise
    eurocodesPorLoja: gestorProcedure
      .input(z.object({
        lojaId: z.number(),
        gestorIdSelecionado: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        let gestorId = ctx.gestor?.id;
        if (ctx.user.role === 'admin' && input.gestorIdSelecionado) {
          gestorId = input.gestorIdSelecionado;
        }
        if (!gestorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        
        return db.getEurocodesUltimaAnalisePorLoja(gestorId, input.lojaId);
      }),

    // Analisar stock: recebe texto colado, parseia, cruza com eurocodes das fichas
    analisar: gestorProcedure
      .input(z.object({
        textoStock: z.string(),
        lojaId: z.number(),
        nomeLoja: z.string(),
        gestorIdSelecionado: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let gestorId = ctx.gestor?.id;
        if (ctx.user.role === 'admin' && input.gestorIdSelecionado) {
          gestorId = input.gestorIdSelecionado;
        }
        if (!gestorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        
        // 1. Parsear o texto colado do stock
        let linhas = input.textoStock.split('\n').filter(l => l.trim());
        const categoriasPermitidas = ['OC', 'PB', 'TE', 'VL', 'VP'];
        
        // Ignorar header se presente
        if (linhas.length > 0 && /^\s*(Familia|Ref|Design|Stock)/i.test(linhas[0])) {
          linhas = linhas.slice(1);
        }
        
        interface ItemStock {
          ref: string;
          descricao: string;
          quantidade: number;
          familia?: string;
        }
        
        const itensStock: ItemStock[] = [];
        
        for (const linha of linhas) {
          // Tentar parsear: pode ter 3 colunas (Ref, Design, Exp) ou 4 (Familia, Ref, Design, Exp)
          const partes = linha.split('\t');
          
          if (partes.length >= 3) {
            let ref: string, descricao: string, qtdStr: string, familia: string | undefined;
            
            if (partes.length >= 4) {
              // 4+ colunas: Familia, Ref, Design, Exp
              familia = partes[0].trim().toUpperCase();
              ref = partes[1].trim();
              descricao = partes[2].trim();
              qtdStr = partes[3].trim();
            } else {
              // 3 colunas: Ref, Design, Exp
              ref = partes[0].trim();
              descricao = partes[1].trim();
              qtdStr = partes[2].trim();
            }
            
            // Parsear quantidade (pode ter vírgula decimal)
            const quantidade = parseFloat(qtdStr.replace(',', '.')) || 0;
            if (quantidade < 1) continue; // Excluir quantidade < 1
            
            // Se tem família, filtrar
            if (familia && !categoriasPermitidas.includes(familia)) continue;
            
            // Se não tem família, tentar inferir pelo código
            if (!familia) {
              // Inferir família pelo padrão do código
              const refUpper = ref.toUpperCase();
              if (/AGS|AGAC|AGN|AGSM|AGSH|AGST|AGSV|AGSMVZ|AGACMVZ/.test(refUpper)) familia = 'PB';
              else if (/BGS|OCL|OC/.test(refUpper)) familia = 'OC';
              else if (/RGS|LGS|VVL|VL/.test(refUpper)) familia = 'VL';
              else if (/VPL|VQL|VP/.test(refUpper)) familia = 'VP';
              else if (/TET|TE/.test(refUpper)) familia = 'TE';
              // Se não conseguiu inferir, incluir mesmo assim
            }
            
            itensStock.push({ ref, descricao, quantidade, familia });
          }
        }
        
        if (itensStock.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não foi possível extrair itens de stock do texto colado. Verifique o formato.' });
        }
        
        // 2. Obter eurocodes das fichas para a loja
        const eurocodesFichasLoja = await db.getEurocodesUltimaAnalisePorLoja(gestorId, input.lojaId);
        const ultimaAnalise = await db.getUltimaAnaliseFichas(gestorId);
        
        // Criar set de eurocodes das fichas (normalizado para maiúsculas)
        const eurocodesSet = new Set(eurocodesFichasLoja.map(e => e.eurocode.toUpperCase().trim()));
        
        // 3. Cruzar stock com fichas
        const comFichas: Array<ItemStock & { fichasAssociadas: typeof eurocodesFichasLoja }> = [];
        const semFichas: ItemStock[] = [];
        
        for (const item of itensStock) {
          const refNorm = item.ref.toUpperCase().trim();
          if (eurocodesSet.has(refNorm)) {
            const fichasAssociadas = eurocodesFichasLoja.filter(e => e.eurocode.toUpperCase().trim() === refNorm);
            comFichas.push({ ...item, fichasAssociadas });
          } else {
            semFichas.push(item);
          }
        }
        
        // 4. Eurocodes das fichas que não estão em stock
        const refsStockSet = new Set(itensStock.map(i => i.ref.toUpperCase().trim()));
        const fichasSemStock = eurocodesFichasLoja.filter(e => !refsStockSet.has(e.eurocode.toUpperCase().trim()));
        
        // 5. Guardar análise na BD
        const resultado = {
          itensStock,
          comFichas: comFichas.map(i => ({
            ref: i.ref,
            descricao: i.descricao,
            quantidade: i.quantidade,
            familia: i.familia,
            totalFichas: i.fichasAssociadas.length,
            fichas: i.fichasAssociadas.map(f => ({
              obrano: f.obrano,
              matricula: f.matricula,
              marca: f.marca,
              modelo: f.modelo,
              status: f.status,
              diasAberto: f.diasAberto,
            })),
          })),
          semFichas,
          fichasSemStock: fichasSemStock.map(f => ({
            eurocode: f.eurocode,
            obrano: f.obrano,
            matricula: f.matricula,
            marca: f.marca,
            modelo: f.modelo,
            status: f.status,
            diasAberto: f.diasAberto,
          })),
        };
        
        const analiseGuardada = await db.createAnaliseStock({
          gestorId,
          lojaId: input.lojaId,
          nomeLoja: input.nomeLoja,
          totalItensStock: itensStock.length,
          totalComFichas: comFichas.length,
          totalSemFichas: semFichas.length,
          totalFichasSemStock: fichasSemStock.length,
          dadosStock: JSON.stringify(itensStock),
          resultadoAnalise: JSON.stringify(resultado),
          analiseIdFichas: ultimaAnalise?.id || null,
        });
        
        // 6. Actualizar classificações de eurocodes: manter as que continuam, limpar as que desapareceram
        try {
          const eurocodesPresentes = semFichas.map(i => i.ref);
          await db.actualizarClassificacoesAposAnalise(input.lojaId, analiseGuardada.id, eurocodesPresentes);
        } catch (err) {
          console.error('[Stock] Erro ao actualizar classificações:', err);
        }
        
        return {
          id: analiseGuardada.id,
          totalItensStock: itensStock.length,
          totalComFichas: comFichas.length,
          totalSemFichas: semFichas.length,
          totalFichasSemStock: fichasSemStock.length,
          comFichas: resultado.comFichas,
          semFichas: resultado.semFichas,
          fichasSemStock: resultado.fichasSemStock,
          dataAnaliseFichas: ultimaAnalise?.createdAt || null,
        };
      }),

    // Obter histórico de análises de stock
    historico: gestorProcedure
      .input(z.object({
        gestorIdSelecionado: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        let gestorId = ctx.gestor?.id;
        if (ctx.user.role === 'admin' && input.gestorIdSelecionado) {
          gestorId = input.gestorIdSelecionado;
        }
        if (!gestorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        
        const analises = await db.getAnalisesStock(gestorId, 20);
        
        // Obter reclassificações com_ficha_servico por loja para ajustar KPIs
        const lojaIds = Array.from(new Set(analises.map((a: any) => a.lojaId)));
        const reclassificacoesPorLoja: Record<number, number> = {};
        for (const lojaId of lojaIds) {
          const classificacoes = await db.getClassificacoesEurocode(lojaId as number);
          reclassificacoesPorLoja[lojaId as number] = new Set(
            classificacoes
              .filter((c: any) => c.classificacao === 'com_ficha_servico')
              .map((c: any) => c.eurocode)
          ).size;
        }
        
        return analises.map((a: any) => {
          const reclassificadas = reclassificacoesPorLoja[a.lojaId] || 0;
          return {
            ...a,
            totalComFichasAjustado: a.totalComFichas + reclassificadas,
            totalSemFichasAjustado: Math.max(0, a.totalSemFichas - reclassificadas),
          };
        });
      }),

    // Obter detalhe de uma análise de stock
    detalhe: gestorProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const analise = await db.getAnaliseStockById(input.id);
        if (!analise) throw new TRPCError({ code: 'NOT_FOUND', message: 'Análise não encontrada' });
        return {
          ...analise,
          resultadoAnalise: analise.resultadoAnalise ? JSON.parse(analise.resultadoAnalise) : null,
          dadosStock: analise.dadosStock ? JSON.parse(analise.dadosStock) : null,
        };
      }),

    // Eliminar uma análise de stock
    eliminar: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.eliminarAnaliseStock(input.id);
        return { success: true };
      }),

    // Listar batches de análises de stock
    batches: gestorProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role === 'admin') {
          return db.getBatchesStockAdmin();
        }
        if (!ctx.gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        return db.getBatchesStock(ctx.gestor.id);
      }),

    // Eliminar um batch inteiro de análises de stock
    eliminarBatch: gestorProcedure
      .input(z.object({ batchTime: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const gestorId = ctx.user.role === 'admin' ? undefined : ctx.gestor?.id;
        if (!gestorId && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        }
        const result = await db.eliminarBatchStock(input.batchTime, gestorId);
        return { success: true, deleted: result?.affectedRows || 0 };
      }),

    // Análise global de stock: inicia processamento em background e retorna jobId
    analisarGlobal: gestorProcedure
      .input(z.object({
        itensJson: z.string(),
        nomeArquivo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const gestorId = ctx.gestor?.id;
        if (!gestorId && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        const isAdmin = ctx.user.role === 'admin';

        // Gerar jobId e batchId e retornar imediatamente
        const jobId = `stock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.createBackgroundJob(jobId);

        // Processar em background (não await)
        (async () => {
          try {
            await db.updateBackgroundJob(jobId, { progress: 'A processar dados recebidos...' });

            // Dados já vêm processados do frontend (Excel lido no browser)
            interface ItemStockGlobal {
              ref: string;
              descricao: string;
              armazem: number;
              quantidade: number;
              familia?: string;
            }
            const todosItens: ItemStockGlobal[] = JSON.parse(input.itensJson);

            if (todosItens.length === 0) {
              throw new Error('Não foram encontrados artigos válidos no ficheiro Excel.');
            }

            // 4. Agrupar por armazém
            const porArmazem = new Map<number, ItemStockGlobal[]>();
            for (const item of todosItens) {
              if (!porArmazem.has(item.armazem)) porArmazem.set(item.armazem, []);
              porArmazem.get(item.armazem)!.push(item);
            }

            await db.updateBackgroundJob(jobId, { progress: `${todosItens.length} artigos lidos, ${porArmazem.size} armazéns. A buscar lojas...` });

            // 5. Buscar todas as lojas e mapear por numeroLoja
            const todasLojas = await db.getAllLojas();
            const lojasPorNumero = new Map<number, typeof todasLojas[0]>();
            for (const loja of todasLojas) {
              if (loja.numeroLoja) lojasPorNumero.set(loja.numeroLoja, loja);
            }

            // 6. Buscar todos os gestores e suas lojas
            const todosGestores = await db.getAllGestores();
            const gestorLojaMap = new Map<number, Set<number>>();
            const gestorNomeMap = new Map<number, string>();
            for (const g of todosGestores) {
              const lojasGestor = await db.getLojasByGestorId(g.id);
              gestorLojaMap.set(g.id, new Set(lojasGestor.map(l => l.id)));
              gestorNomeMap.set(g.id, g.nome || g.user?.name || 'Gestor');
            }

            // 7. Obter última análise de fichas
            let ultimaAnaliseFichasId: number | null = null;
            if (gestorId) {
              const ultimaAnalise = await db.getUltimaAnaliseFichas(gestorId);
              ultimaAnaliseFichasId = ultimaAnalise?.id || null;
            }

            // 8. Para cada armazém, cruzar com fichas e guardar análise
            const resultadosPorLoja: Array<{
              lojaId: number;
              lojaNome: string;
              lojaNumero: number;
              gestorId: number | null;
              gestorNome: string | null;
              analiseId: number;
              totalItensStock: number;
              totalComFichas: number;
              totalSemFichas: number;
              totalFichasSemStock: number;
            }> = [];

            const armazensNaoMapeados: number[] = [];
            const armazensArray = Array.from(porArmazem);
            let processadas = 0;

            for (const [armazem, itens] of armazensArray) {
              const loja = lojasPorNumero.get(armazem);
              if (!loja) {
                armazensNaoMapeados.push(armazem);
                processadas++;
                continue;
              }

              await db.updateBackgroundJob(jobId, { progress: `A analisar loja ${loja.nome} (${processadas + 1}/${armazensArray.length})...` });

              let gestorDaLoja: number | null = null;
              let gestorNomeDaLoja: string | null = null;
              for (const [gId, lojaIds] of Array.from(gestorLojaMap)) {
                if (lojaIds.has(loja.id)) {
                  gestorDaLoja = gId;
                  gestorNomeDaLoja = gestorNomeMap.get(gId) || null;
                  break;
                }
              }

              let eurocodesFichasLoja: any[] = [];
              try {
                if (gestorDaLoja) {
                  eurocodesFichasLoja = await db.getEurocodesUltimaAnalisePorLoja(gestorDaLoja, loja.id);
                }
              } catch (e) {
                console.error(`[Stock Global] Erro ao obter eurocodes para loja ${loja.nome}:`, e);
              }

              const eurocodesSet = new Set(eurocodesFichasLoja.map(e => e.eurocode.toUpperCase().trim()));

              const comFichas: Array<any> = [];
              const semFichas: Array<any> = [];

              for (const item of itens) {
                const refNorm = item.ref.toUpperCase().trim();
                if (eurocodesSet.has(refNorm)) {
                  const fichasAssociadas = eurocodesFichasLoja.filter(e => e.eurocode.toUpperCase().trim() === refNorm);
                  comFichas.push({
                    ref: item.ref,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    familia: item.familia,
                    totalFichas: fichasAssociadas.length,
                    fichas: fichasAssociadas.map(f => ({
                      obrano: f.obrano,
                      matricula: f.matricula,
                      marca: f.marca,
                      modelo: f.modelo,
                      status: f.status,
                      diasAberto: f.diasAberto,
                    })),
                  });
                } else {
                  semFichas.push({
                    ref: item.ref,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    familia: item.familia,
                  });
                }
              }

              const refsStockSet = new Set(itens.map((i: any) => i.ref.toUpperCase().trim()));
              const fichasSemStock = eurocodesFichasLoja
                .filter(e => !refsStockSet.has(e.eurocode.toUpperCase().trim()))
                .map(f => ({
                  eurocode: f.eurocode,
                  obrano: f.obrano,
                  matricula: f.matricula,
                  marca: f.marca,
                  modelo: f.modelo,
                  status: f.status,
                  diasAberto: f.diasAberto,
                }));

              const resultado = { itensStock: itens, comFichas, semFichas, fichasSemStock };
              const analiseGuardada = await db.createAnaliseStock({
                gestorId: gestorDaLoja || gestorId || 0,
                lojaId: loja.id,
                nomeLoja: loja.nome,
                batchId,
                totalItensStock: itens.length,
                totalComFichas: comFichas.length,
                totalSemFichas: semFichas.length,
                totalFichasSemStock: fichasSemStock.length,
                dadosStock: JSON.stringify(itens),
                resultadoAnalise: JSON.stringify(resultado),
                analiseIdFichas: ultimaAnaliseFichasId,
              });

              try {
                const eurocodesPresentes = semFichas.map(i => i.ref);
                await db.actualizarClassificacoesAposAnalise(loja.id, analiseGuardada.id, eurocodesPresentes);
              } catch (err) {
                console.error(`[Stock Global] Erro ao actualizar classificações loja ${loja.nome}:`, err);
              }

              resultadosPorLoja.push({
                lojaId: loja.id,
                lojaNome: loja.nome,
                lojaNumero: armazem,
                gestorId: gestorDaLoja,
                gestorNome: gestorNomeDaLoja,
                analiseId: analiseGuardada.id,
                totalItensStock: itens.length,
                totalComFichas: comFichas.length,
                totalSemFichas: semFichas.length,
                totalFichasSemStock: fichasSemStock.length,
              });
              processadas++;
            }

            // 9. Filtrar resultados por role
            const resultadosFiltrados = isAdmin
              ? resultadosPorLoja
              : resultadosPorLoja.filter(r => r.gestorId === gestorId);

            // 10. Agrupar resultados por gestor
            const porGestor = new Map<string, typeof resultadosFiltrados>();
            for (const r of resultadosFiltrados) {
              const key = r.gestorNome || 'Sem Gestor';
              if (!porGestor.has(key)) porGestor.set(key, []);
              porGestor.get(key)!.push(r);
            }

            const resultadoAgrupado = Array.from(porGestor.entries()).map(([gestorNome, lojasResult]) => ({
              gestorNome,
              gestorId: lojasResult[0]?.gestorId || null,
              lojas: lojasResult.sort((a, b) => a.lojaNome.localeCompare(b.lojaNome)),
              totais: {
                totalLojas: lojasResult.length,
                totalItensStock: lojasResult.reduce((s, l) => s + l.totalItensStock, 0),
                totalComFichas: lojasResult.reduce((s, l) => s + l.totalComFichas, 0),
                totalSemFichas: lojasResult.reduce((s, l) => s + l.totalSemFichas, 0),
                totalFichasSemStock: lojasResult.reduce((s, l) => s + l.totalFichasSemStock, 0),
              },
            })).sort((a, b) => a.gestorNome.localeCompare(b.gestorNome));

            const resultData = {
              totalArtigosProcessados: resultadosFiltrados.reduce((s, l) => s + l.totalItensStock, 0),
              totalLojasAnalisadas: resultadosFiltrados.length,
              totalArmazens: porArmazem.size,
              armazensNaoMapeados,
              nomeArquivo: input.nomeArquivo || 'stock_global.xlsx',
              porGestor: resultadoAgrupado,
            };
            await db.updateBackgroundJob(jobId, { status: 'completed', progress: 'Análise concluída!', result: JSON.stringify(resultData) });
          } catch (err: any) {
            await db.updateBackgroundJob(jobId, { status: 'error', error: err.message || 'Erro desconhecido ao analisar stock' }).catch(() => {});
            console.error('[Stock Global] Erro no processamento background:', err);
          }
        })();

        return { jobId };
      }),

    // Polling para verificar o estado do job de análise
    analisarGlobalStatus: gestorProcedure
      .input(z.object({ jobId: z.string() }))
      .query(async ({ input }) => {
        const job = await db.getBackgroundJob(input.jobId);
        if (!job) return { status: 'not_found' as const, progress: '', result: null, error: null };
        return {
          status: job.status,
          progress: job.progress || '',
          result: job.status === 'completed' && job.result ? JSON.parse(job.result) : null,
          error: job.status === 'error' ? job.error : null,
        };
      }),

    // Enviar análise de stock por email para a loja (com cópia para o gestor)
    enviarEmail: gestorProcedure
      .input(z.object({
        lojaId: z.number(),
        nomeLoja: z.string(),
        status: z.enum(['comFichas', 'semFichas', 'fichasSemStock']),
        itens: z.array(z.any()),
      }))
      .mutation(async ({ ctx, input }) => {
        const loja = await db.getLojaById(input.lojaId);
        if (!loja) throw new TRPCError({ code: 'NOT_FOUND', message: 'Loja não encontrada' });
        if (!loja.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Loja não tem email configurado' });

        const statusLabels: Record<string, string> = {
          comFichas: 'Em Stock COM Fichas de Serviço',
          semFichas: 'Em Stock SEM Fichas de Serviço',
          fichasSemStock: 'Fichas de Serviço SEM Stock',
        };
        const statusLabel = statusLabels[input.status] || input.status;
        const dataFormatada = new Date().toLocaleDateString('pt-PT');

        // Gerar tabela HTML
        let tabelaHTML = '';
        if (input.status === 'fichasSemStock') {
          tabelaHTML = `
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#f1f5f9;">
                  <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Eurocode</th>
                  <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Obra</th>
                  <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Matrícula</th>
                  <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Marca/Modelo</th>
                  <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${input.itens.map((item: any, idx: number) => `
                  <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:bold;">${item.eurocode || '-'}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;">${item.obrano || '-'}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;">${item.matricula || '-'}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;">${item.marca || ''} ${item.modelo || ''}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;">${item.status || '-'} ${item.diasAberto > 0 ? `(${item.diasAberto}d)` : ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`;
        } else {
          tabelaHTML = `
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#f1f5f9;">
                  <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Referência</th>
                  <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Família</th>
                  <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Descrição</th>
                  <th style="padding:8px 12px;text-align:right;border:1px solid #e2e8f0;">Qtd</th>
                  ${input.status === 'comFichas' ? '<th style="padding:8px 12px;text-align:right;border:1px solid #e2e8f0;">N.º Fichas</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${input.itens.map((item: any, idx: number) => `
                  <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-weight:bold;">${item.ref || '-'}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;">${item.familia || '-'}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;">${item.descricao || '-'}</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;">${item.quantidade || 0}</td>
                    ${input.status === 'comFichas' ? `<td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;">${item.totalFichas || 0}</td>` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>`;
        }

        const htmlEmail = `
          <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
            <div style="background:#16a34a;padding:20px;border-radius:8px 8px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:20px;">Controlo de Stock</h1>
              <p style="color:#dcfce7;margin:5px 0 0;font-size:14px;">${statusLabel}</p>
            </div>
            <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;">
              <div style="margin-bottom:15px;">
                <p style="margin:5px 0;"><strong>Loja:</strong> ${input.nomeLoja}</p>
                <p style="margin:5px 0;"><strong>Data:</strong> ${dataFormatada}</p>
                <p style="margin:5px 0;"><strong>Total de itens:</strong> ${input.itens.length}</p>
              </div>
              ${tabelaHTML}
            </div>
            <div style="padding:15px;background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">PoweringEG Platform - Controlo de Stock</p>
            </div>
          </div>`;

        const assunto = `Controlo de Stock - ${statusLabel} - ${input.nomeLoja} - ${dataFormatada}`;

        const enviado = await sendEmail({
          to: loja.email,
          subject: assunto,
          html: htmlEmail,
        });

        if (!enviado) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao enviar email' });
        }

        // Enviar cópia para o gestor
        let copiaEnviada: string | null = null;
        const gestor = ctx.gestor ? await db.getGestorById(ctx.gestor.id) : null;
        if (gestor?.email && gestor.email !== loja.email) {
          try {
            const htmlCopia = htmlEmail.replace(
              '</div>\n            <div style="padding:15px',
              `<div style="margin-top:15px;padding:12px;background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:4px;">
                <p style="margin:0;color:#0369a1;font-size:13px;">Esta é uma cópia do email enviado para <strong>${loja.email}</strong>.</p>
              </div>\n            </div>\n            <div style="padding:15px`
            );
            await sendEmail({
              to: gestor.email,
              subject: `[Cópia] ${assunto}`,
              html: htmlCopia,
            });
            copiaEnviada = gestor.email;
          } catch (e) {
            console.error('[Stock Email] Erro ao enviar cópia ao gestor:', e);
          }
        }

        return { success: true, email: loja.email, copiaEnviada };
      }),

    // Obter classificações activas de eurocodes sem ficha para uma loja
    classificacoes: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        return db.getClassificacoesEurocode(input.lojaId);
      }),

    // Obter recorrência (longevidade) de eurocodes sem ficha
    recorrencia: gestorProcedure
      .input(z.object({ lojaId: z.number() }))
      .query(async ({ input }) => {
        return db.getRecorrenciaEurocodes(input.lojaId);
      }),

    // Classificar um eurocode sem ficha (por unidade individual)
    classificar: gestorProcedure
      .input(z.object({
        lojaId: z.number(),
        eurocode: z.string(),
        unitIndex: z.number().default(1), // Índice da unidade (1, 2, 3...)
        classificacao: z.enum(['devolucao_rejeitada', 'usado', 'com_danos', 'para_devolver', 'para_realizar', 'com_ficha_servico', 'nao_existe', 'outros']),
        observacao: z.string().max(255).optional(),
        analiseId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.classificarEurocode(input);
      }),

    // Remover classificação de um eurocode
    removerClassificacao: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.removerClassificacaoEurocode(input.id);
        return { success: true };
      }),

    // Comparar duas análises de stock
    comparar: gestorProcedure
      .input(z.object({
        analiseId1: z.number(),
        analiseId2: z.number(),
      }))
      .query(async ({ input }) => {
        const a1 = await db.getAnaliseStockById(input.analiseId1);
        const a2 = await db.getAnaliseStockById(input.analiseId2);
        if (!a1 || !a2) throw new TRPCError({ code: 'NOT_FOUND', message: 'Análise não encontrada' });

        const r1 = a1.resultadoAnalise ? JSON.parse(a1.resultadoAnalise) : { comFichas: [], semFichas: [], fichasSemStock: [] };
        const r2 = a2.resultadoAnalise ? JSON.parse(a2.resultadoAnalise) : { comFichas: [], semFichas: [], fichasSemStock: [] };

        // Análise 1 = mais antiga, Análise 2 = mais recente
        const [antiga, recente, aInfo, rInfo] = new Date(a1.createdAt) < new Date(a2.createdAt)
          ? [r1, r2, a1, a2] : [r2, r1, a2, a1];

        // Refs sem fichas
        const semFichasAntigas = new Set((antiga.semFichas || []).map((i: any) => i.ref?.toUpperCase()?.trim()));
        const semFichasRecentes = new Set((recente.semFichas || []).map((i: any) => i.ref?.toUpperCase()?.trim()));

        const novos: any[] = []; // estão na recente mas não na antiga
        const resolvidos: any[] = []; // estavam na antiga mas não na recente
        const mantidos: any[] = []; // estão em ambas

        for (const item of (recente.semFichas || [])) {
          const key = item.ref?.toUpperCase()?.trim();
          if (semFichasAntigas.has(key)) {
            mantidos.push(item);
          } else {
            novos.push(item);
          }
        }
        for (const item of (antiga.semFichas || [])) {
          const key = item.ref?.toUpperCase()?.trim();
          if (!semFichasRecentes.has(key)) {
            resolvidos.push(item);
          }
        }

        return {
          analiseAntiga: {
            id: aInfo.id,
            nomeLoja: aInfo.nomeLoja,
            data: aInfo.createdAt,
            totalStock: aInfo.totalItensStock,
            totalComFichas: aInfo.totalComFichas,
            totalSemFichas: aInfo.totalSemFichas,
            totalFichasSemStock: aInfo.totalFichasSemStock,
          },
          analiseRecente: {
            id: rInfo.id,
            nomeLoja: rInfo.nomeLoja,
            data: rInfo.createdAt,
            totalStock: rInfo.totalItensStock,
            totalComFichas: rInfo.totalComFichas,
            totalSemFichas: rInfo.totalSemFichas,
            totalFichasSemStock: rInfo.totalFichasSemStock,
          },
          semFichas: {
            novos,
            resolvidos,
            mantidos,
          },
          variacoes: {
            totalStock: (rInfo.totalItensStock || 0) - (aInfo.totalItensStock || 0),
            comFichas: (rInfo.totalComFichas || 0) - (aInfo.totalComFichas || 0),
            semFichas: (rInfo.totalSemFichas || 0) - (aInfo.totalSemFichas || 0),
            fichasSemStock: (rInfo.totalFichasSemStock || 0) - (aInfo.totalFichasSemStock || 0),
          },
        };
      }),

    // Enviar email consolidado com os 3 status
    enviarEmailConsolidado: gestorProcedure
      .input(z.object({
        lojaId: z.number(),
        nomeLoja: z.string(),
        comFichas: z.array(z.any()),
        semFichas: z.array(z.any()),
        totalItensStock: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const loja = await db.getLojaById(input.lojaId);
        if (!loja) throw new TRPCError({ code: 'NOT_FOUND', message: 'Loja não encontrada' });
        if (!loja.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Loja não tem email configurado' });

        const dataFormatada = new Date().toLocaleDateString('pt-PT');
        const totalStock = input.totalItensStock || (input.comFichas.length + input.semFichas.length);

        const htmlEmail = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#16a34a;padding:20px;border-radius:8px 8px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:20px;">Controlo de Stock</h1>
              <p style="color:#dcfce7;margin:5px 0 0;font-size:14px;">${input.nomeLoja} — ${dataFormatada}</p>
            </div>
            <div style="padding:25px;background:#fff;border:1px solid #e2e8f0;">
              <p style="margin:0 0 15px;color:#334155;font-size:14px;line-height:1.6;">Foi realizada uma análise de controlo de stock na loja <strong>${input.nomeLoja}</strong>.</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
                <tr>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">Total em Stock</td>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;color:#1d4ed8;">${totalStock}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">Sem Fichas de Serviço</td>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;color:#d97706;">${input.semFichas.length}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">Com Fichas de Serviço</td>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;color:#16a34a;">${input.comFichas.length}</td>
                </tr>
              </table>
              <p style="margin:0 0 15px;color:#64748b;font-size:13px;line-height:1.5;">Consulte o ficheiro Excel em anexo para os dados completos.</p>
              <p style="margin:0;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;color:#92400e;font-size:13px;line-height:1.6;">📋 <strong>Ação necessária:</strong> Aceda à aplicação <strong>PoweringEG</strong> da sua loja, vá a <strong>Análise de Stock</strong>, selecione o separador <strong>"Stock sem Fichas"</strong> e classifique os eurocodes indicados.</p>
            </div>
            <div style="padding:15px;background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass</p>
            </div>
          </div>`;

        const assunto = `Controlo de Stock — Relatório Consolidado — ${input.nomeLoja} — ${dataFormatada}`;

        // Gerar Excel consolidado para anexar ao email
        let excelAttachment: { filename: string; content: string; contentType: string };
        try {
          console.log(`[Stock Email] A gerar Excel para ${input.nomeLoja} (lojaId: ${input.lojaId})...`);
          console.log(`[Stock Email] Dados: comFichas=${input.comFichas.length}, semFichas=${input.semFichas.length}`);
          const { base64, filename } = await gerarExcelControloStock({
            nomeLoja: input.nomeLoja,
            lojaId: input.lojaId,
            comFichas: input.comFichas,
            semFichas: input.semFichas,
          });
          excelAttachment = {
            filename,
            content: base64,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          };
          console.log(`[Stock Email] Excel gerado com sucesso: ${filename} (${Math.round(base64.length * 0.75 / 1024)}KB)`);
        } catch (excelError: any) {
          console.error('[Stock Email] ERRO ao gerar Excel:', excelError?.message || excelError);
          console.error('[Stock Email] Stack:', excelError?.stack);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Erro ao gerar Excel: ${excelError?.message || 'desconhecido'}` });
        }

        console.log(`[Stock Email] A enviar email para ${loja.email} (anexo: SIM - ${excelAttachment.filename} (${Math.round(excelAttachment.content.length * 0.75 / 1024)}KB))`);
        const enviado = await sendEmail({
          to: loja.email,
          subject: assunto,
          html: htmlEmail,
          attachments: [excelAttachment],
        });

        if (!enviado) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao enviar email' });
        }

        // Cópia para o gestor
        let copiaEnviada: string | null = null;
        const gestor = ctx.gestor ? await db.getGestorById(ctx.gestor.id) : null;
        if (gestor?.email && gestor.email !== loja.email) {
          try {
            const notaCopia = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto 10px;"><p style="margin:0;padding:10px 15px;background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:4px;color:#0369a1;font-size:13px;">Esta é uma cópia do email enviado para <strong>${loja.email}</strong>.</p></div>`;
            await sendEmail({
              to: gestor.email,
              subject: `[Cópia] ${assunto}`,
              html: notaCopia + htmlEmail,
              attachments: [excelAttachment],
            });
            copiaEnviada = gestor.email;
          } catch (e) {
            console.error('[Stock Email Consolidado] Erro ao enviar cópia ao gestor:', e);
          }
        }

        return { success: true, email: loja.email, copiaEnviada };
      }),

    // Dashboard de stock: resumo das últimas análises por loja
    dashboardStock: gestorProcedure
      .query(async ({ ctx }) => {
        const isAdmin = ctx.user.role === 'admin';
        
        let analises;
        if (isAdmin) {
          analises = await db.getDashboardStockAdmin();
        } else {
          const gestorId = ctx.gestor?.id;
          if (!gestorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          analises = await db.getDashboardStock(gestorId);
        }
        
        // Calcular contadores de itens sem classificação por loja
        const lojaIdsAnalises = analises.map(a => a.lojaId).filter(Boolean) as number[];
        const semClassificacaoMap = await db.getContadorSemClassificacao(lojaIdsAnalises);

        // Enriquecer análises com semClassificacao
        const analisesEnriquecidas = analises.map(a => ({
          ...a,
          semClassificacao: a.lojaId ? (semClassificacaoMap[a.lojaId] ?? 0) : 0,
        }));

        // Calcular totais
        const totais = {
          totalLojas: analises.length,
          totalItensStock: analises.reduce((sum, a) => sum + (a.totalItensStock || 0), 0),
          totalComFichas: analises.reduce((sum, a) => sum + (a.totalComFichas || 0), 0),
          totalSemFichas: analises.reduce((sum, a) => sum + (a.totalSemFichas || 0), 0),
          totalFichasSemStock: analises.reduce((sum, a) => sum + (a.totalFichasSemStock || 0), 0),
          totalSemClassificacao: Object.values(semClassificacaoMap).reduce((s, v) => s + v, 0),
          ultimaAnalise: analises.length > 0 ? analises.reduce((latest, a) => {
            return new Date(a.createdAt) > new Date(latest.createdAt) ? a : latest;
          }).createdAt : null,
        };
        
        // Top 5 lojas com mais itens sem fichas
        const topSemFichas = [...analises]
          .sort((a, b) => (b.totalSemFichas || 0) - (a.totalSemFichas || 0))
          .slice(0, 5)
          .map(a => ({ nomeLoja: a.nomeLoja || 'Loja', totalSemFichas: a.totalSemFichas || 0 }));
        
        return { totais, analises: analisesEnriquecidas, topSemFichas };
      }),

    // Pesquisar eurocode em todas as lojas (ou nas lojas do gestor)
    pesquisarEurocode: gestorProcedure
      .input(z.object({
        eurocode: z.string().min(1),
      }))
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === 'admin';
        const gestorId = isAdmin ? undefined : ctx.gestor?.id;
        const resultados = await db.pesquisarEurocode(input.eurocode, gestorId);
        return resultados;
      }),

    // Pesquisar eurocode em todas as lojas (para o portal da loja - sem filtro de loja)
    pesquisarEurocodeGlobal: publicProcedure
      .input(z.object({
        eurocode: z.string().min(1),
        token: z.string().optional(),
      }))
      .query(async ({ input }) => {
        // Acessível tanto por utilizadores autenticados (gestor) como por lojas via token
        const resultados = await db.pesquisarEurocode(input.eurocode);
        return resultados;
      }),

    // Exportar eurocodes sem classificação (para Excel)
    exportarSemClassificacao: gestorProcedure
      .query(async ({ ctx }) => {
        const isAdmin = ctx.user.role === 'admin';
        
        let lojaIds: number[];
        if (isAdmin) {
          const analises = await db.getDashboardStockAdmin();
          lojaIds = analises.map(a => a.lojaId).filter(Boolean) as number[];
        } else {
          const gestorId = ctx.gestor?.id;
          if (!gestorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          const analises = await db.getDashboardStock(gestorId);
          lojaIds = analises.map(a => a.lojaId).filter(Boolean) as number[];
        }
        
        const itens = await db.getEurocodesSemClassificacao(lojaIds);
        return itens;
      }),

    // Evolução temporal de stock (todas as análises agrupadas por data)
    evolucaoStock: gestorProcedure
      .query(async ({ ctx }) => {
        const isAdmin = ctx.user.role === 'admin';
        
        let analises;
        if (isAdmin) {
          analises = await db.getEvolucaoStockAdmin();
        } else {
          const gestorId = ctx.gestor?.id;
          if (!gestorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
          analises = await db.getEvolucaoStock(gestorId);
        }
        
        // Agrupar por data (dia) e calcular totais agregados
        const porData = new Map<string, {
          data: string;
          totalItensStock: number;
          totalComFichas: number;
          totalSemFichas: number;
          totalFichasSemStock: number;
          numLojas: number;
        }>();
        
        for (const a of analises) {
          const dataKey = new Date(a.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
          const existing = porData.get(dataKey);
          if (existing) {
            existing.totalItensStock += a.totalItensStock || 0;
            existing.totalComFichas += a.totalComFichas || 0;
            existing.totalSemFichas += a.totalSemFichas || 0;
            existing.totalFichasSemStock += a.totalFichasSemStock || 0;
            existing.numLojas += 1;
          } else {
            porData.set(dataKey, {
              data: dataKey,
              totalItensStock: a.totalItensStock || 0,
              totalComFichas: a.totalComFichas || 0,
              totalSemFichas: a.totalSemFichas || 0,
              totalFichasSemStock: a.totalFichasSemStock || 0,
              numLojas: 1,
            });
          }
        }
        
        // Ordenar por data e retornar
        const evolucao = Array.from(porData.values()).sort((a, b) => a.data.localeCompare(b.data));
        
        return { evolucao };
      }),

    // Enviar email consolidado a TODAS as lojas do gestor (com Excel em anexo)
    enviarEmailTodasLojas: gestorProcedure
      .input(z.object({
        analiseIds: z.array(z.object({
          lojaId: z.number(),
          analiseId: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const gestorId = ctx.gestor?.id;
        if (!gestorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });

        const resultados: Array<{ lojaId: number; lojaNome: string; email: string; success: boolean; error?: string }> = [];
        let emailsEnviados = 0;

        for (const item of input.analiseIds) {
          const analise = await db.getAnaliseStockById(item.analiseId);
          if (!analise) {
            resultados.push({ lojaId: item.lojaId, lojaNome: 'Desconhecida', email: '', success: false, error: 'Análise não encontrada' });
            continue;
          }

          const loja = await db.getLojaById(item.lojaId);
          if (!loja || !loja.email) {
            resultados.push({ lojaId: item.lojaId, lojaNome: analise.nomeLoja || 'Desconhecida', email: '', success: false, error: 'Loja sem email' });
            continue;
          }

          const resultado = analise.resultadoAnalise ? JSON.parse(analise.resultadoAnalise) : null;
          if (!resultado) {
            resultados.push({ lojaId: item.lojaId, lojaNome: loja.nome, email: loja.email, success: false, error: 'Sem dados de análise' });
            continue;
          }

          const dataFormatada = new Date().toLocaleDateString('pt-PT');
          const totalStock = analise.totalItensStock || 0;
          const comFichas = resultado.comFichas || [];
          const semFichas = resultado.semFichas || [];

          const htmlEmail = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#16a34a;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:20px;">Controlo de Stock</h1>
                <p style="color:#dcfce7;margin:5px 0 0;font-size:14px;">${loja.nome} — ${dataFormatada}</p>
              </div>
              <div style="padding:25px;background:#fff;border:1px solid #e2e8f0;">
                <p style="margin:0 0 15px;color:#334155;font-size:14px;line-height:1.6;">Foi realizada uma análise de controlo de stock na loja <strong>${loja.nome}</strong>.</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
                  <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">Total em Stock</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;color:#1d4ed8;">${totalStock}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">Sem Fichas de Serviço</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;color:#d97706;">${semFichas.length}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">Com Fichas de Serviço</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;color:#16a34a;">${comFichas.length}</td>
                  </tr>
                </table>
                <p style="margin:0 0 15px;color:#64748b;font-size:13px;line-height:1.5;">Consulte o ficheiro Excel em anexo para os dados completos.</p>
                <p style="margin:0;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;color:#92400e;font-size:13px;line-height:1.6;">📋 <strong>Ação necessária:</strong> Aceda à aplicação <strong>PoweringEG</strong> da sua loja, vá a <strong>Análise de Stock</strong>, selecione o separador <strong>"Stock sem Fichas"</strong> e classifique os eurocodes indicados.</p>
              </div>
              <div style="padding:15px;background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px;text-align:center;">
                <p style="margin:0;color:#64748b;font-size:12px;">PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass</p>
              </div>
            </div>`;

          // Gerar Excel em anexo
          let excelAttachment: { filename: string; content: string; contentType: string } | undefined;
          try {
            const { base64, filename } = await gerarExcelControloStock({
              nomeLoja: loja.nome,
              lojaId: item.lojaId,
              comFichas,
              semFichas,
            });
            excelAttachment = {
              filename,
              content: base64,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };
          } catch (excelError: any) {
            console.error(`[Stock Email Todas] Erro Excel ${loja.nome}:`, excelError?.message);
          }

          const assunto = `Controlo de Stock — Relatório Consolidado — ${loja.nome} — ${dataFormatada}`;

          try {
            const enviado = await sendEmail({
              to: loja.email,
              subject: assunto,
              html: htmlEmail,
              attachments: excelAttachment ? [excelAttachment] : undefined,
            });
            if (enviado) {
              emailsEnviados++;
              resultados.push({ lojaId: item.lojaId, lojaNome: loja.nome, email: loja.email, success: true });
            } else {
              resultados.push({ lojaId: item.lojaId, lojaNome: loja.nome, email: loja.email, success: false, error: 'Falha no envio' });
            }
          } catch (e: any) {
            resultados.push({ lojaId: item.lojaId, lojaNome: loja.nome, email: loja.email, success: false, error: e?.message || 'Erro desconhecido' });
          }

          // Pequena pausa entre emails para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Enviar resumo ao gestor
        const gestor = await db.getGestorById(gestorId);
        if (gestor?.email) {
          try {
            const resumoHTML = `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#1d4ed8;padding:20px;border-radius:8px 8px 0 0;">
                  <h1 style="color:#fff;margin:0;font-size:20px;">Resumo de Envio — Controlo de Stock</h1>
                  <p style="color:#dbeafe;margin:5px 0 0;font-size:14px;">${new Date().toLocaleDateString('pt-PT')}</p>
                </div>
                <div style="padding:25px;background:#fff;border:1px solid #e2e8f0;">
                  <p style="margin:0 0 15px;color:#334155;font-size:14px;">Foram enviados <strong>${emailsEnviados}</strong> de <strong>${input.analiseIds.length}</strong> emails de controlo de stock.</p>
                  <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                      <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Loja</th>
                        <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0;">Email</th>
                        <th style="padding:8px 12px;text-align:center;border:1px solid #e2e8f0;">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${resultados.map((r, idx) => `
                        <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
                          <td style="padding:8px 12px;border:1px solid #e2e8f0;">${r.lojaNome}</td>
                          <td style="padding:8px 12px;border:1px solid #e2e8f0;">${r.email || '-'}</td>
                          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">${r.success ? '✅' : '❌ ' + (r.error || '')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                <div style="padding:15px;background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px;text-align:center;">
                  <p style="margin:0;color:#64748b;font-size:12px;">PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass</p>
                </div>
              </div>`;
            await sendEmail({
              to: gestor.email,
              subject: `Resumo Envio Controlo de Stock — ${emailsEnviados}/${input.analiseIds.length} enviados`,
              html: resumoHTML,
            });
          } catch (e) {
            console.error('[Stock Email Todas] Erro ao enviar resumo ao gestor:', e);
          }
        }

        return { emailsEnviados, totalLojas: input.analiseIds.length, resultados };
      }),

    // Enviar emails para todas as lojas de um batch específico (histórico)
    enviarEmailBatch: gestorProcedure
      .input(z.object({
        batchTime: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const gestorId = ctx.user.role === 'admin' ? undefined : ctx.gestor?.id;
        if (!gestorId && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        }

        // Buscar todas as análises deste batch
        const analises = await db.getAnalisesByBatchTime(input.batchTime, gestorId);
        if (!analises || analises.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Nenhuma análise encontrada para este batch' });
        }

        // Construir array de analiseIds no formato esperado pelo envio
        const analiseIds = analises.map(a => ({ lojaId: a.lojaId!, analiseId: a.id })).filter(a => a.lojaId);

        const resultados: Array<{ lojaId: number; lojaNome: string; email: string; success: boolean; error?: string }> = [];
        let emailsEnviados = 0;

        for (const item of analiseIds) {
          const analise = await db.getAnaliseStockById(item.analiseId);
          if (!analise) {
            resultados.push({ lojaId: item.lojaId, lojaNome: 'Desconhecida', email: '', success: false, error: 'Análise não encontrada' });
            continue;
          }

          const loja = await db.getLojaById(item.lojaId);
          if (!loja || !loja.email) {
            resultados.push({ lojaId: item.lojaId, lojaNome: analise.nomeLoja || 'Desconhecida', email: '', success: false, error: 'Loja sem email' });
            continue;
          }

          const resultado = analise.resultadoAnalise ? JSON.parse(analise.resultadoAnalise) : null;
          if (!resultado) {
            resultados.push({ lojaId: item.lojaId, lojaNome: loja.nome, email: loja.email, success: false, error: 'Sem dados de análise' });
            continue;
          }

          const dataFormatada = new Date(analise.createdAt).toLocaleDateString('pt-PT');
          const totalStock = analise.totalItensStock || 0;
          const comFichas = resultado.comFichas || [];
          const semFichas = resultado.semFichas || [];

          const htmlEmail = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#16a34a;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:20px;">Controlo de Stock</h1>
                <p style="color:#dcfce7;margin:5px 0 0;font-size:14px;">${loja.nome} — ${dataFormatada}</p>
              </div>
              <div style="padding:25px;background:#fff;border:1px solid #e2e8f0;">
                <p style="margin:0 0 15px;color:#334155;font-size:14px;line-height:1.6;">Foi realizada uma análise de controlo de stock na loja <strong>${loja.nome}</strong>.</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
                  <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">Total em Stock</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;color:#1d4ed8;">${totalStock}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">Sem Fichas de Serviço</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;color:#d97706;">${semFichas.length}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;">Com Fichas de Serviço</td>
                    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;text-align:right;color:#16a34a;">${comFichas.length}</td>
                  </tr>
                </table>
                <p style="margin:0 0 15px;color:#64748b;font-size:13px;line-height:1.5;">Consulte o ficheiro Excel em anexo para os dados completos.</p>
                <p style="margin:0;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;color:#92400e;font-size:13px;line-height:1.6;">📋 <strong>Ação necessária:</strong> Aceda à aplicação <strong>PoweringEG</strong> da sua loja, vá a <strong>Análise de Stock</strong>, selecione o separador <strong>"Stock sem Fichas"</strong> e classifique os eurocodes indicados.</p>
              </div>
              <div style="padding:15px;background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px;text-align:center;">
                <p style="margin:0;color:#64748b;font-size:12px;">PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass</p>
              </div>
            </div>`;

          let excelAttachment: { filename: string; content: string; contentType: string } | undefined;
          try {
            const { base64, filename } = await gerarExcelControloStock({
              nomeLoja: loja.nome,
              lojaId: item.lojaId,
              comFichas,
              semFichas,
            });
            excelAttachment = {
              filename,
              content: base64,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };
          } catch (excelError: any) {
            console.error(`[Stock Email Batch] Erro Excel ${loja.nome}:`, excelError?.message);
          }

          const assunto = `Controlo de Stock — Relatório Consolidado — ${loja.nome} — ${dataFormatada}`;

          try {
            const enviado = await sendEmail({
              to: loja.email,
              subject: assunto,
              html: htmlEmail,
              attachments: excelAttachment ? [excelAttachment] : undefined,
            });
            if (enviado) {
              emailsEnviados++;
              resultados.push({ lojaId: item.lojaId, lojaNome: loja.nome, email: loja.email, success: true });
            } else {
              resultados.push({ lojaId: item.lojaId, lojaNome: loja.nome, email: loja.email, success: false, error: 'Falha no envio' });
            }
          } catch (e: any) {
            resultados.push({ lojaId: item.lojaId, lojaNome: loja.nome, email: loja.email, success: false, error: e?.message || 'Erro desconhecido' });
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Enviar resumo ao gestor
        const gestor = gestorId ? await db.getGestorById(gestorId) : null;
        if (gestor?.email) {
          try {
            const resumoHTML = `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#1d4ed8;padding:20px;border-radius:8px 8px 0 0;">
                  <h1 style="color:#fff;margin:0;font-size:20px;">Resumo Envio Controlo de Stock</h1>
                  <p style="color:#dbeafe;margin:5px 0 0;font-size:14px;">Batch: ${input.batchTime}</p>
                </div>
                <div style="padding:25px;background:#fff;border:1px solid #e2e8f0;">
                  <p style="margin:0 0 15px;color:#334155;font-size:14px;">Foram enviados <strong>${emailsEnviados}</strong> de <strong>${analiseIds.length}</strong> emails de controlo de stock.</p>
                  <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <tr style="background:#f1f5f9;"><th style="padding:6px 10px;text-align:left;">Loja</th><th style="padding:6px 10px;text-align:left;">Email</th><th style="padding:6px 10px;text-align:center;">Status</th></tr>
                    ${resultados.map(r => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${r.lojaNome}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${r.email || '-'}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;color:${r.success ? '#16a34a' : '#dc2626'};">${r.success ? '✅' : '❌ ' + (r.error || '')}</td></tr>`).join('')}
                  </table>
                </div>
              </div>`;
            await sendEmail({
              to: gestor.email,
              subject: `Resumo Envio Controlo de Stock (Batch ${input.batchTime}) — ${emailsEnviados}/${analiseIds.length} enviados`,
              html: resumoHTML,
            });
          } catch (e) {
            console.error('[Stock Email Batch] Erro ao enviar resumo ao gestor:', e);
          }
        }

        return { emailsEnviados, totalLojas: analiseIds.length, resultados };
      }),

    // Exportar Excel consolidado (gera no servidor e devolve URL)
    exportarExcelConsolidado: gestorProcedure
      .input(z.object({
        analiseId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const analise = await db.getAnaliseStockById(input.analiseId);
        if (!analise) throw new TRPCError({ code: 'NOT_FOUND', message: 'Análise não encontrada' });
        
        const resultado = analise.resultadoAnalise ? JSON.parse(analise.resultadoAnalise) : null;
        if (!resultado) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Análise sem dados de resultado' });
        
        // Retornar os dados para o frontend gerar o Excel com ExcelJS
        return {
          nomeLoja: analise.nomeLoja || 'Loja',
          data: analise.createdAt,
          comFichas: resultado.comFichas || [],
          semFichas: resultado.semFichas || [],
          totalItensStock: analise.totalItensStock,
          totalComFichas: analise.totalComFichas,
          totalSemFichas: analise.totalSemFichas,
        };
      }),
  }),

  // ============================================================
  // AGENDAMENTOS LOJA
  // ============================================================
  agendamentos: router({
    // Listar localidades (via token loja ou gestor autenticado)
    listarLocalidades: publicProcedure
      .input(z.object({ token: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        let gId: number | null = null;
        if (input.token) {
          const auth = await db.validarTokenLoja(input.token);
          if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
          const gestor = await db.getGestorByLojaId(auth.loja.id);
          if (gestor) gId = gestor.id;
        } else if (ctx.user) {
          const gestor = await db.getGestorByUserId(ctx.user.id);
          if (gestor) gId = gestor.id;
        }
        if (!gId) return [];
        return await db.getLocalidadesAgendamento(gId);
      }),

    // Criar localidade (gestor)
    criarLocalidade: gestorProcedure
      .input(z.object({ nome: z.string().min(1).max(100), cor: z.string().min(4).max(20) }))
      .mutation(async ({ input, ctx }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        return await db.criarLocalidadeAgendamento(gestor.id, input.nome, input.cor);
      }),

    // Apagar localidade (gestor)
    apagarLocalidade: gestorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        await db.apagarLocalidadeAgendamento(input.id, gestor.id);
        return { ok: true };
      }),

    // Listar agendamentos da loja (via token)
    listarPorLoja: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        return await db.getAgendamentosLoja(auth.loja.id);
      }),

    // Listar agendamentos de todas as lojas (gestor)
    listarTodos: gestorProcedure
      .query(async ({ ctx }) => {
        const gestor = await db.getGestorByUserId(ctx.user.id);
        if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Gestor não encontrado' });
        return await db.getAgendamentosGestor(gestor.id);
      }),

    // Criar agendamento (via token loja)
    criar: publicProcedure
      .input(z.object({
        token: z.string(),
        matricula: z.string().min(1).max(20),
        viatura: z.string().max(150).optional(),
        tipoServico: z.enum(["PB", "LT", "OC", "REP", "POL"]),
        localidade: z.string().max(100).optional(),
        data: z.string().max(10).optional(),
        periodo: z.enum(["manha", "tarde"]).optional(),
        estadoVidro: z.enum(["nao_encomendado", "encomendado", "terminado"]).optional(),
        morada: z.string().max(500).optional(),
        telefone: z.string().max(20).optional(),
        notas: z.string().optional(),
        extra: z.string().max(255).optional(),
        km: z.number().optional(),
        obraNo: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { token, ...dados } = input;
        const auth = await db.validarTokenLoja(token);
        if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        const gestor = await db.getGestorByLojaId(auth.loja.id);
        if (!gestor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Loja sem gestor associado' });
        return await db.criarAgendamento({ ...dados, lojaId: auth.loja.id, gestorId: gestor.id });
      }),

    // Atualizar agendamento (via token loja)
    atualizar: publicProcedure
      .input(z.object({
        token: z.string(),
        id: z.number(),
        matricula: z.string().min(1).max(20).optional(),
        viatura: z.string().max(150).optional(),
        tipoServico: z.enum(["PB", "LT", "OC", "REP", "POL"]).optional(),
        localidade: z.string().max(100).optional(),
        data: z.string().max(10).nullable().optional(),
        periodo: z.enum(["manha", "tarde"]).nullable().optional(),
        estadoVidro: z.enum(["nao_encomendado", "encomendado", "terminado"]).optional(),
        morada: z.string().max(500).optional(),
        telefone: z.string().max(20).optional(),
        notas: z.string().optional(),
        extra: z.string().max(255).optional(),
        km: z.number().optional(),
        sortIndex: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { token, id, ...updates } = input;
        const auth = await db.validarTokenLoja(token);
        if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        const filtered = Object.fromEntries(
          Object.entries(updates).filter(([, v]) => v !== undefined)
        ) as Parameters<typeof db.atualizarAgendamento>[2];
        await db.atualizarAgendamento(id, auth.loja.id, filtered);
        return { ok: true };
      }),

    // Anular agendamento (via token loja)
    anular: publicProcedure
      .input(z.object({ token: z.string(), id: z.number(), motivo: z.string().optional() }))
      .mutation(async ({ input }) => {
        const auth = await db.validarTokenLoja(input.token);
        if (!auth) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        await db.anularAgendamento(input.id, auth.loja.id, input.motivo);
        return { ok: true };
      }),
  }),

});
export type AppRouter = typeof appRouter;
