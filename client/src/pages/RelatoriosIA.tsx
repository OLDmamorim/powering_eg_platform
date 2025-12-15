import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  CheckCircle2,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  LineChart,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function RelatoriosIA() {
  const [periodo, setPeriodo] = useState<
    "diario" | "semanal" | "mensal" | "trimestral"
  >("semanal");

  const { data: analise, isLoading, refetch } = trpc.relatoriosIA.gerar.useQuery(
    { periodo },
    { enabled: false }
  );

  const handleGerar = () => {
    toast.info("A gerar relatório com IA...");
    refetch();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatórios com IA
          </h1>
          <p className="text-muted-foreground">
            Análise automática de supervisões com inteligência artificial
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração do Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Select
                  value={periodo}
                  onValueChange={(value: any) => setPeriodo(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGerar} disabled={isLoading}>
                {isLoading ? "A gerar..." : "Gerar Relatório"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">
                A analisar relatórios com IA...
              </p>
            </div>
          </div>
        )}

        {analise && !isLoading && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Resumo Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{analise.resumo}</p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Loja Mais Visitada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analise.lojaMaisVisitada ? (
                    <div>
                      <p className="text-2xl font-bold">
                        {analise.lojaMaisVisitada.nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analise.lojaMaisVisitada.visitas} visitas
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Sem dados suficientes
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-orange-500" />
                    Loja Menos Visitada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analise.lojaMenosVisitada ? (
                    <div>
                      <p className="text-2xl font-bold">
                        {analise.lojaMenosVisitada.nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analise.lojaMenosVisitada.visitas} visitas
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Sem dados suficientes
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Pontos Positivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analise.pontosPositivos.map((ponto, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>{ponto}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Pontos Negativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analise.pontosNegativos.map((ponto, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                      <span>{ponto}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Nova secção: Análise dos Pontos Destacados pelos Gestores */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Análise dos Pontos Destacados pelos Gestores
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {/* Tendências */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <LineChart className="h-4 w-4" />
                    Tendências Observadas
                  </h4>
                  <p className="text-muted-foreground">
                    {analise.analisePontosDestacados?.tendencias || "Sem dados suficientes para identificar tendências."}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Análise Pontos Positivos */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2 text-green-600">
                      <ThumbsUp className="h-4 w-4" />
                      Pontos Positivos Destacados
                    </h4>
                    <ul className="space-y-2">
                      {analise.analisePontosDestacados?.positivos?.length > 0 ? (
                        analise.analisePontosDestacados.positivos.map((ponto, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <ThumbsUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{ponto}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">
                          Nenhum ponto positivo destacado neste período.
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Análise Pontos Negativos */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2 text-red-600">
                      <ThumbsDown className="h-4 w-4" />
                      Pontos Negativos Destacados
                    </h4>
                    <ul className="space-y-2">
                      {analise.analisePontosDestacados?.negativos?.length > 0 ? (
                        analise.analisePontosDestacados.negativos.map((ponto, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <ThumbsDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            <span>{ponto}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">
                          Nenhum ponto negativo destacado neste período.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Sugestões de Melhoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analise.sugestoes.map((sugestao, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                      <span>{sugestao}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Frequência de Visitas por Loja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analise.frequenciaVisitas)
                    .sort((a, b) => b[1] - a[1])
                    .map(([loja, visitas]) => (
                      <div key={loja} className="flex items-center justify-between">
                        <span className="font-medium">{loja}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${(visitas / Math.max(...Object.values(analise.frequenciaVisitas))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {visitas}x
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
