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
  isServicoMovel: boolean; // Indica se é Serviço Móvel (SM)
  totalFichas: number;
  
  // Categorias de análise
  fichasAbertas5Dias: FichaServico[];
  fichasAposAgendamento: FichaServico[];
  fichasStatusAlerta: FichaServico[]; // FALTA DOCUMENTOS, RECUSADO, INCIDÊNCIA
  fichasSemNotas: FichaServico[];
  fichasNotasAntigas: FichaServico[]; // Notas > 5 dias
  fichasDevolverVidro: FichaServico[];
  // fichasSemEmailCliente: FichaServico[]; // REMOVIDO da análise
  
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
 * Recalcula diasExecutado baseado na data da análise
 * Retorna quantos dias passaram desde o agendamento (se passou)
 * Retorna 0 se não tem agendamento, se é futuro, ou se fora de horário de serviço
 */
function recalcularDiasExecutado(ficha: FichaServico, dataAnalise: Date): number {
  // Se não tem data de serviço, retorna 0
  if (!ficha.dataServico) return 0;
  
  // Verificar se o horário estava dentro de 09:00-18:00
  const horaInicio = ficha.horaInicio?.trim();
  if (!horaInicio) return 0;
  
  const [horaStr] = horaInicio.split(':');
  const hora = parseInt(horaStr, 10);
  
  if (isNaN(hora) || hora < 9 || hora >= 18) return 0;
  
  // Calcular diferença em dias
  const dataServicoSemHora = new Date(ficha.dataServico);
  dataServicoSemHora.setHours(0, 0, 0, 0);
  
  const dataAnaliseSemHora = new Date(dataAnalise);
  dataAnaliseSemHora.setHours(0, 0, 0, 0);
  
  const diffMs = dataAnaliseSemHora.getTime() - dataServicoSemHora.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Se é negativo (futuro), retorna 0
  return diffDias > 0 ? diffDias : 0;
}

/**
 * Verifica se uma ficha tem agendamento válido (hoje ou futuro)
 * (data >= hoje + horário dentro de 09:00-18:00 + status NÃO é de alerta)
 * Fichas com agendamento válido são excluídas do relatório porque estão encaminhadas
 */
function temAgendamentoFuturoValido(ficha: FichaServico, dataAnalise: Date): boolean {
  // Se não tem data de serviço, não tem agendamento
  if (!ficha.dataServico) return false;
  
  // Se tem status de alerta, SEMPRE incluir no relatório (mesmo com agendamento)
  if (STATUS_ALERTA.includes(ficha.status)) return false;
  
  // Verificar se a data é hoje ou futura (>= data da análise)
  const dataServicoSemHora = new Date(ficha.dataServico);
  dataServicoSemHora.setHours(0, 0, 0, 0);
  
  const dataAnaliseSemHora = new Date(dataAnalise);
  dataAnaliseSemHora.setHours(0, 0, 0, 0);
  
  // Excluir se data < hoje (passado)
  if (dataServicoSemHora < dataAnaliseSemHora) return false;
  
  // Verificar se o horário está dentro de 09:00-18:00
  const horaInicio = ficha.horaInicio?.trim();
  if (!horaInicio) return false;
  
  // Extrair hora (formato esperado: "HH:MM" ou "HH:MM:SS")
  const [horaStr] = horaInicio.split(':');
  const hora = parseInt(horaStr, 10);
  
  if (isNaN(hora)) return false;
  
  // Horário de serviço: 09:00 - 18:00
  return hora >= 9 && hora < 18;
}

