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
} from 'lucide-react';

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

function exportToExcel(data: any[], columns: { header: string; key: string }[], filename: string) {
  import('xlsx').then((XLSX) => {
    const wsData = [columns.map(c => c.header)];
    for (const row of data) {
      wsData.push(columns.map(c => row[c.key] ?? ''));
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Auto-size columns
    ws['!cols'] = columns.map(c => ({ wch: Math.max(c.header.length, 15) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  }).catch(() => toast.error('Erro ao exportar Excel'));
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

  const lojaSelecionada = useMemo(() => {
    if (!lojaId || !lojas) return null;
    return lojas.find((l: any) => l.id === lojaId);
  }, [lojaId, lojas]);

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

  // Loja ID activa (da análise actual ou do detalhe)
  const lojaIdActiva = view === 'resultado' ? lojaId : (detalheAnalise as any)?.lojaId || null;

  // Nome da loja para exportação
  const nomeLoja = view === 'resultado'
    ? ((lojaSelecionada as any)?.nome || 'Loja')
    : (detalheAnalise?.nomeLoja || 'Loja');

  // --- Export handlers ---
  const handleExportComFichas = () => {
    if (!dadosActivos?.comFichas) return;
    const data = filtrarItens(dadosActivos.comFichas).map((item: any) => ({
      ref: item.ref,
      familia: item.familia || '-',
      descricao: item.descricao,
      quantidade: item.quantidade,
      totalFichas: item.totalFichas,
      fichasDetalhe: item.fichas?.map((f: any) => `${f.obrano} (${f.matricula} - ${f.marca} ${f.modelo})`).join('; ') || '',
    }));
    const columns = [
      { header: 'Referência', key: 'ref' },
      { header: 'Família', key: 'familia' },
      { header: 'Descrição', key: 'descricao' },
      { header: 'Qtd', key: 'quantidade' },
      { header: 'N.º Fichas', key: 'totalFichas' },
      { header: 'Fichas Associadas', key: 'fichasDetalhe' },
    ];
    const filename = `stock_com_fichas_${nomeLoja.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(data, columns, filename);
  };

  const handleExportSemFichas = () => {
    if (!dadosActivos?.semFichas) return;
    const data = filtrarItens(dadosActivos.semFichas).map((item: any) => ({
      ref: item.ref,
      familia: item.familia || '-',
      descricao: item.descricao,
      quantidade: item.quantidade,
    }));
    const columns = [
      { header: 'Referência', key: 'ref' },
      { header: 'Família', key: 'familia' },
      { header: 'Descrição', key: 'descricao' },
      { header: 'Qtd', key: 'quantidade' },
    ];
    const filename = `stock_sem_fichas_${nomeLoja.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(data, columns, filename);
  };

  const handleExportFichasSemStock = () => {
    if (!dadosActivos?.fichasSemStock) return;
    const data = filtrarItens(dadosActivos.fichasSemStock).map((item: any) => ({
      eurocode: item.eurocode,
      obrano: item.obrano,
      matricula: item.matricula,
      marca: item.marca,
      modelo: item.modelo,
      status: item.status,
      diasAberto: item.diasAberto > 0 ? `${item.diasAberto} dias` : '-',
    }));
    const columns = [
      { header: 'Eurocode', key: 'eurocode' },
      { header: 'Obra N.º', key: 'obrano' },
      { header: 'Matrícula', key: 'matricula' },
      { header: 'Marca', key: 'marca' },
      { header: 'Modelo', key: 'modelo' },
      { header: 'Estado', key: 'status' },
      { header: 'Dias Aberto', key: 'diasAberto' },
    ];
    const filename = `fichas_sem_stock_${nomeLoja.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(data, columns, filename);
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

  // Export + Email buttons component for each tab
  const ActionButtons = ({ onExport, onEmail, status }: { onExport: () => void; onEmail: () => void; status: 'comFichas' | 'semFichas' | 'fichasSemStock' }) => (
    <div className="flex gap-2 justify-end mb-2">
      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="h-3 w-3 mr-1" />
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onEmail}
        disabled={enviarEmailMutation.isPending}
        className="text-green-700 border-green-300 hover:bg-green-50"
      >
        {enviarEmailMutation.isPending ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Send className="h-3 w-3 mr-1" />
        )}
        Enviar Email
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {(view === 'resultado' || view === 'historico' || view === 'detalhe') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (view === 'detalhe') setView('historico');
                  else setView('input');
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Warehouse className="h-6 w-6 text-blue-600" />
                Controlo de Stock
                {(view === 'resultado' || view === 'detalhe') && nomeLoja && (
                  <span className="text-lg font-semibold text-muted-foreground">— {nomeLoja}</span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Cruzamento de stock com fichas de serviço
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === 'input' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('input')}
            >
              <ClipboardPaste className="h-4 w-4 mr-1" />
              Nova Análise
            </Button>
            <Button
              variant={view === 'historico' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('historico')}
            >
              <History className="h-4 w-4 mr-1" />
              Histórico
            </Button>
          </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <Package className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                  <div className="text-2xl font-bold text-blue-700">
                    {dadosActivos.totalItensStock ?? (dadosActivos.comFichas?.length || 0) + (dadosActivos.semFichas?.length || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Stock</div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-1" />
                  <div className="text-2xl font-bold text-green-700">
                    {dadosActivos.totalComFichas ?? dadosActivos.comFichas?.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Com Fichas</div>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <XCircle className="h-6 w-6 mx-auto text-amber-600 mb-1" />
                  <div className="text-2xl font-bold text-amber-700">
                    {dadosActivos.totalSemFichas ?? dadosActivos.semFichas?.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Sem Fichas</div>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-1" />
                  <div className="text-2xl font-bold text-red-700">
                    {dadosActivos.totalFichasSemStock ?? dadosActivos.fichasSemStock?.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Fichas s/ Stock</div>
                </CardContent>
              </Card>
            </div>

            {/* Pesquisa */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por referência, descrição ou eurocode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabs de resultado */}
            <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="comFichas" className="text-xs sm:text-sm">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Com Fichas ({dadosActivos.comFichas?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="semFichas" className="text-xs sm:text-sm">
                  <XCircle className="h-3 w-3 mr-1" />
                  Sem Fichas ({dadosActivos.semFichas?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="fichasSemStock" className="text-xs sm:text-sm">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Fichas s/ Stock ({dadosActivos.fichasSemStock?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Tab: Com Fichas */}
              <TabsContent value="comFichas" className="space-y-2 mt-4">
                <ActionButtons
                  onExport={handleExportComFichas}
                  onEmail={() => handleEmailTab('comFichas')}
                  status="comFichas"
                />
                {dadosActivos.comFichas && filtrarItens(dadosActivos.comFichas).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum item encontrado</p>
                ) : (
                  filtrarItens(dadosActivos.comFichas || []).map((item: any, idx: number) => (
                    <Card key={idx} className="border-green-100">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono text-xs">
                                {item.ref}
                              </Badge>
                              {item.familia && (
                                <Badge variant="secondary" className="text-xs">{item.familia}</Badge>
                              )}
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                {item.totalFichas} ficha{item.totalFichas !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 truncate">{item.descricao}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">{item.quantidade}</span>
                            <span className="text-xs text-muted-foreground ml-1">un.</span>
                          </div>
                        </div>
                        {/* Fichas associadas */}
                        {item.fichas && item.fichas.length > 0 && (
                          <div className="mt-2 border-t pt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Fichas associadas:</p>
                            <div className="space-y-1">
                              {item.fichas.map((f: any, fIdx: number) => (
                                <div key={fIdx} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1">
                                  <span className="font-mono font-medium">{f.obrano}</span>
                                  <span className="text-muted-foreground">{f.matricula}</span>
                                  <span>{f.marca} {f.modelo}</span>
                                  <Badge variant="outline" className="text-[10px] ml-auto">
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
              <TabsContent value="semFichas" className="space-y-2 mt-4">
                <ActionButtons
                  onExport={handleExportSemFichas}
                  onEmail={() => handleEmailTab('semFichas')}
                  status="semFichas"
                />
                {dadosActivos.semFichas && filtrarItens(dadosActivos.semFichas).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum item encontrado</p>
                ) : (
                  filtrarItens(dadosActivos.semFichas || []).map((item: any, idx: number) => (
                    <Card key={idx} className="border-amber-100">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono text-xs">
                                {item.ref}
                              </Badge>
                              {item.familia && (
                                <Badge variant="secondary" className="text-xs">{item.familia}</Badge>
                              )}
                              <Badge className="bg-amber-100 text-amber-700 text-xs">
                                Sem fichas
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 truncate">{item.descricao}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">{item.quantidade}</span>
                            <span className="text-xs text-muted-foreground ml-1">un.</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Tab: Fichas sem Stock */}
              <TabsContent value="fichasSemStock" className="space-y-2 mt-4">
                <ActionButtons
                  onExport={handleExportFichasSemStock}
                  onEmail={() => handleEmailTab('fichasSemStock')}
                  status="fichasSemStock"
                />
                {dadosActivos.fichasSemStock && filtrarItens(dadosActivos.fichasSemStock).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum item encontrado</p>
                ) : (
                  filtrarItens(dadosActivos.fichasSemStock || []).map((item: any, idx: number) => (
                    <Card key={idx} className="border-red-100">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono text-xs">
                                {item.eurocode}
                              </Badge>
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                Sem stock
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <span className="font-mono">{item.obrano}</span>
                              <span>{item.matricula}</span>
                              <span>{item.marca} {item.modelo}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
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
                      <div className="flex items-center gap-3">
                        <div className="flex gap-3 text-xs">
                          <span className="text-blue-600 font-medium">{analise.totalItensStock} itens</span>
                          <span className="text-green-600">{analise.totalComFichas} c/ fichas</span>
                          <span className="text-amber-600">{analise.totalSemFichas} s/ fichas</span>
                          <span className="text-red-600">{analise.totalFichasSemStock} fichas s/ stock</span>
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
