import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Settings, AlertTriangle, Clock, Calendar, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type ConfigKey = "threshold_pontos_negativos" | "dias_sem_visita_alerta" | "dias_pendente_antigo" | "alertas_ativos";

export default function ConfiguracoesAlertas() {
  const { language, t } = useLanguage();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  const configLabels: Record<ConfigKey, { label: string; descricao: string; icon: React.ReactNode; tipo: "number" | "boolean" }> = {
    threshold_pontos_negativos: {
      label: t('configAlertas.relatoriosNegativos') || (language === 'pt' ? "Threshold de Pontos Negativos" : "Negative Points Threshold"),
      descricao: t('configAlertas.relatoriosNegativosDesc') || (language === 'pt' ? "Número de relatórios consecutivos com pontos negativos para disparar alerta" : "Number of consecutive reports with negative points to trigger alert"),
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      tipo: "number"
    },
    dias_sem_visita_alerta: {
      label: t('configAlertas.diasSemVisita') || (language === 'pt' ? "Dias Sem Visita" : "Days Without Visit"),
      descricao: t('configAlertas.diasSemVisitaDesc') || (language === 'pt' ? "Número de dias sem visita a uma loja para disparar alerta" : "Number of days without visiting a store to trigger alert"),
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      tipo: "number"
    },
    dias_pendente_antigo: {
      label: t('configAlertas.diasPendente') || (language === 'pt' ? "Dias Pendente Antigo" : "Days Old Pending"),
      descricao: t('configAlertas.diasPendenteDesc') || (language === 'pt' ? "Número de dias para considerar um pendente como antigo" : "Number of days to consider a pending item as old"),
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      tipo: "number"
    },
    alertas_ativos: {
      label: t('configAlertas.sistemaAtivo') || (language === 'pt' ? "Sistema de Alertas Ativo" : "Alert System Active"),
      descricao: t('configAlertas.ativarDesativar') || (language === 'pt' ? "Ativar ou desativar o sistema automático de alertas" : "Enable or disable the automatic alert system"),
      icon: <Settings className="h-5 w-5 text-green-500" />,
      tipo: "boolean"
    }
  };
  
  const utils = trpc.useUtils();
  
  const { data: configuracoes, isLoading } = trpc.configuracoes.list.useQuery();
  
  const updateMutation = trpc.configuracoes.updateMultiple.useMutation({
    onSuccess: () => {
      utils.configuracoes.list.invalidate();
      toast.success(t('configAlertas.guardadoSucesso') || (language === 'pt' ? "Configurações guardadas com sucesso" : "Settings saved successfully"));
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error((t('configAlertas.erroGuardar') || (language === 'pt' ? "Erro ao guardar configurações: " : "Error saving settings: ")) + error.message);
    }
  });
  
  // Inicializar formData quando configurações carregam
  useEffect(() => {
    if (configuracoes) {
      const initialData: Record<string, string> = {};
      configuracoes.forEach(config => {
        initialData[config.chave] = config.valor;
      });
      setFormData(initialData);
    }
  }, [configuracoes]);
  
  const handleChange = (chave: string, valor: string) => {
    setFormData(prev => ({ ...prev, [chave]: valor }));
    setHasChanges(true);
  };
  
  const handleSave = () => {
    const updates = Object.entries(formData).map(([chave, valor]) => ({
      chave,
      valor
    }));
    updateMutation.mutate(updates);
  };
  
  const handleReset = () => {
    if (configuracoes) {
      const initialData: Record<string, string> = {};
      configuracoes.forEach(config => {
        initialData[config.chave] = config.valor;
      });
      setFormData(initialData);
      setHasChanges(false);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('configAlertas.title') || (language === 'pt' ? "Configurações de Alertas" : "Alert Settings")}
            </h1>
            <p className="text-muted-foreground">
              {t('configAlertas.subtitle') || (language === 'pt' ? "Personalize os thresholds e comportamento do sistema de alertas" : "Customize thresholds and alert system behavior")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={!hasChanges || updateMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {language === 'pt' ? "Repor" : "Reset"}
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending 
                ? (language === 'pt' ? "A guardar..." : "Saving...") 
                : (t('configAlertas.guardar') || (language === 'pt' ? "Guardar Alterações" : "Save Changes"))}
            </Button>
          </div>
        </div>
        
        {/* Configurações */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(configLabels) as ConfigKey[]).map(chave => {
              const config = configLabels[chave];
              const valor = formData[chave] || "";
              
              return (
                <Card key={chave} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {config.icon}
                      {config.label}
                    </CardTitle>
                    <CardDescription>{config.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {config.tipo === "boolean" ? (
                      <div className="flex items-center justify-between">
                        <Label htmlFor={chave} className="text-sm">
                          {valor === "true" 
                            ? (language === 'pt' ? "Ativo" : "Active") 
                            : (language === 'pt' ? "Desativado" : "Disabled")}
                        </Label>
                        <Switch
                          id={chave}
                          checked={valor === "true"}
                          onCheckedChange={(checked) => handleChange(chave, checked ? "true" : "false")}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor={chave}>{language === 'pt' ? "Valor" : "Value"}</Label>
                        <Input
                          id={chave}
                          type="number"
                          min={1}
                          max={365}
                          value={valor}
                          onChange={(e) => handleChange(chave, e.target.value)}
                          className="max-w-32"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {/* Info Card */}
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-600" />
              {language === 'pt' ? "Informação" : "Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>{language === 'pt' ? "Threshold de Pontos Negativos:" : "Negative Points Threshold:"}</strong> {language === 'pt' 
                ? "Quando uma loja acumula este número de relatórios consecutivos com pontos negativos, é gerado um alerta automático."
                : "When a store accumulates this number of consecutive reports with negative points, an automatic alert is generated."}
            </p>
            <p>
              <strong>{language === 'pt' ? "Dias Sem Visita:" : "Days Without Visit:"}</strong> {language === 'pt'
                ? "Se uma loja não receber visitas durante este período, será gerado um alerta de \"sem visitas recentes\"."
                : "If a store doesn't receive visits during this period, a \"no recent visits\" alert will be generated."}
            </p>
            <p>
              <strong>{language === 'pt' ? "Dias Pendente Antigo:" : "Days Old Pending:"}</strong> {language === 'pt'
                ? "Pendentes que excedam este número de dias serão sinalizados como antigos e podem gerar alertas."
                : "Pending items exceeding this number of days will be flagged as old and may generate alerts."}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
