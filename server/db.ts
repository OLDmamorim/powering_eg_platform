import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  lojas, 
  Loja, 
  InsertLoja,
  gestores,
  Gestor,
  InsertGestor,
  gestorLojas,
  GestorLoja,
  InsertGestorLoja,
  relatoriosLivres,
  RelatorioLivre,
  InsertRelatorioLivre,
  relatoriosCompletos,
  RelatorioCompleto,
  InsertRelatorioCompleto,
  pendentes,
  Pendente,
  InsertPendente,
  alertas,
  Alerta,
  InsertAlerta,
  configuracoesAlertas,
  ConfiguracaoAlerta,
  InsertConfiguracaoAlerta,
  atividades,
  Atividade,
  InsertAtividade,
  previsoes,
  Previsao,
  InsertPrevisao,
  sugestoesMelhoria,
  SugestaoMelhoria,
  InsertSugestaoMelhoria,
  planosVisitas,
  PlanoVisitas,
  InsertPlanoVisitas
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserOpenId(userId: number, newOpenId: string, name?: string | null) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user openId: database not available");
    return;
  }

  const updateData: Record<string, unknown> = {
    openId: newOpenId,
    updatedAt: new Date()
  };
  
  if (name) {
    updateData.name = name;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update lastSignedIn: database not available");
    return;
  }

  await db.update(users).set({ 
    lastSignedIn: new Date(),
    updatedAt: new Date()
  }).where(eq(users.id, userId));
}

// ==================== LOJAS ====================

export async function createLoja(loja: InsertLoja): Promise<Loja> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const insertResult = await db.insert(lojas).values(loja);
  const rawInsertId = (insertResult as any).insertId;
  const insertId = typeof rawInsertId === 'bigint' ? Number(rawInsertId) : Number(rawInsertId);
  
  if (!insertId || isNaN(insertId)) {
    // Fallback: buscar a última loja inserida por nome
    const lastLoja = await db.select().from(lojas)
      .where(eq(lojas.nome, loja.nome))
      .orderBy(desc(lojas.id))
      .limit(1);
    if (lastLoja.length > 0) {
      return lastLoja[0]!;
    }
    throw new Error('Falha ao obter ID da loja inserida');
  }
  
  const newLoja = await db.select().from(lojas).where(eq(lojas.id, insertId)).limit(1);
  return newLoja[0]!;
}

export async function getAllLojas(): Promise<Loja[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(lojas).orderBy(lojas.nome);
}

export async function getLojaById(id: number): Promise<Loja | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const lojasResult = await db.select().from(lojas).where(eq(lojas.id, id)).limit(1);
  return lojasResult[0];
}

export async function updateLoja(id: number, data: Partial<InsertLoja>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(lojas).set(data).where(eq(lojas.id, id));
}

export async function deleteLoja(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Hard delete (remover registo)
  await db.delete(lojas).where(eq(lojas.id, id));
}

// ==================== GESTORES ====================

export async function createGestor(nome: string, email: string): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se já existe user com este email
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  let userId: number;
  
  if (existingUser.length > 0) {
    // User já existe, atualizar role para gestor
    userId = existingUser[0]!.id;
    await db.update(users).set({ role: 'gestor' }).where(eq(users.id, userId));
  } else {
    // Criar novo user
    const userResult = await db.insert(users).values({
      openId: `pending-${email}-${Date.now()}`, // OpenID temporário até fazer login
      name: nome,
      email: email,
      role: 'gestor',
      loginMethod: 'pending',
    });
    userId = (userResult as any).insertId;
  }
  
  // Criar registo de gestor
  const gestorInsertResult = await db.insert(gestores).values({ 
    userId,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const gestorId = (gestorInsertResult as any).insertId;
  
  // Buscar gestor com dados do user
  const gestorComUser = await db
    .select({
      id: gestores.id,
      userId: gestores.userId,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(gestores)
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(gestores.id, Number(gestorId)))
    .limit(1);
  
  const gestor = gestorComUser[0]!;
  return { 
    id: gestor.id, 
    userId: gestor.userId,
    user: { 
      name: gestor.userName, 
      email: gestor.userEmail, 
      role: gestor.userRole 
    } 
  };
}

export async function getGestorByUserId(userId: number): Promise<Gestor | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const gestorResult = await db.select().from(gestores).where(eq(gestores.userId, userId)).limit(1);
  return gestorResult[0];
}

export async function getGestorById(id: number): Promise<{ id: number; nome: string } | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select({
      id: gestores.id,
      nome: users.name,
    })
    .from(gestores)
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(gestores.id, id))
    .limit(1);
  
  if (result[0]) {
    return { id: result[0].id, nome: result[0].nome || 'Desconhecido' };
  }
  return undefined;
}

