import { notifyOwner } from "./_core/notification";
import * as db from "./db";

/**
 * Gera e envia um resumo semanal ao owner do projeto
 * Inclui estatísticas de visitas, pendentes e alertas
 */
export async function enviarResumoSemanal(): Promise<boolean> {
  try {
    // Buscar dados da última semana
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    // Buscar todos os dados
    const lojas = await db.getAllLojas();
    const gestores = await db.getAllGestores();
    const relatoriosLivres = await db.getAllRelatoriosLivres();
    const relatoriosCompletos = await db.getAllRelatoriosCompletos();
    const pendentes = await db.getAllPendentes();

    // Filtrar relatórios da última semana
    const relLivresSemana = relatoriosLivres.filter((r: any) => 
      new Date(r.dataVisita) >= umaSemanaAtras
    );
    const relCompletosSemana = relatoriosCompletos.filter((r: any) => 
      new Date(r.dataVisita) >= umaSemanaAtras
    );

    // Pendentes não resolvidos
    const pendentesAtivos = pendentes.filter((p: any) => !p.resolvido);
    
    // Pendentes antigos (mais de 7 dias)
    const pendentesAntigos = pendentesAtivos.filter((p: any) => {
      const dataCriacao = new Date(p.createdAt);
      return dataCriacao < umaSemanaAtras;
    });

    // Novos pendentes esta semana
    const novosPendentes = pendentes.filter((p: any) => 
      new Date(p.createdAt) >= umaSemanaAtras
    );

    // Pendentes resolvidos esta semana
    const pendentesResolvidos = pendentes.filter((p: any) => 
      p.resolvido && p.dataResolucao && new Date(p.dataResolucao) >= umaSemanaAtras
    );

    // Construir conteúdo do resumo
    const title = `📊 Resumo Semanal PoweringEG - ${new Date().toLocaleDateString('pt-PT')}`;
    
    let content = `**Resumo da Semana** (${umaSemanaAtras.toLocaleDateString('pt-PT')} - ${new Date().toLocaleDateString('pt-PT')})\n\n`;
    
    content += `📈 **Estatísticas Gerais**\n`;
    content += `• Total de Lojas: ${lojas.length}\n`;
    content += `• Total de Gestores: ${gestores.length}\n\n`;
    
    content += `📝 **Visitas esta Semana**\n`;
    content += `• Relatórios Livres: ${relLivresSemana.length}\n`;
    content += `• Relatórios Completos: ${relCompletosSemana.length}\n`;
    content += `• Total de Visitas: ${relLivresSemana.length + relCompletosSemana.length}\n\n`;
    
    content += `📋 **Pendentes**\n`;
    content += `• Pendentes Ativos: ${pendentesAtivos.length}\n`;
    content += `• Novos esta Semana: ${novosPendentes.length}\n`;
    content += `• Resolvidos esta Semana: ${pendentesResolvidos.length}\n`;
    
    if (pendentesAntigos.length > 0) {
      content += `\n⚠️ **ALERTA: ${pendentesAntigos.length} pendente(s) há mais de 7 dias!**\n`;
      pendentesAntigos.slice(0, 5).forEach((p: any) => {
        const dias = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        content += `• ${p.descricao?.substring(0, 50)}... (${dias} dias)\n`;
      });
      if (pendentesAntigos.length > 5) {
        content += `• ... e mais ${pendentesAntigos.length - 5} pendente(s)\n`;
      }
    }

    content += `\n---\nRelatório gerado automaticamente pelo PoweringEG Platform`;

    // Enviar notificação
    const enviado = await notifyOwner({ title, content });
    
    if (enviado) {
      console.log('[WeeklyReport] Resumo semanal enviado com sucesso');
    } else {
      console.warn('[WeeklyReport] Falha ao enviar resumo semanal');
    }

    return enviado;
  } catch (error) {
    console.error('[WeeklyReport] Erro ao gerar resumo semanal:', error);
    return false;
  }
}
