import { int, mysqlEnum, mysqlTable, text, mediumtext, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "gestor"]).default("gestor").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Lojas (Stores) - Informação sobre as lojas da rede Express Glass
 */
export const lojas = mysqlTable("lojas", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  numeroLoja: int("numeroLoja"), // Número da loja (ex: 23 para Barcelos)
  contacto: varchar("contacto", { length: 50 }),
  email: varchar("email", { length: 320 }),
  minimoRelatoriosLivres: int("minimoRelatoriosLivres").default(0).notNull(), // Mínimo mensal de relatórios livres (0 = sem mínimo)
  minimoRelatoriosCompletos: int("minimoRelatoriosCompletos").default(0).notNull(), // Mínimo mensal de relatórios completos (0 = sem mínimo)
  localidadePadrao: varchar("localidadePadrao", { length: 255 }), // Localidade padrão associada à loja (para auto-preencher no Recalibra)
  // Informações complementares (facultativas)
  telefone: varchar("telefone", { length: 50 }),
  telemovel: varchar("telemovel", { length: 50 }),
  morada: text("morada"),
  codigoPostal: varchar("codigoPostal", { length: 20 }),
  localidade: varchar("localidade", { length: 255 }),
  renda: varchar("renda", { length: 100 }), // Valor da renda mensal (texto para flexibilidade)
  senhorio: varchar("senhorio", { length: 255 }),
  contactoSenhorio: varchar("contactoSenhorio", { length: 255 }),
  areaM2: varchar("areaM2", { length: 50 }), // Área em m²
  observacoesImovel: text("observacoesImovel"), // Notas adicionais sobre o imóvel
  subZona: varchar("subZona", { length: 100 }), // Sub-zona geográfica para atribuição inteligente de volantes (ex: "Minho Norte", "Vale do Sousa")
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Loja = typeof lojas.$inferSelect;
export type InsertLoja = typeof lojas.$inferInsert;

/**
 * Gestores - Informação adicional sobre gestores (complementa a tabela users)
 */
export const gestores = mysqlTable("gestores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK para users.id
  lastReminderDate: timestamp("lastReminderDate"), // Última vez que viu o lembrete de relatório IA
  lastEnvioRH: timestamp("lastEnvioRH"), // Última vez que enviou relação de colaboradores para RH
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Gestor = typeof gestores.$inferSelect;
export type InsertGestor = typeof gestores.$inferInsert;

/**
 * Associações Gestor-Loja - Relacionamento many-to-many entre gestores e lojas
 */
export const gestorLojas = mysqlTable("gestor_lojas", {
  id: int("id").autoincrement().primaryKey(),
  gestorId: int("gestorId").notNull(), // FK para gestores.id
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GestorLoja = typeof gestorLojas.$inferSelect;
export type InsertGestorLoja = typeof gestorLojas.$inferInsert;

/**
 * Relatórios Livres - Relatórios rápidos de visitas
 */
export const relatoriosLivres = mysqlTable("relatorios_livres", {
  id: int("id").autoincrement().primaryKey(),
  gestorId: int("gestorId").notNull(), // FK para gestores.id
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  dataVisita: timestamp("dataVisita").notNull(),
  descricao: text("descricao").notNull(),
  fotos: text("fotos"), // JSON array de URLs das fotos
  lojasIds: text("lojasIds"), // JSON array de IDs das lojas quando múltiplas lojas [1,2,3]
  visto: boolean("visto").default(false).notNull(), // Se o admin já viu este relatório
  categoria: varchar("categoria", { length: 100 }), // Categoria atribuída pelo admin
  estadoAcompanhamento: mysqlEnum("estadoAcompanhamento", ["acompanhar", "em_tratamento", "tratado"]), // Estado de acompanhamento
  comentarioAdmin: text("comentarioAdmin"), // Comentário/notas do admin sobre este relatório
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RelatorioLivre = typeof relatoriosLivres.$inferSelect;
export type InsertRelatorioLivre = typeof relatoriosLivres.$inferInsert;

/**
 * Relatórios Completos - Relatórios detalhados baseados no formulário Zoho
 */
export const relatoriosCompletos = mysqlTable("relatorios_completos", {
  id: int("id").autoincrement().primaryKey(),
  gestorId: int("gestorId").notNull(), // FK para gestores.id
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  dataVisita: timestamp("dataVisita").notNull(),
  
  // Campos do formulário Zoho
  episFardamento: text("episFardamento"),
  kitPrimeirosSocorros: text("kitPrimeirosSocorros"),
  consumiveis: text("consumiveis"),
  espacoFisico: text("espacoFisico"),
  reclamacoes: text("reclamacoes"),
  vendasComplementares: text("vendasComplementares"),
  fichasServico: text("fichasServico"),
  documentacaoObrigatoria: text("documentacaoObrigatoria"),
  reuniaoQuinzenal: boolean("reuniaoQuinzenal"),
  resumoSupervisao: text("resumoSupervisao"),
  colaboradoresPresentes: text("colaboradoresPresentes"),
  pontosPositivos: text("pontosPositivos"),
  pontosNegativos: text("pontosNegativos"),
  
  emailEnviado: boolean("emailEnviado").default(false).notNull(),
  fotos: text("fotos"), // JSON array de URLs das fotos
  lojasIds: text("lojasIds"), // JSON array de IDs das lojas quando múltiplas lojas [1,2,3]
  visto: boolean("visto").default(false).notNull(), // Se o admin já viu este relatório
  categoria: varchar("categoria", { length: 100 }), // Categoria atribuída pelo admin
  estadoAcompanhamento: mysqlEnum("estadoAcompanhamento", ["acompanhar", "em_tratamento", "tratado"]), // Estado de acompanhamento
  comentarioAdmin: text("comentarioAdmin"), // Comentário/notas do admin sobre este relatório
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RelatorioCompleto = typeof relatoriosCompletos.$inferSelect;
export type InsertRelatorioCompleto = typeof relatoriosCompletos.$inferInsert;

/**
 * Pendentes - Items a serem revistos em próximas visitas
 */
export const pendentes = mysqlTable("pendentes", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  relatorioId: int("relatorioId"), // FK opcional para relatorios_livres ou relatorios_completos
  tipoRelatorio: mysqlEnum("tipoRelatorio", ["livre", "completo"]),
  descricao: text("descricao").notNull(),
  resolvido: boolean("resolvido").default(false).notNull(),
  dataResolucao: timestamp("dataResolucao"),
  dataLimite: timestamp("dataLimite"), // Prazo para resolução do pendente
  visto: boolean("visto").default(false).notNull(), // Se o admin já viu este pendente
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pendente = typeof pendentes.$inferSelect;
export type InsertPendente = typeof pendentes.$inferInsert;


/**
 * Alertas - Alertas gerados automaticamente para lojas com problemas
 */
export const alertas = mysqlTable("alertas", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  tipo: mysqlEnum("tipo", ["pontos_negativos_consecutivos", "pendentes_antigos", "sem_visitas", "performance_baixa"]).notNull(),
  descricao: text("descricao").notNull(),
  estado: mysqlEnum("estado", ["pendente", "resolvido"]).default("pendente").notNull(),
  dataResolucao: timestamp("dataResolucao"),
  notasResolucao: text("notasResolucao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Alerta = typeof alertas.$inferSelect;
export type InsertAlerta = typeof alertas.$inferInsert;


/**
 * Configurações de Alertas - Configurações personalizáveis para o sistema de alertas
 */
export const configuracoesAlertas = mysqlTable("configuracoes_alertas", {
  id: int("id").autoincrement().primaryKey(),
  chave: varchar("chave", { length: 100 }).notNull().unique(),
  valor: text("valor").notNull(),
  descricao: text("descricao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConfiguracaoAlerta = typeof configuracoesAlertas.$inferSelect;
export type InsertConfiguracaoAlerta = typeof configuracoesAlertas.$inferInsert;


/**
 * Atividades - Feed de atividades dos gestores para o admin
 */
export const atividades = mysqlTable("atividades", {
  id: int("id").autoincrement().primaryKey(),
  gestorId: int("gestorId"), // FK para gestores.id (pode ser null para atividades do sistema)
  lojaId: int("lojaId"), // FK para lojas.id (opcional)
  tipo: mysqlEnum("tipo", [
    "visita_realizada",
    "relatorio_livre",
    "relatorio_completo",
    "pendente_criado",
    "pendente_resolvido",
    "alerta_gerado",
    "alerta_resolvido",
    "gestor_criado",
    "loja_criada",
    "ocorrencia_estrutural"
  ]).notNull(),
  descricao: text("descricao").notNull(),
  metadata: text("metadata"), // JSON com dados adicionais
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Atividade = typeof atividades.$inferSelect;
export type InsertAtividade = typeof atividades.$inferInsert;


/**
 * Previsões - Previsões de problemas geradas pela IA
 */
export const previsoes = mysqlTable("previsoes", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  tipo: mysqlEnum("tipo", [
    "risco_pendentes",
    "padrao_negativo",
    "sem_visita_prolongada",
    "tendencia_problemas"
  ]).notNull(),
  descricao: text("descricao").notNull(),
  probabilidade: int("probabilidade"), // 0-100
  sugestaoAcao: text("sugestaoAcao"),
  estado: mysqlEnum("estado", ["ativa", "confirmada", "descartada"]).default("ativa").notNull(),
  validaAte: timestamp("validaAte"), // Data até quando a previsão é válida
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Previsao = typeof previsoes.$inferSelect;
export type InsertPrevisao = typeof previsoes.$inferInsert;


/**
 * Sugestões de Melhoria - Sugestões geradas pela IA após relatórios
 */
export const sugestoesMelhoria = mysqlTable("sugestoes_melhoria", {
  id: int("id").autoincrement().primaryKey(),
  relatorioId: int("relatorioId").notNull(),
  tipoRelatorio: mysqlEnum("tipoRelatorio", ["livre", "completo"]).notNull(),
  lojaId: int("lojaId").notNull(),
  gestorId: int("gestorId").notNull(),
  sugestao: text("sugestao").notNull(),
  categoria: mysqlEnum("categoria", [
    "stock",
    "epis",
    "limpeza",
    "atendimento",
    "documentacao",
    "equipamentos",
    "geral"
  ]).notNull(),
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta"]).default("media").notNull(),
  implementada: boolean("implementada").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SugestaoMelhoria = typeof sugestoesMelhoria.$inferSelect;
export type InsertSugestaoMelhoria = typeof sugestoesMelhoria.$inferInsert;


/**
 * Planos de Visitas - Planos semanais sugeridos automaticamente
 */
export const planosVisitas = mysqlTable("planos_visitas", {
  id: int("id").autoincrement().primaryKey(),
  gestorId: int("gestorId").notNull(), // FK para gestores.id
  semanaInicio: timestamp("semanaInicio").notNull(), // Segunda-feira da semana
  semanaFim: timestamp("semanaFim").notNull(), // Domingo da semana
  visitasSugeridas: text("visitasSugeridas").notNull(), // JSON array de {lojaId, diaSugerido, motivo, prioridade}
  estado: mysqlEnum("estado", ["pendente", "aceite", "modificado", "rejeitado"]).default("pendente").notNull(),
  visitasRealizadas: text("visitasRealizadas"), // JSON array de lojaIds visitados
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlanoVisitas = typeof planosVisitas.$inferSelect;
export type InsertPlanoVisitas = typeof planosVisitas.$inferInsert;

/**
 * Histórico de Relatórios IA por Categorias
 * Armazena relatórios IA gerados para consulta futura e comparação temporal
 */
export const relatoriosIACategorias = mysqlTable("relatoriosIACategorias", {
  id: int("id").autoincrement().primaryKey(),
  conteudo: text("conteudo").notNull(), // Conteúdo markdown do relatório IA
  geradoPor: int("geradoPor").notNull(), // FK para users.id (quem gerou)
  versao: varchar("versao", { length: 20 }).default("5.8").notNull(), // Versão da plataforma
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RelatorioIACategoria = typeof relatoriosIACategorias.$inferSelect;
export type InsertRelatorioIACategoria = typeof relatoriosIACategorias.$inferInsert;

/**
 * Relatórios IA (Diário/Semanal/Mensal/Trimestral)
 * Armazena relatórios IA gerados na página "Relatórios IA"
 */
export const relatoriosIA = mysqlTable("relatorios_ia", {
  id: int("id").autoincrement().primaryKey(),
  periodo: varchar("periodo", { length: 255 }).notNull(), // Agora aceita períodos personalizados como "meses_10/2025, 11/2025"
  conteudo: text("conteudo").notNull(), // JSON stringificado da análise IA
  geradoPor: int("geradoPor").notNull(), // FK para users.id (quem gerou)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RelatorioIA = typeof relatoriosIA.$inferSelect;
export type InsertRelatorioIA = typeof relatoriosIA.$inferInsert;

/**
 * Resumos Globais - Análises periódicas de toda a rede de lojas
 * Gerados mensalmente, trimestralmente, semestralmente ou anualmente
 */
export const resumosGlobais = mysqlTable("resumos_globais", {
  id: int("id").autoincrement().primaryKey(),
  periodo: mysqlEnum("periodo", ["mes_atual", "mes_anterior", "trimestre_anterior", "semestre_anterior", "ano_anterior", "mensal", "trimestral", "semestral", "anual"]).notNull(),
  dataInicio: timestamp("dataInicio").notNull(), // Início do período analisado
  dataFim: timestamp("dataFim").notNull(), // Fim do período analisado
  conteudo: text("conteudo").notNull(), // JSON stringificado da análise IA
  geradoPor: int("geradoPor").notNull(), // FK para users.id (quem gerou)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ResumoGlobal = typeof resumosGlobais.$inferSelect;
export type InsertResumoGlobal = typeof resumosGlobais.$inferInsert;

/**
 * Reuniões de Gestores - Reuniões operacionais entre gestores (apenas admin cria/edita)
 */
export const reunioesGestores = mysqlTable("reunioes_gestores", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 255 }), // Título da reunião (ex: "Reunião Gestão Operacional 06/02/2026")
  data: timestamp("data").notNull(), // Data da reunião
  presencas: text("presencas").notNull(), // JSON array de IDs de gestores presentes
  outrosPresentes: text("outrosPresentes"), // Nomes de outros presentes (texto livre)
  conteudo: text("conteudo").notNull(), // Descrição da reunião
  resumoIA: text("resumoIA"), // Resumo gerado pela IA (tópicos, ações)
  tags: text("tags"), // JSON array de tags para organização
  anexos: text("anexos"), // JSON array de anexos (documentos, fotos) com {nome, url, tipo}
  criadoPor: int("criadoPor").notNull(), // FK para users.id (admin)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReuniaoGestores = typeof reunioesGestores.$inferSelect;
export type InsertReuniaoGestores = typeof reunioesGestores.$inferInsert;

/**
 * Reuniões de Lojas - Reuniões operacionais com lojas específicas
 */
export const reunioesLojas = mysqlTable("reunioes_lojas", {
  id: int("id").autoincrement().primaryKey(),
  data: timestamp("data").notNull(), // Data da reunião
  lojaIds: text("lojaIds").notNull(), // JSON array de IDs de lojas (pode ser múltiplas)
  presencas: text("presencas").notNull(), // Nomes dos presentes (texto livre)
  conteudo: text("conteudo").notNull(), // Descrição da reunião
  resumoIA: text("resumoIA"), // Resumo gerado pela IA (tópicos, ações)
  tags: text("tags"), // JSON array de tags para organização
  anexos: text("anexos"), // JSON array de anexos (documentos, fotos) com {nome, url, tipo}
  criadoPor: int("criadoPor").notNull(), // FK para users.id (admin ou gestor)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReuniaoLojas = typeof reunioesLojas.$inferSelect;
export type InsertReuniaoLojas = typeof reunioesLojas.$inferInsert;

/**
 * Ações de Reuniões - Ações definidas em reuniões e atribuídas a gestores
 * Integradas com o sistema de pendentes
 */
export const acoesReunioes = mysqlTable("acoes_reunioes", {
  id: int("id").autoincrement().primaryKey(),
  reuniaoId: int("reuniaoId").notNull(), // FK para reunioes_gestores.id ou reunioes_lojas.id
  tipoReuniao: mysqlEnum("tipoReuniao", ["gestores", "lojas"]).notNull(), // Tipo de reunião
  descricao: text("descricao").notNull(), // Descrição da ação
  gestorIds: text("gestorIds").notNull(), // JSON array de IDs de gestores atribuídos
  status: mysqlEnum("status", ["pendente", "concluida"]).default("pendente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AcaoReuniao = typeof acoesReunioes.$inferSelect;
export type InsertAcaoReuniao = typeof acoesReunioes.$inferInsert;

/**
 * Resultados Mensais - Dados de performance das lojas extraídos do Excel mensal
 * Colunas A-N da folha "Faturados"
 */
export const resultadosMensais = mysqlTable("resultados_mensais", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  mes: int("mes").notNull(), // 1-12
  ano: int("ano").notNull(), // 2025, 2026, etc.
  
  // Coluna A: Zona
  zona: varchar("zona", { length: 255 }),
  
  // Coluna C: Total Serviços Faturados
  totalServicos: int("totalServicos"),
  
  // Coluna D: Nº Serv Diários por Colaborador
  servicosPorColaborador: decimal("servicosPorColaborador", { precision: 10, scale: 4 }),
  
  // Coluna E: Nº Colaboradores Loja
  numColaboradores: int("numColaboradores"),
  
  // Coluna F: Objetivo ao dia Actual
  objetivoDiaAtual: decimal("objetivoDiaAtual", { precision: 10, scale: 2 }),
  
  // Coluna G: Objetivo Mensal
  objetivoMensal: int("objetivoMensal"),
  
  // Coluna H: Serv. Diários Acumulados Vs Obj
  desvioObjetivoAcumulado: decimal("desvioObjetivoAcumulado", { precision: 10, scale: 2 }),
  
  // Coluna I: Vs. Obj Dia (%)
  desvioPercentualDia: decimal("desvioPercentualDia", { precision: 5, scale: 4 }),
  
  // Coluna J: Vs. Obj Mês (%)
  desvioPercentualMes: decimal("desvioPercentualMes", { precision: 5, scale: 4 }),
  
  // Coluna K: Taxa de Reparação QIV
  taxaReparacao: decimal("taxaReparacao", { precision: 5, scale: 4 }),
  
  // Coluna L: Qtd Reparações
  qtdReparacoes: int("qtdReparacoes"),
  
  // Coluna M: Qtd Para-Brisas
  qtdParaBrisas: int("qtdParaBrisas"),
  
  // Coluna N: Qtd Reparações em falta para Taxa 22%
  gapReparacoes22: int("gapReparacoes22"),
  
  // Metadados
  nomeArquivo: varchar("nomeArquivo", { length: 255 }), // Nome do arquivo Excel original
  uploadedBy: int("uploadedBy").notNull(), // FK para users.id (admin que fez upload)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ResultadoMensal = typeof resultadosMensais.$inferSelect;
export type InsertResultadoMensal = typeof resultadosMensais.$inferInsert;

/**
 * Totais Mensais Globais - Totais do Excel incluindo PROMOTOR e outras categorias não-loja
 * Estes valores representam os totais reais da rede (linha "Total Serviços Faturados" do Excel)
 */
export const totaisMensais = mysqlTable("totais_mensais", {
  id: int("id").autoincrement().primaryKey(),
  mes: int("mes").notNull(), // 1-12
  ano: int("ano").notNull(), // 2025, 2026, etc.
  
  // Totais globais (incluindo PROMOTOR)
  totalServicos: int("totalServicos"), // Total de serviços faturados
  objetivoMensal: int("objetivoMensal"), // Objetivo mensal total
  numColaboradores: int("numColaboradores"), // Total de colaboradores
  taxaReparacao: decimal("taxaReparacao", { precision: 5, scale: 4 }), // Taxa média de reparação
  qtdReparacoes: int("qtdReparacoes"), // Quantidade total de reparações
  qtdParaBrisas: int("qtdParaBrisas"), // Quantidade total de para-brisas
  
  // Metadados
  nomeArquivo: varchar("nomeArquivo", { length: 255 }),
  uploadedBy: int("uploadedBy").notNull(), // FK para users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TotalMensal = typeof totaisMensais.$inferSelect;
export type InsertTotalMensal = typeof totaisMensais.$inferInsert;


/**
 * Vendas Complementares - Dados da folha "Complementares" do Excel
 * Inclui escovas, polimento, tratamentos, lavagens e películas
 */
export const vendasComplementares = mysqlTable("vendas_complementares", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  mes: int("mes").notNull(), // 1-12
  ano: int("ano").notNull(), // 2025, 2026, etc.
  
  // Total Vendas Complementares (excluindo películas)
  totalVendas: decimal("totalVendas", { precision: 10, scale: 2 }),
  
  // Escovas
  escovasVendas: decimal("escovasVendas", { precision: 10, scale: 2 }),
  escovasQtd: int("escovasQtd"),
  escovasPercent: decimal("escovasPercent", { precision: 5, scale: 4 }), // % vs Serviços
  
  // Polimento Faróis
  polimentoQtd: int("polimentoQtd"),
  polimentoVendas: decimal("polimentoVendas", { precision: 10, scale: 2 }),
  
  // Tratamento Carroçarias
  tratamentoQtd: int("tratamentoQtd"),
  tratamentoVendas: decimal("tratamentoVendas", { precision: 10, scale: 2 }),
  
  // Outros (Lavagens, Elevadores, Colagens, etc.)
  outrosQtd: int("outrosQtd"),
  outrosVendas: decimal("outrosVendas", { precision: 10, scale: 2 }),
  
  // Películas (contabilizadas separadamente)
  peliculaVendas: decimal("peliculaVendas", { precision: 10, scale: 2 }),
  
  // Lavagens ECO (6 tipos)
  lavagensEcoExterior: int("lavagensEcoExterior"), // EGLVG01
  lavagensEcoNormal: int("lavagensEcoNormal"), // EGLVG02
  lavagensEcoFresh: int("lavagensEcoFresh"), // EGLVG03
  lavagensEcoProtecao: int("lavagensEcoProtecao"), // EGLVG04
  lavagensEcoEstofos: int("lavagensEcoEstofos"), // EGLVG05
  lavagensEcoTop: int("lavagensEcoTop"), // EGLVG06
  lavagensTotal: int("lavagensTotal"),
  lavagensVendas: decimal("lavagensVendas", { precision: 10, scale: 2 }),
  
  // Metadados
  nomeArquivo: varchar("nomeArquivo", { length: 255 }),
  uploadedBy: int("uploadedBy").notNull(), // FK para users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VendaComplementar = typeof vendasComplementares.$inferSelect;
export type InsertVendaComplementar = typeof vendasComplementares.$inferInsert;


/**
 * Pendentes de Loja - Pendentes criados pelo gestor/admin para a loja resolver nas reuniões quinzenais
 */
export const pendentesLoja = mysqlTable("pendentes_loja", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  criadoPor: int("criadoPor"), // FK para users.id (gestor ou admin que criou) - NULL quando criado pela loja
  criadoPelaLoja: boolean("criadoPelaLoja").default(false).notNull(), // Se foi criado pela própria loja
  descricao: text("descricao").notNull(),
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  estado: mysqlEnum("estado", ["pendente", "em_progresso", "resolvido"]).default("pendente").notNull(),
  comentarioLoja: text("comentarioLoja"), // Comentário da loja sobre o pendente
  dataResolucao: timestamp("dataResolucao"),
  resolvidoNaReuniaoId: int("resolvidoNaReuniaoId"), // FK para reunioes_quinzenais.id (em qual reunião foi resolvido)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PendenteLoja = typeof pendentesLoja.$inferSelect;
export type InsertPendenteLoja = typeof pendentesLoja.$inferInsert;

/**
 * Reuniões Quinzenais - Reuniões quinzenais realizadas pelas lojas (acesso via token)
 */
export const reunioesQuinzenais = mysqlTable("reunioes_quinzenais", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  dataReuniao: timestamp("dataReuniao").notNull(),
  
  // Participantes
  participantes: text("participantes").notNull(), // JSON array de nomes dos participantes
  
  // Conteúdo da reunião
  temasDiscutidos: text("temasDiscutidos"), // Temas abordados na reunião
  decisoesTomadas: text("decisoesTomadas"), // Decisões tomadas
  observacoes: text("observacoes"), // Observações gerais
  
  // Análise de dados (preenchido pela loja)
  analiseResultados: text("analiseResultados"), // Análise dos resultados do período
  planosAcao: text("planosAcao"), // Planos de ação definidos
  
  // Status
  estado: mysqlEnum("estado", ["rascunho", "concluida", "enviada"]).default("rascunho").notNull(),
  dataEnvio: timestamp("dataEnvio"), // Quando foi enviada ao gestor
  emailEnviadoPara: varchar("emailEnviadoPara", { length: 320 }), // Email do gestor para quem foi enviado
  
  // Feedback do gestor (opcional)
  feedbackGestor: text("feedbackGestor"),
  dataFeedback: timestamp("dataFeedback"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReuniaoQuinzenal = typeof reunioesQuinzenais.$inferSelect;
export type InsertReuniaoQuinzenal = typeof reunioesQuinzenais.$inferInsert;

/**
 * Tokens de Acesso de Loja - Tokens para lojas acederem à plataforma via email
 */
export const tokenLojaTypeEnum = mysqlEnum('token_loja_type', ['responsavel', 'colaborador']);

export const tokensLoja = mysqlTable("tokens_loja", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id (2 tokens por loja: responsavel + colaborador)
  token: varchar("token", { length: 64 }).notNull().unique(), // Token único de acesso
  tipo: tokenLojaTypeEnum.default('responsavel').notNull(), // Tipo de token: responsavel (acesso completo) ou colaborador (apenas Resultados e Tarefas)
  ativo: boolean("ativo").default(true).notNull(),
  ultimoAcesso: timestamp("ultimoAcesso"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TokenLoja = typeof tokensLoja.$inferSelect;
export type InsertTokenLoja = typeof tokensLoja.$inferInsert;


/**
 * Categorias de To-Do - Categorias configuráveis para organizar tarefas
 */
export const todoCategories = mysqlTable("todo_categories", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 7 }).default("#3B82F6").notNull(), // Cor hex para identificação visual
  icone: varchar("icone", { length: 50 }), // Nome do ícone (opcional)
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TodoCategory = typeof todoCategories.$inferSelect;
export type InsertTodoCategory = typeof todoCategories.$inferInsert;

/**
 * To-Do - Sistema de tarefas colaborativo com atribuições
 */
export const todos = mysqlTable("todos", {
  id: int("id").autoincrement().primaryKey(),
  
  // Conteúdo da tarefa
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  
  // Categorização
  categoriaId: int("categoriaId"), // FK para todo_categories.id (opcional)
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  
  // Atribuição - pode ser atribuído a uma loja OU a um user (gestor/admin)
  atribuidoLojaId: int("atribuidoLojaId"), // FK para lojas.id (se atribuído a uma loja)
  atribuidoUserId: int("atribuidoUserId"), // FK para users.id (se atribuído a um gestor/admin)
  
  // Quem criou
  criadoPorId: int("criadoPorId").notNull(), // FK para users.id
  criadoPorLojaId: int("criadoPorLojaId"), // FK para lojas.id (quando criado por uma loja via Portal)
  
  // Estado e fluxo
  estado: mysqlEnum("estado", ["pendente", "em_progresso", "concluida", "devolvida"]).default("pendente").notNull(),
  
  // Comentários/Notas (para quando a loja devolve ou conclui)
  comentario: text("comentario"),
  
  // Resposta da loja (quando o gestor responde, a loja pode responder de volta)
  respostaLoja: text("respostaLoja"),
  
  // Histórico de atribuição (para rastrear devoluções)
  historicoAtribuicoes: text("historicoAtribuicoes"), // JSON array de {de, para, data, motivo}
  
  // Datas
  dataLimite: timestamp("dataLimite"),
  dataConclusao: timestamp("dataConclusao"),
  
  // Visibilidade e tracking (para a loja)
  visto: boolean("visto").default(false).notNull(), // Se a loja já viu esta tarefa
  vistoEm: timestamp("vistoEm"), // Data/hora em que a loja viu
  
  // Visibilidade e tracking (para o gestor)
  vistoGestor: boolean("vistoGestor").default(false).notNull(), // Se o gestor já viu esta tarefa
  vistoGestorEm: timestamp("vistoGestorEm"), // Data/hora em que o gestor viu
  
  // Tarefa interna da loja (não enviada ao gestor)
  isInterna: boolean("isInterna").default(false).notNull(),
  
  // Anexos (fotos e documentos)
  anexos: text("anexos"), // JSON array de URLs dos anexos [{url, nome, tipo}]
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = typeof todos.$inferInsert;


/**
 * Temas de Ocorrências Estruturais - Tags criadas pelos gestores (autocomplete)
 */
export const temasOcorrencias = mysqlTable("temas_ocorrencias", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  criadoPorId: int("criadoPorId").notNull(), // FK para users.id (quem criou o tema)
  usageCount: int("usageCount").default(1).notNull(), // Contador de quantas vezes foi usado
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TemaOcorrencia = typeof temasOcorrencias.$inferSelect;
export type InsertTemaOcorrencia = typeof temasOcorrencias.$inferInsert;

/**
 * Ocorrências Estruturais - Relatórios de situações não ligadas a uma loja específica
 */
export const ocorrenciasEstruturais = mysqlTable("ocorrencias_estruturais", {
  id: int("id").autoincrement().primaryKey(),
  
  // Quem reportou (pode ser null se admin criar diretamente)
  gestorId: int("gestorId"), // FK para gestores.id
  
  // Tema/Tag (com autocomplete)
  temaId: int("temaId").notNull(), // FK para temas_ocorrencias.id
  
  // Conteúdo
  descricao: text("descricao").notNull(),
  
  // Abrangência geográfica
  abrangencia: mysqlEnum("abrangencia", ["nacional", "regional", "zona"]).default("nacional").notNull(),
  zonaAfetada: varchar("zonaAfetada", { length: 100 }), // Nome da zona se abrangencia = "zona" ou "regional"
  
  // Lojas afetadas (opcional - para quando há lojas específicas envolvidas)
  lojasAfetadas: text("lojasAfetadas"), // JSON array de IDs das lojas [1,2,3]
  
  // Impacto
  impacto: mysqlEnum("impacto", ["baixo", "medio", "alto", "critico"]).default("medio").notNull(),
  
  // Evidências
  fotos: text("fotos"), // JSON array de URLs das fotos
  
  // Sugestão de ação
  sugestaoAcao: text("sugestaoAcao"),
  
  // Estado de acompanhamento (para o admin)
  estado: mysqlEnum("estado", ["reportado", "em_analise", "em_resolucao", "resolvido"]).default("reportado").notNull(),
  notasAdmin: text("notasAdmin"), // Notas/feedback do admin
  resolvidoEm: timestamp("resolvidoEm"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OcorrenciaEstrutural = typeof ocorrenciasEstruturais.$inferSelect;
export type InsertOcorrenciaEstrutural = typeof ocorrenciasEstruturais.$inferInsert;


/**
 * Tópicos de Reunião de Gestores - Tópicos submetidos pelos gestores para discussão
 * Fluxo: gestor submete → admin analisa → reunião acontece → relatório gerado → tópicos libertados
 */
export const topicosReuniaoGestores = mysqlTable("topicos_reuniao_gestores", {
  id: int("id").autoincrement().primaryKey(),
  
  // Quem submeteu o tópico
  gestorId: int("gestorId").notNull(), // FK para gestores.id
  
  // Conteúdo do tópico
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"), // Descrição detalhada opcional
  
  // Estado do tópico no fluxo
  estado: mysqlEnum("estado", [
    "pendente",      // Submetido pelo gestor, aguarda reunião
    "analisado",     // Admin marcou para incluir na reunião atual
    "discutido",     // Foi discutido na reunião
    "nao_discutido", // Não foi discutido (volta a pendente para próxima)
    "arquivado"      // Arquivado sem discussão
  ]).default("pendente").notNull(),
  
  // Reunião associada (quando analisado/discutido)
  reuniaoId: int("reuniaoId"), // FK para reunioes_gestores.id
  
  // Notas do admin sobre o tópico
  notasAdmin: text("notasAdmin"),
  
  // Resultado da discussão (preenchido após reunião)
  resultadoDiscussao: text("resultadoDiscussao"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TopicoReuniaoGestores = typeof topicosReuniaoGestores.$inferSelect;
export type InsertTopicoReuniaoGestores = typeof topicosReuniaoGestores.$inferInsert;

/**
 * Relatórios de Reunião de Gestores - Relatórios gerados após cada reunião
 */
export const relatoriosReuniaoGestores = mysqlTable("relatorios_reuniao_gestores", {
  id: int("id").autoincrement().primaryKey(),
  
  // Reunião associada
  reuniaoId: int("reuniaoId").notNull().unique(), // FK para reunioes_gestores.id
  
  // Conteúdo do relatório
  resumoExecutivo: text("resumoExecutivo"), // Resumo gerado pela IA
  topicosDiscutidos: text("topicosDiscutidos"), // JSON array de {topicoId, titulo, resultado}
  decisoesTomadas: text("decisoesTomadas"), // Texto livre ou JSON
  acoesDefinidas: text("acoesDefinidas"), // JSON array de {descricao, responsavelId, prazo}
  
  // Controlo de envio
  pdfUrl: text("pdfUrl"), // URL do PDF gerado
  emailEnviadoEm: timestamp("emailEnviadoEm"), // Quando foi enviado por email
  destinatariosEmail: text("destinatariosEmail"), // JSON array de emails
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RelatorioReuniaoGestores = typeof relatoriosReuniaoGestores.$inferSelect;
export type InsertRelatorioReuniaoGestores = typeof relatoriosReuniaoGestores.$inferInsert;


/**
 * Projeções de Visitas - Agenda inteligente de visitas para gestores
 * Gera sugestões automáticas baseadas em critérios de prioridade
 */
export const projecoesVisitas = mysqlTable("projecoes_visitas", {
  id: int("id").autoincrement().primaryKey(),
  
  // Gestor que gerou a projeção
  gestorId: int("gestorId").notNull(), // FK para gestores.id
  
  // Período da projeção
  semanaInicio: timestamp("semanaInicio").notNull(), // Segunda-feira da semana
  semanaFim: timestamp("semanaFim").notNull(), // Sexta-feira da semana
  
  // Tipo de período
  tipoPeriodo: mysqlEnum("tipoPeriodo", ["esta_semana", "proxima_semana"]).notNull(),
  
  // Visitas planeadas (JSON array de {data, lojaId, lojaNome, motivo, prioridade})
  visitasPlaneadas: text("visitasPlaneadas").notNull(),
  
  // Estado da projeção
  estado: mysqlEnum("estado", ["gerada", "confirmada", "em_progresso", "concluida"]).default("gerada").notNull(),
  
  // Notas do gestor
  notas: text("notas"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjecaoVisitas = typeof projecoesVisitas.$inferSelect;
export type InsertProjecaoVisitas = typeof projecoesVisitas.$inferInsert;

/**
 * Visitas Individuais - Cada visita planeada dentro de uma projeção
 */
export const visitasPlaneadas = mysqlTable("visitas_planeadas", {
  id: int("id").autoincrement().primaryKey(),
  
  // Projeção pai
  projecaoId: int("projecaoId").notNull(), // FK para projecoes_visitas.id
  
  // Loja a visitar
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  
  // Data e hora planeada
  dataVisita: timestamp("dataVisita").notNull(),
  horaInicio: varchar("horaInicio", { length: 5 }), // "09:00"
  horaFim: varchar("horaFim", { length: 5 }), // "12:00"
  
  // Motivo da visita (baseado nos critérios)
  motivo: mysqlEnum("motivo", [
    "tempo_sem_visita",    // Loja há muito tempo sem relatório
    "pendentes_ativos",    // Loja com muitos pendentes
    "resultados_baixos",   // Resultados abaixo do objetivo
    "manual"               // Adicionada manualmente pelo gestor
  ]).notNull(),
  
  // Prioridade calculada (1 = mais urgente)
  prioridade: int("prioridade").notNull(),
  
  // Detalhes do motivo
  detalheMotivo: text("detalheMotivo"), // Ex: "45 dias sem visita", "8 pendentes ativos"
  
  // Estado da visita
  estado: mysqlEnum("estado", ["planeada", "confirmada", "realizada", "cancelada"]).default("planeada").notNull(),
  
  // Link para calendário (gerado quando confirmada)
  linkGoogleCalendar: text("linkGoogleCalendar"),
  linkOutlook: text("linkOutlook"),
  linkICS: text("linkICS"), // Apple Calendar
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VisitaPlaneada = typeof visitasPlaneadas.$inferSelect;
export type InsertVisitaPlaneada = typeof visitasPlaneadas.$inferInsert;


/**
 * Relações entre Lojas - Permite agrupar lojas relacionadas
 * Lojas relacionadas partilham o mesmo token de acesso ao Portal da Loja
 * Ex: Braga Minho Center e Braga SM são lojas relacionadas
 */
export const relacoesLojas = mysqlTable("relacoes_lojas", {
  id: int("id").autoincrement().primaryKey(),
  
  // Loja principal (a que tem o token de acesso)
  lojaPrincipalId: int("lojaPrincipalId").notNull(), // FK para lojas.id
  
  // Loja relacionada (pode aceder com o token da loja principal)
  lojaRelacionadaId: int("lojaRelacionadaId").notNull(), // FK para lojas.id
  
  // Gestor que criou a relação
  gestorId: int("gestorId"), // FK para gestores.id (null se admin)
  
  // Estado da relação
  ativo: boolean("ativo").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RelacaoLojas = typeof relacoesLojas.$inferSelect;
export type InsertRelacaoLojas = typeof relacoesLojas.$inferInsert;


/**
 * Push Subscriptions - Armazena as subscrições de push notifications dos utilizadores
 * Permite enviar notificações push para gestores e lojas
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  
  // Identificador do dispositivo (pode ser user ou loja)
  userId: int("userId"), // FK para users.id (para gestores/admin)
  lojaId: int("lojaId"), // FK para lojas.id (para lojas via portal)
  
  // Dados da subscrição (Web Push Protocol)
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Chave pública
  auth: text("auth").notNull(), // Segredo de autenticação
  
  // Metadados
  userAgent: text("userAgent"), // Browser/dispositivo
  ativo: boolean("ativo").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;


/**
 * Volantes - Colaboradores móveis que apoiam várias lojas de uma zona
 * Cada gestor pode ter um ou mais volantes na sua região
 */
export const volantes = mysqlTable("volantes", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 50 }),
  gestorId: int("gestorId").notNull(), // FK para gestores.id - gestor responsável pelo volante
  ativo: boolean("ativo").default(true).notNull(),
  subZonaPreferencial: varchar("subZonaPreferencial", { length: 100 }), // Sub-zona preferencial do volante (ex: "Minho Norte", "Vale do Sousa")
  telegramChatId: varchar("telegramChatId", { length: 100 }), // Chat ID do Telegram para notificações
  telegramUsername: varchar("telegramUsername", { length: 100 }), // Username do Telegram (opcional)
  portalUrl: varchar("portalUrl", { length: 500 }), // Link personalizado do portal do volante (enviado nas notificações Telegram)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Volante = typeof volantes.$inferSelect;
export type InsertVolante = typeof volantes.$inferInsert;


/**
 * Volante-Lojas - Associação many-to-many entre volantes e lojas
 * Define quais lojas cada volante pode apoiar
 */
export const volanteLojas = mysqlTable("volante_lojas", {
  id: int("id").autoincrement().primaryKey(),
  volanteId: int("volanteId").notNull(), // FK para volantes.id
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VolanteLoja = typeof volanteLojas.$inferSelect;
export type InsertVolanteLoja = typeof volanteLojas.$inferInsert;


/**
 * Tokens de Acesso de Volante - Tokens para volantes acederem ao Portal da Loja
 * Similar aos tokens de loja, mas para volantes
 */
export const tokensVolante = mysqlTable("tokens_volante", {
  id: int("id").autoincrement().primaryKey(),
  volanteId: int("volanteId").notNull(), // FK para volantes.id
  token: varchar("token", { length: 64 }).notNull().unique(), // Token único de acesso
  ativo: boolean("ativo").default(true).notNull(),
  ultimoAcesso: timestamp("ultimoAcesso"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TokenVolante = typeof tokensVolante.$inferSelect;
export type InsertTokenVolante = typeof tokensVolante.$inferInsert;


/**
 * Pedidos de Apoio - Requisições de apoio das lojas aos volantes
 * As lojas pedem apoio através do calendário, o volante aprova/reprova
 */
export const pedidosApoioTipoEnum = mysqlEnum('pedido_apoio_tipo', ['cobertura_ferias', 'substituicao_vidros', 'outro']);
export const pedidosApoioPeriodoEnum = mysqlEnum('pedido_apoio_periodo', ['manha', 'tarde', 'dia_todo']);
export const pedidosApoioEstadoEnum = mysqlEnum('pedido_apoio_estado', ['pendente', 'aprovado', 'reprovado', 'cancelado', 'anulado']);

export const pedidosApoio = mysqlTable("pedidos_apoio", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id - loja que pediu apoio
  volanteId: int("volanteId").notNull(), // FK para volantes.id - volante atribuído à loja
  
  // Data e período do apoio
  data: timestamp("data").notNull(), // Dia do apoio
  periodo: pedidosApoioPeriodoEnum.notNull(), // Manhã ou Tarde
  
  // Tipo de apoio
  tipoApoio: pedidosApoioTipoEnum.notNull(),
  observacoes: text("observacoes"), // Ex: "3 para-brisas"
  
  // Estado do pedido
  estado: pedidosApoioEstadoEnum.default('pendente').notNull(),
  
  // Dados de aprovação/reprovação
  dataResposta: timestamp("dataResposta"),
  motivoReprovacao: text("motivoReprovacao"), // Se reprovado, motivo
  
  // Links para calendário (gerados quando aprovado)
  linkGoogleCalendar: text("linkGoogleCalendar"),
  linkOutlook: text("linkOutlook"),
  linkICS: text("linkICS"), // Apple Calendar
  
  // Atribuição inteligente
  atribuidoPorIA: boolean("atribuidoPorIA").default(false).notNull(), // Se foi atribuído pelo algoritmo de scoring
  scoreAtribuicao: varchar("scoreAtribuicao", { length: 10 }), // Score do volante quando atribuído (ex: "0.85")
  scoreDetalhes: text("scoreDetalhes"), // JSON com detalhes do scoring: {disponibilidade, carga, proximidade, historico, volantesAvaliados}
  redireccionadoDe: int("redireccionadoDe"), // ID do pedido original se foi redireccionado após reprovação
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PedidoApoio = typeof pedidosApoio.$inferSelect;
export type InsertPedidoApoio = typeof pedidosApoio.$inferInsert;


/**
 * Loja-Volante - Associação de quais volantes estão atribuídos a cada loja
 * Cada loja pode ter múltiplos volantes atribuídos (com prioridade)
 */
export const lojaVolante = mysqlTable("loja_volante", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id - Já não é UNIQUE, permite múltiplos volantes
  volanteId: int("volanteId").notNull(), // FK para volantes.id
  prioridade: int("prioridade").default(1).notNull(), // 1 = principal, 2 = secundário, etc.
  preferencial: boolean("preferencial").default(false).notNull(), // true = loja preferencial deste volante (para algoritmo de proximidade)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LojaVolante = typeof lojaVolante.$inferSelect;
export type InsertLojaVolante = typeof lojaVolante.$inferInsert;



/**
 * Bloqueios de Volante - Dias bloqueados pelo volante (férias, faltas, formações, etc.)
 * Permite ao volante marcar dias como indisponíveis
 */
export const bloqueioVolanteTipoEnum = mysqlEnum('bloqueio_volante_tipo', ['ferias', 'falta', 'formacao', 'pessoal', 'outro']);

export const bloqueiosVolante = mysqlTable("bloqueios_volante", {
  id: int("id").autoincrement().primaryKey(),
  volanteId: int("volanteId").notNull(), // FK para volantes.id
  
  // Data e período do bloqueio
  data: timestamp("data").notNull(), // Dia do bloqueio
  periodo: pedidosApoioPeriodoEnum.notNull(), // Manhã, Tarde ou Dia Todo
  
  // Tipo de bloqueio
  tipo: bloqueioVolanteTipoEnum.notNull(),
  motivo: text("motivo"), // Descrição opcional do motivo
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BloqueioVolante = typeof bloqueiosVolante.$inferSelect;
export type InsertBloqueioVolante = typeof bloqueiosVolante.$inferInsert;


/**
 * Agendamentos do Volante - Agendamentos criados pelo próprio volante
 * Pode ser para uma loja específica ou compromisso pessoal (lojaId = null)
 */
export const agendamentoVolantePeriodoEnum = mysqlEnum('agendamento_volante_periodo', ['manha', 'tarde', 'dia_todo']);
export const agendamentoVolanteTipoEnum = mysqlEnum('agendamento_volante_tipo', ['cobertura_ferias', 'substituicao_vidros', 'substituicao', 'reparacao', 'entrega', 'recolha', 'outro']);

export const agendamentosVolante = mysqlTable("agendamentos_volante", {
  id: int("id").autoincrement().primaryKey(),
  volanteId: int("volanteId").notNull(), // FK para volantes.id
  lojaId: int("lojaId"), // FK para lojas.id - NULL se for compromisso pessoal/interno
  
  // Data e período
  data: timestamp("data").notNull(),
  agendamento_volante_periodo: agendamentoVolantePeriodoEnum.notNull(), // Manhã, Tarde ou Dia Todo
  
  // Tipo e descrição
  agendamento_volante_tipo: agendamentoVolanteTipoEnum, // Tipo de apoio (se for para loja)
  titulo: varchar("titulo", { length: 255 }), // Título do agendamento (se for pessoal)
  descricao: text("descricao"), // Descrição/observações
  
  // Quem criou o agendamento
  criadoPor: mysqlEnum("criadoPor", ['volante', 'gestor']).default('volante').notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgendamentoVolante = typeof agendamentosVolante.$inferSelect;
export type InsertAgendamentoVolante = typeof agendamentosVolante.$inferInsert;



/**
 * Análises de Fichas de Serviço - Histórico de uploads e análises
 */
export const analisesFichasServico = mysqlTable("analises_fichas_servico", {
  id: int("id").autoincrement().primaryKey(),
  gestorId: int("gestorId").notNull(), // FK para gestores.id - quem fez o upload
  
  // Informação do ficheiro
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  dataUpload: timestamp("dataUpload").defaultNow().notNull(),
  
  // Estatísticas gerais
  totalFichas: int("totalFichas").default(0).notNull(),
  totalLojas: int("totalLojas").default(0).notNull(),
  
  // JSON com resumo geral da análise
  resumoGeral: text("resumoGeral"), // JSON com totais por status, etc.
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnaliseFichasServico = typeof analisesFichasServico.$inferSelect;
export type InsertAnaliseFichasServico = typeof analisesFichasServico.$inferInsert;


/**
 * Relatórios de Análise por Loja - Relatório gerado para cada loja na análise
 */
export const relatoriosAnaliseLoja = mysqlTable("relatorios_analise_loja", {
  id: int("id").autoincrement().primaryKey(),
  analiseId: int("analiseId").notNull(), // FK para analises_fichas_servico.id
  lojaId: int("lojaId"), // FK para lojas.id (pode ser null se loja não existir no sistema)
  nomeLoja: varchar("nomeLoja", { length: 255 }).notNull(), // Nome da loja no ficheiro
  numeroLoja: int("numeroLoja"), // Número da loja (ex: 23 para Barcelos)
  
  // Contadores por categoria
  totalFichas: int("totalFichas").default(0).notNull(),
  fichasAbertas5Dias: int("fichasAbertas5Dias").default(0).notNull(),
  fichasAposAgendamento: int("fichasAposAgendamento").default(0).notNull(),
  fichasStatusAlerta: int("fichasStatusAlerta").default(0).notNull(), // FALTA DOCUMENTOS, RECUSADO, INCIDÊNCIA
  fichasSemNotas: int("fichasSemNotas").default(0).notNull(),
  fichasNotasAntigas: int("fichasNotasAntigas").default(0).notNull(), // Notas > 5 dias
  fichasDevolverVidro: int("fichasDevolverVidro").default(0).notNull(),
  fichasSemEmailCliente: int("fichasSemEmailCliente").default(0).notNull(),
  
  // Conteúdo do relatório (HTML formatado) - mediumtext para suportar relatórios grandes (até 16MB)
  conteudoRelatorio: mediumtext("conteudoRelatorio").notNull(),
  
  // Resumo em texto - mediumtext para suportar resumos grandes
  resumo: mediumtext("resumo"),
  
  // Estado de envio
  emailEnviado: boolean("emailEnviado").default(false).notNull(),
  dataEnvioEmail: timestamp("dataEnvioEmail"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RelatorioAnaliseLoja = typeof relatoriosAnaliseLoja.$inferSelect;
export type InsertRelatorioAnaliseLoja = typeof relatoriosAnaliseLoja.$inferInsert;


/**
 * Evolução de Análises - Comparação entre análises consecutivas
 */
export const evolucaoAnalises = mysqlTable("evolucao_analises", {
  id: int("id").autoincrement().primaryKey(),
  analiseAtualId: int("analiseAtualId").notNull(), // FK para analises_fichas_servico.id
  analiseAnteriorId: int("analiseAnteriorId").notNull(), // FK para analises_fichas_servico.id
  lojaId: int("lojaId"), // FK para lojas.id
  nomeLoja: varchar("nomeLoja", { length: 255 }).notNull(),
  
  // Variações (positivo = piorou, negativo = melhorou)
  variacaoFichasAbertas5Dias: int("variacaoFichasAbertas5Dias").default(0),
  variacaoFichasAposAgendamento: int("variacaoFichasAposAgendamento").default(0),
  variacaoFichasStatusAlerta: int("variacaoFichasStatusAlerta").default(0),
  variacaoFichasSemNotas: int("variacaoFichasSemNotas").default(0),
  variacaoFichasNotasAntigas: int("variacaoFichasNotasAntigas").default(0),
  variacaoFichasDevolverVidro: int("variacaoFichasDevolverVidro").default(0),
  
  // Avaliação geral
  evolucaoGeral: mysqlEnum("evolucaoGeral", ["melhorou", "piorou", "estavel"]).default("estavel"),
  comentario: text("comentario"), // Comentário automático sobre a evolução
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EvolucaoAnalise = typeof evolucaoAnalises.$inferSelect;
export type InsertEvolucaoAnalise = typeof evolucaoAnalises.$inferInsert;


/**
 * Fichas Identificadas por Análise - Guarda os números das fichas identificadas em cada categoria
 * Permite comparar entre análises e identificar processos repetidos
 */
export const fichasIdentificadasAnalise = mysqlTable("fichas_identificadas_analise", {
  id: int("id").autoincrement().primaryKey(),
  relatorioId: int("relatorioId").notNull(), // FK para relatorios_analise_loja.id
  analiseId: int("analiseId").notNull(), // FK para analises_fichas_servico.id
  nomeLoja: varchar("nomeLoja", { length: 255 }).notNull(),
  
  // Categoria do problema
  categoria: mysqlEnum("categoria", [
    "abertas5Dias",
    "aposAgendamento", 
    "statusAlerta",
    "semNotas",
    "notasAntigas",
    "devolverVidro",
    "semEmailCliente"
  ]).notNull(),
  
  // Identificação da ficha
  obrano: int("obrano").notNull(), // Número da obra/ficha
  matricula: varchar("matricula", { length: 20 }), // Matrícula do veículo
  diasAberto: int("diasAberto"), // Dias em aberto
  status: varchar("status", { length: 100 }), // Status atual da ficha
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FichaIdentificadaAnalise = typeof fichasIdentificadasAnalise.$inferSelect;
export type InsertFichaIdentificadaAnalise = typeof fichasIdentificadasAnalise.$inferInsert;



/**
 * Colaboradores - Colaboradores de cada loja para cálculo de FTE
 * Podem estar associados a uma loja específica OU ser volantes (associados à zona do gestor)
 */
export const colaboradores = mysqlTable("colaboradores", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId"), // FK para lojas.id (null para volantes)
  gestorId: int("gestorId"), // FK para gestores.id (para volantes - associados à zona)
  nome: varchar("nome", { length: 255 }).notNull(),
  codigoColaborador: varchar("codigoColaborador", { length: 50 }), // Código do colaborador (opcional)
  cargo: mysqlEnum("cargo", ["responsavel_loja", "tecnico", "administrativo"]).default("tecnico").notNull(), // Cargo do colaborador
  tipo: mysqlEnum("tipo", ["loja", "volante", "recalbra"]).default("loja").notNull(), // Tipo: loja (fixo), volante (móvel), recalbra
  ativo: boolean("ativo").default(true).notNull(), // Se o colaborador está ativo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Colaborador = typeof colaboradores.$inferSelect;
export type InsertColaborador = typeof colaboradores.$inferInsert;


/**
 * Envios RH - Histórico de envios de relação de colaboradores para RH
 */
export const enviosRH = mysqlTable("envios_rh", {
  id: int("id").autoincrement().primaryKey(),
  gestorId: int("gestorId").notNull(), // FK para gestores.id
  mesReferencia: varchar("mesReferencia", { length: 20 }).notNull(), // Ex: "Janeiro 2026"
  totalColaboradores: int("totalColaboradores").notNull(), // Total de colaboradores enviados
  totalEmLojas: int("totalEmLojas").notNull(), // Colaboradores em lojas
  totalVolantes: int("totalVolantes").notNull(), // Colaboradores volantes
  totalRecalbra: int("totalRecalbra").notNull(), // Colaboradores Recalbra
  emailDestino: varchar("emailDestino", { length: 320 }).notNull(), // Email de destino
  emailEnviado: boolean("emailEnviado").default(true).notNull(), // Se o email foi enviado com sucesso
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EnvioRH = typeof enviosRH.$inferSelect;
export type InsertEnvioRH = typeof enviosRH.$inferInsert;

/**
 * Documentos/Circulares - Documentos PDF partilhados pelos gestores com as lojas
 */
export const documentos = mysqlTable("documentos", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  fileUrl: text("fileUrl").notNull(), // URL do ficheiro no S3
  fileKey: text("fileKey").notNull(), // Chave do ficheiro no S3 para eliminação
  fileName: varchar("fileName", { length: 255 }).notNull(), // Nome original do ficheiro
  fileSize: int("fileSize").notNull(), // Tamanho do ficheiro em bytes
  createdBy: int("createdBy").notNull(), // FK para users.id (gestor que criou)
  targetLojas: text("targetLojas"), // JSON array de IDs das lojas [1,2,3] ou null para todas
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Documento = typeof documentos.$inferSelect;
export type InsertDocumento = typeof documentos.$inferInsert;

/**
 * Serviços Volante - Registo diário de serviços realizados pelos volantes em cada loja
 */
export const servicosVolante = mysqlTable("servicos_volante", {
  id: int("id").autoincrement().primaryKey(),
  volanteId: int("volanteId").notNull(), // FK para volantes.id
  lojaId: int("lojaId"), // FK para lojas.id (null = Outros/Loja externa)
  data: varchar("data", { length: 10 }).notNull(), // Data no formato YYYY-MM-DD
  substituicaoLigeiro: int("substituicaoLigeiro").default(0).notNull(), // Quantidade de substituições ligeiro
  reparacao: int("reparacao").default(0).notNull(), // Quantidade de reparações
  calibragem: int("calibragem").default(0).notNull(), // Quantidade de calibragens
  outros: int("outros").default(0).notNull(), // Quantidade de outros serviços
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServicoVolante = typeof servicosVolante.$inferSelect;
export type InsertServicoVolante = typeof servicosVolante.$inferInsert;

/**
 * ========================================
 * RECALIBRA - Sistema de Gestão de Calibragens
 * ========================================
 */

/**
 * Unidades Recalibra - Informação sobre unidades de calibragem
 * Similar à tabela volantes, mas para unidades de calibragem
 */
export const unidadesRecalibra = mysqlTable("unidades_recalibra", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(), // Nome do serviço (ex: "Recalibra Minho")
  nomeProfissional: varchar("nome_profissional", { length: 255 }), // Nome do profissional responsável
  email: varchar("email", { length: 320 }), // Email para envio de relatórios
  telefone: varchar("telefone", { length: 50 }), // Contacto telefónico
  gestorId: int("gestorId").notNull(), // FK para gestores.id - gestor responsável pela unidade
  ativo: boolean("ativo").default(true).notNull(),
  telegramChatId: varchar("telegramChatId", { length: 100 }), // Chat ID do Telegram para notificações
  telegramUsername: varchar("telegramUsername", { length: 100 }), // Username do Telegram (opcional)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UnidadeRecalibra = typeof unidadesRecalibra.$inferSelect;
export type InsertUnidadeRecalibra = typeof unidadesRecalibra.$inferInsert;


/**
 * Unidade-Lojas - Associação many-to-many entre unidades recalibra e lojas
 * Define quais lojas cada unidade pode atender
 */
export const unidadeLojas = mysqlTable("unidade_lojas", {
  id: int("id").autoincrement().primaryKey(),
  unidadeId: int("unidadeId").notNull(), // FK para unidades_recalibra.id
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UnidadeLoja = typeof unidadeLojas.$inferSelect;
export type InsertUnidadeLoja = typeof unidadeLojas.$inferInsert;


/**
 * Tokens de Acesso de Unidade Recalibra - Tokens para unidades acederem ao Portal Recalibra
 */
export const tokensRecalibra = mysqlTable("tokens_recalibra", {
  id: int("id").autoincrement().primaryKey(),
  unidadeId: int("unidadeId").notNull(), // FK para unidades_recalibra.id
  token: varchar("token", { length: 64 }).notNull().unique(), // Token único de acesso
  ativo: boolean("ativo").default(true).notNull(),
  ultimoAcesso: timestamp("ultimoAcesso"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TokenRecalibra = typeof tokensRecalibra.$inferSelect;
export type InsertTokenRecalibra = typeof tokensRecalibra.$inferInsert;


/**
 * Calibragens - Registo de calibragens realizadas
 * Armazena informação detalhada sobre cada calibragem
 */
export const calibragens = mysqlTable("calibragens", {
  id: int("id").autoincrement().primaryKey(),
  unidadeId: int("unidadeId").notNull(), // FK para unidades_recalibra.id
  lojaId: int("lojaId"), // FK para lojas.id (nullable - calibragens históricas não têm loja)
  data: varchar("data", { length: 10 }).notNull(), // Data no formato YYYY-MM-DD
  marca: varchar("marca", { length: 100 }), // Marca do veículo (Peugeot, BMW, etc.)
  matricula: varchar("matricula", { length: 20 }).notNull(), // Matrícula do veículo
  tipologiaViatura: mysqlEnum("tipologiaViatura", ["LIGEIRO", "PESADO"]).default("LIGEIRO").notNull(),
  tipoCalibragem: mysqlEnum("tipoCalibragem", ["DINÂMICA", "ESTÁTICA", "CORE"]).notNull(),
  localidade: varchar("localidade", { length: 255 }), // Localidade onde foi realizada a calibragem
  observacoes: text("observacoes"), // Observações adicionais
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Calibragem = typeof calibragens.$inferSelect;
export type InsertCalibragem = typeof calibragens.$inferInsert;


/**
 * Localidades Recalibra - Lista de localidades para autocomplete
 */
export const localidadesRecalibra = mysqlTable("localidades_recalibra", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LocalidadeRecalibra = typeof localidadesRecalibra.$inferSelect;
export type InsertLocalidadeRecalibra = typeof localidadesRecalibra.$inferInsert;

/**
 * Marcas Recalibra - Lista de marcas de veículos para autocomplete
 */
export const marcasRecalibra = mysqlTable("marcas_recalibra", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MarcaRecalibra = typeof marcasRecalibra.$inferSelect;
export type InsertMarcaRecalibra = typeof marcasRecalibra.$inferInsert;

/**
 * Histórico de Envios de Relatórios Mensais (Volante + Recalibra)
 */
export const historicoEnviosRelatorios = mysqlTable("historico_envios_relatorios", {
  id: int("id").autoincrement().primaryKey(),
  tipo: mysqlEnum("tipo", ["volante", "recalibra"]).notNull(), // Tipo de relatório
  mesReferencia: int("mesReferencia").notNull(), // Mês de referência (1-12)
  anoReferencia: int("anoReferencia").notNull(), // Ano de referência (ex: 2026)
  dataEnvio: timestamp("dataEnvio").notNull(), // Data e hora do envio
  emailsEnviadosUnidades: int("emailsEnviadosUnidades").default(0).notNull(), // Emails enviados para unidades/lojas
  emailsEnviadosGestores: int("emailsEnviadosGestores").default(0).notNull(), // Emails enviados para gestores
  emailsErro: int("emailsErro").default(0).notNull(), // Emails com erro
  detalhes: json("detalhes"), // JSON com detalhes do envio (destinatários, erros, etc.)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoEnvioRelatorio = typeof historicoEnviosRelatorios.$inferSelect;
export type InsertHistoricoEnvioRelatorio = typeof historicoEnviosRelatorios.$inferInsert;


/**
 * ========================================
 * NPS - Net Promoter Score
 * ========================================
 */

/**
 * Dados NPS por Loja - Dados extraídos do ficheiro Excel NPS
 * Sheet: Por Loja
 * Estrutura: Uma linha por loja com NPS mensal (Jan, Fev, Mar...) e taxa de resposta
 */
export const npsDados = mysqlTable("nps_dados", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  ano: int("ano").notNull(), // 2024, 2025, 2026, etc.
  
  // NPS Score mensal (valores de 0.0 a 1.0, representando 0% a 100%)
  npsJan: decimal("npsJan", { precision: 5, scale: 4 }),
  npsFev: decimal("npsFev", { precision: 5, scale: 4 }),
  npsMar: decimal("npsMar", { precision: 5, scale: 4 }),
  npsAbr: decimal("npsAbr", { precision: 5, scale: 4 }),
  npsMai: decimal("npsMai", { precision: 5, scale: 4 }),
  npsJun: decimal("npsJun", { precision: 5, scale: 4 }),
  npsJul: decimal("npsJul", { precision: 5, scale: 4 }),
  npsAgo: decimal("npsAgo", { precision: 5, scale: 4 }),
  npsSet: decimal("npsSet", { precision: 5, scale: 4 }),
  npsOut: decimal("npsOut", { precision: 5, scale: 4 }),
  npsNov: decimal("npsNov", { precision: 5, scale: 4 }),
  npsDez: decimal("npsDez", { precision: 5, scale: 4 }),
  
  // NPS Total do ano
  npsAnoTotal: decimal("npsAnoTotal", { precision: 5, scale: 4 }),
  
  // Taxa de Resposta mensal (% Respostas - valores de 0.0 a 1.0)
  taxaRespostaJan: decimal("taxaRespostaJan", { precision: 5, scale: 4 }),
  taxaRespostaFev: decimal("taxaRespostaFev", { precision: 5, scale: 4 }),
  taxaRespostaMar: decimal("taxaRespostaMar", { precision: 5, scale: 4 }),
  taxaRespostaAbr: decimal("taxaRespostaAbr", { precision: 5, scale: 4 }),
  taxaRespostaMai: decimal("taxaRespostaMai", { precision: 5, scale: 4 }),
  taxaRespostaJun: decimal("taxaRespostaJun", { precision: 5, scale: 4 }),
  taxaRespostaJul: decimal("taxaRespostaJul", { precision: 5, scale: 4 }),
  taxaRespostaAgo: decimal("taxaRespostaAgo", { precision: 5, scale: 4 }),
  taxaRespostaSet: decimal("taxaRespostaSet", { precision: 5, scale: 4 }),
  taxaRespostaOut: decimal("taxaRespostaOut", { precision: 5, scale: 4 }),
  taxaRespostaNov: decimal("taxaRespostaNov", { precision: 5, scale: 4 }),
  taxaRespostaDez: decimal("taxaRespostaDez", { precision: 5, scale: 4 }),
  
  // Taxa de Resposta Total do ano
  taxaRespostaAnoTotal: decimal("taxaRespostaAnoTotal", { precision: 5, scale: 4 }),
  
  // Metadados
  nomeArquivo: varchar("nomeArquivo", { length: 255 }), // Nome do arquivo Excel original
  uploadedBy: int("uploadedBy").notNull(), // FK para users.id (admin que fez upload)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NpsDado = typeof npsDados.$inferSelect;
export type InsertNpsDado = typeof npsDados.$inferInsert;


/**
 * Notas/Dossiers - Sistema de notas estilo Google Keep para reuniões e gestão
 */
export const notas = mysqlTable("notas", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 500 }).notNull(),
  conteudo: mediumtext("conteudo"), // Conteúdo rich text (HTML do editor)
  lojaId: int("lojaId"), // FK opcional para lojas.id (associar a uma loja)
  userId: int("userId").notNull(), // FK para users.id (quem criou)
  estado: mysqlEnum("estado", ["rascunho", "pendente", "discutido", "aprovado", "adiado", "em_analise", "concluido"]).default("rascunho").notNull(),
  cor: varchar("cor", { length: 20 }).default("#ffffff"), // Cor de fundo do card
  fixada: boolean("fixada").default(false).notNull(),
  favorita: boolean("favorita").default(false).notNull(),
  arquivada: boolean("arquivada").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Nota = typeof notas.$inferSelect;
export type InsertNota = typeof notas.$inferInsert;

/**
 * Imagens das Notas - Imagens associadas a cada nota
 */
export const notasImagens = mysqlTable("notas_imagens", {
  id: int("id").autoincrement().primaryKey(),
  notaId: int("notaId").notNull(), // FK para notas.id
  url: text("url").notNull(), // URL S3 da imagem
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // Chave S3
  filename: varchar("filename", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  ordem: int("ordem").default(0), // Ordem da imagem na nota
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NotaImagem = typeof notasImagens.$inferSelect;
export type InsertNotaImagem = typeof notasImagens.$inferInsert;

/**
 * Tags das Notas - Tags reutilizáveis para categorizar notas
 */
export const notasTags = mysqlTable("notas_tags", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#6366f1"), // Cor da tag
  userId: int("userId").notNull(), // FK para users.id (quem criou a tag)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NotaTag = typeof notasTags.$inferSelect;
export type InsertNotaTag = typeof notasTags.$inferInsert;

/**
 * Relação many-to-many entre Notas e Tags
 */
export const notasTagsRelacao = mysqlTable("notas_tags_relacao", {
  id: int("id").autoincrement().primaryKey(),
  notaId: int("notaId").notNull(), // FK para notas.id
  tagId: int("tagId").notNull(), // FK para notas_tags.id
});
export type NotaTagRelacao = typeof notasTagsRelacao.$inferSelect;
export type InsertNotaTagRelacao = typeof notasTagsRelacao.$inferInsert;

/**
 * Gravações de Reuniões - Gravação de áudio, transcrição e resumo IA
 * Associada opcionalmente a uma nota para integração no sistema de notas
 */
export const gravacoesReuniao = mysqlTable("gravacoes_reuniao", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK para users.id (quem gravou)
  notaId: int("notaId"), // FK opcional para notas.id (associar a uma nota)
  titulo: varchar("titulo", { length: 500 }).notNull(),
  audioUrl: text("audioUrl"), // URL S3 do ficheiro de áudio
  audioFileKey: varchar("audioFileKey", { length: 500 }), // Chave S3
  duracaoSegundos: int("duracaoSegundos"), // Duração do áudio em segundos
  transcricao: mediumtext("transcricao"), // Transcrição limpa do áudio
  transcricaoSegmentos: mediumtext("transcricaoSegmentos"), // JSON array de segmentos [{start, end, text}]
  resumoIA: mediumtext("resumoIA"), // Resumo gerado pela IA
  idioma: varchar("idioma", { length: 10 }).default("pt"), // Idioma detectado
  estado: mysqlEnum("estado", ["a_gravar", "gravado", "a_transcrever", "transcrito", "a_resumir", "concluido", "erro"]).default("a_gravar").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GravacaoReuniao = typeof gravacoesReuniao.$inferSelect;
export type InsertGravacaoReuniao = typeof gravacoesReuniao.$inferInsert;

/**
 * Tipos/Tags de Reunião - Categorização de reuniões livres
 * Ex: "Reunião Semanal", "Reunião Mensal", "Formação", "Briefing", etc.
 */
export const reuniaoTipos = mysqlTable("reuniao_tipos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#6366f1"), // Cor da tag
  userId: int("userId").notNull(), // FK para users.id (quem criou)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReuniaoTipo = typeof reuniaoTipos.$inferSelect;
export type InsertReuniaoTipo = typeof reuniaoTipos.$inferInsert;

/**
 * Reuniões Livres - Sistema de reuniões com histórico completo
 * Cada reunião tem data, presenças, temas, conclusões, tipo/tag
 * Opcionalmente integra com gravação de áudio, transcrição e resumo IA
 */
export const reunioesLivres = mysqlTable("reunioes_livres", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 500 }).notNull(),
  data: varchar("data", { length: 10 }).notNull(), // YYYY-MM-DD
  hora: varchar("hora", { length: 5 }), // HH:MM (opcional)
  local: varchar("local", { length: 255 }), // Local da reunião (opcional)
  
  // Tipo/Tag da reunião
  tipoId: int("tipoId"), // FK para reuniao_tipos.id
  
  // Participantes (JSON array de strings com nomes)
  presencas: text("presencas"), // JSON: ["Marco Amorim", "João Silva", ...]
  
  // Conteúdo da reunião
  temas: mediumtext("temas"), // Temas discutidos (rich text ou texto livre)
  conclusoes: mediumtext("conclusoes"), // Conclusões da reunião
  observacoes: mediumtext("observacoes"), // Observações adicionais
  
  // Integração com gravação de áudio
  gravacaoId: int("gravacaoId"), // FK opcional para gravacoes_reuniao.id
  
  // Quem criou
  userId: int("userId").notNull(), // FK para users.id
  
  // Estado
  estado: mysqlEnum("estado", ["rascunho", "concluida", "arquivada"]).default("rascunho").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReuniaoLivre = typeof reunioesLivres.$inferSelect;
export type InsertReuniaoLivre = typeof reunioesLivres.$inferInsert;


/**
 * ========================================
 * RECEPÇÃO DE VIDROS - Scan de etiquetas
 * ========================================
 */

/**
 * Mapeamento de Destinatários - Associa nomes das etiquetas a lojas do sistema
 * Quando a IA identifica um nome novo, cria registo aqui. Admin associa a loja(s).
 */
export const vidrosDestinatarios = mysqlTable("vidros_destinatarios", {
  id: int("id").autoincrement().primaryKey(),
  nomeEtiqueta: varchar("nomeEtiqueta", { length: 500 }).notNull(), // Nome exacto como aparece na etiqueta (ex: "EXPRESSGLASS – SM PESADOS PORTO")
  lojaId: int("lojaId"), // FK para lojas.id - NULL até o admin associar
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VidroDestinatario = typeof vidrosDestinatarios.$inferSelect;
export type InsertVidroDestinatario = typeof vidrosDestinatarios.$inferInsert;

/**
 * Recepção de Vidros - Registo de cada vidro recebido via scan de etiqueta
 */
export const vidrosRecepcao = mysqlTable("vidros_recepcao", {
  id: int("id").autoincrement().primaryKey(),
  
  // Dados extraídos da etiqueta (OCR/IA)
  destinatarioRaw: varchar("destinatarioRaw", { length: 500 }), // Nome do destinatário como aparece na etiqueta
  eurocode: varchar("eurocode", { length: 500 }), // Eurocodes do vidro separados por vírgula (ex: "3733AGN" ou "2488ASGRT, 2488AGACMVZ")
  numeroPedido: varchar("numeroPedido", { length: 100 }), // Número do pedido (ex: "30452")
  codAT: varchar("codAT", { length: 100 }), // Código AT (ex: "18728608955")
  encomenda: varchar("encomenda", { length: 255 }), // Referência da encomenda (ex: "19330 de 04.03.2026")
  leitRef: varchar("leitRef", { length: 100 }), // Referência LEIT completa (ex: "1018/3733AGN")
  observacoesEtiqueta: text("observacoesEtiqueta"), // Texto completo das observações da etiqueta
  
  // Foto da etiqueta
  fotoUrl: text("fotoUrl"), // URL S3 da foto da etiqueta
  fotoKey: varchar("fotoKey", { length: 500 }), // Chave S3 da foto
  
  // Mapeamento
  destinatarioId: int("destinatarioId"), // FK para vidros_destinatarios.id (mapeamento automático ou manual)
  lojaScanId: int("lojaScanId"), // FK para lojas.id - loja que fez o scan
  lojaDestinoId: int("lojaDestinoId"), // FK para lojas.id - loja destinatária (resolvida via mapeamento)
  
  // Estado
  estado: mysqlEnum("estado", [
    "pendente_associacao", // Destinatário novo, aguarda admin mapear
    "recebido",           // Vidro registado e destinatário identificado
    "confirmado",         // Loja destino confirmou recepção
  ]).default("recebido").notNull(),
  
  // Quem registou
  registadoPorToken: varchar("registadoPorToken", { length: 64 }), // Token da loja que fez o scan
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VidroRecepcao = typeof vidrosRecepcao.$inferSelect;
export type InsertVidroRecepcao = typeof vidrosRecepcao.$inferInsert;


/**
 * Eurocodes extraídos das fichas de serviço
 * Guardados durante a análise de fichas para cruzamento com stock
 */
export const eurocodesFichas = mysqlTable("eurocodes_fichas", {
  id: int("id").autoincrement().primaryKey(),
  analiseId: int("analiseId").notNull(), // FK para analises_fichas_servico.id
  lojaId: int("lojaId"), // FK para lojas.id (pode ser null se loja não identificada)
  nomeLoja: varchar("nomeLoja", { length: 255 }).notNull(),
  
  // Dados da ficha
  obrano: int("obrano").notNull(), // Número da obra/ficha
  matricula: varchar("matricula", { length: 20 }),
  eurocode: varchar("eurocode", { length: 100 }).notNull(), // Eurocode individual (1 por linha)
  ref: varchar("ref", { length: 100 }), // Referência original do vidro
  marca: varchar("marca", { length: 100 }), // Marca do veículo
  modelo: varchar("modelo", { length: 100 }), // Modelo do veículo
  status: varchar("status", { length: 100 }), // Status da ficha
  diasAberto: int("diasAberto"), // Dias em aberto
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EurocodeFicha = typeof eurocodesFichas.$inferSelect;
export type InsertEurocodeFicha = typeof eurocodesFichas.$inferInsert;

/**
 * Análises de Stock - Registo de cada análise de stock feita
 */
export const analisesStock = mysqlTable("analises_stock", {
  id: int("id").autoincrement().primaryKey(),
  gestorId: int("gestorId").notNull(), // FK para gestores.id
  lojaId: int("lojaId"), // FK para lojas.id (pode ser null se análise geral)
  nomeLoja: varchar("nomeLoja", { length: 255 }),
  batchId: varchar("batchId", { length: 100 }), // Identificador único do upload/batch para agrupar análises do mesmo upload
  
  // Dados da análise
  totalItensStock: int("totalItensStock").notNull().default(0),
  totalComFichas: int("totalComFichas").notNull().default(0), // Itens em stock com fichas associadas
  totalSemFichas: int("totalSemFichas").notNull().default(0), // Itens em stock sem fichas
  totalFichasSemStock: int("totalFichasSemStock").notNull().default(0), // Eurocodes das fichas sem stock
  
  // Dados raw para consulta
  dadosStock: text("dadosStock"), // JSON com a listagem de stock parseada
  resultadoAnalise: text("resultadoAnalise"), // JSON com resultado completo da análise
  
  analiseIdFichas: int("analiseIdFichas"), // FK para analises_fichas_servico.id (análise de fichas usada)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AnaliseStock = typeof analisesStock.$inferSelect;
export type InsertAnaliseStock = typeof analisesStock.$inferInsert;


/**
 * Classificações de Eurocodes Sem Ficha - Classificação manual de itens sem ficha de serviço
 * A classificação persiste enquanto o eurocode aparecer em análises consecutivas da mesma loja.
 * Quando o eurocode desaparece de uma análise, a classificação é limpa automaticamente.
 * Se voltar a aparecer, precisa de nova classificação (é considerado um novo vidro).
 */
export const classificacoesEurocode = mysqlTable("classificacoes_eurocode", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  eurocode: varchar("eurocode", { length: 100 }).notNull(), // Referência do eurocode
  unitIndex: int("unitIndex").notNull().default(1), // Índice da unidade (1, 2, 3...) para desmultiplicação
  classificacao: mysqlEnum("classificacao", [
    "devolucao_rejeitada",
    "usado",
    "com_danos",
    "para_devolver",
    "para_realizar",
    "com_ficha_servico",
    "nao_existe",
    "outros"
  ]).notNull(),
  observacao: varchar("observacao", { length: 255 }), // Texto livre para classificação "outros"
  // Tracking de recorrência
  primeiraAnaliseId: int("primeiraAnaliseId").notNull(), // FK para analises_stock.id - primeira vez que apareceu
  ultimaAnaliseId: int("ultimaAnaliseId").notNull(), // FK para analises_stock.id - última análise onde apareceu
  analisesConsecutivas: int("analisesConsecutivas").notNull().default(1), // Quantas análises consecutivas apareceu
  activo: boolean("activo").default(true).notNull(), // Se está activo (apareceu na última análise)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClassificacaoEurocode = typeof classificacoesEurocode.$inferSelect;
export type InsertClassificacaoEurocode = typeof classificacoesEurocode.$inferInsert;


/**
 * Background Jobs - Para processos longos (análise de stock, etc.)
 */
export const backgroundJobs = mysqlTable("background_jobs", {
  id: varchar("id", { length: 100 }).primaryKey(),
  status: mysqlEnum("status", ["processing", "completed", "error"]).notNull().default("processing"),
  progress: text("progress"),
  result: mediumtext("result"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BackgroundJob = typeof backgroundJobs.$inferSelect;

/**
 * Notas da Loja - Sistema de notas/lembretes para o portal da loja
 * Cada nota tem um tema (cor) para categorização visual
 */
export const notasLoja = mysqlTable("notas_loja", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(), // FK para lojas.id
  titulo: varchar("titulo", { length: 500 }).notNull(),
  conteudo: mediumtext("conteudo"), // Conteúdo da nota (texto)
  tema: mysqlEnum("tema", [
    "stock",
    "procedimentos",
    "administrativo",
    "recursos_humanos",
    "ausencias",
    "reunioes",
    "clientes",
    "geral"
  ]).notNull().default("geral"),
  cor: varchar("cor", { length: 20 }).default("#fbbf24"), // Cor hex livre escolhida pelo utilizador
  fixada: boolean("fixada").default(false).notNull(),
  arquivada: boolean("arquivada").default(false).notNull(),
  criadoPor: varchar("criadoPor", { length: 255 }), // Nome de quem criou (token da loja)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NotaLoja = typeof notasLoja.$inferSelect;
export type InsertNotaLoja = typeof notasLoja.$inferInsert;

/**
 * Localidades de Agendamento - Localidades partilhadas para o módulo de agendamentos
 * Geridas pelo gestor, visíveis por todas as lojas da zona
 */
export const localidadesAgendamento = mysqlTable("localidades_agendamento", {
  id: int("id").autoincrement().primaryKey(),
  gestorId: int("gestorId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }).notNull().default("#9CA3AF"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LocalidadeAgendamento = typeof localidadesAgendamento.$inferSelect;
export type InsertLocalidadeAgendamento = typeof localidadesAgendamento.$inferInsert;

/**
 * Agendamentos Loja - Serviços de vidro automóvel agendados por cada loja
 */
export const agendamentosLoja = mysqlTable("agendamentos_loja", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull(),
  gestorId: int("gestorId").notNull(),
  matricula: varchar("matricula", { length: 20 }).notNull(),
  viatura: varchar("viatura", { length: 150 }),
  tipoServico: mysqlEnum("tipoServico", ["PB", "LT", "OC", "REP", "POL"]).notNull(),
  localidade: varchar("localidade", { length: 100 }),
  data: varchar("data", { length: 10 }),
  periodo: mysqlEnum("periodo", ["manha", "tarde"]),
  estadoVidro: mysqlEnum("estadoVidro", ["nao_encomendado", "encomendado", "terminado"]).notNull().default("nao_encomendado"),
  morada: varchar("morada", { length: 500 }),
  telefone: varchar("telefone", { length: 20 }),
  notas: text("notas"),
  extra: varchar("extra", { length: 255 }),
  km: int("km"),
  sortIndex: int("sortIndex").default(1).notNull(),
  obraNo: int("obraNo"),
  anulado: boolean("anulado").default(false).notNull(),
  motivoAnulacao: varchar("motivoAnulacao", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgendamentoLoja = typeof agendamentosLoja.$inferSelect;
export type InsertAgendamentoLoja = typeof agendamentosLoja.$inferInsert;


/**
 * Férias - Upload de ficheiros de férias
 */
export const feriasUploads = mysqlTable("ferias_uploads", {
  id: int("id").autoincrement().primaryKey(),
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  ano: int("ano").notNull(),
  uploadedBy: int("uploadedBy").notNull(), // userId
  uploadedByName: varchar("uploadedByName", { length: 255 }),
  totalColaboradores: int("totalColaboradores").default(0),
  totalDiasAprovados: int("totalDiasAprovados").default(0),
  totalDiasNaoAprovados: int("totalDiasNaoAprovados").default(0),
  totalFaltas: int("totalFaltas").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FeriasUpload = typeof feriasUploads.$inferSelect;
export type InsertFeriasUpload = typeof feriasUploads.$inferInsert;

/**
 * Férias - Dados de colaboradores por upload
 */
export const feriasColaboradores = mysqlTable("ferias_colaboradores", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("uploadId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  loja: varchar("loja", { length: 255 }).notNull(),
  gestor: varchar("gestor", { length: 255 }),
  ano: int("ano").notNull(),
  // JSON com os 365/366 dias: { "1": "aprovado", "2": "nao_aprovado", ... }
  dias: json("dias").notNull(),
  totalAprovados: int("totalAprovados").default(0),
  totalNaoAprovados: int("totalNaoAprovados").default(0),
  totalFeriados: int("totalFeriados").default(0),
  totalFaltas: int("totalFaltas").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FeriasColaborador = typeof feriasColaboradores.$inferSelect;
export type InsertFeriasColaborador = typeof feriasColaboradores.$inferInsert;

/**
 * Férias Volantes Marcados - Colaboradores marcados como volantes no calendário de férias
 * Permite que cada gestor marque quais colaboradores são volantes na sua zona
 */
export const feriasVolantesMarcados = mysqlTable("ferias_volantes_marcados", {
  id: int("id").autoincrement().primaryKey(),
  nomeColaborador: varchar("nomeColaborador", { length: 255 }).notNull(), // Nome do colaborador (do Excel)
  loja: varchar("loja", { length: 255 }).notNull(), // Loja do colaborador
  gestorNome: varchar("gestorNome", { length: 255 }).notNull(), // Nome do gestor que marcou
  marcadoPorUserId: int("marcadoPorUserId").notNull(), // FK para users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FeriasVolanteMarcado = typeof feriasVolantesMarcados.$inferSelect;
export type InsertFeriasVolanteMarcado = typeof feriasVolantesMarcados.$inferInsert;


/**
 * Chatbot Sessões - Sessões de conversa com o chatbot IA
 * Cada sessão agrupa um conjunto de mensagens de uma conversa
 */
export const chatbotSessoes = mysqlTable("chatbot_sessoes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK para users.id (gestor) ou 0 para portal loja
  portalToken: varchar("portalToken", { length: 255 }), // Token do portal da loja (se aplicável)
  portalLoja: varchar("portalLoja", { length: 255 }), // Nome da loja (se portal)
  titulo: varchar("titulo", { length: 500 }), // Título da sessão (primeira pergunta resumida)
  totalMensagens: int("totalMensagens").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ChatbotSessao = typeof chatbotSessoes.$inferSelect;
export type InsertChatbotSessao = typeof chatbotSessoes.$inferInsert;

/**
 * Chatbot Mensagens - Mensagens individuais dentro de uma sessão
 */
export const chatbotMensagens = mysqlTable("chatbot_mensagens", {
  id: int("id").autoincrement().primaryKey(),
  sessaoId: int("sessaoId").notNull(), // FK para chatbot_sessoes.id
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: mediumtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChatbotMensagem = typeof chatbotMensagens.$inferSelect;
export type InsertChatbotMensagem = typeof chatbotMensagens.$inferInsert;


/**
 * API Keys - Chaves de acesso para API externa
 * Permite que aplicações externas acedam aos dados da plataforma
 */
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(), // Nome descritivo da chave (ex: "App Mobile", "Power BI")
  keyHash: varchar("keyHash", { length: 255 }).notNull(), // Hash SHA-256 da chave
  keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(), // Primeiros 12 caracteres da chave (para identificação)
  permissoes: json("permissoes").notNull().$type<string[]>(), // Array de permissões: ["resultados", "lojas", "nps"]
  ativo: boolean("ativo").default(true).notNull(),
  ultimoUso: timestamp("ultimoUso"), // Última vez que a chave foi usada
  totalRequests: int("totalRequests").default(0).notNull(), // Contador de requests
  criadoPor: int("criadoPor").notNull(), // FK para users.id (admin que criou)
  criadoPorNome: varchar("criadoPorNome", { length: 255 }),
  expiresAt: timestamp("expiresAt"), // Data de expiração (null = sem expiração)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