export async function getAllGestores(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const gestoresResults = await db
    .select({
      id: gestores.id,
      userId: gestores.userId,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(gestores)
    .innerJoin(users, eq(gestores.userId, users.id));
  
  return gestoresResults.map(r => ({
    id: r.id,
    userId: r.userId,
    user: {
      name: r.userName,
      email: r.userEmail,
      role: r.userRole
    }
  }));
}

export async function updateGestor(id: number, nome: string, email: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Primeiro, obter o gestor para encontrar o userId
  const gestor = await db.select().from(gestores).where(eq(gestores.id, id)).limit(1);
  if (gestor.length === 0) throw new Error("Gestor not found");
  
  // Atualizar o user associado com o novo nome e email
  await db.update(users).set({ name: nome, email }).where(eq(users.id, gestor[0].userId));
}

export async function deleteGestor(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete associations first
  await db.delete(gestorLojas).where(eq(gestorLojas.gestorId, id));
  // Delete gestor
  await db.delete(gestores).where(eq(gestores.id, id));
}

export async function promoteGestorToAdmin(gestorId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Buscar gestor para obter userId
  const gestorResult = await db.select().from(gestores).where(eq(gestores.id, gestorId)).limit(1);
  if (gestorResult.length === 0) {
    throw new Error("Gestor não encontrado");
  }
  
  const gestor = gestorResult[0];
  
  // Atualizar role do user para admin
  await db.update(users).set({ role: 'admin' }).where(eq(users.id, gestor.userId));
}

// ==================== GESTOR-LOJAS ====================

export async function associateGestorLoja(gestorId: number, lojaId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(gestorLojas).values({ gestorId, lojaId });
}

export async function removeGestorLoja(gestorId: number, lojaId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(gestorLojas).where(
    and(
      eq(gestorLojas.gestorId, gestorId),
      eq(gestorLojas.lojaId, lojaId)
    )
  );
}

export async function getLojasByGestorId(gestorId: number): Promise<Loja[]> {
  const db = await getDb();
  if (!db) return [];
  
  const lojasGestorResult = await db
    .select({ loja: lojas })
    .from(gestorLojas)
    .innerJoin(lojas, eq(gestorLojas.lojaId, lojas.id))
    .where(eq(gestorLojas.gestorId, gestorId));
  
  return lojasGestorResult.map(r => r.loja);
}

export async function getGestoresByLojaId(lojaId: number): Promise<Array<Gestor & { user: typeof users.$inferSelect }>> {
  const db = await getDb();
  if (!db) return [];
  
  const gestoresLojaResult = await db
    .select({
      gestorId: gestores.id,
      gestorUserId: gestores.userId,
      gestorCreatedAt: gestores.createdAt,
      gestorUpdatedAt: gestores.updatedAt,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      userOpenId: users.openId,
      userLoginMethod: users.loginMethod,
      userLastSignedIn: users.lastSignedIn,
      userCreatedAt: users.createdAt,
      userUpdatedAt: users.updatedAt,
    })
    .from(gestorLojas)
    .innerJoin(gestores, eq(gestorLojas.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(gestorLojas.lojaId, lojaId));
  
  return gestoresLojaResult.map(r => ({
    id: r.gestorId,
    userId: r.gestorUserId,
    createdAt: r.gestorCreatedAt,
    updatedAt: r.gestorUpdatedAt,
    user: {
      id: r.userId,
      name: r.userName,
      email: r.userEmail,
      role: r.userRole,
      openId: r.userOpenId,
      loginMethod: r.userLoginMethod,
      lastSignedIn: r.userLastSignedIn,
      createdAt: r.userCreatedAt,
      updatedAt: r.userUpdatedAt,
    }
  }));
}

// ==================== RELATÓRIOS LIVRES ====================

export async function createRelatorioLivre(relatorio: InsertRelatorioLivre): Promise<RelatorioLivre> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const relatorioInsertResult = await db.insert(relatoriosLivres).values(relatorio);
  const rawInsertId = (relatorioInsertResult as any).insertId;
  const insertId = typeof rawInsertId === 'bigint' ? Number(rawInsertId) : Number(rawInsertId);
  
  console.log('[createRelatorioLivre] rawInsertId:', rawInsertId, 'type:', typeof rawInsertId, 'insertId:', insertId);
  
  if (!insertId || isNaN(insertId)) {
    // Fallback: buscar o último relatório inserido por gestorId e lojaId
    const lastRelatorio = await db.select().from(relatoriosLivres)
      .where(eq(relatoriosLivres.gestorId, relatorio.gestorId))
      .orderBy(desc(relatoriosLivres.id))
      .limit(1);
    if (lastRelatorio.length > 0) {
      return lastRelatorio[0]!;
    }
    throw new Error('Falha ao obter ID do relatório inserido');
  }
  
  const newRelatorio = await db.select().from(relatoriosLivres).where(eq(relatoriosLivres.id, insertId)).limit(1);
  return newRelatorio[0]!;
}

export async function getRelatoriosLivresByGestorId(gestorId: number): Promise<RelatorioLivre[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(relatoriosLivres).where(eq(relatoriosLivres.gestorId, gestorId)).orderBy(desc(relatoriosLivres.dataVisita));
}

export async function getAllRelatoriosLivres(): Promise<Array<RelatorioLivre & { loja: Loja, gestor: Gestor & { user: typeof users.$inferSelect } }>> {
  const db = await getDb();
  if (!db) return [];
  
  const relatoriosLivresResult = await db
    .select({
      relatorio: relatoriosLivres,
      loja: lojas,
      gestor: gestores,
      user: users
    })
    .from(relatoriosLivres)
    .innerJoin(lojas, eq(relatoriosLivres.lojaId, lojas.id))
    .innerJoin(gestores, eq(relatoriosLivres.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .orderBy(desc(relatoriosLivres.dataVisita));
  
  return relatoriosLivresResult.map(r => ({ ...r.relatorio, loja: r.loja, gestor: { ...r.gestor, user: r.user } }));
}

export async function getRelatorioLivreById(id: number): Promise<RelatorioLivre | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(relatoriosLivres).where(eq(relatoriosLivres.id, id)).limit(1);
  return result[0] || null;
}

export async function updateRelatorioLivre(id: number, data: Partial<InsertRelatorioLivre>): Promise<RelatorioLivre | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(relatoriosLivres).set(data).where(eq(relatoriosLivres.id, id));
  return await getRelatorioLivreById(id);
}

export async function deleteRelatorioLivre(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(relatoriosLivres).where(eq(relatoriosLivres.id, id));
  return true;
}

// ==================== RELATÓRIOS COMPLETOS ====================

export async function createRelatorioCompleto(relatorio: InsertRelatorioCompleto): Promise<RelatorioCompleto> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const relatorioCompletoInsertResult = await db.insert(relatoriosCompletos).values(relatorio);
  const rawInsertId = (relatorioCompletoInsertResult as any).insertId;
  const insertId = typeof rawInsertId === 'bigint' ? Number(rawInsertId) : Number(rawInsertId);
  
  console.log('[createRelatorioCompleto] rawInsertId:', rawInsertId, 'type:', typeof rawInsertId, 'insertId:', insertId);
  
  if (!insertId || isNaN(insertId)) {
    // Fallback: buscar o último relatório inserido por gestorId
    const lastRelatorio = await db.select().from(relatoriosCompletos)
      .where(eq(relatoriosCompletos.gestorId, relatorio.gestorId))
      .orderBy(desc(relatoriosCompletos.id))
      .limit(1);
    if (lastRelatorio.length > 0) {
      return lastRelatorio[0]!;
    }
    throw new Error('Falha ao obter ID do relatório completo inserido');
  }
  
  const newRelatorio = await db.select().from(relatoriosCompletos).where(eq(relatoriosCompletos.id, insertId)).limit(1);
  return newRelatorio[0]!;
}

export async function getRelatoriosCompletosByGestorId(gestorId: number): Promise<RelatorioCompleto[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(relatoriosCompletos).where(eq(relatoriosCompletos.gestorId, gestorId)).orderBy(desc(relatoriosCompletos.dataVisita));
}

export async function getAllRelatoriosCompletos(): Promise<Array<RelatorioCompleto & { loja: Loja, gestor: Gestor & { user: typeof users.$inferSelect } }>> {
  const db = await getDb();
  if (!db) return [];
  
  const relatoriosCompletosResult = await db
    .select({
      relatorio: relatoriosCompletos,
      loja: lojas,
      gestor: gestores,
      user: users
    })
    .from(relatoriosCompletos)
    .innerJoin(lojas, eq(relatoriosCompletos.lojaId, lojas.id))
    .innerJoin(gestores, eq(relatoriosCompletos.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .orderBy(desc(relatoriosCompletos.dataVisita));
  
  return relatoriosCompletosResult.map(r => ({ ...r.relatorio, loja: r.loja, gestor: { ...r.gestor, user: r.user } }));
}

export async function getRelatorioCompletoById(id: number): Promise<RelatorioCompleto | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(relatoriosCompletos).where(eq(relatoriosCompletos.id, id)).limit(1);
  return result[0] || null;
}

export async function updateRelatorioCompleto(id: number, data: Partial<InsertRelatorioCompleto>): Promise<RelatorioCompleto | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(relatoriosCompletos).set(data).where(eq(relatoriosCompletos.id, id));
  return await getRelatorioCompletoById(id);
}

export async function deleteRelatorioCompleto(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(relatoriosCompletos).where(eq(relatoriosCompletos.id, id));
  return true;
}

// ==================== PENDENTES ====================

export async function createPendente(pendente: InsertPendente): Promise<Pendente> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const pendenteInsertResult = await db.insert(pendentes).values(pendente);
  const rawInsertId = (pendenteInsertResult as any).insertId;
  const insertId = typeof rawInsertId === 'bigint' ? Number(rawInsertId) : Number(rawInsertId);
  
  if (!insertId || isNaN(insertId)) {
    // Fallback: buscar o último pendente inserido por relatório
    const lastPendente = await db.select().from(pendentes)
      .orderBy(desc(pendentes.id))
      .limit(1);
    if (lastPendente.length > 0) {
      return lastPendente[0]!;
    }
    throw new Error('Falha ao obter ID do pendente inserido');
  }
  
  const newPendente = await db.select().from(pendentes).where(eq(pendentes.id, insertId)).limit(1);
  return newPendente[0]!;
}

