import { describe, it, expect, beforeEach, vi } from 'vitest';
import pt from '@/lib/translations/pt.json';
import en from '@/lib/translations/en.json';

describe('Translations', () => {
  it('should have matching keys between PT and EN translations', () => {
    const getKeys = (obj: any, prefix = ''): string[] => {
      let keys: string[] = [];
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          keys = keys.concat(getKeys(obj[key], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    };

    const ptKeys = getKeys(pt).sort();
    const enKeys = getKeys(en).sort();

    expect(ptKeys).toEqual(enKeys);
  });

  it('should have all required translation sections', () => {
    const requiredSections = ['portal', 'tabs', 'reuniao', 'pendentes', 'historico', 'tarefas', 'common'];
    
    for (const section of requiredSections) {
      expect(pt).toHaveProperty(section);
      expect(en).toHaveProperty(section);
    }
  });

  it('should have portal section with required keys', () => {
    const requiredKeys = ['title', 'welcome', 'logout', 'language', 'portuguese', 'english'];
    
    for (const key of requiredKeys) {
      expect(pt.portal).toHaveProperty(key);
      expect(en.portal).toHaveProperty(key);
    }
  });

  it('should have tabs section with required keys', () => {
    const requiredKeys = ['reuniao', 'pendentes', 'historico', 'tarefas'];
    
    for (const key of requiredKeys) {
      expect(pt.tabs).toHaveProperty(key);
      expect(en.tabs).toHaveProperty(key);
    }
  });

  it('should have common section with required keys', () => {
    const requiredKeys = ['carregando', 'erro', 'sucesso', 'confirmar', 'cancelar', 'guardar'];
    
    for (const key of requiredKeys) {
      expect(pt.common).toHaveProperty(key);
      expect(en.common).toHaveProperty(key);
    }
  });

  it('should have non-empty translation values', () => {
    const checkValues = (obj: any, path = ''): boolean => {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (!checkValues(obj[key], fullPath)) return false;
        } else if (typeof obj[key] === 'string') {
          if (obj[key].trim() === '') {
            console.error(`Empty translation at ${fullPath}`);
            return false;
          }
        }
      }
      return true;
    };

    expect(checkValues(pt)).toBe(true);
    expect(checkValues(en)).toBe(true);
  });
});
