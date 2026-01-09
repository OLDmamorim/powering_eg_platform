import React, { createContext, useContext, useState, useEffect } from 'react';
import pt from '@/lib/translations/pt.json';
import en from '@/lib/translations/en.json';

type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  pt,
  en,
};

/**
 * Função auxiliar para obter valor aninhado de um objeto usando notação de ponto
 * Ex: "reuniao.title" retorna translations.pt.reuniao.title
 */
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return path; // Retorna a chave se não encontrar a tradução
    }
  }
  
  return typeof value === 'string' ? value : path;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pt');
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar idioma do localStorage ao montar
  useEffect(() => {
    const savedLanguage = localStorage.getItem('portalLanguage') as Language | null;
    if (savedLanguage && (savedLanguage === 'pt' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage);
    }
    setIsLoaded(true);
  }, []);

  // Guardar idioma no localStorage quando muda
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('portalLanguage', lang);
  };

  // Função de tradução
  const t = (key: string): string => {
    return getNestedValue(translations[language], key);
  };

  if (!isLoaded) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook para usar o contexto de idioma
 * Uso: const { language, setLanguage, t } = useLanguage();
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
  }
  return context;
}