export async function getAllPendentes(): Promise<Pendente[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(pendentes).orderBy(desc(pendentes.createdAt));
}

export async function getPendentesByLojaId(lojaId: number): Promise<Pendente[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(pendentes).where(eq(pendentes.lojaId, lojaId)).orderBy(desc(pendentes.createdAt));
}

export async function getPendenteById(id: number): Promise<Pendente | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(pendentes).where(eq(pendentes.id, id)).limit(1);
  return result[0];
}

export async function resolvePendente(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(pendentes).set({ 
    resolvido: true,
    dataResolucao: new Date()
  }).where(eq(pendentes.id, id));
}

export async function deletePendente(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(pendentes).where(eq(pendentes.id, id));
}

export async function getPendentesByRelatorio(relatorioId: number, tipoRelatorio: 'livre' | 'completo'): Promise<Pendente[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(pendentes)
    .where(and(
      eq(pendentes.relatorioId, relatorioId),
      eq(pendentes.tipoRelatorio, tipoRelatorio)
    ));
}

export async function deletePendentesByRelatorio(relatorioId: number, tipoRelatorio: 'livre' | 'completo'): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(pendentes).where(
    and(
      eq(pendentes.relatorioId, relatorioId),
      eq(pendentes.tipoRelatorio, tipoRelatorio)
    )
  );
}


// ==================== HISTÓRICO DE PONTOS POR LOJA ====================

export interface PontosHistorico {
  lojaId: number;
  lojaNome: string;
  dataVisita: Date;
  pontosPositivos: string | null;
  pontosNegativos: string | null;
  gestorNome: string | null;
}

export async function getHistoricoPontosByLojaId(lojaId: number): Promise<PontosHistorico[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      lojaId: relatoriosCompletos.lojaId,
      lojaNome: lojas.nome,
      dataVisita: relatoriosCompletos.dataVisita,
      pontosPositivos: relatoriosCompletos.pontosPositivos,
      pontosNegativos: relatoriosCompletos.pontosNegativos,
      gestorNome: users.name,
    })
    .from(relatoriosCompletos)
    .innerJoin(lojas, eq(relatoriosCompletos.lojaId, lojas.id))
    .innerJoin(gestores, eq(relatoriosCompletos.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(relatoriosCompletos.lojaId, lojaId))
    .orderBy(desc(relatoriosCompletos.dataVisita));
  
  return result;
}

