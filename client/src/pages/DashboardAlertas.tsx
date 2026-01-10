import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, CheckCircle, Clock, Store, Calendar, FileText, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

type AlertaTipo = "pontos_negativos_consecutivos" | "pendentes_antigos" | "sem_visitas";

const tipoLabels: Record<AlertaTipo, { label: string; icon: React.ReactNode; color: string }> = {
  pontos_negativos_consecutivos: {
    label: "Pontos Negativos Consecutivos",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  },
  pendentes_antigos: {
    label: "Pendentes Antigos",
    icon: <Clock className="h-4 w-4" />,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
  },
  sem_visitas: {
    label: "Sem Visitas Recentes",
    icon: <Calendar className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
  }
};

export default function DashboardAlertas() {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("pendentes");
  const [selectedAlerta, setSelectedAlerta] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notasResolucao, setNotasResolucao] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  
  const utils = trpc.useUtils();
  
  const { data: alertasPendentes, isLoading: loadingPendentes } = trpc.alertas.listPendentes.useQuery();
  const { data: todosAlertas, isLoading: loadingTodos } = trpc.alertas.list.useQuery();
  
  const updateEstadoMutation = trpc.alertas.updateEstado.useMutation({
    onSuccess: () => {
      utils.alertas.list.invalidate();
      utils.alertas.listPendentes.invalidate();
      toast.success(language === 'pt' ? "Estado do alerta atualizado com sucesso" : "Alert status updated successfully");
      setDialogOpen(false);
      setNotasResolucao("");
      setSelectedAlerta(null);
    },
    onError: (error) => {
      toast.error((language === 'pt' ? "Erro ao atualizar alerta: " : "Error updating alert: ") + error.message);
    }
  });
  
  const deleteMutation = trpc.alertas.delete.useMutation({
    onSuccess: () => {
      utils.alertas.list.invalidate();
      utils.alertas.listPendentes.invalidate();
      toast.success(language === 'pt' ? "Alerta eliminado com sucesso" : "Alert deleted successfully");
    },
    onError: (error) => {
      toast.error((language === 'pt' ? "Erro ao eliminar alerta: " : "Error deleting alert: ") + error.message);
    }
  });
  
  const handleResolver = (alerta: any) => {
    setSelectedAlerta(alerta);
    setIsResolving(true);
    setDialogOpen(true);
  };
  
  const handleReabrir = (alerta: any) => {
    setSelectedAlerta(alerta);
    setIsResolving(false);
    setDialogOpen(true);
  };
  
  const handleConfirm = () => {
    if (!selectedAlerta) return;
    
    updateEstadoMutation.mutate({
      id: selectedAlerta.id,
      estado: isResolving ? "resolvido" : "pendente",
      notasResolucao: isResolving ? notasResolucao : undefined
    });
  };
  
  const handleDelete = (id: number) => {
    if (confirm(language === 'pt' ? "Tem a certeza que deseja eliminar este alerta?" : "Are you sure you want to delete this alert?")) {
      deleteMutation.mutate({ id });
    }
  };
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const alertasResolvidos = todosAlertas?.filter(a => a.estado === "resolvido") || [];
  
  const renderAlertaCard = (alerta: any, showActions: boolean = true) => {
    const tipoInfo = tipoLabels[alerta.tipo as AlertaTipo];
    const isPendente = alerta.estado === "pendente";
    
    return (
      <Card key={alerta.id} className={`${isPendente ? 'border-amber-200/50 dark:border-amber-800/30' : 'border-green-200/50 dark:border-green-800/30'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4" />
                {alerta.lojaNome}
              </CardTitle>
              <Badge className={tipoInfo.color}>
                {tipoInfo.icon}
                <span className="ml-1">{tipoInfo.label}</span>
              </Badge>
            </div>
            <Badge variant={isPendente ? "outline" : "default"} className={isPendente ? "border-amber-500 text-amber-600" : "bg-green-600"}>
              {isPendente ? (
                <><Clock className="h-3 w-3 mr-1" /> Pendente</>
              ) : (
                <><CheckCircle className="h-3 w-3 mr-1" /> Resolvido</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{alerta.descricao}</p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Criado: {formatDate(alerta.createdAt)}
            </span>
            {alerta.dataResolucao && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Resolvido: {formatDate(alerta.dataResolucao)}
              </span>
            )}
          </div>
          
          {alerta.notasResolucao && (
            <div className="p-2 bg-muted/50 rounded-md">
              <p className="text-xs font-medium mb-1">Notas de Resolução:</p>
              <p className="text-xs text-muted-foreground">{alerta.notasResolucao}</p>
            </div>
          )}
          
          {showActions && (
            <div className="flex gap-2 pt-2">
              {isPendente ? (
                <Button size="sm" onClick={() => handleResolver(alerta)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Marcar como Resolvido
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => handleReabrir(alerta)}>
                  <Clock className="h-4 w-4 mr-1" />
                  Reabrir
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(alerta.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Alertas</h1>
          <p className="text-muted-foreground">
            Gestão de alertas automáticos gerados pelo sistema
          </p>
        </div>
        
        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Alertas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {loadingPendentes ? <Skeleton className="h-8 w-12" /> : alertasPendentes?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">A aguardar resolução</p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Alertas Resolvidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {loadingTodos ? <Skeleton className="h-8 w-12" /> : alertasResolvidos.length}
              </div>
              <p className="text-xs text-muted-foreground">Total resolvidos</p>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Total de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {loadingTodos ? <Skeleton className="h-8 w-12" /> : todosAlertas?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Histórico completo</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="pendentes" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendentes ({alertasPendentes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Todos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pendentes" className="mt-6">
            {loadingPendentes ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : alertasPendentes && alertasPendentes.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {alertasPendentes.map(alerta => renderAlertaCard(alerta))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-600" />
                    <p className="font-medium">Nenhum alerta pendente</p>
                    <p className="text-sm">Todas as situações estão resolvidas</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="todos" className="mt-6">
            {loadingTodos ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : todosAlertas && todosAlertas.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {todosAlertas.map(alerta => renderAlertaCard(alerta))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhum alerta registado</p>
                    <p className="text-sm">Os alertas são gerados automaticamente pelo sistema</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Dialog de Resolução */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isResolving ? "Marcar Alerta como Resolvido" : "Reabrir Alerta"}
              </DialogTitle>
              <DialogDescription>
                {isResolving 
                  ? "Adicione notas sobre como o problema foi resolvido (opcional)"
                  : "O alerta será reaberto e ficará novamente pendente"
                }
              </DialogDescription>
            </DialogHeader>
            
            {selectedAlerta && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="font-medium">{selectedAlerta.lojaNome}</p>
                  <p className="text-sm text-muted-foreground">{selectedAlerta.descricao}</p>
                </div>
                
                {isResolving && (
                  <div>
                    <label className="text-sm font-medium">Notas de Resolução</label>
                    <Textarea
                      value={notasResolucao}
                      onChange={(e) => setNotasResolucao(e.target.value)}
                      placeholder="Descreva como o problema foi resolvido..."
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={updateEstadoMutation.isPending}
                className={isResolving ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {updateEstadoMutation.isPending ? "A processar..." : isResolving ? "Marcar como Resolvido" : "Reabrir Alerta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
