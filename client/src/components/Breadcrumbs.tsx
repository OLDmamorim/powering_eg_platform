import { Link, useLocation } from "wouter";
import { ChevronRight, Home, Globe, ArrowLeft } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mapeamento de rotas para nomes legíveis (PT e EN)
const routeNames: Record<string, { pt: string; en: string }> = {
  "": { pt: "Dashboard", en: "Dashboard" },
  "dashboard": { pt: "Dashboard", en: "Dashboard" },
  "lojas": { pt: "Lojas", en: "Stores" },
  "gestores": { pt: "Gestores", en: "Managers" },
  "relatorios": { pt: "Relatórios", en: "Reports" },
  "relatorios-ia": { pt: "Relatórios IA", en: "AI Reports" },
  "relatorio-livre": { pt: "Relatório Livre", en: "Free Report" },
  "relatorio-completo": { pt: "Relatório Completo", en: "Complete Report" },
  "historico-pontos": { pt: "Histórico de Pontos", en: "Points History" },
  "alertas": { pt: "Alertas", en: "Alerts" },
  "configuracoes-alertas": { pt: "Config. Alertas", en: "Alert Settings" },
  "pendentes": { pt: "Pendentes", en: "Pending" },
};

export function Breadcrumbs() {
  const [location, setLocation] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  
  // Verificar se o utilizador é gestor ou admin (para mostrar botão Voltar ao Menu)
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'gestor';
  
  // Páginas que devem mostrar o botão "Voltar ao Menu"
  const pagesWithBackToMenu = ['/dashboard', '/assistente-ia', '/portal-gestor'];
  
  // Dividir o caminho em partes
  const pathParts = location.split("/").filter(Boolean);
  
  // Se estamos no dashboard, mostrar apenas o seletor de idioma
  const showBreadcrumbs = !(pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === "dashboard"));
  
  const getRouteName = (part: string) => {
    const route = routeNames[part];
    if (route) {
      return language === 'pt' ? route.pt : route.en;
    }
    return part;
  };
  
  // Verificar se deve mostrar o botão "Voltar ao Menu"
  const showBackToMenu = isManagerOrAdmin && pagesWithBackToMenu.includes(location);
  
  return (
    <div className="flex items-center justify-between mb-4">
      {/* Botão Voltar ao Menu + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Botão Voltar ao Menu - apenas em páginas internas para gestores/admins */}
        {showBackToMenu && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/menu')}
            className="h-8 px-3 text-xs font-medium gap-1 bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700 dark:hover:bg-violet-900/50"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="hidden sm:inline">{language === 'pt' ? 'Menu' : 'Menu'}</span>
          </Button>
        )}
        
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
            const name = getRouteName(part);
            
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
      </div>
      
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
