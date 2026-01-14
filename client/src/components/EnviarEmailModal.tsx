import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle, Store } from "lucide-react";
import { toast } from "sonner";

interface EnviarEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reuniaoId: number;
  tipo: "gestores" | "lojas";
  gestores?: Array<{ id: number; nome: string; email?: string }>;
  lojaEmail?: string; // Email da loja (opcional, para mostrar confirmação)
  lojaNome?: string; // Nome da loja (opcional, para mostrar confirmação)
  onEnviar: (reuniaoId: number, destinatarios: number[] | string | undefined) => Promise<void>;
}

export function EnviarEmailModal({
  open,
  onOpenChange,
  reuniaoId,
  tipo,
  gestores,
  lojaEmail,
  lojaNome,
  onEnviar,
}: EnviarEmailModalProps) {
  const { language } = useLanguage();
  const [gestoresSelecionados, setGestoresSelecionados] = useState<number[]>(
    gestores?.map(g => g.id) || []
  );
  const [loading, setLoading] = useState(false);

  const toggleGestor = (gestorId: number) => {
    setGestoresSelecionados(prev =>
      prev.includes(gestorId)
        ? prev.filter(id => id !== gestorId)
        : [...prev, gestorId]
    );
  };

  const handleSubmit = async () => {
    if (tipo === "gestores") {
      if (gestoresSelecionados.length === 0) {
        toast.error(language === 'pt' ? "Selecione pelo menos um gestor" : "Select at least one manager");
        return;
      }
    }

    setLoading(true);
    try {
      await onEnviar(
        reuniaoId,
        tipo === "gestores" ? gestoresSelecionados : undefined // undefined = usar email da loja
      );
      
      const destinatarios = tipo === "gestores" 
        ? `${gestoresSelecionados.length} gestor(es)`
        : lojaEmail || (language === 'pt' ? 'email da loja' : 'store email');
      toast.success(language === 'pt' 
        ? `Email enviado para ${destinatarios}!` 
        : `Email sent to ${destinatarios}!`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || (language === 'pt' ? "Erro ao enviar email" : "Error sending email"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'pt' ? 'Enviar Relatório por Email' : 'Send Report by Email'}
          </DialogTitle>
          <DialogDescription>
            {tipo === "gestores"
              ? (language === 'pt' 
                  ? "Selecione os gestores que devem receber o relatório"
                  : "Select the managers who should receive the report")
              : (language === 'pt'
                  ? "O relatório será enviado para o email configurado no perfil da loja"
                  : "The report will be sent to the email configured in the store profile")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {tipo === "gestores" ? (
            <div className="space-y-2">
              <Label>{language === 'pt' ? 'Destinatários' : 'Recipients'}</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
                {gestores && gestores.length > 0 ? (
                  gestores.map((gestor) => (
                    <div key={gestor.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={gestoresSelecionados.includes(gestor.id)}
                        onCheckedChange={() => toggleGestor(gestor.id)}
                      />
                      <label className="text-sm cursor-pointer flex-1">
                        {gestor.nome}
                        {gestor.email && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({gestor.email})
                          </span>
                        )}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {language === 'pt' ? 'Nenhum gestor disponível' : 'No managers available'}
                  </p>
                )}
              </div>
              {gestoresSelecionados.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {gestoresSelecionados.length} {language === 'pt' ? 'gestor(es) selecionado(s)' : 'manager(s) selected'}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{lojaNome || (language === 'pt' ? 'Loja da Reunião' : 'Meeting Store')}</p>
                  {lojaEmail ? (
                    <p className="text-sm text-muted-foreground">{lojaEmail}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {language === 'pt' ? 'Email configurado no perfil' : 'Email configured in profile'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>
                  {language === 'pt' 
                    ? 'O email será enviado automaticamente para o endereço da loja'
                    : 'Email will be sent automatically to the store address'}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'pt' ? 'A enviar...' : 'Sending...'}
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {language === 'pt' ? 'Enviar Email' : 'Send Email'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
