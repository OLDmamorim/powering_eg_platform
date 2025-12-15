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
  
  emailEnviado: boolean("emailEnviado").default(false).notNull(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pendente = typeof pendentes.$inferSelect;
export type InsertPendente = typeof pendentes.$inferInsert;
