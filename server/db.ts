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

// ==================== LOJAS ====================

export async function createLoja(loja: InsertLoja): Promise<Loja> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(lojas).values(loja);
  const insertId = (result as any).insertId;
  const newLoja = await db.select().from(lojas).where(eq(lojas.id, Number(insertId))).limit(1);
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
  
  const result = await db.select().from(lojas).where(eq(lojas.id, id)).limit(1);
  return result[0];
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
  const result = await db.insert(gestores).values({ userId });
  const insertId = (result as any).insertId;
  
  // Buscar gestor com dados do user
  const gestorComUser = await db
    .select({
      gestor: gestores,
      user: users
    })
    .from(gestores)
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(gestores.id, Number(insertId)))
    .limit(1);
  
  return { ...gestorComUser[0]!.gestor, user: gestorComUser[0]!.user };
}

export async function getGestorByUserId(userId: number): Promise<Gestor | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(gestores).where(eq(gestores.userId, userId)).limit(1);
  return result[0];
}

export async function getAllGestores(): Promise<Array<Gestor & { user: typeof users.$inferSelect }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      gestor: gestores,
      user: users
    })
    .from(gestores)
    .innerJoin(users, eq(gestores.userId, users.id));
  
  return result.map(r => ({ ...r.gestor, user: r.user }));
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
  
  const result = await db
    .select({ loja: lojas })
    .from(gestorLojas)
    .innerJoin(lojas, eq(gestorLojas.lojaId, lojas.id))
    .where(eq(gestorLojas.gestorId, gestorId));
  
  return result.map(r => r.loja);
}

export async function getGestoresByLojaId(lojaId: number): Promise<Array<Gestor & { user: typeof users.$inferSelect }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      gestor: gestores,
      user: users
    })
    .from(gestorLojas)
    .innerJoin(gestores, eq(gestorLojas.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(gestorLojas.lojaId, lojaId));
  
  return result.map(r => ({ ...r.gestor, user: r.user }));
}

// ==================== RELATÓRIOS LIVRES ====================

export async function createRelatorioLivre(relatorio: InsertRelatorioLivre): Promise<RelatorioLivre> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(relatoriosLivres).values(relatorio);
  const insertId = (result as any).insertId;
  const newRelatorio = await db.select().from(relatoriosLivres).where(eq(relatoriosLivres.id, Number(insertId))).limit(1);
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
  
  const result = await db
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
  
  return result.map(r => ({ ...r.relatorio, loja: r.loja, gestor: { ...r.gestor, user: r.user } }));
}

// ==================== RELATÓRIOS COMPLETOS ====================

export async function createRelatorioCompleto(relatorio: InsertRelatorioCompleto): Promise<RelatorioCompleto> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(relatoriosCompletos).values(relatorio);
  const insertId = (result as any).insertId;
  const newRelatorio = await db.select().from(relatoriosCompletos).where(eq(relatoriosCompletos.id, Number(insertId))).limit(1);
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
  
  const result = await db
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
  
  return result.map(r => ({ ...r.relatorio, loja: r.loja, gestor: { ...r.gestor, user: r.user } }));
}

export async function updateRelatorioCompletoEmailStatus(id: number, emailEnviado: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(relatoriosCompletos).set({ emailEnviado }).where(eq(relatoriosCompletos.id, id));
}

// ==================== PENDENTES ====================

export async function createPendente(pendente: InsertPendente): Promise<Pendente> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(pendentes).values(pendente);
  const insertId = (result as any).insertId;
  const newPendente = await db.select().from(pendentes).where(eq(pendentes.id, Number(insertId))).limit(1);
  return newPendente[0]!;
}

export async function getPendentesByLojaId(lojaId: number): Promise<Pendente[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(pendentes).where(
    and(
      eq(pendentes.lojaId, lojaId),
      eq(pendentes.resolvido, false)
    )
  ).orderBy(pendentes.createdAt);
}

export async function getAllPendentes(): Promise<Array<Pendente & { loja: Loja }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      pendente: pendentes,
      loja: lojas
    })
    .from(pendentes)
    .innerJoin(lojas, eq(pendentes.lojaId, lojas.id))
    .where(eq(pendentes.resolvido, false))
    .orderBy(pendentes.createdAt);
  
  return result.map(r => ({ ...r.pendente, loja: r.loja }));
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
