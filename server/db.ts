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
  InsertPendente
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
