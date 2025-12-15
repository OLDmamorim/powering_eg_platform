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
  InsertConfiguracaoAlerta
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

export async function updateGestor(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Função mantida para compatibilidade, mas sem campos para atualizar
  // Pode ser removida se não for necessária
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
