import * as XLSX from 'xlsx';
import { getEvolucaoAgregadaPorGestor, getRankingLojas, getLojasByGestorId } from './db';

interface DadosExportacao {
  gestorNome: string;
  gestorEmail: string;
  periodo: { mes: number; ano: number };
  evolucao: any[];
  ranking: any[];
  lojas: any[];
}

/**
 * Gera arquivo Excel com dados agregados do gestor
 */
export async function gerarExcelMinhasLojas(
  gestorId: number,
  gestorNome: string,
  gestorEmail: string,
  mes: number,
  ano: number
): Promise<Buffer> {
  // Buscar dados
  const evolucao = await getEvolucaoAgregadaPorGestor(gestorId, 6);
  const lojas = await getLojasByGestorId(gestorId);
  const lojaIds = lojas.map(l => l.id);
  
  // Buscar ranking completo e filtrar
  const rankingCompleto = await getRankingLojas('totalServicos', mes, ano, 100);
  const ranking = rankingCompleto.filter(r => lojaIds.includes(r.lojaId));
  
  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // === Folha 1: Informações ===
  const infoData = [
    ['Relatório de Resultados - Minhas Lojas'],
    [''],
    ['Gestor:', gestorNome],
    ['Email:', gestorEmail],
    ['Período:', `${getMesNome(mes)}/${ano}`],
    ['Data de Geração:', new Date().toLocaleString('pt-PT')],
    [''],
    ['Total de Lojas:', lojas.length],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Informações');
  
  // === Folha 2: Evolução Mensal ===
  if (evolucao && evolucao.length > 0) {
    const evolucaoData = [
      ['Mês/Ano', 'Total Serviços', 'Objetivo', 'Desvio %', 'Taxa Reparação %', 'Reparações', 'Serv/Colab', 'Colaboradores'],
      ...evolucao.map(e => [
        `${getMesNome(e.mes)}/${e.ano}`,
        e.totalServicos,
        e.objetivoMensal,
        e.desvioPercentualMes ? e.desvioPercentualMes.toFixed(1) : 'N/A',
        e.taxaReparacao ? (e.taxaReparacao * 100).toFixed(1) : 'N/A',
        e.qtdReparacoes,
        e.servicosPorColaborador ? e.servicosPorColaborador.toFixed(1) : 'N/A',
        e.numColaboradores,
      ]),
    ];
    const wsEvolucao = XLSX.utils.aoa_to_sheet(evolucaoData);
    XLSX.utils.book_append_sheet(wb, wsEvolucao, 'Evolução Mensal');
  }
  
  // === Folha 3: Ranking de Lojas ===
  if (ranking && ranking.length > 0) {
    const rankingData = [
      ['Posição', 'Loja', 'Zona', 'Total Serviços', 'Objetivo', 'Desvio %', 'Taxa Reparação %'],
      ...ranking.map((r, idx) => [
        idx + 1,
        r.lojaNome,
        r.zona || 'N/A',
        r.totalServicos,
        r.objetivoMensal,
        r.desvioPercentualMes ? r.desvioPercentualMes.toFixed(1) : 'N/A',
        r.taxaReparacao ? (r.taxaReparacao * 100).toFixed(1) : 'N/A',
      ]),
    ];
    const wsRanking = XLSX.utils.aoa_to_sheet(rankingData);
    XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking Lojas');
  }
  
  // === Folha 4: Lista de Lojas ===
  const lojasData = [
    ['ID', 'Nome', 'Zona', 'Morada'],
    ...lojas.map(l => [
      l.id,
      l.nome,
      'N/A', // zona não existe na tabela lojas
      'N/A', // morada não existe na tabela lojas
    ]),
  ];
  const wsLojas = XLSX.utils.aoa_to_sheet(lojasData);
  XLSX.utils.book_append_sheet(wb, wsLojas, 'Lojas da Zona');
  
  // Gerar buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Gera dados estruturados para exportação (usado por PDF e Excel)
 */
export async function getDadosExportacao(
  gestorId: number,
  gestorNome: string,
  gestorEmail: string,
  mes: number,
  ano: number
): Promise<DadosExportacao> {
  const evolucao = await getEvolucaoAgregadaPorGestor(gestorId, 6);
  const lojas = await getLojasByGestorId(gestorId);
  const lojaIds = lojas.map(l => l.id);
  
  const rankingCompleto = await getRankingLojas('totalServicos', mes, ano, 100);
  const ranking = rankingCompleto.filter(r => lojaIds.includes(r.lojaId));
  
  return {
    gestorNome,
    gestorEmail,
    periodo: { mes, ano },
    evolucao,
    ranking,
    lojas,
  };
}

function getMesNome(mes: number): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return meses[mes - 1] || 'N/A';
}
