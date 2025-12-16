import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

interface EmailConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  relatorioId: number | null;
  tipoRelatorio: 'livre' | 'completo';
  lojaNome?: string;
  lojaEmail?: string;
}

export function EmailConfirmDialog({ 
  open, 
  onClose, 
  relatorioId, 
  tipoRelatorio, 
  lojaNome,
  lojaEmail 
}: EmailConfirmDialogProps) {
  const [sending, setSending] = useState(false);

  const enviarEmailLivre = trpc.relatoriosLivres.enviarEmail.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Email enviado com sucesso para ${data.email}`);
      setSending(false);
      onClose();
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar email: ${error.message}`);
      setSending(false);
    },
  });

  const enviarEmailCompleto = trpc.relatoriosCompletos.enviarEmail.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Email enviado com sucesso para ${data.email}`);
      setSending(false);
      onClose();
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar email: ${error.message}`);
      setSending(false);
    },
  });

  const handleEnviarEmail = async () => {
    if (!relatorioId) return;

    setSending(true);

    if (tipoRelatorio === 'livre') {
      enviarEmailLivre.mutate({ id: relatorioId });
    } else {
      enviarEmailCompleto.mutate({ id: relatorioId });
    }
  };

  const handleNaoEnviar = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !sending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <span>Enviar Relatório por Email?</span>
          </DialogTitle>
          <DialogDescription>
            Deseja enviar este relatório por email para a loja <strong>{lojaNome}</strong>?
            {lojaEmail && (
              <span className="block mt-2 text-sm text-muted-foreground">
                Email de destino: {lojaEmail}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-foreground">
              O email incluirá:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Dados da visita (loja, gestor, data)</li>
              <li>Observações registadas</li>
              <li>Lista de pendentes (se existirem)</li>
              {tipoRelatorio === 'completo' && (
                <>
                  <li>Avaliações de desempenho</li>
                  <li>Pontos positivos e negativos</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleNaoEnviar}
            disabled={sending}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Não Enviar
          </Button>
          <Button 
            onClick={handleEnviarEmail}
            disabled={sending}
            className="w-full sm:w-auto"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
