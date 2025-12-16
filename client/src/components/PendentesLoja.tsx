import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface PendenteStatus {
  id: number;
  status: "resolvido" | "continua" | null;
}

interface PendentesLojaProps {
  lojaId: number | null;
  onPendentesChange: (pendentes: PendenteStatus[]) => void;
}

export function PendentesLoja({ lojaId, onPendentesChange }: PendentesLojaProps) {
  const [pendentesStatus, setPendentesStatus] = useState<PendenteStatus[]>([]);

  const { data: pendentes, isLoading } = trpc.pendentes.getByLoja.useQuery(
    { lojaId: lojaId! },
    { enabled: !!lojaId }
  );

  // Reset quando muda a loja
  useEffect(() => {
    if (pendentes) {
      const initialStatus = pendentes.map((p: any) => ({
        id: p.id,
        status: null as "resolvido" | "continua" | null,
      }));
      setPendentesStatus(initialStatus);
      onPendentesChange(initialStatus);
    }
  }, [pendentes, lojaId]);

  const handleStatusChange = (pendenteId: number, status: "resolvido" | "continua") => {
    const newStatus = pendentesStatus.map((p) =>
      p.id === pendenteId ? { ...p, status } : p
    );
    setPendentesStatus(newStatus);
    onPendentesChange(newStatus);
  };

  if (!lojaId) return null;

  if (isLoading) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-amber-500 mr-2" />
          <span className="text-sm text-muted-foreground">A carregar pendentes...</span>
        </CardContent>
      </Card>
    );
  }

  if (!pendentes || pendentes.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm text-green-600 font-medium">
            Esta loja não tem pendentes ativos
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Pendentes desta Loja
          <Badge variant="outline" className="ml-2 bg-amber-500/10 text-amber-600 border-amber-500/20">
            {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Indique o estado de cada pendente antes de submeter o relatório
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendentes.map((pendente: any) => {
          const status = pendentesStatus.find((p) => p.id === pendente.id)?.status;
          return (
            <div
              key={pendente.id}
              className={`p-4 rounded-lg border transition-colors ${
                status === "resolvido"
                  ? "bg-green-500/10 border-green-500/30"
                  : status === "continua"
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-background border-border"
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{pendente.descricao}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Criado em: {new Date(pendente.createdAt).toLocaleDateString("pt-PT")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={status === "resolvido" ? "default" : "outline"}
                    size="sm"
                    className={
                      status === "resolvido"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30"
                    }
                    onClick={() => handleStatusChange(pendente.id, "resolvido")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Resolvido
                  </Button>
                  <Button
                    type="button"
                    variant={status === "continua" ? "default" : "outline"}
                    size="sm"
                    className={
                      status === "continua"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30"
                    }
                    onClick={() => handleStatusChange(pendente.id, "continua")}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Continua
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {pendentesStatus.some((p) => p.status === null) && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Por favor indique o estado de todos os pendentes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