export async function getHistoricoPontosAllLojas(): Promise<PontosHistorico[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      lojaId: relatoriosCompletos.lojaId,
      lojaNome: lojas.nome,
      dataVisita: relatoriosCompletos.dataVisita,
      pontosPositivos: relatoriosCompletos.pontosPositivos,
      pontosNegativos: relatoriosCompletos.pontosNegativos,
      gestorNome: users.name,
    })
    .from(relatoriosCompletos)
    .innerJoin(lojas, eq(relatoriosCompletos.lojaId, lojas.id))
    .innerJoin(gestores, eq(relatoriosCompletos.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .orderBy(desc(relatoriosCompletos.dataVisita));
  
  return result;
}

// Função para verificar alertas de pontos negativos consecutivos
export async function checkAlertasPontosNegativos(lojaId: number, threshold: number = 3): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Buscar os últimos N relatórios completos da loja
  const ultimosRelatorios = await db
    .select({
      pontosNegativos: relatoriosCompletos.pontosNegativos,
    })
    .from(relatoriosCompletos)
    .where(eq(relatoriosCompletos.lojaId, lojaId))
    .orderBy(desc(relatoriosCompletos.dataVisita))
    .limit(threshold);
  
  // Verificar se todos têm pontos negativos preenchidos
  if (ultimosRelatorios.length < threshold) return false;
  
  const todosComNegativos = ultimosRelatorios.every(r => 
    r.pontosNegativos && r.pontosNegativos.trim().length > 0
  );
  
  return todosComNegativos;
}

export async function getLojasComAlertasNegativos(threshold: number = 3): Promise<Array<{lojaId: number, lojaNome: string, ultimosNegativos: string[]}>> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todas as lojas
  const todasLojas = await db.select().from(lojas);
  
  const lojasComAlertas: Array<{lojaId: number, lojaNome: string, ultimosNegativos: string[]}> = [];
  
  for (const loja of todasLojas) {
    const ultimosRelatorios = await db
      .select({
        pontosNegativos: relatoriosCompletos.pontosNegativos,
      })
      .from(relatoriosCompletos)
      .where(eq(relatoriosCompletos.lojaId, loja.id))
      .orderBy(desc(relatoriosCompletos.dataVisita))
      .limit(threshold);
    
    if (ultimosRelatorios.length >= threshold) {
      const negativos = ultimosRelatorios
        .map(r => r.pontosNegativos)
        .filter((n): n is string => n !== null && n.trim().length > 0);
      
      if (negativos.length >= threshold) {
        lojasComAlertas.push({
          lojaId: loja.id,
          lojaNome: loja.nome,
          ultimosNegativos: negativos
        });
      }
    }
  }
  
  return lojasComAlertas;
}


// ==================== ALERTAS ====================

export async function createAlerta(data: InsertAlerta): Promise<Alerta | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(alertas).values(data);
  
  const [created] = await db
    .select()
    .from(alertas)
    .where(and(
      eq(alertas.lojaId, data.lojaId),
      eq(alertas.tipo, data.tipo)
    ))
    .orderBy(desc(alertas.createdAt))
    .limit(1);
  
  return created || null;
}

export async function getAlertaById(id: number): Promise<Alerta | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [alerta] = await db
    .select()
    .from(alertas)
    .where(eq(alertas.id, id));
  
  return alerta || null;
}

export async function getAllAlertas(): Promise<Array<Alerta & { lojaNome: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: alertas.id,
      lojaId: alertas.lojaId,
      tipo: alertas.tipo,
      descricao: alertas.descricao,
      estado: alertas.estado,
      dataResolucao: alertas.dataResolucao,
      notasResolucao: alertas.notasResolucao,
      createdAt: alertas.createdAt,
      updatedAt: alertas.updatedAt,
      lojaNome: lojas.nome,
    })
    .from(alertas)
    .innerJoin(lojas, eq(alertas.lojaId, lojas.id))
    .orderBy(desc(alertas.createdAt));
  
  return result;
}

export async function getAlertasPendentes(): Promise<Array<Alerta & { lojaNome: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: alertas.id,
      lojaId: alertas.lojaId,
      tipo: alertas.tipo,
      descricao: alertas.descricao,
      estado: alertas.estado,
      dataResolucao: alertas.dataResolucao,
      notasResolucao: alertas.notasResolucao,
      createdAt: alertas.createdAt,
      updatedAt: alertas.updatedAt,
      lojaNome: lojas.nome,
    })
    .from(alertas)
    .innerJoin(lojas, eq(alertas.lojaId, lojas.id))
    .where(eq(alertas.estado, "pendente"))
    .orderBy(desc(alertas.createdAt));
  
  return result;
}

export async function updateAlertaEstado(
  id: number, 
  estado: "pendente" | "resolvido",
  notasResolucao?: string
): Promise<Alerta | null> {
  const db = await getDb();
  if (!db) return null;
  
  const updateData: Partial<Alerta> = {
    estado,
    notasResolucao: notasResolucao || null,
    dataResolucao: estado === "resolvido" ? new Date() : null,
  };
  
  await db
    .update(alertas)
    .set(updateData)
    .where(eq(alertas.id, id));
  
  return getAlertaById(id);
}

export async function deleteAlerta(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(alertas).where(eq(alertas.id, id));
  return true;
}

// Verificar se já existe alerta pendente para uma loja
export async function existeAlertaPendente(lojaId: number, tipo: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const [existing] = await db
    .select()
    .from(alertas)
    .where(and(
      eq(alertas.lojaId, lojaId),
      eq(alertas.tipo, tipo as any),
      eq(alertas.estado, "pendente")
    ))
    .limit(1);
  
  return !!existing;
}


// ==================== CONFIGURAÇÕES DE ALERTAS ====================

// Valores padrão das configurações
const DEFAULT_CONFIGS: Record<string, { valor: string; descricao: string }> = {
  threshold_pontos_negativos: { 
    valor: "3", 
    descricao: "Número de pontos negativos consecutivos para disparar alerta" 
  },
  dias_sem_visita_alerta: { 
    valor: "30", 
    descricao: "Número de dias sem visita para disparar alerta" 
  },
  dias_pendente_antigo: { 
    valor: "14", 
    descricao: "Número de dias para considerar um pendente como antigo" 
  },
  alertas_ativos: { 
    valor: "true", 
    descricao: "Se o sistema de alertas está ativo" 
  },
};

