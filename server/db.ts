import { eq, and, desc, asc, sql, inArray, gte, lte, or, gt, lt, isNull } from "drizzle-orm";
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
  InsertPlanoVisitas,
  relatoriosIACategorias,
  RelatorioIACategoria,
  InsertRelatorioIACategoria,
  relatoriosIA,
  RelatorioIA,
  InsertRelatorioIA,
  resumosGlobais,
  ResumoGlobal,
  InsertResumoGlobal,
  reunioesGestores,
  ReuniaoGestores,
  InsertReuniaoGestores,
  reunioesLojas,
  ReuniaoLojas,
  InsertReuniaoLojas,
  acoesReunioes,
  AcaoReuniao,
  InsertAcaoReuniao,
  resultadosMensais,
  ResultadoMensal,
  InsertResultadoMensal,
  totaisMensais,
  TotalMensal,
  InsertTotalMensal,
  vendasComplementares,
  VendaComplementar,
  InsertVendaComplementar,
  pendentesLoja,
  PendenteLoja,
  InsertPendenteLoja,
  reunioesQuinzenais,
  ReuniaoQuinzenal,
  InsertReuniaoQuinzenal,
  tokensLoja,
  TokenLoja,
  InsertTokenLoja,
  todoCategories,
  TodoCategory,
  InsertTodoCategory,
  todos,
  Todo,
  InsertTodo,
  User,
  projecoesVisitas,
  ProjecaoVisitas,
  InsertProjecaoVisitas,
  visitasPlaneadas,
  VisitaPlaneada,
  InsertVisitaPlaneada,
  relacoesLojas,
  RelacaoLojas,
  InsertRelacaoLojas
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

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by id: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
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

export async function getAllLojas() {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todas as lojas
  const todasLojas = await db.select().from(lojas).orderBy(lojas.nome);
  
  // Para cada loja, buscar o gestor atribuído mais recente (com user válido)
  const lojasComGestor = await Promise.all(
    todasLojas.map(async (loja) => {
      // Buscar associações ordenadas por data (mais recente primeiro)
      // e filtrar apenas as que têm user válido (innerJoin)
      const gestorLoja = await db
        .select({
          gestorId: gestorLojas.gestorId,
          gestorNome: users.name,
        })
        .from(gestorLojas)
        .innerJoin(gestores, eq(gestorLojas.gestorId, gestores.id))
        .innerJoin(users, eq(gestores.userId, users.id))
        .where(eq(gestorLojas.lojaId, loja.id))
        .orderBy(desc(gestorLojas.createdAt))
        .limit(1);
      
      return {
        ...loja,
        gestorId: gestorLoja[0]?.gestorId || null,
        gestorNome: gestorLoja[0]?.gestorNome || null,
      };
    })
  );
  
  return lojasComGestor;
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
    const insertId = Number((userResult as any).insertId);
    
    // Fallback: se insertId for NaN, buscar o user recém-criado
    if (isNaN(insertId)) {
      const newUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      userId = newUser[0]!.id;
    } else {
      userId = insertId;
    }
  }
  
  // Criar registo de gestor
  const gestorInsertResult = await db.insert(gestores).values({ 
    userId,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  let gestorId = Number((gestorInsertResult as any).insertId);
  
  // Fallback: se gestorId for NaN, buscar o gestor recém-criado
  if (isNaN(gestorId)) {
    const newGestor = await db.select().from(gestores).where(eq(gestores.userId, userId)).limit(1);
    gestorId = newGestor[0]!.id;
  }
  
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
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(users.role, 'gestor')) // Filtrar apenas gestores (excluir admins)
    .orderBy(users.name); // Ordenar alfabeticamente por nome
  
  return gestoresResults.map(r => ({
    id: r.id,
    userId: r.userId,
    nome: r.userName,
    email: r.userEmail, // Email no nível raiz para compatibilidade com envio de emails
    user: {
      name: r.userName,
      email: r.userEmail,
      role: r.userRole
    }
  }));
}

// Listar todos os utilizadores (gestores e admins) para atribuição de tarefas
// Exclui utilizadores de teste e o admin "Marco Amorim" (mamorim@expressglass.pt)
export async function getAllUsersParaTodos(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todos os users que são gestores ou admins
  const usersResults = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(
      or(
        eq(users.role, 'gestor'),
        eq(users.role, 'admin')
      )
    )
    .orderBy(users.name);
  
  // Filtrar utilizadores de teste e o admin Marco Amorim
  const filteredResults = usersResults.filter(u => {
    const nome = (u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    
    // Excluir utilizadores de teste (Gestor Teste IA, List Test Name, etc.)
    if (nome.includes('test') || nome.includes('teste')) return false;
    if (nome.includes('gestor teste')) return false;
    if (nome.includes('list test')) return false;
    if (email.includes('test')) return false;
    
    // Excluir Marco Amorim (Admin) - pelo nome quando é admin
    if (nome === 'marco amorim' && u.role === 'admin') return false;
    
    return true;
  });
  
  return filteredResults.map(u => ({
    userId: u.id,
    nome: u.name || u.email,
    email: u.email,
    role: u.role,
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

export async function checkReminderNeeded(gestorId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const gestorResult = await db.select().from(gestores).where(eq(gestores.id, gestorId)).limit(1);
  if (gestorResult.length === 0) return false;
  
  const gestor = gestorResult[0];
  
  // Se nunca viu lembrete, mostrar
  if (!gestor.lastReminderDate) return true;
  
  // Verificar se passaram 15 dias desde o último lembrete
  const now = new Date();
  const lastReminder = new Date(gestor.lastReminderDate);
  const daysDiff = Math.floor((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysDiff >= 15;
}

export async function updateReminderDate(gestorId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(gestores).set({ lastReminderDate: new Date() }).where(eq(gestores.id, gestorId));
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
    .where(eq(gestorLojas.gestorId, gestorId))
    .orderBy(lojas.nome);
  
  return lojasGestorResult.map(r => r.loja);
}

export async function getGestoresByLojaId(lojaId: number): Promise<Array<Gestor & { user: typeof users.$inferSelect }>> {
  const db = await getDb();
  if (!db) return [];
  
  const gestoresLojaResult = await db
    .select({
      gestorId: gestores.id,
      gestorUserId: gestores.userId,
      gestorLastReminderDate: gestores.lastReminderDate,
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
    .where(and(eq(gestorLojas.lojaId, lojaId), eq(users.role, 'gestor'))); // Filtrar apenas gestores
  
  return gestoresLojaResult.map(r => ({
    id: r.gestorId,
    userId: r.gestorUserId,
    lastReminderDate: r.gestorLastReminderDate,
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

export async function getRelatoriosLivresByGestorId(gestorId: number): Promise<Array<RelatorioLivre & { loja: Loja, gestor: Gestor & { user: typeof users.$inferSelect } }>> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar IDs das lojas atribuídas ao gestor
  const lojasDoGestor = await db
    .select({ lojaId: gestorLojas.lojaId })
    .from(gestorLojas)
    .where(eq(gestorLojas.gestorId, gestorId));
  
  const lojaIds = lojasDoGestor.map(l => l.lojaId);
  
  if (lojaIds.length === 0) return [];
  
  // Buscar TODOS os relatórios das lojas do gestor (independente de quem criou)
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
    .where(inArray(relatoriosLivres.lojaId, lojaIds))
    .orderBy(desc(relatoriosLivres.dataVisita));
  
  return result.map(r => ({
    ...r.relatorio,
    loja: r.loja,
    gestor: { ...r.gestor, user: r.user }
  }));
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

export async function getRelatoriosCompletosByGestorId(gestorId: number): Promise<Array<RelatorioCompleto & { loja: Loja, gestor: Gestor & { user: typeof users.$inferSelect } }>> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar IDs das lojas atribuídas ao gestor
  const lojasDoGestor = await db
    .select({ lojaId: gestorLojas.lojaId })
    .from(gestorLojas)
    .where(eq(gestorLojas.gestorId, gestorId));
  
  const lojaIds = lojasDoGestor.map(l => l.lojaId);
  
  if (lojaIds.length === 0) return [];
  
  // Buscar TODOS os relatórios das lojas do gestor (independente de quem criou)
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
    .where(inArray(relatoriosCompletos.lojaId, lojaIds))
    .orderBy(desc(relatoriosCompletos.dataVisita));
  
  return result.map(r => ({
    ...r.relatorio,
    loja: r.loja,
    gestor: { ...r.gestor, user: r.user }
  }));
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
    .orderBy(desc(pendentes.createdAt));
  
  return result.map(r => ({
    ...r.pendente,
    loja: r.loja
  }));
}

export async function getPendentesByLojaId(lojaId: number): Promise<Array<Pendente & { loja: Loja }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      pendente: pendentes,
      loja: lojas
    })
    .from(pendentes)
    .innerJoin(lojas, eq(pendentes.lojaId, lojas.id))
    .where(eq(pendentes.lojaId, lojaId))
    .orderBy(desc(pendentes.createdAt));
  
  return result.map(r => ({
    ...r.pendente,
    loja: r.loja
  }));
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

export async function unresolvePendente(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(pendentes).set({ 
    resolvido: false,
    dataResolucao: null
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


// ==================== HISTÓRICO DE RELATÓRIOS IA POR CATEGORIAS ====================

/**
 * Salvar relatório IA gerado
 */
export async function salvarRelatorioIACategoria(data: {
  conteudo: string;
  geradoPor: number;
  versao?: string;
}): Promise<RelatorioIACategoria> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result = await db.insert(relatoriosIACategorias).values({
    conteudo: data.conteudo,
    geradoPor: data.geradoPor,
    versao: data.versao || '5.8',
  });
  
  const insertId = Number(result[0].insertId);
  const [novoRelatorio] = await db
    .select()
    .from(relatoriosIACategorias)
    .where(eq(relatoriosIACategorias.id, insertId))
    .limit(1);
  
  return novoRelatorio!;
}

/**
 * Obter histórico de relatórios IA (ordenado por data DESC)
 */
export async function getHistoricoRelatoriosIA(): Promise<Array<RelatorioIACategoria & { geradoPorNome: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: relatoriosIACategorias.id,
      conteudo: relatoriosIACategorias.conteudo,
      geradoPor: relatoriosIACategorias.geradoPor,
      versao: relatoriosIACategorias.versao,
      createdAt: relatoriosIACategorias.createdAt,
      geradoPorNome: users.name,
    })
    .from(relatoriosIACategorias)
    .innerJoin(users, eq(relatoriosIACategorias.geradoPor, users.id))
    .orderBy(desc(relatoriosIACategorias.createdAt));
  
  return result.map(r => ({
    id: r.id,
    conteudo: r.conteudo,
    geradoPor: r.geradoPor,
    versao: r.versao,
    createdAt: r.createdAt,
    geradoPorNome: r.geradoPorNome || 'Desconhecido',
  }));
}

/**
 * Obter histórico de relatórios IA filtrado por gestor
 * Retorna apenas relatórios gerados pelo gestor especificado
 */
export async function getHistoricoRelatoriosIAByGestor(gestorUserId: number): Promise<Array<RelatorioIACategoria & { geradoPorNome: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: relatoriosIACategorias.id,
      conteudo: relatoriosIACategorias.conteudo,
      geradoPor: relatoriosIACategorias.geradoPor,
      versao: relatoriosIACategorias.versao,
      createdAt: relatoriosIACategorias.createdAt,
      geradoPorNome: users.name,
    })
    .from(relatoriosIACategorias)
    .innerJoin(users, eq(relatoriosIACategorias.geradoPor, users.id))
    .where(eq(relatoriosIACategorias.geradoPor, gestorUserId))
    .orderBy(desc(relatoriosIACategorias.createdAt));
  
  return result.map(r => ({
    id: r.id,
    conteudo: r.conteudo,
    geradoPor: r.geradoPor,
    versao: r.versao,
    createdAt: r.createdAt,
    geradoPorNome: r.geradoPorNome || 'Desconhecido',
  }));
}

/**
 * Obter relatório IA por ID
 */
export async function getRelatorioIACategoriaById(id: number): Promise<RelatorioIACategoria | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [relatorio] = await db
    .select()
    .from(relatoriosIACategorias)
    .where(eq(relatoriosIACategorias.id, id))
    .limit(1);
  
  return relatorio || null;
}


/**
 * Calcular progresso de relatórios de uma loja no mês atual
 */
export async function calcularProgressoRelatorios(lojaId: number): Promise<{
  minimoLivres: number;
  minimoCompletos: number;
  realizadosLivres: number;
  realizadosCompletos: number;
  percentualLivres: number;
  percentualCompletos: number;
  emAtrasoLivres: boolean;
  emAtrasoCompletos: boolean;
}> {
  const db = await getDb();
  if (!db) {
    return {
      minimoLivres: 0,
      minimoCompletos: 0,
      realizadosLivres: 0,
      realizadosCompletos: 0,
      percentualLivres: 0,
      percentualCompletos: 0,
      emAtrasoLivres: false,
      emAtrasoCompletos: false,
    };
  }

  // Buscar configuração da loja
  const [loja] = await db.select().from(lojas).where(eq(lojas.id, lojaId)).limit(1);
  if (!loja) {
    throw new Error(`Loja ${lojaId} não encontrada`);
  }

  const minimoLivres = loja.minimoRelatoriosLivres || 0;
  const minimoCompletos = loja.minimoRelatoriosCompletos || 0;

  // Calcular início e fim do mês atual
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

  // Contar relatórios livres do mês
  const [resultLivres] = await db
    .select({ count: sql<number>`count(*)` })
    .from(relatoriosLivres)
    .where(
      and(
        eq(relatoriosLivres.lojaId, lojaId),
        sql`${relatoriosLivres.createdAt} >= ${inicioMes}`,
        sql`${relatoriosLivres.createdAt} <= ${fimMes}`
      )
    );

  // Contar relatórios completos do mês
  const [resultCompletos] = await db
    .select({ count: sql<number>`count(*)` })
    .from(relatoriosCompletos)
    .where(
      and(
        eq(relatoriosCompletos.lojaId, lojaId),
        sql`${relatoriosCompletos.createdAt} >= ${inicioMes}`,
        sql`${relatoriosCompletos.createdAt} <= ${fimMes}`
      )
    );

  const realizadosLivres = Number(resultLivres?.count || 0);
  const realizadosCompletos = Number(resultCompletos?.count || 0);

  // Calcular percentuais
  const percentualLivres = minimoLivres > 0 ? Math.round((realizadosLivres / minimoLivres) * 100) : 100;
  const percentualCompletos = minimoCompletos > 0 ? Math.round((realizadosCompletos / minimoCompletos) * 100) : 100;

  // Verificar se está em atraso (metade do mês passou e não atingiu proporcional)
  const diaAtual = hoje.getDate();
  const diasNoMes = fimMes.getDate();
  const metadeMes = diasNoMes / 2;
  
  const proporcionalLivres = Math.ceil((minimoLivres * diaAtual) / diasNoMes);
  const proporcionalCompletos = Math.ceil((minimoCompletos * diaAtual) / diasNoMes);

  const emAtrasoLivres = minimoLivres > 0 && diaAtual >= metadeMes && realizadosLivres < proporcionalLivres;
  const emAtrasoCompletos = minimoCompletos > 0 && diaAtual >= metadeMes && realizadosCompletos < proporcionalCompletos;

  return {
    minimoLivres,
    minimoCompletos,
    realizadosLivres,
    realizadosCompletos,
    percentualLivres,
    percentualCompletos,
    emAtrasoLivres,
    emAtrasoCompletos,
  };
}

/**
 * Verificar lojas em atraso para um gestor específico
 */
export async function verificarAtrasosGestor(gestorId: number): Promise<Array<{
  lojaId: number;
  lojaNome: string;
  minimoLivres: number;
  minimoCompletos: number;
  realizadosLivres: number;
  realizadosCompletos: number;
  emAtrasoLivres: boolean;
  emAtrasoCompletos: boolean;
}>> {
  const db = await getDb();
  if (!db) return [];

  // Buscar lojas do gestor
  const lojasGestor = await getLojasByGestorId(gestorId);

  const resultado = [];

  for (const loja of lojasGestor) {
    const progresso = await calcularProgressoRelatorios(loja.id);
    
    // Incluir apenas lojas com atraso
    if (progresso.emAtrasoLivres || progresso.emAtrasoCompletos) {
      resultado.push({
        lojaId: loja.id,
        lojaNome: loja.nome,
        minimoLivres: progresso.minimoLivres,
        minimoCompletos: progresso.minimoCompletos,
        realizadosLivres: progresso.realizadosLivres,
        realizadosCompletos: progresso.realizadosCompletos,
        emAtrasoLivres: progresso.emAtrasoLivres,
        emAtrasoCompletos: progresso.emAtrasoCompletos,
      });
    }
  }

  return resultado;
}

/**
 * Obter progresso de todas as lojas de um gestor
 */
export async function getProgressoTodasLojasGestor(gestorId: number): Promise<Array<{
  lojaId: number;
  lojaNome: string;
  minimoLivres: number;
  minimoCompletos: number;
  realizadosLivres: number;
  realizadosCompletos: number;
  percentualLivres: number;
  percentualCompletos: number;
  emAtrasoLivres: boolean;
  emAtrasoCompletos: boolean;
}>> {
  const db = await getDb();
  if (!db) return [];

  // Buscar lojas do gestor
  const lojasGestor = await getLojasByGestorId(gestorId);

  const resultado = [];

  for (const loja of lojasGestor) {
    const progresso = await calcularProgressoRelatorios(loja.id);
    
    resultado.push({
      lojaId: loja.id,
      lojaNome: loja.nome,
      ...progresso,
    });
  }

  return resultado;
}


/**
 * Gestão de Utilizadores (Admin)
 */

// Obter todos os utilizadores com informação completa
export async function getAllUsers(): Promise<Array<typeof users.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).orderBy(users.createdAt);
}

// Atualizar dados de um utilizador (nome, email, role)
export async function updateUser(userId: number, data: {
  name?: string;
  email?: string;
  role?: 'user' | 'admin' | 'gestor';
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(users)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
}


// Eliminar um utilizador
export async function deleteUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.delete(users).where(eq(users.id, userId));
}

// Eliminar múltiplos utilizadores em lote
export async function deleteUsersInBatch(userIds: number[]): Promise<{ deleted: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  if (userIds.length === 0) return { deleted: 0 };
  
  await db.delete(users).where(inArray(users.id, userIds));
  return { deleted: userIds.length };
}


/**
 * Contar relatórios do mês atual por loja (para indicador de cumprimento de mínimos)
 */
export async function contarRelatoriosMesAtualPorLoja(lojaId: number): Promise<{
  relatoriosLivres: number;
  relatoriosCompletos: number;
}> {
  const db = await getDb();
  if (!db) return { relatoriosLivres: 0, relatoriosCompletos: 0 };

  // Calcular início e fim do mês atual
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

  // Contar relatórios livres do mês (lojaId direto ou em lojasIds JSON)
  const livres = await db
    .select({ count: sql<number>`count(*)` })
    .from(relatoriosLivres)
    .where(
      and(
        sql`(${relatoriosLivres.lojaId} = ${lojaId} OR JSON_CONTAINS(${relatoriosLivres.lojasIds}, CAST(${lojaId} AS JSON)))`,
        gte(relatoriosLivres.dataVisita, inicioMes),
        lte(relatoriosLivres.dataVisita, fimMes)
      )
    );

  // Contar relatórios completos do mês
  const completos = await db
    .select({ count: sql<number>`count(*)` })
    .from(relatoriosCompletos)
    .where(
      and(
        eq(relatoriosCompletos.lojaId, lojaId),
        gte(relatoriosCompletos.dataVisita, inicioMes),
        lte(relatoriosCompletos.dataVisita, fimMes)
      )
    );

  return {
    relatoriosLivres: Number(livres[0]?.count || 0),
    relatoriosCompletos: Number(completos[0]?.count || 0),
  };
}

/**
 * Buscar pendentes das lojas atribuídas a um gestor
 */
export async function getPendentesByGestorId(gestorId: number): Promise<Array<Pendente & { loja: Loja }>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: pendentes.id,
      lojaId: pendentes.lojaId,
      relatorioId: pendentes.relatorioId,
      tipoRelatorio: pendentes.tipoRelatorio,
      descricao: pendentes.descricao,
      resolvido: pendentes.resolvido,
      dataResolucao: pendentes.dataResolucao,
      dataLimite: pendentes.dataLimite,
      visto: pendentes.visto,
      createdAt: pendentes.createdAt,
      updatedAt: pendentes.updatedAt,
      loja: lojas,
    })
    .from(pendentes)
    .innerJoin(lojas, eq(pendentes.lojaId, lojas.id))
    .innerJoin(gestorLojas, eq(lojas.id, gestorLojas.lojaId))
    .where(eq(gestorLojas.gestorId, gestorId))
    .orderBy(desc(pendentes.createdAt));

  return result.map((row: any) => ({
    ...row,
    loja: row.loja,
  }));
}


/**
 * Criar relatório IA (diário/semanal/mensal/trimestral)
 */
export async function createRelatorioIA(data: {
  periodo: string; // Agora aceita períodos personalizados como "meses_10/2025, 11/2025"
  conteudo: string; // JSON stringificado da análise
  geradoPor: number;
}): Promise<RelatorioIA> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result = await db.insert(relatoriosIA).values({
    periodo: data.periodo,
    conteudo: data.conteudo,
    geradoPor: data.geradoPor,
  });
  
  const insertId = Number(result[0].insertId);
  if (isNaN(insertId)) {
    // Fallback: buscar último relatório inserido
    const [ultimoRelatorio] = await db
      .select()
      .from(relatoriosIA)
      .orderBy(desc(relatoriosIA.id))
      .limit(1);
    return ultimoRelatorio!;
  }
  
  const [novoRelatorio] = await db
    .select()
    .from(relatoriosIA)
    .where(eq(relatoriosIA.id, insertId))
    .limit(1);
  
  return novoRelatorio!;
}

/**
 * Obter histórico de relatórios IA (ordenado por data DESC)
 */
export async function getHistoricoRelatoriosIANormal(): Promise<Array<RelatorioIA & { geradoPorNome: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: relatoriosIA.id,
      periodo: relatoriosIA.periodo,
      conteudo: relatoriosIA.conteudo,
      geradoPor: relatoriosIA.geradoPor,
      createdAt: relatoriosIA.createdAt,
      geradoPorNome: users.name,
    })
    .from(relatoriosIA)
    .innerJoin(users, eq(relatoriosIA.geradoPor, users.id))
    .orderBy(desc(relatoriosIA.createdAt));
  
  return result.map(r => ({
    id: r.id,
    periodo: r.periodo,
    conteudo: r.conteudo,
    geradoPor: r.geradoPor,
    createdAt: r.createdAt,
    geradoPorNome: r.geradoPorNome || 'Desconhecido',
  }));
}

