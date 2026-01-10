import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Building2, Mail, MapPin, Phone, Edit, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

// Componente para mostrar badge de cumprimento de relatórios
function BadgeCumprimento({ lojaId, minimo, tipo }: { lojaId: number; minimo: number; tipo: 'livres' | 'completos' }) {
  const { data: contagem, isLoading } = trpc.lojas.contarRelatoriosMesAtual.useQuery({ lojaId });
  
  if (isLoading) {
    return <span className="text-xs text-muted-foreground">A carregar...</span>;
  }

  const realizados = tipo === 'livres' ? (contagem?.relatoriosLivres || 0) : (contagem?.relatoriosCompletos || 0);
  const cumpre = realizados >= minimo;

  return (
    <Badge 
      variant={cumpre ? "default" : "destructive"}
      className="gap-1"
    >
      {cumpre ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {realizados}/{minimo}
    </Badge>
  );
}

export default function MinhasLojas() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
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
      toast.success(t('lojas.lojaAtualizada'));
      setEditingLoja(null);
      utils.lojas.getByGestor.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t('common.erro'));
    },
  });

  const utils = trpc.useUtils();

  if (user?.role !== "gestor") {
    setLocation("/dashboard");
    return null;
  }

  // Lojas já vêm ordenadas do backend

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
          <h1 className="text-3xl font-bold tracking-tight">{t('minhasLojas.title')}</h1>
          <p className="text-muted-foreground">
            {t('minhasLojas.subtitle')}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : lojas && lojas.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lojas.map((loja: any) => (
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
                          <DialogTitle>{t('lojas.editarLoja')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="nome">{t('lojas.nome')}</Label>
                            <Input
                              id="nome"
                              value={formData.nome}
                              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="morada">{t('common.descricao')}</Label>
                            <Input
                              id="morada"
                              value={formData.morada}
                              onChange={(e) => setFormData({ ...formData, morada: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="contacto">{t('common.nome')}</Label>
                            <Input
                              id="contacto"
                              value={formData.contacto}
                              onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">{t('common.email')}</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                          </div>
                          <Button onClick={handleSave} className="w-full">
                            {t('common.guardar')}
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

                  {/* Relatórios Mínimos com Badges de Cumprimento */}
                  <div className="pt-3 border-t space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      {t('lojas.minimoRelatoriosLivres')}:
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('relatorios.livres')}:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {loja.minimoRelatoriosLivres || 0} mínimo
                        </span>
                        <BadgeCumprimento 
                          lojaId={loja.id} 
                          minimo={loja.minimoRelatoriosLivres || 0}
                          tipo="livres"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('relatorios.completos')}:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {loja.minimoRelatoriosCompletos || 0} mínimo
                        </span>
                        <BadgeCumprimento 
                          lojaId={loja.id} 
                          minimo={loja.minimoRelatoriosCompletos || 0}
                          tipo="completos"
                        />
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground italic">
                      (Apenas admin pode editar mínimos)
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
                {t('minhasLojas.semLojas')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
