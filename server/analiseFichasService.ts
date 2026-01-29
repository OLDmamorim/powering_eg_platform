/**
 * Serviço de Análise de Fichas de Serviço
 * Processa ficheiros Excel de monitorização e gera relatórios por loja
 */

import * as XLSX from 'xlsx';

// Tipos de dados
export interface FichaServico {
  bostamp: string;
  nmdos: string; // "Ficha Servico XX" - contém número da loja
  loja: string; // Nome da loja (coluna C)
  gestor: string;
  coordenador: string;
  obrano: number; // Número da ficha
  matricula: string;
  dataObra: Date | null;
  diasAberto: number;
  dataServico: Date | null;
  diasExecutado: number; // Negativo = faltam dias, Positivo = passou do agendamento
  horaInicio: string;
  horaFim: string;
  status: string;
  dataNota: Date | null;
  diasNota: number;
  obs: string;
  email: string;
  segurado: string;
  marca: string;
  modelo: string;
  ref: string; // Referência/eurocode do vidro
  eurocode: string;
  nrFactura: number;
  serieFactura: string;
  nrSinistro: string;
  armazem: number;
  fechado: boolean;
  detalheDanos: string;
  contactoSegurado: string;
  nome: string;
}

export interface RelatorioLoja {
  numeroLoja: number | null;
  nomeLoja: string;
  totalFichas: number;
  
  // Categorias de análise
  fichasAbertas5Dias: FichaServico[];
  fichasAposAgendamento: FichaServico[];
  fichasStatusAlerta: FichaServico[]; // FALTA DOCUMENTOS, RECUSADO, INCIDÊNCIA
  fichasSemNotas: FichaServico[];
  fichasNotasAntigas: FichaServico[]; // Notas > 5 dias
  fichasDevolverVidro: FichaServico[];
  fichasSemEmailCliente: FichaServico[];
  
  // Estatísticas por status
  statusCount: Record<string, number>;
  
  // Referências para devolução
  referenciasDevolucao: string[];
  
  // Resumo
  resumo: string;
  
  // HTML formatado do relatório
  conteudoHTML: string;
}

export interface ResultadoAnalise {
  dataAnalise: Date;
  nomeArquivo: string;
  totalFichas: number;
  totalLojas: number;
  relatoriosPorLoja: RelatorioLoja[];
  resumoGeral: {
    totalFichasAbertas5Dias: number;
    totalFichasAposAgendamento: number;
    totalFichasStatusAlerta: number;
    totalFichasSemNotas: number;
    totalFichasNotasAntigas: number;
    totalFichasDevolverVidro: number;
    totalFichasSemEmailCliente: number;
    statusGeral: Record<string, number>;
  };
}

// Status a excluir da análise
const STATUS_EXCLUIR = ['Serviço Pronto', 'REVISAR'];

// Status de alerta
const STATUS_ALERTA = ['FALTA DOCUMENTOS', 'RECUSADO', 'INCIDÊNCIA'];

/**
 * Extrai número da loja do campo nmdos
 * Ex: "Ficha Servico 23" -> 23
 */