export async function getConfiguracao(chave: string): Promise<string> {
  const db = await getDb();
  if (!db) return DEFAULT_CONFIGS[chave]?.valor || "";
  
  const [config] = await db
    .select()
    .from(configuracoesAlertas)
    .where(eq(configuracoesAlertas.chave, chave))
    .limit(1);
  
  if (config) return config.valor;
  
  // Se não existe, criar com valor padrão
  const defaultConfig = DEFAULT_CONFIGS[chave];
  if (defaultConfig) {
    await db.insert(configuracoesAlertas).values({
      chave,
      valor: defaultConfig.valor,
      descricao: defaultConfig.descricao,
    });
    return defaultConfig.valor;
  }
  
  return "";
}

export async function setConfiguracao(chave: string, valor: string): Promise<ConfiguracaoAlerta | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Verificar se existe
  const [existing] = await db
    .select()
    .from(configuracoesAlertas)
    .where(eq(configuracoesAlertas.chave, chave))
    .limit(1);
  
  if (existing) {
    await db
      .update(configuracoesAlertas)
      .set({ valor })
      .where(eq(configuracoesAlertas.chave, chave));
  } else {
    const defaultConfig = DEFAULT_CONFIGS[chave];
    await db.insert(configuracoesAlertas).values({
      chave,
      valor,
      descricao: defaultConfig?.descricao || "",
    });
  }
  
  const [updated] = await db
    .select()
    .from(configuracoesAlertas)
    .where(eq(configuracoesAlertas.chave, chave))
    .limit(1);
  
  return updated || null;
}

export async function getAllConfiguracoes(): Promise<ConfiguracaoAlerta[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Garantir que todas as configurações padrão existem
  for (const [chave, config] of Object.entries(DEFAULT_CONFIGS)) {
    const [existing] = await db
      .select()
      .from(configuracoesAlertas)
      .where(eq(configuracoesAlertas.chave, chave))
      .limit(1);
    
    if (!existing) {
      await db.insert(configuracoesAlertas).values({
        chave,
        valor: config.valor,
        descricao: config.descricao,
      });
    }
  }
  
  return await db.select().from(configuracoesAlertas);
}

export async function getThresholdPontosNegativos(): Promise<number> {
  const valor = await getConfiguracao("threshold_pontos_negativos");
  return parseInt(valor) || 3;
}


// ==================== FUNÇÕES DE ITENS NÃO VISTOS ====================

/**
 * Conta relatórios livres não vistos
 */
export async function countRelatoriosLivresNaoVistos(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(relatoriosLivres)
    .where(eq(relatoriosLivres.visto, false));
  return result[0]?.count || 0;
}

/**
 * Conta relatórios completos não vistos
 */
export async function countRelatoriosCompletosNaoVistos(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(relatoriosCompletos)
    .where(eq(relatoriosCompletos.visto, false));
  return result[0]?.count || 0;
}

/**
 * Conta pendentes não vistos (apenas não resolvidos)
 */
export async function countPendentesNaoVistos(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(pendentes)
    .where(and(eq(pendentes.visto, false), eq(pendentes.resolvido, false)));
  return result[0]?.count || 0;
}

/**
 * Marca todos os relatórios livres como vistos
 */
export async function marcarRelatoriosLivresComoVistos(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(relatoriosLivres)
    .set({ visto: true })
    .where(eq(relatoriosLivres.visto, false));
}

/**
 * Marca todos os relatórios completos como vistos
 */
export async function marcarRelatoriosCompletosComoVistos(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(relatoriosCompletos)
    .set({ visto: true })
    .where(eq(relatoriosCompletos.visto, false));
}

/**
 * Marca todos os pendentes como vistos
 */
export async function marcarPendentesComoVistos(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(pendentes)
    .set({ visto: true })
    .where(eq(pendentes.visto, false));
}


// ==================== ATIVIDADES ====================

/**
 * Registar uma nova atividade no feed
 */
export async function registarAtividade(data: {
  gestorId?: number;
  lojaId?: number;
  tipo: InsertAtividade['tipo'];
  descricao: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(atividades).values({
    gestorId: data.gestorId || null,
    lojaId: data.lojaId || null,
    tipo: data.tipo,
    descricao: data.descricao,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  });
}

/**
 * Obter atividades recentes (para o feed do admin)
 */
export async function getAtividadesRecentes(limite: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    id: atividades.id,
    gestorId: atividades.gestorId,
    lojaId: atividades.lojaId,
    tipo: atividades.tipo,
    descricao: atividades.descricao,
    metadata: atividades.metadata,
    createdAt: atividades.createdAt,
  })
    .from(atividades)
    .orderBy(desc(atividades.createdAt))
    .limit(limite);
  
  // Enriquecer com nomes de gestores e lojas
  const enriched = await Promise.all(result.map(async (ativ) => {
    let gestorNome = null;
    let lojaNome = null;
    
    if (ativ.gestorId) {
      const gestor = await getGestorById(ativ.gestorId);
      gestorNome = gestor?.nome || 'Gestor';
    }
    
    if (ativ.lojaId) {
      const loja = await getLojaById(ativ.lojaId);
      lojaNome = loja?.nome || 'Loja';
    }
    
    return {
      ...ativ,
      gestorNome,
      lojaNome,
      metadata: ativ.metadata ? JSON.parse(ativ.metadata) : null,
    };
  }));
  
  return enriched;
}

// ==================== PREVISÕES ====================

/**
 * Criar uma nova previsão
 */
export async function criarPrevisao(data: {
  lojaId: number;
  tipo: InsertPrevisao['tipo'];
  descricao: string;
  probabilidade?: number;
  sugestaoAcao?: string;
  validaAte?: Date;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result = await db.insert(previsoes).values({
    lojaId: data.lojaId,
    tipo: data.tipo,
    descricao: data.descricao,
    probabilidade: data.probabilidade || null,
    sugestaoAcao: data.sugestaoAcao || null,
    validaAte: data.validaAte || null,
  });
  
  return { id: Number(result[0].insertId) };
}

/**
 * Obter previsões ativas
 */
export async function getPrevisoesAtivas(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    id: previsoes.id,
    lojaId: previsoes.lojaId,
    tipo: previsoes.tipo,
    descricao: previsoes.descricao,
    probabilidade: previsoes.probabilidade,
    sugestaoAcao: previsoes.sugestaoAcao,
    estado: previsoes.estado,
    validaAte: previsoes.validaAte,
    createdAt: previsoes.createdAt,
  })
    .from(previsoes)
    .where(eq(previsoes.estado, 'ativa'))
    .orderBy(desc(previsoes.probabilidade));
  
  // Enriquecer com nome da loja
  const enriched = await Promise.all(result.map(async (prev) => {
    const loja = await getLojaById(prev.lojaId);
    return {
      ...prev,
      lojaNome: loja?.nome || 'Loja',
    };
  }));
  
  return enriched;
}

