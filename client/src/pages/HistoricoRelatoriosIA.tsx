import { useState } from "react";
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

export default function HistoricoRelatoriosIA() {
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
      doc.text("Relatório IA - PoweringEG Platform", margin, 20);
      
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
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Não foi possível gerar o PDF.");
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
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Histórico de Relatórios IA</h1>
            <p className="text-muted-foreground">
              Consulte todos os relatórios IA gerados (semanais, mensais, trimestrais)
            </p>
          </div>
          <Button onClick={() => navigate("/comparacao-relatorios-ia")}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Comparar Relatórios
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros de Período
          </CardTitle>
          <CardDescription>Filtre relatórios por intervalo de datas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dataFim">Data Fim</Label>
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
              Limpar Filtros
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
              <p>Nenhum relatório IA encontrado.</p>
              <p className="text-sm mt-2">Gere relatórios na página "Relatórios IA".</p>
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
                          Relatório IA #{relatorio.id}
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
                            <span className="text-xs">Versão: {relatorio.versao}</span>
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
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Streamdown>{relatorio.conteudo}</Streamdown>
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
  );
}
