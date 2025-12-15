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
import { Plus, Save, X, Image, Upload, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const FORGE_API_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL;
const FORGE_API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;

export default function RelatorioLivre() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lojaId, setLojaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pendentes, setPendentes] = useState<string[]>([""]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newFotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validar tamanho (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Ficheiro ${file.name} excede 5MB`);
          continue;
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
          toast.error(`Ficheiro ${file.name} não é uma imagem`);
          continue;
        }

        // Upload para S3 via Forge API
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${FORGE_API_URL}/storage/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FORGE_API_KEY}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Erro ao fazer upload de ${file.name}`);
        }

        const result = await response.json();
        if (result.url) {
          newFotos.push(result.url);
        }
      }

      setFotos([...fotos, ...newFotos]);
      if (newFotos.length > 0) {
        toast.success(`${newFotos.length} foto(s) adicionada(s)`);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload das fotos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index));
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
      fotos: fotos.length > 0 ? JSON.stringify(fotos) : undefined,
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

              {/* Upload de Fotos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Fotos
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    {uploading ? 'A enviar...' : 'Adicionar Fotos'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Adicione fotos de evidências da visita (máx. 5MB por foto)
                </p>
                
                {fotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {fotos.map((foto, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={foto}
                          alt={`Foto ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFoto(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                <Button type="submit" disabled={createMutation.isPending || uploading}>
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
