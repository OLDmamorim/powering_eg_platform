import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Download, BarChart3 } from "lucide-react";
import { Streamdown } from "streamdown";

interface RelatorioIACategoriasProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RelatorioIACategorias({ open, onOpenChange }: RelatorioIACategoriasProps) {
  const [relatorioIA, setRelatorioIA] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRelatorioMutation = trpc.categorizacao.gerarRelatorioIA.useMutation({
    onSuccess: (data) => {
      setRelatorioIA(data.relatorio);
      setIsGenerating(false);
      toast.success("Relatório IA gerado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar relatório IA");
      setIsGenerating(false);
    },
  });

  // Gerar relatório automaticamente ao abrir
  useEffect(() => {
    if (open && !relatorioIA && !isGenerating) {
      setIsGenerating(true);
      generateRelatorioMutation.mutate();
    }
  }, [open]);

  const handleDownload = () => {
    if (!relatorioIA) return;

    const blob = new Blob([relatorioIA], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-ia-categorias-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Relatório descarregado!");
  };

  const handleClose = () => {
    setRelatorioIA(null);
    setIsGenerating(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Relatório IA por Categorias - Reunião de Board
          </DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              A gerar relatório estruturado por categorias...
            </p>
            <p className="text-xs text-muted-foreground">
              Isto pode demorar alguns segundos
            </p>
          </div>
        ) : relatorioIA ? (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button onClick={handleDownload} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Descarregar Markdown
              </Button>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <Streamdown>{relatorioIA}</Streamdown>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Erro ao gerar relatório
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
