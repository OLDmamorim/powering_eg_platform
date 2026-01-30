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

// Mapeamento de cidades conhecidas para normalização
const CIDADES_CONHECIDAS = [
  'Abrantes', 'Albufeira', 'Almada', 'Amadora', 'Aveiro', 'Barcelos', 'Braga', 'Bragança',
  'Caldas', 'Cascais', 'Castelo Branco', 'Chaves', 'Coimbra', 'Covilhã', 'Évora',
  'Famalicão', 'Faro', 'Figueira', 'Funchal', 'Gondomar', 'Guarda', 'Guimarães',
  'Leiria', 'Lisboa', 'Loures', 'Maia', 'Matosinhos', 'Montijo', 'Odivelas', 'Oeiras',
  'Olhão', 'Paredes', 'Peniche', 'Pombal', 'Ponte Lima', 'Portalegre', 'Portimão', 'Porto',
  'Santarém', 'Seixal', 'Setúbal', 'Sintra', 'Tomar', 'Torres Vedras', 'Viana', 'Vila Franca',
  'Vila Nova Gaia', 'Vila Real', 'Viseu'
];

/**
 * Verifica se é um serviço móvel baseado no nmdos ou nome da loja
 */
function isServicoMovel(nmdos: string, nomeLoja: string): boolean {
  const textoCompleto = `${nmdos} ${nomeLoja}`.toLowerCase();
  return textoCompleto.includes('s.movel') || 
         textoCompleto.includes('smovel') || 
         textoCompleto.includes('serviço móvel') || 
         textoCompleto.includes('servico movel') ||
         textoCompleto.includes('sm ');
}

/**
 * Extrai a cidade do nome da loja ou nmdos
 */
function extrairCidade(nmdos: string, nomeLoja: string): string | null {
  const textoCompleto = `${nmdos} ${nomeLoja}`;
  
  // Procurar cidades conhecidas no texto
  for (const cidade of CIDADES_CONHECIDAS) {
    const regex = new RegExp(cidade.replace(/\s+/g, '\\s*'), 'i');
    if (regex.test(textoCompleto)) {
      return cidade;
    }
  }
  
  // Tentar extrair cidade do padrão "X-Cidade" no nmdos (ex: "7-Leiria")
  const matchCidade = nmdos.match(/\d+-([A-Za-zà-ú\s]+)/i);
  if (matchCidade && matchCidade[1]) {
    return matchCidade[1].trim();
  }
  
  return null;
}

/**
 * Normaliza o nome da loja para identificação correta
 * Considera: Serviço Móvel (SM), cidade, nome original
 * 
 * Exemplos:
 * - "Ficha S.Movel 7-Leiria" + "Serviço Móvel Leiria" -> "Leiria SM"
 * - "Ficha S.Movel 1-Braga" + "Serviço Móvel Braga" -> "Braga SM"
 * - "Ficha Servico 18" + "Braga" -> "Braga"
 * - "Ficha Servico 7" + "Guimarães" -> "Guimarães"
 */
export function normalizarNomeLoja(nmdos: string, nomeLoja: string): string {
  const isSM = isServicoMovel(nmdos, nomeLoja);
  const cidade = extrairCidade(nmdos, nomeLoja);
  
  // Se é serviço móvel e temos cidade, usar "Cidade SM"
  if (isSM && cidade) {
    return `${cidade} SM`;
  }
  
  // Se é serviço móvel mas não identificamos cidade, usar nome original + SM
  if (isSM) {
    // Limpar "Serviço Móvel" do nome e adicionar SM
    let nomeBase = nomeLoja
      .replace(/serviço\s*móvel/gi, '')
      .replace(/servico\s*movel/gi, '')
      .replace(/s\.?movel/gi, '')
      .replace(/sm\s*/gi, '')
      .trim();
    
    if (nomeBase) {
      return `${nomeBase} SM`;
    }
    return `${nomeLoja} SM`;
  }
  
  // Não é serviço móvel - usar nome original ou cidade
  if (cidade && nomeLoja.toLowerCase().includes(cidade.toLowerCase())) {
    return cidade;
  }
  
  return nomeLoja;
}

/**
 * Extrai número da loja do campo nmdos
 * Ex: "Ficha Servico 23" -> 23
 * Ex: "Ficha S.Movel 7-Leiria" -> null (servico movel nao tem numero de loja tradicional)
 */
