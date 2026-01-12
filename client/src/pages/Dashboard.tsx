import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Building2, ClipboardList, FileText, ListTodo, AlertTriangle, TrendingUp, TrendingDown, Calendar, Download, Minus, Sparkles, RefreshCw, Activity, Eye, Zap, MapPin, Clock, CheckCircle, XCircle, CheckSquare, BarChart3 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ReminderDialog } from "@/components/ReminderDialog";
import { RelatorioIACategorias } from "@/components/RelatorioIACategorias";
import { useDemo } from "@/contexts/DemoContext";
import { demoLojas, demoGestores, demoRelatoriosLivres, demoRelatoriosCompletos, demoPendentes, demoAlertas, demoEstatisticas, demoAtividadeRecente, demoUser } from "@/lib/demoData";

// Componente de indicador de variação
function VariationIndicator({ current, previous, suffix = "", language = 'pt' }: { current: number; previous: number; suffix?: string; language?: string }) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> {language === 'pt' ? 'Sem variação' : 'No change'}</span>;
  }
  
  const variation = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isPositive = variation > 0;
  const isNeutral = variation === 0;
  
  if (isNeutral) {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> {language === 'pt' ? 'Sem variação' : 'No change'}</span>;
  }
  
  return (
    <span className={`text-xs flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}{variation.toFixed(0)}%{suffix}
    </span>
  );
}

// Componente de gráfico de barras simples
function SimpleBarChart({ data, title }: { data: { label: string; value: number; color?: string }[]; title: string }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${item.color || 'bg-primary'}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de gráfico de linha simples
function SimpleLineChart({ data, title }: { data: { label: string; value: number }[]; title: string }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="relative h-32">
        <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
          <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
          <polyline
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1 || 1)) * 100;
              const y = 50 - ((d.value - minValue) / range) * 45;
              return `${x},${y}`;
            }).join(' ')}
          />
          <polygon
            fill="hsl(var(--primary))"
            fillOpacity="0.1"
            points={`0,50 ${data.map((d, i) => {
              const x = (i / (data.length - 1 || 1)) * 100;
              const y = 50 - ((d.value - minValue) / range) * 45;
              return `${x},${y}`;
            }).join(' ')} 100,50`}
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1 || 1)) * 100;
            const y = 50 - ((d.value - minValue) / range) * 45;
            return <circle key={i} cx={x} cy={y} r="2" fill="hsl(var(--primary))" />;
          })}
        </svg>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          {data.map((d, i) => <span key={i} className="truncate max-w-[60px]">{d.label}</span>)}
        </div>
      </div>
    </div>
  );
}

// Componente separado para Lembretes de Resumos Globais (evita hooks dentro de map)
function LembretesResumosGlobais({ isAdmin, isGestor, setLocation }: { isAdmin: boolean; isGestor: boolean; setLocation: (path: string) => void }) {
  // Buscar últimos resumos de cada período
  const { data: ultimoMensal } = trpc.resumosGlobais.getUltimoPorPeriodo.useQuery(
    { periodo: 'mes_anterior' },
    { enabled: isAdmin || isGestor }
  );
  const { data: ultimoTrimestral } = trpc.resumosGlobais.getUltimoPorPeriodo.useQuery(
    { periodo: 'trimestre_anterior' },
    { enabled: isAdmin || isGestor }
  );
  const { data: ultimoSemestral } = trpc.resumosGlobais.getUltimoPorPeriodo.useQuery(
    { periodo: 'semestre_anterior' },
    { enabled: isAdmin || isGestor }
  );
  const { data: ultimoAnual } = trpc.resumosGlobais.getUltimoPorPeriodo.useQuery(
    { periodo: 'ano_anterior' },
    { enabled: isAdmin || isGestor }
  );

  if (!isAdmin && !isGestor) return null;

  const agora = new Date();
  const lembretes: Array<{periodo: 'mes_anterior' | 'trimestre_anterior' | 'semestre_anterior' | 'ano_anterior'; mensagem: string; cor: string; ultimoResumo: any}> = [];
  
  // Mensal - primeiros 5 dias do mês
  if (agora.getDate() <= 5) {
    const inicioPeriodoAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    if (!ultimoMensal || new Date(ultimoMensal.dataInicio) < inicioPeriodoAnterior) {
      lembretes.push({
        periodo: 'mes_anterior',
        mensagem: 'Está na altura de gerar o Resumo Global do Mês Anterior',
        cor: 'blue',
        ultimoResumo: ultimoMensal
      });
    }
  }
  
  // Trimestral - primeiros 5 dias do trimestre (jan, abr, jul, out)
  const mesAtual = agora.getMonth();
  const primeiroMesTrimestre = [0, 3, 6, 9].includes(mesAtual);
  if (primeiroMesTrimestre && agora.getDate() <= 5) {
    const trimestreAnterior = Math.floor((agora.getMonth() - 3) / 3) * 3;
    const inicioPeriodoAnterior = new Date(agora.getFullYear(), trimestreAnterior, 1);
    if (!ultimoTrimestral || new Date(ultimoTrimestral.dataInicio) < inicioPeriodoAnterior) {
      lembretes.push({
        periodo: 'trimestre_anterior',
        mensagem: 'Está na altura de gerar o Resumo Global do Trimestre Anterior',
        cor: 'purple',
        ultimoResumo: ultimoTrimestral
      });
    }
  }
  
  // Semestral - primeiros 5 dias do semestre (jan, jul)
  const primeiroMesSemestre = [0, 6].includes(mesAtual);
  if (primeiroMesSemestre && agora.getDate() <= 5) {
    const semestreAnterior = agora.getMonth() < 6 ? -6 : 0;
    const inicioPeriodoAnterior = new Date(agora.getFullYear(), semestreAnterior, 1);
    if (!ultimoSemestral || new Date(ultimoSemestral.dataInicio) < inicioPeriodoAnterior) {
      lembretes.push({
        periodo: 'semestre_anterior',
        mensagem: 'Está na altura de gerar o Resumo Global do Semestre Anterior',
        cor: 'emerald',
        ultimoResumo: ultimoSemestral
      });
    }
  }
  
  // Anual - primeiros 5 dias do ano (janeiro)
  if (mesAtual === 0 && agora.getDate() <= 5) {
    const inicioPeriodoAnterior = new Date(agora.getFullYear() - 1, 0, 1);
    if (!ultimoAnual || new Date(ultimoAnual.dataInicio) < inicioPeriodoAnterior) {
      lembretes.push({
        periodo: 'ano_anterior',
        mensagem: 'Está na altura de gerar o Resumo Global do Ano Anterior',
        cor: 'amber',
        ultimoResumo: ultimoAnual
      });
    }
  }

  if (lembretes.length === 0) return null;

  return (
    <>
      {lembretes.map((lembrete, index) => (
        <Alert key={index} className={`border-${lembrete.cor}-500 bg-${lembrete.cor}-50 text-${lembrete.cor}-900 dark:bg-${lembrete.cor}-950/30 dark:text-${lembrete.cor}-200`}>
          <Calendar className="h-4 w-4" />
          <AlertTitle>Lembrete: Resumo Global {lembrete.periodo === 'mes_anterior' ? 'Mês Anterior' : lembrete.periodo === 'trimestre_anterior' ? 'Trimestre Anterior' : lembrete.periodo === 'semestre_anterior' ? 'Semestre Anterior' : 'Ano Anterior'}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{lembrete.mensagem}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/resumos-globais')}
              className={`border-${lembrete.cor}-500 text-${lembrete.cor}-700 hover:bg-${lembrete.cor}-100 dark:text-${lembrete.cor}-200 dark:hover:bg-${lembrete.cor}-950`}
            >
              Gerar Resumo
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </>
  );
}

export default function Dashboard() {
  const { user: realUser } = useAuth();
  const { isDemo } = useDemo();
  const [, setLocation] = useLocation();
  const { language, t } = useLanguage();
  
  // Em modo demo, usar utilizador demo
  const user = isDemo ? demoUser : realUser;
  const isAdmin = user?.role === "admin";
  const isGestor = user?.role === "gestor";
  const [showReminder, setShowReminder] = useState(false);
  const [showRelatorioBoard, setShowRelatorioBoard] = useState(false);

  // Queries reais (desativadas em modo demo)
  const { data: lojasReais } = trpc.lojas.list.useQuery(undefined, { enabled: isAdmin && !isDemo });
  const { data: gestoresReais } = trpc.gestores.list.useQuery(undefined, { enabled: isAdmin && !isDemo });
  const { data: minhasLojasReais } = trpc.lojas.getByGestor.useQuery(undefined, { enabled: isGestor && !isDemo });
  const { data: relatoriosLivresReais } = trpc.relatoriosLivres.list.useQuery(undefined, { enabled: !isDemo });
  const { data: relatoriosCompletosReais } = trpc.relatoriosCompletos.list.useQuery(undefined, { enabled: !isDemo });
  const { data: pendentesReais } = trpc.pendentes.list.useQuery(undefined, { enabled: !isDemo });
  const { data: reunioesLojasReais } = trpc.reunioesLojas.listar.useQuery(undefined, { enabled: !isDemo });
  
  // Usar dados demo ou reais
  const lojas = isDemo ? demoLojas : lojasReais;
  const gestores = isDemo ? demoGestores : gestoresReais;
  const minhasLojas = isDemo ? demoLojas.slice(0, 3) : minhasLojasReais;
  const relatoriosLivres = isDemo ? demoRelatoriosLivres : relatoriosLivresReais;
  const relatoriosCompletos = isDemo ? demoRelatoriosCompletos : relatoriosCompletosReais;
  const pendentes = isDemo ? demoPendentes : pendentesReais;
  const reunioesLojas = isDemo ? [] : reunioesLojasReais;
  
  // Progresso e atrasos de relatórios (apenas para gestor)
  const { data: progressoLojas } = trpc.lojas.getProgressoGestor.useQuery(undefined, { enabled: isGestor });
  const { data: atrasosLojas } = trpc.lojas.getAtrasosGestor.useQuery(undefined, { enabled: isGestor });
  
  // Verificar se precisa mostrar lembrete de relatório IA
  const { data: reminderCheck } = trpc.gestores.checkReminder.useQuery(undefined, { enabled: isGestor });
  const dismissReminderMutation = trpc.gestores.dismissReminder.useMutation();
  
  useEffect(() => {
    if (reminderCheck?.needed && isGestor) {
      setShowReminder(true);
    }
  }, [reminderCheck, isGestor]);
  
  const handleDismissReminder = () => {
    setShowReminder(false);
    dismissReminderMutation.mutate();
  };
  
  // Contagem de itens não vistos (apenas para admin)
  const { data: relLivresNaoVistos } = trpc.relatoriosLivres.countNaoVistos.useQuery(undefined, { enabled: isAdmin });
  const { data: relCompletosNaoVistos } = trpc.relatoriosCompletos.countNaoVistos.useQuery(undefined, { enabled: isAdmin });
  const { data: pendentesNaoVistos } = trpc.pendentes.countNaoVistos.useQuery(undefined, { enabled: isAdmin });
  
  // Contagem de alertas pendentes
  const { data: alertasReais } = trpc.alertas.list.useQuery(undefined, { enabled: !isDemo });
  const alertas = isDemo ? demoAlertas : alertasReais;
  
  // Resultados do mês anterior (para quadro de resumo)
  const mesAnterior = useMemo(() => {
    const hoje = new Date();
    const mes = hoje.getMonth() === 0 ? 12 : hoje.getMonth();
    const ano = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    return { mes, ano };
  }, []);
  
  const { data: resultadosMesAnterior } = trpc.resultados.estatisticas.useQuery({
    mes: mesAnterior.mes,
    ano: mesAnterior.ano,
  }, { enabled: isAdmin });
  
  const { data: totaisMesAnterior } = trpc.resultados.totaisGlobais.useQuery({
    mes: mesAnterior.mes,
    ano: mesAnterior.ano,
  }, { enabled: isAdmin });
  
  // Resultados do mês anterior para gestor (baseado nas suas lojas)
  const minhasLojasIds = useMemo(() => minhasLojas?.map((l: any) => l.id) || [], [minhasLojas]);
  
  const { data: resultadosMesAnteriorGestor } = trpc.resultados.estatisticas.useQuery({
    mes: mesAnterior.mes,
    ano: mesAnterior.ano,
    lojasIds: minhasLojasIds,
  }, { enabled: isGestor && minhasLojasIds.length > 0 });
  
  // Contagem de tarefas pendentes atribuídas ao utilizador
  const { data: tarefasPendentesAMim = 0 } = trpc.todos.countPendentesAtribuidosAMim.useQuery();
  
  // Contagem de tarefas NÃO VISTAS pelo gestor (para animação pulse)
  const { data: tarefasNaoVistas = 0 } = trpc.todos.countNaoVistosGestor.useQuery();
  
  // Previsões e Feed de Atividades (apenas admin)
  const { data: previsoes, isLoading: previsoesLoading, refetch: refetchPrevisoes } = trpc.previsoes.list.useQuery(undefined, { enabled: isAdmin && !isDemo });
  const { data: atividadesReais, isLoading: atividadesLoading } = trpc.atividades.list.useQuery({ limite: 20 }, { enabled: isAdmin && !isDemo });
  const atividades = isDemo ? demoAtividadeRecente : atividadesReais;
  const gerarPrevisoesMutation = trpc.previsoes.gerarEGuardar.useMutation({
    onSuccess: () => refetchPrevisoes(),
  });
  const alertasPendentes = alertas?.filter((a: any) => a.status === 'pendente').length || 0;
  
  // Calcular totais para dica IA
  const totalLojas = isAdmin ? (lojas?.length || 0) : (minhasLojas?.length || 0);
  const totalGestores = gestores?.length || 0;
  const pendentesAtivos = pendentes?.filter((p: any) => !p.resolvido).length || 0;
  
  // Query para dica IA
  const [dicaKey, setDicaKey] = useState(0);
  const { data: dicaData, isLoading: dicaLoading, refetch: refetchDica } = trpc.dicaIA.gerar.useQuery(
    {
      totalLojas,
      totalGestores,
      relatoriosLivresMes: relatoriosLivres?.filter((r: any) => {
        const d = new Date(r.dataVisita);
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        return d >= inicioMes;
      }).length || 0,
      relatoriosCompletosMes: relatoriosCompletos?.filter((r: any) => {
        const d = new Date(r.dataVisita);
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        return d >= inicioMes;
      }).length || 0,
      pendentesAtivos,
      alertasPendentes,
      language,
    },
    { 
      enabled: !!user && totalLojas >= 0,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    }
  );

  // Calcular pendentes antigos (mais de 7 dias)
  const pendentesAntigos = useMemo(() => {
    if (!pendentes) return [];
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    return pendentes.filter((p: any) => !p.resolvido && new Date(p.createdAt) < seteDiasAtras);
  }, [pendentes]);

  // Calcular estatísticas do mês atual e anterior
  const estatisticas = useMemo(() => {
    const hoje = new Date();
    const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

    // Relatórios livres
    const relLivresMesAtual = relatoriosLivres?.filter((r: any) => new Date(r.dataVisita) >= inicioMesAtual).length || 0;
    const relLivresMesAnterior = relatoriosLivres?.filter((r: any) => {
      const d = new Date(r.dataVisita);
      return d >= inicioMesAnterior && d <= fimMesAnterior;
    }).length || 0;

    // Relatórios completos
    const relCompletosMesAtual = relatoriosCompletos?.filter((r: any) => new Date(r.dataVisita) >= inicioMesAtual).length || 0;
    const relCompletosMesAnterior = relatoriosCompletos?.filter((r: any) => {
      const d = new Date(r.dataVisita);
      return d >= inicioMesAnterior && d <= fimMesAnterior;
    }).length || 0;

    // Pendentes criados
    const pendentesMesAtual = pendentes?.filter((p: any) => new Date(p.createdAt) >= inicioMesAtual).length || 0;
    const pendentesMesAnterior = pendentes?.filter((p: any) => {
      const d = new Date(p.createdAt);
      return d >= inicioMesAnterior && d <= fimMesAnterior;
    }).length || 0;

    return {
      relLivres: { atual: relLivresMesAtual, anterior: relLivresMesAnterior },
      relCompletos: { atual: relCompletosMesAtual, anterior: relCompletosMesAnterior },
      pendentes: { atual: pendentesMesAtual, anterior: pendentesMesAnterior }
    };
  }, [relatoriosLivres, relatoriosCompletos, pendentes]);

  // Dados para gráfico de visitas por mês
  const visitasPorMes = useMemo(() => {
    const meses: { [key: string]: number } = {};
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses[data.toLocaleDateString('pt-PT', { month: 'short' })] = 0;
    }
    relatoriosLivres?.forEach((r: any) => {
      const key = new Date(r.dataVisita).toLocaleDateString('pt-PT', { month: 'short' });
      if (meses[key] !== undefined) meses[key]++;
    });
    relatoriosCompletos?.forEach((r: any) => {
      const key = new Date(r.dataVisita).toLocaleDateString('pt-PT', { month: 'short' });
      if (meses[key] !== undefined) meses[key]++;
    });
    return Object.entries(meses).map(([label, value]) => ({ label, value }));
  }, [relatoriosLivres, relatoriosCompletos]);

  // Dados para gráfico de pendentes por loja
  const pendentesPorLoja = useMemo(() => {
    if (!pendentes) return [];
    const porLoja: { [key: string]: number } = {};
    pendentes.forEach((p: any) => {
      if (p.resolvido) return;
      const nomeLoja = p.loja?.nome || 'Sem loja';
      porLoja[nomeLoja] = (porLoja[nomeLoja] || 0) + 1;
    });
    return Object.entries(porLoja)
      .map(([label, value]) => ({ label, value, color: 'bg-orange-500' }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [pendentes]);

  // Gerar relatório mensal PDF
  const gerarRelatorioMensal = () => {
    const mesAtual = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    const relatoriosMes = [
      ...(relatoriosLivres?.filter((r: any) => new Date(r.dataVisita) >= inicioMes) || []),
      ...(relatoriosCompletos?.filter((r: any) => new Date(r.dataVisita) >= inicioMes) || [])
    ];
    const porLoja: { [key: string]: any[] } = {};
    relatoriosMes.forEach((r: any) => {
      const nomeLoja = r.loja?.nome || 'Sem loja';
      if (!porLoja[nomeLoja]) porLoja[nomeLoja] = [];
      porLoja[nomeLoja].push(r);
    });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório Mensal - ${mesAtual}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{color:#1a56db;border-bottom:2px solid #1a56db;padding-bottom:10px}h2{color:#374151;margin-top:30px}.stats{display:flex;gap:20px;margin:20px 0}.stat-card{background:#f3f4f6;padding:15px;border-radius:8px;flex:1}.stat-value{font-size:24px;font-weight:bold;color:#1a56db}.stat-label{font-size:12px;color:#6b7280}table{width:100%;border-collapse:collapse;margin-top:15px}th,td{border:1px solid #e5e7eb;padding:10px;text-align:left}th{background:#f9fafb;font-weight:600}.loja-section{margin-top:30px;page-break-inside:avoid}.footer{margin-top:40px;text-align:center;color:#9ca3af;font-size:12px}</style></head>
    <body><h1>📊 Relatório Mensal Consolidado</h1><p><strong>Período:</strong> ${mesAtual}</p><p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-PT')}</p>
    <div class="stats"><div class="stat-card"><div class="stat-value">${relatoriosMes.length}</div><div class="stat-label">Total de Visitas</div></div>
    <div class="stat-card"><div class="stat-value">${Object.keys(porLoja).length}</div><div class="stat-label">Lojas Visitadas</div></div>
    <div class="stat-card"><div class="stat-value">${pendentes?.filter((p: any) => !p.resolvido).length || 0}</div><div class="stat-label">Pendentes Ativos</div></div></div>
    <h2>📍 Resumo por Loja</h2>${Object.entries(porLoja).map(([loja, rels]) => `<div class="loja-section"><h3>${loja}</h3><p><strong>${rels.length}</strong> visita(s) este mês</p>
    <table><thead><tr><th>Data</th><th>Tipo</th><th>{language === 'pt' ? "Descrição" : "Description"}</th></tr></thead><tbody>${rels.map((r: any) => `<tr><td>${new Date(r.dataVisita).toLocaleDateString('pt-PT')}</td><td>${r.descricao !== undefined ? 'Livre' : 'Completo'}</td><td>${r.descricao || r.resumoSupervisao || '-'}</td></tr>`).join('')}</tbody></table></div>`).join('')}
    ${pendentesAntigos.length > 0 ? `<h2>⚠️ Pendentes há mais de 7 dias</h2><table><thead><tr><th>{language === 'pt' ? "Loja" : "Store"}</th><th>{language === 'pt' ? "Descrição" : "Description"}</th><th>Criado em</th></tr></thead><tbody>${pendentesAntigos.map((p: any) => `<tr><td>${p.loja?.nome || '-'}</td><td>${p.descricao}</td><td>${new Date(p.createdAt).toLocaleDateString('pt-PT')}</td></tr>`).join('')}</tbody></table>` : ''}
     <div class="footer"><p>PoweringEG Platform 2.0 - Relatório gerado automaticamente</p></div></body></html>`;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); setTimeout(() => printWindow.print(), 500); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Botões de ação - mobile: lado a lado no topo, desktop: à direita */}
        <div className="flex md:hidden gap-2 justify-end">
          {isAdmin ? (
            <Button onClick={() => setLocation('/relatorios-ia')} variant="outline" size="sm" className="gap-1.5 flex-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs">{language === 'pt' ? 'Relatórios IA' : 'AI Reports'}</span>
            </Button>
          ) : (
            <Button onClick={gerarRelatorioMensal} variant="outline" size="sm" className="gap-1.5 flex-1">
              <Download className="h-4 w-4" />
              <span className="text-xs">{language === 'pt' ? 'Relatório' : 'Report'}</span>
            </Button>
          )}
          <Button 
            onClick={() => setLocation('/todos?filtro=atribuidas')} 
            variant="outline" 
            size="sm"
            className={`gap-1.5 flex-1 relative ${tarefasNaoVistas > 0 ? 'animate-pulse border-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50' : ''}`}
          >
            <CheckSquare className="h-4 w-4" />
            <span className="text-xs">{language === 'pt' ? 'Tarefas' : 'Tasks'}</span>
            {tarefasPendentesAMim > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {tarefasPendentesAMim}
              </span>
            )}
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                {t('dashboard.welcome')}, {user?.name || (language === 'pt' ? 'Utilizador' : 'User')}
                <img 
                  src="/eglass-logo.png" 
                  alt="ExpressGlass Logo" 
                  className="hidden md:block h-14 w-auto object-contain"
                />
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">{t('dashboard.welcomeSubtitle')}</p>
              <div className="flex items-start gap-2 mt-2 max-w-full">
                <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs md:text-sm text-muted-foreground italic break-words">
                  {dicaLoading ? (
                    <span className="animate-pulse">{language === 'pt' ? 'A gerar dica...' : 'Generating tip...'}</span>
                  ) : (
                    dicaData?.dica || (language === 'pt' ? "Tudo em ordem! Continua o bom trabalho." : "Everything in order! Keep up the good work.")
                  )}
                </p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => refetchDica()}
                  disabled={dicaLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${dicaLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
          {/* Botões desktop - escondidos em mobile */}
          <div className="hidden md:flex flex-col gap-2">
            {isAdmin ? (
              <Button onClick={() => setLocation('/relatorios-ia')} variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />{language === 'pt' ? 'Relatórios IA' : 'AI Reports'}
              </Button>
            ) : (
              <Button onClick={gerarRelatorioMensal} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />{language === 'pt' ? 'Relatório Mensal' : 'Monthly Report'}
              </Button>
            )}
            <Button 
              onClick={() => setLocation('/todos?filtro=atribuidas')} 
              variant="outline" 
              className={`gap-2 relative ${tarefasNaoVistas > 0 ? 'animate-pulse border-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50' : ''}`}
            >
              <CheckSquare className="h-4 w-4" />
              {language === 'pt' ? 'Minhas Tarefas' : 'My Tasks'}
              {tarefasPendentesAMim > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {tarefasPendentesAMim}
                </span>
              )}
            </Button>
          </div>
        </div>

        {pendentesAntigos.length > 0 && (
          <Alert variant="destructive" className="border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('dashboard.atencaoPendentes')}</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{t('dashboard.existem')} <strong>{pendentesAntigos.length}</strong> {t('dashboard.pendentesHaMais')}</span>
              <Button variant="outline" size="sm" onClick={() => setLocation('/pendentes')} className="border-orange-500 text-orange-700 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-orange-950">{t('dashboard.verPendentes')}</Button>
            </AlertDescription>
          </Alert>
        )}
        
        {isGestor && atrasosLojas && atrasosLojas.length > 0 && (
          <Alert className="border-red-500 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200">
            <Clock className="h-4 w-4" />
            <AlertTitle>{language === 'pt' ? 'Atenção: Lojas com relatórios em atraso' : 'Attention: Stores with overdue reports'}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="mb-3">{language === 'pt' ? 'As seguintes lojas estão abaixo do mínimo mensal esperado:' : 'The following stores are below the expected monthly minimum:'}</p>
              <div className="space-y-2">
                {atrasosLojas.map((atraso) => (
                  <div key={atraso.lojaId} className="flex items-center justify-between bg-white dark:bg-red-950/50 p-2 rounded border border-red-200 dark:border-red-800">
                    <div>
                      <p className="font-semibold">{atraso.lojaNome}</p>
                      <div className="text-xs space-y-0.5 mt-1">
                        {atraso.emAtrasoLivres && (
                          <p>📄 Livres: {atraso.realizadosLivres}/{atraso.minimoLivres} (mínimo mensal)</p>
                        )}
                        {atraso.emAtrasoCompletos && (
                          <p>📊 Completos: {atraso.realizadosCompletos}/{atraso.minimoCompletos} (mínimo mensal)</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setLocation('/relatorios')}
                      className="border-red-500 text-red-700 hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-950"
                    >
                      Criar Relatório
                    </Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Lembretes de Resumos Globais */}
        <LembretesResumosGlobais isAdmin={isAdmin} isGestor={isGestor} setLocation={setLocation} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <>
              <Card 
                className="bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
                onClick={() => setLocation('/lojas')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.totalLojas')}</CardTitle>
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{lojas?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.lojasAtivas')}</p>
                </CardContent>
              </Card>

              <Card 
                className="bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
                onClick={() => setLocation('/gestores')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.gestores')}</CardTitle>
                  <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{gestores?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.gestoresAtivos')}</p>
                </CardContent>
              </Card>
            </>
          )}

          {isGestor && (
            <Card 
              className="bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
              onClick={() => setLocation('/minhas-lojas')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{language === 'pt' ? 'Minhas Lojas' : 'My Stores'}</CardTitle>
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{minhasLojas?.length || 0}</div>
                <p className="text-xs text-muted-foreground">{language === 'pt' ? 'Lojas sob sua gestão' : 'Stores under your management'}</p>
              </CardContent>
            </Card>
          )}

          <Card 
            className={`bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200 ${(relLivresNaoVistos || 0) > 0 ? 'animate-soft-pulse-emerald' : ''}`}
            onClick={() => setLocation('/relatorios?tipo=livres')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {language === 'pt' ? 'Relatórios Livres' : 'Free Reports'}
                {isAdmin && (relLivresNaoVistos || 0) > 0 && (
                  <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {relLivresNaoVistos} novo{relLivresNaoVistos !== 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{relatoriosLivres?.length || 0}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{language === 'pt' ? 'Este mês' : 'This month'}: {estatisticas.relLivres.atual}</p>
                <VariationIndicator current={estatisticas.relLivres.atual} previous={estatisticas.relLivres.anterior} suffix={language === 'pt' ? ' vs mês ant.' : ' vs prev month'} language={language} />
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`bg-teal-100 dark:bg-teal-900/50 border-teal-300 dark:border-teal-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200 ${(relCompletosNaoVistos || 0) > 0 ? 'animate-soft-pulse-teal' : ''}`}
            onClick={() => setLocation('/relatorios?tipo=completos')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {language === 'pt' ? 'Relatórios Completos' : 'Complete Reports'}
                {isAdmin && (relCompletosNaoVistos || 0) > 0 && (
                  <span className="bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {relCompletosNaoVistos} novo{relCompletosNaoVistos !== 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
              <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{relatoriosCompletos?.length || 0}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{language === 'pt' ? 'Este mês' : 'This month'}: {estatisticas.relCompletos.atual}</p>
                <VariationIndicator current={estatisticas.relCompletos.atual} previous={estatisticas.relCompletos.anterior} suffix={language === 'pt' ? ' vs mês ant.' : ' vs prev month'} language={language} />
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200 ${(pendentesNaoVistos || 0) > 0 ? 'animate-soft-pulse-amber' : ''}`}
            onClick={() => setLocation('/pendentes')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {t('dashboard.pendentes')}
                {isAdmin && (pendentesNaoVistos || 0) > 0 && (
                  <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {pendentesNaoVistos} novo{pendentesNaoVistos !== 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
              <ListTodo className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{pendentes?.filter((p: any) => !p.resolvido).length || 0}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{language === 'pt' ? 'Novos este mês' : 'New this month'}: {estatisticas.pendentes.atual}</p>
                <VariationIndicator current={estatisticas.pendentes.atual} previous={estatisticas.pendentes.anterior} suffix={language === 'pt' ? ' vs mês ant.' : ' vs prev month'} language={language} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Card Resultados Mês Anterior - Apenas Admin */}
          {isAdmin && (
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <BarChart3 className="h-4 w-4" />
                  {language === 'pt' ? 'Resultados' : 'Results'} {mesAnterior.mes === 12 ? (language === 'pt' ? 'Dezembro' : 'December') : new Date(2024, mesAnterior.mes - 1).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { month: 'long' })} {mesAnterior.ano}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resultadosMesAnterior || totaisMesAnterior ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {totaisMesAnterior?.totalServicos?.toLocaleString('pt-PT') || resultadosMesAnterior?.somaServicos?.toLocaleString('pt-PT') || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{language === 'pt' ? 'Total Serviços' : 'Total Services'}</div>
                      </div>
                      <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {totaisMesAnterior?.taxaReparacao ? `${(totaisMesAnterior.taxaReparacao * 100).toFixed(1)}%` : resultadosMesAnterior?.mediaTaxaReparacao ? `${(resultadosMesAnterior.mediaTaxaReparacao * 100).toFixed(1)}%` : '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{language === 'pt' ? 'Taxa Reparação' : 'Repair Rate'}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                        <div className={`text-xl font-bold ${(resultadosMesAnterior?.mediaDesvioPercentual ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {resultadosMesAnterior?.mediaDesvioPercentual !== undefined && resultadosMesAnterior?.mediaDesvioPercentual !== null
                            ? `${resultadosMesAnterior.mediaDesvioPercentual >= 0 ? '+' : ''}${resultadosMesAnterior.mediaDesvioPercentual.toFixed(1)}%`
                            : '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{language === 'pt' ? 'Desvio vs Objetivo' : 'Deviation vs Target'}</div>
                      </div>
                      <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {resultadosMesAnterior?.lojasAcimaObjetivo ?? '—'}/{resultadosMesAnterior?.totalLojas ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{language === 'pt' ? 'Lojas Acima Obj.' : 'Stores Above Target'}</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 border-indigo-300 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                      onClick={() => setLocation('/resultados-dashboard')}
                    >
                      {language === 'pt' ? 'Ver Dashboard Completo' : 'View Full Dashboard'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{language === 'pt' ? 'Sem dados do mês anterior' : 'No data from previous month'}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setLocation('/resultados-dashboard')}
                    >
                      {language === 'pt' ? 'Importar Resultados' : 'Import Results'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <Card className={isAdmin ? '' : 'md:col-span-2'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />{language === 'pt' ? 'Evolução de Visitas' : 'Visit Evolution'}</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleLineChart data={visitasPorMes} title={language === 'pt' ? 'Visitas por mês (últimos 6 meses)' : 'Visits per month (last 6 months)'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListTodo className="h-4 w-4" />{language === 'pt' ? 'Pendentes por Loja' : 'Pending by Store'}</CardTitle>
            </CardHeader>
            <CardContent>
              {pendentesPorLoja.length > 0 ? (
                <SimpleBarChart data={pendentesPorLoja} title={language === 'pt' ? 'Top 5 lojas com mais pendentes' : 'Top 5 stores with most pending items'} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{language === 'pt' ? 'Nenhum pendente ativo' : 'No active pending items'}</p>
              )}
            </CardContent>
          </Card>
          
          {isGestor && progressoLojas && progressoLojas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />{language === 'pt' ? 'Progresso de Relatórios' : 'Report Progress'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-3">{language === 'pt' ? 'Mínimos mensais por loja' : 'Monthly minimums per store'}</p>
                  {progressoLojas.map((progresso) => (
                    <div key={progresso.lojaId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{progresso.lojaNome}</span>
                        <span className="text-xs text-muted-foreground">
                          {progresso.minimoLivres === 0 && progresso.minimoCompletos === 0 ? language === 'pt' ? 'Sem mínimo' : 'No minimum' : ''}
                        </span>
                      </div>
                      
                      {progresso.minimoLivres > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Livres: {progresso.realizadosLivres}/{progresso.minimoLivres}</span>
                            <span className={progresso.emAtrasoLivres ? 'text-red-600 font-semibold' : 'text-green-600'}>
                              {progresso.percentualLivres}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                progresso.emAtrasoLivres ? 'bg-red-500' : 
                                progresso.percentualLivres >= 100 ? 'bg-green-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.min(progresso.percentualLivres, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {progresso.minimoCompletos > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Completos: {progresso.realizadosCompletos}/{progresso.minimoCompletos}</span>
                            <span className={progresso.emAtrasoCompletos ? 'text-red-600 font-semibold' : 'text-green-600'}>
                              {progresso.percentualCompletos}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                progresso.emAtrasoCompletos ? 'bg-red-500' : 
                                progresso.percentualCompletos >= 100 ? 'bg-green-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.min(progresso.percentualCompletos, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Card Resultados Mês Anterior - Apenas Gestor */}
          {isGestor && minhasLojasIds.length > 0 && (
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <BarChart3 className="h-4 w-4" />
                  {language === 'pt' ? 'Resultados' : 'Results'} {mesAnterior.mes === 12 ? (language === 'pt' ? 'Dezembro' : 'December') : new Date(2024, mesAnterior.mes - 1).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { month: 'long' })} {mesAnterior.ano}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resultadosMesAnteriorGestor ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {resultadosMesAnteriorGestor.somaServicos?.toLocaleString('pt-PT') || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{language === 'pt' ? 'Total Serviços' : 'Total Services'}</div>
                      </div>
                      <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {resultadosMesAnteriorGestor.mediaTaxaReparacao ? `${(resultadosMesAnteriorGestor.mediaTaxaReparacao * 100).toFixed(1)}%` : '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{language === 'pt' ? 'Taxa Reparação' : 'Repair Rate'}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                        <div className={`text-xl font-bold ${(resultadosMesAnteriorGestor.mediaDesvioPercentual ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {resultadosMesAnteriorGestor.mediaDesvioPercentual !== undefined && resultadosMesAnteriorGestor.mediaDesvioPercentual !== null
                            ? `${resultadosMesAnteriorGestor.mediaDesvioPercentual >= 0 ? '+' : ''}${(resultadosMesAnteriorGestor.mediaDesvioPercentual * 100).toFixed(1)}%`
                            : '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{language === 'pt' ? 'Desvio vs Objetivo' : 'Deviation vs Target'}</div>
                      </div>
                      <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {resultadosMesAnteriorGestor.lojasAcimaObjetivo ?? '—'}/{resultadosMesAnteriorGestor.totalLojas ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{language === 'pt' ? 'Lojas Acima Obj.' : 'Stores Above Target'}</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 border-indigo-300 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                      onClick={() => setLocation('/resultados-dashboard')}
                    >
                      {language === 'pt' ? 'Ver Dashboard Completo' : 'View Full Dashboard'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{language === 'pt' ? 'Sem dados do mês anterior' : 'No data from previous month'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{language === 'pt' ? 'Aguarde importação de resultados' : 'Awaiting results import'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

{/* Seção de Previsões e Feed de Atividades - Apenas Admin */}
        {isAdmin && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Card de Previsões da IA */}
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-600" />
                  {language === 'pt' ? 'Previsões da Semana' : 'Weekly Predictions'}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => gerarPrevisoesMutation.mutate()}
                  disabled={gerarPrevisoesMutation.isPending}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  {gerarPrevisoesMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  <span className="ml-1">{language === 'pt' ? 'Analisar' : 'Analyze'}</span>
                </Button>
              </CardHeader>
              <CardContent>
                {previsoesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : previsoes && previsoes.length > 0 ? (
                  <div className="space-y-3">
                    {previsoes.slice(0, 5).map((previsao: any) => (
                      <div
                        key={previsao.id}
                        className={`p-3 rounded-lg border ${
                          previsao.probabilidade >= 70
                            ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                            : previsao.probabilidade >= 40
                            ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">{previsao.lojaNome}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                previsao.probabilidade >= 70
                                  ? 'bg-red-500 text-white'
                                  : previsao.probabilidade >= 40
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-blue-500 text-white'
                              }`}>
                                {previsao.probabilidade}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{previsao.descricao}</p>
                            {previsao.sugestaoAcao && (
                              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                {previsao.sugestaoAcao}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{language === 'pt' ? 'Nenhuma previsão ativa' : 'No active predictions'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{language === 'pt' ? 'Clique em "Analisar" para gerar previsões' : 'Click "Analyze" to generate predictions'}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card de Feed de Atividades */}
            <Card className="border-indigo-200 dark:border-indigo-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  {language === 'pt' ? 'Feed de Atividades' : 'Activity Feed'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {atividadesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : atividades && atividades.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {atividades.map((atividade: any) => {
                      const tipoIcons: Record<string, any> = {
                        visita_realizada: <MapPin className="h-3 w-3 text-green-600" />,
                        relatorio_livre: <ClipboardList className="h-3 w-3 text-emerald-600" />,
                        relatorio_completo: <FileText className="h-3 w-3 text-teal-600" />,
                        pendente_criado: <ListTodo className="h-3 w-3 text-amber-600" />,
                        pendente_resolvido: <CheckCircle className="h-3 w-3 text-green-600" />,
                        alerta_gerado: <AlertTriangle className="h-3 w-3 text-red-600" />,
                        alerta_resolvido: <CheckCircle className="h-3 w-3 text-green-600" />,
                        gestor_criado: <Building2 className="h-3 w-3 text-blue-600" />,
                        loja_criada: <Building2 className="h-3 w-3 text-purple-600" />,
                      };
                      const icon = tipoIcons[atividade.tipo] || <Activity className="h-3 w-3" />;
                      
                      return (
                        <div key={atividade.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              {atividade.gestorNome && (
                                <span className="font-medium">{atividade.gestorNome}</span>
                              )}
                              {atividade.gestorNome && ' - '}
                              {atividade.descricao}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {atividade.lojaNome && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {atividade.lojaNome}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(atividade.createdAt).toLocaleString('pt-PT', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{language === 'pt' ? 'Nenhuma atividade registada' : 'No activity recorded'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" />{language === 'pt' ? 'Atividade Recente' : 'Recent Activity'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  // Combinar relatórios livres, completos e reuniões de lojas, ordenar por data
                  const todasAtividades = [
                    ...(relatoriosLivres?.map((r: any) => ({ ...r, tipo: 'livre', dataAtividade: r.dataVisita })) || []),
                    ...(relatoriosCompletos?.map((r: any) => ({ ...r, tipo: 'completo', dataAtividade: r.dataVisita })) || []),
                    ...(reunioesLojas?.map((r: any) => ({ 
                      ...r, 
                      tipo: 'reuniao', 
                      dataAtividade: r.data,
                      lojaNome: r.lojasNomes?.join(', ') || 'Loja'
                    })) || [])
                  ].sort((a, b) => new Date(b.dataAtividade).getTime() - new Date(a.dataAtividade).getTime());
                  
                  if (todasAtividades.length === 0) {
                    return <p className="text-sm text-muted-foreground text-center py-4">{language === 'pt' ? 'Nenhuma atividade recente' : 'No recent activity'}</p>;
                  }
                  
                  return todasAtividades.slice(0, 5).map((atividade: any) => (
                    <div key={`${atividade.tipo}-${atividade.id}`} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{atividade.tipo === 'reuniao' ? atividade.lojaNome : (atividade.loja?.nome || "Loja")}</p>
                        <p className="text-xs text-muted-foreground">{new Date(atividade.dataAtividade).toLocaleDateString("pt-PT")}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        atividade.tipo === 'completo' 
                          ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' 
                          : atividade.tipo === 'reuniao'
                            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300'
                            : 'bg-primary/10 text-primary'
                      }`}>
                        {atividade.tipo === 'completo' 
                          ? (language === 'pt' ? 'Relatório Completo' : 'Complete Report') 
                          : atividade.tipo === 'reuniao'
                            ? (language === 'pt' ? 'Reunião Loja' : 'Store Meeting')
                            : (language === 'pt' ? 'Relatório Livre' : 'Quick Report')}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'pt' ? 'Pendentes Recentes' : 'Recent Pending Items'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendentes?.filter((p: any) => !p.resolvido).slice(0, 5).map((pendente: any) => {
                  const diasAtras = Math.floor((Date.now() - new Date(pendente.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                  const isAntigo = diasAtras > 7;
                  return (
                    <div key={pendente.id} className={`flex items-start justify-between border-b pb-2 last:border-0 ${isAntigo ? 'bg-orange-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{pendente.loja?.nome || "Loja"}</p>
                          {isAntigo && <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">{diasAtras} {language === 'pt' ? 'dias' : 'days'}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{pendente.descricao}</p>
                      </div>
                    </div>
                  );
                })}
                {(!pendentes || pendentes.filter((p: any) => !p.resolvido).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">{language === 'pt' ? 'Nenhum pendente' : 'No pending items'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <ReminderDialog 
        open={showReminder} 
        onDismiss={handleDismissReminder}
      />
      
      {/* Modal Relatório Board para Admin */}
      <RelatorioIACategorias
        open={showRelatorioBoard}
        onOpenChange={setShowRelatorioBoard}
      />
    </DashboardLayout>
  );
}
