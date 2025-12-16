import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, CheckCircle, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

interface SugestoesModalProps {
  open: boolean;
  onClose: () => void;
  relatorioId: number | null;
  tipoRelatorio: 'livre' | 'completo';
  lojaNome?: string;
}

export function SugestoesModal({ open, onClose, relatorioId, tipoRelatorio, lojaNome }: SugestoesModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const { data: sugestoes, refetch, isRefetching } = trpc.sugestoes.byRelatorio.useQuery(
    { relatorioId: relatorioId!, tipoRelatorio },
    { 
      enabled: open && relatorioId !== null,
      refetchInterval: isLoading ? 2000 : false, // Poll enquanto carrega
    }
  );

  useEffect(() => {
    if (open && relatorioId) {
      setIsLoading(true);
      setRetryCount(0);
    }
  }, [open, relatorioId]);

  useEffect(() => {
    if (sugestoes && sugestoes.length > 0) {
      setIsLoading(false);
    } else if (retryCount < 10 && open) {
      // Tentar até 10 vezes (20 segundos)
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        refetch();
      }, 2000);
      return () => clearTimeout(timer);
    } else if (retryCount >= 10) {
      setIsLoading(false);
    }
  }, [sugestoes, retryCount, open, refetch]);

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'media': return <TrendingUp className="h-4 w-4 text-amber-500" />;
      case 'baixa': return <Lightbulb className="h-4 w-4 text-green-500" />;
      default: return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return <Badge variant="destructive">Alta Prioridade</Badge>;
      case 'media': return <Badge className="bg-amber-500 hover:bg-amber-600">Média Prioridade</Badge>;
      case 'baixa': return <Badge className="bg-green-500 hover:bg-green-600">Baixa Prioridade</Badge>;
      default: return <Badge variant="secondary">Sugestão</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span>Sugestões de Melhoria</span>
          </DialogTitle>
          <DialogDescription>
            {lojaNome 
              ? `A IA analisou o seu relatório para ${lojaNome} e preparou estas sugestões.`
              : 'A IA analisou o seu relatório e preparou estas sugestões de melhoria.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoading || isRefetching ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-full">
                  <RefreshCw className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">A gerar sugestões...</p>
                <p className="text-sm text-muted-foreground">A IA está a analisar o seu relatório</p>
              </div>
            </div>
          ) : sugestoes && sugestoes.length > 0 ? (
            <div className="space-y-3">
              {sugestoes.map((sugestao: any) => (
                <Card key={sugestao.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getPrioridadeIcon(sugestao.prioridade)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-foreground">{sugestao.categoria || 'Sugestão Geral'}</h4>
                          {getPrioridadeBadge(sugestao.prioridade)}
                        </div>
                        <p className="text-sm text-muted-foreground">{sugestao.sugestao}</p>
                        {sugestao.acaoRecomendada && (
                          <div className="flex items-start gap-2 mt-2 p-2 bg-muted/50 rounded-md">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-foreground">{sugestao.acaoRecomendada}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-4 bg-muted rounded-full">
                <Lightbulb className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Sem sugestões disponíveis</p>
                <p className="text-sm text-muted-foreground">
                  O relatório foi guardado com sucesso. As sugestões serão geradas em breve.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            <CheckCircle className="h-4 w-4 mr-2" />
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
