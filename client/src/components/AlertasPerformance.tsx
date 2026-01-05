import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertTriangle, TrendingDown, Bell, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  periodos: Array<{ mes: number; ano: number; label: string }>;
}

export function AlertasPerformance({ periodos }: Props) {
  const [limiarDesvio, setLimiarDesvio] = useState(-10);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<{ mes: number; ano: number } | null>(
    periodos.length > 0 ? { mes: periodos[0].mes, ano: periodos[0].ano } : null
  );

  // Query para lojas com performance baixa
  const { data: lojasPerformanceBaixa, isLoading, refetch } = trpc.alertas.lojasPerformanceBaixa.useQuery(
    {
      limiarDesvio,
      mes: periodoSelecionado?.mes || 1,
      ano: periodoSelecionado?.ano || 2025,
    },
    { enabled: !!periodoSelecionado }
  );

  // Mutation para criar alertas
  const criarAlertasMutation = trpc.alertas.verificarPerformance.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.alertasCriados} alertas criados para ${data.lojasVerificadas} lojas verificadas`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar alertas: ${error.message}`);
    },
  });

  const handleCriarAlertas = () => {
    if (!periodoSelecionado) return;
    criarAlertasMutation.mutate({
      limiarDesvio,
      mes: periodoSelecionado.mes,
      ano: periodoSelecionado.ano,
    });
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="bg-amber-50 dark:bg-amber-900/20">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Alertas de Performance
        </CardTitle>
        <CardDescription>
          Monitorize lojas com performance abaixo do objetivo
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select
              value={periodoSelecionado ? `${periodoSelecionado.mes}-${periodoSelecionado.ano}` : ''}
              onValueChange={(v) => {
                const [mes, ano] = v.split('-').map(Number);
                setPeriodoSelecionado({ mes, ano });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                {periodos.map((p) => (
                  <SelectItem key={`${p.mes}-${p.ano}`} value={`${p.mes}-${p.ano}`}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Limiar de Desvio (%)</Label>
            <Input
              type="number"
              value={limiarDesvio}
              onChange={(e) => setLimiarDesvio(Number(e.target.value))}
              placeholder="-10"
              min={-100}
              max={0}
            />
            <p className="text-xs text-muted-foreground">
              Alertar lojas com desvio abaixo de {limiarDesvio}%
            </p>
          </div>

          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button
              onClick={handleCriarAlertas}
              disabled={criarAlertasMutation.isPending || !periodoSelecionado}
              className="w-full"
            >
              {criarAlertasMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  A criar alertas...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Criar Alertas Automáticos
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Lista de lojas com performance baixa */}
        <div className="mt-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Lojas Abaixo do Objetivo ({lojasPerformanceBaixa?.length || 0})
          </h4>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : lojasPerformanceBaixa && lojasPerformanceBaixa.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lojasPerformanceBaixa.map((loja) => (
                <div
                  key={loja.lojaId}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                >
                  <div>
                    <p className="font-medium">{loja.lojaNome}</p>
                    <p className="text-sm text-muted-foreground">
                      {loja.zona || 'Sem zona'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">
                      {loja.desvioPercentualMes.toFixed(1)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {loja.totalServicos} / {loja.objetivoMensal} serviços
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-muted-foreground">
                Nenhuma loja abaixo do limiar de {limiarDesvio}%
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