function extrairNumeroLoja(nmdos: string): number | null {
  if (!nmdos || typeof nmdos !== 'string') return null;
  
  // Se for servico movel, nao extrair numero (o numero e do servico, nao da loja)
  if (nmdos.toLowerCase().includes('s.movel') || nmdos.toLowerCase().includes('smovel') || nmdos.toLowerCase().includes('movel')) {
    return null;
  }
  
  // Padrao: "Ficha Servico XX" onde XX e o numero da loja
  const matchServico = nmdos.match(/ficha\s*servi[cç]o\s*(\d+)/i);
  if (matchServico && matchServico[1]) {
    const num = parseInt(matchServico[1], 10);
    if (Number.isFinite(num) && num > 0) {
      return num;
    }
  }
  
  return null;
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
  
  // Debug: mostrar cabeçalhos encontrados
  console.log('[processarFicheiroExcel] Cabeçalhos encontrados:', Object.keys(colIndex).join(', '));
  console.log('[processarFicheiroExcel] Coluna lojas index:', colIndex['lojas']);
  
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
    
    // Debug: mostrar primeiras 3 fichas
    if (fichas.length <= 3) {
      console.log('[processarFicheiroExcel] Ficha ' + fichas.length + ':', {
        nmdos: ficha.nmdos,
        loja: ficha.loja,
        obrano: ficha.obrano,
        status: ficha.status
      });
    }
  }
  
  console.log('[processarFicheiroExcel] Total fichas processadas:', fichas.length);
  return fichas;
}

/**
 * Agrupa fichas por loja usando normalização de nomes
 * Considera Serviço Móvel (SM) e cidades para agrupar corretamente
 */
function agruparPorLoja(fichas: FichaServico[]): Map<string, FichaServico[]> {
  const grupos = new Map<string, FichaServico[]>();
  
  for (const ficha of fichas) {
    // Usar normalização para identificar corretamente a loja
    const nomeNormalizado = normalizarNomeLoja(ficha.nmdos, ficha.loja);
    const chave = nomeNormalizado || ficha.loja || 'Desconhecida';
    
    if (!grupos.has(chave)) {
      grupos.set(chave, []);
    }
    grupos.get(chave)!.push(ficha);
  }
  
  // Debug: mostrar grupos criados
  console.log('[agruparPorLoja] Grupos criados:', Array.from(grupos.keys()).join(', '));
  
  return grupos;
}

/**
 * Formata uma ficha para exibição na tabela
 */
function formatarFichaParaTabela(ficha: FichaServico, incluirDias: boolean = false, tipoDias: 'aberto' | 'nota' | 'executado' = 'aberto'): string {
  let texto = `FS ${ficha.obrano} // ${ficha.matricula}: <b><i>${ficha.status}</i></b>`;
  
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
  
  // Nota: O resumo é mostrado separadamente no modal, não incluir aqui para evitar duplicação
  
  html += `</div>`;
  
  return html;
}

/**
 * Gera o resumo textual extenso para uma loja com instrucoes claras de acao
 */
