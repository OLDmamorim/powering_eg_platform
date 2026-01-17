import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  TrendingDown, 
  ListTodo,
  RefreshCw,
  ChevronRight,
  CalendarPlus,
  ExternalLink,
  Sparkles,
  Route,
  Building2,
  CheckCircle2,
  XCircle,
  Download,
  ChevronUp,
  ChevronDown,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

// Ícone do Google Calendar
function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z" fill="#4285F4"/>
      <path d="M4 9H20V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V9Z" fill="#FFFFFF"/>
      <rect x="7" y="11" width="3" height="3" fill="#EA4335"/>
      <rect x="10.5" y="11" width="3" height="3" fill="#FBBC04"/>
      <rect x="14" y="11" width="3" height="3" fill="#34A853"/>
      <rect x="7" y="14.5" width="3" height="3" fill="#4285F4"/>
      <rect x="10.5" y="14.5" width="3" height="3" fill="#EA4335"/>
      <rect x="14" y="14.5" width="3" height="3" fill="#FBBC04"/>
    </svg>
  );
}

// Ícone do Outlook
function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 6L12 13L2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" fill="#0078D4"/>
      <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6L12 13L22 6Z" fill="#0078D4"/>
    </svg>
  );
}

// Ícone do Apple Calendar
function AppleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="16" rx="2" fill="#FF3B30"/>
      <rect x="3" y="8" width="18" height="12" rx="0" fill="#FFFFFF"/>
      <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#FF3B30">
        {new Date().getDate()}
      </text>
    </svg>
  );
}

interface VisitaSugerida {
  id: number;
  lojaId: number;
  lojaNome: string;
  dataVisita: Date | string;
  horaInicio: string | null;
  horaFim: string | null;
  motivo: 'tempo_sem_visita' | 'pendentes_ativos' | 'resultados_baixos' | 'manual';
  prioridade: number;
  detalheMotivo: string | null;
  estado: 'planeada' | 'confirmada' | 'realizada' | 'cancelada';
  linkGoogleCalendar?: string | null;
  linkOutlook?: string | null;
  linkICS?: string | null;
}

