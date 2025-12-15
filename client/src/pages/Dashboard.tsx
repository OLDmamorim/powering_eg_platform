import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Building2, ClipboardList, FileText, ListTodo, AlertTriangle, TrendingUp, TrendingDown, Calendar, Download, Minus } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

// Componente de indicador de variação
function VariationIndicator({ current, previous, suffix = "" }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> Sem variação</span>;
  }
  
  const variation = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isPositive = variation > 0;
  const isNeutral = variation === 0;
  
  if (isNeutral) {
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> Sem variação</span>;
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

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  const isGestor = user?.role === "gestor";

  const { data: lojas } = trpc.lojas.list.useQuery(undefined, { enabled: isAdmin });
  const { data: gestores } = trpc.gestores.list.useQuery(undefined, { enabled: isAdmin });
  const { data: minhasLojas } = trpc.lojas.getByGestor.useQuery(undefined, { enabled: isGestor });
  const { data: relatoriosLivres } = trpc.relatoriosLivres.list.useQuery();
  const { data: relatoriosCompletos } = trpc.relatoriosCompletos.list.useQuery();
  const { data: pendentes } = trpc.pendentes.list.useQuery();
  
  // Contagem de itens não vistos (apenas para admin)
  const { data: relLivresNaoVistos } = trpc.relatoriosLivres.countNaoVistos.useQuery(undefined, { enabled: isAdmin });
  const { data: relCompletosNaoVistos } = trpc.relatoriosCompletos.countNaoVistos.useQuery(undefined, { enabled: isAdmin });
  const { data: pendentesNaoVistos } = trpc.pendentes.countNaoVistos.useQuery(undefined, { enabled: isAdmin });

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
    <table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th></tr></thead><tbody>${rels.map((r: any) => `<tr><td>${new Date(r.dataVisita).toLocaleDateString('pt-PT')}</td><td>${r.descricao !== undefined ? 'Livre' : 'Completo'}</td><td>${r.descricao || r.resumoSupervisao || '-'}</td></tr>`).join('')}</tbody></table></div>`).join('')}
    ${pendentesAntigos.length > 0 ? `<h2>⚠️ Pendentes há mais de 7 dias</h2><table><thead><tr><th>Loja</th><th>Descrição</th><th>Criado em</th></tr></thead><tbody>${pendentesAntigos.map((p: any) => `<tr><td>${p.loja?.nome || '-'}</td><td>${p.descricao}</td><td>${new Date(p.createdAt).toLocaleDateString('pt-PT')}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="footer"><p>PoweringEG Platform - Relatório gerado automaticamente</p></div></body></html>`;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); setTimeout(() => printWindow.print(), 500); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Bem-vindo ao PoweringEG Platform</p>
          </div>
          <Button onClick={gerarRelatorioMensal} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />Relatório Mensal
          </Button>
        </div>

        {pendentesAntigos.length > 0 && (
          <Alert variant="destructive" className="border-orange-500 bg-orange-50 text-orange-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção: Pendentes por resolver</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Existem <strong>{pendentesAntigos.length}</strong> pendente(s) há mais de 7 dias sem resolução.</span>
              <Button variant="outline" size="sm" onClick={() => setLocation('/pendentes')} className="border-orange-500 text-orange-700 hover:bg-orange-100">Ver Pendentes</Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <>
              <Card 
                className="bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
                onClick={() => setLocation('/lojas')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Lojas</CardTitle>
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{lojas?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Lojas ativas na rede</p>
                </CardContent>
              </Card>

              <Card 
                className="bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
                onClick={() => setLocation('/gestores')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gestores</CardTitle>
                  <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{gestores?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Gestores registados</p>
                </CardContent>
              </Card>
            </>
          )}

          {isGestor && (
            <Card 
              className="bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
              onClick={() => setLocation('/lojas')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Minhas Lojas</CardTitle>
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{minhasLojas?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Lojas sob sua gestão</p>
              </CardContent>
            </Card>
          )}

          <Card 
            className={`bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200 ${(relLivresNaoVistos || 0) > 0 ? 'animate-soft-pulse-emerald' : ''}`}
            onClick={() => setLocation('/relatorios')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Relatórios Livres
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
                <p className="text-xs text-muted-foreground">Este mês: {estatisticas.relLivres.atual}</p>
                <VariationIndicator current={estatisticas.relLivres.atual} previous={estatisticas.relLivres.anterior} suffix=" vs mês ant." />
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`bg-teal-100 dark:bg-teal-900/50 border-teal-300 dark:border-teal-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200 ${(relCompletosNaoVistos || 0) > 0 ? 'animate-soft-pulse-teal' : ''}`}
            onClick={() => setLocation('/relatorios')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Relatórios Completos
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
                <p className="text-xs text-muted-foreground">Este mês: {estatisticas.relCompletos.atual}</p>
                <VariationIndicator current={estatisticas.relCompletos.atual} previous={estatisticas.relCompletos.anterior} suffix=" vs mês ant." />
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200 ${(pendentesNaoVistos || 0) > 0 ? 'animate-soft-pulse-amber' : ''}`}
            onClick={() => setLocation('/pendentes')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Pendentes
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
                <p className="text-xs text-muted-foreground">Novos este mês: {estatisticas.pendentes.atual}</p>
                <VariationIndicator current={estatisticas.pendentes.atual} previous={estatisticas.pendentes.anterior} suffix=" vs mês ant." />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Evolução de Visitas</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleLineChart data={visitasPorMes} title="Visitas por mês (últimos 6 meses)" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListTodo className="h-4 w-4" />Pendentes por Loja</CardTitle>
            </CardHeader>
            <CardContent>
              {pendentesPorLoja.length > 0 ? (
                <SimpleBarChart data={pendentesPorLoja} title="Top 5 lojas com mais pendentes" />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum pendente ativo</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" />Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {relatoriosLivres?.slice(0, 5).map((relatorio: any) => (
                  <div key={relatorio.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{relatorio.loja?.nome || "Loja"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(relatorio.dataVisita).toLocaleDateString("pt-PT")}</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Relatório Livre</span>
                  </div>
                ))}
                {(!relatoriosLivres || relatoriosLivres.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum relatório recente</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pendentes Recentes</CardTitle>
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
                          {isAntigo && <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">{diasAtras} dias</span>}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{pendente.descricao}</p>
                      </div>
                    </div>
                  );
                })}
                {(!pendentes || pendentes.filter((p: any) => !p.resolvido).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum pendente</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