function gerarResumo(relatorio: RelatorioLoja): string {
  const linhas: string[] = [];
  
  // Introducao
  linhas.push(`<strong>PONTO DE SITUACAO - ${relatorio.nomeLoja.toUpperCase()}</strong>`);
  linhas.push(``);
  linhas.push(`A loja tem atualmente <strong>${relatorio.totalFichas} fichas de servico em aberto</strong> que requerem atencao e acompanhamento.`);
  linhas.push(``);
  
  // Calcular nivel de urgencia
  const totalProblemas = relatorio.fichasAbertas5Dias.length + relatorio.fichasAposAgendamento.length + 
    relatorio.fichasStatusAlerta.length + relatorio.fichasSemNotas.length + relatorio.fichasNotasAntigas.length;
  
  let nivelUrgencia = 'BAIXO';
  let corUrgencia = '#16a34a';
  if (totalProblemas > 20) {
    nivelUrgencia = 'CRITICO';
    corUrgencia = '#dc2626';
  } else if (totalProblemas > 10) {
    nivelUrgencia = 'ALTO';
    corUrgencia = '#ea580c';
  } else if (totalProblemas > 5) {
    nivelUrgencia = 'MEDIO';
    corUrgencia = '#ca8a04';
  }
  
  linhas.push(`<strong style="color: ${corUrgencia};">NIVEL DE URGENCIA: ${nivelUrgencia}</strong>`);
  linhas.push(``);
  
  // Detalhes e instrucoes por categoria
  linhas.push(`<strong>ACOES NECESSARIAS:</strong>`);
  linhas.push(``);
  
  if (relatorio.fichasAbertas5Dias.length > 0) {
    linhas.push(`<strong>1. FICHAS ABERTAS HA MAIS DE 5 DIAS (${relatorio.fichasAbertas5Dias.length} processos)</strong>`);
    linhas.push(`   - Verificar o motivo do atraso em cada processo`);
    linhas.push(`   - Contactar o cliente para confirmar disponibilidade`);
    linhas.push(`   - Agendar servico ou encerrar processo se nao houver resposta`);
    linhas.push(`   - Prioridade: Processos com mais de 30 dias devem ser tratados HOJE`);
    linhas.push(``);
  }
  
  if (relatorio.fichasAposAgendamento.length > 0) {
    linhas.push(`<strong>2. FICHAS APOS DATA DE AGENDAMENTO (${relatorio.fichasAposAgendamento.length} processos)</strong>`);
    linhas.push(`   - Contactar IMEDIATAMENTE o cliente para reagendar`);
    linhas.push(`   - Verificar se o vidro esta disponivel em stock`);
    linhas.push(`   - Atualizar a data de agendamento no sistema`);
    linhas.push(`   - Se cliente nao atender, registar tentativa nas notas`);
    linhas.push(``);
  }
  
  if (relatorio.fichasStatusAlerta.length > 0) {
    linhas.push(`<strong>3. FICHAS EM STATUS DE ALERTA (${relatorio.fichasStatusAlerta.length} processos)</strong>`);
    linhas.push(`   - RECUSADO: Verificar o que solicitam imediatamente`);
    linhas.push(`   - FALTA DOCUMENTOS: Verificar o que falta para finalizar processo`);
    linhas.push(`   - INCIDENCIA: Resolver problema e atualizar status`);
    linhas.push(`   - Documentar todas as acoes tomadas nas notas`);
    linhas.push(``);
  }
  
  if (relatorio.fichasSemNotas.length > 0) {
    linhas.push(`<strong>4. FICHAS SEM NOTAS (${relatorio.fichasSemNotas.length} processos)</strong>`);
    linhas.push(`   - OBRIGATORIO: Adicionar nota com ponto de situacao atual`);
    linhas.push(`   - Indicar proxima acao prevista e data`);
    linhas.push(`   - Registar contactos realizados com cliente/seguradora`);
    linhas.push(``);
  }
  
  if (relatorio.fichasNotasAntigas.length > 0) {
    linhas.push(`<strong>5. FICHAS COM NOTAS DESATUALIZADAS (${relatorio.fichasNotasAntigas.length} processos)</strong>`);
    linhas.push(`   - Atualizar notas com informacao atual do processo`);
    linhas.push(`   - Indicar se houve contacto com cliente nos ultimos dias`);
    linhas.push(`   - Registar evolucao ou bloqueios encontrados`);
    linhas.push(``);
  }
  
  if (relatorio.fichasDevolverVidro.length > 0) {
    linhas.push(`<strong>6. VIDROS PARA DEVOLVER (${relatorio.fichasDevolverVidro.length} processos)</strong>`);
    linhas.push(`   - Preparar vidros para recolha pelo fornecedor`);
    linhas.push(`   - Verificar se guia de devolucao esta emitida`);
    linhas.push(`   - Contactar fornecedor para agendar recolha`);
    linhas.push(``);
  }
  
  if (relatorio.fichasSemEmailCliente.length > 0) {
    linhas.push(`<strong>7. FICHAS SEM EMAIL DE CLIENTE (${relatorio.fichasSemEmailCliente.length} processos)</strong>`);
    linhas.push(`   - Solicitar email ao cliente no proximo contacto`);
    linhas.push(`   - Registar email no sistema para comunicacoes futuras`);
    linhas.push(`   - Importante para envio de orcamentos e confirmacoes`);
    linhas.push(``);
  }
  
  if (totalProblemas === 0) {
    linhas.push(`<strong style="color: #16a34a;">PARABENS!</strong> A loja nao apresenta problemas significativos.`);
    linhas.push(`Continuar o bom trabalho e manter os processos atualizados.`);
  } else {
    linhas.push(`<strong>PRAZO PARA RESOLUCAO:</strong>`);
    linhas.push(`- Processos CRITICOS (>30 dias): Resolver HOJE`);
    linhas.push(`- Processos URGENTES (>15 dias): Resolver em 24 horas`);
    linhas.push(`- Demais processos: Resolver em 48 horas`);
    linhas.push(``);
    linhas.push(`<em>Este relatorio deve ser revisto diariamente ate que todos os pontos estejam resolvidos.</em>`);
  }
  
  return linhas.join('<br>');
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


/**
 * Gera o HTML completo para email de análise de fichas
 * Inclui cabeçalho, instrução para imprimir, resumo, métricas e fichas a intervir
 */
export function gerarHTMLEmailAnalise(relatorio: {
  nomeLoja: string;
  numeroLoja: number | null;
  totalFichas: number;
  fichasAbertas5Dias: number;
  fichasAposAgendamento: number;
  fichasStatusAlerta: number;
  fichasSemNotas: number;
  fichasNotasAntigas: number;
  fichasDevolverVidro: number;
  fichasSemEmailCliente: number;
  resumo: string;
  conteudoRelatorio: string;
}, dataAnalise: Date): string {
  const dataFormatada = dataAnalise.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  const numeroLojaTexto = relatorio.numeroLoja ? ` (#${relatorio.numeroLoja})` : '';
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Análise de Fichas de Serviço - ${relatorio.nomeLoja}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0 0 10px 0; font-size: 24px; }
    .header p { color: #e2e8f0; margin: 0; font-size: 14px; }
    .logo { font-size: 28px; font-weight: bold; color: white; margin-bottom: 15px; }
    .logo span { color: #48bb78; }
    .print-notice { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin: 20px; border-radius: 8px; text-align: center; }
    .print-notice p { color: #92400e; font-weight: bold; margin: 0; font-size: 14px; }
    .loja-title { background: #f8fafc; padding: 20px; border-bottom: 3px solid #1a365d; margin: 0; }
    .loja-title h2 { color: #1a365d; margin: 0; font-size: 22px; }
    .loja-title p { color: #64748b; margin: 5px 0 0 0; font-size: 14px; }
    .metrics { display: flex; justify-content: space-around; padding: 20px; background: #f8fafc; flex-wrap: wrap; }
    .metric { text-align: center; padding: 15px; min-width: 100px; }
    .metric-value { font-size: 32px; font-weight: bold; }
    .metric-label { font-size: 12px; color: #64748b; margin-top: 5px; }
    .metric-green { color: #16a34a; }
    .metric-red { color: #dc2626; }
    .metric-orange { color: #ea580c; }
    .metric-yellow { color: #ca8a04; }
    .resumo { padding: 20px; border-bottom: 1px solid #e2e8f0; }
    .resumo h3 { color: #1a365d; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    .fichas { padding: 20px; }
    .fichas h3 { color: #1a365d; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    .footer { background: #1a365d; color: white; padding: 20px; text-align: center; font-size: 12px; }
    .footer a { color: #48bb78; text-decoration: none; }
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
      .print-notice { background: #fff9db !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Cabeçalho -->
    <div class="header">
      <div class="logo">Express<span>Glass</span></div>
      <h1>Análise de Fichas de Serviço</h1>
      <p>${dataFormatada}</p>
    </div>
    
    <!-- Aviso para Imprimir -->
    <div class="print-notice">
      <p>⚠️ IMPRIMIR ESTE RELATÓRIO E ATUAR EM CONFORMIDADE NOS PROCESSOS IDENTIFICADOS</p>
    </div>
    
    <!-- Título da Loja -->
    <div class="loja-title">
      <h2>${relatorio.nomeLoja}${numeroLojaTexto}</h2>
      <p>Relatório de Monitorização de Fichas de Serviço</p>
    </div>
    
    <!-- Métricas -->
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${relatorio.totalFichas}</div>
        <div class="metric-label">Total Fichas</div>
      </div>
      <div class="metric">
        <div class="metric-value ${relatorio.fichasAbertas5Dias > 0 ? 'metric-red' : 'metric-green'}">${relatorio.fichasAbertas5Dias}</div>
        <div class="metric-label">Abertas +5 dias</div>
      </div>
      <div class="metric">
        <div class="metric-value ${relatorio.fichasStatusAlerta > 0 ? 'metric-orange' : 'metric-green'}">${relatorio.fichasStatusAlerta}</div>
        <div class="metric-label">Status Alerta</div>
      </div>
      <div class="metric">
        <div class="metric-value ${relatorio.fichasSemNotas > 0 ? 'metric-yellow' : 'metric-green'}">${relatorio.fichasSemNotas}</div>
        <div class="metric-label">Sem Notas</div>
      </div>
    </div>
    
    <!-- Resumo da Análise -->
    <div class="resumo">
      <h3>Resumo da Análise</h3>
      <div style="line-height: 1.6;">
        ${relatorio.resumo}
      </div>
    </div>
    
    <!-- Fichas a Intervir -->
    <div class="fichas">
      <h3>Fichas a Intervir (Detalhe)</h3>
      ${relatorio.conteudoRelatorio}
    </div>
    
    <!-- Rodapé -->
    <div class="footer">
      <p>PoweringEG Platform 2.0 - Sistema de Gestão ExpressGlass</p>
      <p>Este email foi gerado automaticamente. Por favor, não responda a este email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
