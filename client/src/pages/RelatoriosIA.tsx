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
  FileDown,
  Loader2,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function RelatoriosIA() {
  const [periodo, setPeriodo] = useState<
    "diario" | "semanal" | "mensal" | "trimestral"
  >("semanal");
  const [exportando, setExportando] = useState(false);
  const relatorioRef = useRef<HTMLDivElement>(null);

  const { data: analise, isLoading, refetch } = trpc.relatoriosIA.gerar.useQuery(
    { periodo },
    { enabled: false }
  );

  const handleGerar = () => {
    toast.info("A gerar relatório com IA...");
    refetch();
  };

  const handleExportPDF = async () => {
    if (!analise) {
      toast.error("Gere primeiro um relatório para exportar");
      return;
    }

    setExportando(true);
    toast.info("A preparar PDF...");

    try {
      // Criar conteúdo HTML para o PDF
      const periodoTexto = {
        diario: "Diário",
        semanal: "Semanal",
        mensal: "Mensal",
        trimestral: "Trimestral"
      }[periodo];

      const dataAtual = new Date().toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório IA - PoweringEG</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              padding-bottom: 20px;
              border-bottom: 2px solid #2563eb;
            }
            .header h1 { 
              color: #2563eb; 
              font-size: 28px;
              margin-bottom: 5px;
            }
            .header p { 
              color: #666; 
              font-size: 14px;
            }
            .section { 
              margin-bottom: 25px; 
              page-break-inside: avoid;
            }
            .section-title { 
              font-size: 18px; 
              color: #2563eb; 
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 1px solid #e5e7eb;
            }
            .section-content { 
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
            }
            .card { 
              background: #fff; 
              padding: 15px; 
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .card-title { 
              font-weight: 600; 
              margin-bottom: 8px;
              font-size: 14px;
              color: #374151;
            }
            .card-value { 
              font-size: 20px; 
              font-weight: bold;
              color: #111827;
            }
            .card-subtitle { 
              font-size: 12px; 
              color: #6b7280;
            }
            .list { 
              list-style: none; 
            }
            .list li { 
              padding: 8px 0; 
              border-bottom: 1px solid #f3f4f6;
              display: flex;
              align-items: flex-start;
              gap: 10px;
            }
            .list li:last-child { 
              border-bottom: none; 
            }
            .icon-positive { color: #22c55e; }
            .icon-negative { color: #ef4444; }
            .icon-suggestion { color: #eab308; }
            .highlight-box {
              background: #eff6ff;
              border-left: 4px solid #2563eb;
              padding: 15px;
              margin: 15px 0;
              border-radius: 0 8px 8px 0;
            }
            .frequency-bar {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 8px 0;
            }
            .frequency-name { 
              flex: 1; 
              font-weight: 500;
            }
            .frequency-value { 
              font-size: 14px; 
              color: #6b7280;
              min-width: 40px;
              text-align: right;
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #9ca3af;
            }
            @media print {
              body { padding: 20px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Análise IA</h1>
            <p>Período: ${periodoTexto} | Gerado em: ${dataAtual}</p>
            <p>PoweringEG Platform 2.0</p>
          </div>

          <div class="section">
            <h2 class="section-title">📊 Resumo Geral</h2>
            <div class="section-content">
              <p>${analise.resumo}</p>
            </div>
          </div>

          <div class="section">
            <div class="grid">
              <div class="card">
                <div class="card-title">📈 Loja Mais Visitada</div>
                ${analise.lojaMaisVisitada ? `
                  <div class="card-value">${analise.lojaMaisVisitada.nome}</div>
                  <div class="card-subtitle">${analise.lojaMaisVisitada.visitas} visitas</div>
                ` : '<div class="card-subtitle">Sem dados suficientes</div>'}
              </div>
              <div class="card">
                <div class="card-title">📉 Loja Menos Visitada</div>
                ${analise.lojaMenosVisitada ? `
                  <div class="card-value">${analise.lojaMenosVisitada.nome}</div>
                  <div class="card-subtitle">${analise.lojaMenosVisitada.visitas} visitas</div>
                ` : '<div class="card-subtitle">Sem dados suficientes</div>'}
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">✅ Pontos Positivos</h2>
            <div class="section-content">
              <ul class="list">
                ${analise.pontosPositivos.map(ponto => `
                  <li><span class="icon-positive">✓</span> ${ponto}</li>
                `).join('')}
              </ul>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">❌ Pontos Negativos</h2>
            <div class="section-content">
              <ul class="list">
                ${analise.pontosNegativos.map(ponto => `
                  <li><span class="icon-negative">✗</span> ${ponto}</li>
                `).join('')}
              </ul>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">📋 Análise dos Pontos Destacados pelos Gestores</h2>
            <div class="highlight-box">
              <strong>Tendências Observadas:</strong><br>
              ${analise.analisePontosDestacados?.tendencias || "Sem dados suficientes para identificar tendências."}
            </div>
            <div class="grid">
              <div class="card">
                <div class="card-title" style="color: #22c55e;">👍 Pontos Positivos Destacados</div>
                <ul class="list">
                  ${analise.analisePontosDestacados?.positivos?.length > 0 
                    ? analise.analisePontosDestacados.positivos.map(p => `<li><span class="icon-positive">✓</span> ${p}</li>`).join('')
                    : '<li>Nenhum ponto positivo destacado neste período.</li>'}
                </ul>
              </div>
              <div class="card">
                <div class="card-title" style="color: #ef4444;">👎 Pontos Negativos Destacados</div>
                <ul class="list">
                  ${analise.analisePontosDestacados?.negativos?.length > 0 
                    ? analise.analisePontosDestacados.negativos.map(p => `<li><span class="icon-negative">✗</span> ${p}</li>`).join('')
                    : '<li>Nenhum ponto negativo destacado neste período.</li>'}
                </ul>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">💡 Sugestões de Melhoria</h2>
            <div class="section-content">
              <ul class="list">
                ${analise.sugestoes.map(sugestao => `
                  <li><span class="icon-suggestion">💡</span> ${sugestao}</li>
                `).join('')}
              </ul>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">📊 Frequência de Visitas por Loja</h2>
            <div class="section-content">
              ${Object.entries(analise.frequenciaVisitas)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([loja, visitas]) => `
                  <div class="frequency-bar">
                    <span class="frequency-name">${loja}</span>
                    <span class="frequency-value">${visitas}x</span>
                  </div>
                `).join('')}
            </div>
          </div>

          <div class="footer">
            <p>Relatório gerado automaticamente pelo PoweringEG Platform 2.0</p>
            <p>© ${new Date().getFullYear()} PoweringEG - Todos os direitos reservados</p>
          </div>
        </body>
        </html>
      `;

      // Criar blob e fazer download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Abrir em nova janela para impressão/PDF
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast.success("PDF preparado! Use Ctrl+P ou Cmd+P para guardar como PDF.");
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExportando(false);
    }
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
              <div className="flex gap-2">
                <Button onClick={handleGerar} disabled={isLoading}>
                  {isLoading ? "A gerar..." : "Gerar Relatório"}
                </Button>
                {analise && (
                  <Button 
                    variant="outline" 
                    onClick={handleExportPDF}
                    disabled={exportando}
                  >
                    {exportando ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-2" />
                    )}
                    Exportar PDF
                  </Button>
                )}
              </div>
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
          <div className="space-y-4" ref={relatorioRef}>
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