function extrairNumeroLoja(nmdos: string): number | null {
  if (!nmdos) return null;
  const match = nmdos.match(/(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return isNaN(num) ? null : num;
}

/**
 * Converte valor Excel para Date
 */
function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Verifica se o email é do domínio @expressglass.pt (não é email de cliente)
 */
function isEmailExpressGlass(email: string): boolean {
  if (!email) return true; // Sem email também conta
  return email.toLowerCase().includes('@expressglass.pt');
}

/**
 * Verifica se a ficha não tem notas (obs vazio ou "Falta Notas !!!")
 */
function fichaTemNotas(obs: string): boolean {
  if (!obs) return false;
  const obsLower = obs.toLowerCase().trim();
  if (obsLower === '' || obsLower.includes('falta notas')) return false;
  return true;
}

/**
 * Processa o ficheiro Excel e extrai as fichas de serviço
 */
export function processarFicheiroExcel(buffer: Buffer): FichaServico[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  
  // Procurar a folha "Base" ou usar a primeira
  const sheetName = workbook.SheetNames.includes('Base') ? 'Base' : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converter para JSON
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][];
  
  if (rows.length < 2) {
    throw new Error('Ficheiro não contém dados suficientes');
  }
  
  // Mapear cabeçalhos
  const headers = rows[0] as string[];
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    if (h) colIndex[h.toLowerCase().trim()] = i;
  });
  
  // Processar linhas de dados
  const fichas: FichaServico[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const status = String(row[colIndex['status']] || '').trim();
    
    // Excluir status que não devem ser analisados
    if (STATUS_EXCLUIR.includes(status)) continue;
    
    const ficha: FichaServico = {
      bostamp: String(row[colIndex['bostamp']] || ''),
      nmdos: String(row[colIndex['nmdos']] || ''),
      loja: String(row[colIndex['lojas']] || ''),
      gestor: String(row[colIndex['gestor']] || ''),
      coordenador: String(row[colIndex['coordenador']] || ''),
      obrano: parseInt(row[colIndex['obrano']]) || 0,
      matricula: String(row[colIndex['matricula']] || ''),
      dataObra: parseExcelDate(row[colIndex['dataobra']]),
      diasAberto: parseInt(row[colIndex['nº dias aberto:']]) || 0,
      dataServico: parseExcelDate(row[colIndex['dataserviço']]),
      diasExecutado: parseInt(row[colIndex['nº dias executado']]) || 0,
      horaInicio: String(row[colIndex['hora_inicio']] || ''),
      horaFim: String(row[colIndex['hora_fim']] || ''),
      status: status,
      dataNota: parseExcelDate(row[colIndex['dta nota']]),
      diasNota: parseInt(row[colIndex['dias nota:']]) || 0,
      obs: String(row[colIndex['obs']] || ''),
      email: String(row[colIndex['email']] || ''),
      segurado: String(row[colIndex['segurado']] || ''),
      marca: String(row[colIndex['marca']] || ''),
      modelo: String(row[colIndex['modelo']] || ''),
      ref: String(row[colIndex['ref']] || ''),
      eurocode: String(row[colIndex['eurocode']] || ''),
      nrFactura: parseInt(row[colIndex['nrfactura']]) || 0,
      serieFactura: String(row[colIndex['seriefcatura']] || ''),
      nrSinistro: String(row[colIndex['nrsinistro']] || ''),
      armazem: parseInt(row[colIndex['armazem']]) || 0,
      fechado: row[colIndex['fechado']] === true || row[colIndex['fechado']] === 'True',
      detalheDanos: String(row[colIndex['detalhe_danos']] || ''),
      contactoSegurado: String(row[colIndex['u_contsega']] || ''),
      nome: String(row[colIndex['nome']] || ''),
    };
    
    fichas.push(ficha);
  }
  
  return fichas;
}

/**
 * Agrupa fichas por loja
 */
function agruparPorLoja(fichas: FichaServico[]): Map<string, FichaServico[]> {
  const grupos = new Map<string, FichaServico[]>();
  
  for (const ficha of fichas) {
    const chave = ficha.loja || 'Desconhecida';
    if (!grupos.has(chave)) {
      grupos.set(chave, []);
    }
    grupos.get(chave)!.push(ficha);
  }
  
  return grupos;
}

/**
 * Formata uma ficha para exibição na tabela
 */
function formatarFichaParaTabela(ficha: FichaServico, incluirDias: boolean = false, tipoDias: 'aberto' | 'nota' | 'executado' = 'aberto'): string {
  let texto = `${ficha.coordenador} // ${ficha.obrano} // ${ficha.matricula}: <b><i>${ficha.status}</i></b>`;
  
  if (incluirDias) {
    if (tipoDias === 'aberto') {
      texto += ` (${ficha.diasAberto} dias aberto)`;
    } else if (tipoDias === 'nota') {
      texto += ` (${ficha.diasNota} dias sem notas)`;
    } else if (tipoDias === 'executado') {
      texto += ` (${ficha.diasExecutado} dias após agendamento)`;
    }
  }
  
  return texto;
}

/**
 * Gera o HTML do relatório para uma loja
 */