/**
 * Atualizar estado de uma previsão
 */
export async function atualizarEstadoPrevisao(id: number, estado: 'ativa' | 'confirmada' | 'descartada'): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(previsoes)
    .set({ estado })
    .where(eq(previsoes.id, id));
}

// ==================== SUGESTÕES DE MELHORIA ====================

/**
 * Criar uma sugestão de melhoria
 */
export async function criarSugestaoMelhoria(data: {
  relatorioId: number;
  tipoRelatorio: 'livre' | 'completo';
  lojaId: number;
  gestorId: number;
  sugestao: string;
  categoria: InsertSugestaoMelhoria['categoria'];
  prioridade?: 'baixa' | 'media' | 'alta';
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result = await db.insert(sugestoesMelhoria).values({
    relatorioId: data.relatorioId,
    tipoRelatorio: data.tipoRelatorio,
    lojaId: data.lojaId,
    gestorId: data.gestorId,
    sugestao: data.sugestao,
    categoria: data.categoria,
    prioridade: data.prioridade || 'media',
  });
  
  return { id: Number(result[0].insertId) };
}

/**
 * Obter sugestões de melhoria por relatório
 */
export async function getSugestoesByRelatorio(relatorioId: number, tipoRelatorio: 'livre' | 'completo'): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(sugestoesMelhoria)
    .where(and(
      eq(sugestoesMelhoria.relatorioId, relatorioId),
      eq(sugestoesMelhoria.tipoRelatorio, tipoRelatorio)
    ))
    .orderBy(desc(sugestoesMelhoria.createdAt));
}

/**
 * Obter sugestões recentes para uma loja
 */
export async function getSugestoesRecentesByLoja(lojaId: number, limite: number = 10): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(sugestoesMelhoria)
    .where(eq(sugestoesMelhoria.lojaId, lojaId))
    .orderBy(desc(sugestoesMelhoria.createdAt))
    .limit(limite);
}

// ==================== PLANOS DE VISITAS ====================

/**
 * Criar um plano de visitas semanal
 */
export async function criarPlanoVisitas(data: {
  gestorId: number;
  semanaInicio: Date;
  semanaFim: Date;
  visitasSugeridas: Array<{
    lojaId: number;
    lojaNome: string;
    diaSugerido: string;
    motivo: string;
    prioridade: 'alta' | 'media' | 'baixa';
  }>;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result = await db.insert(planosVisitas).values({
    gestorId: data.gestorId,
    semanaInicio: data.semanaInicio,
    semanaFim: data.semanaFim,
    visitasSugeridas: JSON.stringify(data.visitasSugeridas),
  });
  
  return { id: Number(result[0].insertId) };
}

/**
 * Obter plano de visitas atual de um gestor
 */
export async function getPlanoVisitasAtual(gestorId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const hoje = new Date();
  
  const result = await db.select()
    .from(planosVisitas)
    .where(and(
      eq(planosVisitas.gestorId, gestorId),
      sql`${planosVisitas.semanaInicio} <= ${hoje}`,
      sql`${planosVisitas.semanaFim} >= ${hoje}`
    ))
    .limit(1);
  
  if (result.length === 0) return null;
  
  return {
    ...result[0],
    visitasSugeridas: JSON.parse(result[0].visitasSugeridas as string),
    visitasRealizadas: result[0].visitasRealizadas ? JSON.parse(result[0].visitasRealizadas as string) : [],
  };
}

/**
 * Obter plano de visitas da próxima semana
 */
export async function getPlanoVisitasProximaSemana(gestorId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const hoje = new Date();
  const proximaSegunda = new Date(hoje);
  proximaSegunda.setDate(hoje.getDate() + (8 - hoje.getDay()) % 7);
  proximaSegunda.setHours(0, 0, 0, 0);
  
  const result = await db.select()
    .from(planosVisitas)
    .where(and(
      eq(planosVisitas.gestorId, gestorId),
      sql`DATE(${planosVisitas.semanaInicio}) = DATE(${proximaSegunda})`
    ))
    .limit(1);
  
  if (result.length === 0) return null;
  
  return {
    ...result[0],
    visitasSugeridas: JSON.parse(result[0].visitasSugeridas as string),
    visitasRealizadas: result[0].visitasRealizadas ? JSON.parse(result[0].visitasRealizadas as string) : [],
  };
}

/**
 * Atualizar estado do plano de visitas
 */
export async function atualizarEstadoPlanoVisitas(id: number, estado: 'pendente' | 'aceite' | 'modificado' | 'rejeitado'): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(planosVisitas)
    .set({ estado })
    .where(eq(planosVisitas.id, id));
}

/**
 * Obter dados para gerar previsões (análise de padrões)
 */
export async function getDadosParaPrevisoes(): Promise<{
  lojas: any[];
  relatoriosRecentes: any[];
  pendentesAtivos: any[];
  alertasAtivos: any[];
}> {
  const db = await getDb();
  if (!db) return { lojas: [], relatoriosRecentes: [], pendentesAtivos: [], alertasAtivos: [] };
  
  const todasLojas = await getAllLojas();
  
  // Relatórios dos últimos 90 dias
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 90);
  
  const relatoriosLivresRecentes = await db.select()
    .from(relatoriosLivres)
    .where(sql`${relatoriosLivres.dataVisita} >= ${dataLimite}`);
  
  const relatoriosCompletosRecentes = await db.select()
    .from(relatoriosCompletos)
    .where(sql`${relatoriosCompletos.dataVisita} >= ${dataLimite}`);
  
  const pendentesAtivos = await db.select()
    .from(pendentes)
    .where(eq(pendentes.resolvido, false));
  
  const alertasAtivos = await db.select()
    .from(alertas)
    .where(eq(alertas.estado, 'pendente'));
  
  return {
    lojas: todasLojas,
    relatoriosRecentes: [...relatoriosLivresRecentes, ...relatoriosCompletosRecentes],
    pendentesAtivos,
    alertasAtivos,
  };
}