// Mapeamento de nomes especiais de lojas (nome no Excel -> nome no sistema)
// As chaves devem estar em minúsculas para comparação case-insensitive
const MAPEAMENTO_NOMES_LOJAS: Record<string, string> = {
  'paredes ii': 'Mycarcenter',
  'porto alto': 'Porto Alto',
  'portoalto': 'Porto Alto',
  // Lojas de Lisboa com nomes específicos
  'lisboa amoreiras': 'Lisboa',  // Amoreiras = Lisboa #20
  'lisboa relogio': 'Lisboa Relogio',  // Rotunda do relógio = Lisboa Relogio #21
  'lisboa relógio': 'Lisboa Relogio',
  // Lojas do Marco Vilar com nomes específicos
  'aeroporto': 'Aeroporto',  // Aeroporto porto #71
  'maiashopping': 'MaiaShopping',  // Maia - maiashopping #29
  'maia shopping': 'MaiaShopping',
  'maia zona industrial': 'Maia Zona Industrial',  // Maia - moreira #3
  // Lojas da Mónica Correia com nomes específicos
  'coimbra sul': 'Coimbra Sul',  // Coimbra sul #59 (separar de Coimbra #14)
  // Lojas do Carlos Eduardo com nomes específicos
  'serviço móvel rep. lisboa': 'Lisboa SMR',  // Lisboa smr #82
  'servico movel rep. lisboa': 'Lisboa SMR',
  'servico movel rep lisboa': 'Lisboa SMR',
  'sm lisboa ii (movida)': 'Movida',  // Movida #50
  'sm lisboa ii': 'Movida',
  // Mais lojas do Marco Vilar com nomes específicos
  'porto marquês': 'Porto Marquês',  // Porto - marquês #12
  'porto marques': 'Porto Marquês',
  'porto zona industrial': 'Porto Zona Industrial',  // Porto - zona industrial #30
  'serviço móvel porto (maia)': 'SM Porto Maia',  // Porto sul sm #80
  'servico movel porto (maia)': 'SM Porto Maia',
  'servico movel porto': 'SM Porto Maia',
  // Lojas do Fábio Dias com nomes específicos
  'caldas da rainha': 'Caldas da Rainha',
  'caldas rainha': 'Caldas da Rainha',
  'caldas': 'Caldas da Rainha',
  'castanheira do ribatejo': 'Castanheira do Ribatejo',
  'castanheira': 'Castanheira do Ribatejo',
  'castanheira ribatejo': 'Castanheira do Ribatejo',
  'faro sm': 'Faro SM',
  'sm faro': 'Faro SM',
  'serviço móvel faro': 'Faro SM',
  'servico movel faro': 'Faro SM',
  'leziria sm': 'Lezíria SM',
  'lezíria sm': 'Lezíria SM',
  'leziria do tejo sm': 'Lezíria SM',
  'lezíria do tejo sm': 'Lezíria SM',
  'sm leziria': 'Lezíria SM',
  'sm caldas da rainha': 'SM Caldas da Rainha',
  'sm caldas': 'SM Caldas da Rainha',
  'serviço móvel caldas': 'SM Caldas da Rainha',
  'servico movel caldas': 'SM Caldas da Rainha',
  'serviço móvel caldas da rainha': 'SM Caldas da Rainha',
  'servico movel caldas da rainha': 'SM Caldas da Rainha',
  'vale do tejo sm': 'Vale do Tejo SM',
  'sm vale do tejo': 'Vale do Tejo SM',
  'serviço móvel vale do tejo': 'Vale do Tejo SM',
  'servico movel vale do tejo': 'Vale do Tejo SM',
  'portimão': 'Portimão',
  'portimao': 'Portimão',
  'santarém': 'Santarém',
  'santarem': 'Santarém',
};