/**
 * Obter histórico de relatórios IA por gestor (ordenado por data DESC)
 */
export async function getHistoricoRelatoriosIANormalByGestor(gestorUserId: number): Promise<Array<RelatorioIA & { geradoPorNome: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: relatoriosIA.id,
      periodo: relatoriosIA.periodo,
      conteudo: relatoriosIA.conteudo,
      geradoPor: relatoriosIA.geradoPor,
      createdAt: relatoriosIA.createdAt,
      geradoPorNome: users.name,
    })
    .from(relatoriosIA)
    .innerJoin(users, eq(relatoriosIA.geradoPor, users.id))
    .where(eq(relatoriosIA.geradoPor, gestorUserId))
    .orderBy(desc(relatoriosIA.createdAt));
  
  return result.map(r => ({
    id: r.id,
    periodo: r.periodo,
    conteudo: r.conteudo,
    geradoPor: r.geradoPor,
    createdAt: r.createdAt,
    geradoPorNome: r.geradoPorNome || 'Desconhecido',
  }));
}

/**
 * Obter relatório IA por ID
 */
export async function getRelatorioIAById(id: number): Promise<RelatorioIA | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [relatorio] = await db
    .select()
    .from(relatoriosIA)
    .where(eq(relatoriosIA.id, id))
    .limit(1);
  
  return relatorio || null;
}


/**
 * Criar resumo global
 */
export async function createResumoGlobal(data: InsertResumoGlobal): Promise<ResumoGlobal> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [novoResumo] = await db
    .insert(resumosGlobais)
    .values(data)
    .$returningId();
  
  const [resumo] = await db
    .select()
    .from(resumosGlobais)
    .where(eq(resumosGlobais.id, novoResumo.id))
    .limit(1);
  
  return resumo!;
}

/**
 * Obter histórico de resumos globais (ordenado por data DESC)
 */
export async function getHistoricoResumosGlobais(): Promise<Array<ResumoGlobal & { geradoPorNome: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: resumosGlobais.id,
      periodo: resumosGlobais.periodo,
      dataInicio: resumosGlobais.dataInicio,
      dataFim: resumosGlobais.dataFim,
      conteudo: resumosGlobais.conteudo,
      geradoPor: resumosGlobais.geradoPor,
      createdAt: resumosGlobais.createdAt,
      geradoPorNome: users.name,
    })
    .from(resumosGlobais)
    .innerJoin(users, eq(resumosGlobais.geradoPor, users.id))
    .orderBy(desc(resumosGlobais.createdAt));
  
  return result.map(r => ({
    id: r.id,
    periodo: r.periodo,
    dataInicio: r.dataInicio,
    dataFim: r.dataFim,
    conteudo: r.conteudo,
    geradoPor: r.geradoPor,
    createdAt: r.createdAt,
    geradoPorNome: r.geradoPorNome || 'Desconhecido',
  }));
}

/**
 * Obter resumo global por ID
 */
export async function getResumoGlobalById(id: number): Promise<ResumoGlobal | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [resumo] = await db
    .select()
    .from(resumosGlobais)
    .where(eq(resumosGlobais.id, id))
    .limit(1);
  
  return resumo || null;
}

/**
 * Obter último resumo global de um período específico
 */
export async function getUltimoResumoGlobalPorPeriodo(periodo: 'mes_atual' | 'mes_anterior' | 'trimestre_anterior' | 'semestre_anterior' | 'ano_anterior'): Promise<ResumoGlobal | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [resumo] = await db
    .select()
    .from(resumosGlobais)
    .where(eq(resumosGlobais.periodo, periodo))
    .orderBy(desc(resumosGlobais.createdAt))
    .limit(1);
  
  return resumo || null;
}


// ==================== REUNIÕES DE GESTORES ====================

/**
 * Criar reunião de gestores
 */
export async function createReuniaoGestores(data: InsertReuniaoGestores): Promise<ReuniaoGestores> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [novaReuniao] = await db
    .insert(reunioesGestores)
    .values(data)
    .$returningId();
  
  const [reuniao] = await db
    .select()
    .from(reunioesGestores)
    .where(eq(reunioesGestores.id, novaReuniao.id))
    .limit(1);
  
  return reuniao!;
}

/**
 * Atualizar reunião de gestores
 */
export async function updateReuniaoGestores(
  id: number,
  data: Partial<InsertReuniaoGestores>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(reunioesGestores)
    .set(data)
    .where(eq(reunioesGestores.id, id));
}

/**
 * Obter histórico de reuniões de gestores (ordenado por data DESC)
 */
export async function getHistoricoReuniõesGestores(filtros?: {
  dataInicio?: Date;
  dataFim?: Date;
  tags?: string[];
  criadoPor?: number;
  pesquisa?: string;
}): Promise<Array<ReuniaoGestores & { criadoPorNome: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: reunioesGestores.id,
      data: reunioesGestores.data,
      presencas: reunioesGestores.presencas,
      outrosPresentes: reunioesGestores.outrosPresentes,
      conteudo: reunioesGestores.conteudo,
      resumoIA: reunioesGestores.resumoIA,
      tags: reunioesGestores.tags,
      anexos: reunioesGestores.anexos,
      criadoPor: reunioesGestores.criadoPor,
      createdAt: reunioesGestores.createdAt,
      updatedAt: reunioesGestores.updatedAt,
      criadoPorNome: users.name,
    })
    .from(reunioesGestores)
    .innerJoin(users, eq(reunioesGestores.criadoPor, users.id))
    .orderBy(desc(reunioesGestores.data));
  
  // Aplicar todos os filtros
  let filtered = result;
  
  if (filtros?.dataInicio) {
    const dataInicioTs = filtros.dataInicio.getTime();
    filtered = filtered.filter(r => {
      const dataTs = typeof r.data === 'number' ? r.data : new Date(r.data).getTime();
      return dataTs >= dataInicioTs;
    });
  }
  if (filtros?.dataFim) {
    const dataFimTs = filtros.dataFim.getTime();
    filtered = filtered.filter(r => {
      const dataTs = typeof r.data === 'number' ? r.data : new Date(r.data).getTime();
      return dataTs <= dataFimTs;
    });
  }
  if (filtros?.criadoPor) {
    filtered = filtered.filter(r => r.criadoPor === filtros.criadoPor);
  }
  
  if (filtros?.tags && filtros.tags.length > 0) {
    filtered = filtered.filter(r => {
      if (!r.tags) return false;
      const reuniaoTags = JSON.parse(r.tags);
      return filtros.tags!.some(tag => reuniaoTags.includes(tag));
    });
  }
  
  if (filtros?.pesquisa) {
    const pesquisaLower = filtros.pesquisa.toLowerCase();
    filtered = filtered.filter(r => 
      r.conteudo.toLowerCase().includes(pesquisaLower) ||
      (r.resumoIA && r.resumoIA.toLowerCase().includes(pesquisaLower))
    );
  }
  
  return filtered;
}

/**
 * Obter reunião de gestores por ID
 */
export async function getReuniaoGestoresById(id: number): Promise<ReuniaoGestores | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [reuniao] = await db
    .select()
    .from(reunioesGestores)
    .where(eq(reunioesGestores.id, id))
    .limit(1);
  
  return reuniao || null;
}

// ==================== REUNIÕES DE LOJAS ====================

/**
 * Criar reunião de lojas
 */
export async function createReuniaoLojas(data: InsertReuniaoLojas): Promise<ReuniaoLojas> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [novaReuniao] = await db
    .insert(reunioesLojas)
    .values(data)
    .$returningId();
  
  const [reuniao] = await db
    .select()
    .from(reunioesLojas)
    .where(eq(reunioesLojas.id, novaReuniao.id))
    .limit(1);
  
  return reuniao!;
}

/**
 * Atualizar reunião de lojas
 */
export async function updateReuniaoLojas(
  id: number,
  data: Partial<InsertReuniaoLojas>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(reunioesLojas)
    .set(data)
    .where(eq(reunioesLojas.id, id));
}

/**
 * Obter histórico de reuniões de lojas (filtrado por gestor se fornecido)
 */
export async function getHistoricoReuniõesLojas(
  gestorId?: number,
  filtros?: {
    dataInicio?: Date;
    dataFim?: Date;
    tags?: string[];
    criadoPor?: number;
    pesquisa?: string;
  }
): Promise<Array<ReuniaoLojas & { criadoPorNome: string; lojasNomes: string[] }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: reunioesLojas.id,
      data: reunioesLojas.data,
      lojaIds: reunioesLojas.lojaIds,
      presencas: reunioesLojas.presencas,
      conteudo: reunioesLojas.conteudo,
      resumoIA: reunioesLojas.resumoIA,
      tags: reunioesLojas.tags,
      anexos: reunioesLojas.anexos,
      criadoPor: reunioesLojas.criadoPor,
      createdAt: reunioesLojas.createdAt,
      updatedAt: reunioesLojas.updatedAt,
      criadoPorNome: users.name,
    })
    .from(reunioesLojas)
    .innerJoin(users, eq(reunioesLojas.criadoPor, users.id))
    .orderBy(desc(reunioesLojas.data));
  
  // Se é gestor, filtrar apenas reuniões das suas lojas
  let filteredResult = result;
  if (gestorId) {
    const lojasGestor = await getLojasByGestorId(gestorId);
    const lojaIdsGestor = lojasGestor.map((l: any) => l.id);
    
    filteredResult = result.filter(r => {
      const lojaIds = JSON.parse(r.lojaIds) as number[];
      return lojaIds.some(id => lojaIdsGestor.includes(id));
    });
  }
  
  // Aplicar filtros de data e criador
  if (filtros?.dataInicio) {
    const dataInicioTs = filtros.dataInicio.getTime();
    filteredResult = filteredResult.filter(r => {
      const dataTs = typeof r.data === 'number' ? r.data : new Date(r.data).getTime();
      return dataTs >= dataInicioTs;
    });
  }
  if (filtros?.dataFim) {
    const dataFimTs = filtros.dataFim.getTime();
    filteredResult = filteredResult.filter(r => {
      const dataTs = typeof r.data === 'number' ? r.data : new Date(r.data).getTime();
      return dataTs <= dataFimTs;
    });
  }
  if (filtros?.criadoPor) {
    filteredResult = filteredResult.filter(r => r.criadoPor === filtros.criadoPor);
  }
  
  // Aplicar filtros de tags e pesquisa antes de buscar nomes
  if (filtros?.tags && filtros.tags.length > 0) {
    filteredResult = filteredResult.filter(r => {
      if (!r.tags) return false;
      const reuniaoTags = JSON.parse(r.tags);
      return filtros.tags!.some(tag => reuniaoTags.includes(tag));
    });
  }
  
  if (filtros?.pesquisa) {
    const pesquisaLower = filtros.pesquisa.toLowerCase();
    filteredResult = filteredResult.filter(r => 
      r.conteudo.toLowerCase().includes(pesquisaLower) ||
      (r.resumoIA && r.resumoIA.toLowerCase().includes(pesquisaLower))
    );
  }
  
  // Buscar nomes das lojas
  const todasLojas = await getAllLojas();
  
  return filteredResult.map(r => {
    const lojaIds = JSON.parse(r.lojaIds) as number[];
    const lojasNomes = lojaIds
      .map(id => todasLojas.find(l => l.id === id)?.nome)
      .filter(Boolean) as string[];
    
    return {
      id: r.id,
      data: r.data,
      lojaIds: r.lojaIds,
      presencas: r.presencas,
      conteudo: r.conteudo,
      resumoIA: r.resumoIA,
      tags: r.tags,
      anexos: r.anexos,
      criadoPor: r.criadoPor,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      criadoPorNome: r.criadoPorNome || 'Desconhecido',
      lojasNomes,
    };
  });
}

/**
 * Obter reunião de lojas por ID
 */
export async function getReuniaoLojasById(id: number): Promise<ReuniaoLojas | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [reuniao] = await db
    .select()
    .from(reunioesLojas)
    .where(eq(reunioesLojas.id, id))
    .limit(1);
  
  return reuniao || null;
}

/**
 * Obter última reunião de uma loja específica
 */
export async function getUltimaReuniaoLoja(lojaId: number): Promise<ReuniaoLojas | null> {
  const db = await getDb();
  if (!db) return null;
  
  const todasReunioes = await db
    .select()
    .from(reunioesLojas)
    .orderBy(desc(reunioesLojas.data));
  
  // Filtrar reuniões que incluem esta loja
  const reuniaoLoja = todasReunioes.find(r => {
    const lojaIds = JSON.parse(r.lojaIds) as number[];
    return lojaIds.includes(lojaId);
  });
  
  return reuniaoLoja || null;
}

// ==================== AÇÕES DE REUNIÕES ====================

/**
 * Criar ação de reunião
 */
export async function createAcaoReuniao(data: InsertAcaoReuniao): Promise<AcaoReuniao> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [novaAcao] = await db
    .insert(acoesReunioes)
    .values(data)
    .$returningId();
  
  const [acao] = await db
    .select()
    .from(acoesReunioes)
    .where(eq(acoesReunioes.id, novaAcao.id))
    .limit(1);
  
  return acao!;
}

/**
 * Obter ações de uma reunião específica
 */
export async function getAcoesReuniao(
  reuniaoId: number,
  tipoReuniao: 'gestores' | 'lojas'
): Promise<AcaoReuniao[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(acoesReunioes)
    .where(
      and(
        eq(acoesReunioes.reuniaoId, reuniaoId),
        eq(acoesReunioes.tipoReuniao, tipoReuniao)
      )
    )
    .orderBy(desc(acoesReunioes.createdAt));
}

/**
 * Atualizar status de ação
 */
export async function updateAcaoReuniao(
  id: number,
  status: 'pendente' | 'concluida'
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(acoesReunioes)
    .set({ status })
    .where(eq(acoesReunioes.id, id));
}

// ==================== RESULTADOS MENSAIS ====================

/**
 * Obter resultados mensais com filtros
 */
export async function getResultadosMensais(
  filtros: { mes?: number; ano?: number; lojaId?: number },
  user: User
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Construir condições de filtro
  const conditions: any[] = [];
  
  // Se for gestor, filtrar apenas suas lojas
  if (user.role === 'gestor') {
    const gestor = await getGestorByUserId(user.id);
    if (gestor) {
      const lojasGestor = await getLojasByGestorId(gestor.id);
      const lojaIds = lojasGestor.map(l => l.id);
      conditions.push(inArray(resultadosMensais.lojaId, lojaIds));
    }
  } else if (filtros.lojaId) {
    // Admin pode filtrar por loja específica
    conditions.push(eq(resultadosMensais.lojaId, filtros.lojaId));
  }
  
  // Filtros de período
  if (filtros.mes) conditions.push(eq(resultadosMensais.mes, filtros.mes));
  if (filtros.ano) conditions.push(eq(resultadosMensais.ano, filtros.ano));
  
  // Executar query
  const baseQuery = db
    .select({
      id: resultadosMensais.id,
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      mes: resultadosMensais.mes,
      ano: resultadosMensais.ano,
      zona: resultadosMensais.zona,
      totalServicos: resultadosMensais.totalServicos,
      servicosPorColaborador: resultadosMensais.servicosPorColaborador,
      numColaboradores: resultadosMensais.numColaboradores,
      objetivoDiaAtual: resultadosMensais.objetivoDiaAtual,
      objetivoMensal: resultadosMensais.objetivoMensal,
      desvioObjetivoAcumulado: resultadosMensais.desvioObjetivoAcumulado,
      desvioPercentualDia: resultadosMensais.desvioPercentualDia,
      desvioPercentualMes: resultadosMensais.desvioPercentualMes,
      taxaReparacao: resultadosMensais.taxaReparacao,
      qtdReparacoes: resultadosMensais.qtdReparacoes,
      qtdParaBrisas: resultadosMensais.qtdParaBrisas,
      gapReparacoes22: resultadosMensais.gapReparacoes22,
      nomeArquivo: resultadosMensais.nomeArquivo,
      createdAt: resultadosMensais.createdAt,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id));
  
  const resultados = conditions.length > 0
    ? await baseQuery.where(and(...conditions)).orderBy(lojas.nome)
    : await baseQuery.orderBy(lojas.nome);
  
  return resultados.map(r => ({
    ...r,
    servicosPorColaborador: r.servicosPorColaborador ? parseFloat(r.servicosPorColaborador) : null,
    objetivoDiaAtual: r.objetivoDiaAtual ? parseFloat(r.objetivoDiaAtual) : null,
    desvioObjetivoAcumulado: r.desvioObjetivoAcumulado ? parseFloat(r.desvioObjetivoAcumulado) : null,
    desvioPercentualDia: r.desvioPercentualDia ? parseFloat(r.desvioPercentualDia) : null,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes) : null,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao) : null,
  }));
}

/**
 * Obter períodos disponíveis (mês/ano únicos) com data de última atualização
 */
export async function getPeriodosDisponiveis(): Promise<Array<{ mes: number; ano: number; label: string; ultimaAtualizacao: Date | null }>> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar períodos distintos com a data mais recente de cada período
  const periodos = await db
    .select({
      mes: resultadosMensais.mes,
      ano: resultadosMensais.ano,
      ultimaAtualizacao: sql<Date>`MAX(${resultadosMensais.updatedAt})`,
    })
    .from(resultadosMensais)
    .groupBy(resultadosMensais.mes, resultadosMensais.ano)
    .orderBy(desc(resultadosMensais.ano), desc(resultadosMensais.mes));
  
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  return periodos.map(p => ({
    mes: p.mes,
    ano: p.ano,
    label: `${meses[p.mes - 1]} ${p.ano}`,
    ultimaAtualizacao: p.ultimaAtualizacao,
  }));
}

/**
 * Comparar dois períodos
 */
export async function compararPeriodos(
  input: {
    periodo1: { mes: number; ano: number };
    periodo2: { mes: number; ano: number };
    lojaId?: number;
  },
  user: User
): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  
  // Buscar dados do período 1
  const dados1 = await getResultadosMensais(
    { mes: input.periodo1.mes, ano: input.periodo1.ano, lojaId: input.lojaId },
    user
  );
  
  // Buscar dados do período 2
  const dados2 = await getResultadosMensais(
    { mes: input.periodo2.mes, ano: input.periodo2.ano, lojaId: input.lojaId },
    user
  );
  
  // Criar mapa de lojas para comparação
  const comparacao: any[] = [];
  
  dados1.forEach(d1 => {
    const d2 = dados2.find(d => d.lojaId === d1.lojaId);
    
    if (d2) {
      comparacao.push({
        lojaId: d1.lojaId,
        lojaNome: d1.lojaNome,
        periodo1: {
          mes: d1.mes,
          ano: d1.ano,
          totalServicos: d1.totalServicos,
          objetivoMensal: d1.objetivoMensal,
          desvioPercentualMes: d1.desvioPercentualMes,
          taxaReparacao: d1.taxaReparacao,
        },
        periodo2: {
          mes: d2.mes,
          ano: d2.ano,
          totalServicos: d2.totalServicos,
          objetivoMensal: d2.objetivoMensal,
          desvioPercentualMes: d2.desvioPercentualMes,
          taxaReparacao: d2.taxaReparacao,
        },
        variacao: {
          totalServicos: d2.totalServicos && d1.totalServicos 
            ? ((d2.totalServicos - d1.totalServicos) / d1.totalServicos) * 100 
            : null,
          desvioPercentualMes: d2.desvioPercentualMes && d1.desvioPercentualMes
            ? d2.desvioPercentualMes - d1.desvioPercentualMes
            : null,
          taxaReparacao: d2.taxaReparacao && d1.taxaReparacao
            ? d2.taxaReparacao - d1.taxaReparacao
            : null,
        },
      });
    }
  });
  
  return comparacao;
}

/**
 * Obtém evolução mensal de uma loja (múltiplos meses)
 * Retorna dados ordenados por ano/mês para gráficos de linha
 */
export async function getEvolucaoMensal(lojaId: number, mesesAtras: number = 6) {
  const db = await getDb();
  if (!db) return [];
  
  const dataLimite = new Date();
  dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);
  const anoLimite = dataLimite.getFullYear();
  const mesLimite = dataLimite.getMonth() + 1;

  const resultados = await db
    .select({
      mes: resultadosMensais.mes,
      ano: resultadosMensais.ano,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
      desvioPercentualMes: resultadosMensais.desvioPercentualMes,
      taxaReparacao: resultadosMensais.taxaReparacao,
      qtdReparacoes: resultadosMensais.qtdReparacoes,
      servicosPorColaborador: resultadosMensais.servicosPorColaborador,
      numColaboradores: resultadosMensais.numColaboradores,
    })
    .from(resultadosMensais)
    .where(
      and(
        eq(resultadosMensais.lojaId, lojaId),
        or(
          gt(resultadosMensais.ano, anoLimite),
          and(
            eq(resultadosMensais.ano, anoLimite),
            gte(resultadosMensais.mes, mesLimite)
          )
        )
      )
    )
    .orderBy(resultadosMensais.ano, resultadosMensais.mes);

  return resultados.map(r => ({
    ...r,
    servicosPorColaborador: r.servicosPorColaborador ? parseFloat(r.servicosPorColaborador.toString()) : null,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) : null,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : null,
  }));
}

/**
 * Obtém ranking de lojas por uma métrica específica num período
 * @param metrica - nome do campo a ordenar (totalServicos, taxaReparacao, etc)
 * @param mes - mês (1-12)
 * @param ano - ano (2025, etc)
 * @param limit - número de lojas a retornar (default: 10)
 * @param lojasIds - opcional: filtrar apenas por estas lojas (para "Minhas Lojas")
 */
export async function getRankingLojas(
  metrica: 'totalServicos' | 'taxaReparacao' | 'desvioPercentualMes' | 'servicosPorColaborador',
  mes: number,
  ano: number,
  limit: number = 10,
  lojasIds?: number[]
) {
  const db = await getDb();
  if (!db) return [];
  
  const campo = resultadosMensais[metrica];
  
  // Construir condições de filtro
  const conditions = [
    eq(resultadosMensais.mes, mes),
    eq(resultadosMensais.ano, ano)
  ];
  
  // Se lojasIds fornecido, filtrar apenas por essas lojas
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const ranking = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: resultadosMensais.zona,
      valor: campo,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
      desvioPercentualMes: resultadosMensais.desvioPercentualMes,
      taxaReparacao: resultadosMensais.taxaReparacao,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(and(...conditions))
    .orderBy(desc(campo))
    .limit(limit);

  return ranking.map(r => ({
    ...r,
    valor: r.valor ? parseFloat(r.valor.toString()) : null,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) : null,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : null,
  }));
}

/**
 * Compara resultados de duas lojas num período específico
 */
