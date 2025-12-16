import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Calendar, MapPin, Clock, CheckCircle, AlertTriangle, RefreshCw, Sparkles, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function PlanoVisitas() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isGestor = user?.role === "gestor";

  // Queries para gestores
  const { data: planoAtual, isLoading: planoAtualLoading, refetch: refetchPlanoAtual } = trpc.planosVisitas.atual.useQuery(undefined, { enabled: isGestor });
  const { data: planoProximaSemana, isLoading: planoProximoLoading, refetch: refetchPlanoProximo } = trpc.planosVisitas.proximaSemana.useQuery(undefined, { enabled: isGestor });

  // Queries para admin
  const { data: gestores } = trpc.gestores.list.useQuery(undefined, { enabled: isAdmin });
  
  // Mutations
  const gerarParaTodosMutation = trpc.planosVisitas.gerarParaTodos.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} planos de visitas gerados com sucesso!`);
      refetchPlanoAtual();
      refetchPlanoProximo();
    },
    onError: (error) => {
      toast.error(`Erro ao gerar planos: ${error.message}`);
    },
  });

  const atualizarEstadoMutation = trpc.planosVisitas.atualizarEstado.useMutation({
    onSuccess: () => {
      toast.success("Estado do plano atualizado!");
      refetchPlanoAtual();
      refetchPlanoProximo();
    },
  });

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-500 text-white';
      case 'media': return 'bg-amber-500 text-white';
      case 'baixa': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDiaColor = (dia: string) => {
    const cores: Record<string, string> = {
      'Segunda': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Terça': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'Quarta': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Quinta': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      'Sexta': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return cores[dia] || 'bg-gray-100 text-gray-800';
  };

  const renderPlano = (plano: any, titulo: string) => {
    if (!plano) return null;

    const visitasPorDia = plano.visitasSugeridas.reduce((acc: any, visita: any) => {
      const dia = visita.diaSugerido;
      if (!acc[dia]) acc[dia] = [];
      acc[dia].push(visita);
      return acc;
    }, {});

    const diasOrdem = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

    return (
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {titulo}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(plano.semanaInicio).toLocaleDateString('pt-PT')} - {new Date(plano.semanaFim).toLocaleDateString('pt-PT')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={plano.estado === 'aceite' ? 'default' : plano.estado === 'pendente' ? 'secondary' : 'outline'}>
              {plano.estado === 'aceite' ? 'Aceite' : plano.estado === 'pendente' ? 'Pendente' : plano.estado}
            </Badge>
            {plano.estado === 'pendente' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => atualizarEstadoMutation.mutate({ id: plano.id, estado: 'aceite' })}
                  disabled={atualizarEstadoMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aceitar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {diasOrdem.map((dia) => (
              <div key={dia} className={`rounded-lg p-3 ${getDiaColor(dia)}`}>
                <h4 className="font-semibold text-sm mb-2">{dia}</h4>
                {visitasPorDia[dia] && visitasPorDia[dia].length > 0 ? (
                  <div className="space-y-2">
                    {visitasPorDia[dia].map((visita: any, idx: number) => (
                      <div key={idx} className="bg-white/80 dark:bg-gray-800/80 rounded p-2 text-xs">
                        <div className="flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100">
                          <MapPin className="h-3 w-3" />
                          {visita.lojaNome}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{visita.motivo}</p>
                        <Badge className={`mt-1 text-[10px] ${getPrioridadeColor(visita.prioridade)}`}>
                          {visita.prioridade}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs opacity-60">Sem visitas</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Plano de Visitas</h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "Gere e visualize os planos de visitas dos gestores" 
                : "Visualize o seu plano de visitas semanal sugerido pela IA"}
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => gerarParaTodosMutation.mutate()}
              disabled={gerarParaTodosMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {gerarParaTodosMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar Planos para Todos
            </Button>
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Planeamento Inteligente</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  A IA analisa automaticamente o histórico de visitas, pendentes ativos e alertas para sugerir 
                  o melhor plano de visitas para a semana. Os planos são gerados às sextas-feiras para a semana seguinte.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo para Gestores */}
        {isGestor && (
          <>
            {planoAtualLoading || planoProximoLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {planoAtual && renderPlano(planoAtual, "Plano da Semana Atual")}
                {planoProximaSemana && renderPlano(planoProximaSemana, "Plano da Próxima Semana")}
                
                {!planoAtual && !planoProximaSemana && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum plano disponível</h3>
                      <p className="text-muted-foreground">
                        Os planos de visitas são gerados automaticamente às sextas-feiras.
                        Aguarde o próximo ciclo de geração.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* Conteúdo para Admin */}
        {isAdmin && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Gestores</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {gestores?.map((gestor: any) => (
                <Card key={gestor.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{gestor.userName || 'Gestor'}</h3>
                        <p className="text-sm text-muted-foreground">{gestor.userEmail}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
