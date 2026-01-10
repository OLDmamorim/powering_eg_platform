import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Acao {
  descricao: string;
  gestorIds: number[];
}

interface AtribuirAcoesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reuniaoId: number;
  gestores: Array<{ id: number; nome: string }>;
  acoesIA?: Array<{ descricao: string; prioridade: string }>;
  onSuccess: () => void;
  onAtribuir: (reuniaoId: number, acoes: Acao[]) => Promise<void>;
}

export function AtribuirAcoesModal({
  open,
  onOpenChange,
  reuniaoId,
  gestores,
  acoesIA,
  onSuccess,
  onAtribuir,
}: AtribuirAcoesModalProps) {
  const { language } = useLanguage();
  const [acoes, setAcoes] = useState<Acao[]>(
    acoesIA?.map(a => ({ descricao: a.descricao, gestorIds: [] })) || []
  );
  const [novaAcao, setNovaAcao] = useState("");
  const [loading, setLoading] = useState(false);

  const adicionarAcao = () => {
    if (!novaAcao.trim()) {
      toast.error(language === 'pt' ? "Descrição da ação não pode estar vazia" : "Action description cannot be empty");
      return;
    }
    setAcoes([...acoes, { descricao: novaAcao.trim(), gestorIds: [] }]);
    setNovaAcao("");
  };

  const removerAcao = (index: number) => {
    setAcoes(acoes.filter((_, i) => i !== index));
  };

  const toggleGestor = (acaoIndex: number, gestorId: number) => {
    setAcoes(
      acoes.map((acao, i) => {
        if (i !== acaoIndex) return acao;
        const gestorIds = acao.gestorIds.includes(gestorId)
          ? acao.gestorIds.filter(id => id !== gestorId)
          : [...acao.gestorIds, gestorId];
        return { ...acao, gestorIds };
      })
    );
  };

  const handleSubmit = async () => {
    // Validar que todas as ações têm pelo menos um gestor
    const acoesInvalidas = acoes.filter(a => a.gestorIds.length === 0);
    if (acoesInvalidas.length > 0) {
      toast.error(language === 'pt' ? "Todas as ações devem ter pelo menos um gestor atribuído" : "All actions must have at least one assigned manager");
      return;
    }

    setLoading(true);
    try {
      await onAtribuir(reuniaoId, acoes);
      toast.success(`${acoes.length} ação(ões) atribuída(s) com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atribuir ações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atribuir Ações aos Gestores</DialogTitle>
          <DialogDescription>
            Atribua as ações identificadas aos gestores responsáveis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Adicionar Nova Ação */}
          <div className="flex gap-2">
            <Input
              placeholder="Descrição da ação..."
              value={novaAcao}
              onChange={(e) => setNovaAcao(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarAcao())}
            />
            <Button type="button" onClick={adicionarAcao} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de Ações */}
          {acoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma ação adicionada. Use o campo acima para adicionar.
            </p>
          ) : (
            <div className="space-y-4">
              {acoes.map((acao, acaoIndex) => (
                <div key={acaoIndex} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{acao.descricao}</p>
                      {acao.gestorIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {acao.gestorIds.map(gestorId => {
                            const gestor = gestores.find(g => g.id === gestorId);
                            return gestor ? (
                              <Badge key={gestorId} variant="secondary" className="text-xs">
                                {gestor.nome}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerAcao(acaoIndex)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Seleção de Gestores */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Atribuir a:</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {gestores.map((gestor) => (
                        <div key={gestor.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={acao.gestorIds.includes(gestor.id)}
                            onCheckedChange={() => toggleGestor(acaoIndex, gestor.id)}
                          />
                          <label className="text-sm cursor-pointer">
                            {gestor.nome}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || acoes.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A atribuir...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Atribuir {acoes.length} Ação(ões)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
