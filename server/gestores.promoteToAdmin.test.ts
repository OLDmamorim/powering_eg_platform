import { describe, it, expect } from 'vitest';
import { promoteGestorToAdmin, getAllGestores, getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Promote Gestor to Admin', () => {
  it('should promote gestor to admin successfully', async () => {
    // Buscar um gestor existente (assumindo que há pelo menos um)
    const gestoresList = await getAllGestores();
    if (gestoresList.length === 0) {
      console.log('No gestores found, skipping test');
      return;
    }

    const testGestor = gestoresList.find((g: any) => g.user.role === 'gestor');
    if (!testGestor) {
      console.log('No gestor with role "gestor" found, skipping test');
      return;
    }

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Verificar role inicial (deve ser 'gestor')
    const userBefore = await db.select().from(users).where(eq(users.id, testGestor.userId)).limit(1);
    expect(userBefore[0].role).toBe('gestor');

    // Promover a admin
    await promoteGestorToAdmin(testGestor.id);

    // Verificar role após promoção (deve ser 'admin')
    const userAfter = await db.select().from(users).where(eq(users.id, testGestor.userId)).limit(1);
    expect(userAfter[0].role).toBe('admin');

    // Reverter para gestor (cleanup)
    await db.update(users).set({ role: 'gestor' }).where(eq(users.id, testGestor.userId));
  });

  it('should throw error when promoting non-existent gestor', async () => {
    await expect(promoteGestorToAdmin(999999)).rejects.toThrow('Gestor não encontrado');
  });

  it('should reflect admin role in gestores list after promotion', async () => {
    const gestoresList = await getAllGestores();
    if (gestoresList.length === 0) {
      console.log('No gestores found, skipping test');
      return;
    }

    const testGestor = gestoresList.find((g: any) => g.user.role === 'gestor');
    if (!testGestor) {
      console.log('No gestor with role "gestor" found, skipping test');
      return;
    }

    // Promover
    await promoteGestorToAdmin(testGestor.id);

    // Verificar na lista
    const gestoresListAfter = await getAllGestores();
    const promotedGestor = gestoresListAfter.find((g: any) => g.id === testGestor.id);
    
    expect(promotedGestor).toBeDefined();
    expect(promotedGestor?.user.role).toBe('admin');

    // Cleanup
    const db = await getDb();
    if (db) {
      await db.update(users).set({ role: 'gestor' }).where(eq(users.id, testGestor.userId));
    }
  });
});
