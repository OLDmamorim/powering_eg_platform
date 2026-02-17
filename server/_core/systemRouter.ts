import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  // Endpoint de teste para verificar lembretes de volantes
  testarLembreteVolantes: adminProcedure
    .mutation(async () => {
      const { getVolantesSemRegistoHoje } = await import('../db');
      const { enviarLembreteRegistoServicos } = await import('../telegramService');
      
      console.log('[TESTE] Verificando volantes com agendamentos pendentes...');
      const volantesPendentes = await getVolantesSemRegistoHoje();
      
      console.log(`[TESTE] Encontrados ${volantesPendentes.length} volante(s) com agendamentos pendentes`);
      console.log('[TESTE] Dados:', JSON.stringify(volantesPendentes, null, 2));
      
      if (volantesPendentes.length === 0) {
        return {
          success: true,
          message: 'Nenhum volante com agendamentos pendentes de registo',
          volantes: []
        };
      }
      
      let sucessos = 0;
      const resultados = [];
      
      for (const volante of volantesPendentes) {
        if (!volante.telegramChatId) {
          console.log(`[TESTE] Volante ${volante.volanteNome} não tem Telegram configurado`);
          resultados.push({
            volante: volante.volanteNome,
            enviado: false,
            motivo: 'Sem Telegram configurado'
          });
          continue;
        }
        
        // Construir URL do portal do volante com token
        const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg-3c9mozlh.manus.space';
        const portalUrl = volante.token 
          ? `${baseUrl}/portal-loja?token=${volante.token}`
          : baseUrl;
        
        const resultado = await enviarLembreteRegistoServicos(
          volante.telegramChatId,
          {
            volanteNome: volante.volanteNome,
            lojasNaoRegistadas: volante.lojasNaoRegistadas,
            portalUrl
          }
        );
        
        if (resultado) {
          sucessos++;
          resultados.push({
            volante: volante.volanteNome,
            enviado: true,
            lojas: volante.lojasNaoRegistadas.length
          });
        } else {
          resultados.push({
            volante: volante.volanteNome,
            enviado: false,
            motivo: 'Erro ao enviar'
          });
        }
      }
      
      return {
        success: true,
        message: `Lembretes enviados: ${sucessos}/${volantesPendentes.length}`,
        volantes: resultados
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
