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
  contacto: varchar("contacto", { length: 50 }),
  email: varchar("email", { length: 320 }),
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
  tipo: mysqlEnum("tipo", ["pontos_negativos_consecutivos", "pendentes_antigos", "sem_visitas"]).notNull(),
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
    "loja_criada"
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