export function ProjecaoVisitas() {
  const { language } = useLanguage();
  const [showGerarDialog, setShowGerarDialog] = useState(false);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState<VisitaSugerida | null>(null);
  const [tipoPeriodo, setTipoPeriodo] = useState<'esta_semana' | 'proxima_semana'>('esta_semana');
  
  const utils = trpc.useUtils();
  
  // Query para obter projeção atual
  const { data: projecaoAtual, isLoading: projecaoLoading } = trpc.projecaoVisitas.atual.useQuery();
  
  // Query para obter visitas da projeção
  const { data: visitas, isLoading: visitasLoading } = trpc.projecaoVisitas.getVisitas.useQuery(
    { projecaoId: projecaoAtual?.id || 0 },
    { enabled: !!projecaoAtual?.id }
  );
  
  // Query para dados de priorização (preview)
  const { data: dadosPriorizacao } = trpc.projecaoVisitas.getDadosPriorizacao.useQuery();
  
  // Mutation para gerar projeção
  const gerarMutation = trpc.projecaoVisitas.gerar.useMutation({
    onSuccess: () => {
      utils.projecaoVisitas.atual.invalidate();
      utils.projecaoVisitas.getVisitas.invalidate();
      setShowGerarDialog(false);
      toast.success(language === 'pt' ? 'Projeção de visitas gerada com sucesso!' : 'Visit projection generated successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  // Mutation para gerar links de calendário
  const gerarLinksMutation = trpc.projecaoVisitas.gerarLinksCalendario.useMutation({
    onSuccess: (links) => {
      utils.projecaoVisitas.getVisitas.invalidate();
      if (selectedVisita) {
        setSelectedVisita({
          ...selectedVisita,
          linkGoogleCalendar: links.linkGoogleCalendar,
          linkOutlook: links.linkOutlook,
          linkICS: links.linkICS,
        });
      }
    }
  });
  
  // Mutation para eliminar projeção
  const eliminarMutation = trpc.projecaoVisitas.eliminar.useMutation({
    onSuccess: () => {
      utils.projecaoVisitas.atual.invalidate();
      utils.projecaoVisitas.getVisitas.invalidate();
      toast.success(language === 'pt' ? 'Projeção eliminada' : 'Projection deleted');
    }
  });
  
  // Mutation para exportar semana completa em ICS
  const exportarSemanaMutation = trpc.projecaoVisitas.exportarSemanaICS.useMutation({
    onSuccess: (data) => {
      // Criar blob e fazer download
      const blob = new Blob([data.icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(language === 'pt' 
        ? `${data.totalVisitas} visitas exportadas para o calendário!` 
        : `${data.totalVisitas} visits exported to calendar!`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  // Mutation para mover visita para cima
  const moverParaCimaMutation = trpc.projecaoVisitas.moverParaCima.useMutation({
    onSuccess: () => {
      utils.projecaoVisitas.getVisitas.invalidate();
      toast.success(language === 'pt' ? 'Visita movida para cima' : 'Visit moved up');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  // Mutation para mover visita para baixo
  const moverParaBaixoMutation = trpc.projecaoVisitas.moverParaBaixo.useMutation({
    onSuccess: () => {
      utils.projecaoVisitas.getVisitas.invalidate();
      toast.success(language === 'pt' ? 'Visita movida para baixo' : 'Visit moved down');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  // Mutation para apagar visita individual
  const apagarVisitaMutation = trpc.projecaoVisitas.apagarVisita.useMutation({
    onSuccess: () => {
      utils.projecaoVisitas.getVisitas.invalidate();
      toast.success(language === 'pt' ? 'Visita removida' : 'Visit removed');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const handleGerarProjecao = () => {
    gerarMutation.mutate({ tipoPeriodo });
  };
  
  const handleOpenCalendarDialog = (visita: VisitaSugerida) => {
    setSelectedVisita(visita);
    setShowCalendarDialog(true);
    
    // Gerar links se ainda não existirem
    if (!visita.linkGoogleCalendar) {
      gerarLinksMutation.mutate({
        visitaId: visita.id,
        lojaId: visita.lojaId,
        lojaNome: visita.lojaNome,
        lojaEndereco: undefined,
        dataVisita: typeof visita.dataVisita === 'string' ? visita.dataVisita : visita.dataVisita.toISOString(),
        horaInicio: visita.horaInicio || '09:00',
        horaFim: visita.horaFim || '12:00',
        motivo: visita.detalheMotivo || getMotivoLabel(visita.motivo),
      });
    }
  };
  
  const getMotivoIcon = (motivo: string) => {
    switch (motivo) {
      case 'tempo_sem_visita':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pendentes_ativos':
        return <ListTodo className="h-4 w-4 text-amber-500" />;
      case 'resultados_baixos':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getMotivoLabel = (motivo: string) => {
    const labels: Record<string, { pt: string; en: string }> = {
      tempo_sem_visita: { pt: 'Tempo sem visita', en: 'Time without visit' },
      pendentes_ativos: { pt: 'Pendentes ativos', en: 'Active pending items' },
      resultados_baixos: { pt: 'Resultados baixos', en: 'Low results' },
      manual: { pt: 'Manual', en: 'Manual' },
    };
    return labels[motivo]?.[language] || motivo;
  };
  
  const getMotivoBadgeColor = (motivo: string) => {
    switch (motivo) {
      case 'tempo_sem_visita':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case 'pendentes_ativos':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
      case 'resultados_baixos':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300';
    }
  };
  
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };
  
  const formatShortDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };
  
  const isLoading = projecaoLoading || visitasLoading;
  
  return (
    <>
      <Card className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/50 dark:via-purple-950/50 dark:to-fuchsia-950/50 border-violet-200 dark:border-violet-800 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex-shrink-0">
                <Route className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  {language === 'pt' ? 'Projeção de Visitas' : 'Visit Projection'}
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </CardTitle>
                <CardDescription className="text-violet-600/70 dark:text-violet-400/70 text-sm">
                  {language === 'pt' 
                    ? 'Agenda inteligente baseada em prioridades' 
                    : 'Smart schedule based on priorities'}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end flex-wrap">
              {projecaoAtual && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      exportarSemanaMutation.mutate({ projecaoId: projecaoAtual.id }); 
                    }}
                    disabled={exportarSemanaMutation.isPending}
                    className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {language === 'pt' ? 'Exportar Semana' : 'Export Week'}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); eliminarMutation.mutate({ projecaoId: projecaoAtual.id }); }}
                    disabled={eliminarMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                onClick={() => setShowGerarDialog(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
                size="sm"
              >
                <CalendarPlus className="h-4 w-4" />
                <span className="whitespace-nowrap">
                  {projecaoAtual 
                    ? (language === 'pt' ? 'Nova Projeção' : 'New Projection')
                    : (language === 'pt' ? 'Gerar Projeção' : 'Generate Projection')}
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : projecaoAtual && visitas && visitas.length > 0 ? (
            <div className="space-y-3">
              {/* Header com período */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-violet-200 dark:border-violet-800">
                <div className="flex flex-wrap items-center gap-2 text-sm text-violet-600 dark:text-violet-400">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">
                    {projecaoAtual.tipoPeriodo === 'esta_semana' 
                      ? (language === 'pt' ? 'Esta Semana' : 'This Week')
                      : (language === 'pt' ? 'Próxima Semana' : 'Next Week')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({new Date(projecaoAtual.semanaInicio).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { day: '2-digit', month: '2-digit' })} - {new Date(projecaoAtual.semanaFim).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { day: '2-digit', month: '2-digit' })})
                  </span>
                </div>
                <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 flex-shrink-0">
                  {visitas.length} {language === 'pt' ? 'visitas' : 'visits'}
                </Badge>
              </div>
              
              {/* Lista de visitas */}
              <div className="space-y-2">
                {visitas.map((visita, index) => (
                  <div
                    key={visita.id}
                    className="p-3 bg-white/60 dark:bg-white/5 rounded-lg border border-violet-100 dark:border-violet-800/50 hover:shadow-md transition-all group"
                  >
                    {/* Layout mobile-first */}
                    <div className="flex items-start gap-2">
                      {/* Botões de reordenar */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-violet-500 hover:text-violet-700 hover:bg-violet-100 disabled:opacity-30"
                          disabled={index === 0 || moverParaCimaMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (projecaoAtual) {
                              moverParaCimaMutation.mutate({ visitaId: visita.id, projecaoId: projecaoAtual.id });
                            }
                          }}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-violet-500 hover:text-violet-700 hover:bg-violet-100 disabled:opacity-30"
                          disabled={index === visitas.length - 1 || moverParaBaixoMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (projecaoAtual) {
                              moverParaBaixoMutation.mutate({ visitaId: visita.id, projecaoId: projecaoAtual.id });
                            }
                          }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Número de prioridade */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      
                      {/* Info da visita - clicável para abrir calendário */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleOpenCalendarDialog(visita as VisitaSugerida)}
                      >
                        {/* Nome da loja - sempre visível completo */}
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 flex-shrink-0 text-violet-500" />
                          <span className="font-medium text-violet-900 dark:text-violet-100">
                            {visita.lojaNome}
                          </span>
                        </div>
                        
                        {/* Data e hora */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatShortDate(visita.dataVisita)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {visita.horaInicio || '09:00'} - {visita.horaFim || '12:00'}
                          </span>
                        </div>
                        
                        {/* Badge de motivo - em linha separada no mobile */}
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={`text-xs ${getMotivoBadgeColor(visita.motivo)}`}>
                            {getMotivoIcon(visita.motivo)}
                            <span className="ml-1">{visita.detalheMotivo || getMotivoLabel(visita.motivo)}</span>
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-violet-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                      
                      {/* Botão de apagar */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                        disabled={apagarVisitaMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(language === 'pt' ? 'Tem a certeza que quer remover esta visita?' : 'Are you sure you want to remove this visit?')) {
                            apagarVisitaMutation.mutate({ visitaId: visita.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-4 bg-violet-100 dark:bg-violet-900/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Route className="h-8 w-8 text-violet-500" />
              </div>
              <h3 className="font-medium text-violet-700 dark:text-violet-300 mb-2">
                {language === 'pt' ? 'Nenhuma projeção ativa' : 'No active projection'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                {language === 'pt' 
                  ? 'Gere uma projeção de visitas para receber sugestões inteligentes de quais lojas visitar.' 
                  : 'Generate a visit projection to receive smart suggestions on which stores to visit.'}
              </p>
              
              {/* Preview de priorização */}
              {dadosPriorizacao && dadosPriorizacao.length > 0 && (
                <div className="mt-4 p-3 bg-white/60 dark:bg-white/5 rounded-lg border border-violet-100 dark:border-violet-800/50">
                  <p className="text-xs text-muted-foreground mb-2">
                    {language === 'pt' ? 'Lojas prioritárias:' : 'Priority stores:'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {dadosPriorizacao.slice(0, 3).map((loja, i) => (
                      <Badge key={loja.lojaId} variant="outline" className="text-xs">
                        {i + 1}. {loja.lojaNome}
                      </Badge>
                    ))}
                    {dadosPriorizacao.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{dadosPriorizacao.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              <Button
                onClick={() => setShowGerarDialog(true)}
                className="mt-4 bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                <CalendarPlus className="h-4 w-4" />
                {language === 'pt' ? 'Gerar Projeção de Visitas' : 'Generate Visit Projection'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog para gerar projeção */}
      <Dialog open={showGerarDialog} onOpenChange={setShowGerarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-violet-600" />
              {language === 'pt' ? 'Gerar Projeção de Visitas' : 'Generate Visit Projection'}
            </DialogTitle>
            <DialogDescription>
              {language === 'pt' 
                ? 'Escolha o período para gerar sugestões de visitas baseadas nas prioridades das suas lojas.' 
                : 'Choose the period to generate visit suggestions based on your stores priorities.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTipoPeriodo('esta_semana')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  tipoPeriodo === 'esta_semana'
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
                }`}
              >
                <Calendar className="h-6 w-6 mx-auto mb-2 text-violet-600" />
                <p className="font-medium text-sm">
                  {language === 'pt' ? 'Esta Semana' : 'This Week'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'pt' ? 'Dias restantes' : 'Remaining days'}
                </p>
              </button>
              
              <button
                onClick={() => setTipoPeriodo('proxima_semana')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  tipoPeriodo === 'proxima_semana'
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
                }`}
              >
                <Calendar className="h-6 w-6 mx-auto mb-2 text-violet-600" />
                <p className="font-medium text-sm">
                  {language === 'pt' ? 'Próxima Semana' : 'Next Week'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'pt' ? 'Segunda a Sexta' : 'Monday to Friday'}
                </p>
              </button>
            </div>
            
            {/* Info sobre priorização */}
            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
              <p className="text-xs text-violet-700 dark:text-violet-300 font-medium mb-2">
                {language === 'pt' ? 'Critérios de priorização:' : 'Prioritization criteria:'}
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">1</span>
                  {language === 'pt' ? 'Lojas menos visitadas' : 'Least visited stores'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-[10px]">2</span>
                  {language === 'pt' ? 'Mais pendentes por resolver' : 'Most pending issues'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-[10px]">3</span>
                  {language === 'pt' ? 'Resultados mais baixos' : 'Lowest results'}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGerarDialog(false)}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleGerarProjecao}
              disabled={gerarMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {gerarMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {language === 'pt' ? 'Gerar Projeção' : 'Generate Projection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para adicionar ao calendário */}
      <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-violet-600" />
              {language === 'pt' ? 'Adicionar ao Calendário' : 'Add to Calendar'}
            </DialogTitle>
            <DialogDescription>
              {selectedVisita && (
                <span>
                  {language === 'pt' ? 'Visita a' : 'Visit to'} <strong>{selectedVisita.lojaNome}</strong> - {formatDate(selectedVisita.dataVisita)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVisita && (
            <div className="space-y-4 py-4">
              {/* Detalhes da visita */}
              <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-violet-600" />
                  <span className="font-medium">{selectedVisita.lojaNome}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(selectedVisita.dataVisita)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{selectedVisita.horaInicio || '09:00'} - {selectedVisita.horaFim || '12:00'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getMotivoBadgeColor(selectedVisita.motivo)}`}>
                    {getMotivoIcon(selectedVisita.motivo)}
                    <span className="ml-1">{selectedVisita.detalheMotivo || getMotivoLabel(selectedVisita.motivo)}</span>
                  </Badge>
                </div>
              </div>
              
              {/* Botões de calendário */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-center mb-3">
                  {language === 'pt' ? 'Escolha o calendário:' : 'Choose calendar:'}
                </p>
                
                {gerarLinksMutation.isPending ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-5 w-5 animate-spin text-violet-500" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {language === 'pt' ? 'A gerar links...' : 'Generating links...'}
                    </span>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {/* Google Calendar */}
                    <a
                      href={selectedVisita.linkGoogleCalendar || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!selectedVisita.linkGoogleCalendar ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <GoogleCalendarIcon className="h-6 w-6" />
                      <span className="font-medium">Google Calendar</span>
                      <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                    </a>
                    
                    {/* Outlook */}
                    <a
                      href={selectedVisita.linkOutlook || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!selectedVisita.linkOutlook ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <OutlookIcon className="h-6 w-6" />
                      <span className="font-medium">Outlook</span>
                      <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                    </a>
                    
                    {/* Apple Calendar (ICS) */}
                    <a
                      href={selectedVisita.linkICS || '#'}
                      download={`visita-${selectedVisita.lojaNome.replace(/\s+/g, '-')}.ics`}
                      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!selectedVisita.linkICS ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <AppleCalendarIcon className="h-6 w-6" />
                      <span className="font-medium">Apple Calendar / iCal</span>
                      <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalendarDialog(false)}>
              {language === 'pt' ? 'Fechar' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
