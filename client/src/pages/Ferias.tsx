import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Streamdown } from "streamdown";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Upload, Calendar, BarChart3, PieChart, Download, FileSpreadsheet,
  Search, Users, Building2, Clock, Trash2, Filter, Sun, AlertTriangle,
  CheckCircle2, XCircle, Eye, ChevronUp, ChevronDown, Crosshair, Pin, Star, Sparkles, Loader2, UserCheck,
  FileText, Store, ArrowRight, CircleDot, Check, ChevronsUpDown, CalendarPlus
} from "lucide-react";

// ─── CONSTANTS ───
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_LOW = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DAYS: Record<number,number> = {1:31,2:28,3:31,4:30,5:31,6:30,7:31,8:31,9:30,10:31,11:30,12:31};

type Status = 'approved' | 'rejected' | 'holiday' | 'weekend' | 'absent';

const S_CLASS: Record<Status,string> = {
  approved:'bg-green-600 text-white',
  rejected:'bg-red-600 text-white',
  holiday:'bg-purple-600 text-white',
  weekend:'bg-yellow-300 text-yellow-900',
  absent:'bg-slate-500 text-white'
};
const S_LABEL: Record<Status,string> = {approved:'S',rejected:'N',holiday:'F',weekend:'-',absent:'A'};
const S_DISPLAY: Record<Status,{bg:string;label:string}> = {
  approved:{bg:'bg-green-500',label:'Aprovado'},
  rejected:{bg:'bg-red-500',label:'Não Aprovado'},
  holiday:{bg:'bg-purple-500',label:'Feriado'},
  weekend:{bg:'bg-amber-300',label:'Fim-de-semana'},
  absent:{bg:'bg-slate-500',label:'Falta'},
};

const COLOR_MAP: Record<string,Status> = {
  'FFBBF1FA':'holiday','BBF1FA':'holiday',
  'FFFAFAB4':'weekend','FAFAB4':'weekend',
  'FF00FF00':'approved','00FF00':'approved',
  'FFFB827E':'rejected','FB827E':'rejected',
  'FF707070':'absent','707070':'absent',
};

const GESTORES: Record<string, string[]> = {
  'Marco Amorim': ['BARCELOS','BRAGA CENTRO','FAMALICÃO','GUIMARÃES','MYCARCENTER','PAÇOS FERREIRA','PAREDES','POVOA VARZIM','RECALIBRA MINHO','SM BRAGA','SM FAMALICÃO','SM PAREDES','SM VIANA CASTELO','VIANA CASTELO','VILA VERDE'],
  'Fábio Dias': ['ABRANTES','CALDAS DA RAINHA','CASTANHEIRA DO RIBATEJO','ENTRONCAMENTO','FARO','MONTIJO','PORTIMAO','PORTO ALTO','SANTAREM','SM FARO','SM PORTO ALTO','SM VALE DO TEJO'],
  'Carlos Eduardo': ['ALGÉS','ALMADA','AMADORA','CASCAISHOPPING','LISBOA-AMOREIRAS','LISBOA-RELOGIO','LOURES','MOVIDA','POVOA SANTA IRIA','RECALIBRA LISBOA','SACAVEM','SM LISBOA','SMR LISBOA','TELHEIRAS'],
  'Marco Vilar': ['CANELAS','FEIRA','GAIA','GONDOMAR','MAIA','MAIA AEROPORTO','MAIASHOPPING','MATOSINHOS','PORTO-MARQUÊS','PORTO-ZI','RECALIBRA PORTO','SM PORTO'],
  'Mónica Correia': ['AGUEDA','AVEIRO','COIMBRA','COIMBRA SUL','GUARDA','POMBAL','SEIA','SM BEIRA BAIXA','SM COIMBRA','SM COSTA PRATA','SM LEIRIA','SM SEIA','SM VISEU','SM VISEU 2','VISEU'],
  'Rui Adrião': ['SM CASTANHEIRA DO RIBATEJO','SM PESADOS PORTO','SMR VISEU'],
};

// ─── TYPES ───
interface Employee {
  store: string;
  num: string;
  name: string;
  days: Record<string, Status>;
}

interface EmpStats {
  approved: number;
  rejected: number;
  absent: number;
  holidays: number;
  byMonth: Record<number, number>;
  total: number;
  gestor: string;
}

interface ParsedData {
  employees: Employee[];
  storeMap: Record<string, number>;
}

// ─── HELPERS ───
const norm = (s: string) => s.toUpperCase().replace(/\s*\|\s*\d+/g,'').replace(/\s+/g,' ').trim();
const shortName = (n: string) => { const p = n.split(' '); return p.length > 1 ? p[0]+' '+p[p.length-1] : n; };

function getGestorForStore(store: string): string {
  const ns = norm(store);
  for (const [gz, stores] of Object.entries(GESTORES)) {
    if (stores.map(norm).includes(ns)) return gz;
  }
  return '—';
}

function empStats(emp: Employee): EmpStats {
  let approved=0, rejected=0, absent=0, holidays=0;
  const byMonth: Record<number,number> = {};
  for (let m=1;m<=12;m++) byMonth[m]=0;
  for (const [key, status] of Object.entries(emp.days)) {
    const m = parseInt(key.split('-')[0]);
    if (status==='approved') { approved++; byMonth[m]++; }
    else if (status==='rejected') rejected++;
    else if (status==='absent') absent++;
    else if (status==='holiday') holidays++;
  }
  return {approved, rejected, absent, holidays, byMonth, total: approved+rejected, gestor: getGestorForStore(emp.store)};
}

function parseSheet(ws: XLSX.WorkSheet): ParsedData {
  const range = XLSX.utils.decode_range(ws['!ref']!);
  const monthStartCol: Record<number,number> = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({r:0,c})];
    if (cell?.v) {
      const mi = MONTHS_LOW.indexOf(String(cell.v).toLowerCase().trim());
      if (mi >= 0) monthStartCol[c] = mi;
    }
  }
  const colDate: Record<number,{m:number,d:number}> = {};
  let curM = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    if (monthStartCol[c] !== undefined) curM = monthStartCol[c];
    if (curM >= 0) {
      const dc = ws[XLSX.utils.encode_cell({r:1,c})];
      if (dc?.v != null) { const d = parseInt(dc.v); if (d>=1&&d<=31) colDate[c]={m:curM,d}; }
    }
  }
  const STOP = new Set(['legenda','fim de semana','feriado','ferias aprovadas','férias aprovadas','ferias não aprovadas','férias não aprovadas','faltas','centro']);
  const employees: Employee[] = [];
  const storeMap: Record<string,number> = {};
  for (let r = 2; r <= range.e.r; r++) {
    const aCell = ws[XLSX.utils.encode_cell({r,c:3})];
    if (!aCell?.v) continue;
    const rawStore = String(aCell.v).trim();
    if (STOP.has(rawStore.toLowerCase())) continue;
    const store = rawStore.replace(/\|\d+/g,'').trim();
    const numCell = ws[XLSX.utils.encode_cell({r,c:4})]?.v ?? '';
    const nameCell = ws[XLSX.utils.encode_cell({r,c:5})]?.v ?? '';
    const days: Record<string,Status> = {};
    for (let c = 33; c <= range.e.c; c++) {
      const cd = colDate[c]; if (!cd) continue;
      const cell = ws[XLSX.utils.encode_cell({r,c})];
      if (!cell) continue;
      let status: Status | null = null;
      if (cell.s?.fgColor) {
        const rgb = (cell.s.fgColor.argb||cell.s.fgColor.rgb||'').toUpperCase();
        status = COLOR_MAP[rgb]||null;
      }
      if (!status && cell.v) {
        const map: Record<string,Status> = {S:'approved',N:'rejected',A:'absent',F:'holiday','-':'weekend'};
        status = map[String(cell.v).trim().toUpperCase()]||null;
      }
      if (status) days[`${cd.m+1}-${cd.d}`] = status;
    }
    employees.push({store, num:String(numCell), name:String(nameCell), days});
    if (!storeMap[store]) storeMap[store] = 0;
    storeMap[store]++;
  }
  return {employees, storeMap};
}

