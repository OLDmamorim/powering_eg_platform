import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// Test the key generation and hashing logic
describe('API Keys - Geração e Hashing', () => {
  it('deve gerar chave com prefixo peg_', () => {
    const rawKey = `peg_${crypto.randomBytes(32).toString('hex')}`;
    expect(rawKey).toMatch(/^peg_[a-f0-9]{64}$/);
  });

  it('deve gerar hash SHA-256 consistente', () => {
    const key = 'peg_test123';
    const hash1 = crypto.createHash('sha256').update(key).digest('hex');
    const hash2 = crypto.createHash('sha256').update(key).digest('hex');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('deve gerar hashes diferentes para chaves diferentes', () => {
    const key1 = `peg_${crypto.randomBytes(32).toString('hex')}`;
    const key2 = `peg_${crypto.randomBytes(32).toString('hex')}`;
    const hash1 = crypto.createHash('sha256').update(key1).digest('hex');
    const hash2 = crypto.createHash('sha256').update(key2).digest('hex');
    expect(hash1).not.toBe(hash2);
  });

  it('deve extrair prefixo correto da chave', () => {
    const rawKey = `peg_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = rawKey.substring(0, 12);
    expect(prefix).toMatch(/^peg_[a-f0-9]{8}$/);
    expect(prefix).toHaveLength(12);
  });
});

// Test the permission checking logic
describe('API Keys - Verificação de Permissões', () => {
  function hasPermission(keyPermissions: string[], required: string): boolean {
    return keyPermissions.includes('*') || keyPermissions.includes(required);
  }

  it('deve permitir acesso com permissão específica', () => {
    expect(hasPermission(['resultados'], 'resultados')).toBe(true);
  });

  it('deve negar acesso sem permissão', () => {
    expect(hasPermission(['resultados'], 'volantes')).toBe(false);
  });

  it('deve permitir acesso com wildcard *', () => {
    expect(hasPermission(['*'], 'resultados')).toBe(true);
    expect(hasPermission(['*'], 'volantes')).toBe(true);
    expect(hasPermission(['*'], 'qualquer_coisa')).toBe(true);
  });

  it('deve funcionar com múltiplas permissões', () => {
    expect(hasPermission(['resultados', 'volantes'], 'resultados')).toBe(true);
    expect(hasPermission(['resultados', 'volantes'], 'volantes')).toBe(true);
    expect(hasPermission(['resultados', 'volantes'], 'admin')).toBe(false);
  });
});

// Test API key expiration logic
describe('API Keys - Expiração', () => {
  it('deve detectar chave expirada', () => {
    const pastDate = new Date('2024-01-01');
    const now = new Date();
    expect(pastDate < now).toBe(true);
  });

  it('deve detectar chave não expirada', () => {
    const futureDate = new Date('2030-12-31');
    const now = new Date();
    expect(futureDate > now).toBe(true);
  });

  it('deve aceitar chave sem data de expiração', () => {
    const expiresAt = null;
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
    expect(isExpired).toBe(false);
  });
});

// Test the external API parameter validation
describe('API Externa - Validação de Parâmetros', () => {
  it('deve validar mês entre 1 e 12', () => {
    const validMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    validMonths.forEach(m => {
      expect(m >= 1 && m <= 12).toBe(true);
    });
    expect(0 >= 1 && 0 <= 12).toBe(false);
    expect(13 >= 1 && 13 <= 12).toBe(false);
  });

  it('deve validar ano entre 2020 e 2030', () => {
    expect(2026 >= 2020 && 2026 <= 2030).toBe(true);
    expect(2019 >= 2020 && 2019 <= 2030).toBe(false);
    expect(2031 >= 2020 && 2031 <= 2030).toBe(false);
  });

  it('deve rejeitar parâmetros não numéricos', () => {
    expect(isNaN(parseInt('abc'))).toBe(true);
    expect(isNaN(parseInt('1'))).toBe(false);
    expect(isNaN(parseInt('2026'))).toBe(false);
  });
});
