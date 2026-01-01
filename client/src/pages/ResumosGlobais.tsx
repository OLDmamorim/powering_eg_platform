import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Calendar, Download, Home, ChevronRight, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import DashboardLayout from '@/components/DashboardLayout';

type Periodo = 'mensal' | 'trimestral' | 'semestral' | 'anual';

interface ResumoData {
  titulo: string;
  resumoExecutivo: string;
  destaques: string[];
  pontosCriticos: string[];
  recomendacoes: string[];
  metricas: {
    taxaResolucaoPendentes: string;
    taxaResolucaoAlertas: string;
    mediaRelatoriosPorLoja: string;
  };
}

export default function ResumosGlobais() {
  const [periodo, setPeriodo] = useState<Periodo>('mensal');
  const [resumoGerado, setResumoGerado] = useState<ResumoData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const gerarResumoMutation = trpc.resumosGlobais.gerar.useMutation({
    onSuccess: (data) => {
      try {
        const parsed = JSON.parse(data.conteudo);
        setResumoGerado(parsed);
        toast.success('Resumo global gerado com sucesso!');
      } catch (e) {
        console.error('Erro ao parsear resumo:', e);
        toast.error('Erro ao processar resumo');
      }
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar resumo: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const handleGerar = () => {
    setIsGenerating(true);
    setResumoGerado(null);

    const agora = new Date();
    let dataInicio: Date;
    let dataFim: Date = agora;

    switch (periodo) {
      case 'mensal':
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        break;
      case 'trimestral':
        const mesAtual = agora.getMonth();
        const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
        dataInicio = new Date(agora.getFullYear(), inicioTrimestre, 1);
        break;
      case 'semestral':
        const inicioSemestre = agora.getMonth() < 6 ? 0 : 6;
        dataInicio = new Date(agora.getFullYear(), inicioSemestre, 1);
        break;
      case 'anual':
        dataInicio = new Date(agora.getFullYear(), 0, 1);
        break;
    }

    gerarResumoMutation.mutate({
      periodo,
      dataInicio,
      dataFim,
    });
  };

  const handleDownloadPDF = () => {
    if (!resumoGerado) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Função auxiliar para verificar e adicionar nova página
    const checkNewPage = (neededHeight: number) => {
      if (yPosition + neededHeight > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Função para desenhar linha separadora
    const drawSeparator = () => {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    };

    // ===== CABEÇALHO =====
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PoweringEG Platform 2.0', margin, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Resumo Global', margin, 25);
    
    yPosition = 50;
    doc.setTextColor(0, 0, 0);

    // ===== INFORMAÇÕES DO PERÍODO =====
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(periodo.charAt(0).toUpperCase() + periodo.slice(1), margin + 25, yPosition);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Data de Geração:', margin + 80, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('pt-PT'), margin + 120, yPosition);
    
    yPosition += 15;
    drawSeparator();

    // ===== TÍTULO DO RESUMO =====
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204);
    const tituloLines = doc.splitTextToSize(resumoGerado.titulo, maxWidth);
    doc.text(tituloLines, margin, yPosition);
    yPosition += tituloLines.length * 8 + 10;
    doc.setTextColor(0, 0, 0);

    // ===== RESUMO EXECUTIVO =====
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Resumo Executivo', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const resumoLines = doc.splitTextToSize(resumoGerado.resumoExecutivo, maxWidth);
    resumoLines.forEach((linha: string) => {
      checkNewPage(6);
      doc.text(linha, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 10;

    // ===== MÉTRICAS =====
    checkNewPage(40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Métricas do Período', margin, yPosition);
    yPosition += 10;

    // Desenhar caixas de métricas
    const boxWidth = (maxWidth - 10) / 3;
    const boxHeight = 25;
    const metricas = [
      { label: 'Taxa Resolução Pendentes', value: resumoGerado.metricas.taxaResolucaoPendentes },
      { label: 'Taxa Resolução Alertas', value: resumoGerado.metricas.taxaResolucaoAlertas },
      { label: 'Média Relatórios/Loja', value: resumoGerado.metricas.mediaRelatoriosPorLoja },
    ];

    metricas.forEach((metrica, index) => {
      const xPos = margin + index * (boxWidth + 5);
      
      // Caixa de fundo
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(xPos, yPosition, boxWidth, boxHeight, 3, 3, 'FD');
      
      // Valor
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 102, 204);
      doc.text(metrica.value, xPos + boxWidth / 2, yPosition + 10, { align: 'center' });
      
      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const labelLines = doc.splitTextToSize(metrica.label, boxWidth - 4);
      doc.text(labelLines, xPos + boxWidth / 2, yPosition + 18, { align: 'center' });
    });
    
    yPosition += boxHeight + 15;

    // ===== DESTAQUES POSITIVOS =====
    checkNewPage(50);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34); // Verde
    doc.text('✓ Destaques Positivos', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    resumoGerado.destaques.forEach((destaque, index) => {
      checkNewPage(12);
      const bulletText = `${index + 1}. ${destaque}`;
      const lines = doc.splitTextToSize(bulletText, maxWidth - 5);
      lines.forEach((linha: string, lineIndex: number) => {
        doc.text(lineIndex === 0 ? linha : `   ${linha}`, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 2;
    });
    yPosition += 8;

    // ===== PONTOS CRÍTICOS =====
    checkNewPage(50);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69); // Vermelho
    doc.text('⚠ Pontos Críticos', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    resumoGerado.pontosCriticos.forEach((ponto, index) => {
      checkNewPage(12);
      const bulletText = `${index + 1}. ${ponto}`;
      const lines = doc.splitTextToSize(bulletText, maxWidth - 5);
      lines.forEach((linha: string, lineIndex: number) => {
        doc.text(lineIndex === 0 ? linha : `   ${linha}`, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 2;
    });
    yPosition += 8;

    // ===== RECOMENDAÇÕES =====
    checkNewPage(50);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204); // Azul
    doc.text('→ Recomendações Estratégicas', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    resumoGerado.recomendacoes.forEach((recomendacao, index) => {
      checkNewPage(12);
      const bulletText = `${index + 1}. ${recomendacao}`;
      const lines = doc.splitTextToSize(bulletText, maxWidth - 5);
      lines.forEach((linha: string, lineIndex: number) => {
        doc.text(lineIndex === 0 ? linha : `   ${linha}`, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 2;
    });

    // ===== RODAPÉ EM TODAS AS PÁGINAS =====
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Linha separadora do rodapé
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      // Texto do rodapé
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `PoweringEG Platform 2.0 | Resumo Global ${periodo.charAt(0).toUpperCase() + periodo.slice(1)}`,
        margin,
        pageHeight - 8
      );
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    }

    doc.save(`resumo-global-${periodo}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF descarregado com sucesso!');
  };

  const getPeriodoLabel = (p: Periodo) => {
    const labels = {
      mensal: 'Mensal',
      trimestral: 'Trimestral',
      semestral: 'Semestral',
      anual: 'Anual',
    };
    return labels[p];
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">Resumos Globais</span>
        </nav>

        <div>
          <h1 className="text-3xl font-bold">Resumos Globais</h1>
          <p className="text-muted-foreground mt-2">
            Gere análises consolidadas da rede de lojas por período
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Gerar Novo Resumo
            </CardTitle>
            <CardDescription>
              Selecione o período e gere uma análise completa com IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal (mês atual)</SelectItem>
                    <SelectItem value="trimestral">Trimestral (trimestre atual)</SelectItem>
                    <SelectItem value="semestral">Semestral (semestre atual)</SelectItem>
                    <SelectItem value="anual">Anual (ano atual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGerar} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Resumo
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {resumoGerado && (
          <div className="space-y-6">
            {/* Cabeçalho do Resumo */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{resumoGerado.titulo}</CardTitle>
                    <CardDescription className="mt-1">
                      Gerado em {new Date().toLocaleDateString('pt-PT')} às {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                    <Download className="mr-2 h-4 w-4" />
                    Descarregar PDF
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {resumoGerado.metricas.taxaResolucaoPendentes}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Taxa Resolução Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {resumoGerado.metricas.taxaResolucaoAlertas}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">Taxa Resolução Alertas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {resumoGerado.metricas.mediaRelatoriosPorLoja}
                      </p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">Média Relatórios/Loja</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo Executivo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resumo Executivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {resumoGerado.resumoExecutivo}
                </p>
              </CardContent>
            </Card>

            {/* Destaques e Pontos Críticos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <TrendingUp className="h-5 w-5" />
                    Destaques Positivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {resumoGerado.destaques.map((destaque, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm text-muted-foreground">{destaque}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <TrendingDown className="h-5 w-5" />
                    Pontos Críticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {resumoGerado.pontosCriticos.map((ponto, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm text-muted-foreground">{ponto}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Recomendações */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Target className="h-5 w-5" />
                  Recomendações Estratégicas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {resumoGerado.recomendacoes.map((recomendacao, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{recomendacao}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
