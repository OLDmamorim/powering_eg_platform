import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Building2, Check, Trash2, Filter, AlertCircle, CalendarClock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function Pendentes() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [apenasNaoVistos, setApenasNaoVistos] = useState(false);
  const isAdmin = user?.role === 'admin';

  const { data: pendentes, isLoading } = trpc.pendentes.list.useQuery({ apenasNaoVistos });
  const { data: countNaoVistos } = trpc.pendentes.countNaoVistos.useQuery(undefined, { enabled: isAdmin });

  const resolveMutation = trpc.pendentes.resolve.useMutation({
    onSuccess: () => {
      toast.success("Pendente marcado como resolvido");
      utils.pendentes.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.pendentes.delete.useMutation({
    onSuccess: () => {
      toast.success("Pendente eliminado");
      utils.pendentes.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleResolve = (id: number) => {
    resolveMutation.mutate({ id });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem a certeza que deseja eliminar este pendente?")) {
      deleteMutation.mutate({ id });
    }
  };
  
  // Função para verificar status do prazo
  const getStatusPrazo = (dataLimite: string | null) => {
    if (!dataLimite) return null;
    const hoje = new Date();
    const limite = new Date(dataLimite);
    const diffDias = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDias < 0) return 'vencido';
    if (diffDias <= 3) return 'proximo';
    return 'ok';
  };

  // Agrupar pendentes por loja
  const pendentesPorLoja = pendentes?.reduce((acc: any, pendente: any) => {
    const lojaId = pendente.loja?.id || 0;
    if (!acc[lojaId]) {
      acc[lojaId] = {
        loja: pendente.loja,
        pendentes: [],
      };
    }
    acc[lojaId].pendentes.push(pendente);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pendentes</h1>
            <p className="text-muted-foreground">
              Items a serem revistos nas próximas visitas
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setApenasNaoVistos(!apenasNaoVistos)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  apenasNaoVistos 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <Filter className="h-4 w-4" />
                {apenasNaoVistos ? '✓ Apenas Não Vistos' : 'Mostrar Apenas Não Vistos'}
              </button>
              {(countNaoVistos || 0) > 0 && (
                <Badge variant="destructive">
                  {countNaoVistos} por ver
                </Badge>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : pendentesPorLoja && Object.keys(pendentesPorLoja).length > 0 ? (
          <div className="space-y-4">
            {Object.values(pendentesPorLoja).map((grupo: any) => (
              <Card key={grupo.loja?.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {grupo.loja?.nome || "Loja"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {grupo.pendentes.map((pendente: any) => (
                      <div
                        key={pendente.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors ${!pendente.resolvido && getStatusPrazo(pendente.dataLimite) === 'vencido' ? 'border-red-500 bg-red-500/5' : ''} ${!pendente.resolvido && getStatusPrazo(pendente.dataLimite) === 'proximo' ? 'border-amber-500 bg-amber-500/5' : ''}`}
                      >
                        <Checkbox
                          id={`pendente-${pendente.id}`}
                          checked={pendente.resolvido}
                          onCheckedChange={() => handleResolve(pendente.id)}
                          disabled={
                            resolveMutation.isPending || pendente.resolvido
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`pendente-${pendente.id}`}
                            className={`text-sm cursor-pointer ${
                              pendente.resolvido
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {pendente.descricao}
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {new Date(pendente.createdAt).toLocaleDateString(
                                "pt-PT"
                              )}
                            </span>
                            {pendente.tipoRelatorio && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {pendente.tipoRelatorio === "livre"
                                  ? "Relatório Livre"
                                  : "Relatório Completo"}
                              </span>
                            )}
                            {!pendente.resolvido && pendente.dataLimite && (
                              <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                                getStatusPrazo(pendente.dataLimite) === 'vencido' 
                                  ? 'bg-red-500/10 text-red-600' 
                                  : getStatusPrazo(pendente.dataLimite) === 'proximo'
                                    ? 'bg-amber-500/10 text-amber-600'
                                    : 'bg-blue-500/10 text-blue-600'
                              }`}>
                                {getStatusPrazo(pendente.dataLimite) === 'vencido' ? (
                                  <><AlertCircle className="h-3 w-3" /> Vencido</>
                                ) : getStatusPrazo(pendente.dataLimite) === 'proximo' ? (
                                  <><CalendarClock className="h-3 w-3" /> Vence em breve</>
                                ) : (
                                  <><Calendar className="h-3 w-3" /> Prazo: {new Date(pendente.dataLimite).toLocaleDateString('pt-PT')}</>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(pendente.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-2">
                <Check className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Não existem pendentes no momento
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
