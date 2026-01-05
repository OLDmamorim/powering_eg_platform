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
  Target,
  Star,
  AlertTriangle,
  Activity,
  Trophy,
  Medal,
  ArrowUpRight,
  ArrowDownRight,
  Store,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Registar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import { toast } from "sonner";

export default function RelatoriosIA() {
  const [periodo, setPeriodo] = useState<
    "diario" | "semanal" | "mensal" | "mes_anterior" | "trimestral" | "semestral" | "anual"
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
        mensal: "Mensal (mês atual)",
        mes_anterior: "Mês Anterior",
        trimestral: "Trimestral",
        semestral: "Semestral",
        anual: "Anual"
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

          ${analise.analiseResultados ? `
          <div class="section">
            <h2 class="section-title">🎯 Análise de Performance (Resultados)</h2>
            <div class="section-content">
              <div class="highlight-box" style="background: #fff7ed; border-left-color: #f97316;">
                <strong>Resumo de Performance:</strong><br>
                ${analise.analiseResultados.resumoPerformance || "Sem dados de performance disponíveis."}
              </div>
              <div class="highlight-box" style="background: #eff6ff; border-left-color: #3b82f6; margin-top: 15px;">
                <strong>Tendências de Serviços:</strong><br>
                ${analise.analiseResultados.tendenciasServicos || "Sem dados suficientes para identificar tendências."}
              </div>
              <div class="grid" style="margin-top: 15px;">
                <div class="card">
                  <div class="card-title" style="color: #22c55e;">⭐ Lojas em Destaque</div>
                  <ul class="list">
                    ${analise.analiseResultados.lojasDestaque?.length > 0 
                      ? analise.analiseResultados.lojasDestaque.map(l => `<li><span class="icon-positive">★</span> ${l}</li>`).join('')
                      : '<li>Sem dados de lojas em destaque.</li>'}
                  </ul>
                </div>
                <div class="card">
                  <div class="card-title" style="color: #f59e0b;">⚠️ Lojas que Precisam Atenção</div>
                  <ul class="list">
                    ${analise.analiseResultados.lojasAtencao?.length > 0 
                      ? analise.analiseResultados.lojasAtencao.map(l => `<li><span style="color: #f59e0b;">⚠</span> ${l}</li>`).join('')
                      : '<li>Nenhuma loja requer atenção especial.</li>'}
                  </ul>
                </div>
              </div>
              ${analise.analiseResultados.recomendacoes?.length > 0 ? `
              <div style="margin-top: 15px;">
                <strong>🎯 Recomendações de Performance:</strong>
                <ul class="list">
                  ${analise.analiseResultados.recomendacoes.map(r => `<li><span style="color: #3b82f6;">▶</span> ${r}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

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
                    <SelectItem value="mensal">Mensal (mês atual)</SelectItem>
                    <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
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

            {/* Nova secção: Análise de Resultados (Performance) */}
            {analise.analiseResultados && (
              <Card className="border-2 border-orange-200 dark:border-orange-800">
                <CardHeader className="bg-orange-50 dark:bg-orange-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-500" />
                    Análise de Performance (Resultados)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  {/* Resumo de Performance */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Resumo de Performance
                    </h4>
                    <p className="text-muted-foreground">
                      {analise.analiseResultados.resumoPerformance || "Sem dados de performance disponíveis."}
                    </p>
                  </div>

                  {/* Tendências de Serviços */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <LineChart className="h-4 w-4" />
                      Tendências de Serviços
                    </h4>
                    <p className="text-muted-foreground">
                      {analise.analiseResultados.tendenciasServicos || "Sem dados suficientes para identificar tendências."}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Lojas em Destaque */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-green-600">
                        <Star className="h-4 w-4" />
                        Lojas em Destaque
                      </h4>
                      <ul className="space-y-2">
                        {analise.analiseResultados.lojasDestaque?.length > 0 ? (
                          analise.analiseResultados.lojasDestaque.map((loja, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <Star className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <span>{loja}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground">
                            Sem dados de lojas em destaque.
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Lojas que Precisam Atenção */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        Lojas que Precisam Atenção
                      </h4>
                      <ul className="space-y-2">
                        {analise.analiseResultados.lojasAtencao?.length > 0 ? (
                          analise.analiseResultados.lojasAtencao.map((loja, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              <span>{loja}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground">
                            Nenhuma loja requer atenção especial.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Recomendações baseadas em Performance */}
                  {analise.analiseResultados.recomendacoes?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-primary">
                        <Target className="h-4 w-4" />
                        Recomendações de Performance
                      </h4>
                      <ul className="space-y-2">
                        {analise.analiseResultados.recomendacoes.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Nova secção: Comparação de Lojas com Gráficos */}
            {analise.comparacaoLojas && (
              <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-purple-500" />
                    Comparação de Lojas - Resultados do Período
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  {/* Cards de Destaques */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Melhor Loja */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-700 dark:text-green-400">Melhor Loja</span>
                      </div>
                      <p className="text-lg font-bold">{analise.comparacaoLojas.melhorLoja?.nome || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        {analise.comparacaoLojas.melhorLoja?.servicos || 0} serviços
                        <span className={`ml-2 ${(analise.comparacaoLojas.melhorLoja?.desvio || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({(analise.comparacaoLojas.melhorLoja?.desvio || 0) >= 0 ? '+' : ''}{(analise.comparacaoLojas.melhorLoja?.desvio || 0).toFixed(1)}%)
                        </span>
                      </p>
                    </div>

                    {/* Pior Loja */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Store className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-700 dark:text-red-400">Loja com Menos Serviços</span>
                      </div>
                      <p className="text-lg font-bold">{analise.comparacaoLojas.piorLoja?.nome || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        {analise.comparacaoLojas.piorLoja?.servicos || 0} serviços
                        <span className={`ml-2 ${(analise.comparacaoLojas.piorLoja?.desvio || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({(analise.comparacaoLojas.piorLoja?.desvio || 0) >= 0 ? '+' : ''}{(analise.comparacaoLojas.piorLoja?.desvio || 0).toFixed(1)}%)
                        </span>
                      </p>
                    </div>

                    {/* Maior Evolução */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-700 dark:text-blue-400">Maior Evolução</span>
                      </div>
                      <p className="text-lg font-bold">{analise.comparacaoLojas.maiorEvolucao?.nome || 'N/A'}</p>
                      <p className="text-sm text-green-600">
                        {analise.comparacaoLojas.maiorEvolucao?.variacao ? `+${analise.comparacaoLojas.maiorEvolucao.variacao.toFixed(1)}%` : 'N/A'} vs mês anterior
                      </p>
                    </div>

                    {/* Menor Evolução */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Menor Evolução</span>
                      </div>
                      <p className="text-lg font-bold">{analise.comparacaoLojas.menorEvolucao?.nome || 'N/A'}</p>
                      <p className="text-sm text-red-600">
                        {analise.comparacaoLojas.menorEvolucao?.variacao ? `${analise.comparacaoLojas.menorEvolucao.variacao.toFixed(1)}%` : 'N/A'} vs mês anterior
                      </p>
                    </div>
                  </div>

                  {/* Resumo Estatístico */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{analise.comparacaoLojas.totalLojas}</p>
                        <p className="text-sm text-muted-foreground">Lojas Analisadas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{analise.comparacaoLojas.lojasAcimaMedia}</p>
                        <p className="text-sm text-muted-foreground">Acima do Objetivo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{analise.comparacaoLojas.totalLojas - analise.comparacaoLojas.lojasAcimaMedia}</p>
                        <p className="text-sm text-muted-foreground">Abaixo do Objetivo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {analise.comparacaoLojas.totalLojas > 0 ? ((analise.comparacaoLojas.lojasAcimaMedia / analise.comparacaoLojas.totalLojas) * 100).toFixed(0) : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico de Ranking */}
                  {analise.dadosGraficos?.rankingServicos && analise.dadosGraficos.rankingServicos.length > 0 && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Top 10 Lojas por Serviços
                      </h4>
                      <div style={{ height: '300px' }}>
                        <Bar
                          data={{
                            labels: analise.dadosGraficos.rankingServicos.map(l => l.loja.length > 15 ? l.loja.substring(0, 15) + '...' : l.loja),
                            datasets: [{
                              label: 'Serviços',
                              data: analise.dadosGraficos.rankingServicos.map(l => l.servicos),
                              backgroundColor: analise.dadosGraficos.rankingServicos.map(l => 
                                l.desvio >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                              ),
                              borderColor: analise.dadosGraficos.rankingServicos.map(l => 
                                l.desvio >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                              ),
                              borderWidth: 1,
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  afterLabel: (context) => {
                                    const idx = context.dataIndex;
                                    const desvio = analise.dadosGraficos?.rankingServicos[idx]?.desvio || 0;
                                    return `Desvio: ${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)}%`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: { beginAtZero: true, title: { display: true, text: 'Serviços' } },
                              x: { ticks: { maxRotation: 45, minRotation: 45 } }
                            }
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Verde = Acima do objetivo | Vermelho = Abaixo do objetivo
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
