import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function RelatorioLivre() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lojaId, setLojaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pendentes, setPendentes] = useState<string[]>([""]);

  const utils = trpc.useUtils();
  const { data: lojas } = trpc.lojas.getByGestor.useQuery();

  const createMutation = trpc.relatoriosLivres.create.useMutation({
    onSuccess: () => {
      toast.success("Relatório criado com sucesso");
      utils.relatoriosLivres.list.invalidate();
      setLocation("/meus-relatorios");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (user?.role !== "gestor") {
    setLocation("/dashboard");
    return null;
  }

  const handleAddPendente = () => {
    setPendentes([...pendentes, ""]);
  };

  const handleRemovePendente = (index: number) => {
    setPendentes(pendentes.filter((_, i) => i !== index));
  };

  const handlePendenteChange = (index: number, value: string) => {
    const newPendentes = [...pendentes];
    newPendentes[index] = value;
    setPendentes(newPendentes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaId) {
      toast.error("Por favor selecione uma loja");
      return;
    }

    const pendentesValidos = pendentes.filter((p) => p.trim() !== "");

    createMutation.mutate({
      lojaId: Number(lojaId),
      dataVisita: new Date(),
      descricao,
      pendentes: pendentesValidos.length > 0 ? pendentesValidos : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório Livre
          </h1>
          <p className="text-muted-foreground">
            Criar um relatório rápido de visita
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informações da Visita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loja">Loja *</Label>
                <Select value={lojaId} onValueChange={setLojaId} required>
                  <SelectTrigger id="loja">
                    <SelectValue placeholder="Selecione uma loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas?.map((loja: any) => (
                      <SelectItem key={loja.id} value={loja.id.toString()}>
                        {loja.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data e Hora</Label>
                <Input
                  id="data"
                  type="text"
                  value={new Date().toLocaleString("pt-PT")}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  A data e hora são registadas automaticamente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva os pontos importantes desta visita..."
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pendentes</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPendente}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Items a serem revistos na próxima visita
                </p>
                <div className="space-y-2">
                  {pendentes.map((pendente, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={pendente}
                        onChange={(e) =>
                          handlePendenteChange(index, e.target.value)
                        }
                        placeholder={`Pendente ${index + 1}`}
                      />
                      {pendentes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePendente(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/dashboard")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Relatório
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
