import { gerarPDFAnaliseFichas } from './server/pdfAnaliseFichas';
import * as fs from 'fs';

const htmlReal = `<div style="margin: 20px 0; padding: 15px; background: #fff5f5; border-radius: 8px; border-left: 4px solid #c53030;"><h3 style="margin: 0 0 10px 0; color: #c53030; text-transform: uppercase; font-weight: bold;">FS ABERTAS A 5 OU MAIS DIAS QUE NÃO ESTÃO FINALIZADOS</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 6px; border-bottom: 1px solid #fed7d7;">FS 27 // 57-NP-74: <b><i>AUTORIZADO</i></b> (10 dias aberto)</td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fed7d7;">FS 33 // 18-DA-80: <b><i>AUTORIZADO</i></b> (8 dias aberto)</td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fed7d7;">FS 34 // 60-QR-23: <b><i>AUTORIZADO</i></b> (8 dias aberto)</td></tr></table><p style="margin: 10px 0 0 0; font-weight: bold; color: #c53030;">Total: 3 processos</p></div><div style="margin: 20px 0; padding: 15px; background: #fefce8; border-radius: 8px; border-left: 4px solid #ca8a04;"><h3 style="margin: 0 0 10px 0; color: #ca8a04; text-transform: uppercase; font-weight: bold;">FS SEM NOTAS</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 27 // 57-NP-74: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 33 // 18-DA-80: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 34 // 60-QR-23: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 41 // 94-SJ-65: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 45 // 88-VP-92: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 42 // 26-NN-03: <b><i>Pedido Autorização</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 50 // 07-GS-15: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 49 // 59-06-JZ: <b><i>Pedido Autorização</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 54 // BM-45-LC: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 57 // 42-48-PB: <b><i>Pedido Autorização</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">FS 56 // 26-GU-02: <b><i>Pedido Autorização</i></b></td></tr></table><p style="margin: 10px 0 0 0; font-weight: bold; color: #ca8a04;">Total: 11 processos</p></div><div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0284c7;"><h3 style="margin: 0 0 10px 0; color: #0284c7; text-transform: uppercase; font-weight: bold;">FS SEM EMAIL DE CLIENTE</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 27 // 57-NP-74: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 33 // 18-DA-80: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 41 // 94-SJ-65: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 44 // BL-49-RT: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 45 // 88-VP-92: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 42 // 26-NN-03: <b><i>Pedido Autorização</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 50 // 07-GS-15: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 47 // 58-28-GN: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 48 // BL-49-RT: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 54 // BM-45-LC: <b><i>AUTORIZADO</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 57 // 42-48-PB: <b><i>Pedido Autorização</i></b></td></tr><tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">FS 56 // 26-GU-02: <b><i>Pedido Autorização</i></b></td></tr></table><p style="margin: 10px 0 0 0; font-weight: bold; color: #0284c7;">Total: 12 processos</p><p style="margin: 10px 0 0 0; font-weight: bold; color: #0284c7; text-transform: uppercase;">FORAM PEDIDOS OS EMAILS AOS CLIENTES??</p></div>`;

const resumoReal = `PONTO DE SITUACAO - BARCELOS

A loja tem atualmente 14 fichas de servico em aberto que requerem atencao e acompanhamento.

NIVEL DE URGENCIA: ALTO

ACOES NECESSARIAS:

1. FICHAS ABERTAS HA MAIS DE 5 DIAS (3 processos)
- Verificar o motivo do atraso em cada processo
- Contactar o cliente para confirmar disponibilidade
- Agendar servico ou encerrar processo se nao houver resposta
- Prioridade: Processos com mais de 30 dias devem ser tratados HOJE

4. FICHAS SEM NOTAS (11 processos)
- OBRIGATORIO: Adicionar nota com ponto de situacao atual
- Indicar proxima acao prevista e data
- Registar contactos realizados com cliente

7. FICHAS SEM EMAIL DE CLIENTE (12 processos)
- Solicitar email ao cliente no proximo contacto
- Registar email no sistema para comunicacoes futuras
- Importante para envio de orcamentos e confirmacoes`;

async function test() {
  try {
    console.log('Iniciando teste com HTML real...');
    const pdf = await gerarPDFAnaliseFichas({
      nomeLoja: 'Barcelos',
      numeroLoja: 23,
      totalFichas: 14,
      fichasAbertas5Dias: 3,
      fichasAposAgendamento: 0,
      fichasStatusAlerta: 0,
      fichasSemNotas: 11,
      fichasNotasAntigas: 0,
      fichasDevolverVidro: 0,
      fichasSemEmailCliente: 12,
      resumo: resumoReal,
      conteudoRelatorio: htmlReal,
      statusCount: {
        'AUTORIZADO': 10,
        'Pedido Autorização': 4
      }
    }, new Date('2026-01-30'));
    
    console.log('PDF gerado com sucesso, tamanho:', pdf.length);
    
    // Salvar para verificar
    fs.writeFileSync('/tmp/test-pdf-real.pdf', Buffer.from(pdf, 'base64'));
    console.log('PDF salvo em /tmp/test-pdf-real.pdf');
  } catch (err) {
    console.error('Erro:', err);
  }
}

test();
