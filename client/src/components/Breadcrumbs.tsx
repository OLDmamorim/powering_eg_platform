import { Link, useLocation } from "wouter";
import { ChevronRight, Home, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { language, setLanguage, t } = useLanguage();
  
  // Dividir o caminho em partes
  const pathParts = location.split("/").filter(Boolean);
  
  // Se estamos no dashboard, mostrar apenas o seletor de idioma
  const showBreadcrumbs = !(pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === "dashboard"));
  
  return (
    <div className="flex items-center justify-between mb-4">
      {/* Breadcrumbs */}
      {showBreadcrumbs ? (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
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
      ) : (
        <div /> // Placeholder para manter o layout
      )}
      
      {/* Seletor de Idioma - Sempre visível no desktop */}
      <div className="hidden md:flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2">
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium">{language === 'pt' ? 'PT' : 'EN'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => setLanguage('pt')}
              className={language === 'pt' ? 'bg-accent' : ''}
            >
              <span className="mr-2">🇵🇹</span>
              Português
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setLanguage('en')}
              className={language === 'en' ? 'bg-accent' : ''}
            >
              <span className="mr-2">🇬🇧</span>
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
