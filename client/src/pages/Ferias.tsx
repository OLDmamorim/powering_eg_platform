import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Upload, Calendar, BarChart3, PieChart, ChevronUp, ChevronDown, Search, Crosshair } from "lucide-react";

// ─── CONSTANTS ───
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_LOW = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DAYS: Record<number,number> = {1:31,2:28,3:31,4:30,5:31,6:30,7:31,8:31,9:30,10:31,11:30,12:31};

type Status = 'approved' | 'rejected' | 'holiday' | 'weekend' | 'absent';

const S_CLASS: Record<Status,string> = {approved:'bg-green-600 text-white',rejected:'bg-red-600 text-white',holiday:'bg-purple-600 text-white',weekend:'bg-yellow-300 text-yellow-900',absent:'bg-slate-500 text-white'};
const S_LABEL: Record<Status,string> = {approved:'S',rejected:'N',holiday:'F',weekend:'-',absent:'A'};

const COLOR_MAP: Record<string,Status> = {
  'FFBBF1FA':'holiday','BBF1FA':'holiday',
  'FFFAFAB4':'weekend','FAFAB4':'weekend',
  'FF00FF00':'approved','00FF00':'approved',
  'FFFB827E':'rejected','FB827E':'rejected',
  'FF707070':'absent','707070':'absent',
};

const GESTORES: Record<string, string[]> = {
  'Marco Amorim': [
    'BARCELOS','BRAGA CENTRO','FAMALICÃO','GUIMARÃES','MYCARCENTER',
    'PAÇOS FERREIRA','PAREDES','POVOA VARZIM','RECALIBRA MINHO',
    'SM BRAGA','SM FAMALICÃO','SM PAREDES','SM VIANA CASTELO',
    'VIANA CASTELO','VILA VERDE'
  ],
  'Fábio Dias': [
    'ABRANTES','CALDAS DA RAINHA','CASTANHEIRA DO RIBATEJO',
    'ENTRONCAMENTO','FARO','MONTIJO','PORTIMAO','PORTO ALTO',
    'SANTAREM','SM FARO','SM PORTO ALTO','SM VALE DO TEJO'
  ],
  'Carlos Eduardo': [
    'ALGÉS','ALMADA','AMADORA','CASCAISHOPPING','LISBOA-AMOREIRAS',
    'LISBOA-RELOGIO','LOURES','MOVIDA','POVOA SANTA IRIA',
    'RECALIBRA LISBOA','SACAVEM','SM LISBOA','SMR LISBOA','TELHEIRAS'
  ],
  'Marco Vilar': [
    'CANELAS','FEIRA','GAIA','GONDOMAR','MAIA','MAIA AEROPORTO',
    'MAIASHOPPING','MATOSINHOS','PORTO-MARQUÊS','PORTO-ZI',
    'RECALIBRA PORTO','SM PORTO'
  ],
  'Mónica Correia': [
    'AGUEDA','AVEIRO','COIMBRA','COIMBRA SUL','GUARDA','POMBAL',
    'SEIA','SM BEIRA BAIXA','SM COIMBRA','SM COSTA PRATA',
    'SM LEIRIA','SM SEIA','SM VISEU','SM VISEU 2','VISEU'
  ],
  'Rui Adrião': [
    'SM CASTANHEIRA DO RIBATEJO','SM PESADOS PORTO','SMR VISEU'
  ]
};

// ─── TYPES ───
interface Employee {
  store: string;
  num: string;
  name: string;
  days: Record<string, Status>;
}

interface ParsedData {
  employees: Employee[];
  storeMap: Record<string, number>;
}

interface EmpStats {
  approved: number;
  rejected: number;
  absent: number;
  byMonth: Record<number, number>;
  total: number;
}

// ─── HELPERS ───
const norm = (s: string) => s.toUpperCase().replace(/\s*\|\s*\d+/g,'').replace(/\s+/g,' ').trim();

function getGestorForStore(store: string): string {
  const ns = norm(store);
  for (const [gz, stores] of Object.entries(GESTORES)) {
    if (stores.map(norm).includes(ns)) return gz;
  }
  return '—';
}

