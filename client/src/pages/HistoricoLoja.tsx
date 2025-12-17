import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb, History } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function HistoricoLoja() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lojaId, setLojaId] = useState("");
  const [historyData, setHistoryData] = useState<any>(null);

  const { data: lojas } = trpc.lojas.getByGestor.useQuery();
  const generateHistoryMutation = trpc.lojaHistory.generate.useQuery(
    { lojaId: parseInt(lojaId) },
    { enabled: false }
  );

  if (user?.role !== "gestor") {
    setLocation("/dashboard");
    return null;
  }

  const handleGenerate = async () => {
    if (!lojaId) {
      toast.error("Por favor selecione uma loja");
      return;
    }

    try {
      toast.info("🤖 A analisar histórico da loja com IA...");
      const result = await generateHistoryMutation.refetch();
      if (result.data) {
        setHistoryData(result.data);
        toast.success("Histórico gerado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao gerar histórico:", error);
      toast.error("Erro ao gerar histórico. Tente novamente.");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "alta": return "text-red-600 bg-red-50 border-red-200";
      case "média": return "text-orange-600 bg-orange-50 border-orange-200";
      case "baixa": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "text-red-600 bg-red-50";
      case "média": return "text-orange-600 bg-orange-50";
      case "baixa": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            Histórico da Loja
          </h1>
          <p className="text-muted-foreground">
            Análise inteligente baseada em todos os relatórios da loja
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selecionar Loja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="loja">Loja *</Label>
                <Select value={lojaId} onValueChange={setLojaId}>
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
              <div className="flex items-end">
                <Button 
                  onClick={handleGenerate} 
                  disabled={!lojaId || generateHistoryMutation.isFetching}
                  size="lg"
                >
                  {generateHistoryMutation.isFetching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Gerar Histórico IA
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {historyData && (
          <div className="space-y-6">
            {/* Resumo Geral */}
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardHeader>
                <CardTitle className="text-emerald-900">Resumo Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-emerald-800">{historyData.resumoGeral}</p>
              </CardContent>
            </Card>

            {/* Evolução */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Evolução ao Longo do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historyData.evolucao.map((item: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-semibold text-blue-900">{item.periodo}</h4>
                      <p className="text-gray-700">{item.descricao}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Problemas Recorrentes */}
            {historyData.problemasRecorrentes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Problemas Recorrentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {historyData.problemasRecorrentes.map((item: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border ${getSeverityColor(item.gravidade)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold">{item.problema}</h4>
                            <p className="text-sm mt-1">{item.frequencia}</p>
                          </div>
                          <span className="text-xs font-medium uppercase px-2 py-1 rounded">
                            {item.gravidade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pontos Fortes */}
            {historyData.pontosFortes.length > 0 && (
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="h-5 w-5" />
                    Pontos Fortes Consistentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {historyData.pontosFortes.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-green-800">
                        <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tendências */}
            {historyData.tendencias.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tendências Identificadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {historyData.tendencias.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-1">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recomendações */}
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Lightbulb className="h-5 w-5" />
                  Recomendações Prioritárias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historyData.recomendacoes
                    .sort((a: any, b: any) => {
                      const prioOrder = { alta: 0, média: 1, baixa: 2 };
                      return prioOrder[a.prioridade as keyof typeof prioOrder] - prioOrder[b.prioridade as keyof typeof prioOrder];
                    })
                    .map((item: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg border border-purple-200 bg-white">
                        <div className="flex items-start gap-3">
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${getPriorityColor(item.prioridade)}`}>
                            {item.prioridade}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-purple-900">{item.recomendacao}</h4>
                            <p className="text-sm text-gray-600 mt-1">{item.justificativa}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!historyData && lojaId && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma loja e clique em "Gerar Histórico IA" para ver a análise completa</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
