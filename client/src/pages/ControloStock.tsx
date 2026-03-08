import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Warehouse,
  Search,
  ClipboardPaste,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  History,
  ArrowLeft,
  Loader2,
  FileText,
  Info,
  Download,
  Trash2,
  Mail,
  Send,
  Tag,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ItemComFichas {
  ref: string;
  descricao: string;
  quantidade: number;
  familia?: string;
  totalFichas: number;
  fichas: Array<{
    obrano: string;
    matricula: string;
    marca: string;
    modelo: string;
    status: string;
    diasAberto: number;
  }>;
}

interface ItemSemFichas {
  ref: string;
  descricao: string;
  quantidade: number;
  familia?: string;
}

interface FichaSemStock {
  eurocode: string;
  obrano: string;
  matricula: string;
  marca: string;
  modelo: string;
  status: string;
  diasAberto: number;
}

// --- Export helpers ---

const CLASSIFICACAO_LABELS: Record<string, string> = {
  devolucao_rejeitada: 'Devolução Rejeitada',
  usado: 'Usado',
  com_danos: 'Com Danos',
  para_devolver: 'Para Devolver',
};

const CLASSIFICACAO_COLORS: Record<string, string> = {
  devolucao_rejeitada: 'bg-purple-100 text-purple-700',
  usado: 'bg-gray-100 text-gray-700',
  com_danos: 'bg-orange-100 text-orange-700',
  para_devolver: 'bg-cyan-100 text-cyan-700',
};

