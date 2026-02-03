import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

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
  telegramChatId: varchar("telegramChatId", { length: 100 }), // Chat ID do Telegram para notificações
  telegramUsername: varchar("telegramUsername", { length: 100 }), // Username do Telegram (opcional)
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
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PedidoApoio = typeof pedidosApoio.$inferSelect;
export type InsertPedidoApoio = typeof pedidosApoio.$inferInsert;


/**
 * Loja-Volante - Associação de qual volante está atribuído a cada loja
 * Cada loja só pode ter um volante atribuído
 */
export const lojaVolante = mysqlTable("loja_volante", {
  id: int("id").autoincrement().primaryKey(),
  lojaId: int("lojaId").notNull().unique(), // FK para lojas.id - UNIQUE porque cada loja só pode ter 1 volante
  volanteId: int("volanteId").notNull(), // FK para volantes.id
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
export const agendamentoVolanteTipoEnum = mysqlEnum('agendamento_volante_tipo', ['cobertura_ferias', 'substituicao_vidros', 'outro']);

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
  
  // Conteúdo do relatório (HTML formatado)
  conteudoRelatorio: text("conteudoRelatorio").notNull(),
  
  // Resumo em texto
  resumo: text("resumo"),
  
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
