import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Download, Calendar, FileText, ArrowLeftRight } from "lucide-react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";
import jsPDF from "jspdf";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";

// Função helper para converter JSON de análise IA para markdown
function analiseToMarkdown(conteudoJSON: string): string {
  try {
    const analise = JSON.parse(conteudoJSON);
    
    let markdown = `## 📊 Resumo Geral\n\n${analise.resumo}\n\n`;
    
    if (analise.lojaMaisVisitada) {
      markdown += `### 📈 Loja Mais Visitada\n**${analise.lojaMaisVisitada.nome}** - ${analise.lojaMaisVisitada.visitas} visitas\n\n`;
    }
    
    if (analise.lojaMenosVisitada) {
      markdown += `### 📉 Loja Menos Visitada\n**${analise.lojaMenosVisitada.nome}** - ${analise.lojaMenosVisitada.visitas} visitas\n\n`;
    }
    
    markdown += `### ✅ Pontos Positivos\n\n`;
    analise.pontosPositivos?.forEach((ponto: string) => {
      markdown += `- ${ponto}\n`;
    });
    
    markdown += `\n### ❌ Pontos Negativos\n\n`;
    analise.pontosNegativos?.forEach((ponto: string) => {
      markdown += `- ${ponto}\n`;
    });
    
    markdown += `\n### 💡 Sugestões de Melhoria\n\n`;
    analise.sugestoes?.forEach((sugestao: string) => {
      markdown += `- ${sugestao}\n`;
    });
    
    if (analise.analisePontosDestacados) {
      markdown += `\n### 📋 Análise dos Pontos Destacados pelos Gestores\n\n`;
      markdown += `**Tendências Observadas:**\n${analise.analisePontosDestacados.tendencias}\n\n`;
      
      if (analise.analisePontosDestacados.positivos?.length > 0) {
        markdown += `**👍 Pontos Positivos Destacados:**\n`;
        analise.analisePontosDestacados.positivos.forEach((p: string) => {
          markdown += `- ${p}\n`;
        });
        markdown += `\n`;
      }
      
      if (analise.analisePontosDestacados.negativos?.length > 0) {
        markdown += `**👎 Pontos Negativos Destacados:**\n`;
        analise.analisePontosDestacados.negativos.forEach((p: string) => {
          markdown += `- ${p}\n`;
        });
      }
    }
    
    if (analise.frequenciaVisitas && Object.keys(analise.frequenciaVisitas).length > 0) {
      markdown += `\n### 📊 Frequência de Visitas por Loja\n\n`;
      Object.entries(analise.frequenciaVisitas)
        .sort((a: any, b: any) => b[1] - a[1])
        .forEach(([loja, visitas]) => {
          markdown += `- **${loja}**: ${visitas}x\n`;
        });
    }
    
    return markdown;
  } catch (error) {
    console.error('Erro ao parsear conteúdo JSON:', error);
    return 'Erro ao carregar conteúdo do relatório.';
  }
}

export default function HistoricoRelatoriosIA() {
  const { language, t } = useLanguage();
  const [, navigate] = useLocation();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [openCards, setOpenCards] = useState<Record<number, boolean>>({});

  const { data: relatorios, isLoading } = trpc.relatoriosIA.getHistorico.useQuery();

  const toggleCard = (id: number) => {
    setOpenCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const relatoriosFiltrados = relatorios?.filter(rel => {
    const dataRelatorio = new Date(rel.createdAt);
    const inicio = dataInicio ? new Date(dataInicio) : null;
    const fim = dataFim ? new Date(dataFim) : null;

    if (inicio && dataRelatorio < inicio) return false;
    if (fim && dataRelatorio > fim) return false;
    return true;
  });

  const downloadPDF = (relatorio: NonNullable<typeof relatorios>[0]) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;
      
      // Título
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório IA - PoweringEG Platform 2.0", margin, 20);
      
      // Data
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em: ${new Date(relatorio.createdAt).toLocaleString("pt-PT")}`, margin, 28);
      doc.text(`Por: ${relatorio.geradoPorNome}`, margin, 34);
      
      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(margin, 38, pageWidth - margin, 38);
      
      // Conteúdo (remover markdown básico)
      doc.setFontSize(10);
      const conteudoLimpo = relatorio.conteudo
        .replace(/#{1,6}\s/g, '') // Remove headers markdown
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\*/g, '') // Remove italic
        .replace(/`/g, ''); // Remove code
      
      const linhas = doc.splitTextToSize(conteudoLimpo, maxWidth);
      let y = 45;
      
      linhas.forEach((linha: string) => {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(linha, margin, y);
        y += 6;
      });
      
      doc.save(`relatorio-ia-${relatorio.id}.pdf`);
      
      toast.success(language === 'pt' ? "Relatório exportado com sucesso!" : "Report exported successfully!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error(language === 'pt' ? "Não foi possível gerar o PDF." : "Could not generate PDF.");
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">A carregar histórico...</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('historicoRelatoriosIA.title')}</h1>
            <p className="text-muted-foreground">
              {t('historicoRelatoriosIA.subtitle')}
            </p>
          </div>
          <Button onClick={() => navigate("/comparacao-relatorios-ia")}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            {t('historicoRelatoriosIA.compararRelatorios')}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('historicoRelatoriosIA.filtrosPeriodo')}
          </CardTitle>
          <CardDescription>{t('historicoRelatoriosIA.filtreRelatoriosPorIntervalo')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataInicio">{t('historicoRelatoriosIA.dataInicio')}</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dataFim">{t('historicoRelatoriosIA.dataFim')}</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>
          {(dataInicio || dataFim) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setDataInicio("");
                setDataFim("");
              }}
            >
              {t('historicoRelatoriosIA.limparFiltros')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Lista de Relatórios */}
      <div className="space-y-4">
        {!relatoriosFiltrados || relatoriosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('historicoRelatoriosIA.nenhumRelatorioEncontrado')}</p>
              <p className="text-sm mt-2">{language === 'pt' ? 'Gere relatórios na página "Relatórios IA".' : 'Generate reports on the "AI Reports" page.'}</p>
            </CardContent>
          </Card>
        ) : (
          relatoriosFiltrados.map((relatorio) => (
            <Collapsible
              key={relatorio.id}
              open={openCards[relatorio.id]}
              onOpenChange={() => toggleCard(relatorio.id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <FileText className="h-5 w-5" />
                          {language === 'pt' ? 'Relatório IA' : 'AI Report'} #{relatorio.id}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          <div className="flex flex-col gap-1">
                            <span>
                              📅 {new Date(relatorio.createdAt).toLocaleDateString("pt-PT", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>👤 Gerado por: {relatorio.geradoPorNome}</span>
                            <span className="text-xs">{language === 'pt' ? 'Período' : 'Period'}: {relatorio.periodo.charAt(0).toUpperCase() + relatorio.periodo.slice(1)}</span>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadPDF(relatorio);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                        {openCards[relatorio.id] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <div className="w-full">
                        <div className="prose prose-sm dark:prose-invert" style={{ maxWidth: '100%' }}>
                          <Streamdown>{analiseToMarkdown(relatorio.conteudo)}</Streamdown>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>

      {relatoriosFiltrados && relatoriosFiltrados.length > 0 && (
        <p className="text-sm text-muted-foreground text-center mt-6">
          Total: {relatoriosFiltrados.length} relatório(s) encontrado(s)
        </p>
      )}
    </div>
    </DashboardLayout>
  );
}
