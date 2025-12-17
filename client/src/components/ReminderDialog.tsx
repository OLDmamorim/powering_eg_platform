import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock } from "lucide-react";
import { useLocation } from "wouter";

interface ReminderDialogProps {
  open: boolean;
  onDismiss: () => void;
}

export function ReminderDialog({ open, onDismiss }: ReminderDialogProps) {
  const [, setLocation] = useLocation();

  const handleGenerateReport = () => {
    onDismiss();
    setLocation("/relatorios-ia");
  };

  const handleLater = () => {
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-emerald-100 rounded-full">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-2xl">Lembrete de Relatório IA</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Já passaram <strong>15 dias</strong> desde o seu último relatório com análise de IA. 
            Gerar relatórios regulares ajuda a:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Identificar tendências e padrões nas lojas supervisionadas
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Receber sugestões personalizadas de melhoria baseadas em dados
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Manter um acompanhamento consistente da performance da rede
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLater}
            className="w-full sm:w-auto"
          >
            <Clock className="mr-2 h-4 w-4" />
            Lembrar Mais Tarde
          </Button>
          <Button
            onClick={handleGenerateReport}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Relatório IA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