function gerarHTMLRelatorio(relatorio: RelatorioLoja): string {
  let html = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">`;
  
  // Título
  html += `<h1 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">${relatorio.nomeLoja}${relatorio.numeroLoja ? ` (${relatorio.numeroLoja})` : ''}</h1>`;
  
  // Tabela de status
  if (Object.keys(relatorio.statusCount).length > 0) {
    html += `<div style="margin: 20px 0; padding: 15px; background: #f7fafc; border-radius: 8px;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #2d3748;">QUANTIDADE DE PROCESSOS PARA INTERVIR POR STATUS</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    html += `<tr style="background: #e2e8f0;"><th style="padding: 8px; text-align: left; border: 1px solid #cbd5e0;">Status</th><th style="padding: 8px; text-align: center; border: 1px solid #cbd5e0;">Quantidade</th></tr>`;
    for (const [status, count] of Object.entries(relatorio.statusCount).sort((a, b) => b[1] - a[1])) {
      html += `<tr><td style="padding: 8px; border: 1px solid #cbd5e0;">${status}</td><td style="padding: 8px; text-align: center; border: 1px solid #cbd5e0;">${count}</td></tr>`;
    }
    html += `</table></div>`;
  }
  
  // FS abertas a 5 ou mais dias
  if (relatorio.fichasAbertas5Dias.length > 0) {
    const fichasOrdenadas = [...relatorio.fichasAbertas5Dias].sort((a, b) => b.diasAberto - a.diasAberto);
    html += `<div style="margin: 20px 0; padding: 15px; background: #fff5f5; border-radius: 8px; border-left: 4px solid #c53030;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #c53030; text-transform: uppercase; font-weight: bold;">FS ABERTAS A 5 OU MAIS DIAS QUE NÃO ESTÃO FINALIZADOS</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    for (const ficha of fichasOrdenadas) {
      html += `<tr><td style="padding: 6px; border-bottom: 1px solid #fed7d7;">${formatarFichaParaTabela(ficha, true, 'aberto')}</td></tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #c53030;">Total: ${relatorio.fichasAbertas5Dias.length} processos</p>`;
    html += `</div>`;
  }
  
  // FS após agendamento
  if (relatorio.fichasAposAgendamento.length > 0) {
    const fichasOrdenadas = [...relatorio.fichasAposAgendamento].sort((a, b) => b.diasExecutado - a.diasExecutado);
    html += `<div style="margin: 20px 0; padding: 15px; background: #fffaf0; border-radius: 8px; border-left: 4px solid #dd6b20;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #dd6b20; text-transform: uppercase; font-weight: bold;">FS ABERTAS QUE PASSARAM 2 OU MAIS DIAS DO AGENDAMENTO E NÃO ESTÃO CONCLUÍDOS</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    for (const ficha of fichasOrdenadas) {
      html += `<tr><td style="padding: 6px; border-bottom: 1px solid #feebc8;">${formatarFichaParaTabela(ficha, true, 'executado')}</td></tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #dd6b20;">Total: ${relatorio.fichasAposAgendamento.length} processos</p>`;
    html += `</div>`;
  }
  
  // FS em status de alerta
  if (relatorio.fichasStatusAlerta.length > 0) {
    html += `<div style="margin: 20px 0; padding: 15px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #dc2626; text-transform: uppercase; font-weight: bold;">FS EM STATUS DE ALERTA (FALTA DOCUMENTOS, RECUSADO OU INCIDÊNCIA)</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    for (const ficha of relatorio.fichasStatusAlerta) {
      html += `<tr><td style="padding: 6px; border-bottom: 1px solid #fecaca;">${formatarFichaParaTabela(ficha)}</td></tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #dc2626;">Total: ${relatorio.fichasStatusAlerta.length} processos</p>`;
    html += `</div>`;
  }
  
  // FS sem notas
  if (relatorio.fichasSemNotas.length > 0) {
    html += `<div style="margin: 20px 0; padding: 15px; background: #fefce8; border-radius: 8px; border-left: 4px solid #ca8a04;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #ca8a04; text-transform: uppercase; font-weight: bold;">FS SEM NOTAS</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    for (const ficha of relatorio.fichasSemNotas) {
      html += `<tr><td style="padding: 6px; border-bottom: 1px solid #fef08a;">${formatarFichaParaTabela(ficha)}</td></tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #ca8a04;">Total: ${relatorio.fichasSemNotas.length} processos</p>`;
    html += `</div>`;
  }
  
  // FS com notas antigas
  if (relatorio.fichasNotasAntigas.length > 0) {
    const fichasOrdenadas = [...relatorio.fichasNotasAntigas].sort((a, b) => b.diasNota - a.diasNota);
    html += `<div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #16a34a; text-transform: uppercase; font-weight: bold;">FS ABERTAS CUJAS NOTAS NÃO SÃO ATUALIZADAS A 5 OU MAIS DIAS</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    for (const ficha of fichasOrdenadas) {
      html += `<tr><td style="padding: 6px; border-bottom: 1px solid #bbf7d0;">${formatarFichaParaTabela(ficha, true, 'nota')}</td></tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #16a34a;">Total: ${relatorio.fichasNotasAntigas.length} processos</p>`;
    html += `</div>`;
  }
  
  // FS Devolve Vidro e Encerra
  if (relatorio.fichasDevolverVidro.length > 0) {
    html += `<div style="margin: 20px 0; padding: 15px; background: #faf5ff; border-radius: 8px; border-left: 4px solid #7c3aed;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #7c3aed; text-transform: uppercase; font-weight: bold;">FS COM STATUS: DEVOLVE VIDRO E ENCERRA!</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    for (const ficha of relatorio.fichasDevolverVidro) {
      html += `<tr><td style="padding: 6px; border-bottom: 1px solid #e9d5ff;">${formatarFichaParaTabela(ficha)}</td></tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #7c3aed;">Total: ${relatorio.fichasDevolverVidro.length} processos</p>`;
    html += `</div>`;
  }
  
  // Referências para devolução
  if (relatorio.referenciasDevolucao.length > 0) {
    html += `<div style="margin: 20px 0; padding: 15px; background: #fdf2f8; border-radius: 8px; border-left: 4px solid #db2777;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #db2777; text-transform: uppercase; font-weight: bold;">EFETUAR DE FORMA IMEDIATA DEVOLUÇÕES DOS SEGUINTES VIDROS</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    html += `<tr style="background: #fce7f3;"><th style="padding: 8px; text-align: left; border: 1px solid #fbcfe8;">Referência</th></tr>`;
    for (const ref of relatorio.referenciasDevolucao) {
      html += `<tr><td style="padding: 8px; border: 1px solid #fbcfe8;">${ref}</td></tr>`;
    }
    html += `</table></div>`;
  }
  
  // FS sem email de cliente
  if (relatorio.fichasSemEmailCliente.length > 0) {
    html += `<div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0284c7;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #0284c7; text-transform: uppercase; font-weight: bold;">FS SEM EMAIL DE CLIENTE</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    for (const ficha of relatorio.fichasSemEmailCliente) {
      html += `<tr><td style="padding: 6px; border-bottom: 1px solid #bae6fd;">${formatarFichaParaTabela(ficha)}</td></tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #0284c7;">Total: ${relatorio.fichasSemEmailCliente.length} processos</p>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #0284c7; text-transform: uppercase;">FORAM PEDIDOS OS EMAILS AOS CLIENTES??</p>`;
    html += `</div>`;
  }
  
  // Resumo
  html += `<div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; border: 2px solid #1a365d;">`;
  html += `<h3 style="margin: 0 0 10px 0; color: #1a365d;">RESUMO DA ANÁLISE</h3>`;
  html += `<p style="margin: 0; line-height: 1.6;">${relatorio.resumo}</p>`;
  html += `</div>`;
  
  html += `</div>`;
  
  return html;
}

/**
 * Gera o resumo textual para uma loja
 */
function gerarResumo(relatorio: RelatorioLoja): string {
  const problemas: string[] = [];
  
  if (relatorio.fichasAbertas5Dias.length > 0) {
    problemas.push(`${relatorio.fichasAbertas5Dias.length} fichas abertas há mais de 5 dias`);
  }
  if (relatorio.fichasAposAgendamento.length > 0) {
    problemas.push(`${relatorio.fichasAposAgendamento.length} fichas que passaram do agendamento`);
  }
  if (relatorio.fichasStatusAlerta.length > 0) {
    problemas.push(`${relatorio.fichasStatusAlerta.length} fichas em status de alerta`);
  }
  if (relatorio.fichasSemNotas.length > 0) {
    problemas.push(`${relatorio.fichasSemNotas.length} fichas sem notas`);
  }
  if (relatorio.fichasNotasAntigas.length > 0) {
    problemas.push(`${relatorio.fichasNotasAntigas.length} fichas com notas desatualizadas`);
  }
  if (relatorio.fichasDevolverVidro.length > 0) {
    problemas.push(`${relatorio.fichasDevolverVidro.length} vidros para devolver`);
  }
  if (relatorio.fichasSemEmailCliente.length > 0) {
    problemas.push(`${relatorio.fichasSemEmailCliente.length} fichas sem email de cliente`);
  }
  
  if (problemas.length === 0) {
    return `A loja ${relatorio.nomeLoja} não apresenta problemas significativos nas fichas de serviço analisadas. Total de ${relatorio.totalFichas} fichas em análise.`;
  }
  
  return `A loja ${relatorio.nomeLoja} tem ${relatorio.totalFichas} fichas de serviço em análise. Foram identificados os seguintes pontos de atenção: ${problemas.join('; ')}. Recomenda-se intervenção imediata nos processos identificados.`;
}

/**
 * Analisa as fichas e gera relatórios por loja
 */
export function analisarFichas(fichas: FichaServico[], nomeArquivo: string): ResultadoAnalise {
  const grupos = agruparPorLoja(fichas);
  const relatorios: RelatorioLoja[] = [];
  
  const resumoGeral = {
    totalFichasAbertas5Dias: 0,
    totalFichasAposAgendamento: 0,
    totalFichasStatusAlerta: 0,
    totalFichasSemNotas: 0,
    totalFichasNotasAntigas: 0,
    totalFichasDevolverVidro: 0,
    totalFichasSemEmailCliente: 0,
    statusGeral: {} as Record<string, number>,
  };
  
  for (const [nomeLoja, fichasLoja] of Array.from(grupos.entries())) {
    // Extrair número da loja da primeira ficha
    const numeroLoja = fichasLoja.length > 0 ? extrairNumeroLoja(fichasLoja[0].nmdos) : null;
    
    // Filtrar por categorias
    const fichasAbertas5Dias = fichasLoja.filter((f: FichaServico) => f.diasAberto >= 5);
    const fichasAposAgendamento = fichasLoja.filter((f: FichaServico) => f.diasExecutado >= 2);
    const fichasStatusAlerta = fichasLoja.filter((f: FichaServico) => STATUS_ALERTA.includes(f.status));
    const fichasSemNotas = fichasLoja.filter((f: FichaServico) => !fichaTemNotas(f.obs));
    const fichasNotasAntigas = fichasLoja.filter((f: FichaServico) => f.diasNota >= 5 && fichaTemNotas(f.obs));
    const fichasDevolverVidro = fichasLoja.filter((f: FichaServico) => f.status === 'Devolve Vidro e Encerra!');
    const fichasSemEmailCliente = fichasLoja.filter((f: FichaServico) => isEmailExpressGlass(f.email));
    
    // Contar status
    const statusCount: Record<string, number> = {};
    for (const ficha of fichasLoja) {
      if (ficha.status) {
        statusCount[ficha.status] = (statusCount[ficha.status] || 0) + 1;
        resumoGeral.statusGeral[ficha.status] = (resumoGeral.statusGeral[ficha.status] || 0) + 1;
      }
    }
    
    // Extrair referências para devolução
    const referenciasDevolucao = fichasDevolverVidro
      .map((f: FichaServico) => f.ref)
      .filter((r: string) => r && r.trim() !== '');
    
    const relatorio: RelatorioLoja = {
      numeroLoja,
      nomeLoja,
      totalFichas: fichasLoja.length,
      fichasAbertas5Dias,
      fichasAposAgendamento,
      fichasStatusAlerta,
      fichasSemNotas,
      fichasNotasAntigas,
      fichasDevolverVidro,
      fichasSemEmailCliente,
      statusCount,
      referenciasDevolucao,
      resumo: '',
      conteudoHTML: '',
    };
    
    // Gerar resumo e HTML
    relatorio.resumo = gerarResumo(relatorio);
    relatorio.conteudoHTML = gerarHTMLRelatorio(relatorio);
    
    relatorios.push(relatorio);
    
    // Atualizar totais gerais
    resumoGeral.totalFichasAbertas5Dias += fichasAbertas5Dias.length;
    resumoGeral.totalFichasAposAgendamento += fichasAposAgendamento.length;
    resumoGeral.totalFichasStatusAlerta += fichasStatusAlerta.length;
    resumoGeral.totalFichasSemNotas += fichasSemNotas.length;
    resumoGeral.totalFichasNotasAntigas += fichasNotasAntigas.length;
    resumoGeral.totalFichasDevolverVidro += fichasDevolverVidro.length;
    resumoGeral.totalFichasSemEmailCliente += fichasSemEmailCliente.length;
  }
  
  // Ordenar relatórios por nome da loja
  relatorios.sort((a, b) => a.nomeLoja.localeCompare(b.nomeLoja));
  
  return {
    dataAnalise: new Date(),
    nomeArquivo,
    totalFichas: fichas.length,
    totalLojas: grupos.size,
    relatoriosPorLoja: relatorios,
    resumoGeral,
  };
}

/**
 * Função principal que processa o ficheiro e retorna o resultado da análise
 */
export function processarAnalise(buffer: Buffer, nomeArquivo: string): ResultadoAnalise {
  const fichas = processarFicheiroExcel(buffer);
  return analisarFichas(fichas, nomeArquivo);
}
