import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Phone,
  Smartphone,
  MapPin,
  Euro,
  Building,
  User,
  Ruler,
  FileText,
  Save,
  X,
  Edit,
  Info,
} from "lucide-react";

interface LojaInfoComplementarProps {
  loja: any;
  isAdmin?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
}

export default function LojaInfoComplementar({
  loja,
  isAdmin = false,
  onClose,
  onSaved,
}: LojaInfoComplementarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    telefone: "",
    telemovel: "",
    morada: "",
    codigoPostal: "",
    localidade: "",
    renda: "",
    senhorio: "",
    contactoSenhorio: "",
    areaM2: "",
    observacoesImovel: "",
  });

  const utils = trpc.useUtils();

  useEffect(() => {
    if (loja) {
      setFormData({
        telefone: loja.telefone || "",
        telemovel: loja.telemovel || "",
        morada: loja.morada || "",
        codigoPostal: loja.codigoPostal || "",
        localidade: loja.localidade || "",
        renda: loja.renda || "",
        senhorio: loja.senhorio || "",
        contactoSenhorio: loja.contactoSenhorio || "",
        areaM2: loja.areaM2 || "",
        observacoesImovel: loja.observacoesImovel || "",
      });
    }
  }, [loja]);

  const updateMutation = trpc.lojas.update.useMutation({
    onSuccess: () => {
      toast.success("Informações atualizadas com sucesso");
      setIsEditing(false);
      utils.lojas.list.invalidate();
      utils.lojas.getByGestor.invalidate();
      utils.lojas.getById.invalidate();
      onSaved?.();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar informações");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: loja.id,
      telefone: formData.telefone || null,
      telemovel: formData.telemovel || null,
      morada: formData.morada || null,
      codigoPostal: formData.codigoPostal || null,
      localidade: formData.localidade || null,
      renda: formData.renda || null,
      senhorio: formData.senhorio || null,
      contactoSenhorio: formData.contactoSenhorio || null,
      areaM2: formData.areaM2 || null,
      observacoesImovel: formData.observacoesImovel || null,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data
    setFormData({
      telefone: loja.telefone || "",
      telemovel: loja.telemovel || "",
      morada: loja.morada || "",
      codigoPostal: loja.codigoPostal || "",
      localidade: loja.localidade || "",
      renda: loja.renda || "",
      senhorio: loja.senhorio || "",
      contactoSenhorio: loja.contactoSenhorio || "",
      areaM2: loja.areaM2 || "",
      observacoesImovel: loja.observacoesImovel || "",
    });
  };

  const hasAnyInfo =
    loja.telefone ||
    loja.telemovel ||
    loja.morada ||
    loja.codigoPostal ||
    loja.localidade ||
    loja.renda ||
    loja.senhorio ||
    loja.contactoSenhorio ||
    loja.areaM2 ||
    loja.observacoesImovel;

  // Modo visualização
  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-blue-600" />
              Informações Complementares
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyInfo ? (
            <div className="text-center py-6 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sem informações complementares.</p>
              <p className="text-xs mt-1">
                Clique em "Editar" para adicionar dados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Contactos */}
              {(loja.telefone || loja.telemovel) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Contactos
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {loja.telefone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Telefone:</span>
                        <span className="font-medium">{loja.telefone}</span>
                      </div>
                    )}
                    {loja.telemovel && (
                      <div className="flex items-center gap-2 text-sm">
                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Telemóvel:
                        </span>
                        <span className="font-medium">{loja.telemovel}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Morada */}
              {(loja.morada || loja.codigoPostal || loja.localidade) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Morada
                  </h4>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      {loja.morada && <p>{loja.morada}</p>}
                      {(loja.codigoPostal || loja.localidade) && (
                        <p className="text-muted-foreground">
                          {[loja.codigoPostal, loja.localidade]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Imóvel */}
              {(loja.renda ||
                loja.senhorio ||
                loja.contactoSenhorio ||
                loja.areaM2) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Imóvel
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {loja.areaM2 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Área:</span>
                        <span className="font-medium">{loja.areaM2} m²</span>
                      </div>
                    )}
                    {loja.renda && (
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Renda:</span>
                        <span className="font-medium">{loja.renda}</span>
                      </div>
                    )}
                    {loja.senhorio && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Senhorio:
                        </span>
                        <span className="font-medium">{loja.senhorio}</span>
                      </div>
                    )}
                    {loja.contactoSenhorio && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Contacto Senhorio:
                        </span>
                        <span className="font-medium">
                          {loja.contactoSenhorio}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observações */}
              {loja.observacoesImovel && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Observações
                  </h4>
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {loja.observacoesImovel}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Modo edição
  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3 bg-blue-50/50 dark:bg-blue-900/10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Edit className="h-4 w-4 text-blue-600" />
            Editar Informações Complementares
          </div>
          <Badge variant="outline" className="text-xs">
            Todos os campos são facultativos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* Contactos */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600" />
            Contactos
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="telefone" className="text-xs">
                Telefone
              </Label>
              <Input
                id="telefone"
                placeholder="Ex: 253 123 456"
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({ ...formData, telefone: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telemovel" className="text-xs">
                Telemóvel
              </Label>
              <Input
                id="telemovel"
                placeholder="Ex: 912 345 678"
                value={formData.telemovel}
                onChange={(e) =>
                  setFormData({ ...formData, telemovel: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Morada */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            Morada
          </h4>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="morada" className="text-xs">
                Morada
              </Label>
              <Input
                id="morada"
                placeholder="Ex: Rua da Loja, nº 123"
                value={formData.morada}
                onChange={(e) =>
                  setFormData({ ...formData, morada: e.target.value })
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="codigoPostal" className="text-xs">
                  Código Postal
                </Label>
                <Input
                  id="codigoPostal"
                  placeholder="Ex: 4700-123"
                  value={formData.codigoPostal}
                  onChange={(e) =>
                    setFormData({ ...formData, codigoPostal: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="localidade" className="text-xs">
                  Localidade
                </Label>
                <Input
                  id="localidade"
                  placeholder="Ex: Braga"
                  value={formData.localidade}
                  onChange={(e) =>
                    setFormData({ ...formData, localidade: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Imóvel */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            Imóvel
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="areaM2" className="text-xs">
                Área (m²)
              </Label>
              <Input
                id="areaM2"
                placeholder="Ex: 120"
                value={formData.areaM2}
                onChange={(e) =>
                  setFormData({ ...formData, areaM2: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="renda" className="text-xs">
                Renda Mensal
              </Label>
              <Input
                id="renda"
                placeholder="Ex: 850€"
                value={formData.renda}
                onChange={(e) =>
                  setFormData({ ...formData, renda: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senhorio" className="text-xs">
                Senhorio
              </Label>
              <Input
                id="senhorio"
                placeholder="Nome do senhorio"
                value={formData.senhorio}
                onChange={(e) =>
                  setFormData({ ...formData, senhorio: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactoSenhorio" className="text-xs">
                Contacto do Senhorio
              </Label>
              <Input
                id="contactoSenhorio"
                placeholder="Telefone ou email"
                value={formData.contactoSenhorio}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactoSenhorio: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Observações */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Observações
          </h4>
          <div className="space-y-1.5">
            <Label htmlFor="observacoesImovel" className="text-xs">
              Notas adicionais sobre o imóvel ou a loja
            </Label>
            <Textarea
              id="observacoesImovel"
              placeholder="Ex: Contrato renova em Março 2027. Estacionamento incluído..."
              rows={3}
              value={formData.observacoesImovel}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  observacoesImovel: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleCancel} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-1"
          >
            <Save className="h-3.5 w-3.5" />
            {updateMutation.isPending ? "A guardar..." : "Guardar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
