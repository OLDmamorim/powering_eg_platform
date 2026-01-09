import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Download, Calendar, Highlighter, Trash2, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import jsPDF from "jspdf";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";

interface Marcador {
  id: string;
  texto: string;
  nota: string;
  cor: string;
  timestamp: number;
}

export default function ComparacaoRelatoriosIA() {
  const { t } = useLanguage();
  const [relatorio1Id, setRelatorio1Id] = useState<string>("");
  const [relatorio2Id, setRelatorio2Id] = useState<string>("");
  const [marcadores1, setMarcadores1] = useState<Marcador[]>([]);
  const [marcadores2, setMarcadores2] = useState<Marcador[]>([]);
  const [novaMarca1, setNovaMarca1] = useState("");
  const [novaMarca2, setNovaMarca2] = useState("");
  const [corSelecionada, setCorSelecionada] = useState("yellow");

  const { data: relatorios, isLoading } = trpc.relatoriosIA.getHistorico.useQuery();
  const { data: relatorio1 } = trpc.relatoriosIA.getById.useQuery(
    { id: parseInt(relatorio1Id) },
    { enabled: !!relatorio1Id }
  );
  const { data: relatorio2 } = trpc.relatoriosIA.getById.useQuery(
    { id: parseInt(relatorio2Id) },
    { enabled: !!relatorio2Id }
  );

  const podeComparar = relatorio1 && relatorio2;

  // Persistir marcadores no localStorage
  useEffect(() => {
    if (relatorio1Id && relatorio2Id) {
      const key = `marcadores_${relatorio1Id}_${relatorio2Id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const { m1, m2 } = JSON.parse(saved);
        setMarcadores1(m1 || []);
        setMarcadores2(m2 || []);
      }
    }
  }, [relatorio1Id, relatorio2Id]);

  useEffect(() => {
    if (relatorio1Id && relatorio2Id) {
      const key = `marcadores_${relatorio1Id}_${relatorio2Id}`;
      localStorage.setItem(key, JSON.stringify({ m1: marcadores1, m2: marcadores2 }));
    }
  }, [marcadores1, marcadores2, relatorio1Id, relatorio2Id]);

  const adicionarMarcador = (lado: 1 | 2) => {
    const texto = lado === 1 ? novaMarca1 : novaMarca2;
    if (!texto.trim()) {
      toast.error("Digite uma nota para o marcador");
      return;
    }

    const novoMarcador: Marcador = {
      id: Date.now().toString(),
      texto: texto.trim(),
      nota: texto.trim(),
      cor: corSelecionada,
      timestamp: Date.now(),
    };

    if (lado === 1) {
      setMarcadores1([...marcadores1, novoMarcador]);
      setNovaMarca1("");
    } else {
      setMarcadores2([...marcadores2, novoMarcador]);
      setNovaMarca2("");
    }

    toast.success("Marcador adicionado!");
  };

  const removerMarcador = (lado: 1 | 2, id: string) => {
    if (lado === 1) {
      setMarcadores1(marcadores1.filter(m => m.id !== id));
    } else {
      setMarcadores2(marcadores2.filter(m => m.id !== id));
    }
    toast.success("Marcador removido");
  };

  const limparMarcadores = () => {
    setMarcadores1([]);
    setMarcadores2([]);
    toast.success("Todos os marcadores foram removidos");
  };

  const cores = [
    { valor: "yellow", label: "Importante", classe: "bg-yellow-200 dark:bg-yellow-900" },
    { valor: "red", label: "Aten\u00e7\u00e3o", classe: "bg-red-200 dark:bg-red-900" },
    { valor: "green", label: "Positivo", classe: "bg-green-200 dark:bg-green-900" },
    { valor: "blue", label: "Negativo", classe: "bg-blue-200 dark:bg-blue-900" },
  ];

  const downloadComparacaoPDF = () => {
    if (!relatorio1 || !relatorio2) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;

      // Título
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Comparação de Relatórios IA", margin, 20);

      // Informações dos relatórios
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Relatório 1: #${relatorio1.id} - ${new Date(relatorio1.createdAt).toLocaleDateString("pt-PT")}`, margin, 28);
      doc.text(`Relatório 2: #${relatorio2.id} - ${new Date(relatorio2.createdAt).toLocaleDateString("pt-PT")}`, margin, 34);

      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(margin, 38, pageWidth - margin, 38);

      let y = 45;

      // Relatório 1
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Relatório 1 (${new Date(relatorio1.createdAt).toLocaleDateString("pt-PT")})`, margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const conteudo1Limpo = relatorio1.conteudo
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '');

      const linhas1 = doc.splitTextToSize(conteudo1Limpo, maxWidth);
      linhas1.forEach((linha: string) => {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(linha, margin, y);
        y += 6;
      });

      // Nova página para relatório 2
      doc.addPage();
      y = 20;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Relatório 2 (${new Date(relatorio2.createdAt).toLocaleDateString("pt-PT")})`, margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const conteudo2Limpo = relatorio2.conteudo
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '');

      const linhas2 = doc.splitTextToSize(conteudo2Limpo, maxWidth);
      linhas2.forEach((linha: string) => {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(linha, margin, y);
        y += 6;
      });

      doc.save(`comparacao-relatorios-${relatorio1.id}-vs-${relatorio2.id}.pdf`);
      toast.success("Comparação exportada com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">A carregar relatórios...</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Comparação de Relatórios IA</h1>
        <p className="text-muted-foreground">
          Compare dois relatórios lado-a-lado para identificar mudanças de tendências
        </p>
      </div>

      {/* Seleção de Relatórios */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Selecionar Relatórios
          </CardTitle>
          <CardDescription>Escolha dois relatórios para comparar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="relatorio1">Relatório 1 (Mais Antigo)</Label>
              <Select value={relatorio1Id} onValueChange={setRelatorio1Id}>
                <SelectTrigger id="relatorio1">
                  <SelectValue placeholder="Selecione o primeiro relatório" />
                </SelectTrigger>
                <SelectContent>
                  {relatorios?.map((rel) => (
                    <SelectItem key={rel.id} value={rel.id.toString()}>
                      #{rel.id} - {new Date(rel.createdAt).toLocaleDateString("pt-PT", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relatorio2">Relatório 2 (Mais Recente)</Label>
              <Select value={relatorio2Id} onValueChange={setRelatorio2Id}>
                <SelectTrigger id="relatorio2">
                  <SelectValue placeholder="Selecione o segundo relatório" />
                </SelectTrigger>
                <SelectContent>
                  {relatorios?.map((rel) => (
                    <SelectItem key={rel.id} value={rel.id.toString()}>
                      #{rel.id} - {new Date(rel.createdAt).toLocaleDateString("pt-PT", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {podeComparar && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={downloadComparacaoPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Compara\u00e7\u00e3o PDF
              </Button>
              {(marcadores1.length > 0 || marcadores2.length > 0) && (
                <Button onClick={limparMarcadores} variant="outline" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Marcadores
                </Button>
              )}
              <div className="flex gap-2 items-center ml-auto">
                <span className="text-sm text-muted-foreground">Cor:</span>
                {cores.map(cor => (
                  <button
                    key={cor.valor}
                    onClick={() => setCorSelecionada(cor.valor)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      corSelecionada === cor.valor ? "border-foreground" : "border-transparent"
                    } ${cor.classe}`}
                    title={cor.label}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visualização Lado-a-Lado */}
      {podeComparar ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Relatório 1 */}
          <Card>
            <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Relatório 1 - #{relatorio1.id}
              </CardTitle>
              <CardDescription>
                {new Date(relatorio1.createdAt).toLocaleDateString("pt-PT", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="prose prose-sm dark:prose-invert" style={{ maxWidth: '100%' }}>
                <Streamdown>{relatorio1.conteudo}</Streamdown>
              </div>
              
              {/* Marcadores Relatório 1 */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Highlighter className="h-4 w-4" />
                  <span className="text-sm font-medium">Marcadores ({marcadores1.length})</span>
                </div>
                
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicione uma nota ou comentário..."
                    value={novaMarca1}
                    onChange={(e) => setNovaMarca1(e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    onClick={() => adicionarMarcador(1)}
                    size="sm"
                    className="self-start"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {marcadores1.length > 0 && (
                  <div className="space-y-2">
                    {marcadores1.map((marcador) => {
                      const corInfo = cores.find(c => c.valor === marcador.cor);
                      return (
                        <div
                          key={marcador.id}
                          className={`p-3 rounded-lg ${corInfo?.classe} flex items-start justify-between gap-2`}
                        >
                          <div className="flex-1">
                            <p className="text-sm">{marcador.nota}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(marcador.timestamp).toLocaleString("pt-PT")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerMarcador(1, marcador.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Relatório 2 */}
          <Card>
            <CardHeader className="bg-green-50 dark:bg-green-950/20">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Relatório 2 - #{relatorio2.id}
              </CardTitle>
              <CardDescription>
                {new Date(relatorio2.createdAt).toLocaleDateString("pt-PT", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="prose prose-sm dark:prose-invert" style={{ maxWidth: '100%' }}>
                <Streamdown>{relatorio2.conteudo}</Streamdown>
              </div>
              
              {/* Marcadores Relatório 2 */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Highlighter className="h-4 w-4" />
                  <span className="text-sm font-medium">Marcadores ({marcadores2.length})</span>
                </div>
                
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicione uma nota ou comentário..."
                    value={novaMarca2}
                    onChange={(e) => setNovaMarca2(e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    onClick={() => adicionarMarcador(2)}
                    size="sm"
                    className="self-start"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {marcadores2.length > 0 && (
                  <div className="space-y-2">
                    {marcadores2.map((marcador) => {
                      const corInfo = cores.find(c => c.valor === marcador.cor);
                      return (
                        <div
                          key={marcador.id}
                          className={`p-3 rounded-lg ${corInfo?.classe} flex items-start justify-between gap-2`}
                        >
                          <div className="flex-1">
                            <p className="text-sm">{marcador.nota}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(marcador.timestamp).toLocaleString("pt-PT")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerMarcador(2, marcador.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Selecione dois relatórios para comparar</p>
            <p className="text-sm mt-2">
              Escolha um relatório mais antigo e um mais recente para ver as mudanças de tendências
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </DashboardLayout>
  );
}