// ─── MAIN COMPONENT ───
export default function Ferias() {
  const { user } = useAuth();

  const today = useMemo(() => new Date(), []);
  const TM = today.getMonth()+1;
  const TD = today.getDate();

  // State
  const [ano, setAno] = useState(today.getFullYear());
  const [data, setData] = useState<ParsedData|null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cal');
  const [gestorFilter, setGestorFilter] = useState('all');
  const [lojaFilter, setLojaFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [compareAno, setCompareAno] = useState<number|null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pinnedEmployees, setPinnedEmployees] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ferias_pinned_employees');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  // Persist pinned employees to localStorage
  useEffect(() => {
    localStorage.setItem('ferias_pinned_employees', JSON.stringify([...pinnedEmployees]));
  }, [pinnedEmployees]);

  const togglePin = useCallback((empNum: string) => {
    setPinnedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(empNum)) next.delete(empNum);
      else next.add(empNum);
      return next;
    });
  }, []);

  // Query para obter nomes dos volantes da DB
  const { data: volanteNames } = trpc.ferias.getVolanteNames.useQuery();

  // Ref para enrichedData (usado antes da declaração)
  const enrichedDataRef = useRef<any[]>([]);

  // Fixar todos os volantes de uma vez
  const fixarTodosVolantes = useCallback(() => {
    if (!volanteNames || volanteNames.length === 0) {
      toast.error('Nenhum volante encontrado na base de dados');
      return;
    }
    const enriched = enrichedDataRef.current;
    if (!enriched || enriched.length === 0) {
      toast.error('Carregue primeiro os dados de férias');
      return;
    }
    // Cruzar nomes dos volantes com os colaboradores do Excel
    const matchedNums = new Set<string>();
    for (const emp of enriched) {
      const empName = emp.name.toUpperCase().trim();
      for (const vName of volanteNames) {
        if (empName === vName || empName.includes(vName) || vName.includes(empName)) {
          matchedNums.add(emp.num);
          break;
        }
      }
    }
    if (matchedNums.size === 0) {
      toast.info('Nenhum volante encontrado nos dados de férias carregados');
      return;
    }
    setPinnedEmployees(prev => {
      const next = new Set(prev);
      matchedNums.forEach(n => next.add(n));
      return next;
    });
    toast.success(`${matchedNums.size} volante(s) fixado(s) no topo`);
  }, [volanteNames]);

  // Desafixar todos
  const desafixarTodos = useCallback(() => {
    setPinnedEmployees(new Set());
    toast.success('Todos os colaboradores desafixados');
  }, []);

  // Estado para Recomendações IA
  const [showRecomendacoes, setShowRecomendacoes] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState<string | null>(null);
  const [iaLojasPopoverOpen, setIaLojasPopoverOpen] = useState(false);
  const [iaLojasSelecionadas, setIaLojasSelecionadas] = useState<string[]>([]);

  // tRPC queries
  const guardarUpload = trpc.ferias.guardarUpload.useMutation();
  const apagarUpload = trpc.ferias.apagarUpload.useMutation();
  const gerarRecomendacoesIA = trpc.ferias.gerarRecomendacoesIA.useMutation({
    onSuccess: (result) => {
      setRelatorioIA(result.relatorio);
      toast.success(`Recomendações geradas para ${result.totalColaboradores} colaboradores`);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao gerar recomendações');
    },
  });
  const uploadsQuery = trpc.ferias.listarUploads.useQuery();
  const dadosAnoQuery = trpc.ferias.getColaboradoresPorAno.useQuery({ ano });
  const anosQuery = trpc.ferias.getAnos.useQuery();

  // Load data from DB when year changes
  useEffect(() => {
    if (dadosAnoQuery.data?.upload && dadosAnoQuery.data.colaboradores.length > 0) {
      const colabs = dadosAnoQuery.data.colaboradores;
      const employees: Employee[] = colabs.map((c: any) => ({
        store: c.loja,
        num: String(c.id || '').substring(0, 6),
        name: c.nome,
        days: typeof c.dias === 'string' ? JSON.parse(c.dias) : c.dias,
      }));
      const storeMap: Record<string,number> = {};
      employees.forEach(e => { storeMap[e.store] = (storeMap[e.store]||0)+1; });
      setData({employees, storeMap});
    } else if (!dadosAnoQuery.isLoading) {
      setData(null);
    }
  }, [dadosAnoQuery.data, dadosAnoQuery.isLoading]);

  // Compare data
  const dadosCompareQuery = trpc.ferias.getColaboradoresPorAno.useQuery(
    { ano: compareAno! },
    { enabled: !!compareAno }
  );
  const compareData = useMemo(() => {
    if (!dadosCompareQuery.data?.colaboradores?.length) return null;
    return dadosCompareQuery.data.colaboradores.map((c: any) => ({
      store: c.loja,
      num: String(c.id || '').substring(0, 6),
      name: c.nome,
      days: typeof c.dias === 'string' ? JSON.parse(c.dias) : c.dias,
    })) as Employee[];
  }, [dadosCompareQuery.data]);

  // File handler
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setLoading(true);
    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, {type:'array', cellStyles:true});
      const ws = wb.Sheets['Calendario'] || wb.Sheets[wb.SheetNames[0]];
      const parsed = parseSheet(ws);
      setData(parsed);

      // Save to DB
      const colaboradores = parsed.employees.map(emp => {
        const stats = empStats(emp);
        return {
          nome: emp.name,
          loja: emp.store,
          gestor: stats.gestor !== '—' ? stats.gestor : undefined,
          dias: emp.days,
          totalAprovados: stats.approved,
          totalNaoAprovados: stats.rejected,
          totalFeriados: stats.holidays,
          totalFaltas: stats.absent,
        };
      });
      await guardarUpload.mutateAsync({ nomeArquivo: f.name, ano, colaboradores });
      uploadsQuery.refetch();
      dadosAnoQuery.refetch();
      anosQuery.refetch();
      toast.success(`${parsed.employees.length} colaboradores de ${Object.keys(parsed.storeMap).length} lojas processados e guardados.`);
    } catch(err: any) {
      toast.error(`Erro ao processar: ${err.message}`);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [ano, guardarUpload, toast, uploadsQuery, dadosAnoQuery, anosQuery]);

  // Enriched data with stats
  const enrichedData = useMemo(() => {
    if (!data) return [];
    return data.employees.map(e => ({...e, ...empStats(e)}));
  }, [data]);

  // Manter ref actualizado para uso no fixarTodosVolantes
  useEffect(() => { enrichedDataRef.current = enrichedData; }, [enrichedData]);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = enrichedData;
    if (gestorFilter !== 'all') {
      const gStores = GESTORES[gestorFilter]?.map(norm) || [];
      result = result.filter(e => gStores.includes(norm(e.store)));
    }
    if (lojaFilter !== 'all') result = result.filter(e => norm(e.store) === norm(lojaFilter));
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(s) || e.store.toLowerCase().includes(s) || e.num.includes(s));
    }
    return result;
  }, [enrichedData, gestorFilter, lojaFilter, search]);

  // Pinned employees (always visible from full dataset, filtered only by search)
  const pinnedData = useMemo(() => {
    if (pinnedEmployees.size === 0) return [];
    let result = enrichedData.filter(e => pinnedEmployees.has(e.num));
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(s) || e.store.toLowerCase().includes(s) || e.num.includes(s));
    }
    return result;
  }, [enrichedData, pinnedEmployees, search]);

  // Store employees (filtered data excluding pinned)
  const storeData = useMemo(() => {
    return filteredData.filter(e => !pinnedEmployees.has(e.num));
  }, [filteredData, pinnedEmployees]);

  // Available stores
  const availableStores = useMemo(() => {
    if (!data) return [];
    let stores = Object.keys(data.storeMap).sort((a,b)=>a.localeCompare(b,'pt'));
    if (gestorFilter !== 'all') {
      const gStores = GESTORES[gestorFilter]?.map(norm) || [];
      stores = stores.filter(s => gStores.includes(norm(s)));
    }
    return stores;
  }, [data, gestorFilter]);

  // Visible months
  const visibleMonths = useMemo(() => {
    if (monthFilter !== 'all') return [parseInt(monthFilter)];
    return Array.from({length:12},(_,i)=>i+1);
  }, [monthFilter]);

  // Export Excel
  const exportExcel = useCallback(() => {
    if (!filteredData.length) return;
    const rows = filteredData.map(e => ({
      'Nome': e.name, 'Loja': e.store, 'Gestor': e.gestor,
      'Dias Aprovados': e.approved, 'Dias Não Aprovados': e.rejected,
      'Faltas': e.absent, 'Feriados': e.holidays, 'Total Marcados': e.total,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Férias');
    XLSX.writeFile(wb, `ferias_${ano}_export.xlsx`);
    toast.success('Ficheiro Excel exportado.');
  }, [filteredData, ano]);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (!calRef.current) return;
    const cell = calRef.current.querySelector('.ring-sky-500');
    if (cell) cell.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  }, []);

  return (
    <DashboardLayout>
    <div className="space-y-4 pb-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sun className="h-6 w-6 text-amber-500" />
            Gestão de Férias
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Planeamento e análise de férias dos colaboradores</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(ano)} onValueChange={v => { setAno(Number(v)); }}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Clock className="h-4 w-4 mr-1" /> Histórico</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Histórico de Uploads</DialogTitle>
                <DialogDescription>Registo de ficheiros de férias carregados</DialogDescription>
              </DialogHeader>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ficheiro</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Colab.</TableHead>
                      <TableHead>Por</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!uploadsQuery.data || uploadsQuery.data.length === 0) && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum upload registado</TableCell></TableRow>
                    )}
                    {uploadsQuery.data?.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs">{new Date(u.createdAt).toLocaleString('pt-PT')}</TableCell>
                        <TableCell className="font-medium text-sm">{u.nomeArquivo}</TableCell>
                        <TableCell>{u.ano}</TableCell>
                        <TableCell>{u.totalColaboradores}</TableCell>
                        <TableCell className="text-xs">{u.uploadedByName}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0"
                            onClick={async () => {
                              await apagarUpload.mutateAsync({ id: u.id });
                              uploadsQuery.refetch(); dadosAnoQuery.refetch();
                              toast.success('Upload apagado');
                            }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>

          {data && (
            <>
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <Download className="h-4 w-4 mr-1" /> Exportar Excel
              </Button>
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => { setActiveTab('ics'); }}>
                <CalendarPlus className="h-4 w-4 mr-1" /> Exportar Outlook
              </Button>
            </>
          )}

          <input ref={fileRef} type="file" accept=".xls,.xlsx,.xlsm" className="hidden" onChange={handleFile} />
          <Button onClick={() => fileRef.current?.click()} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="h-4 w-4 mr-1" /> {loading ? 'A processar...' : 'Carregar Ficheiro'}
          </Button>
        </div>
      </div>

      {/* Last upload info */}
      {dadosAnoQuery.data?.upload && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Último upload: <strong>{dadosAnoQuery.data.upload.nomeArquivo}</strong></span>
          <span>·</span>
          <span>{new Date(dadosAnoQuery.data.upload.createdAt).toLocaleString('pt-PT')}</span>
          <span>·</span>
          <span>por {dadosAnoQuery.data.upload.uploadedByName}</span>
        </div>
      )}

      {/* EMPTY STATE */}
      {!data && !dadosAnoQuery.isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-amber-100 p-4 mb-4">
              <Sun className="h-10 w-10 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum ficheiro de férias carregado para {ano}</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">
              Carregue o ficheiro Excel de férias (Férias.xlsx) para visualizar o calendário, análise e distribuição.
            </p>
            <Button onClick={() => fileRef.current?.click()} className="bg-blue-600 hover:bg-blue-700">
              <Upload className="h-4 w-4 mr-2" /> Carregar Ficheiro de Férias
            </Button>
            <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div className="flex flex-col items-center gap-1"><Calendar className="h-5 w-5 text-blue-400" /><span>Calendário Visual</span></div>
              <div className="flex flex-col items-center gap-1"><BarChart3 className="h-5 w-5 text-green-400" /><span>Análise & KPIs</span></div>
              <div className="flex flex-col items-center gap-1"><PieChart className="h-5 w-5 text-purple-400" /><span>Distribuição</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MAIN CONTENT */}
      {data && (
        <>
          {/* FILTERS */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Filtros:</span>
                </div>
                <Select value={gestorFilter} onValueChange={v => { setGestorFilter(v); setLojaFilter('all'); }}>
                  <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Gestor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os gestores</SelectItem>
                    {Object.keys(GESTORES).sort().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={lojaFilter} onValueChange={setLojaFilter}>
                  <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Loja" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as lojas</SelectItem>
                    {availableStores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {MONTHS_PT.map((m,i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os estados</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Não Aprovado</SelectItem>
                    <SelectItem value="absent">Falta</SelectItem>
                    <SelectItem value="holiday">Feriado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Pesquisar colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-7 h-8 text-xs" />
                </div>
                {pinnedEmployees.size > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">
                    <Pin className="h-3 w-3 mr-1" />{pinnedEmployees.size} fixados
                  </Badge>
                )}
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={fixarTodosVolantes} title="Fixar todos os volantes no topo">
                  <UserCheck className="h-3.5 w-3.5" /> Fixar Volantes
                </Button>
                {pinnedEmployees.size > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-red-500" onClick={desafixarTodos} title="Desafixar todos">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Limpar
                  </Button>
                )}
                <Badge variant="secondary" className="text-xs">{filteredData.length} colab.</Badge>
              </div>
            </CardContent>
          </Card>

          {/* BOTÃO RECOMENDAÇÕES IA COM SELETOR MULTI-LOJA */}
          <div className="flex items-center justify-end gap-2">
            <Popover open={iaLojasPopoverOpen} onOpenChange={setIaLojasPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50 gap-2 min-w-[180px] justify-between">
                  <Store className="h-4 w-4" />
                  {iaLojasSelecionadas.length === 0 ? 'Todas as lojas (geral)' : `${iaLojasSelecionadas.length} loja${iaLojasSelecionadas.length > 1 ? 's' : ''}`}
                  <ChevronsUpDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="end">
                <div className="p-3 border-b">
                  <p className="text-xs font-medium text-muted-foreground">Selecionar lojas para análise IA</p>
                  <p className="text-xs text-muted-foreground mt-1">Sem seleção = análise geral</p>
                </div>
                <div className="p-2 border-b">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => setIaLojasSelecionadas([])}>
                    Limpar seleção
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => setIaLojasSelecionadas([...availableStores])}>
                    Selecionar todas
                  </Button>
                </div>
                <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
                  {availableStores.map(loja => (
                    <label key={loja} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                      <Checkbox
                        checked={iaLojasSelecionadas.includes(loja)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setIaLojasSelecionadas(prev => [...prev, loja].sort((a,b) => a.localeCompare(b,'pt')));
                          } else {
                            setIaLojasSelecionadas(prev => prev.filter(l => l !== loja));
                          }
                        }}
                      />
                      <span className="truncate">{loja}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50 gap-2"
              disabled={gerarRecomendacoesIA.isPending}
              onClick={() => {
                setShowRecomendacoes(true);
                setRelatorioIA(null);
                gerarRecomendacoesIA.mutate({
                  ano,
                  gestorNome: user?.name || undefined,
                  lojas: iaLojasSelecionadas.length > 0 ? iaLojasSelecionadas : undefined,
                });
              }}
            >
              {gerarRecomendacoesIA.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Recomendações IA
            </Button>
          </div>

          {/* MODAL RECOMENDAÇÕES IA */}
          <Dialog open={showRecomendacoes} onOpenChange={setShowRecomendacoes}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-purple-700">
                  <Sparkles className="h-5 w-5" />
                  Recomendações IA — Férias {ano} {user?.name ? `(${user.name})` : ''}
                </DialogTitle>
                <DialogDescription>
                  {iaLojasSelecionadas.length > 0
                    ? `Análise focada: ${iaLojasSelecionadas.join(', ')} — com destaque para férias coincidentes`
                    : `Análise geral com base no Procedimento Interno N.º 8 — Zona de ${user?.name || 'Gestor'}`}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2">
                {gerarRecomendacoesIA.isPending ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                    <p className="text-sm text-muted-foreground">A analisar {filteredData.length} colaboradores...</p>
                    <p className="text-xs text-muted-foreground">Isto pode demorar até 30 segundos</p>
                  </div>
                ) : relatorioIA ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Streamdown>{relatorioIA}</Streamdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <AlertTriangle className="h-10 w-10 text-amber-500" />
                    <p className="text-sm text-muted-foreground">Erro ao gerar recomendações. Tente novamente.</p>
                  </div>
                )}
              </div>
              {relatorioIA && (
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => {
                    const blob = new Blob([relatorioIA], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `recomendacoes-ferias-${ano}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download className="h-4 w-4 mr-1" /> Exportar Relatório
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setRelatorioIA(null);
                    gerarRecomendacoesIA.mutate({
                      ano,
                      gestorNome: user?.name || undefined,
                      lojas: iaLojasSelecionadas.length > 0 ? iaLojasSelecionadas : undefined,
                    });
                  }}>
                    <Sparkles className="h-4 w-4 mr-1" /> Gerar Novamente
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cal" className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Calendário</TabsTrigger>
              <TabsTrigger value="an" className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4" /> Análise</TabsTrigger>
              <TabsTrigger value="dist" className="flex items-center gap-1.5"><PieChart className="h-4 w-4" /> Distribuição</TabsTrigger>
              <TabsTrigger value="ics" className="flex items-center gap-1.5"><CalendarPlus className="h-4 w-4" /> Outlook</TabsTrigger>
            </TabsList>

            {/* CALENDAR TAB */}
            <TabsContent value="cal">
              <CalendarTab data={storeData} pinnedData={pinnedData} months={visibleMonths} statusFilter={statusFilter} ano={ano} TM={TM} TD={TD} calRef={calRef} scrollToToday={scrollToToday} pinnedEmployees={pinnedEmployees} togglePin={togglePin} />
            </TabsContent>

            {/* ANALYSIS TAB */}
            <TabsContent value="an">
              <AnalysisTab data={filteredData} allData={enrichedData} ano={ano} TM={TM} />
            </TabsContent>

            {/* DISTRIBUTION TAB */}
            <TabsContent value="dist">
              <DistributionTab data={enrichedData} gestorFilter={gestorFilter} ano={ano} TM={TM}
                compareAno={compareAno} setCompareAno={setCompareAno} compareData={compareData}
                anosDisponiveis={anosQuery.data?.map((a: any) => a.ano).filter((a: number) => a !== ano) || []}
                availableStores={availableStores} />
            </TabsContent>

            {/* OUTLOOK EXPORT TAB */}
            <TabsContent value="ics">
              <OutlookExportTab data={filteredData} allData={enrichedData} ano={ano} gestorFilter={gestorFilter} userName={user?.name || ''} />
            </TabsContent>
          </Tabs>

          {/* LEGEND */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
            <span className="font-medium">Legenda:</span>
            {Object.entries(S_DISPLAY).map(([k,v]) => (
              <div key={k} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-sm ${v.bg}`} /><span>{v.label}</span></div>
            ))}
          </div>
        </>
      )}
    </div>
    </DashboardLayout>
  );
}

// ─── CALENDAR TAB ───
function CalendarTab({ data, pinnedData, months, statusFilter, ano, TM, TD, calRef, scrollToToday, pinnedEmployees, togglePin }: {
  data: (Employee & EmpStats)[]; pinnedData: (Employee & EmpStats)[]; months: number[]; statusFilter: string; ano: number; TM: number; TD: number;
  calRef: React.RefObject<HTMLDivElement | null>; scrollToToday: () => void;
  pinnedEmployees: Set<string>; togglePin: (num: string) => void;
}) {
  const byStore = useMemo(() => {
    const map: Record<string,(Employee & EmpStats)[]> = {};
    const order: string[] = [];
    data.forEach(e => {
      if (!map[e.store]) { map[e.store]=[]; order.push(e.store); }
      map[e.store].push(e);
    });
    return { map, order: order.sort((a,b) => a.localeCompare(b,'pt')) };
  }, [data]);

  if (!data.length && !pinnedData.length) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum colaborador encontrado com os filtros actuais.</CardContent></Card>
  );

  const isCurrentYear = ano === new Date().getFullYear();

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Calendário {ano}</CardTitle>
        {isCurrentYear && <Button variant="outline" size="sm" onClick={scrollToToday}><Crosshair className="h-3.5 w-3.5 mr-1" /> Hoje</Button>}
      </CardHeader>
      <CardContent className="p-0">
        <div ref={calRef as any} className="overflow-auto max-h-[65vh]">
          <table className="border-collapse text-[11px]" style={{minWidth:'100%'}}>
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-800 text-white text-left px-2 py-1 font-semibold" style={{minWidth:140,position:'sticky',left:0}}>Colaborador</th>
                <th className="sticky z-30 bg-slate-800 text-white text-center px-1 py-1 font-semibold" style={{minWidth:80,position:'sticky',left:140}}>Loja</th>
                {months.map(m => (
                  <th key={m} colSpan={DAYS[m]} className={`text-center py-1 font-bold text-xs ${m===TM && isCurrentYear ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {MONTHS_FULL[m-1].toUpperCase()}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50" style={{minWidth:140,position:'sticky',left:0}}></th>
                <th className="sticky z-30 bg-slate-50" style={{minWidth:80,position:'sticky',left:140}}></th>
                {months.map(m =>
                  Array.from({length:DAYS[m]},(_,d)=>d+1).map(d => (
                    <th key={`${m}-${d}`} className={`text-center px-0 py-0.5 text-[9px] font-normal text-slate-400 ${d===1?'border-l border-slate-300':''} ${m===TM&&d===TD&&isCurrentYear?'bg-blue-500 text-white rounded-sm font-bold':''}`} style={{minWidth:20}}>
                      {d}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {/* PINNED EMPLOYEES SECTION */}
              {pinnedData.length > 0 && (
                <>
                  <tr style={{background:'#b45309'}}>
                    <td className="sticky z-20 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 whitespace-nowrap" style={{position:'sticky',left:0,background:'linear-gradient(to right, #b45309, #d97706)',minWidth:140,zIndex:20}}>
                      <span className="flex items-center gap-1.5"><Star className="h-3 w-3" /> Em Destaque ({pinnedData.length})</span>
                    </td>
                    <td className="sticky z-20" style={{position:'sticky',left:140,background:'#d97706',minWidth:80,zIndex:20}}></td>
                    {months.map(m => Array.from({length:DAYS[m]},(_,d)=>d+1).map(d => <td key={`${m}-${d}`} style={{background:'#d97706',minWidth:20}}></td>))}
                  </tr>
                  {pinnedData.sort((a,b)=>a.name.localeCompare(b.name,'pt')).map((emp,ri) => (
                    <tr key={`pin-${emp.num}-${ri}`} className="bg-amber-950/30">
                      <td className="sticky z-10 px-1 py-0.5 font-medium text-amber-200 truncate border-l-[3px] border-amber-500" style={{minWidth:140,maxWidth:140,background:'#1c1207',position:'sticky',left:0}} title={emp.name}>
                        <span className="flex items-center gap-1">
                          <button onClick={() => togglePin(emp.num)} className="shrink-0 p-0.5 rounded text-amber-400 hover:text-amber-300 bg-amber-800/50" title="Desafixar">
                            <Pin className="h-3.5 w-3.5 fill-current" />
                          </button>
                          <span className="truncate">{shortName(emp.name)}</span>
                        </span>
                      </td>
                      <td className="sticky z-10 text-center text-[10px] text-amber-300/70 truncate" style={{minWidth:80,maxWidth:80,background:'#1c1207',position:'sticky',left:140,zIndex:10}} title={emp.store}>
                        {emp.store.length > 10 ? emp.store.substring(0,10)+'…' : emp.store}
                      </td>
                      {months.map(m =>
                        Array.from({length:DAYS[m]},(_,d)=>d+1).map(d => {
                          const dayKey = `${m}-${d}`;
                          const status = emp.days[dayKey];
                          const isToday = m===TM && d===TD && isCurrentYear;
                          const show = statusFilter === 'all' || status === statusFilter;
                          return (
                            <td key={dayKey} className={`text-center text-[9px] py-0.5 ${d===1?'border-l border-amber-900/30':''} ${status && show ? S_CLASS[status] : ''} ${isToday?'ring-1 ring-sky-500 ring-inset':''}`} style={{minWidth:20}}>
                              {status && show ? S_LABEL[status] : ''}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </>
              )}

              {/* STORE GROUPS */}
              {byStore.order.map(store => (
                <React.Fragment key={store}>
                  <tr style={{background:'#334155'}}>
                    <td className="sticky z-20 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 whitespace-nowrap" style={{position:'sticky',left:0,background:'#334155',minWidth:140,zIndex:20}}>
                      {store} <span className="font-normal opacity-70 ml-1">({byStore.map[store].length})</span>
                    </td>
                    <td className="sticky z-20" style={{position:'sticky',left:140,background:'#334155',minWidth:80,zIndex:20}}></td>
                    {months.map(m => Array.from({length:DAYS[m]},(_,d)=>d+1).map(d => <td key={`${m}-${d}`} style={{background:'#334155',minWidth:20}}></td>))}
                  </tr>
                  {byStore.map[store].sort((a,b)=>a.name.localeCompare(b.name,'pt')).map((emp,ri) => (
                    <tr key={`${emp.num}-${ri}`} className={ri%2===0?'bg-white':'bg-slate-50/50'}>
                      <td className="sticky z-10 px-1 py-0.5 font-medium text-slate-700 truncate" style={{minWidth:140,maxWidth:140,position:'sticky',left:0,background:ri%2===0?'#ffffff':'#f8fafc',zIndex:10}} title={emp.name}>
                        <span className="flex items-center gap-1">
                          <button onClick={() => togglePin(emp.num)} className={`shrink-0 p-0.5 rounded ${pinnedEmployees.has(emp.num) ? 'text-amber-500 bg-amber-100' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`} title={pinnedEmployees.has(emp.num) ? 'Desafixar' : 'Fixar no topo'}>
                            <Pin className={`h-3.5 w-3.5 ${pinnedEmployees.has(emp.num) ? 'fill-current' : ''}`} />
                          </button>
                          <span className="truncate">{shortName(emp.name)}</span>
                        </span>
                      </td>
                      <td className="sticky z-10 text-center text-[10px] text-slate-400 truncate" style={{minWidth:80,maxWidth:80,position:'sticky',left:140,background:ri%2===0?'#ffffff':'#f8fafc',zIndex:10}} title={emp.store}>
                        {emp.store.length > 10 ? emp.store.substring(0,10)+'…' : emp.store}
                      </td>
                      {months.map(m =>
                        Array.from({length:DAYS[m]},(_,d)=>d+1).map(d => {
                          const dayKey = `${m}-${d}`;
                          const status = emp.days[dayKey];
                          const isToday = m===TM && d===TD && isCurrentYear;
                          const show = statusFilter === 'all' || status === statusFilter;
                          return (
                            <td key={dayKey} className={`text-center text-[9px] py-0.5 ${d===1?'border-l border-slate-200':''} ${status && show ? S_CLASS[status] : ''} ${isToday?'ring-1 ring-sky-500 ring-inset':''}`} style={{minWidth:20}}>
                              {status && show ? S_LABEL[status] : ''}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── ANALYSIS TAB ───
// Regras do Procedimento Interno N.º 8 para sistema de cores semáforo
const REGRA_DIAS_TOTAL = 22; // Meta: 22 dias úteis por ano
const REGRA_JAN_MAI_MIN = 5; // Mínimo 5 dias em Jan-Mai
const REGRA_JUN_SET_MAX = 10; // Máximo 10 dias em Jun-Set
const REGRA_DEZ_MAX = 3; // Mínimo possível em Dezembro

// Função de cor semáforo
function semaforo(value: number, greenMin: number, yellowMin: number): 'green'|'yellow'|'red' {
  if (value >= greenMin) return 'green';
  if (value >= yellowMin) return 'yellow';
  return 'red';
}
function semaforoMax(value: number, greenMax: number, yellowMax: number): 'green'|'yellow'|'red' {
  if (value <= greenMax) return 'green';
  if (value <= yellowMax) return 'yellow';
  return 'red';
}
function semaforoCls(cor: 'green'|'yellow'|'red'): string {
  if (cor === 'green') return 'text-green-700 bg-green-100';
  if (cor === 'yellow') return 'text-amber-700 bg-amber-100';
  return 'text-red-700 bg-red-100';
}
function semaforoBorder(cor: 'green'|'yellow'|'red'): string {
  if (cor === 'green') return 'border-green-500';
  if (cor === 'yellow') return 'border-amber-500';
  return 'border-red-500';
}
function semaforoBg(cor: 'green'|'yellow'|'red'): string {
  if (cor === 'green') return '#16a34a';
  if (cor === 'yellow') return '#d97706';
  return '#dc2626';
}
function semaforoDot(cor: 'green'|'yellow'|'red'): string {
  if (cor === 'green') return 'bg-green-500';
  if (cor === 'yellow') return 'bg-amber-500';
  return 'bg-red-500';
}

// Análise por período de cada colaborador
function analisePeriodos(emp: Employee & EmpStats) {
  let janMai = 0, junSet = 0, outNov = 0, dez = 0;
  Object.entries(emp.days).forEach(([key, status]) => {
    if (status !== 'approved' && status !== 'rejected') return; // Conta TODOS os dias registados (aprovados + por aprovar)
    const m = parseInt(key.split('-')[0]);
    if (m >= 1 && m <= 5) janMai++;
    else if (m >= 6 && m <= 9) junSet++;
    else if (m >= 10 && m <= 11) outNov++;
    else if (m === 12) dez++;
  });
  return {
    janMai, junSet, outNov, dez,
    corJanMai: semaforo(janMai, REGRA_JAN_MAI_MIN, 3),
    corJunSet: semaforoMax(junSet, REGRA_JUN_SET_MAX, 12),
    corDez: semaforoMax(dez, REGRA_DEZ_MAX, 5),
    corTotal: semaforo(emp.approved, REGRA_DIAS_TOTAL, 15),
  };
}

function AnalysisTab({ data, allData, ano, TM }: { data: (Employee & EmpStats)[]; allData: (Employee & EmpStats)[]; ano: number; TM: number }) {
  const total = data.length;
  const totApr = data.reduce((a,e)=>a+e.approved,0);
  const totRej = data.reduce((a,e)=>a+e.rejected,0);
  const totAbs = data.reduce((a,e)=>a+e.absent,0);
  const semFerias = data.filter(e=>e.total===0).length;
  const soRej = data.filter(e=>e.total>0&&e.approved===0).length;
  const pctApr = (totApr+totRej) ? Math.round(totApr/(totApr+totRej)*100) : 0;
  const mediaAprov = total > 0 ? Math.round(totApr / total * 10) / 10 : 0;
  const mediaRej = total > 0 ? Math.round(totRej / total * 10) / 10 : 0;

  // Conformidade com procedimento
  const com22dias = data.filter(e => e.approved >= 22).length;
  const pctCom22 = total > 0 ? Math.round(com22dias / total * 100) : 0;
  const corConformidade = semaforo(pctCom22, 80, 50);

  // Monthly data
  const monthlyData = useMemo(() => {
    const m: Record<number,{approved:number;rejected:number;absent:number;empCount:number}> = {};
    for (let i=1;i<=12;i++) m[i]={approved:0,rejected:0,absent:0,empCount:0};
    data.forEach(e => {
      const monthsWithDays = new Set<number>();
      Object.entries(e.days).forEach(([key,status]) => {
        const mi = parseInt(key.split('-')[0]);
        if (status==='approved') { m[mi].approved++; monthsWithDays.add(mi); }
        else if (status==='rejected') { m[mi].rejected++; monthsWithDays.add(mi); }
        else if (status==='absent') m[mi].absent++;
      });
      monthsWithDays.forEach(mi => m[mi].empCount++);
    });
    return m;
  }, [data]);

  // Peak months (top 3)
  const peakMonths = useMemo(() => {
    return Object.entries(monthlyData)
      .map(([m,v]) => ({month:parseInt(m), total:v.approved+v.rejected, approved:v.approved, rejected:v.rejected, empCount:v.empCount}))
      .sort((a,b) => b.total - a.total)
      .slice(0,3);
  }, [monthlyData]);

  // Cobertura por loja/mês — alertas de sobreposição
  const coberturaAlertas = useMemo(() => {
    const lojaMonth: Record<string, Record<number, number>> = {};
    data.forEach(e => {
      if (!lojaMonth[e.store]) { lojaMonth[e.store] = {}; for(let m=1;m<=12;m++) lojaMonth[e.store][m]=0; }
      Object.entries(e.days).forEach(([key,status]) => {
        if (status === 'approved') {
          const mi = parseInt(key.split('-')[0]);
          lojaMonth[e.store][mi]++;
        }
      });
    });
    // Contar colaboradores por loja
    const lojaCount: Record<string,number> = {};
    data.forEach(e => { lojaCount[e.store] = (lojaCount[e.store]||0)+1; });
    // Alertas: lojas com >50% dos colaboradores de férias num mês
    const alertas: {store:string;month:number;days:number;total:number;pct:number}[] = [];
    Object.entries(lojaMonth).forEach(([store,months]) => {
      const tc = lojaCount[store] || 1;
      Object.entries(months).forEach(([m,days]) => {
        const mi = parseInt(m);
        const daysInMonth = DAYS[mi] || 30;
        // Média de dias de férias por colaborador neste mês
        const avgDaysPerEmp = days / tc;
        // Se média > 5 dias e loja tem poucos colaboradores, é alerta
        if (avgDaysPerEmp >= 5 && tc <= 3 && days >= 10) {
          alertas.push({store, month:mi, days, total:tc, pct: Math.round(avgDaysPerEmp/daysInMonth*100)});
        } else if (days >= 15 && tc >= 2) {
          alertas.push({store, month:mi, days, total:tc, pct: Math.round(days/(tc*daysInMonth)*100)});
        }
      });
    });
    return alertas.sort((a,b) => b.days - a.days).slice(0,15);
  }, [data]);

  // Situations to follow
  const situacoes = useMemo(() => {
    return data
      .filter(e => e.total===0 || (e.rejected>0&&e.approved===0) || e.absent>3)
      .sort((a,b) => { if (a.total===0&&b.total!==0) return -1; if (b.total===0&&a.total!==0) return 1; return b.rejected-a.rejected; })
      .slice(0,25);
  }, [data]);

  // Per gestor
  const gestorResumo = useMemo(() => {
    const map: Record<string,{total:number;approved:number;rejected:number;absent:number;sem:number;lojas:Set<string>}> = {};
    data.forEach(e => {
      const g = e.gestor || '—';
      if (!map[g]) map[g]={total:0,approved:0,rejected:0,absent:0,sem:0,lojas:new Set()};
      map[g].total++;
      map[g].approved += e.approved;
      map[g].rejected += e.rejected;
      map[g].absent += e.absent;
      if (e.total===0) map[g].sem++;
      map[g].lojas.add(e.store);
    });
    return Object.entries(map)
      .map(([g,s]) => ({gestor:g, ...s, lojas: s.lojas.size, pct: (s.approved+s.rejected) ? Math.round(s.approved/(s.approved+s.rejected)*100) : 0}))
      .sort((a,b) => a.gestor.localeCompare(b.gestor,'pt'));
  }, [data]);

  // Per store
  const lojaResumo = useMemo(() => {
    const map: Record<string,{total:number;approved:number;rejected:number;absent:number;sem:number}> = {};
    data.forEach(e => {
      if (!map[e.store]) map[e.store]={total:0,approved:0,rejected:0,absent:0,sem:0};
      map[e.store].total++;
      map[e.store].approved += e.approved;
      map[e.store].rejected += e.rejected;
      map[e.store].absent += e.absent;
      if (e.total===0) map[e.store].sem++;
    });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b,'pt'));
  }, [data]);

  // Top colaboradores com mais dias aprovados
  const topColabs = useMemo(() => {
    return [...data].sort((a,b) => b.approved - a.approved).slice(0,10);
  }, [data]);

  // Colaboradores com menos dias aprovados (que têm férias marcadas)
  const bottomColabs = useMemo(() => {
    return data.filter(e => e.total > 0).sort((a,b) => a.approved - b.approved).slice(0,10);
  }, [data]);

  // ─── DISTRIBUIÇÃO POR PERÍODOS (tabela tipo Excel do Marco) ───
  const [distLojaFilter, setDistLojaFilter] = useState<string>('all');
  const distStores = useMemo(() => {
    const s = new Set(data.map(e => e.store));
    return [...s].sort((a,b) => a.localeCompare(b,'pt'));
  }, [data]);

  const distData = useMemo(() => {
    const filtered = distLojaFilter === 'all' ? data : data.filter(e => e.store === distLojaFilter);
    return filtered.map(e => {
      const p = analisePeriodos(e);
      const totalDias = p.janMai + p.junSet + p.outNov + p.dez;
      const pct1 = totalDias > 0 ? Math.round(p.janMai / totalDias * 100) : 0;
      const pct2 = totalDias > 0 ? Math.round(p.junSet / totalDias * 100) : 0;
      const pct3 = totalDias > 0 ? Math.round(p.outNov / totalDias * 100) : 0;
      const pct4 = totalDias > 0 ? Math.round(p.dez / totalDias * 100) : 0;
      // Cores baseadas em DIAS ABSOLUTOS vs meta do Procedimento N.º 8:
      // P1 (Jan-Mai): mín 5 dias → verde se ≥5d, amarelo se 3-4d, vermelho se <3d
      // P2 (Jun-Set): máx 10 dias → verde se ≤10d, amarelo se 11-12d, vermelho se >12d
      // P3 (Out-Nov): livre, sem alerta
      // P4 (Dez): máx 3 dias → verde se ≤3d, amarelo se 4-5d, vermelho se >5d
      const cor1 = p.janMai >= 5 ? 'green' as const : p.janMai >= 3 ? 'yellow' as const : 'red' as const;
      const cor2 = p.junSet <= 10 ? 'green' as const : p.junSet <= 12 ? 'yellow' as const : 'red' as const;
      const cor3 = 'green' as const; // livre
      const cor4 = p.dez <= 3 ? 'green' as const : p.dez <= 5 ? 'yellow' as const : 'red' as const;
      // Dias que deveria ter por período (baseado em proporção de 22 dias úteis)
      // Regra: Jan-Mai mín 5d, Jun-Set máx 10d, Out-Nov livre, Dez mín possível (máx 3d)
      const metaJanMai = REGRA_JAN_MAI_MIN; // mínimo 5 dias
      const metaJunSet = REGRA_JUN_SET_MAX; // máximo 10 dias
      const metaDez = REGRA_DEZ_MAX; // máximo 3 dias
      const metaOutNov = REGRA_DIAS_TOTAL - metaJanMai - metaJunSet - metaDez; // restante = 4 dias
      return { ...e, gestor: e.gestor, totalDias, pct1, pct2, pct3, pct4, cor1, cor2, cor3, cor4, diasJanMai: p.janMai, diasJunSet: p.junSet, diasOutNov: p.outNov, diasDez: p.dez, metaJanMai, metaJunSet, metaOutNov, metaDez };
    }).sort((a,b) => a.store.localeCompare(b.store,'pt') || a.name.localeCompare(b.name,'pt'));
  }, [data, distLojaFilter]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Users className="h-5 w-5 text-blue-500" />} label="Colaboradores" value={total} />
        <KpiCard icon={<AlertTriangle className={`h-5 w-5 ${semFerias>0?'text-red-500':'text-green-500'}`} />} label="Sem férias" value={semFerias} danger={semFerias>0} ok={semFerias===0} />
        <KpiCard icon={<CheckCircle2 className={`h-5 w-5 ${mediaAprov>=22?'text-green-500':mediaAprov>=15?'text-amber-500':'text-red-500'}`} />} label="Média dias/colab" value={mediaAprov} ok={mediaAprov>=22} warn={mediaAprov>=15&&mediaAprov<22} danger={mediaAprov<15} />
        <KpiCard icon={<BarChart3 className={`h-5 w-5 ${pctApr>=90?'text-green-500':pctApr>=70?'text-amber-500':'text-red-500'}`} />} label="Taxa aprovação" value={`${pctApr}%`} ok={pctApr>=90} warn={pctApr>=70&&pctApr<90} danger={pctApr<70} />
        <KpiCard icon={<CheckCircle2 className={`h-5 w-5 ${corConformidade==='green'?'text-green-500':corConformidade==='yellow'?'text-amber-500':'text-red-500'}`} />} label="Com 22 dias" value={`${pctCom22}%`} ok={corConformidade==='green'} warn={corConformidade==='yellow'} danger={corConformidade==='red'} />
        <KpiCard icon={<XCircle className={`h-5 w-5 ${semFerias>0||totRej>10?'text-red-500':totRej>0?'text-amber-500':'text-green-500'}`} />} label="A corrigir" value={semFerias + soRej} danger={semFerias>0||soRej>0} ok={semFerias===0&&soRej===0} />
      </div>

      {/* Conformidade por Período - Regras do Procedimento */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" /> Conformidade por Período (Procedimento N.º 8)
          </CardTitle>
          <p className="text-xs text-muted-foreground">Cores baseadas nas regras: Jan-Mai mín. 5 dias | Jun-15Set máx. 10 dias | Dez mínimo possível | Total 22 dias</p>
        </CardHeader>
        <CardContent>
          {(() => {
            const periodoStats = data.map(e => ({ ...e, periodos: analisePeriodos(e) }));
            const okJanMai = periodoStats.filter(e => e.periodos.corJanMai === 'green').length;
            const okJunSet = periodoStats.filter(e => e.periodos.corJunSet === 'green').length;
            const okDez = periodoStats.filter(e => e.periodos.corDez === 'green').length;
            const okTotal = periodoStats.filter(e => e.periodos.corTotal === 'green').length;
            const pJM = total > 0 ? Math.round(okJanMai/total*100) : 0;
            const pJS = total > 0 ? Math.round(okJunSet/total*100) : 0;
            const pD = total > 0 ? Math.round(okDez/total*100) : 0;
            const pT = total > 0 ? Math.round(okTotal/total*100) : 0;
            const periodos = [
              { label: 'Jan-Mai (≥ 5 dias)', pct: pJM, cor: semaforo(pJM, 80, 50) },
              { label: 'Jun-Set (≤ 10 dias)', pct: pJS, cor: semaforo(pJS, 80, 50) },
              { label: 'Dezembro (mínimo)', pct: pD, cor: semaforo(pD, 80, 50) },
              { label: 'Total (≥ 22 dias)', pct: pT, cor: semaforo(pT, 80, 50) },
            ];
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {periodos.map(p => (
                  <div key={p.label} className={`rounded-lg border-2 p-4 text-center ${semaforoBorder(p.cor)}`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${semaforoDot(p.cor)}`} />
                      <span className="text-xs font-medium text-muted-foreground">{p.label}</span>
                    </div>
                    <div className={`text-3xl font-bold ${p.cor==='green'?'text-green-700':p.cor==='yellow'?'text-amber-700':'text-red-700'}`}>{p.pct}%</div>
                    <div className="text-[10px] text-muted-foreground mt-1">em conformidade</div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${p.pct}%`, background: semaforoBg(p.cor)}} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Monthly chart + Peak months side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição Mensal</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-[180px]">
              {Object.entries(monthlyData).map(([m,vals]) => {
                const max = Math.max(...Object.values(monthlyData).map(v=>v.approved+v.rejected),1);
                const hA = (vals.approved/max)*160;
                const hR = (vals.rejected/max)*160;
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="text-[9px] text-muted-foreground">{vals.approved+vals.rejected||''}</div>
                    <div className="w-full flex flex-col justify-end" style={{height:160}}>
                      {vals.rejected>0 && <div className="bg-red-400 rounded-t-sm mx-0.5" style={{height:hR}} />}
                      {vals.approved>0 && <div className={`bg-green-500 mx-0.5 ${vals.rejected===0?'rounded-t-sm':''}`} style={{height:hA}} />}
                    </div>
                    <div className={`text-[10px] font-medium ${parseInt(m)===TM?'text-blue-600 font-bold':'text-muted-foreground'}`}>{MONTHS_PT[parseInt(m)-1]}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500" /> Aprovados</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-400" /> Não aprovados</div>
            </div>
          </CardContent>
        </Card>

        {/* Peak months + quick stats */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sun className="h-4 w-4 text-amber-500" /> Meses Críticos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {peakMonths.map((pm,i) => (
              <div key={pm.month} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i===0?'bg-red-100 text-red-700':i===1?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>
                  {i+1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{MONTHS_FULL[pm.month-1]}</div>
                  <div className="text-[10px] text-muted-foreground">{pm.total} dias ({pm.empCount} colab.)</div>
                </div>
                <div className="text-right">
                  <span className="text-green-600 text-xs font-medium">{pm.approved}</span>
                  {pm.rejected > 0 && <span className="text-red-500 text-xs ml-1">+{pm.rejected}</span>}
                </div>
              </div>
            ))}
            <div className="border-t pt-3 mt-3 space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Média dias aprovados/colab</span><span className="font-medium">{mediaAprov}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Média dias n.aprovados/colab</span><span className="font-medium">{mediaRej}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total faltas</span><span className="font-medium">{totAbs}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Só c/ não aprovados</span><span className="font-medium text-amber-600">{soRej}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per Gestor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-indigo-500" /> Resumo por Gestor</CardTitle>
          <p className="text-xs text-muted-foreground">Média dias: 🟢 ≥22 | 🟡 15-21 | 🔴 &lt;15 — Taxa: 🟢 ≥90% | 🟡 70-89% | 🔴 &lt;70%</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gestor</TableHead>
                  <TableHead className="text-center">Lojas</TableHead>
                  <TableHead className="text-center">Colab.</TableHead>
                  <TableHead className="text-center">Média Dias</TableHead>
                  <TableHead className="text-center">Com 22d</TableHead>
                  <TableHead className="text-center">Sem férias</TableHead>
                  <TableHead>Taxa Aprov.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gestorResumo.map((g) => {
                  const media = g.total > 0 ? Math.round(g.approved / g.total * 10) / 10 : 0;
                  const corMedia = semaforo(media, 22, 15);
                  const corTaxa = semaforo(g.pct, 90, 70);
                  // Contar quantos têm 22 dias nesta zona
                  const gestorEmps = data.filter(e => e.gestor === g.gestor);
                  const com22 = gestorEmps.filter(e => e.approved >= 22).length;
                  const pctCom22g = gestorEmps.length > 0 ? Math.round(com22/gestorEmps.length*100) : 0;
                  const corCom22 = semaforo(pctCom22g, 80, 50);
                  return (
                    <TableRow key={g.gestor}>
                      <TableCell className="font-medium text-sm">{g.gestor}</TableCell>
                      <TableCell className="text-center">{g.lojas}</TableCell>
                      <TableCell className="text-center">{g.total}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(corMedia)}`}>{media}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(corCom22)}`}>{pctCom22g}%</span>
                      </TableCell>
                      <TableCell className="text-center">{g.sem>0 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-red-700 bg-red-100">{g.sem}</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-green-700 bg-green-100">0</span>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 min-w-[100px]">
                          <div className={`w-2.5 h-2.5 rounded-full ${semaforoDot(corTaxa)}`} />
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${g.pct}%`,background:semaforoBg(corTaxa)}} />
                          </div>
                          <span className={`text-[10px] font-semibold w-9 ${corTaxa==='green'?'text-green-700':corTaxa==='yellow'?'text-amber-700':'text-red-700'}`}>{g.pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cobertura Alertas */}
      {coberturaAlertas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Alertas de Cobertura — Lojas com Muitas Férias Simultâneas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-center">Mês</TableHead>
                    <TableHead className="text-center">Dias Férias</TableHead>
                    <TableHead className="text-center">Colaboradores</TableHead>
                    <TableHead>Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coberturaAlertas.map((a,i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{a.store}</TableCell>
                      <TableCell className="text-center text-sm">{MONTHS_FULL[a.month-1]}</TableCell>
                      <TableCell className="text-center"><Badge variant="destructive" className="text-[10px]">{a.days} dias</Badge></TableCell>
                      <TableCell className="text-center text-sm">{a.total}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-red-500" style={{width:`${Math.min(a.pct,100)}%`}} />
                          </div>
                          <span className="text-[10px] text-red-600 font-medium w-8">{a.pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top / Bottom colaboradores com semáforo por período */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><ChevronUp className="h-4 w-4 text-green-500" /> Top 10 — Mais Dias Aprovados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Jan-Mai</TableHead>
                    <TableHead className="text-center">Jun-Set</TableHead>
                    <TableHead className="text-center">Dez</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topColabs.map((e,i) => {
                    const p = analisePeriodos(e);
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{i+1}</TableCell>
                        <TableCell className="font-medium text-sm">{shortName(e.name)}</TableCell>
                        <TableCell className="text-xs">{e.store}</TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corTotal)}`}>{e.approved}</span></TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corJanMai)}`}>{p.janMai}</span></TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corJunSet)}`}>{p.junSet}</span></TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corDez)}`}>{p.dez}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><ChevronDown className="h-4 w-4 text-red-500" /> Top 10 — Menos Dias Aprovados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Jan-Mai</TableHead>
                    <TableHead className="text-center">Jun-Set</TableHead>
                    <TableHead className="text-center">Dez</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bottomColabs.map((e,i) => {
                    const p = analisePeriodos(e);
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{i+1}</TableCell>
                        <TableCell className="font-medium text-sm">{shortName(e.name)}</TableCell>
                        <TableCell className="text-xs">{e.store}</TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corTotal)}`}>{e.approved}</span></TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corJanMai)}`}>{p.janMai}</span></TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corJunSet)}`}>{p.junSet}</span></TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corDez)}`}>{p.dez}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Situations */}
      {situacoes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Situações a Acompanhar ({situacoes.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">Progresso: % dos 22 dias obrigatórios para subsídio de férias</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Jan-Mai</TableHead>
                    <TableHead className="text-center">Jun-Set</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Progresso (22d)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {situacoes.map((e,i) => {
                    const pct = Math.min(Math.round(e.approved/22*100),100);
                    const corPct = semaforo(pct, 80, 40);
                    const p = analisePeriodos(e);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{shortName(e.name)}</TableCell>
                        <TableCell className="text-xs">{e.store}</TableCell>
                        <TableCell className="text-xs">{e.gestor}</TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corTotal)}`}>{e.approved}</span></TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corJanMai)}`}>{p.janMai}</span></TableCell>
                        <TableCell className="text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${semaforoCls(p.corJunSet)}`}>{p.junSet}</span></TableCell>
                        <TableCell>
                          {e.total===0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-red-700 bg-red-100">Sem férias</span>}
                          {e.total>0&&e.approved===0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 bg-amber-100">Tudo por aprovar</span>}
                          {e.absent>3 && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-700 bg-slate-100 ml-1">{e.absent} faltas</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 min-w-[100px]">
                            <div className={`w-2.5 h-2.5 rounded-full ${semaforoDot(corPct)}`} />
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${pct}%`,background:semaforoBg(corPct)}} />
                            </div>
                            <span className={`text-[10px] font-semibold w-7 ${corPct==='green'?'text-green-700':corPct==='yellow'?'text-amber-700':'text-red-700'}`}>{pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── DISTRIBUIÇÃO POR PERÍODOS ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><PieChart className="h-4 w-4 text-purple-500" /> Distribuição de Férias por Períodos</CardTitle>
          <p className="text-xs text-muted-foreground">% de férias (registadas) por período — Cores: 🟢 conforme | 🟡 atenção | 🔴 excede regulamento</p>
          <div className="flex items-center gap-2 mt-2">
            <Select value={distLojaFilter} onValueChange={setDistLojaFilter}>
              <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Filtrar por loja" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas ({distStores.length})</SelectItem>
                {distStores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">{distData.length} colab.</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-10 text-xs">Gestor</TableHead>
                  <TableHead className="sticky left-[100px] bg-muted/50 z-10 text-xs">Centro</TableHead>
                  <TableHead className="text-xs text-center">N.º</TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-center text-xs">1.º Período<br/><span className="text-[9px] font-normal">Jan-Mai</span></TableHead>
                  <TableHead className="text-center text-xs">2.º Período<br/><span className="text-[9px] font-normal">Jun-Set</span></TableHead>
                  <TableHead className="text-center text-xs">3.º Período<br/><span className="text-[9px] font-normal">Out-Nov</span></TableHead>
                  <TableHead className="text-center text-xs">4.º Período<br/><span className="text-[9px] font-normal">Dez</span></TableHead>
                  <TableHead className="text-center text-xs">Total<br/><span className="text-[9px] font-normal">dias</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distData.map((e, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="sticky left-0 bg-background z-10 text-xs text-muted-foreground">{e.gestor.split(' ')[0]}<br/><span className="text-[9px]">{e.gestor.split(' ').slice(1).join(' ')}</span></TableCell>
                    <TableCell className="sticky left-[100px] bg-background z-10 text-xs font-medium">{e.store}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{e.num}</TableCell>
                    <TableCell className="text-xs font-medium">{shortName(e.name)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${e.cor1==='green'?'bg-green-100 text-green-700':e.cor1==='yellow'?'bg-amber-400 text-amber-900':'bg-red-600 text-white'}`}>{e.pct1}%</span>
                        <span className="text-[9px] text-muted-foreground">{e.diasJanMai}/{e.metaJanMai}d</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${e.cor2==='green'?'bg-green-100 text-green-700':e.cor2==='yellow'?'bg-amber-400 text-amber-900':'bg-red-600 text-white'}`}>{e.pct2}%</span>
                        <span className="text-[9px] text-muted-foreground">{e.diasJunSet}/{e.metaJunSet}d</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${e.cor3==='green'?'bg-green-100 text-green-700':e.cor3==='yellow'?'bg-amber-400 text-amber-900':'bg-red-600 text-white'}`}>{e.pct3}%</span>
                        <span className="text-[9px] text-muted-foreground">{e.diasOutNov}/{e.metaOutNov}d</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${e.cor4==='green'?'bg-green-100 text-green-700':e.cor4==='yellow'?'bg-amber-400 text-amber-900':'bg-red-600 text-white'}`}>{e.pct4}%</span>
                        <span className="text-[9px] text-muted-foreground">{e.diasDez}/{e.metaDez}d</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${e.totalDias >= 22 ? 'bg-green-100 text-green-700' : e.totalDias >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{e.totalDias}</span>
                        <span className="text-[9px] text-muted-foreground">/{REGRA_DIAS_TOTAL}d</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Per store */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Resumo por Loja ({lojaResumo.length})</CardTitle>
          <p className="text-xs text-muted-foreground">Borda: 🟢 conforme | 🟡 atenção | 🔴 crítico (sem férias ou taxa &lt;70%)</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lojaResumo.map(([loja,s]) => {
              const pct = (s.approved+s.rejected) ? Math.round(s.approved/(s.approved+s.rejected)*100) : 0;
              const media = s.total > 0 ? Math.round(s.approved / s.total * 10) / 10 : 0;
              const corTaxa = semaforo(pct, 90, 70);
              const corMedia = semaforo(media, 22, 15);
              const corGeral = s.sem > 0 ? 'red' as const : corTaxa === 'red' || corMedia === 'red' ? 'red' as const : corTaxa === 'yellow' || corMedia === 'yellow' ? 'yellow' as const : 'green' as const;
              return (
                <div key={loja} className={`border rounded-lg p-3 border-l-4 ${semaforoBorder(corGeral)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${semaforoDot(corGeral)}`} />
                      <span className="font-medium text-sm truncate">{loja}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{s.total} colab.</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs mb-2">
                    <span className={`px-1.5 py-0.5 rounded ${semaforoCls(corMedia)}`} title="Média dias/colab">Ø {media}d</span>
                    <span className={`px-1.5 py-0.5 rounded ${semaforoCls(corTaxa)}`} title="Taxa aprovação">{pct}%</span>
                    {s.sem>0 && <span className="px-1.5 py-0.5 rounded text-red-700 bg-red-100 font-medium">{s.sem} sem férias</span>}
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${pct}%`, background: semaforoBg(corTaxa)}} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── DISTRIBUTION TAB ───
function DistributionTab({ data, gestorFilter, ano, TM, compareAno, setCompareAno, compareData, anosDisponiveis, availableStores }: {
  data: (Employee & EmpStats)[]; gestorFilter: string; ano: number; TM: number;
  compareAno: number|null; setCompareAno: (v: number|null) => void; compareData: Employee[]|null; anosDisponiveis: number[];
  availableStores: string[];
}) {
  const [distType, setDistType] = useState<'approved'|'all'>('approved');
  const PERIODOS = [{l:'01 Jan > 31 Mai',m:[1,2,3,4,5]},{l:'01 Jun > 15 Set',m:[6,7,8,9]},{l:'16 Set > 31 Dez',m:[10,11,12]}];

  // Relatório por Loja
  const [showRelatorioLoja, setShowRelatorioLoja] = useState(false);
  const [selectedLoja, setSelectedLoja] = useState<string>('');
  const [relatorioLojaData, setRelatorioLojaData] = useState<any>(null);
  const gerarRelatorioLoja = trpc.ferias.gerarRelatorioLoja.useMutation({
    onSuccess: (result) => {
      setRelatorioLojaData(result);
      toast.success(`Relatório gerado para ${result.loja} (${result.totalColaboradores} colaboradores)`);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao gerar relatório');
    },
  });

  const exportarPDF = trpc.ferias.exportarRelatorioLojaPDF.useMutation({
    onSuccess: (result) => {
      window.open(result.url, '_blank');
      toast.success('PDF gerado com sucesso!');
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao gerar PDF');
    },
  });

  const gestorData = useMemo(() => {
    const gestores = gestorFilter !== 'all' ? [gestorFilter] : Object.keys(GESTORES).sort();
    const result: Record<string,{byM:Record<number,number>;total:number;ec:number}> = {};
    gestores.forEach(gz => {
      const gStores = GESTORES[gz]?.map(norm) || [];
      const emps = data.filter(e => gStores.includes(norm(e.store)));
      const byM: Record<number,number> = {}; let total=0;
      for (let m=1;m<=12;m++) byM[m]=0;
      emps.forEach(e => {
        Object.entries(e.days).forEach(([key,status]) => {
          const m = parseInt(key.split('-')[0]);
          const ok = distType==='approved' ? status==='approved' : (status==='approved'||status==='rejected');
          if (ok) { byM[m]++; total++; }
        });
      });
      result[gz] = {byM, total, ec: emps.length};
    });
    return result;
  }, [data, gestorFilter, distType]);

  const compareGestorData = useMemo(() => {
    if (!compareData) return null;
    const gestores = gestorFilter !== 'all' ? [gestorFilter] : Object.keys(GESTORES).sort();
    const result: Record<string,{byM:Record<number,number>;total:number}> = {};
    gestores.forEach(gz => {
      const gStores = GESTORES[gz]?.map(norm) || [];
      const emps = compareData.filter(e => gStores.includes(norm(e.store)));
      const byM: Record<number,number> = {}; let total=0;
      for (let m=1;m<=12;m++) byM[m]=0;
      emps.forEach(e => {
        Object.entries(e.days).forEach(([key,status]) => {
          const m = parseInt(key.split('-')[0]);
          const ok = distType==='approved' ? status==='approved' : (status==='approved'||status==='rejected');
          if (ok) { byM[m]++; total++; }
        });
      });
      result[gz] = {byM, total};
    });
    return result;
  }, [compareData, gestorFilter, distType]);

  const totals = useMemo(() => {
    const mt: Record<number,number> = {}; let grand=0, empc=0;
    for (let m=1;m<=12;m++) mt[m]=0;
    Object.values(gestorData).forEach(d => { for (let m=1;m<=12;m++) mt[m]+=d.byM[m]; grand+=d.total; empc+=d.ec; });
    return {mt, grand, empc};
  }, [gestorData]);

  const gestores = Object.keys(gestorData).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={distType} onValueChange={v => setDistType(v as any)}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="approved">Só aprovados</SelectItem>
            <SelectItem value="all">Aprovados + Não aprovados</SelectItem>
          </SelectContent>
        </Select>
        {anosDisponiveis.length > 0 && (
          <Select value={compareAno ? String(compareAno) : 'none'} onValueChange={v => setCompareAno(v==='none'?null:Number(v))}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Comparar com..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem comparação</SelectItem>
              {anosDisponiveis.map(a => <SelectItem key={a} value={String(a)}>Comparar com {a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        <Select value={selectedLoja} onValueChange={setSelectedLoja}>
          <SelectTrigger className="w-[200px] h-8 text-xs border-teal-300">
            <SelectValue placeholder="Selecionar loja..." />
          </SelectTrigger>
          <SelectContent>
            {availableStores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="border-teal-300 text-teal-700 hover:bg-teal-50 gap-2 h-8"
          disabled={!selectedLoja || gerarRelatorioLoja.isPending}
          onClick={() => {
            if (!selectedLoja) { toast.error('Selecione uma loja primeiro'); return; }
            setShowRelatorioLoja(true);
            setRelatorioLojaData(null);
            gerarRelatorioLoja.mutate({ ano, loja: selectedLoja });
          }}
        >
          {gerarRelatorioLoja.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          Relatório Loja
        </Button>
      </div>

      {/* MODAL RELATÓRIO POR LOJA */}
      <Dialog open={showRelatorioLoja} onOpenChange={setShowRelatorioLoja}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700">
              <Store className="h-5 w-5" />
              Relatório de Férias — {selectedLoja} ({ano})
            </DialogTitle>
            <DialogDescription>
              Análise de conformidade e sugestões de redistribuição baseadas no Procedimento Interno N.º 8
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {gerarRelatorioLoja.isPending ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
                <p className="text-sm text-muted-foreground">A analisar colaboradores da loja {selectedLoja}...</p>
                <p className="text-xs text-muted-foreground">Isto pode demorar até 30 segundos</p>
              </div>
            ) : relatorioLojaData ? (
              <RelatorioLojaContent data={relatorioLojaData} ano={ano} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
                <p className="text-sm text-muted-foreground">Erro ao gerar relatório. Tente novamente.</p>
              </div>
            )}
          </div>
          {relatorioLojaData && (
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="default" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white"
                disabled={exportarPDF.isPending}
                onClick={() => exportarPDF.mutate({ relatorio: relatorioLojaData, ano })}>
                {exportarPDF.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A gerar PDF...</>
                ) : (
                  <><FileText className="h-4 w-4 mr-1" /> Exportar PDF</>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const md = relatorioLojaData.recomendacoesIA || '';
                const blob = new Blob([md], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio-loja-${selectedLoja}-${ano}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                <Download className="h-4 w-4 mr-1" /> Exportar Markdown
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setRelatorioLojaData(null);
                gerarRelatorioLoja.mutate({ ano, loja: selectedLoja });
              }}>
                <Sparkles className="h-4 w-4 mr-1" /> Gerar Novamente
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Monthly table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição Mensal por Gestor — {ano}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-semibold min-w-[140px]">Gestor</th>
                  {MONTHS_PT.map((m,i) => <th key={i} className={`text-center px-1.5 py-2 font-medium ${i+1===TM?'bg-blue-100 text-blue-700':''}`}>{m}</th>)}
                  <th className="text-center px-2 py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {gestores.map(gz => {
                  const d = gestorData[gz];
                  const cd = compareGestorData?.[gz];
                  return (
                    <React.Fragment key={gz}>
                      <tr className="border-t">
                        <td className="px-3 py-1.5 font-medium" rowSpan={2}>{gz}</td>
                        {Array.from({length:12},(_,i)=>i+1).map(m => (
                          <td key={m} className={`text-center px-1.5 py-1.5 ${m===TM?'bg-blue-50':''}`}>
                            {d.byM[m]||''}
                            {cd && <span className="text-[9px] text-muted-foreground ml-0.5">({cd.byM[m]||0})</span>}
                          </td>
                        ))}
                        <td className="text-center px-2 py-1.5 font-semibold">{d.total}</td>
                      </tr>
                      <tr className="border-b">
                        {Array.from({length:12},(_,i)=>i+1).map(m => {
                          const p = d.total ? Math.round(d.byM[m]/d.total*100) : 0;
                          return <td key={m} className={`text-center px-1.5 py-1 text-[10px] ${p>=15?'font-semibold text-blue-600':'text-muted-foreground'}`}>{d.total?`${p}%`:''}</td>;
                        })}
                        <td className="text-center px-2 py-1 text-[10px] text-muted-foreground">100%</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
                <tr className="bg-slate-800 text-white font-semibold">
                  <td className="px-3 py-2">TOTAL DIAS</td>
                  {Array.from({length:12},(_,i)=>i+1).map(m => <td key={m} className="text-center px-1.5 py-2">{totals.mt[m]||''}</td>)}
                  <td className="text-center px-2 py-2">{totals.grand}</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="px-3 py-1.5 text-muted-foreground">Distribuição</td>
                  {Array.from({length:12},(_,i)=>i+1).map(m => {
                    const p = totals.grand ? Math.round(totals.mt[m]/totals.grand*100) : 0;
                    return <td key={m} className={`text-center px-1.5 py-1.5 text-[10px] ${p>=15?'font-semibold text-blue-600':'text-muted-foreground'}`}>{p}%</td>;
                  })}
                  <td className="text-center px-2 py-1.5 text-[10px] text-muted-foreground">100%</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-muted-foreground">Média colab.</td>
                  {Array.from({length:12},(_,i)=>i+1).map(m => {
                    const av = totals.empc ? (totals.mt[m]/totals.empc).toFixed(1) : '';
                    return <td key={m} className="text-center px-1.5 py-1.5 text-[10px] text-muted-foreground">{parseFloat(av as string)>0?av:''}</td>;
                  })}
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Period table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição por Período</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-semibold min-w-[140px]">Gestor</th>
                  {PERIODOS.map((p,i) => <th key={i} className="text-center px-2 py-2 font-medium">{p.l}</th>)}
                  <th className="text-center px-2 py-2 font-semibold">Total</th>
                  {PERIODOS.map((_,i) => <th key={`p${i}`} className="text-center px-2 py-2 font-medium">%</th>)}
                </tr>
              </thead>
              <tbody>
                {gestores.map(gz => {
                  const d = gestorData[gz];
                  const pc = PERIODOS.map(p => p.m.reduce((a,m)=>a+d.byM[m],0));
                  const pk = pc.indexOf(Math.max(...pc));
                  return (
                    <tr key={gz} className="border-t">
                      <td className="px-3 py-2 font-medium">{gz}</td>
                      {pc.map((v,i) => <td key={i} className={`text-center px-2 py-2 ${i===pk?'font-bold text-blue-600':''}`}>{v||''}</td>)}
                      <td className="text-center px-2 py-2 font-semibold">{d.total}</td>
                      {pc.map((v,i) => {
                        const pp = d.total ? Math.round(v/d.total*100) : 0;
                        return <td key={i} className={`text-center px-2 py-2 text-[10px] ${pp>=50?'font-semibold text-blue-600':'text-muted-foreground'}`}>{d.total?`${pp}%`:''}</td>;
                      })}
                    </tr>
                  );
                })}
                {(() => {
                  const pt = PERIODOS.map(p => p.m.reduce((a,m)=>a+totals.mt[m],0));
                  return (
                    <tr className="bg-slate-800 text-white font-semibold border-t">
                      <td className="px-3 py-2">TOTAL</td>
                      {pt.map((v,i) => <td key={i} className="text-center px-2 py-2">{v}</td>)}
                      <td className="text-center px-2 py-2">{totals.grand}</td>
                      {pt.map((v,i) => {
                        const pp = totals.grand ? Math.round(v/totals.grand*100) : 0;
                        return <td key={i} className="text-center px-2 py-2 text-[10px]">{pp}%</td>;
                      })}
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── RELATÓRIO LOJA CONTENT ───
function RelatorioLojaContent({ data, ano }: { data: any; ano: number }) {
  // Cores baseadas na gravidade do período
  const corCelula = (cor: string) => {
    if (cor === 'green') return 'bg-green-100 text-green-800';
    if (cor === 'yellow') return 'bg-amber-100 text-amber-800';
    return 'bg-red-500 text-white';
  };
  const corDot = (grav: string) => {
    if (grav === 'conforme') return 'bg-green-500';
    if (grav === 'aviso') return 'bg-amber-500';
    return 'bg-red-500';
  };
  const corBorder = (cor: string) => {
    if (cor === 'green') return 'border-green-300';
    if (cor === 'yellow') return 'border-amber-300';
    return 'border-red-300';
  };
  const corBg = (cor: string) => {
    if (cor === 'green') return 'bg-green-50';
    if (cor === 'yellow') return 'bg-amber-50';
    return 'bg-red-50';
  };

  return (
    <div className="space-y-5">
      {/* RESUMO KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className={`rounded-lg border p-3 text-center ${corBorder('green')} ${corBg('green')}`}>
          <div className="text-2xl font-bold text-green-700">{data.resumo.conformes}</div>
          <div className="text-xs text-green-600">Conformes</div>
        </div>
        <div className={`rounded-lg border p-3 text-center ${corBorder('yellow')} ${corBg('yellow')}`}>
          <div className="text-2xl font-bold text-amber-700">{data.resumo.comAvisos}</div>
          <div className="text-xs text-amber-600">Com Avisos</div>
        </div>
        <div className={`rounded-lg border p-3 text-center ${corBorder('red')} ${corBg('red')}`}>
          <div className="text-2xl font-bold text-red-700">{data.resumo.criticos}</div>
          <div className="text-xs text-red-600">Críticos</div>
        </div>
        <div className="rounded-lg border p-3 text-center border-red-300 bg-red-50">
          <div className="text-2xl font-bold text-red-700">{data.resumo.comExcessoP2 || 0}</div>
          <div className="text-xs text-red-600">Excesso 2.º Per.</div>
        </div>
        <div className="rounded-lg border p-3 text-center border-slate-200 bg-slate-50">
          <div className="text-2xl font-bold text-slate-700">{data.resumo.mediaDiasPedidos ?? data.resumo.mediaAprovados}</div>
          <div className="text-xs text-slate-500">Média dias/colab</div>
        </div>
      </div>

      {/* ALERTAS RÁPIDOS */}
      {(data.resumo.semFeriasPedidas > 0 || data.resumo.comExcessoP2 > 0 || data.resumo.comDeficitP1 > 0 || data.sobreposicoes.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.resumo.semFeriasPedidas > 0 && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> {data.resumo.semFeriasPedidas} sem férias pedidas
            </Badge>
          )}
          {data.resumo.comExcessoP2 > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {data.resumo.comExcessoP2} com excesso no 2.º período
            </Badge>
          )}
          {data.resumo.comDeficitP1 > 0 && (
            <Badge variant="outline" className="border-amber-300 text-amber-700 gap-1">
              <AlertTriangle className="h-3 w-3" /> {data.resumo.comDeficitP1} com déficit no 1.º período
            </Badge>
          )}
          {data.sobreposicoes.length > 0 && (
            <Badge variant="outline" className="border-amber-300 text-amber-700 gap-1">
              <Users className="h-3 w-3" /> {data.sobreposicoes.length} dias com sobreposição
            </Badge>
          )}
        </div>
      )}

      {/* TABELA DE DISTRIBUIÇÃO % POR PERÍODO */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-600" />
            Distribuição de Dias Pedidos por Período — {data.loja}
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">
            Base: todos os dias pedidos (aprovados + não aprovados). Cores indicam violação do regulamento.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-teal-700 text-white">
                  <th className="text-left px-3 py-2 font-semibold min-w-[160px]">Colaborador</th>
                  <th className="text-center px-2 py-2 font-medium">Total</th>
                  <th className="text-center px-2 py-2 font-medium">1.º Período<br/><span className="font-normal text-teal-200">Jan-Mai</span></th>
                  <th className="text-center px-2 py-2 font-medium">2.º Período<br/><span className="font-normal text-teal-200">Jun-Set</span></th>
                  <th className="text-center px-2 py-2 font-medium">3.º Período<br/><span className="font-normal text-teal-200">Out-Nov</span></th>
                  <th className="text-center px-2 py-2 font-medium">4.º Período<br/><span className="font-normal text-teal-200">Dez</span></th>
                  <th className="text-left px-2 py-2 font-medium min-w-[200px]">Problemas</th>
                </tr>
                <tr className="bg-teal-50 text-teal-700">
                  <td className="px-3 py-1 text-[10px] font-semibold">Regulamento:</td>
                  <td className="text-center px-2 py-1 text-[10px]">22 dias</td>
                  <td className="text-center px-2 py-1 text-[10px] font-semibold">Min. 5 dias</td>
                  <td className="text-center px-2 py-1 text-[10px] font-semibold">Máx. 10 dias</td>
                  <td className="text-center px-2 py-1 text-[10px]">Livre</td>
                  <td className="text-center px-2 py-1 text-[10px] font-semibold">Min. possível</td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {data.analiseColaboradores.map((c: any, i: number) => (
                  <tr key={i} className={`border-t ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${corDot(c.gravidade || c.statusGeral)}`} />
                        <span className="font-medium">{c.nome}</span>
                      </div>
                    </td>
                    <td className="text-center px-2 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${(c.totalPedidos ?? c.totalAprovados) < 22 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                        {c.totalPedidos ?? c.totalAprovados}
                      </span>
                    </td>
                    <td className={`text-center px-2 py-2 ${corCelula(c.corP1 || c.corJanMai)}`}>
                      <div className="font-bold text-sm">{c.pctP1 ?? Math.round(((c.janMai || 0) / Math.max(1, c.totalPedidos || c.totalAprovados || 1)) * 100)}%</div>
                      <div className="text-[9px] opacity-80">{c.diasP1 ?? c.janMai} dias</div>
                    </td>
                    <td className={`text-center px-2 py-2 ${corCelula(c.corP2 || c.corJunSet)}`}>
                      <div className="font-bold text-sm">{c.pctP2 ?? Math.round(((c.junSet || 0) / Math.max(1, c.totalPedidos || c.totalAprovados || 1)) * 100)}%</div>
                      <div className="text-[9px] opacity-80">{c.diasP2 ?? c.junSet} dias</div>
                    </td>
                    <td className={`text-center px-2 py-2 ${corCelula(c.corP3 || 'green')}`}>
                      <div className="font-bold text-sm">{c.pctP3 ?? Math.round(((c.outNov || 0) / Math.max(1, c.totalPedidos || c.totalAprovados || 1)) * 100)}%</div>
                      <div className="text-[9px] opacity-80">{c.diasP3 ?? c.outNov} dias</div>
                    </td>
                    <td className={`text-center px-2 py-2 ${corCelula(c.corP4 || c.corDez || 'green')}`}>
                      <div className="font-bold text-sm">{c.pctP4 ?? Math.round(((c.dez || 0) / Math.max(1, c.totalPedidos || c.totalAprovados || 1)) * 100)}%</div>
                      <div className="text-[9px] opacity-80">{c.diasP4 ?? c.dez} dias</div>
                    </td>
                    <td className="px-2 py-2">
                      {(c.problemas || []).length === 0 ? (
                        <span className="text-green-600 text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Conforme
                        </span>
                      ) : (
                        <ul className="space-y-0.5">
                          {(c.problemas || []).map((p: string, j: number) => (
                            <li key={j} className="text-[10px] text-red-700 flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legenda */}
          <div className="flex items-center gap-4 px-3 py-2 border-t text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Excede regulamento</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span> Concentração elevada</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span> Conforme</span>
          </div>
        </CardContent>
      </Card>

      {/* SOBREPOSIÇÕES */}
      {data.sobreposicoes.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Sobreposições na Loja ({data.sobreposicoes.length} dias com mais de 1 colaborador)
            </CardTitle>
            <p className="text-[10px] text-amber-600 mt-1">Regra: Máximo 1 colaborador de férias por loja em cada momento.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[200px]">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-50">
                    <th className="text-left px-3 py-2 font-semibold">Data</th>
                    <th className="text-left px-3 py-2 font-semibold">Colaboradores em Férias</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sobreposicoes.map((s: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5 font-medium">{s.data}</td>
                      <td className="px-3 py-1.5">{s.colaboradores.join(' + ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RECOMENDAÇÕES IA */}
      <Card className="border-teal-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-teal-700">
            <Sparkles className="h-4 w-4" />
            Recomendações IA — Plano de Redistribuição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{data.recomendacoesIA}</Streamdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── KPI CARD ───
function KpiCard({ icon, label, value, ok, warn, danger }: { icon: React.ReactNode; label: string; value: string|number; ok?: boolean; warn?: boolean; danger?: boolean }) {
  let cls = '';
  if (danger) cls = 'border-red-200 bg-red-50/50';
  else if (warn) cls = 'border-amber-200 bg-amber-50/50';
  else if (ok) cls = 'border-green-200 bg-green-50/50';
  return (
    <Card className={cls}>
      <CardContent className="pt-4 pb-3 text-center">
        <div className="mx-auto mb-1">{icon}</div>
        <div className={`text-2xl font-bold ${danger?'text-red-600':ok?'text-green-600':''}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

// ─── OUTLOOK EXPORT TAB ───
function OutlookExportTab({ data, allData, ano, gestorFilter, userName }: {
  data: (Employee & EmpStats)[]; allData: (Employee & EmpStats)[]; ano: number; gestorFilter: string; userName: string;
}) {
  const [selectedColabs, setSelectedColabs] = useState<Set<string>>(new Set());
  const [searchIcs, setSearchIcs] = useState('');
  const exportarICS = trpc.ferias.exportarICS.useMutation({
    onSuccess: (result) => {
      window.open(result.url, '_blank');
      toast.success(`Ficheiro .ics gerado com ${result.totalEventos} eventos de ${result.totalColaboradores} colaboradores`);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao gerar ficheiro .ics');
    },
  });

  // Usar dados filtrados pelo gestor
  const colabsVisiveis = useMemo(() => {
    let result = data;
    if (searchIcs) {
      const s = searchIcs.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(s) || e.store.toLowerCase().includes(s));
    }
    return result.filter(e => e.approved > 0);
  }, [data, searchIcs]);

  const toggleColab = (num: string) => {
    setSelectedColabs(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedColabs(new Set(colabsVisiveis.map(e => e.num)));
  };

  const deselectAll = () => {
    setSelectedColabs(new Set());
  };

  // Calcular blocos de férias para cada colaborador
  const getBlocosFerias = (emp: Employee & EmpStats) => {
    const diasAprovados: { m: number; d: number; key: string }[] = [];
    Object.entries(emp.days).forEach(([key, status]) => {
      if (status === 'approved') {
        const [m, d] = key.split('-').map(Number);
        diasAprovados.push({ m, d, key });
      }
    });
    // Ordenar por mês e dia
    diasAprovados.sort((a, b) => a.m !== b.m ? a.m - b.m : a.d - b.d);
    
    // Agrupar em blocos consecutivos
    const blocos: { inicio: string; fim: string; dias: number }[] = [];
    if (diasAprovados.length === 0) return blocos;
    
    let blocoInicio = diasAprovados[0];
    let blocoFim = diasAprovados[0];
    let count = 1;
    
    for (let i = 1; i < diasAprovados.length; i++) {
      const curr = diasAprovados[i];
      const prev = diasAprovados[i - 1];
      // Verificar se é consecutivo (mesmo mês, dia+1 ou mudança de mês)
      const prevDate = new Date(ano, prev.m - 1, prev.d);
      const currDate = new Date(ano, curr.m - 1, curr.d);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        blocoFim = curr;
        count++;
      } else {
        blocos.push({
          inicio: `${blocoInicio.d}/${blocoInicio.m}`,
          fim: `${blocoFim.d}/${blocoFim.m}`,
          dias: count,
        });
        blocoInicio = curr;
        blocoFim = curr;
        count = 1;
      }
    }
    blocos.push({
      inicio: `${blocoInicio.d}/${blocoInicio.m}`,
      fim: `${blocoFim.d}/${blocoFim.m}`,
      dias: count,
    });
    return blocos;
  };

  const handleExportar = (individual?: string) => {
    const lojas = gestorFilter !== 'all' ? GESTORES[gestorFilter]?.map(s => s) : undefined;
    
    if (individual) {
      // Exportar individual - encontrar o colaborador pelo num
      const colab = colabsVisiveis.find(e => e.num === individual);
      if (!colab) return;
      exportarICS.mutate({
        ano,
        gestorNome: gestorFilter !== 'all' ? gestorFilter : userName,
        lojas: [colab.store],
      });
    } else {
      // Exportar selecionados ou todos
      const colabsParaExportar = selectedColabs.size > 0
        ? colabsVisiveis.filter(e => selectedColabs.has(e.num))
        : colabsVisiveis;
      
      const lojasUnicas = [...new Set(colabsParaExportar.map(e => e.store))];
      exportarICS.mutate({
        ano,
        gestorNome: gestorFilter !== 'all' ? gestorFilter : userName,
        lojas: lojasUnicas,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-blue-600" />
          Exportar Férias para Outlook
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Selecione os colaboradores e exporte um ficheiro .ics para importar no Outlook. Cada bloco de férias consecutivo cria um evento separado no calendário.
        </p>
      </CardHeader>
      <CardContent>
        {/* Barra de ações */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Pesquisar colaborador ou loja..." value={searchIcs} onChange={e => setSearchIcs(e.target.value)} className="pl-7 h-8 text-xs" />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAll}>
            <Check className="h-3.5 w-3.5 mr-1" /> Selecionar Todos
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={deselectAll}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
          <Badge variant="secondary" className="text-xs">
            {selectedColabs.size > 0 ? `${selectedColabs.size} selecionados` : `${colabsVisiveis.length} colaboradores`}
          </Badge>
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 gap-1.5"
            disabled={exportarICS.isPending || colabsVisiveis.length === 0}
            onClick={() => handleExportar()}
          >
            {exportarICS.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {selectedColabs.size > 0 ? `Exportar ${selectedColabs.size} para Outlook` : 'Exportar Todos para Outlook'}
          </Button>
        </div>

        {/* Tabela de colaboradores */}
        <div className="overflow-auto max-h-[500px] border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedColabs.size === colabsVisiveis.length && colabsVisiveis.length > 0}
                    onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold">Colaborador</TableHead>
                <TableHead className="text-xs font-semibold">Loja</TableHead>
                <TableHead className="text-xs font-semibold text-center">Dias Aprovados</TableHead>
                <TableHead className="text-xs font-semibold">Períodos de Férias</TableHead>
                <TableHead className="text-xs font-semibold text-center w-[100px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colabsVisiveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum colaborador com férias aprovadas encontrado
                  </TableCell>
                </TableRow>
              ) : colabsVisiveis.map(emp => {
                const blocos = getBlocosFerias(emp);
                return (
                  <TableRow key={emp.num} className={selectedColabs.has(emp.num) ? 'bg-blue-50/50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedColabs.has(emp.num)}
                        onCheckedChange={() => toggleColab(emp.num)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm">{emp.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{emp.store}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={emp.approved >= 22 ? 'default' : 'destructive'} className="text-xs">
                        {emp.approved}d
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {blocos.map((b, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-medium">
                            <Calendar className="h-2.5 w-2.5" />
                            {b.dias === 1 ? b.inicio : `${b.inicio} → ${b.fim}`}
                            <span className="text-green-600">({b.dias}d)</span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 gap-1"
                        disabled={exportarICS.isPending}
                        onClick={() => handleExportar(emp.num)}
                        title={`Exportar férias de ${emp.name} para Outlook`}
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Info */}
        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 rounded-lg px-3 py-2">
          <CalendarPlus className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-700">Como usar o ficheiro .ics:</p>
            <p className="mt-0.5">1. Clique em "Exportar" para descarregar o ficheiro .ics</p>
            <p>2. Abra o ficheiro — o Outlook abre automaticamente</p>
            <p>3. Confirme a importação dos eventos no calendário</p>
            <p className="mt-1 text-blue-600">Cada evento aparece como "Férias - [Nome]" com a loja e duração na descrição.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
