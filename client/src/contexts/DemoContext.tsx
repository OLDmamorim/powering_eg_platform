import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isDemoMode, demoUser } from '@/lib/demoData';

interface DemoContextType {
  isDemo: boolean;
  setIsDemo: (value: boolean) => void;
  demoUser: typeof demoUser | null;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

interface DemoProviderProps {
  children: ReactNode;
}

export function DemoProvider({ children }: DemoProviderProps) {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Verificar se está em modo demo via URL
    const demoFromUrl = isDemoMode();
    setIsDemo(demoFromUrl);

    // Escutar mudanças na URL
    const handlePopState = () => {
      setIsDemo(isDemoMode());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const value: DemoContextType = {
    isDemo,
    setIsDemo,
    demoUser: isDemo ? demoUser : null,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextType {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}

// Hook para obter dados demo ou reais
export function useDemoData<T>(realData: T | undefined, demoData: T): T | undefined {
  const { isDemo } = useDemo();
  return isDemo ? demoData : realData;
}