// Mapeamento de cidades conhecidas para normalização
const CIDADES_CONHECIDAS = [
  'Abrantes', 'Albufeira', 'Almada', 'Amadora', 'Aveiro', 'Barcelos', 'Braga', 'Bragança',
  'Caldas da Rainha', 'Caldas', 'Cascais', 'Castanheira do Ribatejo', 'Castanheira', 'Castelo Branco', 'Chaves', 'Coimbra', 'Covilhã',
  'Évora', 'Entroncamento',
  'Famalicão', 'Faro', 'Figueira', 'Funchal', 'Gondomar', 'Guarda', 'Guimarães',
  'Leiria', 'Lezíria', 'Lisboa', 'Loures', 'Maia', 'Matosinhos', 'Montijo', 'Odivelas', 'Oeiras',
  'Olhão', 'Paredes', 'Peniche', 'Pombal', 'Ponte Lima', 'Portalegre', 'Portimão', 'Porto', 'Porto Alto',
  'Santarém', 'Seixal', 'Setúbal', 'Sintra', 'Tomar', 'Torres Vedras', 'Vale do Tejo', 'Viana', 'Vila Franca',
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
  
  // Ordenar cidades por comprimento decrescente para priorizar matches mais específicos
  // Ex: "Porto Alto" deve ser encontrado antes de "Porto"
  const cidadesOrdenadas = [...CIDADES_CONHECIDAS].sort((a, b) => b.length - a.length);
  
  // Procurar cidades conhecidas no texto
  for (const cidade of cidadesOrdenadas) {
    // Usar word boundary para evitar matches parciais (ex: "Porto" não deve match "Portimão")
    const escapedCidade = cidade.replace(/\s+/g, '\\s*');
    const regex = new RegExp(`(?:^|\\s|-)${escapedCidade}(?:\\s|$|-)`, 'i');
    if (regex.test(textoCompleto)) {
      return cidade;
    }
  }
  
  // Fallback: tentar sem word boundary para cidades que podem estar no início/fim
  for (const cidade of cidadesOrdenadas) {
    const escapedCidade = cidade.replace(/\s+/g, '\\s*');
    const regex = new RegExp(escapedCidade, 'i');
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
  // Verificar primeiro se há mapeamento especial para este nome de loja (case-insensitive)
  const nomeLower = nomeLoja.toLowerCase().trim();
  const nomeMapeado = MAPEAMENTO_NOMES_LOJAS[nomeLower];
  if (nomeMapeado) {
    return nomeMapeado;
  }
  
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
 * Ex: "Ficha S.Movel 86-Faro" -> 86 (o número do SM corresponde ao numeroLoja na BD)
 * Ex: "Ficha S.Movel 7-Leiria" -> 7
 */
function extrairNumeroLoja(nmdos: string): number | null {
  if (!nmdos || typeof nmdos !== 'string') return null;
  
  // Para Serviço Móvel: extrair o número que vem antes do hífen
  // Padrão: "Ficha S.Movel XX-Cidade" ou "Ficha S.Movel XX"
  const isSM = nmdos.toLowerCase().includes('s.movel') || nmdos.toLowerCase().includes('smovel') || nmdos.toLowerCase().includes('movel');
  if (isSM) {
    // Tentar padrão "S.Movel XX-Cidade" ou "S.Movel XX"
    const matchSM = nmdos.match(/(?:s\.?movel|smovel|movel)\s*(\d+)/i);
    if (matchSM && matchSM[1]) {
      const num = parseInt(matchSM[1], 10);
      if (Number.isFinite(num) && num > 0) {
        return num;
      }
    }
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
 * Formata uma ficha para exibição na tabela com colunas alinhadas
 * Retorna células de tabela: FS | Matrícula | Marca/Modelo | Status
 */
function formatarFichaParaTabela(ficha: FichaServico, incluirDias: boolean = false, tipoDias: 'aberto' | 'nota' | 'executado' = 'aberto'): string {
  // Coluna 1: FS numero
  let colFS = `FS ${ficha.obrano}`;
  
  // Coluna 2: Matrícula (negrito)
  let colMatricula = `<b>${ficha.matricula}</b>`;
  
  // Coluna 3: Marca/Modelo
  let marcaModelo = '';
  if (ficha.marca || ficha.modelo) {
    marcaModelo = `${ficha.marca || ''} ${ficha.modelo || ''}`.trim();
  }
  let colMarcaModelo = marcaModelo || '-';
  
  // Coluna 4: Status (negrito)
  let colStatus = `<b>${ficha.status}</b>`;
  if (incluirDias) {
    if (tipoDias === 'aberto') {
      colStatus += ` <span style="font-size: 0.9em;">(${ficha.diasAberto} dias)</span>`;
    } else if (tipoDias === 'nota') {
      colStatus += ` <span style="font-size: 0.9em;">(${ficha.diasNota} dias)</span>`;
    } else if (tipoDias === 'executado') {
      colStatus += ` <span style="font-size: 0.9em;">(${ficha.diasExecutado} dias)</span>`;
    }
  }
  
  // Retornar células de tabela sem bordas, com espaçamento, sem quebra de linha
  return `<td style="padding: 6px 12px; vertical-align: top; white-space: nowrap;">${colFS}</td><td style="padding: 6px 12px; vertical-align: top; white-space: nowrap;">${colMatricula}</td><td style="padding: 6px 12px; vertical-align: top;">${colMarcaModelo}</td><td style="padding: 6px 12px; vertical-align: top;">${colStatus}</td>`;
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
  
  // FS abertas a 10 ou mais dias
  if (relatorio.fichasAbertas5Dias.length > 0) {
    const fichasOrdenadas = [...relatorio.fichasAbertas5Dias].sort((a, b) => b.diasAberto - a.diasAberto);
    html += `<div style="margin: 20px 0; padding: 15px; background: #fff5f5; border-radius: 8px; border-left: 4px solid #c53030;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #c53030; text-transform: uppercase; font-weight: bold;">FS ABERTAS A 10 OU MAIS DIAS QUE NÃO ESTÃO FINALIZADOS</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse; border: none;">`;
    for (const ficha of fichasOrdenadas) {
      html += `<tr style="border-bottom: 1px solid #fed7d7;">${formatarFichaParaTabela(ficha, true, 'aberto')}</tr>`;
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
    html += `<table style="width: 100%; border-collapse: collapse; border: none;">`;
    for (const ficha of fichasOrdenadas) {
      html += `<tr style="border-bottom: 1px solid #feebc8;">${formatarFichaParaTabela(ficha, true, 'executado')}</tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #dd6b20;">Total: ${relatorio.fichasAposAgendamento.length} processos</p>`;
    html += `</div>`;
  }
  
  // FS em status de alerta
  if (relatorio.fichasStatusAlerta.length > 0) {
    html += `<div style="margin: 20px 0; padding: 15px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #dc2626; text-transform: uppercase; font-weight: bold;">FS EM STATUS DE ALERTA (FALTA DOCUMENTOS, RECUSADO OU INCIDÊNCIA)</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse; border: none;">`;
    for (const ficha of relatorio.fichasStatusAlerta) {
      html += `<tr style="border-bottom: 1px solid #fecaca;">${formatarFichaParaTabela(ficha)}</tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #dc2626;">Total: ${relatorio.fichasStatusAlerta.length} processos</p>`;
    html += `</div>`;
  }
  
  // FS sem notas
  if (relatorio.fichasSemNotas.length > 0) {
    html += `<div style="margin: 20px 0; padding: 15px; background: #fefce8; border-radius: 8px; border-left: 4px solid #ca8a04;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #ca8a04; text-transform: uppercase; font-weight: bold;">FS SEM NOTAS</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse; border: none;">`;
    for (const ficha of relatorio.fichasSemNotas) {
      html += `<tr style="border-bottom: 1px solid #fef08a;">${formatarFichaParaTabela(ficha)}</tr>`;
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
    html += `<table style="width: 100%; border-collapse: collapse; border: none;">`;
    for (const ficha of fichasOrdenadas) {
      html += `<tr style="border-bottom: 1px solid #bbf7d0;">${formatarFichaParaTabela(ficha, true, 'nota')}</tr>`;
    }
    html += `</table>`;
    html += `<p style="margin: 10px 0 0 0; font-weight: bold; color: #16a34a;">Total: ${relatorio.fichasNotasAntigas.length} processos</p>`;
    html += `</div>`;
  }
  
  // FS Devolve Vidro e Encerra
  if (relatorio.fichasDevolverVidro.length > 0) {
    html += `<div style="margin: 20px 0; padding: 15px; background: #faf5ff; border-radius: 8px; border-left: 4px solid #7c3aed;">`;
    html += `<h3 style="margin: 0 0 10px 0; color: #7c3aed; text-transform: uppercase; font-weight: bold;">FS COM STATUS: DEVOLVE VIDRO E ENCERRA!</h3>`;
    html += `<table style="width: 100%; border-collapse: collapse; border: none;">`;
    for (const ficha of relatorio.fichasDevolverVidro) {
      html += `<tr style="border-bottom: 1px solid #e9d5ff;">${formatarFichaParaTabela(ficha)}</tr>`;
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
  
  // FS sem email de cliente - REMOVIDO da análise
  
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
  
  if (totalProblemas === 0) {
    linhas.push(`<strong style="color: #16a34a;">PARABENS!</strong> A loja nao apresenta problemas significativos.`);
    linhas.push(`Continuar o bom trabalho e manter os processos atualizados.`);
  }
  
  return linhas.join('<br>');
}

/**
 * Analisa as fichas e gera relatórios por loja
 */
export function analisarFichas(fichas: FichaServico[], nomeArquivo: string): ResultadoAnalise {
  const dataAnalise = new Date();
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
    // Verificar se é Serviço Móvel
    const primeiraFicha = fichasLoja[0];
    const isSM = primeiraFicha ? isServicoMovel(primeiraFicha.nmdos, primeiraFicha.loja) : false;
    
    // Para SM: NÃO usar o número do nmdos (é enganador - ex: "Ficha S.Movel 7-Leiria" tem 7 mas Leiria SM é 57 na BD)
    // Para FS normais: usar o número do nmdos (ex: "Ficha Servico 7" -> 7 = Guimarães)
    const numeroLoja = (!isSM && fichasLoja.length > 0) ? extrairNumeroLoja(fichasLoja[0].nmdos) : null;
    
    // Filtrar por categorias
    // REGRA GLOBAL: Excluir fichas com agendamento futuro válido (data futura + horário 09:00-18:00 + status NÃO alerta)
    // Estas fichas estão encaminhadas e não precisam de intervenção
    
    // FS ABERTAS A 10 OU MAIS DIAS
    const fichasAbertas5Dias = fichasLoja.filter((f: FichaServico) => 
      f.diasAberto >= 10 && !temAgendamentoFuturoValido(f, dataAnalise)
    );
    
    // FS APÓS AGENDAMENTO: recalcular dinamicamente + excluir agendamento futuro válido
    const fichasAposAgendamento = fichasLoja
      .map((f: FichaServico) => ({
        ...f,
        diasExecutado: recalcularDiasExecutado(f, dataAnalise)
      }))
      .filter((f: FichaServico) => 
        f.diasExecutado >= 2 && !temAgendamentoFuturoValido(f, dataAnalise)
      );
    
    // FS STATUS ALERTA: SEMPRE incluir (mesmo com agendamento futuro)
    const fichasStatusAlerta = fichasLoja.filter((f: FichaServico) => STATUS_ALERTA.includes(f.status));
    
    // FS SEM NOTAS: excluir agendamento futuro válido
    const fichasSemNotas = fichasLoja.filter((f: FichaServico) => 
      !fichaTemNotas(f.obs) && !temAgendamentoFuturoValido(f, dataAnalise)
    );
    
    // FS COM NOTAS ANTIGAS: excluir agendamento futuro válido
    const fichasNotasAntigas = fichasLoja.filter((f: FichaServico) => 
      f.diasNota >= 5 && fichaTemNotas(f.obs) && !temAgendamentoFuturoValido(f, dataAnalise)
    );
    
    // FS DEVOLVE VIDRO: excluir agendamento futuro válido
    const fichasDevolverVidro = fichasLoja.filter((f: FichaServico) => 
      f.status === 'Devolve Vidro e Encerra!' && !temAgendamentoFuturoValido(f, dataAnalise)
    );
    
    // const fichasSemEmailCliente = fichasLoja.filter((f: FichaServico) => isEmailExpressGlass(f.email)); // REMOVIDO
    
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
      isServicoMovel: isSM,
      totalFichas: fichasLoja.length,
      fichasAbertas5Dias,
      fichasAposAgendamento,
      fichasStatusAlerta,
      fichasSemNotas,
      fichasNotasAntigas,
      fichasDevolverVidro,
      // fichasSemEmailCliente, // REMOVIDO
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
    // resumoGeral.totalFichasSemEmailCliente += fichasSemEmailCliente.length; // REMOVIDO
  }
  
  // Ordenar relatórios por nome da loja
  relatorios.sort((a, b) => a.nomeLoja.localeCompare(b.nomeLoja));
  
  return {
    dataAnalise,
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
  fichasSemEmailCliente?: number; // DEPRECATED - mantido para compatibilidade
  resumo: string;
  conteudoRelatorio: string;
}, dataAnalise: Date): string {
  const dataFormatada = dataAnalise.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  const numeroLojaTexto = relatorio.numeroLoja ? ` (#${relatorio.numeroLoja})` : '';
  
  // Cores para métricas
  const corAbertas5Dias = relatorio.fichasAbertas5Dias > 0 ? '#dc2626' : '#059669';
  const corStatusAlerta = relatorio.fichasStatusAlerta > 0 ? '#ea580c' : '#059669';
  const corSemNotas = relatorio.fichasSemNotas > 0 ? '#d97706' : '#059669';
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Análise de Fichas de Serviço - ${relatorio.nomeLoja}</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; color: #333; font-weight: 400; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <!-- Cabeçalho com Logo em Texto -->
          <tr>
            <td align="center" style="padding: 30px 30px 20px 30px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-size: 26px; margin-bottom: 15px;"><span style="color: #e53935; font-weight: 700; font-style: italic;">EXPRESS</span><span style="color: #1a365d; font-weight: 400;">GLASS</span></div>
              <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 20px; font-weight: 500;">Análise de Fichas de Serviço</h1>
              <p style="color: #6b7280; margin: 0; font-size: 13px; font-weight: 400;">${dataFormatada}</p>
            </td>
          </tr>
          
          <!-- Aviso para Imprimir -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px;">
                <tr>
                  <td align="center" style="padding: 12px 20px;">
                    <p style="color: #92400e; font-weight: 500; margin: 0; font-size: 13px;">⚠️ IMPRIMIR ESTE RELATÓRIO E ATUAR EM CONFORMIDADE NOS PROCESSOS IDENTIFICADOS</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Título da Loja -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 30px; border-bottom: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin: 0; font-size: 18px; font-weight: 500;">${relatorio.nomeLoja}${numeroLojaTexto}</h2>
              <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 13px; font-weight: 400;">Relatório de Monitorização de Fichas de Serviço</p>
            </td>
          </tr>
          
          <!-- Métricas em Tabela Horizontal -->
          <tr>
            <td style="padding: 25px 20px; border-bottom: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" width="25%" style="padding: 10px;">
                    <div style="font-size: 28px; font-weight: 500; color: #1f2937;">${relatorio.totalFichas}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Total Fichas</div>
                  </td>
                  <td align="center" width="25%" style="padding: 10px;">
                    <div style="font-size: 28px; font-weight: 500; color: ${corAbertas5Dias};">${relatorio.fichasAbertas5Dias}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Abertas +10 dias</div>
                  </td>
                  <td align="center" width="25%" style="padding: 10px;">
                    <div style="font-size: 28px; font-weight: 500; color: ${corStatusAlerta};">${relatorio.fichasStatusAlerta}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Status Alerta</div>
                  </td>
                  <td align="center" width="25%" style="padding: 10px;">
                    <div style="font-size: 28px; font-weight: 500; color: ${corSemNotas};">${relatorio.fichasSemNotas}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Sem Notas</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Resumo da Análise -->
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 15px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Resumo da Análise</h3>
              <div style="line-height: 1.6; font-size: 14px; color: #374151;">
                ${relatorio.resumo}
              </div>
            </td>
          </tr>
          
          <!-- Prazo para Resolução -->
          ${(relatorio.fichasAbertas5Dias + relatorio.fichasAposAgendamento + relatorio.fichasStatusAlerta + relatorio.fichasSemNotas + relatorio.fichasNotasAntigas) > 0 ? `
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb; background: #fef3c7;">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">⏱️ Prazo para Resolução</h3>
              <div style="line-height: 1.8; font-size: 14px; color: #78350f;">
                <p style="margin: 0 0 8px 0;"><strong>• Processos CRÍTICOS (&gt;30 dias):</strong> Resolver HOJE</p>
                <p style="margin: 0 0 8px 0;"><strong>• Processos URGENTES (&gt;15 dias):</strong> Resolver em 24 horas</p>
                <p style="margin: 0 0 12px 0;"><strong>• Demais processos:</strong> Resolver em 48 horas</p>
                <p style="margin: 0; font-style: italic; font-size: 13px;">Este relatório deve ser revisto diariamente até que todos os pontos estejam resolvidos.</p>
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- Fichas a Intervir -->
          <tr>
            <td style="padding: 25px 30px;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 15px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Fichas a Intervir (Detalhe)</h3>
              <div style="font-size: 14px; color: #374151;">
                ${relatorio.conteudoRelatorio}
              </div>
            </td>
          </tr>
          
          <!-- Rodapé -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 4px 0; font-size: 11px;">PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass</p>
              <p style="color: #6b7280; margin: 4px 0; font-size: 11px;">Este email foi gerado automaticamente.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