export async function compararLojas(
  lojaId1: number,
  lojaId2: number,
  mes: number,
  ano: number
) {
  const db = await getDb();
  if (!db) return [];
  
  const resultados = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: resultadosMensais.zona,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
      desvioPercentualMes: resultadosMensais.desvioPercentualMes,
      taxaReparacao: resultadosMensais.taxaReparacao,
      qtdReparacoes: resultadosMensais.qtdReparacoes,
      servicosPorColaborador: resultadosMensais.servicosPorColaborador,
      numColaboradores: resultadosMensais.numColaboradores,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(
      and(
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano),
        or(
          eq(resultadosMensais.lojaId, lojaId1),
          eq(resultadosMensais.lojaId, lojaId2)
        )
      )
    );

  return resultados.map(r => ({
    ...r,
    servicosPorColaborador: r.servicosPorColaborador ? parseFloat(r.servicosPorColaborador.toString()) : null,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) : null,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : null,
  }));
}

/**
 * Agrega resultados por zona geográfica
 */
export async function getResultadosPorZona(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  
  const resultados = await db
    .select({
      zona: resultadosMensais.zona,
      totalLojas: sql<number>`COUNT(DISTINCT ${resultadosMensais.lojaId})`,
      somaServicos: sql<number>`SUM(${resultadosMensais.totalServicos})`,
      mediaDesvioPercentual: sql<number>`AVG(${resultadosMensais.desvioPercentualMes})`,
      mediaTaxaReparacao: sql<number>`AVG(${resultadosMensais.taxaReparacao})`,
      somaReparacoes: sql<number>`SUM(${resultadosMensais.qtdReparacoes})`,
    })
    .from(resultadosMensais)
    .where(
      and(
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano)
      )
    )
    .groupBy(resultadosMensais.zona);

  return resultados.map(r => ({
    ...r,
    mediaDesvioPercentual: r.mediaDesvioPercentual ? parseFloat(r.mediaDesvioPercentual.toString()) : null,
    mediaTaxaReparacao: r.mediaTaxaReparacao ? parseFloat(r.mediaTaxaReparacao.toString()) : null,
  }));
}

/**
 * Obtém estatísticas gerais de um período
 */
export async function getEstatisticasPeriodo(mes: number, ano: number, lojaId?: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return null;
  
  // Construir condições de filtro
  const conditions = [
    eq(resultadosMensais.mes, mes),
    eq(resultadosMensais.ano, ano)
  ];
  
  // Filtrar por loja específica ou lista de lojas
  if (lojaId) {
    conditions.push(eq(resultadosMensais.lojaId, lojaId));
  } else if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const stats = await db
    .select({
      totalLojas: sql<number>`COUNT(DISTINCT ${resultadosMensais.lojaId})`,
      somaServicos: sql<number>`SUM(${resultadosMensais.totalServicos})`,
      somaObjetivos: sql<number>`SUM(${resultadosMensais.objetivoMensal})`,
      mediaDesvioPercentual: sql<number>`AVG(${resultadosMensais.desvioPercentualMes})`,
      mediaTaxaReparacao: sql<number>`AVG(${resultadosMensais.taxaReparacao})`,
      somaReparacoes: sql<number>`SUM(${resultadosMensais.qtdReparacoes})`,
      lojasAcimaObjetivo: sql<number>`SUM(CASE WHEN ${resultadosMensais.desvioPercentualMes} >= 0 THEN 1 ELSE 0 END)`,
    })
    .from(resultadosMensais)
    .where(and(...conditions));

  const result = stats[0];
  if (!result) return null;
  
  return {
    ...result,
    mediaDesvioPercentual: result.mediaDesvioPercentual ? parseFloat(result.mediaDesvioPercentual.toString()) : null,
    mediaTaxaReparacao: result.mediaTaxaReparacao ? parseFloat(result.mediaTaxaReparacao.toString()) : null,
  };
}

/**
 * Obtém estatísticas gerais de múltiplos períodos (meses)
 * Agrega dados de todos os meses selecionados
 */
export async function getEstatisticasMultiplosMeses(
  periodos: Array<{ mes: number; ano: number }>,
  lojaId?: number,
  lojasIds?: number[]
) {
  const db = await getDb();
  if (!db) return null;
  if (periodos.length === 0) return null;
  
  // Construir condições OR para múltiplos períodos
  const periodosConditions = periodos.map(p => 
    and(
      eq(resultadosMensais.mes, p.mes),
      eq(resultadosMensais.ano, p.ano)
    )
  );
  
  const conditions: any[] = [or(...periodosConditions)];
  
  // Filtrar por loja específica ou lista de lojas
  if (lojaId) {
    conditions.push(eq(resultadosMensais.lojaId, lojaId));
  } else if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const stats = await db
    .select({
      totalLojas: sql<number>`COUNT(DISTINCT ${resultadosMensais.lojaId})`,
      somaServicos: sql<number>`SUM(${resultadosMensais.totalServicos})`,
      somaObjetivos: sql<number>`SUM(${resultadosMensais.objetivoMensal})`,
      mediaDesvioPercentual: sql<number>`AVG(${resultadosMensais.desvioPercentualMes})`,
      mediaTaxaReparacao: sql<number>`AVG(${resultadosMensais.taxaReparacao})`,
      somaReparacoes: sql<number>`SUM(${resultadosMensais.qtdReparacoes})`,
      lojasAcimaObjetivo: sql<number>`SUM(CASE WHEN ${resultadosMensais.desvioPercentualMes} >= 0 THEN 1 ELSE 0 END)`,
      totalRegistos: sql<number>`COUNT(*)`,
    })
    .from(resultadosMensais)
    .where(and(...conditions));

  const result = stats[0];
  if (!result) return null;
  
  return {
    ...result,
    mediaDesvioPercentual: result.mediaDesvioPercentual ? parseFloat(result.mediaDesvioPercentual.toString()) : null,
    mediaTaxaReparacao: result.mediaTaxaReparacao ? parseFloat(result.mediaTaxaReparacao.toString()) : null,
    periodosCount: periodos.length,
  };
}

/**
 * Obtém ranking de lojas para múltiplos períodos (meses)
 * Agrega dados de todos os meses selecionados
 */
export async function getRankingLojasMultiplosMeses(
  metrica: 'totalServicos' | 'taxaReparacao' | 'desvioPercentualMes' | 'servicosPorColaborador',
  periodos: Array<{ mes: number; ano: number }>,
  limit: number = 10,
  lojasIds?: number[]
) {
  const db = await getDb();
  if (!db) return [];
  if (periodos.length === 0) return [];
  
  // Construir condições OR para múltiplos períodos
  const periodosConditions = periodos.map(p => 
    and(
      eq(resultadosMensais.mes, p.mes),
      eq(resultadosMensais.ano, p.ano)
    )
  );
  
  const conditions: any[] = [or(...periodosConditions)];
  
  // Se lojasIds fornecido, filtrar apenas por essas lojas
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  // Para múltiplos meses, agregar por loja
  const ranking = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: sql<string>`MAX(${resultadosMensais.zona})`,
      totalServicos: sql<number>`SUM(${resultadosMensais.totalServicos})`,
      objetivoMensal: sql<number>`SUM(${resultadosMensais.objetivoMensal})`,
      desvioPercentualMes: sql<number>`AVG(${resultadosMensais.desvioPercentualMes})`,
      taxaReparacao: sql<number>`AVG(${resultadosMensais.taxaReparacao})`,
      servicosPorColaborador: sql<number>`AVG(${resultadosMensais.servicosPorColaborador})`,
      mesesCount: sql<number>`COUNT(DISTINCT CONCAT(${resultadosMensais.mes}, '-', ${resultadosMensais.ano}))`,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(and(...conditions))
    .groupBy(resultadosMensais.lojaId, lojas.nome)
    .orderBy(desc(sql`SUM(${resultadosMensais[metrica === 'totalServicos' ? 'totalServicos' : metrica === 'taxaReparacao' ? 'taxaReparacao' : metrica === 'desvioPercentualMes' ? 'desvioPercentualMes' : 'servicosPorColaborador']})`))
    .limit(limit);

  return ranking.map((r, index) => ({
    ...r,
    posicao: index + 1,
    valor: metrica === 'totalServicos' ? r.totalServicos :
           metrica === 'taxaReparacao' ? (r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : null) :
           metrica === 'desvioPercentualMes' ? (r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) : null) :
           (r.servicosPorColaborador ? parseFloat(r.servicosPorColaborador.toString()) : null),
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) : null,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : null,
    servicosPorColaborador: r.servicosPorColaborador ? parseFloat(r.servicosPorColaborador.toString()) : null,
  }));
}

/**
 * Obtém totais globais para múltiplos períodos (incluindo PROMOTOR)
 */
export async function getTotaisMensaisMultiplosMeses(periodos: Array<{ mes: number; ano: number }>) {
  const db = await getDb();
  if (!db) return null;
  if (periodos.length === 0) return null;
  
  // Construir condições OR para múltiplos períodos
  const periodosConditions = periodos.map(p => 
    and(
      eq(resultadosMensais.mes, p.mes),
      eq(resultadosMensais.ano, p.ano)
    )
  );
  
  const result = await db
    .select({
      totalServicos: sql<number>`SUM(${resultadosMensais.totalServicos})`,
      totalObjetivo: sql<number>`SUM(${resultadosMensais.objetivoMensal})`,
      totalLojas: sql<number>`COUNT(DISTINCT ${resultadosMensais.lojaId})`,
    })
    .from(resultadosMensais)
    .where(or(...periodosConditions));
  
  return result[0] || null;
}

/**
 * Obtém evolução mensal agregada de todas as lojas de um gestor
 */
export async function getEvolucaoAgregadaPorGestor(gestorId: number, mesesAtras: number = 6) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar IDs das lojas do gestor
  const lojasDoGestor = await db
    .select({ lojaId: gestorLojas.lojaId })
    .from(gestorLojas)
    .where(eq(gestorLojas.gestorId, gestorId));
  
  const lojaIds = lojasDoGestor.map(l => l.lojaId);
  
  if (lojaIds.length === 0) return [];
  
  const dataLimite = new Date();
  dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);
  const anoLimite = dataLimite.getFullYear();
  const mesLimite = dataLimite.getMonth() + 1;

  const resultados = await db
    .select({
      mes: resultadosMensais.mes,
      ano: resultadosMensais.ano,
      totalServicos: sql<number>`SUM(${resultadosMensais.totalServicos})`,
      objetivoMensal: sql<number>`SUM(${resultadosMensais.objetivoMensal})`,
      desvioPercentualMes: sql<number>`AVG(${resultadosMensais.desvioPercentualMes})`,
      taxaReparacao: sql<number>`AVG(${resultadosMensais.taxaReparacao})`,
      qtdReparacoes: sql<number>`SUM(${resultadosMensais.qtdReparacoes})`,
      servicosPorColaborador: sql<number>`AVG(${resultadosMensais.servicosPorColaborador})`,
      numColaboradores: sql<number>`SUM(${resultadosMensais.numColaboradores})`,
    })
    .from(resultadosMensais)
    .where(
      and(
        inArray(resultadosMensais.lojaId, lojaIds),
        or(
          gt(resultadosMensais.ano, anoLimite),
          and(
            eq(resultadosMensais.ano, anoLimite),
            gte(resultadosMensais.mes, mesLimite)
          )
        )
      )
    )
    .groupBy(resultadosMensais.mes, resultadosMensais.ano)
    .orderBy(resultadosMensais.ano, resultadosMensais.mes);

  return resultados.map(r => ({
    ...r,
    servicosPorColaborador: r.servicosPorColaborador ? parseFloat(r.servicosPorColaborador.toString()) : null,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) : null,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : null,
  }));
}

/**
 * Obtém totais mensais globais (incluindo PROMOTOR e outras categorias não-loja)
 */
export async function getTotaisMensais(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(totaisMensais)
    .where(
      and(
        eq(totaisMensais.mes, mes),
        eq(totaisMensais.ano, ano)
      )
    )
    .limit(1);
  
  if (result.length === 0) return null;
  
  const totais = result[0];
  return {
    ...totais,
    taxaReparacao: totais.taxaReparacao ? parseFloat(totais.taxaReparacao.toString()) : null,
  };
}


// ==================== VENDAS COMPLEMENTARES ====================

/**
 * Obtém vendas complementares de um período
 */
export async function getVendasComplementares(
  mes: number,
  ano: number,
  lojaId?: number,
  lojasIds?: number[]
) {
  const db = await getDb();
  if (!db) return [];
  
  // Construir condições de filtro
  const conditions = [
    eq(vendasComplementares.mes, mes),
    eq(vendasComplementares.ano, ano)
  ];
  
  // Filtrar por loja específica ou lista de lojas
  if (lojaId) {
    conditions.push(eq(vendasComplementares.lojaId, lojaId));
  } else if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(vendasComplementares.lojaId, lojasIds));
  }
  
  const resultados = await db
    .select({
      id: vendasComplementares.id,
      lojaId: vendasComplementares.lojaId,
      lojaNome: lojas.nome,
      mes: vendasComplementares.mes,
      ano: vendasComplementares.ano,
      totalVendas: vendasComplementares.totalVendas,
      escovasVendas: vendasComplementares.escovasVendas,
      escovasQtd: vendasComplementares.escovasQtd,
      escovasPercent: vendasComplementares.escovasPercent,
      polimentoQtd: vendasComplementares.polimentoQtd,
      polimentoVendas: vendasComplementares.polimentoVendas,
      tratamentoQtd: vendasComplementares.tratamentoQtd,
      tratamentoVendas: vendasComplementares.tratamentoVendas,
      outrosQtd: vendasComplementares.outrosQtd,
      outrosVendas: vendasComplementares.outrosVendas,
      peliculaVendas: vendasComplementares.peliculaVendas,
      lavagensTotal: vendasComplementares.lavagensTotal,
      lavagensVendas: vendasComplementares.lavagensVendas,
    })
    .from(vendasComplementares)
    .innerJoin(lojas, eq(vendasComplementares.lojaId, lojas.id))
    .where(and(...conditions));

  return resultados.map(r => ({
    ...r,
    totalVendas: r.totalVendas ? parseFloat(r.totalVendas.toString()) : null,
    escovasVendas: r.escovasVendas ? parseFloat(r.escovasVendas.toString()) : null,
    escovasPercent: r.escovasPercent ? parseFloat(r.escovasPercent.toString()) : null,
    polimentoVendas: r.polimentoVendas ? parseFloat(r.polimentoVendas.toString()) : null,
    tratamentoVendas: r.tratamentoVendas ? parseFloat(r.tratamentoVendas.toString()) : null,
    outrosVendas: r.outrosVendas ? parseFloat(r.outrosVendas.toString()) : null,
    peliculaVendas: r.peliculaVendas ? parseFloat(r.peliculaVendas.toString()) : null,
    lavagensVendas: r.lavagensVendas ? parseFloat(r.lavagensVendas.toString()) : null,
  }));
}

/**
 * Obtém estatísticas agregadas de vendas complementares
 */
export async function getEstatisticasComplementares(
  mes: number,
  ano: number,
  lojaId?: number,
  lojasIds?: number[]
) {
  const db = await getDb();
  if (!db) return null;
  
  // Construir condições de filtro
  const conditions = [
    eq(vendasComplementares.mes, mes),
    eq(vendasComplementares.ano, ano)
  ];
  
  // Filtrar por loja específica ou lista de lojas
  if (lojaId) {
    conditions.push(eq(vendasComplementares.lojaId, lojaId));
  } else if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(vendasComplementares.lojaId, lojasIds));
  }
  
  const stats = await db
    .select({
      totalLojas: sql<number>`COUNT(DISTINCT ${vendasComplementares.lojaId})`,
      lojasComVendas: sql<number>`SUM(CASE WHEN ${vendasComplementares.totalVendas} > 0 THEN 1 ELSE 0 END)`,
      somaVendas: sql<number>`SUM(${vendasComplementares.totalVendas})`,
      somaEscovas: sql<number>`SUM(${vendasComplementares.escovasVendas})`,
      somaPolimento: sql<number>`SUM(${vendasComplementares.polimentoVendas})`,
      somaTratamento: sql<number>`SUM(${vendasComplementares.tratamentoVendas})`,
      somaOutros: sql<number>`SUM(${vendasComplementares.outrosVendas})`,
      somaPeliculas: sql<number>`SUM(${vendasComplementares.peliculaVendas})`,
      somaLavagens: sql<number>`SUM(${vendasComplementares.lavagensVendas})`,
      totalEscovasQtd: sql<number>`SUM(${vendasComplementares.escovasQtd})`,
      totalPolimentoQtd: sql<number>`SUM(${vendasComplementares.polimentoQtd})`,
      totalTratamentoQtd: sql<number>`SUM(${vendasComplementares.tratamentoQtd})`,
      totalLavagensQtd: sql<number>`SUM(${vendasComplementares.lavagensTotal})`,
      mediaEscovasPercent: sql<number>`AVG(${vendasComplementares.escovasPercent})`,
      lojasComEscovas: sql<number>`SUM(CASE WHEN ${vendasComplementares.escovasPercent} >= 0.075 THEN 1 ELSE 0 END)`,
    })
    .from(vendasComplementares)
    .where(and(...conditions));

  const result = stats[0];
  if (!result) return null;
  
  return {
    totalLojas: result.totalLojas || 0,
    lojasComVendas: result.lojasComVendas || 0,
    lojasSemVendas: (result.totalLojas || 0) - (result.lojasComVendas || 0),
    somaVendas: result.somaVendas ? parseFloat(result.somaVendas.toString()) : 0,
    somaEscovas: result.somaEscovas ? parseFloat(result.somaEscovas.toString()) : 0,
    somaPolimento: result.somaPolimento ? parseFloat(result.somaPolimento.toString()) : 0,
    somaTratamento: result.somaTratamento ? parseFloat(result.somaTratamento.toString()) : 0,
    somaOutros: result.somaOutros ? parseFloat(result.somaOutros.toString()) : 0,
    somaPeliculas: result.somaPeliculas ? parseFloat(result.somaPeliculas.toString()) : 0,
    somaLavagens: result.somaLavagens ? parseFloat(result.somaLavagens.toString()) : 0,
    totalEscovasQtd: result.totalEscovasQtd || 0,
    totalPolimentoQtd: result.totalPolimentoQtd || 0,
    totalTratamentoQtd: result.totalTratamentoQtd || 0,
    totalLavagensQtd: result.totalLavagensQtd || 0,
    mediaEscovasPercent: result.mediaEscovasPercent ? parseFloat(result.mediaEscovasPercent.toString()) : 0,
    lojasComEscovas: result.lojasComEscovas || 0,
    percentLojasComEscovas: result.totalLojas ? ((result.lojasComEscovas || 0) / result.totalLojas) * 100 : 0,
  };
}

/**
 * Ranking de lojas por vendas complementares
 */
export async function getRankingComplementares(
  metrica: 'totalVendas' | 'escovasVendas' | 'escovasPercent' | 'polimentoVendas',
  mes: number,
  ano: number,
  limit: number = 10,
  lojasIds?: number[]
) {
  const db = await getDb();
  if (!db) return [];
  
  // Construir condições de filtro
  const conditions = [
    eq(vendasComplementares.mes, mes),
    eq(vendasComplementares.ano, ano)
  ];
  
  // Filtrar por lista de lojas se fornecida
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(vendasComplementares.lojaId, lojasIds));
  }
  
  // Determinar campo de ordenação
  let orderField;
  switch (metrica) {
    case 'totalVendas':
      orderField = vendasComplementares.totalVendas;
      break;
    case 'escovasVendas':
      orderField = vendasComplementares.escovasVendas;
      break;
    case 'escovasPercent':
      orderField = vendasComplementares.escovasPercent;
      break;
    case 'polimentoVendas':
      orderField = vendasComplementares.polimentoVendas;
      break;
    default:
      orderField = vendasComplementares.totalVendas;
  }
  
  const resultados = await db
    .select({
      lojaId: vendasComplementares.lojaId,
      lojaNome: lojas.nome,
      totalVendas: vendasComplementares.totalVendas,
      escovasVendas: vendasComplementares.escovasVendas,
      escovasQtd: vendasComplementares.escovasQtd,
      escovasPercent: vendasComplementares.escovasPercent,
      polimentoVendas: vendasComplementares.polimentoVendas,
      polimentoQtd: vendasComplementares.polimentoQtd,
      tratamentoVendas: vendasComplementares.tratamentoVendas,
      peliculaVendas: vendasComplementares.peliculaVendas,
    })
    .from(vendasComplementares)
    .innerJoin(lojas, eq(vendasComplementares.lojaId, lojas.id))
    .where(and(...conditions))
    .orderBy(desc(orderField))
    .limit(limit);

  return resultados.map(r => ({
    ...r,
    totalVendas: r.totalVendas ? parseFloat(r.totalVendas.toString()) : 0,
    escovasVendas: r.escovasVendas ? parseFloat(r.escovasVendas.toString()) : 0,
    escovasPercent: r.escovasPercent ? parseFloat(r.escovasPercent.toString()) : 0,
    polimentoVendas: r.polimentoVendas ? parseFloat(r.polimentoVendas.toString()) : 0,
    tratamentoVendas: r.tratamentoVendas ? parseFloat(r.tratamentoVendas.toString()) : 0,
    peliculaVendas: r.peliculaVendas ? parseFloat(r.peliculaVendas.toString()) : 0,
  }));
}

/**
 * Verifica se existem dados de vendas complementares para um período
 */
export async function temDadosComplementares(mes: number, ano: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(vendasComplementares)
    .where(
      and(
        eq(vendasComplementares.mes, mes),
        eq(vendasComplementares.ano, ano)
      )
    );
  
  return (result[0]?.count || 0) > 0;
}


// ============================================
// SISTEMA DE REUNIÕES QUINZENAIS PARA LOJAS
// ============================================

/**
 * Gera um token único para uma loja
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Cria ou obtém token de acesso para uma loja
 */
export async function getOrCreateTokenLoja(lojaId: number): Promise<TokenLoja | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Verificar se já existe token
  const existing = await db
    .select()
    .from(tokensLoja)
    .where(eq(tokensLoja.lojaId, lojaId))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Criar novo token
  const token = generateToken();
  await db.insert(tokensLoja).values({
    lojaId,
    token,
    ativo: true,
  });
  
  const newToken = await db
    .select()
    .from(tokensLoja)
    .where(eq(tokensLoja.lojaId, lojaId))
    .limit(1);
  
  return newToken[0] || null;
}

/**
 * Valida token de acesso de loja e retorna dados da loja
 */
