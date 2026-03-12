import { useMemo, useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Warehouse,
  Search,
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
  Trash2,
  Mail,
  Send,
  Tag,
  Clock,
  FileSpreadsheet,
  GitCompareArrows,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  Store,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Interfaces ---

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

interface LojaResultado {
  lojaId: number;
  lojaNome: string;
  lojaNumero: number;
  gestorId: number | null;
  gestorNome: string | null;
  analiseId: number;
  totalItensStock: number;
  totalComFichas: number;
  totalSemFichas: number;
  totalFichasSemStock: number;
}

interface GestorGrupo {
  gestorNome: string;
  gestorId: number | null;
  lojas: LojaResultado[];
  totais: {
    totalLojas: number;
    totalItensStock: number;
    totalComFichas: number;
    totalSemFichas: number;
    totalFichasSemStock: number;
  };
}

interface ResultadoGlobal {
  totalArtigosProcessados: number;
  totalLojasAnalisadas: number;
  totalArmazens: number;
  armazensNaoMapeados: number[];
  nomeArquivo: string;
  porGestor: GestorGrupo[];
}

// --- Export helpers ---

const CLASSIFICACAO_LABELS: Record<string, string> = {
  devolucao_rejeitada: 'Devolução Rejeitada',
  usado: 'Usado',
  com_danos: 'Com Danos',
  para_devolver: 'Para Devolver',
  para_realizar: 'P/Realizar',
  com_ficha_servico: 'C/Ficha de Serviço',
};

const CLASSIFICACAO_COLORS: Record<string, string> = {
  devolucao_rejeitada: 'bg-purple-100 text-purple-700',
  usado: 'bg-gray-100 text-gray-700',
  para_realizar: 'bg-sky-100 text-sky-700',
  com_ficha_servico: 'bg-green-100 text-green-700',
  com_danos: 'bg-orange-100 text-orange-700',
  para_devolver: 'bg-cyan-100 text-cyan-700',
};

async function exportConsolidatedExcel(
  nomeLoja: string,
  comFichas: any[],
  semFichas: any[],
  classificacoesMap: Map<string, string>,
  recorrenciaMap: Map<string, number>,
) {
  try {
    const wb = new ExcelJS.Workbook();

    // Sheet 1: Sem Fichas (desmultiplicado: 1 linha por unidade)
    const ws1 = wb.addWorksheet('Sem Fichas');
    ws1.columns = [
      { header: 'Referência', key: 'ref', width: 18 },
      { header: 'Unidade', key: 'unidade', width: 10 },
      { header: 'Família', key: 'familia', width: 10 },
      { header: 'Descrição', key: 'descricao', width: 40 },
      { header: 'Classificação', key: 'classificacao', width: 20 },
      { header: 'Análises Consecutivas', key: 'recorrencia', width: 22 },
    ];
    ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
    for (const item of semFichas) {
      const qty = item.quantidade || 1;
      for (let unitIdx = 1; unitIdx <= qty; unitIdx++) {
        const unitKey = `${(item.ref || '').toUpperCase().trim()}|${unitIdx}`;
        const classif = classificacoesMap.get(unitKey);
        const recorr = recorrenciaMap.get(unitKey);
        ws1.addRow({
          ref: item.ref,
          unidade: qty > 1 ? `${unitIdx}/${qty}` : '-',
          familia: item.familia || '-',
          descricao: item.descricao,
          classificacao: classif ? CLASSIFICACAO_LABELS[classif] || classif : '-',
          recorrencia: recorr && recorr > 1 ? `${recorr} análises` : '-',
        });
      }
    }

    // Sheet 2: Com Fichas
    const ws2 = wb.addWorksheet('Com Fichas');
    ws2.columns = [
      { header: 'Referência', key: 'ref', width: 18 },
      { header: 'Família', key: 'familia', width: 10 },
      { header: 'Descrição', key: 'descricao', width: 40 },
      { header: 'Qtd', key: 'quantidade', width: 8 },
      { header: 'N.º Fichas', key: 'totalFichas', width: 12 },
      { header: 'Fichas Associadas', key: 'fichasDetalhe', width: 50 },
    ];
    ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
    for (const item of comFichas) {
      ws2.addRow({
        ref: item.ref,
        familia: item.familia || '-',
        descricao: item.descricao,
        quantidade: item.quantidade,
        totalFichas: item.totalFichas,
        fichasDetalhe: item.fichas?.map((f: any) => `${f.obrano} (${f.matricula} - ${f.marca} ${f.modelo})`).join('; ') || '',
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

// --- Main Component ---

export default function ControloStock() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Views: 'dashboard' (stock overview), 'upload' (global upload), 'resultadoGlobal' (gestor-grouped cards), 'detalhe' (per-loja detail), 'historico'
  const [view, setView] = useState<'dashboard' | 'upload' | 'resultadoGlobal' | 'detalhe' | 'historico'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeResultTab, setActiveResultTab] = useState('semFichas');
  const [filtroClassificacao, setFiltroClassificacao] = useState<string>('todas');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stockJobId, setStockJobId] = useState<string | null>(null);
  const [stockJobProgress, setStockJobProgress] = useState<string>('');

  // Global result
  const [resultadoGlobal, setResultadoGlobal] = useState<ResultadoGlobal | null>(null);

  // Gestor groups expanded state
  const [expandedGestores, setExpandedGestores] = useState<Set<string>>(new Set());

  // Per-loja detail
  const [detalheLojaId, setDetalheLojaId] = useState<number | null>(null);
  const [detalheLojaNome, setDetalheLojaNome] = useState<string>('');
  const [detalheAnaliseId, setDetalheAnaliseId] = useState<number | null>(null);

  // Historico detail
  const [detalheId, setDetalheId] = useState<number | null>(null);

  // Comparação
  const [comparacaoIds, setComparacaoIds] = useState<number[]>([]);
  const [viewComparacao, setViewComparacao] = useState(false);

  // Queries
  const { data: infoAnalise } = trpc.stock.infoAnalise.useQuery({});
  const { data: historico } = trpc.stock.historico.useQuery({}, { enabled: view === 'historico' });
  const { data: batches } = trpc.stock.batches.useQuery(undefined, { enabled: view === 'historico' });
  const { data: stockDashboard, isLoading: dashboardLoading } = trpc.stock.dashboardStock.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: view === 'dashboard',
  });
  const { data: evolucaoData } = trpc.stock.evolucaoStock.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: view === 'dashboard',
  });
  const { data: detalheAnalise } = trpc.stock.detalhe.useQuery(
    { id: detalheAnaliseId || detalheId! },
    { enabled: !!(detalheAnaliseId || detalheId) && view === 'detalhe' }
  );

  // Mutations
  const analisarGlobalMutation = trpc.stock.analisarGlobal.useMutation({
    onSuccess: (data) => {
      // Backend now returns { jobId } - start polling
      if (data && 'jobId' in data) {
        setStockJobId((data as any).jobId);
        setStockJobProgress('A iniciar análise...');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao analisar stock global');
      setIsUploading(false);
    },
  });

  // Polling for stock analysis job status
  const { data: jobStatus } = trpc.stock.analisarGlobalStatus.useQuery(
    { jobId: stockJobId || '' },
    { enabled: !!stockJobId, refetchInterval: stockJobId ? 2000 : false }
  );

  // Timeout for stuck jobs (5 minutes)
  useEffect(() => {
    if (!stockJobId) return;
    const timeout = setTimeout(() => {
      setStockJobId(null);
      setStockJobProgress('');
      setIsUploading(false);
      toast.error('Timeout: a análise demorou demasiado tempo. Tente novamente.');
    }, 5 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [stockJobId]);

  // Handle job status changes
  useEffect(() => {
    if (!jobStatus || !stockJobId) return;
    if (jobStatus.status === 'processing') {
      setStockJobProgress(jobStatus.progress || 'A processar...');
    } else if (jobStatus.status === 'completed' && jobStatus.result) {
      setStockJobId(null);
      setStockJobProgress('');
      setIsUploading(false);
      const data = jobStatus.result as any;
      setResultadoGlobal(data);
      const allGestores = new Set(data.porGestor.map((g: any) => g.gestorNome));
      setExpandedGestores(allGestores);
      setView('resultadoGlobal');
      toast.success(`Análise global concluída! ${data.totalArtigosProcessados} artigos em ${data.totalLojasAnalisadas} lojas.`);
      utils.stock.historico.invalidate();
    } else if (jobStatus.status === 'error') {
      setStockJobId(null);
      setStockJobProgress('');
      setIsUploading(false);
      toast.error(jobStatus.error || 'Erro ao analisar stock global');
    } else if (jobStatus.status === 'not_found') {
      setStockJobId(null);
      setStockJobProgress('');
      setIsUploading(false);
    }
  }, [jobStatus, stockJobId]);

  const eliminarMutation = trpc.stock.eliminar.useMutation({
    onSuccess: () => {
      toast.success('Análise eliminada com sucesso');
      utils.stock.historico.invalidate();
      utils.stock.batches.invalidate();
      utils.stock.dashboardStock.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao eliminar análise');
    },
  });

  const eliminarBatchMutation = trpc.stock.eliminarBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`Batch eliminado: ${data.deleted} análises removidas`);
      utils.stock.historico.invalidate();
      utils.stock.batches.invalidate();
      utils.stock.dashboardStock.invalidate();
      utils.stock.evolucaoStock.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao eliminar batch');
    },
  });

  const enviarEmailBatchMutation = trpc.stock.enviarEmailBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`Emails enviados: ${data.emailsEnviados}/${data.totalLojas} lojas`);
      if (data.resultados.some((r: any) => !r.success)) {
        const falhas = data.resultados.filter((r: any) => !r.success);
        toast.error(`${falhas.length} email(s) falharam: ${falhas.map((f: any) => f.lojaNome).join(', ')}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar emails');
    },
  });

  const enviarEmailConsolidadoMutation = trpc.stock.enviarEmailConsolidado.useMutation({
    onSuccess: (data) => {
      toast.success(`Email consolidado enviado para ${data.email}${data.copiaEnviada ? ` (cópia para ${data.copiaEnviada})` : ''}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar email consolidado');
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

  const enviarEmailTodasLojasMutation = trpc.stock.enviarEmailTodasLojas.useMutation({
    onSuccess: (data) => {
      toast.success(`Emails enviados: ${data.emailsEnviados}/${data.totalLojas} lojas`);
      if (data.resultados.some((r: any) => !r.success)) {
        const falhas = data.resultados.filter((r: any) => !r.success);
        toast.error(`${falhas.length} email(s) falharam: ${falhas.map((f: any) => f.lojaNome).join(', ')}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao enviar emails');
    },
  });

  const classificarMutation = trpc.stock.classificar.useMutation({
    onSuccess: () => {
      toast.success('Classificação guardada');
      if (detalheLojaId) {
        utils.stock.classificacoes.invalidate({ lojaId: detalheLojaId });
        utils.stock.recorrencia.invalidate({ lojaId: detalheLojaId });
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao classificar');
    },
  });

  // Loja ID activa (do detalhe)
  const lojaIdActiva = view === 'detalhe' ? (detalheLojaId || (detalheAnalise as any)?.lojaId || null) : null;

  // Queries de classificações e recorrência
  const { data: classificacoes } = trpc.stock.classificacoes.useQuery(
    { lojaId: lojaIdActiva! },
    { enabled: !!lojaIdActiva && view === 'detalhe' }
  );
  const { data: recorrencia } = trpc.stock.recorrencia.useQuery(
    { lojaId: lojaIdActiva! },
    { enabled: !!lojaIdActiva && view === 'detalhe' }
  );

  // Maps para lookup rápido
  const classificacoesMap = useMemo(() => {
    const map = new Map<string, { id: number; classificacao: string }>();
    if (classificacoes) {
      for (const c of classificacoes) {
        const key = `${c.eurocode.toUpperCase().trim()}|${(c as any).unitIndex || 1}`;
        map.set(key, { id: c.id, classificacao: c.classificacao });
      }
    }
    return map;
  }, [classificacoes]);

  const recorrenciaMap = useMemo(() => {
    const map = new Map<string, number>();
    if (recorrencia) {
      for (const r of recorrencia) {
        const key = `${r.eurocode.toUpperCase().trim()}|${(r as any).unitIndex || 1}`;
        map.set(key, r.analisesConsecutivas);
      }
    }
    return map;
  }, [recorrencia]);

  // Dados activos para detalhe
  const dadosActivos = useMemo(() => {
    if (view !== 'detalhe' || !detalheAnalise?.resultadoAnalise) return null;
    return detalheAnalise.resultadoAnalise;
  }, [view, detalheAnalise]);

  // Desmultiplicar itens sem fichas (excluir os classificados como com_ficha_servico)
  const semFichasDesmultiplicados = useMemo(() => {
    if (!dadosActivos?.semFichas) return [];
    const resultado: Array<any & { unitIndex: number; totalUnidades: number }> = [];
    for (const item of dadosActivos.semFichas) {
      const qty = item.quantidade || 1;
      for (let i = 1; i <= qty; i++) {
        // Excluir itens classificados como com_ficha_servico (passam para Com Fichas)
        const key = `${item.ref?.toUpperCase()?.trim()}|${i}`;
        const classif = classificacoesMap.get(key);
        if (classif?.classificacao === 'com_ficha_servico') continue;
        resultado.push({
          ...item,
          quantidade: 1,
          unitIndex: i,
          totalUnidades: qty,
        });
      }
    }
    return resultado;
  }, [dadosActivos?.semFichas, classificacoesMap]);

  // Itens reclassificados como "C/Ficha de Serviço" (movidos de Sem Fichas para Com Fichas)
  const itensComFichaServico = useMemo(() => {
    if (!dadosActivos?.semFichas) return [];
    const resultado: Array<any & { unitIndex: number; totalUnidades: number; reclassificado: boolean }> = [];
    for (const item of dadosActivos.semFichas) {
      const qty = item.quantidade || 1;
      for (let i = 1; i <= qty; i++) {
        const key = `${item.ref?.toUpperCase()?.trim()}|${i}`;
        const classif = classificacoesMap.get(key);
        if (classif?.classificacao === 'com_ficha_servico') {
          resultado.push({
            ...item,
            quantidade: 1,
            unitIndex: i,
            totalUnidades: qty,
            reclassificado: true,
          });
        }
      }
    }
    return resultado;
  }, [dadosActivos?.semFichas, classificacoesMap]);

  // Nome da loja para exportação
  const nomeLoja = detalheLojaNome || detalheAnalise?.nomeLoja || 'Loja';

  // --- Handlers ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Por favor seleccione um ficheiro Excel (.xlsx ou .xls)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleAnalisarGlobal = async () => {
    if (!selectedFile) {
      toast.error('Seleccione um ficheiro Excel');
      return;
    }

    setIsUploading(true);
    setStockJobProgress('A ler ficheiro Excel no browser...');
    try {
      // Parse Excel no browser com SheetJS (muito mais leve que enviar base64 ao servidor)
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error('Ficheiro Excel sem folhas de dados');

      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) throw new Error('Ficheiro Excel sem dados');

      // Detectar colunas pelo header
      const header = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
      const colMap: Record<string, number> = {};
      header.forEach((val: string, idx: number) => {
        if (val.includes('ref')) colMap['ref'] = idx;
        else if (val.includes('designa')) colMap['designacao'] = idx;
        else if (val.includes('armaz')) colMap['armazem'] = idx;
        else if (val.includes('quantid')) colMap['quantidade'] = idx;
        else if (val.includes('unid')) colMap['unidade'] = idx;
        else if (val.includes('prec') || val === 'preço' || val === 'preco') colMap['preco'] = idx;
        else if (val === 'total') colMap['total'] = idx;
        else if (val.includes('tipo')) colMap['tipo'] = idx;
        else if (val.includes('famil') || val === 'familia') colMap['familia'] = idx;
      });

      if (colMap['ref'] === undefined || colMap['armazem'] === undefined) {
        throw new Error('Ficheiro Excel não tem as colunas obrigatórias (Ref_ e Armazem)');
      }

      // Processar linhas
      setStockJobProgress('A processar linhas do Excel...');
      const categoriasPermitidas = ['OC', 'PB', 'TE', 'VL'];
      const itens: Array<{ ref: string; descricao: string; armazem: number; quantidade: number; familia?: string }> = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const ref = String(row[colMap['ref']] || '').trim();
        if (!ref) continue;

        const armazemRaw = row[colMap['armazem']];
        const armazem = typeof armazemRaw === 'number' ? armazemRaw : parseInt(String(armazemRaw || '0'));
        if (!armazem || isNaN(armazem)) continue;

        const qtdRaw = colMap['quantidade'] !== undefined ? row[colMap['quantidade']] : 1;
        const quantidade = typeof qtdRaw === 'number' ? qtdRaw : parseFloat(String(qtdRaw || '0').replace(',', '.')) || 0;
        if (quantidade < 1) continue;

        const descricao = colMap['designacao'] !== undefined ? String(row[colMap['designacao']] || '').trim() : '';
        let familia = colMap['familia'] !== undefined ? String(row[colMap['familia']] || '').trim().toUpperCase() : undefined;

        if (familia && !categoriasPermitidas.includes(familia)) continue;

        if (!familia) {
          const refUpper = ref.toUpperCase();
          if (/AGS|AGAC|AGN|AGSM|AGSH|AGST|AGSV|AGSMVZ|AGACMVZ/.test(refUpper)) familia = 'PB';
          else if (/BGS|OCL|OC/.test(refUpper)) familia = 'OC';
          else if (/RGS|LGS|VVL|VL/.test(refUpper)) familia = 'VL';
          else if (/TET|TE/.test(refUpper)) familia = 'TE';
        }

        itens.push({ ref, descricao, armazem, quantidade, familia });
      }

      if (itens.length === 0) {
        throw new Error('Não foram encontrados artigos válidos no ficheiro Excel.');
      }

      setStockJobProgress(`${itens.length} artigos lidos. A enviar ao servidor...`);

      // Enviar dados já processados ao servidor (muito mais leve que base64)
      analisarGlobalMutation.mutate({
        itensJson: JSON.stringify(itens),
        nomeArquivo: selectedFile.name,
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ler o ficheiro');
      setIsUploading(false);
      setStockJobProgress('');
    }
  };

  const handleVerDetalheLoja = (loja: LojaResultado) => {
    setDetalheLojaId(loja.lojaId);
    setDetalheLojaNome(loja.lojaNome);
    setDetalheAnaliseId(loja.analiseId);
    setDetalheId(null);
    setView('detalhe');
    setSearchTerm('');
    setActiveResultTab('semFichas');
    setFiltroClassificacao('todas');
  };

  const handleVerDetalheHistorico = (id: number) => {
    setDetalheId(id);
    setDetalheAnaliseId(id);
    setDetalheLojaId(null);
    setDetalheLojaNome('');
    setView('detalhe');
    setSearchTerm('');
    setActiveResultTab('semFichas');
    setFiltroClassificacao('todas');
  };

  const toggleGestor = (gestorNome: string) => {
    setExpandedGestores(prev => {
      const next = new Set(prev);
      if (next.has(gestorNome)) next.delete(gestorNome);
      else next.add(gestorNome);
      return next;
    });
  };

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

  // Filtrar itens sem fichas por classificação
  const filtrarSemFichasPorClassificacao = (itens: any[]): any[] => {
    if (filtroClassificacao === 'todas') return itens;
    if (filtroClassificacao === 'sem_classificacao') {
      return itens.filter((item: any) => {
        const key = `${item.ref?.toUpperCase()?.trim()}|${item.unitIndex || 1}`;
        return !classificacoesMap.get(key);
      });
    }
    return itens.filter((item: any) => {
      const key = `${item.ref?.toUpperCase()?.trim()}|${item.unitIndex || 1}`;
      const classifData = classificacoesMap.get(key);
      return classifData?.classificacao === filtroClassificacao;
    });
  };

  // Export handler
  const handleExportConsolidado = () => {
    if (!dadosActivos) return;
    const classifMapSimple = new Map<string, string>();
    classificacoesMap.forEach((v, k) => classifMapSimple.set(k, v.classificacao));
    exportConsolidatedExcel(
      nomeLoja,
      dadosActivos.comFichas || [],
      dadosActivos.semFichas || [],
      classifMapSimple,
      recorrenciaMap,
    );
  };

  // Classificar handler
  const handleClassificar = (eurocode: string, unitIndex: number, classificacao: string) => {
    if (!lojaIdActiva) return;
    const analiseId = detalheAnaliseId || detalheId;
    if (!analiseId) return;
    classificarMutation.mutate({
      lojaId: lojaIdActiva,
      eurocode,
      unitIndex,
      classificacao: classificacao as any,
      analiseId,
    });
  };

  // Email consolidado handler
  const handleEmailConsolidado = () => {
    if (!lojaIdActiva || !dadosActivos) {
      toast.error('Dados insuficientes para enviar email');
      return;
    }
    enviarEmailConsolidadoMutation.mutate({
      lojaId: lojaIdActiva,
      nomeLoja,
      comFichas: dadosActivos.comFichas || [],
      semFichas: dadosActivos.semFichas || [],
      totalItensStock: dadosActivos.totalItensStock,
    });
  };

  // Email tab handler
  const handleEmailTab = (status: 'comFichas' | 'semFichas') => {
    if (!lojaIdActiva) {
      toast.error('Loja não identificada para envio de email');
      return;
    }
    let itens: any[] = [];
    if (status === 'comFichas' && dadosActivos?.comFichas) itens = filtrarItens(dadosActivos.comFichas);
    else if (status === 'semFichas' && dadosActivos?.semFichas) itens = filtrarItens(dadosActivos.semFichas);
    if (itens.length === 0) { toast.error('Sem itens para enviar'); return; }
    enviarEmailMutation.mutate({ lojaId: lojaIdActiva, nomeLoja, status, itens });
  };

  // Comparação handlers
  const toggleComparacao = (analiseId: number) => {
    setComparacaoIds(prev => {
      if (prev.includes(analiseId)) return prev.filter(id => id !== analiseId);
      if (prev.length >= 2) return [prev[1], analiseId];
      return [...prev, analiseId];
    });
  };

  const handleIniciarComparacao = () => {
    if (comparacaoIds.length === 2) setViewComparacao(true);
    else toast.error('Seleccione 2 análises para comparar');
  };

  // Comparação query
  const { data: comparacaoData, isLoading: comparacaoLoading } = trpc.stock.comparar.useQuery(
    { analiseId1: comparacaoIds[0]!, analiseId2: comparacaoIds[1]! },
    { enabled: comparacaoIds.length === 2 && viewComparacao }
  );

  // Variação helper
  const VariacaoDisplay = ({ valor }: { valor: number }) => {
    if (valor === 0) return <span className="text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0</span>;
    if (valor > 0) return <span className="text-red-600 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> +{valor}</span>;
    return <span className="text-green-600 flex items-center gap-0.5"><TrendingDown className="h-3 w-3" /> {valor}</span>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {(view === 'resultadoGlobal' || view === 'detalhe' || view === 'historico') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    if (view === 'detalhe' && resultadoGlobal) setView('resultadoGlobal');
                    else if (view === 'detalhe') setView('historico');
                    else setView('dashboard');
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
                variant={view === 'dashboard' ? 'default' : 'outline'}
                size="sm"
                className="text-xs px-2 md:text-sm md:px-3"
                onClick={() => setView('dashboard')}
              >
                <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant={view === 'upload' || view === 'resultadoGlobal' ? 'default' : 'outline'}
                size="sm"
                className="text-xs px-2 md:text-sm md:px-3"
                onClick={() => setView('upload')}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Carregar </span>Ficheiro
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
          {view === 'detalhe' && nomeLoja && (
            <p className="text-sm md:text-base font-semibold text-muted-foreground pl-1">
              {nomeLoja}
            </p>
          )}
        </div>

        {/* Info da última análise de fichas */}
        {infoAnalise && view !== 'resultadoGlobal' && view !== 'dashboard' && (
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

        {/* VIEW: Dashboard */}
        {view === 'dashboard' && (
          <div className="space-y-4">
            {dashboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : !stockDashboard || stockDashboard.totais.totalLojas === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Warehouse className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sem dados de stock</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ainda não existem análises de stock. Carregue um ficheiro Excel para começar.
                  </p>
                  <Button onClick={() => setView('upload')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Carregar Ficheiro
                  </Button>
                </CardContent>
              </Card>
            ) : (() => {
              const { totais, topSemFichas, analises } = stockDashboard;
              const percentComFichas = totais.totalItensStock > 0 ? ((totais.totalComFichas / totais.totalItensStock) * 100).toFixed(1) : '0';
              const percentSemFichas = totais.totalItensStock > 0 ? ((totais.totalSemFichas / totais.totalItensStock) * 100).toFixed(1) : '0';
              return (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="border-blue-200 bg-blue-50/50">
                      <CardContent className="pt-3 pb-3 text-center">
                        <div className="text-xl md:text-2xl font-bold text-blue-600">{totais.totalLojas}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">Lojas Analisadas</div>
                      </CardContent>
                    </Card>
                    <Card className="border-indigo-200 bg-indigo-50/50">
                      <CardContent className="pt-3 pb-3 text-center">
                        <div className="text-xl md:text-2xl font-bold text-indigo-600">{totais.totalItensStock.toLocaleString('pt-PT')}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">Total em Stock</div>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-200 bg-amber-50/50">
                      <CardContent className="pt-3 pb-3 text-center">
                        <div className="text-xl md:text-2xl font-bold text-amber-600">{totais.totalSemFichas.toLocaleString('pt-PT')}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">Sem Fichas ({percentSemFichas}%)</div>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50/50">
                      <CardContent className="pt-3 pb-3 text-center">
                        <div className="text-xl md:text-2xl font-bold text-green-600">{totais.totalComFichas.toLocaleString('pt-PT')}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">Com Fichas ({percentComFichas}%)</div>
                      </CardContent>
                    </Card>

                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="h-3 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${percentComFichas}%` }}
                        title={`Com Fichas: ${percentComFichas}%`}
                      />
                      <div
                        className="bg-amber-500 transition-all"
                        style={{ width: `${percentSemFichas}%` }}
                        title={`Sem Fichas: ${percentSemFichas}%`}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Com Fichas</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Sem Fichas</span>
                    </div>
                  </div>

                  {/* Última análise info */}
                  {totais.ultimaAnalise && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Última análise: <strong>{new Date(totais.ultimaAnalise).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></span>
                    </div>
                  )}

                  {/* Lojas em cards/quadrados */}
                  <div>
                    <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
                      <Store className="h-4 w-4 text-blue-600" />
                      Resumo por Loja
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {analises && [...analises].sort((a: any, b: any) => {
                        const percA = a.totalItensStock > 0 ? (a.totalSemFichas / a.totalItensStock) : 0;
                        const percB = b.totalItensStock > 0 ? (b.totalSemFichas / b.totalItensStock) : 0;
                        return percB - percA;
                      }).map((loja: any) => {
                        const lojaSemFichasPercent = loja.totalItensStock > 0 ? ((loja.totalSemFichas / loja.totalItensStock) * 100).toFixed(0) : '0';
                        const lojaPercent = loja.totalItensStock > 0 ? ((loja.totalComFichas / loja.totalItensStock) * 100).toFixed(0) : '0';
                        const semFichasNum = parseInt(lojaSemFichasPercent);
                        const badgeColor = semFichasNum >= 60 ? 'bg-red-100 text-red-700 border-red-300' : semFichasNum >= 40 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-green-100 text-green-700 border-green-300';
                        return (
                          <Card
                            key={loja.id}
                            className="cursor-pointer hover:border-blue-300 transition-colors"
                            onClick={() => {
                              setDetalheId(loja.id);
                              setDetalheAnaliseId(loja.id);
                              setDetalheLojaId(loja.lojaId);
                              setDetalheLojaNome(loja.nomeLoja || 'Loja');
                              setView('detalhe');
                              setSearchTerm('');
                              setActiveResultTab('semFichas');
                              setFiltroClassificacao('todas');
                            }}
                          >
                            <CardContent className="pt-3 pb-3 px-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Store className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                  <span className="font-semibold text-sm truncate">{loja.nomeLoja || 'Loja'}</span>
                                </div>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 font-bold ${badgeColor}`}>
                                  {lojaSemFichasPercent}% s/ fichas
                                </Badge>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Total Stock:</span>
                                  <span className="font-bold text-blue-700">{loja.totalItensStock}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Sem Fichas:</span>
                                  <span className="font-medium text-amber-600">{loja.totalSemFichas}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Com Fichas:</span>
                                  <span className="font-medium text-green-600">{loja.totalComFichas}</span>
                                </div>

                              </div>
                              {/* Mini progress bar */}
                              <div className="mt-2">
                                <div className="h-1.5 rounded-full overflow-hidden flex bg-gray-200">
                                  <div className="bg-green-500" style={{ width: `${lojaPercent}%` }} />
                                  <div className="bg-amber-500" style={{ width: `${loja.totalItensStock > 0 ? ((loja.totalSemFichas / loja.totalItensStock) * 100).toFixed(0) : 0}%` }} />
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(loja.createdAt).toLocaleDateString('pt-PT')}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-blue-600">
                                  <Eye className="h-3 w-3" />
                                  Ver &gt;
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top lojas sem fichas */}
                  {topSemFichas && topSemFichas.length > 0 && (
                    <Card className="border-amber-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          Top Lojas com Mais Itens Sem Fichas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {topSemFichas.map((loja: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                                <span className="truncate max-w-[250px]">{loja.nomeLoja}</span>
                              </div>
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                {loja.totalSemFichas} itens
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Gráfico de evolução temporal */}
                  {evolucaoData && evolucaoData.evolucao.length > 1 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          Evolução Temporal
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Evolução dos totais de stock ao longo das análises
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={evolucaoData.evolucao} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                dataKey="data"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v: string) => {
                                  const d = new Date(v);
                                  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                }}
                              />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip
                                labelFormatter={(v: string) => {
                                  const d = new Date(v);
                                  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                }}
                                formatter={(value: number, name: string) => {
                                  const labels: Record<string, string> = {
                                    totalItensStock: 'Total Stock',
                                    totalComFichas: 'Com Fichas',
                                    totalSemFichas: 'Sem Fichas',
                                                  };
                                  return [value.toLocaleString('pt-PT'), labels[name] || name];
                                }}
                              />
                              <Legend
                                iconSize={10}
                                wrapperStyle={{ fontSize: '11px' }}
                                formatter={(value: string) => {
                                  const labels: Record<string, string> = {
                                    totalItensStock: 'Total Stock',
                                    totalComFichas: 'Com Fichas',
                                    totalSemFichas: 'Sem Fichas',
                                  };
                                  return labels[value] || value;
                                }}
                              />
                              <Line type="monotone" dataKey="totalItensStock" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="totalItensStock" />
                              <Line type="monotone" dataKey="totalSemFichas" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="totalSemFichas" />
                              <Line type="monotone" dataKey="totalComFichas" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="totalComFichas" />

                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setView('upload')} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Nova Análise
                    </Button>
                    <Button variant="outline" onClick={() => setView('historico')} className="flex-1">
                      <History className="h-4 w-4 mr-2" />
                      Ver Histórico Completo
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* VIEW: Upload */}
        {view === 'upload' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Carregar Listagem de Stock Global
                </CardTitle>
                <CardDescription>
                  Carregue o ficheiro Excel com a listagem de stock de todas as lojas.
                  O sistema separa automaticamente por armazém/loja e cruza com as fichas de serviço.
                  <br />
                  <span className="text-xs text-muted-foreground mt-1 block">
                    Colunas esperadas: Ref_, Designacao, Armazem, Quantidade, Unidade, Preco, Total, Tipo, Familia.
                    Apenas famílias OC, PB, VL e TE são consideradas.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File upload */}
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-blue-400 mb-3" />
                  {selectedFile ? (
                    <div>
                      <p className="font-medium text-blue-700">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB — Clique para alterar
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Clique para seleccionar o ficheiro Excel</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formato: .xlsx ou .xls
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleAnalisarGlobal}
                  disabled={!selectedFile || isUploading || analisarGlobalMutation.isPending || !!stockJobId}
                  className="w-full"
                >
                  {(isUploading || analisarGlobalMutation.isPending || !!stockJobId) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {stockJobProgress || 'A analisar stock global...'}
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analisar Stock Global
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* VIEW: Resultado Global (agrupado por gestor) */}
        {view === 'resultadoGlobal' && resultadoGlobal && (
          <div className="space-y-4">
            {/* Summary card */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">{resultadoGlobal.nomeArquivo}</span>
                  <span className="text-xs text-muted-foreground">
                    Analisado em {new Date().toLocaleDateString('pt-PT')}, {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-blue-700">{resultadoGlobal.totalArtigosProcessados}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Total Artigos</div>
                  </div>
                  <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-green-700">{resultadoGlobal.totalLojasAnalisadas}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Lojas Analisadas</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-purple-700">{resultadoGlobal.porGestor.length}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Gestores</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gestor groups */}
            {resultadoGlobal.porGestor.map((grupo) => (
              <div key={grupo.gestorNome} className="space-y-2">
                {/* Gestor header */}
                <div
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleGestor(grupo.gestorNome)}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-sm">{grupo.gestorNome}</span>
                    <Badge variant="secondary" className="text-[10px]">{grupo.totais.totalLojas} lojas</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] sm:text-xs h-7 px-2 bg-white border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                      disabled={enviarEmailTodasLojasMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        const analiseIds = grupo.lojas.map(l => ({ lojaId: l.lojaId, analiseId: l.analiseId }));
                        if (analiseIds.length === 0) { toast.error('Sem lojas para enviar'); return; }
                        enviarEmailTodasLojasMutation.mutate({ analiseIds });
                      }}
                    >
                      {enviarEmailTodasLojasMutation.isPending ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />A enviar...</>
                      ) : (
                        <><Send className="h-3 w-3 mr-1" />Enviar às Lojas</>
                      )}
                    </Button>
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                      <span className="text-blue-600 font-medium">{grupo.totais.totalItensStock} itens</span>
                      <span className="text-green-600">{grupo.totais.totalComFichas} c/fichas</span>
                      <span className="text-amber-600">{grupo.totais.totalSemFichas} s/fichas</span>
                    </div>
                    {expandedGestores.has(grupo.gestorNome) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Loja cards */}
                {expandedGestores.has(grupo.gestorNome) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-2">
                    {grupo.lojas.map((loja) => (
                      <Card
                        key={loja.lojaId}
                        className="cursor-pointer hover:border-blue-300 transition-colors"
                        onClick={() => handleVerDetalheLoja(loja)}
                      >
                        <CardContent className="pt-3 pb-3 px-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Store className="h-3.5 w-3.5 text-blue-600" />
                              <span className="font-semibold text-sm">{loja.lojaNome}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">#{loja.lojaNumero}</Badge>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Total Stock:</span>
                              <span className="font-bold text-blue-700">{loja.totalItensStock}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Sem Fichas:</span>
                              <span className="font-medium text-amber-600">{loja.totalSemFichas}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Com Fichas:</span>
                              <span className="font-medium text-green-600">{loja.totalComFichas}</span>
                            </div>

                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t">
                            <span className="text-[10px] text-muted-foreground">Pendente</span>
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <Eye className="h-3 w-3" />
                              Ver &gt;
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* VIEW: Detalhe por Loja */}
        {view === 'detalhe' && dadosActivos && (
          <div className="space-y-4">
            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4 text-center px-1 md:px-4">
                  <Package className="h-4 w-4 md:h-6 md:w-6 mx-auto text-blue-600 mb-0.5" />
                  <div className="text-lg md:text-2xl font-bold text-blue-700">
                    {dadosActivos.totalItensStock ?? (dadosActivos.comFichas?.length || 0) + (dadosActivos.semFichas?.length || 0)}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">Total Stock</div>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4 text-center px-1 md:px-4">
                  <XCircle className="h-4 w-4 md:h-6 md:w-6 mx-auto text-amber-600 mb-0.5" />
                  <div className="text-lg md:text-2xl font-bold text-amber-700">
                    {(dadosActivos.totalSemFichas ?? dadosActivos.semFichas?.length ?? 0) - itensComFichaServico.length}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">Sem Fichas</div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4 text-center px-1 md:px-4">
                  <CheckCircle2 className="h-4 w-4 md:h-6 md:w-6 mx-auto text-green-600 mb-0.5" />
                  <div className="text-lg md:text-2xl font-bold text-green-700">
                    {(dadosActivos.totalComFichas ?? dadosActivos.comFichas?.length ?? 0) + itensComFichaServico.length}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">Com Fichas</div>
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

            {/* Botões de acção consolidados */}
            <div className="flex gap-1.5 sm:gap-2 justify-end flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2 sm:text-sm sm:px-3 text-blue-700 border-blue-300 hover:bg-blue-50"
                onClick={handleExportConsolidado}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Excel Consolidado</span>
                <span className="sm:hidden">Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2 sm:text-sm sm:px-3 text-green-700 border-green-300 hover:bg-green-50"
                onClick={handleEmailConsolidado}
                disabled={enviarEmailConsolidadoMutation.isPending}
              >
                {enviarEmailConsolidadoMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5 mr-1" />
                )}
                <span className="hidden sm:inline">Email Consolidado</span>
                <span className="sm:hidden">Email</span>
              </Button>
            </div>

            {/* Tabs de resultado */}
            <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
              <TabsList className="grid w-full grid-cols-2 h-auto">
                <TabsTrigger value="semFichas" className="text-[10px] sm:text-sm px-1 py-1.5 sm:px-3 sm:py-2">
                  <XCircle className="h-3 w-3 mr-0.5 sm:mr-1 shrink-0" />
                  <span className="hidden sm:inline">Sem Fichas</span><span className="sm:hidden">S/ Fichas</span> ({semFichasDesmultiplicados.length})
                </TabsTrigger>
                <TabsTrigger value="comFichas" className="text-[10px] sm:text-sm px-1 py-1.5 sm:px-3 sm:py-2">
                  <CheckCircle2 className="h-3 w-3 mr-0.5 sm:mr-1 shrink-0" />
                  <span className="hidden sm:inline">Com Fichas</span><span className="sm:hidden">C/ Fichas</span> ({(dadosActivos.comFichas?.length || 0) + itensComFichaServico.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab: Sem Fichas (desmultiplicado) */}
              <TabsContent value="semFichas" className="space-y-1.5 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <select
                    className="text-xs sm:text-sm border rounded px-2 py-1 bg-transparent cursor-pointer flex-1 max-w-[220px]"
                    value={filtroClassificacao}
                    onChange={(e) => setFiltroClassificacao(e.target.value)}
                  >
                    <option value="todas">Todas ({semFichasDesmultiplicados.length})</option>
                    <option value="sem_classificacao">Sem Classificação</option>
                    <option value="devolucao_rejeitada">Devolução Rejeitada</option>
                    <option value="usado">Usado</option>
                    <option value="com_danos">Com Danos</option>
                    <option value="para_devolver">Para Devolver</option>
                    <option value="para_realizar">P/Realizar</option>
                  </select>
                </div>
                {filtrarSemFichasPorClassificacao(filtrarItens(semFichasDesmultiplicados)).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">Nenhum item encontrado</p>
                ) : (
                  filtrarSemFichasPorClassificacao(filtrarItens(semFichasDesmultiplicados)).map((item: any, idx: number) => {
                    const unitKey = `${item.ref?.toUpperCase()?.trim()}|${item.unitIndex}`;
                    const classifData = classificacoesMap.get(unitKey);
                    const recorr = recorrenciaMap.get(unitKey);
                    return (
                      <Card key={`${item.ref}-${item.unitIndex}`} className={`border-amber-100 ${recorr && recorr >= 3 ? 'ring-1 ring-red-300' : recorr && recorr >= 2 ? 'ring-1 ring-amber-300' : ''}`}>
                        <CardContent className="px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono text-[11px] px-1.5 py-0">
                                  {item.ref}
                                </Badge>
                                {item.totalUnidades > 1 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                                    {item.unitIndex}/{item.totalUnidades}
                                  </Badge>
                                )}
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
                                    if (e.target.value) handleClassificar(item.ref, item.unitIndex, e.target.value);
                                  }}
                                >
                                  <option value="">{classifData ? 'Alterar...' : 'Classificar...'}</option>
                                  <option value="devolucao_rejeitada">Devolução Rejeitada</option>
                                  <option value="usado">Usado</option>
                                  <option value="com_danos">Com Danos</option>
                                  <option value="para_devolver">Para Devolver</option>
                                  <option value="para_realizar">P/Realizar</option>
                                  <option value="com_ficha_servico">C/Ficha de Serviço</option>
                                </select>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-bold">1</span>
                              <span className="text-[10px] text-muted-foreground ml-0.5">un.</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Tab: Com Fichas */}
              <TabsContent value="comFichas" className="space-y-1.5 mt-3">
                {/* Itens reclassificados como C/Ficha de Serviço */}
                {itensComFichaServico.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Reclassificados como C/Ficha de Serviço ({itensComFichaServico.length})
                    </p>
                    {filtrarItens(itensComFichaServico).map((item: any, idx: number) => (
                      <Card key={`reclass-${idx}`} className="border-green-200 bg-green-50/30 mb-1.5">
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
                                  C/Ficha de Serviço
                                </Badge>
                                {item.totalUnidades > 1 && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                                    {item.unitIndex}/{item.totalUnidades}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.descricao}</p>
                              <select
                                className="text-[10px] border rounded px-1 py-0.5 bg-transparent cursor-pointer mt-1"
                                value="com_ficha_servico"
                                onChange={(e) => {
                                  if (e.target.value) handleClassificar(item.ref, item.unitIndex, e.target.value);
                                }}
                              >
                                <option value="">Alterar...</option>
                                <option value="devolucao_rejeitada">Devolução Rejeitada</option>
                                <option value="usado">Usado</option>
                                <option value="com_danos">Com Danos</option>
                                <option value="para_devolver">Para Devolver</option>
                                <option value="para_realizar">P/Realizar</option>
                                <option value="com_ficha_servico">C/Ficha de Serviço</option>
                              </select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {dadosActivos.comFichas && filtrarItens(dadosActivos.comFichas).length === 0 && itensComFichaServico.length === 0 ? (
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


            </Tabs>
          </div>
        )}

        {/* VIEW: Detalhe loading */}
        {view === 'detalhe' && !dadosActivos && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* VIEW: Histórico */}
        {view === 'historico' && !viewComparacao && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Análises
              </h2>
              {comparacaoIds.length === 2 && (
                <Button
                  size="sm"
                  className="text-xs sm:text-sm"
                  onClick={handleIniciarComparacao}
                >
                  <GitCompareArrows className="h-3.5 w-3.5 mr-1" />
                  Comparar ({comparacaoIds.length})
                </Button>
              )}
            </div>
            {comparacaoIds.length > 0 && comparacaoIds.length < 2 && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded">
                Seleccione mais 1 análise para comparar (total: 2)
              </p>
            )}

            {/* Batches - uploads anteriores */}
            {batches && batches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Uploads Realizados</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-2 px-3 font-medium">Data / Hora</th>
                        <th className="text-center py-2 px-3 font-medium">Lojas</th>
                        <th className="text-center py-2 px-3 font-medium">Total Stock</th>
                        <th className="text-center py-2 px-3 font-medium">Sem Fichas</th>
                        <th className="text-center py-2 px-3 font-medium">Com Fichas</th>
                        <th className="text-center py-2 px-3 font-medium">% s/ Fichas</th>
                        <th className="text-right py-2 px-3 font-medium">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(batches as any[]).map((batch: any, idx: number) => {
                        const totalStock = Number(batch.totalStock) || 0;
                        const totalSemFichas = Number(batch.totalSemFichas) || 0;
                        const percSemFichas = totalStock > 0 ? ((totalSemFichas / totalStock) * 100).toFixed(1) : '0';
                        const percNum = parseFloat(percSemFichas);
                        const percColor = percNum >= 60 ? 'text-red-600 font-bold' : percNum >= 40 ? 'text-amber-600 font-bold' : 'text-green-600 font-bold';
                        const batchDate = new Date(batch.createdAt);
                        return (
                          <tr key={batch.batchTime} className={`border-b hover:bg-muted/30 ${idx === 0 ? 'bg-blue-50/50' : ''}`}>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">{batchDate.toLocaleDateString('pt-PT')}</span>
                                <span className="text-muted-foreground">{batchDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                                {idx === 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300">Mais recente</Badge>}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center font-medium">{Number(batch.totalLojas)}</td>
                            <td className="py-2 px-3 text-center">{totalStock}</td>
                            <td className="py-2 px-3 text-center text-amber-600">{totalSemFichas}</td>
                            <td className="py-2 px-3 text-center text-green-600">{Number(batch.totalComFichas)}</td>
                            <td className={`py-2 px-3 text-center ${percColor}`}>{percSemFichas}%</td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-green-600 hover:text-green-800 hover:bg-green-50 text-xs"
                                  disabled={enviarEmailBatchMutation.isPending}
                                  onClick={() => {
                                    if (window.confirm(`Enviar emails para ${batch.totalLojas} lojas deste batch?\n\nData: ${batchDate.toLocaleDateString('pt-PT')} ${batchDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`)) {
                                      enviarEmailBatchMutation.mutate({ batchTime: batch.batchTime });
                                    }
                                  }}
                                >
                                  {enviarEmailBatchMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  <span className="hidden sm:inline">Enviar</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                                  disabled={eliminarBatchMutation.isPending}
                                  onClick={() => {
                                    if (window.confirm(`Tem a certeza que deseja eliminar este upload?\n\nData: ${batchDate.toLocaleDateString('pt-PT')} ${batchDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}\nLojas: ${batch.totalLojas}\nAnálises: ${batch.totalAnalises}\n\nEsta ação é irreversível e remove os dados das lojas.`)) {
                                      eliminarBatchMutation.mutate({ batchTime: batch.batchTime });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  <span className="hidden sm:inline">Apagar</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Store cards da análise mais recente */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Análises por Loja (mais recente)</h3>
            {!historico || historico.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma análise de stock encontrada.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...historico].sort((a: any, b: any) => {
                  const percA = a.totalItensStock > 0 ? (a.totalSemFichas / a.totalItensStock) : 0;
                  const percB = b.totalItensStock > 0 ? (b.totalSemFichas / b.totalItensStock) : 0;
                  return percB - percA;
                }).map((analise: any) => {
                  const percentComFichas = analise.totalItensStock > 0 ? ((analise.totalComFichas / analise.totalItensStock) * 100).toFixed(0) : '0';
                  const percentSemFichas = analise.totalItensStock > 0 ? ((analise.totalSemFichas / analise.totalItensStock) * 100).toFixed(0) : '0';
                  const semFichasNumH = parseInt(percentSemFichas);
                  const badgeColorH = semFichasNumH >= 60 ? 'bg-red-100 text-red-700 border-red-300' : semFichasNumH >= 40 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-green-100 text-green-700 border-green-300';
                  return (
                    <Card
                      key={analise.id}
                      className={`cursor-pointer transition-colors ${
                        comparacaoIds.includes(analise.id)
                          ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-300'
                          : 'hover:border-blue-300'
                      }`}
                      onClick={() => handleVerDetalheHistorico(analise.id)}
                    >
                      <CardContent className="pt-3 pb-3 px-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={comparacaoIds.includes(analise.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleComparacao(analise.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer shrink-0"
                              title="Seleccionar para comparação"
                            />
                            <Store className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span className="font-semibold text-sm truncate">{analise.nomeLoja}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-bold ${badgeColorH}`}>
                              {percentSemFichas}% s/ fichas
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Tem a certeza que deseja eliminar esta análise?')) {
                                  eliminarMutation.mutate({ id: analise.id });
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Stock:</span>
                            <span className="font-bold text-blue-700">{analise.totalItensStock}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Sem Fichas:</span>
                            <span className="font-medium text-amber-600">{analise.totalSemFichas}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Com Fichas:</span>
                            <span className="font-medium text-green-600">{analise.totalComFichas}</span>
                          </div>

                        </div>
                        {/* Mini progress bar */}
                        <div className="mt-2">
                          <div className="h-1.5 rounded-full overflow-hidden flex bg-gray-200">
                            <div className="bg-green-500" style={{ width: `${percentComFichas}%` }} />
                            <div className="bg-amber-500" style={{ width: `${percentSemFichas}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(analise.createdAt).toLocaleDateString('pt-PT')} às {new Date(analise.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Eye className="h-3 w-3" />
                            Ver &gt;
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW: Comparação */}
        {view === 'historico' && viewComparacao && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GitCompareArrows className="h-5 w-5" />
                Comparação de Análises
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setViewComparacao(false); setComparacaoIds([]); }}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Voltar
              </Button>
            </div>

            {comparacaoLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : comparacaoData ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-gray-300">
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Análise Anterior</p>
                      <p className="text-xs sm:text-sm font-semibold">{comparacaoData.analiseAntiga.nomeLoja}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {new Date(comparacaoData.analiseAntiga.data).toLocaleDateString('pt-PT')}
                      </p>
                      <div className="flex justify-center gap-2 mt-1 text-[10px] sm:text-xs">
                        <span className="text-blue-600 font-medium">{comparacaoData.analiseAntiga.totalStock}</span>
                        <span className="text-green-600">{comparacaoData.analiseAntiga.totalComFichas}</span>
                        <span className="text-amber-600">{comparacaoData.analiseAntiga.totalSemFichas}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-300">
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Análise Recente</p>
                      <p className="text-xs sm:text-sm font-semibold">{comparacaoData.analiseRecente.nomeLoja}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {new Date(comparacaoData.analiseRecente.data).toLocaleDateString('pt-PT')}
                      </p>
                      <div className="flex justify-center gap-2 mt-1 text-[10px] sm:text-xs">
                        <span className="text-blue-600 font-medium">{comparacaoData.analiseRecente.totalStock}</span>
                        <span className="text-green-600">{comparacaoData.analiseRecente.totalComFichas}</span>
                        <span className="text-amber-600">{comparacaoData.analiseRecente.totalSemFichas}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-3 pb-3">
                    <h3 className="text-sm font-semibold mb-2">Variações</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
                      <div className="flex items-center justify-between bg-blue-50 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">Stock</span>
                        <VariacaoDisplay valor={comparacaoData.variacoes.totalStock} />
                      </div>
                      <div className="flex items-center justify-between bg-amber-50 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">S/ Fichas</span>
                        <VariacaoDisplay valor={comparacaoData.variacoes.semFichas} />
                      </div>
                      <div className="flex items-center justify-between bg-green-50 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">C/ Fichas</span>
                        <VariacaoDisplay valor={comparacaoData.variacoes.comFichas} />
                      </div>

                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {comparacaoData.semFichas.resolvidos.length > 0 && (
                    <Card className="border-green-200">
                      <CardContent className="pt-3 pb-3">
                        <h3 className="text-sm font-semibold text-green-700 flex items-center gap-1.5 mb-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Resolvidos ({comparacaoData.semFichas.resolvidos.length})
                        </h3>
                        <div className="space-y-1">
                          {comparacaoData.semFichas.resolvidos.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-green-50 rounded px-2 py-1 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono font-medium text-blue-700">{item.ref}</span>
                                <span className="truncate text-muted-foreground">{item.descricao}</span>
                              </div>
                              <span className="shrink-0 font-medium">{item.quantidade} un.</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {comparacaoData.semFichas.novos.length > 0 && (
                    <Card className="border-red-200">
                      <CardContent className="pt-3 pb-3">
                        <h3 className="text-sm font-semibold text-red-700 flex items-center gap-1.5 mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          Novos sem ficha ({comparacaoData.semFichas.novos.length})
                        </h3>
                        <div className="space-y-1">
                          {comparacaoData.semFichas.novos.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-red-50 rounded px-2 py-1 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono font-medium text-blue-700">{item.ref}</span>
                                <span className="truncate text-muted-foreground">{item.descricao}</span>
                              </div>
                              <span className="shrink-0 font-medium">{item.quantidade} un.</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {comparacaoData.semFichas.mantidos.length > 0 && (
                    <Card className="border-amber-200">
                      <CardContent className="pt-3 pb-3">
                        <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                          <Clock className="h-4 w-4" />
                          Mantidos sem ficha ({comparacaoData.semFichas.mantidos.length})
                        </h3>
                        <div className="space-y-1">
                          {comparacaoData.semFichas.mantidos.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-amber-50 rounded px-2 py-1 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono font-medium text-blue-700">{item.ref}</span>
                                <span className="truncate text-muted-foreground">{item.descricao}</span>
                              </div>
                              <span className="shrink-0 font-medium">{item.quantidade} un.</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {comparacaoData.semFichas.novos.length === 0 && comparacaoData.semFichas.resolvidos.length === 0 && comparacaoData.semFichas.mantidos.length === 0 && (
                    <Card>
                      <CardContent className="py-6 text-center text-muted-foreground text-sm">
                        Sem diferenças nos itens sem fichas entre as duas análises.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Erro ao carregar comparação.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
