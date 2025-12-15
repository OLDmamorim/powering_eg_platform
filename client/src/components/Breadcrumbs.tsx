import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";

// Mapeamento de rotas para nomes legíveis
const routeNames: Record<string, string> = {
  "": "Dashboard",
  "dashboard": "Dashboard",
  "lojas": "Lojas",
  "gestores": "Gestores",
  "relatorios": "Relatórios",
  "relatorios-ia": "Relatórios IA",
  "relatorio-livre": "Relatório Livre",
  "relatorio-completo": "Relatório Completo",
  "historico-pontos": "Histórico de Pontos",
  "alertas": "Alertas",
  "configuracoes-alertas": "Config. Alertas",
  "pendentes": "Pendentes",
};

export function Breadcrumbs() {
  const [location] = useLocation();
  
  // Dividir o caminho em partes
  const pathParts = location.split("/").filter(Boolean);
  
  // Se estamos no dashboard, não mostrar breadcrumbs
  if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === "dashboard")) {
    return null;
  }
  
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
        <span>Dashboard</span>
      </Link>
      
      {pathParts.map((part, index) => {
        const path = "/" + pathParts.slice(0, index + 1).join("/");
        const isLast = index === pathParts.length - 1;
        const name = routeNames[part] || part;
        
        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground">{name}</span>
            ) : (
              <Link href={path} className="hover:text-foreground transition-colors">
                {name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
