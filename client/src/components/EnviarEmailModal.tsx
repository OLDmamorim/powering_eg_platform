import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

interface EnviarEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reuniaoId: number;
  tipo: "gestores" | "lojas";
  gestores?: Array<{ id: number; nome: string; email?: string }>;
  onEnviar: (reuniaoId: number, destinatarios: number[] | string) => Promise<void>;
}

export function EnviarEmailModal({
  open,
  onOpenChange,
  reuniaoId,
  tipo,
  gestores,
  onEnviar,
}: EnviarEmailModalProps) {
  const [gestoresSelecionados, setGestoresSelecionados] = useState<number[]>(
    gestores?.map(g => g.id) || []
  );
  const [emailLoja, setEmailLoja] = useState("");
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
        toast.error("Selecione pelo menos um gestor");
        return;
      }
    } else {
      if (!emailLoja.trim()) {
        toast.error("Indique o email da loja");
        return;
      }
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailLoja)) {
        toast.error("Email inválido");
        return;
      }
    }

    setLoading(true);
    try {
      await onEnviar(
        reuniaoId,
        tipo === "gestores" ? gestoresSelecionados : emailLoja
      );
      
      const destinatarios = tipo === "gestores" 
        ? `${gestoresSelecionados.length} gestor(es)`
        : emailLoja;
      toast.success(`Email enviado para ${destinatarios}!`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Relatório por Email</DialogTitle>
          <DialogDescription>
            {tipo === "gestores"
              ? "Selecione os gestores que devem receber o relatório"
              : "Indique o email da loja para enviar o relatório"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {tipo === "gestores" ? (
            <div className="space-y-2">
              <Label>Destinatários</Label>
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
                  <p className="text-sm text-muted-foreground">Nenhum gestor disponível</p>
                )}
              </div>
              {gestoresSelecionados.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {gestoresSelecionados.length} gestor(es) selecionado(s)
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email-loja">Email da Loja</Label>
              <Input
                id="email-loja"
                type="email"
                placeholder="loja@exemplo.com"
                value={emailLoja}
                onChange={(e) => setEmailLoja(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
