import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Clock, User, Eye, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Streamdown } from "streamdown";

export function HistoricoRelatoriosIA() {
  const [expanded, setExpanded] = useState(false);
  const [selectedRelatorio, setSelectedRelatorio] = useState<any>(null);
  
  const { data: historico, isLoading } = trpc.categorizacao.getHistoricoRelatoriosIA.useQuery();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Relatórios IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">A carregar...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!historico || historico.length === 0) {
    return null; // Não mostrar se não houver histórico
  }
  
  const relatoriosVisiveis = expanded ? historico : historico.slice(0, 3);
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Relatórios IA ({historico.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {relatoriosVisiveis.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(rel.createdAt).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {rel.geradoPorNome}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRelatorio(rel)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Visualizar
              </Button>
            </div>
          ))}
          
          {historico.length > 3 && (
            <Button
              variant="ghost"
              className="w-full gap-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Mostrar mais ({historico.length - 3} relatórios)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog para visualizar relatório */}
      <Dialog open={!!selectedRelatorio} onOpenChange={() => setSelectedRelatorio(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Relatório IA - {selectedRelatorio && new Date(selectedRelatorio.createdAt).toLocaleDateString("pt-PT")}
            </DialogTitle>
          </DialogHeader>
          {selectedRelatorio && (
            <div className="prose prose-sm max-w-none">
              <Streamdown>{selectedRelatorio.conteudo}</Streamdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