export async function validarTokenLoja(token: string): Promise<{ loja: Loja; tokenData: TokenLoja } | null> {
  const db = await getDb();
  if (!db) return null;
  
  const tokenData = await db
    .select()
    .from(tokensLoja)
    .where(and(
      eq(tokensLoja.token, token),
      eq(tokensLoja.ativo, true)
    ))
    .limit(1);
  
  if (tokenData.length === 0) return null;
  
  // Atualizar último acesso
  await db
    .update(tokensLoja)
    .set({ ultimoAcesso: new Date() })
    .where(eq(tokensLoja.id, tokenData[0].id));
  
  // Buscar dados da loja
  const lojaData = await db
    .select()
    .from(lojas)
    .where(eq(lojas.id, tokenData[0].lojaId))
    .limit(1);
  
  if (lojaData.length === 0) return null;
  
  return { loja: lojaData[0], tokenData: tokenData[0] };
}

/**
 * Lista todos os tokens de loja (para admin)
 */
export async function listarTokensLoja(): Promise<Array<TokenLoja & { lojaNome: string; lojaEmail: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: tokensLoja.id,
      lojaId: tokensLoja.lojaId,
      token: tokensLoja.token,
      ativo: tokensLoja.ativo,
      ultimoAcesso: tokensLoja.ultimoAcesso,
      createdAt: tokensLoja.createdAt,
      updatedAt: tokensLoja.updatedAt,
      lojaNome: lojas.nome,
      lojaEmail: lojas.email,
    })
    .from(tokensLoja)
    .innerJoin(lojas, eq(tokensLoja.lojaId, lojas.id))
    .orderBy(lojas.nome);
  
  return result;
}

/**
 * Ativa/desativa token de loja
 */
export async function toggleTokenLoja(tokenId: number, ativo: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(tokensLoja)
    .set({ ativo })
    .where(eq(tokensLoja.id, tokenId));
}

/**
 * Regenera token de uma loja
 */
export async function regenerarTokenLoja(lojaId: number): Promise<TokenLoja | null> {
  const db = await getDb();
  if (!db) return null;
  
  const newToken = generateToken();
  
  await db
    .update(tokensLoja)
    .set({ token: newToken, ativo: true })
    .where(eq(tokensLoja.lojaId, lojaId));
  
  const updated = await db
    .select()
    .from(tokensLoja)
    .where(eq(tokensLoja.lojaId, lojaId))
    .limit(1);
  
  return updated[0] || null;
}

// ============================================
// PENDENTES DE LOJA (para reuniões quinzenais)
// ============================================

/**
 * Cria um pendente para uma loja (criado pelo gestor/admin)
 */
export async function criarPendenteLoja(data: InsertPendenteLoja): Promise<PendenteLoja | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(pendentesLoja).values(data);
  
  const created = await db
    .select()
    .from(pendentesLoja)
    .where(eq(pendentesLoja.lojaId, data.lojaId))
    .orderBy(desc(pendentesLoja.id))
    .limit(1);
  
  return created[0] || null;
}

/**
 * Lista pendentes de uma loja (inclui tabela antiga e nova)
 */
export async function listarPendentesLoja(lojaId: number, apenasAtivos: boolean = false): Promise<Array<{
  id: number;
  lojaId: number;
  criadoPor: number | null;
  descricao: string;
  prioridade: string;
  estado: string;
  comentarioLoja: string | null;
  dataResolucao: Date | null;
  resolvidoNaReuniaoId: number | null;
  createdAt: Date;
  updatedAt: Date;
  criadoPorNome: string | null;
  tipoRelatorio: string | null;
  relatorioId: number | null;
  origem: 'novo' | 'antigo';
}>> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar pendentes da tabela nova (pendentesLoja)
  const conditionsNova = [eq(pendentesLoja.lojaId, lojaId)];
  if (apenasAtivos) {
    conditionsNova.push(
      or(
        eq(pendentesLoja.estado, 'pendente'),
        eq(pendentesLoja.estado, 'em_progresso')
      )!
    );
  }
  
  const resultNova = await db
    .select({
      id: pendentesLoja.id,
      lojaId: pendentesLoja.lojaId,
      criadoPor: pendentesLoja.criadoPor,
      descricao: pendentesLoja.descricao,
      prioridade: pendentesLoja.prioridade,
      estado: pendentesLoja.estado,
      comentarioLoja: pendentesLoja.comentarioLoja,
      dataResolucao: pendentesLoja.dataResolucao,
      resolvidoNaReuniaoId: pendentesLoja.resolvidoNaReuniaoId,
      createdAt: pendentesLoja.createdAt,
      updatedAt: pendentesLoja.updatedAt,
      criadoPorNome: users.name,
    })
    .from(pendentesLoja)
    .leftJoin(users, eq(pendentesLoja.criadoPor, users.id))
    .where(and(...conditionsNova))
    .orderBy(desc(pendentesLoja.createdAt));
  
  // Buscar pendentes da tabela antiga (pendentes)
  const conditionsAntiga = [eq(pendentes.lojaId, lojaId)];
  if (apenasAtivos) {
    conditionsAntiga.push(eq(pendentes.resolvido, false));
  }
  
  const resultAntiga = await db
    .select({
      id: pendentes.id,
      lojaId: pendentes.lojaId,
      descricao: pendentes.descricao,
      resolvido: pendentes.resolvido,
      dataResolucao: pendentes.dataResolucao,
      createdAt: pendentes.createdAt,
      updatedAt: pendentes.updatedAt,
      tipoRelatorio: pendentes.tipoRelatorio,
      relatorioId: pendentes.relatorioId,
      dataLimite: pendentes.dataLimite,
    })
    .from(pendentes)
    .where(and(...conditionsAntiga))
    .orderBy(desc(pendentes.createdAt));
  
  // Combinar resultados
  const pendentesNovos = resultNova.map(p => ({
    ...p,
    tipoRelatorio: null,
    relatorioId: null,
    origem: 'novo' as const,
  }));
  
  const pendentesAntigos = resultAntiga.map(p => ({
    id: p.id,
    lojaId: p.lojaId,
    criadoPor: null,
    descricao: p.descricao,
    prioridade: 'media',
    estado: p.resolvido ? 'resolvido' : 'pendente',
    comentarioLoja: null,
    dataResolucao: p.dataResolucao,
    resolvidoNaReuniaoId: null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    criadoPorNome: null,
    tipoRelatorio: p.tipoRelatorio,
    relatorioId: p.relatorioId,
    origem: 'antigo' as const,
  }));
  
  // Ordenar por data de criação (mais recentes primeiro)
  return [...pendentesNovos, ...pendentesAntigos].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Atualiza estado de um pendente de loja (pela loja)
 */
export async function atualizarPendenteLoja(
  pendenteId: number,
  estado: 'pendente' | 'em_progresso' | 'resolvido',
  comentarioLoja?: string,
  reuniaoId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const updateData: Partial<PendenteLoja> = {
    estado,
    comentarioLoja,
  };
  
  if (estado === 'resolvido') {
    updateData.dataResolucao = new Date();
    if (reuniaoId) {
      updateData.resolvidoNaReuniaoId = reuniaoId;
    }
  }
  
  await db
    .update(pendentesLoja)
    .set(updateData)
    .where(eq(pendentesLoja.id, pendenteId));
}

/**
 * Conta pendentes ativos por loja (para dashboard)
 * Inclui pendentes da tabela antiga (pendentes) e da nova (pendentesLoja)
 */
export async function contarPendentesLojaAtivos(lojaId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Contar pendentes da tabela nova (pendentesLoja)
  const resultNova = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(pendentesLoja)
    .where(and(
      eq(pendentesLoja.lojaId, lojaId),
      or(
        eq(pendentesLoja.estado, 'pendente'),
        eq(pendentesLoja.estado, 'em_progresso')
      )
    ));
  
  // Contar pendentes da tabela antiga (pendentes) - não resolvidos
  const resultAntiga = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(pendentes)
    .where(and(
      eq(pendentes.lojaId, lojaId),
      eq(pendentes.resolvido, false)
    ));
  
  return (resultNova[0]?.count || 0) + (resultAntiga[0]?.count || 0);
}

// ============================================
// REUNIÕES QUINZENAIS
// ============================================

/**
 * Cria uma nova reunião quinzenal
 */
export async function criarReuniaoQuinzenal(data: InsertReuniaoQuinzenal): Promise<ReuniaoQuinzenal | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(reunioesQuinzenais).values(data);
  
  const created = await db
    .select()
    .from(reunioesQuinzenais)
    .where(eq(reunioesQuinzenais.lojaId, data.lojaId))
    .orderBy(desc(reunioesQuinzenais.id))
    .limit(1);
  
  return created[0] || null;
}

/**
 * Atualiza uma reunião quinzenal
 */
export async function atualizarReuniaoQuinzenal(
  reuniaoId: number,
  data: Partial<InsertReuniaoQuinzenal>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(reunioesQuinzenais)
    .set(data)
    .where(eq(reunioesQuinzenais.id, reuniaoId));
}

/**
 * Obtém uma reunião quinzenal por ID
 */
export async function getReuniaoQuinzenal(reuniaoId: number): Promise<ReuniaoQuinzenal | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(reunioesQuinzenais)
    .where(eq(reunioesQuinzenais.id, reuniaoId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Lista reuniões quinzenais de uma loja
 */
export async function listarReunioesQuinzenaisLoja(lojaId: number): Promise<ReuniaoQuinzenal[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(reunioesQuinzenais)
    .where(eq(reunioesQuinzenais.lojaId, lojaId))
    .orderBy(desc(reunioesQuinzenais.dataReuniao));
}

/**
 * Lista todas as reuniões quinzenais (para admin/gestor)
 */
export async function listarTodasReunioesQuinzenais(
  lojasIds?: number[],
  estado?: 'rascunho' | 'concluida' | 'enviada'
): Promise<Array<ReuniaoQuinzenal & { lojaNome: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(reunioesQuinzenais.lojaId, lojasIds));
  }
  
  if (estado) {
    conditions.push(eq(reunioesQuinzenais.estado, estado));
  }
  
  const result = await db
    .select({
      id: reunioesQuinzenais.id,
      lojaId: reunioesQuinzenais.lojaId,
      dataReuniao: reunioesQuinzenais.dataReuniao,
      participantes: reunioesQuinzenais.participantes,
      temasDiscutidos: reunioesQuinzenais.temasDiscutidos,
      decisoesTomadas: reunioesQuinzenais.decisoesTomadas,
      observacoes: reunioesQuinzenais.observacoes,
      analiseResultados: reunioesQuinzenais.analiseResultados,
      planosAcao: reunioesQuinzenais.planosAcao,
      estado: reunioesQuinzenais.estado,
      dataEnvio: reunioesQuinzenais.dataEnvio,
      emailEnviadoPara: reunioesQuinzenais.emailEnviadoPara,
      feedbackGestor: reunioesQuinzenais.feedbackGestor,
      dataFeedback: reunioesQuinzenais.dataFeedback,
      createdAt: reunioesQuinzenais.createdAt,
      updatedAt: reunioesQuinzenais.updatedAt,
      lojaNome: lojas.nome,
    })
    .from(reunioesQuinzenais)
    .innerJoin(lojas, eq(reunioesQuinzenais.lojaId, lojas.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reunioesQuinzenais.dataReuniao));
  
  return result;
}

/**
 * Obtém a última reunião quinzenal de uma loja
 */
export async function getUltimaReuniaoQuinzenal(lojaId: number): Promise<ReuniaoQuinzenal | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(reunioesQuinzenais)
    .where(eq(reunioesQuinzenais.lojaId, lojaId))
    .orderBy(desc(reunioesQuinzenais.dataReuniao))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Verifica lojas sem reunião há mais de X dias
 */
export async function getLojasAtrasadasReuniao(diasLimite: number = 15): Promise<Array<{ loja: Loja; ultimaReuniao: Date | null; diasSemReuniao: number }>> {
  const db = await getDb();
  if (!db) return [];
  
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasLimite);
  
  // Buscar todas as lojas
  const todasLojas = await db.select().from(lojas);
  
  const resultado = [];
  
  for (const loja of todasLojas) {
    const ultimaReuniao = await getUltimaReuniaoQuinzenal(loja.id);
    
    const diasSemReuniao = ultimaReuniao
      ? Math.floor((Date.now() - new Date(ultimaReuniao.dataReuniao).getTime()) / (1000 * 60 * 60 * 24))
      : 999; // Se nunca teve reunião
    
    if (diasSemReuniao > diasLimite) {
      resultado.push({
        loja,
        ultimaReuniao: ultimaReuniao?.dataReuniao || null,
        diasSemReuniao,
      });
    }
  }
  
  return resultado.sort((a, b) => b.diasSemReuniao - a.diasSemReuniao);
}

/**
 * Adiciona feedback do gestor a uma reunião
 */
export async function adicionarFeedbackReuniao(
  reuniaoId: number,
  feedback: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(reunioesQuinzenais)
    .set({
      feedbackGestor: feedback,
      dataFeedback: new Date(),
    })
    .where(eq(reunioesQuinzenais.id, reuniaoId));
}

/**
 * Obtém o gestor responsável por uma loja
 */