/**
 * Obter dados para gerar plano de visitas de um gestor
 */
export async function getDadosParaPlanoVisitas(gestorId: number): Promise<{
  lojas: any[];
  ultimasVisitas: Map<number, Date>;
  pendentes: Map<number, number>;
  alertas: Map<number, number>;
}> {
  const db = await getDb();
  if (!db) return { lojas: [], ultimasVisitas: new Map(), pendentes: new Map(), alertas: new Map() };
  
  // Lojas do gestor
  const lojasGestor = await getLojasByGestorId(gestorId);
  
  // Última visita a cada loja
  const ultimasVisitas = new Map<number, Date>();
  for (const loja of lojasGestor) {
    const ultimaVisita = await db.select({ dataVisita: relatoriosLivres.dataVisita })
      .from(relatoriosLivres)
      .where(and(
        eq(relatoriosLivres.lojaId, loja.id),
        eq(relatoriosLivres.gestorId, gestorId)
      ))
      .orderBy(desc(relatoriosLivres.dataVisita))
      .limit(1);
    
    if (ultimaVisita.length > 0) {
      ultimasVisitas.set(loja.id, ultimaVisita[0].dataVisita);
    }
    
    // Verificar também relatórios completos
    const ultimaVisitaCompleta = await db.select({ dataVisita: relatoriosCompletos.dataVisita })
      .from(relatoriosCompletos)
      .where(and(
        eq(relatoriosCompletos.lojaId, loja.id),
        eq(relatoriosCompletos.gestorId, gestorId)
      ))
      .orderBy(desc(relatoriosCompletos.dataVisita))
      .limit(1);
    
    if (ultimaVisitaCompleta.length > 0) {
      const dataExistente = ultimasVisitas.get(loja.id);
      if (!dataExistente || ultimaVisitaCompleta[0].dataVisita > dataExistente) {
        ultimasVisitas.set(loja.id, ultimaVisitaCompleta[0].dataVisita);
      }
    }
  }
  
  // Pendentes por loja
  const pendentesMap = new Map<number, number>();
  for (const loja of lojasGestor) {
    const count = await db.select({ count: sql<number>`count(*)` })
      .from(pendentes)
      .where(and(
        eq(pendentes.lojaId, loja.id),
        eq(pendentes.resolvido, false)
      ));
    pendentesMap.set(loja.id, count[0]?.count || 0);
  }
  
  // Alertas por loja
  const alertasMap = new Map<number, number>();
  for (const loja of lojasGestor) {
    const count = await db.select({ count: sql<number>`count(*)` })
      .from(alertas)
      .where(and(
        eq(alertas.lojaId, loja.id),
        eq(alertas.estado, 'pendente')
      ));
    alertasMap.set(loja.id, count[0]?.count || 0);
  }
  
  return {
    lojas: lojasGestor,
    ultimasVisitas,
    pendentes: pendentesMap,
    alertas: alertasMap,
  };
}

// ==================== CATEGORIZAÇÃO DE RELATÓRIOS ====================

/**
 * Obter todas as categorias únicas utilizadas nos relatórios
 */
export async function getCategoriasUnicas(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Obter categorias dos relatórios livres
  const categoriasLivres = await db.selectDistinct({ categoria: relatoriosLivres.categoria })
    .from(relatoriosLivres)
    .where(sql`${relatoriosLivres.categoria} IS NOT NULL AND ${relatoriosLivres.categoria} != ''`);
  
  // Obter categorias dos relatórios completos
  const categoriasCompletos = await db.selectDistinct({ categoria: relatoriosCompletos.categoria })
    .from(relatoriosCompletos)
    .where(sql`${relatoriosCompletos.categoria} IS NOT NULL AND ${relatoriosCompletos.categoria} != ''`);
  
  // Combinar e remover duplicados
  const todasCategorias = new Set<string>();
  categoriasLivres.forEach(c => c.categoria && todasCategorias.add(c.categoria));
  categoriasCompletos.forEach(c => c.categoria && todasCategorias.add(c.categoria));
  
  return Array.from(todasCategorias).sort();
}

/**
 * Atualizar categoria de um relatório livre
 */
export async function updateCategoriaRelatorioLivre(relatorioId: number, categoria: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(relatoriosLivres)
    .set({ categoria })
    .where(eq(relatoriosLivres.id, relatorioId));
}

/**
 * Atualizar categoria de um relatório completo
 */
export async function updateCategoriaRelatorioCompleto(relatorioId: number, categoria: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(relatoriosCompletos)
    .set({ categoria })
    .where(eq(relatoriosCompletos.id, relatorioId));
}

/**
 * Atualizar estado de acompanhamento de um relatório livre
 */
export async function updateEstadoRelatorioLivre(relatorioId: number, estado: 'acompanhar' | 'em_tratamento' | 'tratado'): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(relatoriosLivres)
    .set({ estadoAcompanhamento: estado })
    .where(eq(relatoriosLivres.id, relatorioId));
}

/**
 * Atualizar estado de acompanhamento de um relatório completo
 */
export async function updateEstadoRelatorioCompleto(relatorioId: number, estado: 'acompanhar' | 'em_tratamento' | 'tratado'): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(relatoriosCompletos)
    .set({ estadoAcompanhamento: estado })
    .where(eq(relatoriosCompletos.id, relatorioId));
}

/**
 * Obter relatórios agrupados por categoria
 */
