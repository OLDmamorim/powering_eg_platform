import { useDemo } from "@/contexts/DemoContext";
import {
  demoLojas,
  demoGestores,
  demoRelatoriosLivres,
  demoRelatoriosCompletos,
  demoPendentes,
  demoAlertas,
  demoResultadosMensais,
  demoVendasComplementares,
  demoTotaisGlobais,
  demoEstatisticas,
  demoAtividadeRecente,
} from "@/lib/demoData";

// Hook genérico para substituir dados de query por dados demo
export function useDemoData<T>(
  realData: T | undefined,
  demoData: T,
  isLoading: boolean = false
): { data: T | undefined; isLoading: boolean; isDemo: boolean } {
  const { isDemo } = useDemo();
  
  return {
    data: isDemo ? demoData : realData,
    isLoading: isDemo ? false : isLoading,
    isDemo,
  };
}

// Hooks específicos para cada tipo de dados
export function useDemoLojas(realData: any[] | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoLojas, isLoading);
}

export function useDemoGestores(realData: any[] | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoGestores, isLoading);
}

export function useDemoRelatoriosLivres(realData: any[] | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoRelatoriosLivres, isLoading);
}

export function useDemoRelatoriosCompletos(realData: any[] | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoRelatoriosCompletos, isLoading);
}

export function useDemoPendentes(realData: any[] | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoPendentes, isLoading);
}

export function useDemoAlertas(realData: any[] | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoAlertas, isLoading);
}

export function useDemoResultados(realData: any[] | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoResultadosMensais, isLoading);
}

export function useDemoVendasComplementares(realData: any[] | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoVendasComplementares, isLoading);
}

export function useDemoTotaisGlobais(realData: any | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoTotaisGlobais, isLoading);
}

export function useDemoEstatisticas() {
  const { isDemo } = useDemo();
  return {
    data: isDemo ? demoEstatisticas : null,
    isDemo,
  };
}

export function useDemoAtividades(realData: any[] | undefined, isLoading: boolean = false) {
  return useDemoData(realData, demoAtividadeRecente, isLoading);
}

// Hook para verificar se deve usar autenticação demo
export function useDemoAuth() {
  const { isDemo, demoUser } = useDemo();
  
  return {
    isDemo,
    user: demoUser,
    isAuthenticated: isDemo ? true : undefined,
    loading: isDemo ? false : undefined,
  };
}