async function exportConsolidatedExcel(
  nomeLoja: string,
  comFichas: any[],
  semFichas: any[],
  fichasSemStock: any[],
  classificacoesMap: Map<string, string>,
  recorrenciaMap: Map<string, number>,
) {
  try {
    const wb = new ExcelJS.Workbook();
    const dataStr = new Date().toLocaleDateString('pt-PT');

    // --- Sheet 1: Com Fichas ---
    const ws1 = wb.addWorksheet('Com Fichas');
    ws1.columns = [
      { header: 'Referência', key: 'ref', width: 18 },
      { header: 'Família', key: 'familia', width: 10 },
      { header: 'Descrição', key: 'descricao', width: 40 },
      { header: 'Qtd', key: 'quantidade', width: 8 },
      { header: 'N.º Fichas', key: 'totalFichas', width: 12 },
      { header: 'Fichas Associadas', key: 'fichasDetalhe', width: 50 },
    ];
    ws1.getRow(1).font = { bold: true };
    ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
    ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    for (const item of comFichas) {
      ws1.addRow({
        ref: item.ref,
        familia: item.familia || '-',
        descricao: item.descricao,
        quantidade: item.quantidade,
        totalFichas: item.totalFichas,
        fichasDetalhe: item.fichas?.map((f: any) => `${f.obrano} (${f.matricula} - ${f.marca} ${f.modelo})`).join('; ') || '',
      });
    }

    // --- Sheet 2: Sem Fichas ---
    const ws2 = wb.addWorksheet('Sem Fichas');
    ws2.columns = [
      { header: 'Referência', key: 'ref', width: 18 },
      { header: 'Família', key: 'familia', width: 10 },
      { header: 'Descrição', key: 'descricao', width: 40 },
      { header: 'Qtd', key: 'quantidade', width: 8 },
      { header: 'Classificação', key: 'classificacao', width: 20 },
      { header: 'Análises Consecutivas', key: 'recorrencia', width: 22 },
    ];
    ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
    for (const item of semFichas) {
      const classif = classificacoesMap.get(item.ref?.toUpperCase()?.trim());
      const recorr = recorrenciaMap.get(item.ref?.toUpperCase()?.trim());
      ws2.addRow({
        ref: item.ref,
        familia: item.familia || '-',
        descricao: item.descricao,
        quantidade: item.quantidade,
        classificacao: classif ? CLASSIFICACAO_LABELS[classif] || classif : '-',
        recorrencia: recorr && recorr > 1 ? `${recorr} análises` : '-',
      });
    }

    // --- Sheet 3: Fichas s/ Stock ---
    const ws3 = wb.addWorksheet('Fichas sem Stock');
    ws3.columns = [
      { header: 'Eurocode', key: 'eurocode', width: 18 },
      { header: 'Obra N.º', key: 'obrano', width: 12 },
      { header: 'Matrícula', key: 'matricula', width: 14 },
      { header: 'Marca', key: 'marca', width: 14 },
      { header: 'Modelo', key: 'modelo', width: 20 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Dias Aberto', key: 'diasAberto', width: 14 },
    ];
    ws3.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    for (const item of fichasSemStock) {
      ws3.addRow({
        eurocode: item.eurocode,
        obrano: item.obrano,
        matricula: item.matricula,
        marca: item.marca,
        modelo: item.modelo,
        status: item.status,
        diasAberto: item.diasAberto > 0 ? `${item.diasAberto} dias` : '-',
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `controlo_stock_${nomeLoja.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel consolidado exportado com sucesso!');
  } catch {
    toast.error('Erro ao exportar Excel consolidado');
  }
}

export default function ControloStock() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const utils = trpc.useUtils();

  const [textoStock, setTextoStock] = useState('');
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [view, setView] = useState<'input' | 'resultado' | 'historico' | 'detalhe'>('input');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeResultTab, setActiveResultTab] = useState('comFichas');

  // Resultado da análise atual
  const [resultadoAtual, setResultadoAtual] = useState<{
    id: number;
    totalItensStock: number;
    totalComFichas: number;
    totalSemFichas: number;
    totalFichasSemStock: number;
    comFichas: ItemComFichas[];
    semFichas: ItemSemFichas[];
    fichasSemStock: FichaSemStock[];
    dataAnaliseFichas: string | null;
  } | null>(null);

  // Detalhe de análise do histórico
  const [detalheId, setDetalheId] = useState<number | null>(null);

  // Queries
  const { data: lojas } = trpc.lojas.getByGestor.useQuery();
  const { data: infoAnalise } = trpc.stock.infoAnalise.useQuery({});
  const { data: historico } = trpc.stock.historico.useQuery({}, { enabled: view === 'historico' });
  const { data: detalheAnalise } = trpc.stock.detalhe.useQuery(
    { id: detalheId! },
    { enabled: !!detalheId && view === 'detalhe' }
  );

  // Mutations
  const analisarMutation = trpc.stock.analisar.useMutation({
    onSuccess: (data) => {
      setResultadoAtual(data as any);
      setView('resultado');
      toast.success(`Análise concluída! ${data.totalItensStock} itens de stock analisados.`);
      utils.stock.historico.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao analisar stock');
    },
  });

  const eliminarMutation = trpc.stock.eliminar.useMutation({
    onSuccess: () => {
      toast.success('Análise eliminada com sucesso');
      utils.stock.historico.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao eliminar análise');
    },
  });

  const enviarEmailMutation = trpc.stock.enviarEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Email enviado para ${data.email}${data.copiaEnviada ? ` (cópia para ${data.copiaEnviada})` : ''}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar email');
    },
  });

  const classificarMutation = trpc.stock.classificar.useMutation({
    onSuccess: () => {
      toast.success('Classificação guardada');
      if (lojaIdActiva) {
        utils.stock.classificacoes.invalidate({ lojaId: lojaIdActiva });
        utils.stock.recorrencia.invalidate({ lojaId: lojaIdActiva });
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao classificar');
    },
  });

  const lojaSelecionada = useMemo(() => {
    if (!lojaId || !lojas) return null;
    return lojas.find((l: any) => l.id === lojaId);
  }, [lojaId, lojas]);

  // Loja ID activa (da análise actual ou do detalhe)
  const lojaIdActivaEarly = view === 'resultado' ? lojaId : (detalheAnalise as any)?.lojaId || null;

  // Queries de classificações e recorrência
  const { data: classificacoes } = trpc.stock.classificacoes.useQuery(
    { lojaId: lojaIdActivaEarly! },
    { enabled: !!lojaIdActivaEarly && (view === 'resultado' || view === 'detalhe') }
  );
  const { data: recorrencia } = trpc.stock.recorrencia.useQuery(
    { lojaId: lojaIdActivaEarly! },
    { enabled: !!lojaIdActivaEarly && (view === 'resultado' || view === 'detalhe') }
  );

  // Maps para lookup rápido
  const classificacoesMap = useMemo(() => {
    const map = new Map<string, { id: number; classificacao: string }>();
    if (classificacoes) {
      for (const c of classificacoes) {
        map.set(c.eurocode.toUpperCase().trim(), { id: c.id, classificacao: c.classificacao });
      }
    }
    return map;
  }, [classificacoes]);

  const recorrenciaMap = useMemo(() => {
    const map = new Map<string, number>();
    if (recorrencia) {
      for (const r of recorrencia) {
        map.set(r.eurocode.toUpperCase().trim(), r.analisesConsecutivas);
      }
    }
    return map;
  }, [recorrencia]);

  const handleAnalisar = () => {
    if (!textoStock.trim()) {
      toast.error('Cole a listagem de stock na área de texto');
      return;
    }
    if (!lojaId || !lojaSelecionada) {
      toast.error('Seleccione a loja');
      return;
    }

    analisarMutation.mutate({
      textoStock: textoStock.trim(),
      lojaId,
      nomeLoja: (lojaSelecionada as any).nome || 'Loja',
    });
  };

  const handleVerDetalhe = (id: number) => {
    setDetalheId(id);
    setView('detalhe');
  };

  // Dados do detalhe parseados
  const detalheResultado = useMemo(() => {
    if (!detalheAnalise?.resultadoAnalise) return null;
    return detalheAnalise.resultadoAnalise;
  }, [detalheAnalise]);

  // Filtrar itens por pesquisa
  const filtrarItens = <T extends { ref?: string; descricao?: string; eurocode?: string }>(itens: T[]): T[] => {
    if (!searchTerm) return itens;
    const term = searchTerm.toLowerCase();
    return itens.filter(i =>
      (i.ref && i.ref.toLowerCase().includes(term)) ||
      (i.descricao && i.descricao.toLowerCase().includes(term)) ||
      (i.eurocode && i.eurocode.toLowerCase().includes(term))
    );
  };

  // Dados activos (resultado actual ou detalhe do histórico)
  const dadosActivos = view === 'resultado' ? resultadoAtual : view === 'detalhe' ? detalheResultado : null;

  const lojaIdActiva = lojaIdActivaEarly;

  // Nome da loja para exportação
  const nomeLoja = view === 'resultado'
    ? ((lojaSelecionada as any)?.nome || 'Loja')
    : (detalheAnalise?.nomeLoja || 'Loja');

  // --- Export handler (consolidated) ---
  const handleExportConsolidado = () => {
    if (!dadosActivos) return;
    const classifMapSimple = new Map<string, string>();
    classificacoesMap.forEach((v, k) => classifMapSimple.set(k, v.classificacao));
    exportConsolidatedExcel(
      nomeLoja,
      dadosActivos.comFichas || [],
      dadosActivos.semFichas || [],
      dadosActivos.fichasSemStock || [],
      classifMapSimple,
      recorrenciaMap,
    );
  };

  // Handler para classificar eurocode
  const handleClassificar = (eurocode: string, classificacao: string) => {
    if (!lojaIdActiva) return;
    const analiseId = view === 'resultado' ? resultadoAtual?.id : detalheId;
    if (!analiseId) return;
    classificarMutation.mutate({
      lojaId: lojaIdActiva,
      eurocode,
      classificacao: classificacao as any,
      analiseId,
    });
  };

  // --- Email handlers ---
  const handleEmailTab = (status: 'comFichas' | 'semFichas' | 'fichasSemStock') => {
    if (!lojaIdActiva) {
      toast.error('Loja não identificada para envio de email');
      return;
    }

    let itens: any[] = [];
    if (status === 'comFichas' && dadosActivos?.comFichas) {
      itens = filtrarItens(dadosActivos.comFichas);
    } else if (status === 'semFichas' && dadosActivos?.semFichas) {
      itens = filtrarItens(dadosActivos.semFichas);
    } else if (status === 'fichasSemStock' && dadosActivos?.fichasSemStock) {
      itens = filtrarItens(dadosActivos.fichasSemStock);
    }

    if (itens.length === 0) {
      toast.error('Sem itens para enviar');
      return;
    }

    enviarEmailMutation.mutate({
      lojaId: lojaIdActiva,
      nomeLoja,
      status,
      itens,
    });
  };

  // Email-only buttons for individual tabs
  const EmailButton = ({ status }: { status: 'comFichas' | 'semFichas' | 'fichasSemStock' }) => (
    <div className="flex gap-1.5 sm:gap-2 justify-end mb-2">
      <Button
        variant="outline"
        size="sm"
        className="text-xs px-2 sm:text-sm sm:px-3 text-green-700 border-green-300 hover:bg-green-50"
        onClick={() => handleEmailTab(status)}
        disabled={enviarEmailMutation.isPending}
      >
        {enviarEmailMutation.isPending ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Send className="h-3 w-3 mr-1" />
        )}
        <span className="hidden sm:inline">Enviar </span>Email
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {(view === 'resultado' || view === 'historico' || view === 'detalhe') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    if (view === 'detalhe') setView('historico');
                    else setView('input');
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                  <Warehouse className="h-5 w-5 md:h-6 md:w-6 text-blue-600 shrink-0" />
                  <span className="truncate">Controlo de Stock</span>
                </h1>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                variant={view === 'input' ? 'default' : 'outline'}
                size="sm"
                className="text-xs px-2 md:text-sm md:px-3"
                onClick={() => setView('input')}
              >
                <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Nova </span>Análise
              </Button>
              <Button
                variant={view === 'historico' ? 'default' : 'outline'}
                size="sm"
                className="text-xs px-2 md:text-sm md:px-3"
                onClick={() => setView('historico')}
              >
                <History className="h-3.5 w-3.5 mr-1" />
                Histórico
              </Button>
            </div>
          </div>
          {(view === 'resultado' || view === 'detalhe') && nomeLoja && (
            <p className="text-sm md:text-base font-semibold text-muted-foreground pl-1">
              {nomeLoja}
            </p>
          )}
        </div>

        {/* Info da última análise de fichas */}
        {infoAnalise && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-blue-600" />
                {infoAnalise.temAnalise ? (
                  <span>
                    Última análise de fichas: <strong>{new Date(infoAnalise.dataAnalise!).toLocaleDateString('pt-PT')}</strong>
                    {' — '}{infoAnalise.totalEurocodes} eurocodes extraídos
                  </span>
                ) : (
                  <span className="text-amber-700">
                    Nenhuma análise de fichas encontrada. Faça primeiro uma análise de fichas de serviço para poder cruzar com o stock.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* VIEW: Input */}
        {view === 'input' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardPaste className="h-5 w-5" />
                  Colar Listagem de Stock
                </CardTitle>
                <CardDescription>
                  Cole a listagem de stock exportada do sistema. Formato: colunas separadas por tab (Família, Ref, Descrição, Stock, Epcpond).
                  Apenas categorias OC, PB, TE, VL, VP com quantidade {'>='}  1 serão consideradas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selecção da loja */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Loja</label>
                  <Select
                    value={lojaId?.toString() || ''}
                    onValueChange={(v) => setLojaId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione a loja..." />
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

                {/* Área de texto para colar */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Listagem de Stock</label>
                  <Textarea
                    placeholder={"Cole aqui a listagem de stock exportada do sistema...\n\nFormato: Familia  Ref  Design  Stock  Epcpond (separado por tabs)\n\nExemplo:\nOC\t3341BGSH\tOCL FIAT PUNTO 93> VRD\t1,000\t88,500000\nPB\t2763AGSVZ\tPBL RENAULT CLIO V 19-\t3,000\t125,000000"}
                    value={textoStock}
                    onChange={(e) => setTextoStock(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  {textoStock && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {textoStock.split('\n').filter(l => l.trim()).length} linhas detectadas
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleAnalisar}
                  disabled={analisarMutation.isPending || !textoStock.trim() || !lojaId}
                  className="w-full"
                >
                  {analisarMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analisar Stock
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* VIEW: Resultado ou Detalhe */}
        {(view === 'resultado' || view === 'detalhe') && dadosActivos && (
          <div className="space-y-4">
            {/* Cards de resumo */}
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4 text-center px-1 md:px-4">
                  <Package className="h-4 w-4 md:h-6 md:w-6 mx-auto text-blue-600 mb-0.5" />
                  <div className="text-lg md:text-2xl font-bold text-blue-700">
                    {dadosActivos.totalItensStock ?? (dadosActivos.comFichas?.length || 0) + (dadosActivos.semFichas?.length || 0)}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">Total Stock</div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4 text-center px-1 md:px-4">
                  <CheckCircle2 className="h-4 w-4 md:h-6 md:w-6 mx-auto text-green-600 mb-0.5" />
                  <div className="text-lg md:text-2xl font-bold text-green-700">
                    {dadosActivos.totalComFichas ?? dadosActivos.comFichas?.length}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">Com Fichas</div>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4 text-center px-1 md:px-4">
                  <XCircle className="h-4 w-4 md:h-6 md:w-6 mx-auto text-amber-600 mb-0.5" />
                  <div className="text-lg md:text-2xl font-bold text-amber-700">
                    {dadosActivos.totalSemFichas ?? dadosActivos.semFichas?.length}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">Sem Fichas</div>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4 text-center px-1 md:px-4">
                  <AlertTriangle className="h-4 w-4 md:h-6 md:w-6 mx-auto text-red-600 mb-0.5" />
                  <div className="text-lg md:text-2xl font-bold text-red-700">
                    {dadosActivos.totalFichasSemStock ?? dadosActivos.fichasSemStock?.length}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">Fichas s/ Stock</div>
                </CardContent>
              </Card>
            </div>

            {/* Pesquisa + Botão Excel Consolidado */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por referência, descrição ou eurocode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3 shrink-0 text-blue-700 border-blue-300 hover:bg-blue-50"
                onClick={handleExportConsolidado}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Excel Consolidado</span>
                <span className="sm:hidden">Excel</span>
              </Button>
            </div>

            {/* Tabs de resultado */}
            <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="comFichas" className="text-[10px] sm:text-sm px-1 py-1.5 sm:px-3 sm:py-2">
                  <CheckCircle2 className="h-3 w-3 mr-0.5 sm:mr-1 shrink-0" />
                  <span className="hidden sm:inline">Com Fichas</span><span className="sm:hidden">C/ Fichas</span> ({dadosActivos.comFichas?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="semFichas" className="text-[10px] sm:text-sm px-1 py-1.5 sm:px-3 sm:py-2">
                  <XCircle className="h-3 w-3 mr-0.5 sm:mr-1 shrink-0" />
                  <span className="hidden sm:inline">Sem Fichas</span><span className="sm:hidden">S/ Fichas</span> ({dadosActivos.semFichas?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="fichasSemStock" className="text-[10px] sm:text-sm px-1 py-1.5 sm:px-3 sm:py-2">
                  <AlertTriangle className="h-3 w-3 mr-0.5 sm:mr-1 shrink-0" />
                  <span className="hidden sm:inline">Fichas s/ Stock</span><span className="sm:hidden">s/ Stock</span> ({dadosActivos.fichasSemStock?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Tab: Com Fichas */}
              <TabsContent value="comFichas" className="space-y-1.5 mt-3">
                <EmailButton status="comFichas" />
                {dadosActivos.comFichas && filtrarItens(dadosActivos.comFichas).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">Nenhum item encontrado</p>
                ) : (
                  filtrarItens(dadosActivos.comFichas || []).map((item: any, idx: number) => (
                    <Card key={idx} className="border-green-100">
                      <CardContent className="px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono text-[11px] px-1.5 py-0">
                                {item.ref}
                              </Badge>
                              {item.familia && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.familia}</Badge>
                              )}
                              <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                                {item.totalFichas} ficha{item.totalFichas !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.descricao}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold">{item.quantidade}</span>
                            <span className="text-[10px] text-muted-foreground ml-0.5">un.</span>
                          </div>
                        </div>
                        {/* Fichas associadas */}
                        {item.fichas && item.fichas.length > 0 && (
                          <div className="mt-1.5 border-t pt-1.5">
                            <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Fichas associadas:</p>
                            <div className="space-y-0.5">
                              {item.fichas.map((f: any, fIdx: number) => (
                                <div key={fIdx} className="flex items-center gap-1.5 text-[10px] bg-gray-50 rounded px-1.5 py-0.5">
                                  <span className="font-mono font-medium">{f.obrano}</span>
                                  <span className="text-muted-foreground">{f.matricula}</span>
                                  <span className="truncate">{f.marca} {f.modelo}</span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto shrink-0">
                                    {f.status} {f.diasAberto > 0 ? `(${f.diasAberto}d)` : ''}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Tab: Sem Fichas */}
              <TabsContent value="semFichas" className="space-y-1.5 mt-3">
                <EmailButton status="semFichas" />
                {dadosActivos.semFichas && filtrarItens(dadosActivos.semFichas).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">Nenhum item encontrado</p>
                ) : (
                  filtrarItens(dadosActivos.semFichas || []).map((item: any, idx: number) => {
                    const refKey = item.ref?.toUpperCase()?.trim();
                    const classifData = classificacoesMap.get(refKey);
                    const recorr = recorrenciaMap.get(refKey);
                    return (
                      <Card key={idx} className={`border-amber-100 ${recorr && recorr >= 3 ? 'ring-1 ring-red-300' : recorr && recorr >= 2 ? 'ring-1 ring-amber-300' : ''}`}>
                        <CardContent className="px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono text-[11px] px-1.5 py-0">
                                  {item.ref}
                                </Badge>
                                {item.familia && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.familia}</Badge>
                                )}
                                <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                                  Sem fichas
                                </Badge>
                                {recorr && recorr >= 2 && (
                                  <Badge className={`text-[10px] px-1.5 py-0 ${recorr >= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-200 text-amber-800'}`}>
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                    {recorr}x
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.descricao}</p>
                              {/* Classificação */}
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {classifData ? (
                                  <Badge className={`text-[10px] px-1.5 py-0 ${CLASSIFICACAO_COLORS[classifData.classificacao] || 'bg-gray-100 text-gray-700'}`}>
                                    <Tag className="h-2.5 w-2.5 mr-0.5" />
                                    {CLASSIFICACAO_LABELS[classifData.classificacao] || classifData.classificacao}
                                  </Badge>
                                ) : null}
                                <select
                                  className="text-[10px] border rounded px-1 py-0.5 bg-transparent cursor-pointer"
                                  value={classifData?.classificacao || ''}
                                  onChange={(e) => {
                                    if (e.target.value) handleClassificar(item.ref, e.target.value);
                                  }}
                                >
                                  <option value="">{classifData ? 'Alterar...' : 'Classificar...'}</option>
                                  <option value="devolucao_rejeitada">Devolução Rejeitada</option>
                                  <option value="usado">Usado</option>
                                  <option value="com_danos">Com Danos</option>
                                  <option value="para_devolver">Para Devolver</option>
                                </select>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-bold">{item.quantidade}</span>
                              <span className="text-[10px] text-muted-foreground ml-0.5">un.</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Tab: Fichas sem Stock */}
              <TabsContent value="fichasSemStock" className="space-y-1.5 mt-3">
                <EmailButton status="fichasSemStock" />
                {dadosActivos.fichasSemStock && filtrarItens(dadosActivos.fichasSemStock).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">Nenhum item encontrado</p>
                ) : (
                  filtrarItens(dadosActivos.fichasSemStock || []).map((item: any, idx: number) => (
                    <Card key={idx} className="border-red-100">
                      <CardContent className="px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono text-[11px] px-1.5 py-0">
                                {item.eurocode}
                              </Badge>
                              <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">
                                Sem stock
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
                              <span className="font-mono">{item.obrano}</span>
                              <span>{item.matricula}</span>
                              <span className="truncate">{item.marca} {item.modelo}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {item.status} {item.diasAberto > 0 ? `(${item.diasAberto}d)` : ''}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* VIEW: Histórico */}
        {view === 'historico' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Análises
            </h2>
            {!historico || historico.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma análise de stock encontrada.
                </CardContent>
              </Card>
            ) : (
              historico.map((analise: any) => (
                <Card key={analise.id} className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => handleVerDetalhe(analise.id)}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{analise.nomeLoja}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(analise.createdAt).toLocaleDateString('pt-PT')} às {new Date(analise.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 sm:gap-3 text-[10px] sm:text-xs">
                          <span className="text-blue-600 font-medium">{analise.totalItensStock} itens</span>
                          <span className="text-green-600">{analise.totalComFichas} c/ fichas</span>
                          <span className="text-amber-600">{analise.totalSemFichas} s/ fichas</span>
                          <span className="text-red-600">{analise.totalFichasSemStock} s/ stock</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Tem a certeza que deseja eliminar esta análise?')) {
                              eliminarMutation.mutate({ id: analise.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