export async function getGestorDaLoja(lojaId: number): Promise<{ gestorId: number; userId: number; nome: string | null; email: string | null } | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      gestorId: gestores.id,
      userId: gestores.userId,
      nome: users.name,
      email: users.email,
    })
    .from(gestorLojas)
    .innerJoin(gestores, eq(gestorLojas.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(gestorLojas.lojaId, lojaId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Marca reunião como enviada
 */
export async function marcarReuniaoEnviada(
  reuniaoId: number,
  emailGestor: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(reunioesQuinzenais)
    .set({
      estado: 'enviada',
      dataEnvio: new Date(),
      emailEnviadoPara: emailGestor,
    })
    .where(eq(reunioesQuinzenais.id, reuniaoId));
}

/**
 * Estatísticas de reuniões quinzenais (para dashboard admin)
 */
export async function getEstatisticasReunioesQuinzenais(): Promise<{
  totalReunioesEsteMes: number;
  lojasComReuniao: number;
  lojasSemReuniao: number;
  mediaParticipantes: number;
  reunioesPendentes: number;
}> {
  const db = await getDb();
  if (!db) return {
    totalReunioesEsteMes: 0,
    lojasComReuniao: 0,
    lojasSemReuniao: 0,
    mediaParticipantes: 0,
    reunioesPendentes: 0,
  };
  
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  
  // Total de reuniões este mês
  const reunioesMes = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reunioesQuinzenais)
    .where(gte(reunioesQuinzenais.dataReuniao, inicioMes));
  
  // Lojas distintas com reunião este mês
  const lojasComReuniao = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${reunioesQuinzenais.lojaId})` })
    .from(reunioesQuinzenais)
    .where(gte(reunioesQuinzenais.dataReuniao, inicioMes));
  
  // Total de lojas
  const totalLojas = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(lojas);
  
  // Reuniões em rascunho (pendentes de conclusão)
  const reunioesPendentes = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reunioesQuinzenais)
    .where(eq(reunioesQuinzenais.estado, 'rascunho'));
  
  return {
    totalReunioesEsteMes: reunioesMes[0]?.count || 0,
    lojasComReuniao: lojasComReuniao[0]?.count || 0,
    lojasSemReuniao: (totalLojas[0]?.count || 0) - (lojasComReuniao[0]?.count || 0),
    mediaParticipantes: 0, // TODO: calcular média
    reunioesPendentes: reunioesPendentes[0]?.count || 0,
  };
}


/**
 * Lista tokens de loja para um gestor específico (apenas das suas lojas)
 */
export async function listarTokensLojaByGestor(gestorId: number): Promise<Array<TokenLoja & { lojaNome: string; lojaEmail: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar lojas do gestor
  const lojasGestor = await getLojasByGestorId(gestorId);
  if (lojasGestor.length === 0) return [];
  
  const lojaIds = lojasGestor.map(l => l.id);
  
  const result = await db
    .select({
      id: tokensLoja.id,
      lojaId: tokensLoja.lojaId,
      token: tokensLoja.token,
      ativo: tokensLoja.ativo,
      ultimoAcesso: tokensLoja.ultimoAcesso,
      createdAt: tokensLoja.createdAt,
      updatedAt: tokensLoja.updatedAt,
      lojaNome: lojas.nome,
      lojaEmail: lojas.email,
    })
    .from(tokensLoja)
    .innerJoin(lojas, eq(tokensLoja.lojaId, lojas.id))
    .where(inArray(tokensLoja.lojaId, lojaIds))
    .orderBy(lojas.nome);
  
  return result;
}


// ============================================
// TO-DO CATEGORIES
// ============================================

/**
 * Criar categoria de To-Do
 */
export async function createTodoCategory(data: InsertTodoCategory): Promise<TodoCategory | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(todoCategories).values(data);
  
  const created = await db
    .select()
    .from(todoCategories)
    .orderBy(desc(todoCategories.id))
    .limit(1);
  
  return created[0] || null;
}

/**
 * Listar todas as categorias de To-Do
 */
export async function getAllTodoCategories(apenasAtivas: boolean = true): Promise<TodoCategory[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (apenasAtivas) {
    return await db
      .select()
      .from(todoCategories)
      .where(eq(todoCategories.ativo, true))
      .orderBy(todoCategories.nome);
  }
  
  return await db
    .select()
    .from(todoCategories)
    .orderBy(todoCategories.nome);
}

/**
 * Atualizar categoria de To-Do
 */
export async function updateTodoCategory(id: number, data: Partial<InsertTodoCategory>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(todoCategories)
    .set(data)
    .where(eq(todoCategories.id, id));
}

/**
 * Eliminar categoria de To-Do (soft delete - desativar)
 */
export async function deleteTodoCategory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(todoCategories)
    .set({ ativo: false })
    .where(eq(todoCategories.id, id));
}

// ============================================
// TO-DO
// ============================================

/**
 * Criar To-Do
 */
export async function createTodo(data: InsertTodo): Promise<Todo | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(todos).values(data);
  
  const created = await db
    .select()
    .from(todos)
    .orderBy(desc(todos.id))
    .limit(1);
  
  return created[0] || null;
}

/**
 * Obter To-Do por ID
 */
export async function getTodoById(id: number): Promise<Todo | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(todos)
    .where(eq(todos.id, id))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Listar todos os To-Dos com filtros
 * @param filtros - Filtros de pesquisa
 * @param userContext - Contexto do utilizador (para filtrar visibilidade)
 */
export async function getAllTodos(filtros?: {
  lojaId?: number;
  userId?: number;
  estado?: string;
  categoriaId?: number;
  prioridade?: string;
  criadoPorId?: number;
}, userContext?: {
  userId: number;
  role: string;
  gestorId?: number;
  lojasIds?: number[];
}): Promise<Array<Todo & { 
  lojaNome: string | null; 
  atribuidoUserNome: string | null;
  criadoPorNome: string | null;
  categoriaNome: string | null;
  categoriaCor: string | null;
  visto: boolean;
  vistoEm: Date | null;
  vistoGestor: boolean;
  vistoGestorEm: Date | null;
  paraMim: boolean;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [];
  
  if (filtros?.lojaId) {
    conditions.push(eq(todos.atribuidoLojaId, filtros.lojaId));
  }
  if (filtros?.userId) {
    conditions.push(eq(todos.atribuidoUserId, filtros.userId));
  }
  if (filtros?.estado) {
    conditions.push(eq(todos.estado, filtros.estado as any));
  }
  if (filtros?.categoriaId) {
    conditions.push(eq(todos.categoriaId, filtros.categoriaId));
  }
  if (filtros?.prioridade) {
    conditions.push(eq(todos.prioridade, filtros.prioridade as any));
  }
  if (filtros?.criadoPorId) {
    conditions.push(eq(todos.criadoPorId, filtros.criadoPorId));
  }
  
  // FILTRO DE VISIBILIDADE:
  // Admin NÃO vê tarefas entre loja e gestor (criadoPorLojaId preenchido)
  // Gestor vê apenas tarefas das suas lojas ou criadas por ele ou atribuídas a ele
  if (userContext) {
    if (userContext.role === 'admin') {
      // Admin não vê tarefas criadas por lojas (comunicação loja<->gestor)
      conditions.push(isNull(todos.criadoPorLojaId));
    } else if (userContext.role === 'gestor' && userContext.lojasIds && userContext.lojasIds.length > 0) {
      // Gestor vê:
      // 1. Tarefas criadas por ele
      // 2. Tarefas atribuídas a ele
      // 3. Tarefas das suas lojas (criadas pela loja ou atribuídas à loja)
      conditions.push(
        or(
          eq(todos.criadoPorId, userContext.userId),
          eq(todos.atribuidoUserId, userContext.userId),
          inArray(todos.atribuidoLojaId, userContext.lojasIds),
          inArray(todos.criadoPorLojaId, userContext.lojasIds)
        )
      );
    }
  }
  
  const result = await db
    .select({
      id: todos.id,
      titulo: todos.titulo,
      descricao: todos.descricao,
      categoriaId: todos.categoriaId,
      prioridade: todos.prioridade,
      atribuidoLojaId: todos.atribuidoLojaId,
      atribuidoUserId: todos.atribuidoUserId,
      criadoPorId: todos.criadoPorId,
      criadoPorLojaId: todos.criadoPorLojaId,
      estado: todos.estado,
      comentario: todos.comentario,
      respostaLoja: todos.respostaLoja,
      historicoAtribuicoes: todos.historicoAtribuicoes,
      dataLimite: todos.dataLimite,
      dataConclusao: todos.dataConclusao,
      visto: todos.visto,
      vistoEm: todos.vistoEm,
      vistoGestor: todos.vistoGestor,
      vistoGestorEm: todos.vistoGestorEm,
      isInterna: todos.isInterna,
      anexos: todos.anexos,
      createdAt: todos.createdAt,
      updatedAt: todos.updatedAt,
      lojaNome: lojas.nome,
      atribuidoUserNome: sql<string | null>`(SELECT name FROM users WHERE id = ${todos.atribuidoUserId})`,
      criadoPorNome: sql<string | null>`COALESCE(
        (SELECT nome FROM lojas WHERE id = ${todos.criadoPorLojaId}),
        (SELECT name FROM users WHERE id = ${todos.criadoPorId})
      )`,
      categoriaNome: todoCategories.nome,
      categoriaCor: todoCategories.cor,
    })
    .from(todos)
    .leftJoin(lojas, eq(todos.atribuidoLojaId, lojas.id))
    .leftJoin(todoCategories, eq(todos.categoriaId, todoCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(todos.createdAt));
  
  // Calcular campo "paraMim" para cada tarefa
  return result.map(todo => {
    let paraMim = false;
    if (userContext) {
      // É para mim se:
      // 1. Atribuído diretamente a mim (user)
      // 2. Atribuído a uma das minhas lojas E criado por uma loja (comunicação loja->gestor)
      if (todo.atribuidoUserId === userContext.userId) {
        paraMim = true;
      } else if (userContext.lojasIds && todo.atribuidoLojaId && userContext.lojasIds.includes(todo.atribuidoLojaId) && todo.criadoPorLojaId !== null) {
        paraMim = true;
      }
    }
    return {
      ...todo,
      paraMim
    };
  });
}

/**
 * Listar To-Dos de uma loja específica (para Portal da Loja)
 */
export async function getTodosByLojaId(lojaId: number, apenasAtivos: boolean = true): Promise<Array<Todo & {
  criadoPorNome: string | null;
  categoriaNome: string | null;
  categoriaCor: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(todos.atribuidoLojaId, lojaId)];
  
  if (apenasAtivos) {
    conditions.push(
      or(
        eq(todos.estado, 'pendente'),
        eq(todos.estado, 'em_progresso')
      )!
    );
  }
  
  const result = await db
    .select({
      id: todos.id,
      titulo: todos.titulo,
      descricao: todos.descricao,
      categoriaId: todos.categoriaId,
      prioridade: todos.prioridade,
      atribuidoLojaId: todos.atribuidoLojaId,
      atribuidoUserId: todos.atribuidoUserId,
      criadoPorId: todos.criadoPorId,
      criadoPorLojaId: todos.criadoPorLojaId,
      estado: todos.estado,
      comentario: todos.comentario,
      respostaLoja: todos.respostaLoja,
      historicoAtribuicoes: todos.historicoAtribuicoes,
      dataLimite: todos.dataLimite,
      dataConclusao: todos.dataConclusao,
      visto: todos.visto,
      vistoEm: todos.vistoEm,
      vistoGestor: todos.vistoGestor,
      vistoGestorEm: todos.vistoGestorEm,
      isInterna: todos.isInterna,
      anexos: todos.anexos,
      createdAt: todos.createdAt,
      updatedAt: todos.updatedAt,
      criadoPorNome: sql<string | null>`COALESCE(
        (SELECT nome FROM lojas WHERE id = ${todos.criadoPorLojaId}),
        (SELECT name FROM users WHERE id = ${todos.criadoPorId})
      )`,
      categoriaNome: todoCategories.nome,
      categoriaCor: todoCategories.cor,
    })
    .from(todos)
    .leftJoin(todoCategories, eq(todos.categoriaId, todoCategories.id))
    .where(and(...conditions, eq(todos.isInterna, false)))
    .orderBy(
      sql`FIELD(${todos.prioridade}, 'urgente', 'alta', 'media', 'baixa')`,
      desc(todos.createdAt)
    );
  
  return result;
}

/**
 * Atualizar To-Do
 */
export async function updateTodo(id: number, data: Partial<InsertTodo>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(todos)
    .set(data)
    .where(eq(todos.id, id));
}

/**
 * Marcar To-Do como concluído
 */
export async function concluirTodo(id: number, comentario?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(todos)
    .set({
      estado: 'concluida',
      dataConclusao: new Date(),
      comentario: comentario || null,
    })
    .where(eq(todos.id, id));
}

/**
 * Devolver To-Do ao criador (pela loja)
 */
export async function devolverTodo(id: number, comentario: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Buscar todo atual para obter histórico
  const todoAtual = await getTodoById(id);
  if (!todoAtual) return;
  
  // Adicionar ao histórico de atribuições
  const historicoAtual = todoAtual.historicoAtribuicoes 
    ? JSON.parse(todoAtual.historicoAtribuicoes) 
    : [];
  
  historicoAtual.push({
    de: todoAtual.atribuidoLojaId ? `loja:${todoAtual.atribuidoLojaId}` : `user:${todoAtual.atribuidoUserId}`,
    para: `user:${todoAtual.criadoPorId}`,
    data: new Date().toISOString(),
    motivo: comentario,
  });
  
  await db
    .update(todos)
    .set({
      estado: 'devolvida',
      comentario,
      historicoAtribuicoes: JSON.stringify(historicoAtual),
      // Reatribuir ao criador
      atribuidoUserId: todoAtual.criadoPorId,
      atribuidoLojaId: null,
    })
    .where(eq(todos.id, id));
}

/**
 * Reatribuir To-Do
 */
export async function reatribuirTodo(
  id: number, 
  novaAtribuicao: { lojaId?: number; userId?: number },
  motivo?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Buscar todo atual para obter histórico
  const todoAtual = await getTodoById(id);
  if (!todoAtual) return;
  
  // Adicionar ao histórico de atribuições
  const historicoAtual = todoAtual.historicoAtribuicoes 
    ? JSON.parse(todoAtual.historicoAtribuicoes) 
    : [];
  
  historicoAtual.push({
    de: todoAtual.atribuidoLojaId ? `loja:${todoAtual.atribuidoLojaId}` : `user:${todoAtual.atribuidoUserId}`,
    para: novaAtribuicao.lojaId ? `loja:${novaAtribuicao.lojaId}` : `user:${novaAtribuicao.userId}`,
    data: new Date().toISOString(),
    motivo: motivo || 'Reatribuição',
  });
  
  await db
    .update(todos)
    .set({
      estado: 'pendente',
      atribuidoLojaId: novaAtribuicao.lojaId || null,
      atribuidoUserId: novaAtribuicao.userId || null,
      historicoAtribuicoes: JSON.stringify(historicoAtual),
    })
    .where(eq(todos.id, id));
}

/**
 * Eliminar To-Do
 */
export async function deleteTodo(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .delete(todos)
    .where(eq(todos.id, id));
}

/**
 * Contar To-Dos ativos por loja (para dashboard do Portal)
 */
export async function contarTodosLojaAtivos(lojaId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(
      eq(todos.atribuidoLojaId, lojaId),
      or(
        eq(todos.estado, 'pendente'),
        eq(todos.estado, 'em_progresso')
      )
    ));
  
  return result[0]?.count || 0;
}

/**
 * Contar To-Dos NÃO VISTOS pela loja (para alerta/badge)
 * Conta tarefas atribuídas à loja que ainda não foram vistas
 */
export async function contarTodosLojaNaoVistos(lojaId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(
      eq(todos.atribuidoLojaId, lojaId),
      eq(todos.visto, false),
      or(
        eq(todos.estado, 'pendente'),
        eq(todos.estado, 'em_progresso')
      )
    ));
  
  return result[0]?.count || 0;
}

/**
 * Marcar múltiplos To-Dos como vistos pela loja
 */
export async function marcarMultiplosTodosComoVistoLoja(ids: number[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  for (const id of ids) {
    await db
      .update(todos)
      .set({
        visto: true,
        vistoEm: new Date(),
      })
      .where(eq(todos.id, id));
  }
}

/**
 * Contar To-Dos por estado (para estatísticas)
 */
export async function contarTodosPorEstado(): Promise<{
  pendentes: number;
  emProgresso: number;
  concluidos: number;
  devolvidos: number;
}> {
  const db = await getDb();
  if (!db) return { pendentes: 0, emProgresso: 0, concluidos: 0, devolvidos: 0 };
  
  const result = await db
    .select({
      estado: todos.estado,
      count: sql<number>`COUNT(*)`,
    })
    .from(todos)
    .groupBy(todos.estado);
  
  const stats = { pendentes: 0, emProgresso: 0, concluidos: 0, devolvidos: 0 };
  
  for (const row of result) {
    if (row.estado === 'pendente') stats.pendentes = row.count;
    if (row.estado === 'em_progresso') stats.emProgresso = row.count;
    if (row.estado === 'concluida') stats.concluidos = row.count;
    if (row.estado === 'devolvida') stats.devolvidos = row.count;
  }
  
  return stats;
}


/**
 * Marcar To-Do como visto (pela loja)
 * Também marca vistoGestor como true para garantir consistência
 */
export async function marcarTodoComoVisto(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(todos)
    .set({
      visto: true,
      vistoEm: new Date(),
      vistoGestor: true,
      vistoGestorEm: new Date(),
    })
    .where(eq(todos.id, id));
}

/**
 * Marcar To-Do como visto pelo gestor
 * Usado para controlar a animação do botão "Minhas Tarefas"
 */
export async function marcarTodoComoVistoGestor(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(todos)
    .set({
      vistoGestor: true,
      vistoGestorEm: new Date(),
    })
    .where(eq(todos.id, id));
}

/**
 * Marcar múltiplos To-Dos como vistos pelo gestor
 */
export async function marcarMultiplosTodosComoVistoGestor(ids: number[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  for (const id of ids) {
    await db
      .update(todos)
      .set({
        vistoGestor: true,
        vistoGestorEm: new Date(),
      })
      .where(eq(todos.id, id));
  }
}

/**
 * Contar To-Dos não vistos para um utilizador
 * @param userId - ID do utilizador
 * @param role - Role do utilizador (admin/gestor)
 * @param lojasIds - IDs das lojas do gestor (se aplicável)
 */
export async function countTodosNaoVistos(
  userId: number, 
  role: string, 
  lojasIds: number[] = []
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const conditions: any[] = [
    eq(todos.visto, false),
  ];
  
  // Filtrar por visibilidade
  if (role === 'admin') {
    // Admin não vê tarefas criadas por lojas
    conditions.push(isNull(todos.criadoPorLojaId));
  } else if (role === 'gestor' && lojasIds.length > 0) {
    // Gestor vê apenas tarefas destinadas a ele ou às suas lojas
    conditions.push(
      or(
        eq(todos.atribuidoUserId, userId),
        inArray(todos.atribuidoLojaId, lojasIds)
      )
    );
  }
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(...conditions));
  
  return result[0]?.count || 0;
}


/**
 * Conta tarefas pendentes criadas por LOJAS atribuídas ao utilizador
 * Conta tarefas que foram criadas pelas lojas (criadoPorLojaId IS NOT NULL)
 * Inclui tarefas pendentes e em progresso
 * @param userId - ID do utilizador
 * @returns Número de tarefas criadas por lojas atribuídas ao utilizador
 */
export async function countTodosPendentesAtribuidosAMim(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(
      eq(todos.atribuidoUserId, userId),
      // Só conta tarefas criadas por lojas (não pelo próprio gestor)
      sql`${todos.criadoPorLojaId} IS NOT NULL`,
      // Apenas tarefas pendentes ou em progresso
      or(
        eq(todos.estado, 'pendente'),
        eq(todos.estado, 'em_progresso')
      )
    ));
  
  return result[0]?.count || 0;
}


/**
 * Conta TODAS as tarefas pendentes criadas por lojas (para admin)
 * @returns Número total de tarefas criadas por lojas que estão pendentes ou em progresso
 */
export async function countTodosCriadosPorLojas(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(
      // Só conta tarefas criadas por lojas
      sql`${todos.criadoPorLojaId} IS NOT NULL`,
      // Apenas tarefas pendentes ou em progresso
      or(
        eq(todos.estado, 'pendente'),
        eq(todos.estado, 'em_progresso')
      )
    ));
  
  return result[0]?.count || 0;
}


/**
 * Conta tarefas NÃO VISTAS pelo gestor (para animação pulse)
 * @param userId - ID do utilizador
 * @returns Número de tarefas não vistas pelo gestor
 */
export async function countTodosNaoVistosGestor(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(
      eq(todos.atribuidoUserId, userId),
      // Só conta tarefas criadas por lojas (não pelo próprio gestor)
      sql`${todos.criadoPorLojaId} IS NOT NULL`,
      // Apenas tarefas pendentes ou em progresso
      or(
        eq(todos.estado, 'pendente'),
        eq(todos.estado, 'em_progresso')
      ),
      // Apenas tarefas NÃO vistas pelo gestor
      eq(todos.vistoGestor, false)
    ));
  
  return result[0]?.count || 0;
}

/**
 * Conta TODAS as tarefas NÃO VISTAS criadas por lojas (para admin)
 * @returns Número total de tarefas criadas por lojas que não foram vistas
 */
export async function countTodosNaoVistosCriadosPorLojas(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todos)
    .where(and(
      // Só conta tarefas criadas por lojas
      sql`${todos.criadoPorLojaId} IS NOT NULL`,
      // Apenas tarefas pendentes ou em progresso
      or(
        eq(todos.estado, 'pendente'),
        eq(todos.estado, 'em_progresso')
      ),
      // Apenas tarefas NÃO vistas
      eq(todos.vistoGestor, false)
    ));
  
  return result[0]?.count || 0;
}

/**
 * Listar tarefas enviadas pela loja ao gestor (histórico)
 */
export async function getTodosEnviadosPelaLoja(lojaId: number): Promise<Array<Todo & {
  criadoPorNome: string | null;
  categoriaNome: string | null;
  categoriaCor: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: todos.id,
      titulo: todos.titulo,
      descricao: todos.descricao,
      categoriaId: todos.categoriaId,
      prioridade: todos.prioridade,
      atribuidoLojaId: todos.atribuidoLojaId,
      atribuidoUserId: todos.atribuidoUserId,
      criadoPorId: todos.criadoPorId,
      criadoPorLojaId: todos.criadoPorLojaId,
      estado: todos.estado,
      comentario: todos.comentario,
      respostaLoja: todos.respostaLoja,
      historicoAtribuicoes: todos.historicoAtribuicoes,
      dataLimite: todos.dataLimite,
      dataConclusao: todos.dataConclusao,
      visto: todos.visto,
      vistoEm: todos.vistoEm,
      vistoGestor: todos.vistoGestor,
      vistoGestorEm: todos.vistoGestorEm,
      isInterna: todos.isInterna,
      anexos: todos.anexos,
      createdAt: todos.createdAt,
      updatedAt: todos.updatedAt,
      criadoPorNome: sql<string | null>`(SELECT nome FROM lojas WHERE id = ${lojaId})`,
      categoriaNome: todoCategories.nome,
      categoriaCor: todoCategories.cor,
    })
    .from(todos)
    .leftJoin(todoCategories, eq(todos.categoriaId, todoCategories.id))
    .where(and(
      eq(todos.criadoPorLojaId, lojaId),
      eq(todos.isInterna, false) // Apenas tarefas enviadas ao gestor (não internas)
    ))
    .orderBy(desc(todos.createdAt));
  
  return result;
}

/**
 * Listar tarefas internas da loja
 */
export async function getTodosInternosDaLoja(lojaId: number, apenasAtivos: boolean = true): Promise<Array<Todo & {
  criadoPorNome: string | null;
  categoriaNome: string | null;
  categoriaCor: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(todos.criadoPorLojaId, lojaId),
    eq(todos.isInterna, true)
  ];
  
  if (apenasAtivos) {
    conditions.push(
      or(
        eq(todos.estado, 'pendente'),
        eq(todos.estado, 'em_progresso')
      )!
    );
  }
  
  const result = await db
    .select({
      id: todos.id,
      titulo: todos.titulo,
      descricao: todos.descricao,
      categoriaId: todos.categoriaId,
      prioridade: todos.prioridade,
      atribuidoLojaId: todos.atribuidoLojaId,
      atribuidoUserId: todos.atribuidoUserId,
      criadoPorId: todos.criadoPorId,
      criadoPorLojaId: todos.criadoPorLojaId,
      estado: todos.estado,
      comentario: todos.comentario,
      respostaLoja: todos.respostaLoja,
      historicoAtribuicoes: todos.historicoAtribuicoes,
      dataLimite: todos.dataLimite,
      dataConclusao: todos.dataConclusao,
      visto: todos.visto,
      vistoEm: todos.vistoEm,
      vistoGestor: todos.vistoGestor,
      vistoGestorEm: todos.vistoGestorEm,
      isInterna: todos.isInterna,
      anexos: todos.anexos,
      createdAt: todos.createdAt,
      updatedAt: todos.updatedAt,
      criadoPorNome: sql<string | null>`(SELECT nome FROM lojas WHERE id = ${lojaId})`,
      categoriaNome: todoCategories.nome,
      categoriaCor: todoCategories.cor,
    })
    .from(todos)
    .leftJoin(todoCategories, eq(todos.categoriaId, todoCategories.id))
    .where(and(...conditions))
    .orderBy(
      sql`FIELD(${todos.prioridade}, 'urgente', 'alta', 'media', 'baixa')`,
      desc(todos.createdAt)
    );
  
  return result;
}

// ==================== OCORRÊNCIAS ESTRUTURAIS ====================

import { 
  temasOcorrencias, 
  TemaOcorrencia, 
  InsertTemaOcorrencia,
  ocorrenciasEstruturais,
  OcorrenciaEstrutural,
  InsertOcorrenciaEstrutural
} from "../drizzle/schema";

/**
 * Busca todos os temas de ocorrências para autocomplete
 * Ordenados por frequência de uso (mais usados primeiro)
 */
export async function getAllTemasOcorrencias(): Promise<TemaOcorrencia[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(temasOcorrencias)
    .orderBy(desc(temasOcorrencias.usageCount));
}

/**
 * Busca temas que começam com o texto fornecido (para autocomplete)
 */
export async function searchTemasOcorrencias(texto: string): Promise<TemaOcorrencia[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(temasOcorrencias)
    .where(sql`LOWER(${temasOcorrencias.nome}) LIKE LOWER(${texto + '%'})`)
    .orderBy(desc(temasOcorrencias.usageCount))
    .limit(10);
}

/**
 * Cria um novo tema de ocorrência ou retorna o existente
 * Se já existir, incrementa o contador de uso
 */
export async function getOrCreateTemaOcorrencia(nome: string, criadoPorId: number): Promise<TemaOcorrencia> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const nomeNormalizado = nome.trim();
  
  // Verificar se já existe (case insensitive)
  const existente = await db
    .select()
    .from(temasOcorrencias)
    .where(sql`LOWER(${temasOcorrencias.nome}) = LOWER(${nomeNormalizado})`)
    .limit(1);
  
  if (existente.length > 0) {
    // Incrementar contador de uso
    await db
      .update(temasOcorrencias)
      .set({ usageCount: sql`${temasOcorrencias.usageCount} + 1` })
      .where(eq(temasOcorrencias.id, existente[0].id));
    
    return existente[0];
  }
  
  // Criar novo tema
  const result = await db
    .insert(temasOcorrencias)
    .values({
      nome: nomeNormalizado,
      criadoPorId,
      usageCount: 1
    });
  
  const insertId = result[0]?.insertId;
  if (!insertId) throw new Error('Erro ao criar tema de ocorrência');
  
  const novoTema = await db
    .select()
    .from(temasOcorrencias)
    .where(eq(temasOcorrencias.id, insertId))
    .limit(1);
  
  return novoTema[0];
}

/**
 * Cria uma nova ocorrência estrutural
 */
export async function createOcorrenciaEstrutural(data: {
  gestorId: number | null;
  temaId: number;
  descricao: string;
  abrangencia: 'nacional' | 'regional' | 'zona';
  zonaAfetada?: string;
  lojasAfetadas?: number[];
  impacto: 'baixo' | 'medio' | 'alto' | 'critico';
  fotos?: string[];
  sugestaoAcao?: string;
}): Promise<OcorrenciaEstrutural> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result = await db
    .insert(ocorrenciasEstruturais)
    .values({
      gestorId: data.gestorId,
      temaId: data.temaId,
      descricao: data.descricao,
      abrangencia: data.abrangencia,
      zonaAfetada: data.zonaAfetada || null,
      lojasAfetadas: data.lojasAfetadas ? JSON.stringify(data.lojasAfetadas) : null,
      impacto: data.impacto,
      fotos: data.fotos ? JSON.stringify(data.fotos) : null,
      sugestaoAcao: data.sugestaoAcao || null,
      estado: 'reportado'
    });
  
  const insertId = result[0]?.insertId;
  if (!insertId) throw new Error('Erro ao criar ocorrência estrutural');
  
  const novaOcorrencia = await db
    .select()
    .from(ocorrenciasEstruturais)
    .where(eq(ocorrenciasEstruturais.id, insertId))
    .limit(1);
  
  return novaOcorrencia[0];
}

/**
 * Busca todas as ocorrências estruturais com informações do tema e gestor
 */
export async function getAllOcorrenciasEstruturais(): Promise<Array<OcorrenciaEstrutural & { 
  temaNome: string;
  gestorNome: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: ocorrenciasEstruturais.id,
      gestorId: ocorrenciasEstruturais.gestorId,
      temaId: ocorrenciasEstruturais.temaId,
      descricao: ocorrenciasEstruturais.descricao,
      abrangencia: ocorrenciasEstruturais.abrangencia,
      zonaAfetada: ocorrenciasEstruturais.zonaAfetada,
      lojasAfetadas: ocorrenciasEstruturais.lojasAfetadas,
      impacto: ocorrenciasEstruturais.impacto,
      fotos: ocorrenciasEstruturais.fotos,
      sugestaoAcao: ocorrenciasEstruturais.sugestaoAcao,
      estado: ocorrenciasEstruturais.estado,
      notasAdmin: ocorrenciasEstruturais.notasAdmin,
      resolvidoEm: ocorrenciasEstruturais.resolvidoEm,
      createdAt: ocorrenciasEstruturais.createdAt,
      updatedAt: ocorrenciasEstruturais.updatedAt,
      temaNome: temasOcorrencias.nome,
      gestorNome: users.name
    })
    .from(ocorrenciasEstruturais)
    .innerJoin(temasOcorrencias, eq(ocorrenciasEstruturais.temaId, temasOcorrencias.id))
    .leftJoin(gestores, eq(ocorrenciasEstruturais.gestorId, gestores.id))
    .leftJoin(users, eq(gestores.userId, users.id))
    .orderBy(desc(ocorrenciasEstruturais.createdAt));
  
  return result;
}

/**
 * Busca ocorrências estruturais de um gestor específico
 */
export async function getOcorrenciasEstruturaisByGestorId(gestorId: number): Promise<Array<OcorrenciaEstrutural & { 
  temaNome: string;
  gestorNome: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: ocorrenciasEstruturais.id,
      gestorId: ocorrenciasEstruturais.gestorId,
      temaId: ocorrenciasEstruturais.temaId,
      descricao: ocorrenciasEstruturais.descricao,
      abrangencia: ocorrenciasEstruturais.abrangencia,
      zonaAfetada: ocorrenciasEstruturais.zonaAfetada,
      lojasAfetadas: ocorrenciasEstruturais.lojasAfetadas,
      impacto: ocorrenciasEstruturais.impacto,
      fotos: ocorrenciasEstruturais.fotos,
      sugestaoAcao: ocorrenciasEstruturais.sugestaoAcao,
      estado: ocorrenciasEstruturais.estado,
      notasAdmin: ocorrenciasEstruturais.notasAdmin,
      resolvidoEm: ocorrenciasEstruturais.resolvidoEm,
      createdAt: ocorrenciasEstruturais.createdAt,
      updatedAt: ocorrenciasEstruturais.updatedAt,
      temaNome: temasOcorrencias.nome,
      gestorNome: users.name
    })
    .from(ocorrenciasEstruturais)
    .innerJoin(temasOcorrencias, eq(ocorrenciasEstruturais.temaId, temasOcorrencias.id))
    .innerJoin(gestores, eq(ocorrenciasEstruturais.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(ocorrenciasEstruturais.gestorId, gestorId))
    .orderBy(desc(ocorrenciasEstruturais.createdAt));
  
  return result;
}

/**
 * Busca uma ocorrência estrutural por ID
 */
export async function getOcorrenciaEstruturalById(id: number): Promise<(OcorrenciaEstrutural & { 
  temaNome: string;
  gestorNome: string | null;
}) | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      id: ocorrenciasEstruturais.id,
      gestorId: ocorrenciasEstruturais.gestorId,
      temaId: ocorrenciasEstruturais.temaId,
      descricao: ocorrenciasEstruturais.descricao,
      abrangencia: ocorrenciasEstruturais.abrangencia,
      zonaAfetada: ocorrenciasEstruturais.zonaAfetada,
      lojasAfetadas: ocorrenciasEstruturais.lojasAfetadas,
      impacto: ocorrenciasEstruturais.impacto,
      fotos: ocorrenciasEstruturais.fotos,
      sugestaoAcao: ocorrenciasEstruturais.sugestaoAcao,
      estado: ocorrenciasEstruturais.estado,
      notasAdmin: ocorrenciasEstruturais.notasAdmin,
      resolvidoEm: ocorrenciasEstruturais.resolvidoEm,
      createdAt: ocorrenciasEstruturais.createdAt,
      updatedAt: ocorrenciasEstruturais.updatedAt,
      temaNome: temasOcorrencias.nome,
      gestorNome: users.name
    })
    .from(ocorrenciasEstruturais)
    .innerJoin(temasOcorrencias, eq(ocorrenciasEstruturais.temaId, temasOcorrencias.id))
    .innerJoin(gestores, eq(ocorrenciasEstruturais.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(ocorrenciasEstruturais.id, id))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Atualiza o estado de uma ocorrência estrutural (para admin)
 */
export async function updateOcorrenciaEstruturalEstado(
  id: number,
  estado: 'reportado' | 'em_analise' | 'em_resolucao' | 'resolvido',
  notasAdmin?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const updateData: Partial<InsertOcorrenciaEstrutural> = { estado };
  
  if (notasAdmin !== undefined) {
    updateData.notasAdmin = notasAdmin;
  }
  
  if (estado === 'resolvido') {
    updateData.resolvidoEm = new Date();
  }
  
  await db
    .update(ocorrenciasEstruturais)
    .set(updateData)
    .where(eq(ocorrenciasEstruturais.id, id));
}

/**
 * Conta ocorrências estruturais por estado
 */
export async function countOcorrenciasEstruturaisPorEstado(): Promise<{
  reportado: number;
  emAnalise: number;
  emResolucao: number;
  resolvido: number;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { reportado: 0, emAnalise: 0, emResolucao: 0, resolvido: 0, total: 0 };
  
  const result = await db
    .select({
      estado: ocorrenciasEstruturais.estado,
      count: sql<number>`COUNT(*)`
    })
    .from(ocorrenciasEstruturais)
    .groupBy(ocorrenciasEstruturais.estado);
  
  const counts = {
    reportado: 0,
    emAnalise: 0,
    emResolucao: 0,
    resolvido: 0,
    total: 0
  };
  
  for (const row of result) {
    if (row.estado === 'reportado') counts.reportado = row.count;
    else if (row.estado === 'em_analise') counts.emAnalise = row.count;
    else if (row.estado === 'em_resolucao') counts.emResolucao = row.count;
    else if (row.estado === 'resolvido') counts.resolvido = row.count;
    counts.total += row.count;
  }
  
  return counts;
}

/**
 * Conta ocorrências estruturais não resolvidas (para badge no menu)
 */
export async function countOcorrenciasEstruturaisNaoResolvidas(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ocorrenciasEstruturais)
    .where(sql`${ocorrenciasEstruturais.estado} != 'resolvido'`);
  
  return result[0]?.count || 0;
}


/**
 * Busca ocorrências estruturais para análise IA (últimos 30 dias)
 * Retorna dados agregados por tema para facilitar análise de padrões
 */
export async function getOcorrenciasParaRelatorioIA(): Promise<{
  ocorrencias: Array<{
    id: number;
    tema: string;
    descricao: string;
    abrangencia: string;
    zonaAfetada: string | null;
    impacto: string;
    estado: string;
    gestorNome: string | null;
    criadoEm: Date;
    sugestaoAcao: string | null;
  }>;
  estatisticas: {
    total: number;
    porImpacto: { baixo: number; medio: number; alto: number; critico: number };
    porAbrangencia: { nacional: number; regional: number; zona: number };
    porEstado: { reportado: number; emAnalise: number; emResolucao: number; resolvido: number };
    temasMaisFrequentes: Array<{ tema: string; count: number }>;
  };
}> {
  const db = await getDb();
  if (!db) return {
    ocorrencias: [],
    estatisticas: {
      total: 0,
      porImpacto: { baixo: 0, medio: 0, alto: 0, critico: 0 },
      porAbrangencia: { nacional: 0, regional: 0, zona: 0 },
      porEstado: { reportado: 0, emAnalise: 0, emResolucao: 0, resolvido: 0 },
      temasMaisFrequentes: []
    }
  };
  
  // Buscar ocorrências dos últimos 30 dias
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 30);
  
  const ocorrencias = await db
    .select({
      id: ocorrenciasEstruturais.id,
      tema: temasOcorrencias.nome,
      descricao: ocorrenciasEstruturais.descricao,
      abrangencia: ocorrenciasEstruturais.abrangencia,
      zonaAfetada: ocorrenciasEstruturais.zonaAfetada,
      impacto: ocorrenciasEstruturais.impacto,
      estado: ocorrenciasEstruturais.estado,
      gestorNome: users.name,
      criadoEm: ocorrenciasEstruturais.createdAt,
      sugestaoAcao: ocorrenciasEstruturais.sugestaoAcao
    })
    .from(ocorrenciasEstruturais)
    .innerJoin(temasOcorrencias, eq(ocorrenciasEstruturais.temaId, temasOcorrencias.id))
    .leftJoin(gestores, eq(ocorrenciasEstruturais.gestorId, gestores.id))
    .leftJoin(users, eq(gestores.userId, users.id))
    .where(gte(ocorrenciasEstruturais.createdAt, dataLimite))
    .orderBy(desc(ocorrenciasEstruturais.createdAt));
  
  // Calcular estatísticas
  const estatisticas = {
    total: ocorrencias.length,
    porImpacto: { baixo: 0, medio: 0, alto: 0, critico: 0 },
    porAbrangencia: { nacional: 0, regional: 0, zona: 0 },
    porEstado: { reportado: 0, emAnalise: 0, emResolucao: 0, resolvido: 0 },
    temasMaisFrequentes: [] as Array<{ tema: string; count: number }>
  };
  
  const temasCount: Record<string, number> = {};
  
  for (const oc of ocorrencias) {
    // Por impacto
    if (oc.impacto === 'baixo') estatisticas.porImpacto.baixo++;
    else if (oc.impacto === 'medio') estatisticas.porImpacto.medio++;
    else if (oc.impacto === 'alto') estatisticas.porImpacto.alto++;
    else if (oc.impacto === 'critico') estatisticas.porImpacto.critico++;
    
    // Por abrangência
    if (oc.abrangencia === 'nacional') estatisticas.porAbrangencia.nacional++;
    else if (oc.abrangencia === 'regional') estatisticas.porAbrangencia.regional++;
    else if (oc.abrangencia === 'zona') estatisticas.porAbrangencia.zona++;
    
    // Por estado
    if (oc.estado === 'reportado') estatisticas.porEstado.reportado++;
    else if (oc.estado === 'em_analise') estatisticas.porEstado.emAnalise++;
    else if (oc.estado === 'em_resolucao') estatisticas.porEstado.emResolucao++;
    else if (oc.estado === 'resolvido') estatisticas.porEstado.resolvido++;
    
    // Contar temas
    temasCount[oc.tema] = (temasCount[oc.tema] || 0) + 1;
  }
  
  // Top 5 temas mais frequentes
  estatisticas.temasMaisFrequentes = Object.entries(temasCount)
    .map(([tema, count]) => ({ tema, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return { ocorrencias, estatisticas };
}


/**
 * Conta ocorrências estruturais por estado para um gestor específico
 */
export async function countOcorrenciasEstruturaisPorEstadoByGestor(gestorId: number): Promise<{
  reportado: number;
  emAnalise: number;
  emResolucao: number;
  resolvido: number;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { reportado: 0, emAnalise: 0, emResolucao: 0, resolvido: 0, total: 0 };
  
  const result = await db
    .select({
      estado: ocorrenciasEstruturais.estado,
      count: sql<number>`COUNT(*)`
    })
    .from(ocorrenciasEstruturais)
    .where(eq(ocorrenciasEstruturais.gestorId, gestorId))
    .groupBy(ocorrenciasEstruturais.estado);
  
  const counts = {
    reportado: 0,
    emAnalise: 0,
    emResolucao: 0,
    resolvido: 0,
    total: 0
  };
  
  for (const row of result) {
    if (row.estado === 'reportado') counts.reportado = row.count;
    else if (row.estado === 'em_analise') counts.emAnalise = row.count;
    else if (row.estado === 'em_resolucao') counts.emResolucao = row.count;
    else if (row.estado === 'resolvido') counts.resolvido = row.count;
    counts.total += row.count;
  }
  
  return counts;
}

/**
 * Atualiza uma ocorrência estrutural (edição completa)
 */
export async function updateOcorrenciaEstrutural(
  id: number,
  data: {
    temaId?: number;
    descricao?: string;
    abrangencia?: 'nacional' | 'regional' | 'zona';
    zonaAfetada?: string | null;
    lojasAfetadas?: number[] | null;
    impacto?: 'baixo' | 'medio' | 'alto' | 'critico';
    fotos?: string[] | null;
    sugestaoAcao?: string | null;
    estado?: 'reportado' | 'em_analise' | 'em_resolucao' | 'resolvido';
    notasAdmin?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const updateData: Record<string, unknown> = {
    updatedAt: new Date()
  };
  
  if (data.temaId !== undefined) updateData.temaId = data.temaId;
  if (data.descricao !== undefined) updateData.descricao = data.descricao;
  if (data.abrangencia !== undefined) updateData.abrangencia = data.abrangencia;
  if (data.zonaAfetada !== undefined) updateData.zonaAfetada = data.zonaAfetada;
  if (data.lojasAfetadas !== undefined) {
    updateData.lojasAfetadas = data.lojasAfetadas ? JSON.stringify(data.lojasAfetadas) : null;
  }
  if (data.impacto !== undefined) updateData.impacto = data.impacto;
  if (data.fotos !== undefined) {
    updateData.fotos = data.fotos ? JSON.stringify(data.fotos) : null;
  }
  if (data.sugestaoAcao !== undefined) updateData.sugestaoAcao = data.sugestaoAcao;
  if (data.estado !== undefined) {
    updateData.estado = data.estado;
    if (data.estado === 'resolvido') {
      updateData.resolvidoEm = new Date();
    }
  }
  if (data.notasAdmin !== undefined) updateData.notasAdmin = data.notasAdmin;
  
  await db
    .update(ocorrenciasEstruturais)
    .set(updateData)
    .where(eq(ocorrenciasEstruturais.id, id));
}


// ==================== ALERTAS DE PERFORMANCE ====================

/**
 * Verifica lojas com performance abaixo do limiar e cria alertas automáticos
 * @param limiarDesvio - Percentual de desvio negativo para disparar alerta (ex: -10 = 10% abaixo do objetivo)
 * @param mes - Mês a verificar
 * @param ano - Ano a verificar
 */
export async function verificarECriarAlertasPerformance(
  limiarDesvio: number = -10,
  mes: number,
  ano: number
): Promise<{ alertasCriados: number; lojasVerificadas: number }> {
  const db = await getDb();
  if (!db) return { alertasCriados: 0, lojasVerificadas: 0 };

  // Buscar lojas com desvio abaixo do limiar
  const lojasComPerformanceBaixa = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      desvioPercentualMes: resultadosMensais.desvioPercentualMes,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(
      and(
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano),
        sql`${resultadosMensais.desvioPercentualMes} < ${limiarDesvio / 100}` // Converter percentual para decimal
      )
    );

  let alertasCriados = 0;

  for (const loja of lojasComPerformanceBaixa) {
    // Verificar se já existe alerta pendente para esta loja
    const existe = await existeAlertaPendente(loja.lojaId, 'performance_baixa');
    
    if (!existe) {
      const desvioPercent = loja.desvioPercentualMes 
        ? (parseFloat(loja.desvioPercentualMes.toString()) * 100).toFixed(1)
        : '0';
      
      await createAlerta({
        lojaId: loja.lojaId,
        tipo: 'performance_baixa',
        descricao: `Loja ${loja.lojaNome} está ${desvioPercent}% abaixo do objetivo mensal. Serviços: ${loja.totalServicos || 0} / Objetivo: ${loja.objetivoMensal || 0}`,
      });
      alertasCriados++;
    }
  }

  return { 
    alertasCriados, 
    lojasVerificadas: lojasComPerformanceBaixa.length 
  };
}

/**
 * Obtém lojas com performance abaixo do limiar (sem criar alertas)
 */
export async function getLojasPerformanceBaixa(
  limiarDesvio: number = -10,
  mes: number,
  ano: number
): Promise<Array<{
  lojaId: number;
  lojaNome: string;
  desvioPercentualMes: number;
  totalServicos: number;
  objetivoMensal: number;
  zona: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];

  const resultado = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      desvioPercentualMes: resultadosMensais.desvioPercentualMes,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
      zona: resultadosMensais.zona,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(
      and(
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano),
        sql`${resultadosMensais.desvioPercentualMes} < ${limiarDesvio / 100}`
      )
    )
    .orderBy(resultadosMensais.desvioPercentualMes);

  return resultado.map(r => ({
    ...r,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) * 100 : 0,
    totalServicos: r.totalServicos || 0,
    objetivoMensal: r.objetivoMensal || 0,
  }));
}

/**
 * Obtém evolução global mensal (todas as lojas agregadas)
 */
export async function getEvolucaoGlobal(mesesAtras: number = 12): Promise<Array<{
  mes: number;
  ano: number;
  totalServicos: number;
  objetivoMensal: number;
  desvioPercentualMes: number;
  taxaReparacao: number;
  totalLojas: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  const dataLimite = new Date();
  dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);
  const anoLimite = dataLimite.getFullYear();
  const mesLimite = dataLimite.getMonth() + 1;

  const resultados = await db
    .select({
      mes: resultadosMensais.mes,
      ano: resultadosMensais.ano,
      totalServicos: sql<number>`SUM(${resultadosMensais.totalServicos})`,
      objetivoMensal: sql<number>`SUM(${resultadosMensais.objetivoMensal})`,
      desvioPercentualMes: sql<number>`AVG(${resultadosMensais.desvioPercentualMes})`,
      taxaReparacao: sql<number>`AVG(${resultadosMensais.taxaReparacao})`,
      totalLojas: sql<number>`COUNT(DISTINCT ${resultadosMensais.lojaId})`,
    })
    .from(resultadosMensais)
    .where(
      or(
        gt(resultadosMensais.ano, anoLimite),
        and(
          eq(resultadosMensais.ano, anoLimite),
          gte(resultadosMensais.mes, mesLimite)
        )
      )
    )
    .groupBy(resultadosMensais.mes, resultadosMensais.ano)
    .orderBy(resultadosMensais.ano, resultadosMensais.mes);

  return resultados.map(r => ({
    mes: r.mes,
    ano: r.ano,
    totalServicos: Number(r.totalServicos) || 0,
    objetivoMensal: Number(r.objetivoMensal) || 0,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) * 100 : 0,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) * 100 : 0,
    totalLojas: Number(r.totalLojas) || 0,
  }));
}


/**
 * Obtém lista de zonas distintas dos resultados mensais
 */
export async function getZonasDistintas(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  
  const zonas = await db
    .selectDistinct({
      zona: resultadosMensais.zona,
    })
    .from(resultadosMensais)
    .where(sql`${resultadosMensais.zona} IS NOT NULL AND ${resultadosMensais.zona} != ''`)
    .orderBy(resultadosMensais.zona);
  
  return zonas.map(z => z.zona).filter((z): z is string => z !== null);
}

/**
 * Obtém IDs das lojas de uma zona específica
 */
export async function getLojaIdsPorZona(zona: string, mes: number, ano: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  
  const lojas = await db
    .selectDistinct({
      lojaId: resultadosMensais.lojaId,
    })
    .from(resultadosMensais)
    .where(
      and(
        eq(resultadosMensais.zona, zona),
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano)
      )
    );
  
  return lojas.map(l => l.lojaId);
}

/**
 * Obtém IDs das lojas de múltiplas zonas
 */
export async function getLojaIdsPorZonas(zonas: string[], mes: number, ano: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  if (zonas.length === 0) return [];
  
  const lojas = await db
    .selectDistinct({
      lojaId: resultadosMensais.lojaId,
    })
    .from(resultadosMensais)
    .where(
      and(
        inArray(resultadosMensais.zona, zonas),
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano)
      )
    );
  
  return lojas.map(l => l.lojaId);
}

/**
 * Obtém estatísticas de uma zona específica
 */
export async function getEstatisticasZona(zona: string, mes: number, ano: number) {
  const db = await getDb();
  if (!db) return null;
  
  const stats = await db
    .select({
      totalLojas: sql<number>`COUNT(DISTINCT ${resultadosMensais.lojaId})`,
      somaServicos: sql<number>`SUM(${resultadosMensais.totalServicos})`,
      somaObjetivos: sql<number>`SUM(${resultadosMensais.objetivoMensal})`,
      mediaDesvioPercentual: sql<number>`AVG(${resultadosMensais.desvioPercentualMes})`,
      mediaTaxaReparacao: sql<number>`AVG(${resultadosMensais.taxaReparacao})`,
      somaReparacoes: sql<number>`SUM(${resultadosMensais.qtdReparacoes})`,
      lojasAcimaObjetivo: sql<number>`SUM(CASE WHEN ${resultadosMensais.desvioPercentualMes} >= 0 THEN 1 ELSE 0 END)`,
    })
    .from(resultadosMensais)
    .where(
      and(
        eq(resultadosMensais.zona, zona),
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano)
      )
    );

  const result = stats[0];
  if (!result) return null;
  
  return {
    ...result,
    mediaDesvioPercentual: result.mediaDesvioPercentual ? parseFloat(result.mediaDesvioPercentual.toString()) : null,
    mediaTaxaReparacao: result.mediaTaxaReparacao ? parseFloat(result.mediaTaxaReparacao.toString()) : null,
  };
}

/**
 * Obtém ranking de lojas filtrado por zona
 */
export async function getRankingLojasPorZona(
  metrica: 'totalServicos' | 'taxaReparacao' | 'desvioPercentualMes' | 'servicosPorColaborador',
  zona: string,
  mes: number,
  ano: number,
  limit: number = 100
) {
  const db = await getDb();
  if (!db) return [];
  
  const campo = resultadosMensais[metrica];
  
  const ranking = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: resultadosMensais.zona,
      valor: campo,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
      desvioPercentualMes: resultadosMensais.desvioPercentualMes,
      taxaReparacao: resultadosMensais.taxaReparacao,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(
      and(
        eq(resultadosMensais.zona, zona),
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano)
      )
    )
    .orderBy(desc(campo))
    .limit(limit);

  return ranking.map(r => ({
    ...r,
    valor: r.valor ? parseFloat(r.valor.toString()) : null,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) : null,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : null,
  }));
}


// ============================================
// ANÁLISES AVANÇADAS PARA RELATÓRIO IA v6.5
// ============================================

/**
 * Obtém análise completa de uma loja para o período
 * Inclui resultados, vendas complementares e evolução
 */
export async function getAnaliseCompletaLoja(lojaId: number, mes: number, ano: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Buscar resultados mensais
  const resultados = await db
    .select()
    .from(resultadosMensais)
    .where(
      and(
        eq(resultadosMensais.lojaId, lojaId),
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano)
      )
    );
  
  // Buscar vendas complementares
  const vendas = await db
    .select()
    .from(vendasComplementares)
    .where(
      and(
        eq(vendasComplementares.lojaId, lojaId),
        eq(vendasComplementares.mes, mes),
        eq(vendasComplementares.ano, ano)
      )
    );
  
  // Buscar dados do mês anterior para comparação
  let mesAnterior = mes - 1;
  let anoAnterior = ano;
  if (mesAnterior === 0) {
    mesAnterior = 12;
    anoAnterior = ano - 1;
  }
  
  const resultadosAnteriores = await db
    .select()
    .from(resultadosMensais)
    .where(
      and(
        eq(resultadosMensais.lojaId, lojaId),
        eq(resultadosMensais.mes, mesAnterior),
        eq(resultadosMensais.ano, anoAnterior)
      )
    );
  
  const resultado = resultados[0];
  const venda = vendas[0];
  const resultadoAnterior = resultadosAnteriores[0];
  
  // Calcular variação vs mês anterior
  const variacaoServicos = resultado && resultadoAnterior 
    ? ((resultado.totalServicos || 0) - (resultadoAnterior.totalServicos || 0)) / (resultadoAnterior.totalServicos || 1) * 100
    : 0;
  
  return {
    lojaId,
    mes,
    ano,
    // Resultados
    totalServicos: resultado?.totalServicos || 0,
    objetivoMensal: resultado?.objetivoMensal || 0,
    desvioPercentualMes: resultado?.desvioPercentualMes ? parseFloat(resultado.desvioPercentualMes.toString()) : 0,
    taxaReparacao: resultado?.taxaReparacao ? parseFloat(resultado.taxaReparacao.toString()) : 0,
    qtdReparacoes: resultado?.qtdReparacoes || 0,
    qtdParaBrisas: resultado?.qtdParaBrisas || 0,
    zona: resultado?.zona || null,
    numColaboradores: resultado?.numColaboradores || 0,
    servicosPorColaborador: resultado?.servicosPorColaborador ? parseFloat(resultado.servicosPorColaborador.toString()) : 0,
    // Vendas Complementares
    totalVendasComplementares: venda?.totalVendas ? parseFloat(venda.totalVendas.toString()) : 0,
    escovasVendas: venda?.escovasVendas ? parseFloat(venda.escovasVendas.toString()) : 0,
    escovasQtd: venda?.escovasQtd || 0,
    escovasPercent: venda?.escovasPercent ? parseFloat(venda.escovasPercent.toString()) : 0,
    polimentoVendas: venda?.polimentoVendas ? parseFloat(venda.polimentoVendas.toString()) : 0,
    lavagensTotal: venda?.lavagensTotal || 0,
    // Evolução
    variacaoServicos: parseFloat(variacaoServicos.toFixed(2)),
    servicosAnterior: resultadoAnterior?.totalServicos || 0,
  };
}

/**
 * Obtém TOP 5 lojas por taxa de reparação
 */
export async function getTop5TaxaReparacao(mes: number, ano: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(resultadosMensais.mes, mes),
    eq(resultadosMensais.ano, ano),
    sql`${resultadosMensais.taxaReparacao} IS NOT NULL`,
    sql`${resultadosMensais.taxaReparacao} > 0`
  ];
  
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const ranking = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: resultadosMensais.zona,
      taxaReparacao: resultadosMensais.taxaReparacao,
      qtdReparacoes: resultadosMensais.qtdReparacoes,
      qtdParaBrisas: resultadosMensais.qtdParaBrisas,
      totalServicos: resultadosMensais.totalServicos,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(and(...conditions))
    .orderBy(desc(resultadosMensais.taxaReparacao))
    .limit(5);
  
  return ranking.map(r => ({
    ...r,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : 0,
  }));
}

/**
 * Obtém BOTTOM 5 lojas por taxa de reparação
 */
export async function getBottom5TaxaReparacao(mes: number, ano: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(resultadosMensais.mes, mes),
    eq(resultadosMensais.ano, ano),
    sql`${resultadosMensais.taxaReparacao} IS NOT NULL`
  ];
  
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const ranking = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: resultadosMensais.zona,
      taxaReparacao: resultadosMensais.taxaReparacao,
      qtdReparacoes: resultadosMensais.qtdReparacoes,
      qtdParaBrisas: resultadosMensais.qtdParaBrisas,
      totalServicos: resultadosMensais.totalServicos,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(and(...conditions))
    .orderBy(asc(resultadosMensais.taxaReparacao))
    .limit(5);
  
  return ranking.map(r => ({
    ...r,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : 0,
  }));
}

/**
 * Obtém TOP 5 lojas por cumprimento de objetivo (melhor desvio positivo)
 */
export async function getTop5CumprimentoObjetivo(mes: number, ano: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(resultadosMensais.mes, mes),
    eq(resultadosMensais.ano, ano),
    sql`${resultadosMensais.desvioPercentualMes} IS NOT NULL`
  ];
  
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const ranking = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: resultadosMensais.zona,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
      desvioPercentualMes: resultadosMensais.desvioPercentualMes,
      taxaReparacao: resultadosMensais.taxaReparacao,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(and(...conditions))
    .orderBy(desc(resultadosMensais.desvioPercentualMes))
    .limit(5);
  
  return ranking.map(r => ({
    ...r,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) : 0,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : 0,
  }));
}

/**
 * Obtém BOTTOM 5 lojas por cumprimento de objetivo (pior desvio negativo)
 */
export async function getBottom5CumprimentoObjetivo(mes: number, ano: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(resultadosMensais.mes, mes),
    eq(resultadosMensais.ano, ano),
    sql`${resultadosMensais.desvioPercentualMes} IS NOT NULL`
  ];
  
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const ranking = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: resultadosMensais.zona,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
      desvioPercentualMes: resultadosMensais.desvioPercentualMes,
      taxaReparacao: resultadosMensais.taxaReparacao,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(and(...conditions))
    .orderBy(asc(resultadosMensais.desvioPercentualMes))
    .limit(5);
  
  return ranking.map(r => ({
    ...r,
    desvioPercentualMes: r.desvioPercentualMes ? parseFloat(r.desvioPercentualMes.toString()) : 0,
    taxaReparacao: r.taxaReparacao ? parseFloat(r.taxaReparacao.toString()) : 0,
  }));
}

/**
 * Obtém TOP 5 lojas por vendas complementares
 */
export async function getTop5VendasComplementares(mes: number, ano: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(vendasComplementares.mes, mes),
    eq(vendasComplementares.ano, ano),
    sql`${vendasComplementares.totalVendas} IS NOT NULL`
  ];
  
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(vendasComplementares.lojaId, lojasIds));
  }
  
  const ranking = await db
    .select({
      lojaId: vendasComplementares.lojaId,
      lojaNome: lojas.nome,
      totalVendas: vendasComplementares.totalVendas,
      escovasVendas: vendasComplementares.escovasVendas,
      escovasQtd: vendasComplementares.escovasQtd,
      escovasPercent: vendasComplementares.escovasPercent,
      polimentoVendas: vendasComplementares.polimentoVendas,
      lavagensTotal: vendasComplementares.lavagensTotal,
    })
    .from(vendasComplementares)
    .innerJoin(lojas, eq(vendasComplementares.lojaId, lojas.id))
    .where(and(...conditions))
    .orderBy(desc(vendasComplementares.totalVendas))
    .limit(5);
  
  return ranking.map(r => ({
    ...r,
    totalVendas: r.totalVendas ? parseFloat(r.totalVendas.toString()) : 0,
    escovasVendas: r.escovasVendas ? parseFloat(r.escovasVendas.toString()) : 0,
    escovasPercent: r.escovasPercent ? parseFloat(r.escovasPercent.toString()) : 0,
    polimentoVendas: r.polimentoVendas ? parseFloat(r.polimentoVendas.toString()) : 0,
  }));
}

/**
 * Obtém BOTTOM 5 lojas por vendas complementares
 */
export async function getBottom5VendasComplementares(mes: number, ano: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(vendasComplementares.mes, mes),
    eq(vendasComplementares.ano, ano)
  ];
  
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(vendasComplementares.lojaId, lojasIds));
  }
  
  const ranking = await db
    .select({
      lojaId: vendasComplementares.lojaId,
      lojaNome: lojas.nome,
      totalVendas: vendasComplementares.totalVendas,
      escovasVendas: vendasComplementares.escovasVendas,
      escovasQtd: vendasComplementares.escovasQtd,
      escovasPercent: vendasComplementares.escovasPercent,
    })
    .from(vendasComplementares)
    .innerJoin(lojas, eq(vendasComplementares.lojaId, lojas.id))
    .where(and(...conditions))
    .orderBy(asc(vendasComplementares.totalVendas))
    .limit(5);
  
  return ranking.map(r => ({
    ...r,
    totalVendas: r.totalVendas ? parseFloat(r.totalVendas.toString()) : 0,
    escovasVendas: r.escovasVendas ? parseFloat(r.escovasVendas.toString()) : 0,
    escovasPercent: r.escovasPercent ? parseFloat(r.escovasPercent.toString()) : 0,
  }));
}

/**
 * Obtém TOP 5 lojas por crescimento vs mês anterior
 */
export async function getTop5Crescimento(mes: number, ano: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  // Calcular mês anterior
  let mesAnterior = mes - 1;
  let anoAnterior = ano;
  if (mesAnterior === 0) {
    mesAnterior = 12;
    anoAnterior = ano - 1;
  }
  
  // Buscar dados do mês atual
  const conditionsAtual = [
    eq(resultadosMensais.mes, mes),
    eq(resultadosMensais.ano, ano)
  ];
  if (lojasIds && lojasIds.length > 0) {
    conditionsAtual.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const dadosAtuais = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: resultadosMensais.zona,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(and(...conditionsAtual));
  
  // Buscar dados do mês anterior
  const conditionsAnterior = [
    eq(resultadosMensais.mes, mesAnterior),
    eq(resultadosMensais.ano, anoAnterior)
  ];
  if (lojasIds && lojasIds.length > 0) {
    conditionsAnterior.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const dadosAnteriores = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      totalServicos: resultadosMensais.totalServicos,
    })
    .from(resultadosMensais)
    .where(and(...conditionsAnterior));
  
  // Mapear dados anteriores
  const mapAnterior = new Map(dadosAnteriores.map(d => [d.lojaId, d.totalServicos || 0]));
  
  // Calcular crescimento
  const comCrescimento = dadosAtuais
    .map(atual => {
      const anterior = mapAnterior.get(atual.lojaId) || 0;
      const crescimento = anterior > 0 
        ? ((atual.totalServicos || 0) - anterior) / anterior * 100 
        : 0;
      return {
        ...atual,
        servicosAnterior: anterior,
        crescimento: parseFloat(crescimento.toFixed(2)),
      };
    })
    .filter(l => l.crescimento !== 0 && l.servicosAnterior > 0)
    .sort((a, b) => b.crescimento - a.crescimento)
    .slice(0, 5);
  
  return comCrescimento;
}

/**
 * Obtém BOTTOM 5 lojas por crescimento (maior decréscimo)
 */
export async function getBottom5Crescimento(mes: number, ano: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  // Calcular mês anterior
  let mesAnterior = mes - 1;
  let anoAnterior = ano;
  if (mesAnterior === 0) {
    mesAnterior = 12;
    anoAnterior = ano - 1;
  }
  
  // Buscar dados do mês atual
  const conditionsAtual = [
    eq(resultadosMensais.mes, mes),
    eq(resultadosMensais.ano, ano)
  ];
  if (lojasIds && lojasIds.length > 0) {
    conditionsAtual.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const dadosAtuais = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      lojaNome: lojas.nome,
      zona: resultadosMensais.zona,
      totalServicos: resultadosMensais.totalServicos,
      objetivoMensal: resultadosMensais.objetivoMensal,
    })
    .from(resultadosMensais)
    .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
    .where(and(...conditionsAtual));
  
  // Buscar dados do mês anterior
  const conditionsAnterior = [
    eq(resultadosMensais.mes, mesAnterior),
    eq(resultadosMensais.ano, anoAnterior)
  ];
  if (lojasIds && lojasIds.length > 0) {
    conditionsAnterior.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const dadosAnteriores = await db
    .select({
      lojaId: resultadosMensais.lojaId,
      totalServicos: resultadosMensais.totalServicos,
    })
    .from(resultadosMensais)
    .where(and(...conditionsAnterior));
  
  // Mapear dados anteriores
  const mapAnterior = new Map(dadosAnteriores.map(d => [d.lojaId, d.totalServicos || 0]));
  
  // Calcular decréscimo
  const comDecrescimo = dadosAtuais
    .map(atual => {
      const anterior = mapAnterior.get(atual.lojaId) || 0;
      const crescimento = anterior > 0 
        ? ((atual.totalServicos || 0) - anterior) / anterior * 100 
        : 0;
      return {
        ...atual,
        servicosAnterior: anterior,
        crescimento: parseFloat(crescimento.toFixed(2)),
      };
    })
    .filter(l => l.crescimento < 0 && l.servicosAnterior > 0)
    .sort((a, b) => a.crescimento - b.crescimento)
    .slice(0, 5);
  
  return comDecrescimo;
}

/**
 * Obtém análise agregada por zona
 */
export async function getAnaliseZonas(mes: number, ano: number, lojasIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(resultadosMensais.mes, mes),
    eq(resultadosMensais.ano, ano),
    sql`${resultadosMensais.zona} IS NOT NULL`
  ];
  
  if (lojasIds && lojasIds.length > 0) {
    conditions.push(inArray(resultadosMensais.lojaId, lojasIds));
  }
  
  const analise = await db
    .select({
      zona: resultadosMensais.zona,
      totalLojas: sql<number>`COUNT(DISTINCT ${resultadosMensais.lojaId})`,
      somaServicos: sql<number>`SUM(${resultadosMensais.totalServicos})`,
      somaObjetivos: sql<number>`SUM(${resultadosMensais.objetivoMensal})`,
      mediaDesvio: sql<number>`AVG(${resultadosMensais.desvioPercentualMes})`,
      mediaTaxaReparacao: sql<number>`AVG(${resultadosMensais.taxaReparacao})`,
      lojasAcimaObjetivo: sql<number>`SUM(CASE WHEN ${resultadosMensais.desvioPercentualMes} >= 0 THEN 1 ELSE 0 END)`,
    })
    .from(resultadosMensais)
    .where(and(...conditions))
    .groupBy(resultadosMensais.zona)
    .orderBy(desc(sql`SUM(${resultadosMensais.totalServicos})`));
  
  // Para cada zona, buscar melhor e pior loja
  const resultado = await Promise.all(analise.map(async (zona) => {
    // Melhor loja da zona
    const melhor = await db
      .select({
        lojaNome: lojas.nome,
        desvio: resultadosMensais.desvioPercentualMes,
      })
      .from(resultadosMensais)
      .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
      .where(
        and(
          eq(resultadosMensais.zona, zona.zona!),
          eq(resultadosMensais.mes, mes),
          eq(resultadosMensais.ano, ano)
        )
      )
      .orderBy(desc(resultadosMensais.desvioPercentualMes))
      .limit(1);
    
    // Pior loja da zona
    const pior = await db
      .select({
        lojaNome: lojas.nome,
        desvio: resultadosMensais.desvioPercentualMes,
      })
      .from(resultadosMensais)
      .innerJoin(lojas, eq(resultadosMensais.lojaId, lojas.id))
      .where(
        and(
          eq(resultadosMensais.zona, zona.zona!),
          eq(resultadosMensais.mes, mes),
          eq(resultadosMensais.ano, ano)
        )
      )
      .orderBy(asc(resultadosMensais.desvioPercentualMes))
      .limit(1);
    
    return {
      zona: zona.zona,
      totalLojas: zona.totalLojas || 0,
      somaServicos: zona.somaServicos || 0,
      somaObjetivos: zona.somaObjetivos || 0,
      mediaDesvio: zona.mediaDesvio ? parseFloat(zona.mediaDesvio.toString()) : 0,
      mediaTaxaReparacao: zona.mediaTaxaReparacao ? parseFloat(zona.mediaTaxaReparacao.toString()) : 0,
      lojasAcimaObjetivo: zona.lojasAcimaObjetivo || 0,
      taxaCumprimento: zona.totalLojas ? ((zona.lojasAcimaObjetivo || 0) / zona.totalLojas * 100) : 0,
      melhorLoja: melhor[0]?.lojaNome || 'N/A',
      melhorLojaDesvio: melhor[0]?.desvio ? parseFloat(melhor[0].desvio.toString()) : 0,
      piorLoja: pior[0]?.lojaNome || 'N/A',
      piorLojaDesvio: pior[0]?.desvio ? parseFloat(pior[0].desvio.toString()) : 0,
    };
  }));
  
  return resultado;
}

/**
 * Obtém dados completos para análise avançada do relatório IA
 */
export async function getDadosAnaliseAvancada(mes: number, ano: number, lojasIds?: number[]) {
  const [
    top5TaxaReparacao,
    bottom5TaxaReparacao,
    top5Objetivo,
    bottom5Objetivo,
    top5Vendas,
    bottom5Vendas,
    top5Crescimento,
    bottom5Crescimento,
    analiseZonas,
    estatisticas,
    estatisticasComplementares
  ] = await Promise.all([
    getTop5TaxaReparacao(mes, ano, lojasIds),
    getBottom5TaxaReparacao(mes, ano, lojasIds),
    getTop5CumprimentoObjetivo(mes, ano, lojasIds),
    getBottom5CumprimentoObjetivo(mes, ano, lojasIds),
    getTop5VendasComplementares(mes, ano, lojasIds),
    getBottom5VendasComplementares(mes, ano, lojasIds),
    getTop5Crescimento(mes, ano, lojasIds),
    getBottom5Crescimento(mes, ano, lojasIds),
    getAnaliseZonas(mes, ano, lojasIds),
    getEstatisticasPeriodo(mes, ano, undefined, lojasIds),
    getEstatisticasComplementares(mes, ano, undefined, lojasIds),
  ]);
  
  return {
    rankings: {
      taxaReparacao: { top5: top5TaxaReparacao, bottom5: bottom5TaxaReparacao },
      cumprimentoObjetivo: { top5: top5Objetivo, bottom5: bottom5Objetivo },
      vendasComplementares: { top5: top5Vendas, bottom5: bottom5Vendas },
      crescimento: { top5: top5Crescimento, bottom5: bottom5Crescimento },
    },
    analiseZonas,
    estatisticas,
    estatisticasComplementares,
  };
}


/**
 * Obtém os meses que têm dados de resultados mensais na base de dados
 * Retorna lista ordenada do mais recente para o mais antigo
 */
export async function getMesesComDadosDisponiveis(): Promise<{ mes: number; ano: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  const meses = await db
    .selectDistinct({
      mes: resultadosMensais.mes,
      ano: resultadosMensais.ano,
    })
    .from(resultadosMensais)
    .orderBy(desc(resultadosMensais.ano), desc(resultadosMensais.mes));
  
  return meses;
}


// ==================== TÓPICOS DE REUNIÃO DE GESTORES ====================

import { 
  topicosReuniaoGestores,
  TopicoReuniaoGestores,
  InsertTopicoReuniaoGestores,
  relatoriosReuniaoGestores,
  RelatorioReuniaoGestores,
  InsertRelatorioReuniaoGestores
} from "../drizzle/schema";

/**
 * Criar tópico de reunião de gestores
 */
export async function createTopicoReuniao(data: InsertTopicoReuniaoGestores): Promise<TopicoReuniaoGestores> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [novoTopico] = await db
    .insert(topicosReuniaoGestores)
    .values(data)
    .$returningId();
  
  const [topico] = await db
    .select()
    .from(topicosReuniaoGestores)
    .where(eq(topicosReuniaoGestores.id, novoTopico.id))
    .limit(1);
  
  return topico!;
}

/**
 * Obter tópicos pendentes (ainda não associados a nenhuma reunião)
 */
export async function getTopicosPendentes(): Promise<TopicoReuniaoGestores[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(topicosReuniaoGestores)
    .where(eq(topicosReuniaoGestores.estado, "pendente"))
    .orderBy(desc(topicosReuniaoGestores.createdAt));
}

/**
 * Obter tópicos por gestor
 */
export async function getTopicosByGestorId(gestorId: number): Promise<TopicoReuniaoGestores[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(topicosReuniaoGestores)
    .where(eq(topicosReuniaoGestores.gestorId, gestorId))
    .orderBy(desc(topicosReuniaoGestores.createdAt));
}

/**
 * Obter tópicos analisados para uma reunião
 */
export async function getTopicosAnalisadosByReuniaoId(reuniaoId: number): Promise<TopicoReuniaoGestores[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(topicosReuniaoGestores)
    .where(
      and(
        eq(topicosReuniaoGestores.reuniaoId, reuniaoId),
        inArray(topicosReuniaoGestores.estado, ["analisado", "discutido", "nao_discutido"])
      )
    )
    .orderBy(desc(topicosReuniaoGestores.createdAt));
}

/**
 * Marcar tópico como analisado (incluir na reunião)
 */
export async function marcarTopicoAnalisado(topicoId: number, reuniaoId: number, notasAdmin?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(topicosReuniaoGestores)
    .set({
      estado: "analisado",
      reuniaoId,
      notasAdmin
    })
    .where(eq(topicosReuniaoGestores.id, topicoId));
}

/**
 * Marcar tópico como discutido
 */
export async function marcarTopicoDiscutido(topicoId: number, resultadoDiscussao?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(topicosReuniaoGestores)
    .set({
      estado: "discutido",
      resultadoDiscussao
    })
    .where(eq(topicosReuniaoGestores.id, topicoId));
}

/**
 * Marcar tópico como não discutido (volta a pendente para próxima reunião)
 */
export async function marcarTopicoNaoDiscutido(topicoId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(topicosReuniaoGestores)
    .set({
      estado: "nao_discutido"
    })
    .where(eq(topicosReuniaoGestores.id, topicoId));
}

/**
 * Libertar tópicos não discutidos (voltam a pendente para próxima reunião)
 */
export async function libertarTopicosNaoDiscutidos(reuniaoId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(topicosReuniaoGestores)
    .set({
      estado: "pendente",
      reuniaoId: null,
      notasAdmin: null
    })
    .where(
      and(
        eq(topicosReuniaoGestores.reuniaoId, reuniaoId),
        eq(topicosReuniaoGestores.estado, "nao_discutido")
      )
    );
}

/**
 * Obter tópico por ID
 */
export async function getTopicoById(id: number): Promise<TopicoReuniaoGestores | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [topico] = await db
    .select()
    .from(topicosReuniaoGestores)
    .where(eq(topicosReuniaoGestores.id, id))
    .limit(1);
  
  return topico || null;
}

/**
 * Atualizar tópico
 */
export async function updateTopico(id: number, data: Partial<InsertTopicoReuniaoGestores>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(topicosReuniaoGestores)
    .set(data)
    .where(eq(topicosReuniaoGestores.id, id));
}

/**
 * Eliminar tópico
 */
export async function deleteTopico(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .delete(topicosReuniaoGestores)
    .where(eq(topicosReuniaoGestores.id, id));
}

// ==================== RELATÓRIOS DE REUNIÃO DE GESTORES ====================

/**
 * Criar relatório de reunião
 */
export async function createRelatorioReuniao(data: InsertRelatorioReuniaoGestores): Promise<RelatorioReuniaoGestores> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [novoRelatorio] = await db
    .insert(relatoriosReuniaoGestores)
    .values(data)
    .$returningId();
  
  const [relatorio] = await db
    .select()
    .from(relatoriosReuniaoGestores)
    .where(eq(relatoriosReuniaoGestores.id, novoRelatorio.id))
    .limit(1);
  
  return relatorio!;
}

/**
 * Obter relatório de reunião por reunião ID
 */
export async function getRelatorioByReuniaoId(reuniaoId: number): Promise<RelatorioReuniaoGestores | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [relatorio] = await db
    .select()
    .from(relatoriosReuniaoGestores)
    .where(eq(relatoriosReuniaoGestores.reuniaoId, reuniaoId))
    .limit(1);
  
  return relatorio || null;
}

/**
 * Atualizar relatório de reunião
 */
export async function updateRelatorioReuniao(id: number, data: Partial<InsertRelatorioReuniaoGestores>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(relatoriosReuniaoGestores)
    .set(data)
    .where(eq(relatoriosReuniaoGestores.id, id));
}

/**
 * Obter tópicos pendentes com informação do gestor
 */
export async function getTopicosPendentesComGestor(): Promise<Array<TopicoReuniaoGestores & { gestorNome: string | null; gestorEmail: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  
  const topicos = await db
    .select({
      id: topicosReuniaoGestores.id,
      gestorId: topicosReuniaoGestores.gestorId,
      titulo: topicosReuniaoGestores.titulo,
      descricao: topicosReuniaoGestores.descricao,
      estado: topicosReuniaoGestores.estado,
      reuniaoId: topicosReuniaoGestores.reuniaoId,
      notasAdmin: topicosReuniaoGestores.notasAdmin,
      resultadoDiscussao: topicosReuniaoGestores.resultadoDiscussao,
      createdAt: topicosReuniaoGestores.createdAt,
      updatedAt: topicosReuniaoGestores.updatedAt,
      gestorNome: users.name,
      gestorEmail: users.email,
    })
    .from(topicosReuniaoGestores)
    .innerJoin(gestores, eq(topicosReuniaoGestores.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(topicosReuniaoGestores.estado, "pendente"))
    .orderBy(desc(topicosReuniaoGestores.createdAt));
  
  return topicos;
}

/**
 * Obter todos os tópicos de uma reunião com informação do gestor
 */
export async function getTopicosReuniaoComGestor(reuniaoId: number): Promise<Array<TopicoReuniaoGestores & { gestorNome: string | null; gestorEmail: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  
  const topicos = await db
    .select({
      id: topicosReuniaoGestores.id,
      gestorId: topicosReuniaoGestores.gestorId,
      titulo: topicosReuniaoGestores.titulo,
      descricao: topicosReuniaoGestores.descricao,
      estado: topicosReuniaoGestores.estado,
      reuniaoId: topicosReuniaoGestores.reuniaoId,
      notasAdmin: topicosReuniaoGestores.notasAdmin,
      resultadoDiscussao: topicosReuniaoGestores.resultadoDiscussao,
      createdAt: topicosReuniaoGestores.createdAt,
      updatedAt: topicosReuniaoGestores.updatedAt,
      gestorNome: users.name,
      gestorEmail: users.email,
    })
    .from(topicosReuniaoGestores)
    .innerJoin(gestores, eq(topicosReuniaoGestores.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(topicosReuniaoGestores.reuniaoId, reuniaoId))
    .orderBy(desc(topicosReuniaoGestores.createdAt));
  
  return topicos;
}


// ==================== FUNÇÕES PARA PORTAL DA LOJA ====================

/**
 * Obter resultados mensais de uma loja específica
 */
export async function getResultadosMensaisPorLoja(lojaId: number, mes: number, ano: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [resultado] = await db
    .select()
    .from(resultadosMensais)
    .where(
      and(
        eq(resultadosMensais.lojaId, lojaId),
        eq(resultadosMensais.mes, mes),
        eq(resultadosMensais.ano, ano)
      )
    )
    .limit(1);
  
  return resultado || null;
}


// ==================== FUNÇÕES PARA PROJEÇÃO DE VISITAS ====================

/**
 * Interface para dados de priorização de lojas
 */
export interface DadosPriorizacaoLoja {
  lojaId: number;
  lojaNome: string;
  lojaCodigo: string;
  lojaEndereco: string | null;
  diasSemVisita: number;
  ultimaVisita: Date | null;
  pendentesAtivos: number;
  resultadoVsObjetivo: number; // Percentagem (ex: 85 = 85%)
  pontuacaoTotal: number;
  motivo: 'tempo_sem_visita' | 'pendentes_ativos' | 'resultados_baixos';
  detalheMotivo: string;
}

/**
 * Obter dados de priorização para todas as lojas de um gestor
 */
export async function getDadosPriorizacaoLojas(gestorId: number): Promise<DadosPriorizacaoLoja[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Obter lojas do gestor
  const lojasGestor = await db
    .select({
      lojaId: gestorLojas.lojaId,
      lojaNome: lojas.nome,
    })
    .from(gestorLojas)
    .innerJoin(lojas, eq(gestorLojas.lojaId, lojas.id))
    .where(eq(gestorLojas.gestorId, gestorId));
  
  const resultado: DadosPriorizacaoLoja[] = [];
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  
  for (const loja of lojasGestor) {
    // Obter último relatório (visita) da loja
    const [ultimoRelatorio] = await db
      .select({ createdAt: relatoriosCompletos.createdAt })
      .from(relatoriosCompletos)
      .where(eq(relatoriosCompletos.lojaId, loja.lojaId))
      .orderBy(desc(relatoriosCompletos.createdAt))
      .limit(1);
    
    const ultimaVisita = ultimoRelatorio?.createdAt || null;
    const diasSemVisita = ultimaVisita 
      ? Math.floor((hoje.getTime() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24))
      : 365; // Se nunca visitou, assume 1 ano
    
    // Obter pendentes ativos da loja
    const pendentesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(pendentesLoja)
      .where(
        and(
          eq(pendentesLoja.lojaId, loja.lojaId),
          eq(pendentesLoja.estado, 'pendente')
        )
      );
    const pendentesAtivos = Number(pendentesResult[0]?.count || 0);
    
    // Obter resultados vs objetivo do mês atual
    const [resultadoMensal] = await db
      .select()
      .from(resultadosMensais)
      .where(
        and(
          eq(resultadosMensais.lojaId, loja.lojaId),
          eq(resultadosMensais.mes, mesAtual),
          eq(resultadosMensais.ano, anoAtual)
        )
      )
      .limit(1);
    
    let resultadoVsObjetivo = 100; // Default se não houver dados
    if (resultadoMensal && resultadoMensal.objetivoMensal && resultadoMensal.objetivoMensal > 0) {
      const totalServicos = resultadoMensal.totalServicos || 0;
      resultadoVsObjetivo = Math.round((totalServicos / resultadoMensal.objetivoMensal) * 100);
    }
    
    // Calcular pontuação de prioridade (quanto maior, mais prioritário)
    // Pesos: tempo sem visita (40%), pendentes (35%), resultados baixos (25%)
    const pontosTempo = Math.min(diasSemVisita * 2, 100); // Max 100 pontos
    const pontosPendentes = Math.min(pendentesAtivos * 10, 100); // Max 100 pontos
    const pontosResultados = Math.max(0, 100 - resultadoVsObjetivo); // Quanto menor o resultado, mais pontos
    
    const pontuacaoTotal = (pontosTempo * 0.4) + (pontosPendentes * 0.35) + (pontosResultados * 0.25);
    
    // Determinar motivo principal
    let motivo: 'tempo_sem_visita' | 'pendentes_ativos' | 'resultados_baixos' = 'tempo_sem_visita';
    let detalheMotivo = `${diasSemVisita} dias sem visita`;
    
    if (pontosPendentes * 0.35 > pontosTempo * 0.4 && pontosPendentes * 0.35 > pontosResultados * 0.25) {
      motivo = 'pendentes_ativos';
      detalheMotivo = `${pendentesAtivos} pendentes ativos`;
    } else if (pontosResultados * 0.25 > pontosTempo * 0.4 && pontosResultados * 0.25 > pontosPendentes * 0.35) {
      motivo = 'resultados_baixos';
      detalheMotivo = `${resultadoVsObjetivo}% do objetivo mensal`;
    }
    
    resultado.push({
      lojaId: loja.lojaId,
      lojaNome: loja.lojaNome,
      lojaCodigo: loja.lojaNome, // Usar nome como código (tabela não tem campo código)
      lojaEndereco: null, // Tabela não tem campo endereço
      diasSemVisita,
      ultimaVisita,
      pendentesAtivos,
      resultadoVsObjetivo,
      pontuacaoTotal,
      motivo,
      detalheMotivo,
    });
  }
  
  // Ordenar por pontuação (mais prioritário primeiro)
  resultado.sort((a, b) => b.pontuacaoTotal - a.pontuacaoTotal);
  
  return resultado;
}

/**
 * Criar uma nova projeção de visitas
 */
export async function criarProjecaoVisitas(data: InsertProjecaoVisitas): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [result] = await db.insert(projecoesVisitas).values(data);
  return result.insertId;
}

/**
 * Criar visitas planeadas para uma projeção
 */
export async function criarVisitasPlaneadas(visitas: InsertVisitaPlaneada[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  if (visitas.length > 0) {
    await db.insert(visitasPlaneadas).values(visitas);
  }
}

/**
 * Obter projeção de visitas atual do gestor
 */
export async function getProjecaoVisitasAtual(gestorId: number): Promise<ProjecaoVisitas | null> {
  const db = await getDb();
  if (!db) return null;
  
  const hoje = new Date();
  
  const [projecao] = await db
    .select()
    .from(projecoesVisitas)
    .where(
      and(
        eq(projecoesVisitas.gestorId, gestorId),
        gte(projecoesVisitas.semanaFim, hoje)
      )
    )
    .orderBy(desc(projecoesVisitas.createdAt))
    .limit(1);
  
  return projecao || null;
}

/**
 * Obter visitas planeadas de uma projeção
 */
export async function getVisitasPlaneadasPorProjecao(projecaoId: number): Promise<(VisitaPlaneada & { lojaNome: string })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const visitas = await db
    .select({
      id: visitasPlaneadas.id,
      projecaoId: visitasPlaneadas.projecaoId,
      lojaId: visitasPlaneadas.lojaId,
      dataVisita: visitasPlaneadas.dataVisita,
      horaInicio: visitasPlaneadas.horaInicio,
      horaFim: visitasPlaneadas.horaFim,
      motivo: visitasPlaneadas.motivo,
      prioridade: visitasPlaneadas.prioridade,
      detalheMotivo: visitasPlaneadas.detalheMotivo,
      estado: visitasPlaneadas.estado,
      linkGoogleCalendar: visitasPlaneadas.linkGoogleCalendar,
      linkOutlook: visitasPlaneadas.linkOutlook,
      linkICS: visitasPlaneadas.linkICS,
      createdAt: visitasPlaneadas.createdAt,
      updatedAt: visitasPlaneadas.updatedAt,
      lojaNome: lojas.nome,
    })
    .from(visitasPlaneadas)
    .innerJoin(lojas, eq(visitasPlaneadas.lojaId, lojas.id))
    .where(eq(visitasPlaneadas.projecaoId, projecaoId))
    .orderBy(visitasPlaneadas.dataVisita);
  
  return visitas;
}

/**
 * Atualizar estado de uma visita planeada
 */
export async function atualizarEstadoVisita(visitaId: number, estado: 'planeada' | 'confirmada' | 'realizada' | 'cancelada'): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(visitasPlaneadas)
    .set({ estado })
    .where(eq(visitasPlaneadas.id, visitaId));
}

/**
 * Atualizar links de calendário de uma visita
 */
export async function atualizarLinksCalendario(
  visitaId: number, 
  links: { linkGoogleCalendar?: string; linkOutlook?: string; linkICS?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(visitasPlaneadas)
    .set(links)
    .where(eq(visitasPlaneadas.id, visitaId));
}

/**
 * Obter histórico de projeções de um gestor
 */
export async function getHistoricoProjecoes(gestorId: number, limite: number = 10): Promise<ProjecaoVisitas[]> {
  const db = await getDb();
  if (!db) return [];
  
  const projecoes = await db
    .select()
    .from(projecoesVisitas)
    .where(eq(projecoesVisitas.gestorId, gestorId))
    .orderBy(desc(projecoesVisitas.createdAt))
    .limit(limite);
  
  return projecoes;
}

/**
 * Eliminar projeção de visitas e suas visitas associadas
 */
export async function eliminarProjecaoVisitas(projecaoId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Primeiro eliminar as visitas associadas
  await db.delete(visitasPlaneadas).where(eq(visitasPlaneadas.projecaoId, projecaoId));
  
  // Depois eliminar a projeção
  await db.delete(projecoesVisitas).where(eq(projecoesVisitas.id, projecaoId));
}


/**
 * Obter dados de priorização de TODAS as lojas (para admins)
 */
export async function getDadosPriorizacaoTodasLojas(): Promise<DadosPriorizacaoLoja[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Obter todas as lojas ativas
  const todasLojas = await db
    .select({
      lojaId: lojas.id,
      lojaNome: lojas.nome,
    })
    .from(lojas);
  
  const resultado: DadosPriorizacaoLoja[] = [];
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  
  for (const loja of todasLojas) {
    // Obter último relatório (visita) da loja
    const [ultimoRelatorio] = await db
      .select({ createdAt: relatoriosCompletos.createdAt })
      .from(relatoriosCompletos)
      .where(eq(relatoriosCompletos.lojaId, loja.lojaId))
      .orderBy(desc(relatoriosCompletos.createdAt))
      .limit(1);
    
    const ultimaVisita = ultimoRelatorio?.createdAt || null;
    const diasSemVisita = ultimaVisita 
      ? Math.floor((hoje.getTime() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24))
      : 365; // Se nunca visitou, assume 1 ano
    
    // Obter pendentes ativos da loja
    const pendentesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(pendentesLoja)
      .where(
        and(
          eq(pendentesLoja.lojaId, loja.lojaId),
          eq(pendentesLoja.estado, 'pendente')
        )
      );
    const pendentesAtivos = Number(pendentesResult[0]?.count || 0);
    
    // Obter resultados vs objetivo do mês atual
    const [resultadoMensal] = await db
      .select()
      .from(resultadosMensais)
      .where(
        and(
          eq(resultadosMensais.lojaId, loja.lojaId),
          eq(resultadosMensais.mes, mesAtual),
          eq(resultadosMensais.ano, anoAtual)
        )
      )
      .limit(1);
    
    let resultadoVsObjetivo = 100; // Default se não houver dados
    if (resultadoMensal && resultadoMensal.objetivoMensal && resultadoMensal.objetivoMensal > 0) {
      const totalServicos = resultadoMensal.totalServicos || 0;
      resultadoVsObjetivo = Math.round((totalServicos / resultadoMensal.objetivoMensal) * 100);
    }
    
    // Calcular pontuação de prioridade (quanto maior, mais prioritário)
    // Pesos: tempo sem visita (40%), pendentes (35%), resultados baixos (25%)
    const pontosTempo = Math.min(diasSemVisita * 2, 100); // Max 100 pontos
    const pontosPendentes = Math.min(pendentesAtivos * 10, 100); // Max 100 pontos
    const pontosResultados = Math.max(0, 100 - resultadoVsObjetivo); // Quanto menor o resultado, mais pontos
    
    const pontuacaoTotal = (pontosTempo * 0.4) + (pontosPendentes * 0.35) + (pontosResultados * 0.25);
    
    // Determinar motivo principal
    let motivo: 'tempo_sem_visita' | 'pendentes_ativos' | 'resultados_baixos' = 'tempo_sem_visita';
    let detalheMotivo = `${diasSemVisita} dias sem visita`;
    
    if (pontosPendentes * 0.35 > pontosTempo * 0.4 && pontosPendentes * 0.35 > pontosResultados * 0.25) {
      motivo = 'pendentes_ativos';
      detalheMotivo = `${pendentesAtivos} pendentes ativos`;
    } else if (pontosResultados * 0.25 > pontosTempo * 0.4 && pontosResultados * 0.25 > pontosPendentes * 0.35) {
      motivo = 'resultados_baixos';
      detalheMotivo = `${resultadoVsObjetivo}% do objetivo mensal`;
    }
    
    resultado.push({
      lojaId: loja.lojaId,
      lojaNome: loja.lojaNome,
      lojaCodigo: loja.lojaNome, // Usar nome como código (tabela não tem campo código)
      lojaEndereco: null, // Tabela não tem campo endereço
      diasSemVisita,
      ultimaVisita,
      pendentesAtivos,
      resultadoVsObjetivo,
      pontuacaoTotal,
      motivo,
      detalheMotivo,
    });
  }
  
  // Ordenar por pontuação (mais prioritário primeiro)
  resultado.sort((a, b) => b.pontuacaoTotal - a.pontuacaoTotal);
  
  return resultado;
}


/**
 * Apagar uma visita planeada individual
 */
export async function apagarVisitaPlaneada(visitaId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(visitasPlaneadas).where(eq(visitasPlaneadas.id, visitaId));
}

/**
 * Obter uma visita planeada por ID
 */
export async function getVisitaPlaneadaById(visitaId: number): Promise<VisitaPlaneada | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [visita] = await db
    .select()
    .from(visitasPlaneadas)
    .where(eq(visitasPlaneadas.id, visitaId))
    .limit(1);
  
  return visita || null;
}

/**
 * Atualizar a data de uma visita planeada
 */
export async function atualizarDataVisita(visitaId: number, novaData: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(visitasPlaneadas)
    .set({ dataVisita: novaData, updatedAt: new Date() })
    .where(eq(visitasPlaneadas.id, visitaId));
}


// ==================== RELAÇÕES ENTRE LOJAS ====================

/**
 * Criar uma relação entre duas lojas
 */
export async function criarRelacaoLojas(
  lojaPrincipalId: number,
  lojaRelacionadaId: number,
  gestorId?: number
): Promise<RelacaoLojas | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Verificar se já existe relação
  const [existente] = await db
    .select()
    .from(relacoesLojas)
    .where(
      and(
        eq(relacoesLojas.lojaPrincipalId, lojaPrincipalId),
        eq(relacoesLojas.lojaRelacionadaId, lojaRelacionadaId)
      )
    )
    .limit(1);
  
  if (existente) {
    // Se existe mas está inativa, reativar
    if (!existente.ativo) {
      await db
        .update(relacoesLojas)
        .set({ ativo: true, updatedAt: new Date() })
        .where(eq(relacoesLojas.id, existente.id));
      return { ...existente, ativo: true };
    }
    return existente;
  }
  
  const [result] = await db
    .insert(relacoesLojas)
    .values({
      lojaPrincipalId,
      lojaRelacionadaId,
      gestorId: gestorId || null,
    })
    .$returningId();
  
  const [novaRelacao] = await db
    .select()
    .from(relacoesLojas)
    .where(eq(relacoesLojas.id, result.id))
    .limit(1);
  
  return novaRelacao || null;
}

/**
 * Remover uma relação entre lojas (soft delete)
 */
export async function removerRelacaoLojas(relacaoId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(relacoesLojas)
    .set({ ativo: false, updatedAt: new Date() })
    .where(eq(relacoesLojas.id, relacaoId));
}

/**
 * Obter todas as lojas relacionadas com uma loja principal
 */
export async function getLojasRelacionadas(lojaPrincipalId: number): Promise<Array<{
  relacaoId: number;
  lojaId: number;
  lojaNome: string;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const relacoes = await db
    .select({
      relacaoId: relacoesLojas.id,
      lojaId: relacoesLojas.lojaRelacionadaId,
      lojaNome: lojas.nome,
    })
    .from(relacoesLojas)
    .innerJoin(lojas, eq(relacoesLojas.lojaRelacionadaId, lojas.id))
    .where(
      and(
        eq(relacoesLojas.lojaPrincipalId, lojaPrincipalId),
        eq(relacoesLojas.ativo, true)
      )
    );
  
  return relacoes;
}

/**
 * Obter a loja principal de uma loja relacionada
 * (para quando acedemos com token de uma loja e queremos ver outra relacionada)
 */
export async function getLojaPrincipalDeRelacionada(lojaRelacionadaId: number): Promise<{
  lojaPrincipalId: number;
  lojaPrincipalNome: string;
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [relacao] = await db
    .select({
      lojaPrincipalId: relacoesLojas.lojaPrincipalId,
      lojaPrincipalNome: lojas.nome,
    })
    .from(relacoesLojas)
    .innerJoin(lojas, eq(relacoesLojas.lojaPrincipalId, lojas.id))
    .where(
      and(
        eq(relacoesLojas.lojaRelacionadaId, lojaRelacionadaId),
        eq(relacoesLojas.ativo, true)
      )
    )
    .limit(1);
  
  return relacao || null;
}

/**
 * Obter todas as lojas acessíveis com um token (a própria + relacionadas)
 */
export async function getLojasAcessiveisComToken(lojaTokenId: number): Promise<Array<{
  lojaId: number;
  lojaNome: string;
  isPrincipal: boolean;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  // Obter a loja do token
  const [lojaPrincipal] = await db
    .select({ id: lojas.id, nome: lojas.nome })
    .from(lojas)
    .where(eq(lojas.id, lojaTokenId))
    .limit(1);
  
  if (!lojaPrincipal) return [];
  
  // Obter lojas relacionadas
  const relacionadas = await getLojasRelacionadas(lojaTokenId);
  
  // Combinar: loja principal + relacionadas
  const resultado: Array<{ lojaId: number; lojaNome: string; isPrincipal: boolean }> = [
    { lojaId: lojaPrincipal.id, lojaNome: lojaPrincipal.nome, isPrincipal: true }
  ];
  
  for (const rel of relacionadas) {
    resultado.push({
      lojaId: rel.lojaId,
      lojaNome: rel.lojaNome,
      isPrincipal: false
    });
  }
  
  return resultado;
}

/**
 * Obter todas as relações de lojas de um gestor
 */
export async function getRelacoesLojasByGestorId(gestorId: number): Promise<Array<{
  relacaoId: number;
  lojaPrincipalId: number;
  lojaPrincipalNome: string;
  lojaRelacionadaId: number;
  lojaRelacionadaNome: string;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  // Obter lojas do gestor
  const lojasGestor = await getLojasByGestorId(gestorId);
  const lojasIds = lojasGestor.map(l => l.id);
  
  if (lojasIds.length === 0) return [];
  
  // Obter relações onde a loja principal é do gestor
  const relacoes = await db
    .select({
      relacaoId: relacoesLojas.id,
      lojaPrincipalId: relacoesLojas.lojaPrincipalId,
      lojaRelacionadaId: relacoesLojas.lojaRelacionadaId,
    })
    .from(relacoesLojas)
    .where(
      and(
        inArray(relacoesLojas.lojaPrincipalId, lojasIds),
        eq(relacoesLojas.ativo, true)
      )
    );
  
  // Obter nomes das lojas
  const resultado = [];
  for (const rel of relacoes) {
    const [lojaPrincipal] = await db.select({ nome: lojas.nome }).from(lojas).where(eq(lojas.id, rel.lojaPrincipalId)).limit(1);
    const [lojaRelacionada] = await db.select({ nome: lojas.nome }).from(lojas).where(eq(lojas.id, rel.lojaRelacionadaId)).limit(1);
    
    resultado.push({
      relacaoId: rel.relacaoId,
      lojaPrincipalId: rel.lojaPrincipalId,
      lojaPrincipalNome: lojaPrincipal?.nome || 'Desconhecida',
      lojaRelacionadaId: rel.lojaRelacionadaId,
      lojaRelacionadaNome: lojaRelacionada?.nome || 'Desconhecida',
    });
  }
  
  return resultado;
}

/**
 * Obter todas as relações de lojas (para admin)
 */
export async function getAllRelacoesLojas(): Promise<Array<{
  relacaoId: number;
  lojaPrincipalId: number;
  lojaPrincipalNome: string;
  lojaRelacionadaId: number;
  lojaRelacionadaNome: string;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const relacoes = await db
    .select({
      relacaoId: relacoesLojas.id,
      lojaPrincipalId: relacoesLojas.lojaPrincipalId,
      lojaRelacionadaId: relacoesLojas.lojaRelacionadaId,
    })
    .from(relacoesLojas)
    .where(eq(relacoesLojas.ativo, true));
  
  // Obter nomes das lojas
  const resultado = [];
  for (const rel of relacoes) {
    const [lojaPrincipal] = await db.select({ nome: lojas.nome }).from(lojas).where(eq(lojas.id, rel.lojaPrincipalId)).limit(1);
    const [lojaRelacionada] = await db.select({ nome: lojas.nome }).from(lojas).where(eq(lojas.id, rel.lojaRelacionadaId)).limit(1);
    
    resultado.push({
      relacaoId: rel.relacaoId,
      lojaPrincipalId: rel.lojaPrincipalId,
      lojaPrincipalNome: lojaPrincipal?.nome || 'Desconhecida',
      lojaRelacionadaId: rel.lojaRelacionadaId,
      lojaRelacionadaNome: lojaRelacionada?.nome || 'Desconhecida',
    });
  }
  
  return resultado;
}
