import { describe, it, expect } from 'vitest';
import { updateGestor, getAllGestores, getDb, createGestor, deleteGestor } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Update Gestor', () => {
  it('should update gestor name and email successfully', async () => {
    // Buscar um gestor existente
    const gestoresList = await getAllGestores();
    if (gestoresList.length === 0) {
      console.log('No gestores found, skipping test');
      return;
    }

    const testGestor = gestoresList[0];
    const originalName = testGestor.user.name;
    const originalEmail = testGestor.user.email;
    
    const newName = 'Test Updated Name ' + Date.now();
    const newEmail = `test.updated.${Date.now()}@expressglass.pt`;

    // Atualizar o gestor
    await updateGestor(testGestor.id, newName, newEmail);

    // Verificar que os dados foram atualizados
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const userAfter = await db.select().from(users).where(eq(users.id, testGestor.userId)).limit(1);
    expect(userAfter[0].name).toBe(newName);
    expect(userAfter[0].email).toBe(newEmail);

    // Reverter para os dados originais (cleanup)
    await updateGestor(testGestor.id, originalName, originalEmail);
  });

  it('should throw error when updating non-existent gestor', async () => {
    await expect(updateGestor(999999, 'Non Existent', 'nonexistent@test.com')).rejects.toThrow('Gestor not found');
  });

  it('should reflect updated data in gestores list', async () => {
    const gestoresList = await getAllGestores();
    if (gestoresList.length === 0) {
      console.log('No gestores found, skipping test');
      return;
    }

    const testGestor = gestoresList[0];
    const originalName = testGestor.user.name;
    const originalEmail = testGestor.user.email;
    
    const newName = 'List Test Name ' + Date.now();
    const newEmail = `list.test.${Date.now()}@expressglass.pt`;

    // Atualizar
    await updateGestor(testGestor.id, newName, newEmail);

    // Verificar na lista
    const gestoresListAfter = await getAllGestores();
    const updatedGestor = gestoresListAfter.find((g: any) => g.id === testGestor.id);
    
    expect(updatedGestor).toBeDefined();
    expect(updatedGestor?.user.name).toBe(newName);
    expect(updatedGestor?.user.email).toBe(newEmail);

    // Cleanup
    await updateGestor(testGestor.id, originalName, originalEmail);
  });
});