function empStats(emp: Employee): EmpStats {
  let approved=0, rejected=0, absent=0;
  const byMonth: Record<number,number> = {};
  for (let m=1;m<=12;m++) byMonth[m]=0;
  for (const [key, status] of Object.entries(emp.days)) {
    const m = parseInt(key.split('-')[0]);
    if (status==='approved') { approved++; byMonth[m]++; }
    else if (status==='rejected') rejected++;
    else if (status==='absent') absent++;
  }
  return {approved, rejected, absent, byMonth, total: approved+rejected};
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
  const today = useMemo(() => new Date(), []);
  const TM = today.getMonth()+1;
  const TD = today.getDate();

  const [data, setData] = useState<ParsedData|null>(null);
  const [page, setPage] = useState<'cal'|'an'|'dist'>('cal');
  const [activeGestor, setActiveGestor] = useState<string>('');
  const [activeMonths, setActiveMonths] = useState<Set<number>>(new Set());
  const [activeStores, setActiveStores] = useState<Set<string>>(new Set());
  const [activeEmps, setActiveEmps] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  // Analysis state
  const [anGestor, setAnGestor] = useState('');
  const [anSort, setAnSort] = useState('sem_ferias');
  // Distribution state
  const [distGestor, setDistGestor] = useState('');
  const [distType, setDistType] = useState('approved');

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const wb = XLSX.read(ev.target?.result, {type:'array', cellStyles:true});
        const ws = wb.Sheets['Calendario'] || wb.Sheets[wb.SheetNames[0]];
        const parsed = parseSheet(ws);
        setData(parsed);
        setActiveGestor('');
        setActiveMonths(new Set());
        setActiveStores(new Set());
        setActiveEmps(new Set());
        setSearch('');
        setPage('cal');
      } catch(err: any) {
        alert('Erro: '+err.message);
      }
    };
    r.readAsArrayBuffer(f);
    e.target.value = '';
  }, []);

  // Filtered months
  const months = useMemo(() => {
    if (activeMonths.size === 0) return Array.from({length:12},(_,i)=>i+1);
    return Array.from(activeMonths).sort((a,b)=>a-b);
  }, [activeMonths]);

  // Filtered stores
  const availableStores = useMemo(() => {
    if (!data) return [];
    const all = Object.keys(data.storeMap).sort((a,b)=>a.localeCompare(b,'pt'));
    if (!activeGestor) return all;
    const gStores = GESTORES[activeGestor]?.map(norm) || [];
    return all.filter(s => gStores.includes(norm(s)));
  }, [data, activeGestor]);

  // Employees filtered
  const {highlighted, storeEmps} = useMemo(() => {
    if (!data) return {highlighted:[] as Employee[], storeEmps:[] as Employee[]};
    const searchLow = search.toLowerCase();
    
    const hl = activeEmps.size
      ? data.employees.filter(e => activeEmps.has(e.num) && (!searchLow || e.name.toLowerCase().includes(searchLow) || e.num.includes(searchLow)))
      : [];
    
    let effectiveStores = activeStores;
    if (!activeStores.size && activeGestor && GESTORES[activeGestor]) {
      const gNorm = GESTORES[activeGestor].map(norm);
      effectiveStores = new Set(Object.keys(data.storeMap).filter(s => gNorm.includes(norm(s))));
    }
    
    const activeEmpNums = new Set(hl.map(e=>e.num));
    let se = effectiveStores.size
      ? data.employees.filter(e => effectiveStores.has(e.store) && !activeEmpNums.has(e.num))
      : (!activeEmpNums.size ? data.employees : []);
    
    if (searchLow) se = se.filter(e => e.name.toLowerCase().includes(searchLow) || e.num.includes(searchLow));
    
    return {highlighted: hl, storeEmps: se};
  }, [data, activeEmps, activeStores, activeGestor, search]);

  const allEmps = useMemo(() => [...highlighted, ...storeEmps], [highlighted, storeEmps]);

  // Stats
  const stats = useMemo(() => {
    const s = {approved:0,rejected:0,absent:0};
    allEmps.forEach(emp => {
      months.forEach(m => {
        for (let d=1;d<=DAYS[m];d++) {
          const status = emp.days[`${m}-${d}`];
          if (status==='approved') s.approved++;
          else if (status==='rejected') s.rejected++;
          else if (status==='absent') s.absent++;
        }
      });
    });
    return s;
  }, [allEmps, months]);

  // Groups for calendar
  const storeGroups = useMemo(() => {
    const groups: Record<string,Employee[]> = {};
    const order: string[] = [];
    storeEmps.forEach(e => {
      if (!groups[e.store]) { groups[e.store]=[]; order.push(e.store); }
      groups[e.store].push(e);
    });
    order.sort((a,b) => a.localeCompare(b,'pt'));
    return {groups, order};
  }, [storeEmps]);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    const todayCell = calRef.current?.querySelector('.d-today');
    if (todayCell && calRef.current) {
      const cell = todayCell.getBoundingClientRect();
      const wrap = calRef.current.getBoundingClientRect();
      calRef.current.scrollLeft += cell.left - wrap.left - 200;
    }
  }, []);

  useEffect(() => {
    if (data && page === 'cal') {
      setTimeout(scrollToToday, 100);
    }
  }, [data, page, scrollToToday]);

  // Toggle helpers
  const toggleMonth = (m: number) => {
    setActiveMonths(prev => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  };
  const toggleStore = (s: string) => {
    setActiveStores(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };
  const toggleEmp = (num: string) => {
    setActiveEmps(prev => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  };

  // Analysis data
  const analysisData = useMemo(() => {
    if (!data) return [];
    let emps = data.employees;
    if (anGestor) {
      const gStores = GESTORES[anGestor]?.map(norm) || [];
      emps = emps.filter(e => gStores.includes(norm(e.store)));
    }
    const enriched = emps.map(e => ({...e, ...empStats(e), gz: getGestorForStore(e.store)}));
    enriched.sort((a,b) => {
      if (anSort==='sem_ferias') { const as2=a.total===0?1:0, bs2=b.total===0?1:0; return bs2-as2 || b.rejected-a.rejected; }
      if (anSort==='menos_marcadas') return (a.approved+a.rejected) - (b.approved+b.rejected);
      if (anSort==='nao_aprov') return b.rejected-a.rejected;
      if (anSort==='aprovados') return b.approved-a.approved;
      return a.name.localeCompare(b.name);
    });
    return enriched;
  }, [data, anGestor, anSort]);

  // Analysis KPIs
  const anKpis = useMemo(() => {
    const total = analysisData.length;
    const totApr = analysisData.reduce((a,e)=>a+e.approved,0);
    const totRej = analysisData.reduce((a,e)=>a+e.rejected,0);
    const semFerias = analysisData.filter(e=>e.total===0).length;
    const soRej = analysisData.filter(e=>e.total>0&&e.approved===0).length;
    const pctApr = (totApr+totRej) ? Math.round(totApr/(totApr+totRej)*100) : 0;
    return {total, totApr, totRej, semFerias, soRej, pctApr};
  }, [analysisData]);

  // Analysis month bars
  const anMonthTotals = useMemo(() => {
    const totals: Record<number,number> = {};
    for (let m=1;m<=12;m++) totals[m] = analysisData.reduce((a,e)=>a+(e.byMonth[m]||0),0);
    return totals;
  }, [analysisData]);

  // Analysis per store
  const anLojas = useMemo(() => {
    const lojas: Record<string,{total:number,approved:number,rejected:number,sem:number}> = {};
    analysisData.forEach(e => {
      if (!lojas[e.store]) lojas[e.store]={total:0,approved:0,rejected:0,sem:0};
      const l=lojas[e.store]; l.total++;
      l.approved+=e.approved; l.rejected+=e.rejected;
      if (e.total===0) l.sem++;
    });
    return Object.entries(lojas).sort((a,b)=>b[1].sem-a[1].sem||b[1].rejected-a[1].rejected);
  }, [analysisData]);

  // Distribution data
  const distData = useMemo(() => {
    if (!data) return {gestores:[] as string[], gd:{} as any, mt:{} as Record<number,number>, grand:0, empc:0};
    const gz = distGestor ? [distGestor] : Object.keys(GESTORES);
    const gd: Record<string,{byM:Record<number,number>,total:number,ec:number}> = {};
    gz.forEach(g => {
      const gNorm = GESTORES[g]?.map(norm) || [];
      const emps = data.employees.filter(e => gNorm.includes(norm(e.store)));
      const byM: Record<number,number> = {};
      let total = 0;
      for (let m=1;m<=12;m++) byM[m]=0;
      emps.forEach(e => {
        Object.keys(e.days).forEach(k => {
          const st = e.days[k];
          const m = parseInt(k.split('-')[0]);
          const ok = distType==='approved' ? st==='approved' : (st==='approved'||st==='rejected');
          if (ok) { byM[m]++; total++; }
        });
      });
      gd[g] = {byM, total, ec: emps.length};
    });
    const mt: Record<number,number> = {};
    for (let m=1;m<=12;m++) mt[m]=0;
    let grand=0, empc=0;
    gz.forEach(g => { for (let m=1;m<=12;m++) mt[m]+=gd[g].byM[m]; grand+=gd[g].total; empc+=gd[g].ec; });
    return {gestores:gz, gd, mt, grand, empc};
  }, [data, distGestor, distType]);

  // Distribution period data
  const distPeriods = useMemo(() => {
    const PR = [{l:'01 Jan > 31 Mai',m:[1,2,3,4,5]},{l:'01 Jun > 15 Set',m:[6,7,8,9]},{l:'16 Set > 31 Dez',m:[10,11,12]}];
    return PR;
  }, []);

  // ─── RENDER ───
  const shortName = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0]+' '+parts[parts.length-1] : name;
  };

  return (
    <DashboardLayout>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      
      <div className="flex flex-col h-full" style={{fontFamily:"'DM Sans',sans-serif"}}>
        {/* TOPBAR */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#0f2044] text-white flex-shrink-0">
          <span className="font-bold text-sm">Férias <span className="text-blue-400">Express Glass</span></span>
          
          {data && (
            <div className="flex-1 relative min-w-0 mx-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar colaborador..."
                className="w-full bg-white/10 border border-white/15 text-white rounded-lg py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-white/35"
              />
            </div>
          )}
          
          <Button size="sm" onClick={() => fileRef.current?.click()} className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 flex-shrink-0">
            <Upload className="w-4 h-4" /> Carregar
          </Button>
          
          {data && (
            <button onClick={scrollToToday} className="text-xs bg-sky-600/80 text-white px-2 py-1 rounded-md flex-shrink-0">
              <Crosshair className="w-3 h-3 inline mr-1" />{TD} {MONTHS_PT[TM-1]}
            </button>
          )}
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
          <button onClick={() => setPage('cal')} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${page==='cal' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Calendar className="w-3.5 h-3.5" /> Calendário
          </button>
          <button onClick={() => setPage('an')} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${page==='an' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <BarChart3 className="w-3.5 h-3.5" /> Análise
          </button>
          <button onClick={() => setPage('dist')} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${page==='dist' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <PieChart className="w-3.5 h-3.5" /> Distribuição
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden">
          {/* ═══ CALENDAR PAGE ═══ */}
          {page === 'cal' && (
            <>
              {!data ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                  <Calendar className="w-16 h-16 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-600">Mapa de Férias</h3>
                  <p className="text-sm">Carrega o ficheiro <strong>Férias.xlsx</strong> para começar.</p>
                  <Button onClick={() => fileRef.current?.click()} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
                    <Upload className="w-4 h-4" /> Carregar Ficheiro
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Filter bar */}
                  <div className="flex items-center gap-1 px-2 py-1.5 bg-white border-b border-slate-200 flex-shrink-0 overflow-x-auto text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 px-1 flex-shrink-0">Gestor</span>
                    <select
                      value={activeGestor}
                      onChange={e => { setActiveGestor(e.target.value); setActiveStores(new Set()); setActiveEmps(new Set()); }}
                      className="h-7 px-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-medium cursor-pointer outline-none flex-shrink-0"
                    >
                      <option value="">— Todos —</option>
                      {Object.keys(GESTORES).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

                    <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase text-slate-400 px-1 flex-shrink-0">Meses</span>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => setActiveMonths(new Set())} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${activeMonths.size===0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Todos</button>
                      {MONTHS_PT.map((m,i) => (
                        <button key={i} onClick={() => toggleMonth(i+1)} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${activeMonths.has(i+1) ? 'bg-blue-600 text-white' : i+1===TM ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{m}</button>
                      ))}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase text-slate-400 px-1 flex-shrink-0">Lojas</span>
                    <select
                      value={activeStores.size === 1 ? Array.from(activeStores)[0] : ''}
                      onChange={e => setActiveStores(e.target.value ? new Set([e.target.value]) : new Set())}
                      className="h-7 px-2 border border-slate-200 rounded-lg bg-slate-50 text-xs cursor-pointer outline-none flex-shrink-0 max-w-[150px]"
                    >
                      <option value="">Todas ({availableStores.length})</option>
                      {availableStores.map(s => <option key={s} value={s}>{s} ({data.storeMap[s]})</option>)}
                    </select>
                  </div>

                  {/* Stats bar */}
                  <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex-shrink-0 text-xs">
                    <span className="font-semibold text-slate-700">{allEmps.length} colaboradores</span>
                    <span className="text-green-700 font-medium">{stats.approved} aprovados</span>
                    <span className="text-red-700 font-medium">{stats.rejected} não aprov.</span>
                    <span className="text-slate-500 font-medium">{stats.absent} faltas</span>
                  </div>

                  {/* Calendar table */}
                  <div ref={calRef} className="flex-1 overflow-auto">
                    <table className="border-collapse text-[11px]" style={{minWidth:'100%'}}>
                      <thead className="sticky top-0 z-20 bg-white">
                        <tr>
                          <th className="sticky left-0 z-30 bg-[#0f2044] text-white text-left px-2 py-1 font-semibold" style={{minWidth:130}}>Colaborador</th>
                          <th className="sticky z-30 bg-[#0f2044] text-white text-center px-1 py-1 font-semibold" style={{left:130,minWidth:36}}>N</th>
                          {months.map(m => (
                            <th key={m} colSpan={DAYS[m]} className={`text-center py-1 font-bold text-xs ${m===TM ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                              {MONTHS_FULL[m-1].toUpperCase()}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          <th className="sticky left-0 z-30 bg-slate-50" style={{minWidth:130}}></th>
                          <th className="sticky z-30 bg-slate-50" style={{left:130,minWidth:36}}></th>
                          {months.map(m =>
                            Array.from({length:DAYS[m]},(_,d)=>d+1).map(d => (
                              <th key={`${m}-${d}`} className={`text-center px-0 py-0.5 text-[9px] font-normal text-slate-400 ${d===1?'border-l border-slate-300':''} ${m===TM&&d===TD?'bg-sky-500 text-white rounded-sm font-bold':''}`} style={{minWidth:20}}>
                                {d}
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Highlighted section */}
                        {highlighted.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={2 + months.reduce((a,m)=>a+DAYS[m],0)} className="bg-gradient-to-r from-yellow-900 to-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1">
                                Em Destaque
                              </td>
                            </tr>
                            {highlighted.map((emp,ri) => (
                              <EmpRow key={`hl-${emp.num}`} emp={emp} months={months} TM={TM} TD={TD} isHighlighted ri={ri} />
                            ))}
                          </>
                        )}
                        {/* Store groups */}
                        {storeGroups.order.map(store => (
                          <StoreGroup key={store} store={store} employees={storeGroups.groups[store]} months={months} TM={TM} TD={TD} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary panel */}
                  {activeStores.size > 0 && (
                    <div className="border-t border-slate-200 bg-white max-h-[200px] overflow-auto flex-shrink-0">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 cursor-pointer" onClick={() => setSummaryCollapsed(!summaryCollapsed)}>
                        <div>
                          <span className="text-xs font-bold text-slate-700">Resumo</span>
                          <span className="text-[10px] text-slate-400 ml-2">{activeStores.size} loja(s) · {months.length} mês(es)</span>
                        </div>
                        {summaryCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                      </div>
                      {!summaryCollapsed && (
                        <div className="flex flex-wrap gap-3 p-3">
                          {Array.from(activeStores).sort().map(store => {
                            const emps = storeEmps.filter(e => e.store === store);
                            return (
                              <div key={store} className="min-w-[200px]">
                                <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">{store}</div>
                                {emps.map(emp => {
                                  const es = empStats(emp);
                                  const totalDays = months.reduce((a,m)=>a+DAYS[m],0);
                                  return (
                                    <div key={emp.num} className="flex items-center gap-2 text-[10px] py-0.5">
                                      <span className="font-medium text-slate-700 w-24 truncate" title={emp.name}>{shortName(emp.name)}</span>
                                      <span className="text-slate-400 w-8">{emp.num}</span>
                                      <div className="flex-1 flex h-2 rounded overflow-hidden bg-slate-100">
                                        {es.approved>0 && <div className="bg-green-500" style={{width:`${Math.max(es.approved/totalDays*100,2)}%`}} />}
                                        {es.rejected>0 && <div className="bg-red-500" style={{width:`${Math.max(es.rejected/totalDays*100,2)}%`}} />}
                                        {es.absent>0 && <div className="bg-slate-400" style={{width:`${Math.max(es.absent/totalDays*100,2)}%`}} />}
                                      </div>
                                      <div className="flex gap-1">
                                        {es.approved>0 && <span className="text-green-700">{es.approved} apr.</span>}
                                        {es.rejected>0 && <span className="text-red-700">{es.rejected} n.apr.</span>}
                                        {es.absent>0 && <span className="text-slate-500">{es.absent} falt.</span>}
                                        {es.approved===0&&es.rejected===0&&es.absent===0 && <span className="text-slate-300">sem registo</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ═══ ANALYSIS PAGE ═══ */}
          {page === 'an' && (
            <div className="h-full overflow-auto p-4">
              {!data ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                  <BarChart3 className="w-16 h-16 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-600">Análise de Férias</h3>
                  <p className="text-sm">Carrega primeiro o ficheiro <strong>Férias.xlsx</strong> no Calendário.</p>
                  <Button onClick={() => { setPage('cal'); }} variant="outline" className="gap-2">
                    Ir para Calendário
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Gestor</span>
                    <select value={anGestor} onChange={e => setAnGestor(e.target.value)} className="h-7 px-2 border-2 border-indigo-500 rounded-lg bg-white text-indigo-600 text-xs font-semibold cursor-pointer outline-none">
                      <option value="">— Todos —</option>
                      {Object.keys(GESTORES).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <span className="text-[10px] font-bold uppercase text-slate-400 ml-2">Ordenar por</span>
                    <select value={anSort} onChange={e => setAnSort(e.target.value)} className="h-7 px-2 border border-slate-200 rounded-lg bg-slate-50 text-xs cursor-pointer outline-none">
                      <option value="sem_ferias">Sem férias primeiro</option>
                      <option value="menos_marcadas">Menos férias marcadas</option>
                      <option value="nao_aprov">Mais não aprovados</option>
                      <option value="aprovados">Mais aprovados</option>
                      <option value="nome">Nome A-Z</option>
                    </select>
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <KpiCard label="Colaboradores" value={anKpis.total} sub="neste filtro" />
                    <KpiCard label="Sem férias marcadas" value={anKpis.semFerias} sub="0 dias registados" danger={anKpis.semFerias>0} />
                    <KpiCard label="Dias aprovados" value={anKpis.totApr} sub="total acumulado" ok />
                    <KpiCard label="Não aprovados" value={anKpis.totRej} sub="dias pendentes" danger={anKpis.totRej>0} />
                    <KpiCard label="Taxa aprovação" value={`${anKpis.pctApr}%`} sub={`${anKpis.soRej} só com não-aprov.`} ok={anKpis.pctApr>=80} warn={anKpis.pctApr>=50&&anKpis.pctApr<80} danger={anKpis.pctApr<50} />
                  </div>

                  {/* Month bars */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-700">Distribuição por mês</span>
                      <span className="text-[10px] text-slate-400">dias aprovados por mês · {analysisData.length} colaboradores</span>
                    </div>
                    <div className="flex items-end gap-1 h-24">
                      {MONTHS_PT.map((lbl,i) => {
                        const m=i+1;
                        const v=anMonthTotals[m];
                        const max = Math.max(...Object.values(anMonthTotals),1);
                        const h = Math.round(v/max*72);
                        return (
                          <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                            <span className="text-[9px] text-slate-500 font-medium">{v||''}</span>
                            <div className={`w-full rounded-t ${m===TM?'bg-sky-500':'bg-blue-600'}`} style={{height:Math.max(h,2)}} />
                            <span className={`text-[9px] font-medium ${m===TM?'text-sky-600':'text-slate-400'}`}>{lbl}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Critical table */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-700">Situações a acompanhar</span>
                      <span className="text-[10px] text-slate-400">{analysisData.length} colaboradores</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-2 text-slate-500 font-semibold">Colaborador</th>
                            <th className="text-left py-2 px-2 text-slate-500 font-semibold">Loja</th>
                            <th className="text-left py-2 px-2 text-slate-500 font-semibold">Gestor</th>
                            <th className="text-center py-2 px-2 text-slate-500 font-semibold">Aprovados</th>
                            <th className="text-center py-2 px-2 text-slate-500 font-semibold">Não aprov.</th>
                            <th className="text-left py-2 px-2 text-slate-500 font-semibold">Estado</th>
                            <th className="text-left py-2 px-2 text-slate-500 font-semibold">Progresso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.map((e,i) => {
                            const pct = Math.min(Math.round(e.approved/22*100),100);
                            let estado: string, pillCls: string;
                            if (e.total===0) { estado='Sem registo'; pillCls='bg-red-100 text-red-700'; }
                            else if (e.approved===0) { estado='Tudo por aprovar'; pillCls='bg-red-100 text-red-700'; }
                            else if (e.rejected>e.approved) { estado='Maioria p/ aprovar'; pillCls='bg-amber-100 text-amber-700'; }
                            else { estado='Parcialmente ok'; pillCls='bg-amber-100 text-amber-700'; }
                            return (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-1.5 px-2">
                                  <div className="font-medium text-slate-700" title={e.name}>{shortName(e.name)}</div>
                                  <div className="text-[10px] text-slate-400">{e.num}</div>
                                </td>
                                <td className="py-1.5 px-2 text-slate-600">{e.store}</td>
                                <td className="py-1.5 px-2 text-slate-400">{e.gz}</td>
                                <td className="py-1.5 px-2 text-center"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">{e.approved}</span></td>
                                <td className="py-1.5 px-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${e.rejected>0?'bg-red-100 text-red-700':'bg-slate-100 text-slate-400'}`}>{e.rejected}</span></td>
                                <td className="py-1.5 px-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${pillCls}`}>{estado}</span></td>
                                <td className="py-1.5 px-2">
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{width:`${pct}%`,background:pct>=80?'#16a34a':pct>=40?'#d97706':'#dc2626'}} />
                                    </div>
                                    <span className="text-[10px] text-slate-400 w-8">{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Per store */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-700">Resumo por loja</span>
                      <span className="text-[10px] text-slate-400">{anLojas.length} lojas</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {anLojas.map(([store,l]) => {
                        const pct = l.total ? Math.min(Math.round(l.approved/(l.total*22)*100),100) : 0;
                        const color = l.sem>0?'#dc2626':l.rejected>5?'#d97706':'#16a34a';
                        return (
                          <div key={store} className="border border-slate-200 rounded-lg p-3" style={{borderLeftWidth:3,borderLeftColor:color}}>
                            <div className="text-xs font-bold text-slate-700 mb-1.5">{store}</div>
                            <div className="flex gap-1 mb-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-700">{l.total} colab.</span>
                              {l.sem>0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-100 text-red-700">{l.sem} sem férias</span>}
                              {l.rejected>0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">{l.rejected} n.apr.</span>}
                              {l.sem===0&&l.rejected===0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-100 text-green-700">ok</span>}
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
                              <span>Aprovação</span><span>{l.approved} dias</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${pct}%`,background:color}} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ DISTRIBUTION PAGE ═══ */}
          {page === 'dist' && (
            <div className="h-full overflow-auto p-4">
              {!data ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                  <PieChart className="w-16 h-16 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-600">Distribuição de Férias</h3>
                  <p className="text-sm">Carrega primeiro o ficheiro <strong>Férias.xlsx</strong> no Calendário.</p>
                  <Button onClick={() => setPage('cal')} variant="outline" className="gap-2">Ir para Calendário</Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Gestor</span>
                    <select value={distGestor} onChange={e => setDistGestor(e.target.value)} className="h-7 px-2 border-2 border-indigo-500 rounded-lg bg-white text-indigo-600 text-xs font-semibold cursor-pointer outline-none">
                      <option value="">— Todos —</option>
                      {Object.keys(GESTORES).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <span className="text-[10px] font-bold uppercase text-slate-400 ml-2">Tipo</span>
                    <select value={distType} onChange={e => setDistType(e.target.value)} className="h-7 px-2 border border-slate-200 rounded-lg bg-slate-50 text-xs cursor-pointer outline-none">
                      <option value="approved">Só aprovadas</option>
                      <option value="all">Aprovadas + Não aprovadas</option>
                    </select>
                  </div>

                  {/* Monthly distribution table */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="mb-3">
                      <span className="text-sm font-bold text-slate-700">Distribuição mensal por gestor</span>
                      <span className="text-[10px] text-slate-400 ml-2">dias por mês · % do total anual</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left py-2 px-2 text-slate-600 font-semibold border-b border-slate-200">Gestor</th>
                            {Array.from({length:12},(_,i)=>i+1).map(m => (
                              <th key={m} className={`text-center py-2 px-1 font-semibold border-b border-slate-200 ${m===TM?'text-sky-600 bg-sky-50':'text-slate-500'}`}>{MONTHS_PT[m-1]}</th>
                            ))}
                            <th className="text-center py-2 px-2 font-bold text-slate-700 border-b border-slate-200">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distData.gestores.map(g => {
                            const d = distData.gd[g];
                            return (
                              <React.Fragment key={g}>
                                <tr className="border-b border-slate-100">
                                  <td className="py-1.5 px-2 font-semibold text-slate-700" rowSpan={2}>{g}</td>
                                  {Array.from({length:12},(_,i)=>i+1).map(m => (
                                    <td key={m} className="text-center py-1 px-1 text-slate-600">{d.byM[m]||''}</td>
                                  ))}
                                  <td className="text-center py-1 px-2 font-bold text-slate-700">{d.total}</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                  {Array.from({length:12},(_,i)=>i+1).map(m => {
                                    const p = d.total ? Math.round(d.byM[m]/d.total*100) : 0;
                                    return <td key={m} className={`text-center py-0.5 px-1 text-[10px] ${p>=15?'text-amber-600 font-bold':'text-slate-400'}`}>{d.total?`${p}%`:''}</td>;
                                  })}
                                  <td className="text-center py-0.5 px-2 text-[10px] text-slate-400">100%</td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                          {/* Totals */}
                          <tr className="bg-slate-800 text-white">
                            <td className="py-1.5 px-2 font-bold">TOTAL DIAS</td>
                            {Array.from({length:12},(_,i)=>i+1).map(m => (
                              <td key={m} className="text-center py-1.5 px-1">{distData.mt[m]||''}</td>
                            ))}
                            <td className="text-center py-1.5 px-2 font-bold">{distData.grand}</td>
                          </tr>
                          <tr className="bg-slate-100">
                            <td className="py-1 px-2 text-slate-500 text-[10px]">Distribuição</td>
                            {Array.from({length:12},(_,i)=>i+1).map(m => {
                              const p = distData.grand ? Math.round(distData.mt[m]/distData.grand*100) : 0;
                              return <td key={m} className={`text-center py-1 px-1 text-[10px] ${p>=15?'text-amber-600 font-bold':'text-slate-400'}`}>{p}%</td>;
                            })}
                            <td className="text-center py-1 px-2 text-[10px] text-slate-400">100%</td>
                          </tr>
                          <tr className="bg-slate-50">
                            <td className="py-1 px-2 text-slate-500 text-[10px]">Média colab.</td>
                            {Array.from({length:12},(_,i)=>i+1).map(m => {
                              const av = distData.empc ? (distData.mt[m]/distData.empc).toFixed(1) : '';
                              return <td key={m} className="text-center py-1 px-1 text-[10px] text-slate-400">{parseFloat(av as string)>0?av:''}</td>;
                            })}
                            <td className="text-center py-1 px-2 text-[10px] text-slate-400"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Period distribution table */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="mb-3">
                      <span className="text-sm font-bold text-slate-700">Distribuição por período</span>
                      <span className="text-[10px] text-slate-400 ml-2">Jan-Mai · Jun-Set · Set-Dez</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left py-2 px-2 text-slate-600 font-semibold border-b border-slate-200">Gestor</th>
                            {distPeriods.map((p,i) => <th key={i} className="text-center py-2 px-2 text-slate-500 font-semibold border-b border-slate-200">{p.l}</th>)}
                            <th className="text-center py-2 px-2 font-bold text-slate-700 border-b border-slate-200">Total</th>
                            {distPeriods.map((_,i) => <th key={`p${i}`} className="text-center py-2 px-2 text-slate-500 font-semibold border-b border-slate-200">%</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {distData.gestores.map(g => {
                            const d = distData.gd[g];
                            const pc = distPeriods.map(p => p.m.reduce((a,m)=>a+d.byM[m],0));
                            const pk = pc.indexOf(Math.max(...pc));
                            return (
                              <tr key={g} className="border-b border-slate-100">
                                <td className="py-1.5 px-2 font-semibold text-slate-700">{g}</td>
                                {pc.map((v,i) => <td key={i} className={`text-center py-1.5 px-2 ${i===pk?'font-bold text-blue-700':''}`}>{v||''}</td>)}
                                <td className="text-center py-1.5 px-2 font-bold text-slate-700">{d.total}</td>
                                {pc.map((v,i) => {
                                  const pp = d.total ? Math.round(v/d.total*100) : 0;
                                  return <td key={i} className={`text-center py-1.5 px-2 text-[10px] ${pp>=50?'text-amber-600 font-bold':'text-slate-400'}`}>{d.total?`${pp}%`:''}</td>;
                                })}
                              </tr>
                            );
                          })}
                          {/* Period totals */}
                          {(() => {
                            const pt = distPeriods.map(p => p.m.reduce((a,m)=>a+distData.mt[m],0));
                            const ppk = pt.indexOf(Math.max(...pt));
                            return (
                              <tr className="bg-slate-800 text-white">
                                <td className="py-1.5 px-2 font-bold">TOTAL</td>
                                {pt.map((v,i) => <td key={i} className={`text-center py-1.5 px-2 ${i===ppk?'font-bold':''}`}>{v}</td>)}
                                <td className="text-center py-1.5 px-2 font-bold">{distData.grand}</td>
                                {pt.map((v,i) => {
                                  const pp = distData.grand ? Math.round(v/distData.grand*100) : 0;
                                  return <td key={i} className="text-center py-1.5 px-2 text-[10px]">{pp}%</td>;
                                })}
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── SUB-COMPONENTS ───

function EmpRow({ emp, months, TM, TD, isHighlighted, ri }: { emp: Employee; months: number[]; TM: number; TD: number; isHighlighted?: boolean; ri: number }) {
  const parts = emp.name.split(' ');
  const short = parts.length > 1 ? parts[0]+' '+parts[parts.length-1] : emp.name;
  return (
    <tr className={`${ri%2===0?'bg-white':'bg-slate-50/50'} ${isHighlighted?'bg-amber-50/50':''}`}>
      <td className={`sticky left-0 z-10 px-2 py-0.5 font-medium text-slate-700 truncate ${isHighlighted?'border-l-[3px] border-amber-500 bg-amber-50':'bg-white'}`} style={{minWidth:130,maxWidth:130}} title={emp.name}>
        {short}
      </td>
      <td className={`sticky z-10 text-center text-[10px] text-slate-400 ${isHighlighted?'bg-amber-50':'bg-white'}`} style={{left:130,minWidth:36}}>
        {emp.num}
      </td>
      {months.map(m =>
        Array.from({length:DAYS[m]},(_,d)=>d+1).map(d => {
          const status = emp.days[`${m}-${d}`];
          const isToday = m===TM && d===TD;
          return (
            <td key={`${m}-${d}`} className={`text-center text-[9px] py-0.5 ${d===1?'border-l border-slate-200':''} ${status ? S_CLASS[status] : ''} ${isToday?'ring-1 ring-sky-500 ring-inset':''}`} style={{minWidth:20}}>
              {status ? S_LABEL[status] : ''}
            </td>
          );
        })
      )}
    </tr>
  );
}

function StoreGroup({ store, employees, months, TM, TD }: { store: string; employees: Employee[]; months: number[]; TM: number; TD: number }) {
  const totalDayCols = months.reduce((a,m)=>a+DAYS[m],0);
  return (
    <>
      <tr>
        <td className="sticky left-0 z-10 bg-gradient-to-r from-[#0f2044] to-blue-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1" style={{minWidth:130}}>
          {store}
        </td>
        <td className="bg-blue-700" style={{minWidth:36}}></td>
        <td colSpan={totalDayCols} className="bg-gradient-to-r from-blue-700 to-blue-600"></td>
      </tr>
      {employees.map((emp,ri) => (
        <EmpRow key={emp.num} emp={emp} months={months} TM={TM} TD={TD} ri={ri} />
      ))}
    </>
  );
}

function KpiCard({ label, value, sub, ok, warn, danger }: { label: string; value: string|number; sub: string; ok?: boolean; warn?: boolean; danger?: boolean }) {
  let border = 'border-slate-200';
  if (danger) border = 'border-red-300 bg-red-50/50';
  else if (warn) border = 'border-amber-300 bg-amber-50/50';
  else if (ok) border = 'border-green-300 bg-green-50/50';
  return (
    <div className={`border rounded-lg p-3 ${border}`}>
      <div className="text-[10px] font-semibold uppercase text-slate-400">{label}</div>
      <div className={`text-2xl font-bold ${danger?'text-red-600':ok?'text-green-600':'text-slate-700'}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{sub}</div>
    </div>
  );
}