export async function getRelatoriosPorCategoria(): Promise<{
  categoria: string;
  relatorios: Array<{
    id: number;
    tipo: 'livre' | 'completo';
    lojaId: number;
    lojaNome: string;
    gestorNome: string;
    dataVisita: Date;
    descricao: string;
    estadoAcompanhamento: string | null;
  }>;
  contadores: {
    total: number;
    acompanhar: number;
    emTratamento: number;
    tratado: number;
    semEstado: number;
  };
}[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Obter relatórios livres com categoria
  const livres = await db.select({
    id: relatoriosLivres.id,
    lojaId: relatoriosLivres.lojaId,
    gestorId: relatoriosLivres.gestorId,
    dataVisita: relatoriosLivres.dataVisita,
    descricao: relatoriosLivres.descricao,
    categoria: relatoriosLivres.categoria,
    estadoAcompanhamento: relatoriosLivres.estadoAcompanhamento,
  })
    .from(relatoriosLivres)
    .where(sql`${relatoriosLivres.categoria} IS NOT NULL AND ${relatoriosLivres.categoria} != ''`)
    .orderBy(desc(relatoriosLivres.dataVisita));
  
  // Obter relatórios completos com categoria
  const completos = await db.select({
    id: relatoriosCompletos.id,
    lojaId: relatoriosCompletos.lojaId,
    gestorId: relatoriosCompletos.gestorId,
    dataVisita: relatoriosCompletos.dataVisita,
    descricao: relatoriosCompletos.resumoSupervisao,
    categoria: relatoriosCompletos.categoria,
    estadoAcompanhamento: relatoriosCompletos.estadoAcompanhamento,
  })
    .from(relatoriosCompletos)
    .where(sql`${relatoriosCompletos.categoria} IS NOT NULL AND ${relatoriosCompletos.categoria} != ''`)
    .orderBy(desc(relatoriosCompletos.dataVisita));
  
  // Agrupar por categoria
  const categoriaMap = new Map<string, any[]>();
  
  for (const rel of livres) {
    if (!rel.categoria) continue;
    const loja = await getLojaById(rel.lojaId);
    const gestor = await getGestorById(rel.gestorId);
    const item = {
      id: rel.id,
      tipo: 'livre' as const,
      lojaId: rel.lojaId,
      lojaNome: loja?.nome || 'Desconhecida',
      gestorNome: gestor?.nome || 'Desconhecido',
      dataVisita: rel.dataVisita,
      descricao: rel.descricao?.substring(0, 150) + (rel.descricao && rel.descricao.length > 150 ? '...' : ''),
      estadoAcompanhamento: rel.estadoAcompanhamento,
    };
    
    if (!categoriaMap.has(rel.categoria)) {
      categoriaMap.set(rel.categoria, []);
    }
    categoriaMap.get(rel.categoria)!.push(item);
  }
  
  for (const rel of completos) {
    if (!rel.categoria) continue;
    const loja = await getLojaById(rel.lojaId);
    const gestor = await getGestorById(rel.gestorId);
    const item = {
      id: rel.id,
      tipo: 'completo' as const,
      lojaId: rel.lojaId,
      lojaNome: loja?.nome || 'Desconhecida',
      gestorNome: gestor?.nome || 'Desconhecido',
      dataVisita: rel.dataVisita,
      descricao: rel.descricao?.substring(0, 150) + (rel.descricao && rel.descricao.length > 150 ? '...' : ''),
      estadoAcompanhamento: rel.estadoAcompanhamento,
    };
    
    if (!categoriaMap.has(rel.categoria)) {
      categoriaMap.set(rel.categoria, []);
    }
    categoriaMap.get(rel.categoria)!.push(item);
  }
  
  // Converter para array e calcular contadores
  const result = Array.from(categoriaMap.entries()).map(([categoria, relatorios]) => {
    const contadores = {
      total: relatorios.length,
      acompanhar: relatorios.filter(r => r.estadoAcompanhamento === 'acompanhar').length,
      emTratamento: relatorios.filter(r => r.estadoAcompanhamento === 'em_tratamento').length,
      tratado: relatorios.filter(r => r.estadoAcompanhamento === 'tratado').length,
      semEstado: relatorios.filter(r => !r.estadoAcompanhamento).length,
    };
    
    return { categoria, relatorios, contadores };
  });
  
  // Ordenar por total de relatórios
  result.sort((a, b) => b.contadores.total - a.contadores.total);
  
  return result;
}

/**
 * Obter estatísticas de categorias
 */
export async function getEstatisticasCategorias(): Promise<{
  totalCategorias: number;
  totalRelatoriosCategorizados: number;
  porEstado: {
    acompanhar: number;
    emTratamento: number;
    tratado: number;
    semEstado: number;
  };
}> {
  const db = await getDb();
  if (!db) return {
    totalCategorias: 0,
    totalRelatoriosCategorizados: 0,
    porEstado: { acompanhar: 0, emTratamento: 0, tratado: 0, semEstado: 0 }
  };
  
  const categorias = await getCategoriasUnicas();
  const relatoriosPorCategoria = await getRelatoriosPorCategoria();
  
  let totalRelatorios = 0;
  const porEstado = { acompanhar: 0, emTratamento: 0, tratado: 0, semEstado: 0 };
  
  for (const cat of relatoriosPorCategoria) {
    totalRelatorios += cat.contadores.total;
    porEstado.acompanhar += cat.contadores.acompanhar;
    porEstado.emTratamento += cat.contadores.emTratamento;
    porEstado.tratado += cat.contadores.tratado;
    porEstado.semEstado += cat.contadores.semEstado;
  }
  
  return {
    totalCategorias: categorias.length,
    totalRelatoriosCategorizados: totalRelatorios,
    porEstado,
  };
}


// ==================== COMENTÁRIOS DO ADMIN ====================

/**
 * Atualizar comentário do admin num relatório livre
 */
export async function updateComentarioRelatorioLivre(relatorioId: number, comentario: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(relatoriosLivres)
    .set({ comentarioAdmin: comentario })
    .where(eq(relatoriosLivres.id, relatorioId));
}

/**
 * Atualizar comentário do admin num relatório completo
 */
export async function updateComentarioRelatorioCompleto(relatorioId: number, comentario: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(relatoriosCompletos)
    .set({ comentarioAdmin: comentario })
    .where(eq(relatoriosCompletos.id, relatorioId));
}
