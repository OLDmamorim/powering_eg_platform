import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Building2, Mail, MapPin, Phone, Edit, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function MinhasLojas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [editingLoja, setEditingLoja] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    morada: "",
    contacto: "",
    email: "",
  });

  const { data: lojas, isLoading } = trpc.lojas.getByGestor.useQuery();
  const updateMutation = trpc.lojas.update.useMutation({
    onSuccess: () => {
      toast.success("Loja atualizada com sucesso!");
      setEditingLoja(null);
      utils.lojas.getByGestor.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar loja: ${error.message}`);
    },
  });

  const utils = trpc.useUtils();

  if (user?.role !== "gestor") {
    setLocation("/dashboard");
    return null;
  }

  // Ordenar lojas alfabeticamente
  const lojasSorted = lojas ? [...lojas].sort((a, b) => a.nome.localeCompare(b.nome)) : [];

  const handleEdit = (loja: any) => {
    setEditingLoja(loja);
    setFormData({
      nome: loja.nome || "",
      morada: loja.morada || "",
      contacto: loja.contacto || "",
      email: loja.email || "",
    });
  };

  const handleSave = () => {
    if (!editingLoja) return;
    
    updateMutation.mutate({
      id: editingLoja.id,
      ...formData,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Lojas</h1>
          <p className="text-muted-foreground">
            Lojas sob sua supervisão
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : lojasSorted && lojasSorted.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lojasSorted.map((loja: any) => (
              <Card key={loja.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {loja.nome}
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(loja)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Loja</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="nome">Nome da Loja</Label>
                            <Input
                              id="nome"
                              value={formData.nome}
                              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="morada">Morada</Label>
                            <Input
                              id="morada"
                              value={formData.morada}
                              onChange={(e) => setFormData({ ...formData, morada: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="contacto">Contacto</Label>
                            <Input
                              id="contacto"
                              value={formData.contacto}
                              onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                          </div>
                          <Button onClick={handleSave} className="w-full">
                            Guardar Alterações
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loja.morada && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {loja.morada}
                      </span>
                    </div>
                  )}

                  {loja.contacto && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {loja.contacto}
                      </span>
                    </div>
                  )}
                  
                  {loja.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{loja.email}</span>
                    </div>
                  )}

                  {/* Relatórios Mínimos */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Relatórios Mínimos Mensais:
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Livres:</span>
                      <span className="font-semibold text-primary">
                        {loja.minimoRelatoriosLivres || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completos:</span>
                      <span className="font-semibold text-primary">
                        {loja.minimoRelatoriosCompletos || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      (Apenas admin pode editar)
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Nenhuma loja associada ao seu perfil
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
