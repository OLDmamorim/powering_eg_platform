import { useState, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Loader2, ArrowRight, TrendingUp, TrendingDown, Minus, BarChart3, Target, Award, Users } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";

export function ComparacaoLojas() {
  const { language, t } = useLanguage();
  
  // Nomes dos meses traduzidos
  const mesesPT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesesEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mesesTrad = language === 'pt' ? mesesPT : mesesEN;
  
  // Estado dos filtros
  const [loja1Id, setLoja1Id] = useState<number | null>(null);
  const [loja2Id, setLoja2Id] = useState<number | null>(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<{ mes: number; ano: number } | null>(null);
  
  // Queries
  const { data: periodos, isLoading: loadingPeriodos } = trpc.resultados.periodos.useQuery();
  const { data: lojas, isLoading: loadingLojas } = trpc.lojas.getByGestor.useQuery();
  
  // Definir período padrão (mais recente)
  useMemo(() => {
    if (periodos && periodos.length > 0 && !periodoSelecionado) {
      setPeriodoSelecionado({ mes: periodos[0].mes, ano: periodos[0].ano });
    }
  }, [periodos, periodoSelecionado]);
  
  // Query de comparação (apenas quando ambas as lojas estão selecionadas)
  const { data: comparacao, isLoading: loadingComparacao } = trpc.resultados.compararLojas.useQuery(
    {
      lojaId1: loja1Id || 0,
      lojaId2: loja2Id || 0,
      mes: periodoSelecionado?.mes || 1,
      ano: periodoSelecionado?.ano || 2025,
    },
    { enabled: !!loja1Id && !!loja2Id && !!periodoSelecionado }
  );
  
  
  
  // Processar dados de comparação
  const dadosLoja1 = comparacao?.find(c => c.lojaId === loja1Id);
  const dadosLoja2 = comparacao?.find(c => c.lojaId === loja2Id);
  
  // Calcular diferenças percentuais
  const calcularDiferenca = (valor1: number | null, valor2: number | null): { percentual: number; melhor: 'loja1' | 'loja2' | 'empate' } => {
    if (!valor1 || !valor2) return { percentual: 0, melhor: 'empate' };
    const diff = ((valor1 - valor2) / Math.abs(valor2)) * 100;
    return {
      percentual: Math.abs(diff),
      melhor: diff > 0 ? 'loja1' : diff < 0 ? 'loja2' : 'empate'
    };
  };
  
  // Componente de indicador de diferença
  const IndicadorDiferenca = ({ valor1, valor2, formato = 'numero' }: { valor1: number | null; valor2: number | null; formato?: 'numero' | 'percentual' }) => {
    const diff = calcularDiferenca(valor1, valor2);
    
    if (diff.melhor === 'empate') {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
          <span className="text-sm">{language === 'pt' ? 'Igual' : 'Equal'}</span>
        </div>
      );
    }
    
    const isLoja1Melhor = diff.melhor === 'loja1';
    
    return (
      <div className={`flex items-center gap-1 ${isLoja1Melhor ? 'text-green-600' : 'text-red-600'}`}>
        {isLoja1Melhor ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <span className="text-sm font-medium">{diff.percentual.toFixed(1)}%</span>
      </div>
    );
  };
  
  // Gerar análise automática
  const gerarAnalise = () => {
    if (!dadosLoja1 || !dadosLoja2) return null;
    
    const analises: string[] = [];
    
    // Análise de serviços
    const diffServicos = calcularDiferenca(dadosLoja1.totalServicos, dadosLoja2.totalServicos);
    if (diffServicos.melhor !== 'empate') {
      const lojaMelhor = diffServicos.melhor === 'loja1' ? dadosLoja1.lojaNome : dadosLoja2.lojaNome;
      analises.push(`**${lojaMelhor}** realizou ${diffServicos.percentual.toFixed(1)}% mais serviços`);
    }
    
    // Análise de taxa de reparação
    const taxaRep1 = dadosLoja1.taxaReparacao ? parseFloat(dadosLoja1.taxaReparacao.toString()) : 0;
    const taxaRep2 = dadosLoja2.taxaReparacao ? parseFloat(dadosLoja2.taxaReparacao.toString()) : 0;
    const diffTaxa = calcularDiferenca(taxaRep1, taxaRep2);
    if (diffTaxa.melhor !== 'empate') {
      const lojaMelhor = diffTaxa.melhor === 'loja1' ? dadosLoja1.lojaNome : dadosLoja2.lojaNome;
      analises.push(`**${lojaMelhor}** tem taxa de reparação ${diffTaxa.percentual.toFixed(1)}% superior`);
    }
    
    // Análise de desvio vs objetivo
    const desvio1 = dadosLoja1.desvioPercentualMes ? parseFloat(dadosLoja1.desvioPercentualMes.toString()) : 0;
    const desvio2 = dadosLoja2.desvioPercentualMes ? parseFloat(dadosLoja2.desvioPercentualMes.toString()) : 0;
    if (desvio1 >= 0 && desvio2 < 0) {
      analises.push(`**${dadosLoja1.lojaNome}** atingiu o objetivo mensal, enquanto **${dadosLoja2.lojaNome}** ficou abaixo`);
    } else if (desvio2 >= 0 && desvio1 < 0) {
      analises.push(`**${dadosLoja2.lojaNome}** atingiu o objetivo mensal, enquanto **${dadosLoja1.lojaNome}** ficou abaixo`);
    }
    
    // Análise de produtividade
    const prod1 = dadosLoja1.servicosPorColaborador ? parseFloat(dadosLoja1.servicosPorColaborador.toString()) : 0;
    const prod2 = dadosLoja2.servicosPorColaborador ? parseFloat(dadosLoja2.servicosPorColaborador.toString()) : 0;
    const diffProd = calcularDiferenca(prod1, prod2);
    if (diffProd.melhor !== 'empate') {
      const lojaMelhor = diffProd.melhor === 'loja1' ? dadosLoja1.lojaNome : dadosLoja2.lojaNome;
      analises.push(`**${lojaMelhor}** tem produtividade por colaborador ${diffProd.percentual.toFixed(1)}% maior`);
    }
    
    return analises;
  };
  
  if (loadingPeriodos || loadingLojas) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (!periodos || periodos.length === 0 || !lojas || lojas.length < 2) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'pt' ? 'Comparação Indisponível' : 'Comparison Unavailable'}</CardTitle>
              <CardDescription>
                {!periodos || periodos.length === 0 
                  ? (language === 'pt' ? 'Nenhum período disponível. O administrador precisa fazer upload dos resultados mensais.' : 'No period available. The administrator needs to upload monthly results.')
                  : (language === 'pt' ? 'São necessárias pelo menos 2 lojas para fazer comparação.' : 'At least 2 stores are required for comparison.')
                }
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{language === 'pt' ? 'Comparação de Lojas' : 'Store Comparison'}</h1>
          <p className="text-muted-foreground">{language === 'pt' ? 'Análise lado-a-lado de performance entre duas lojas' : 'Side-by-side performance analysis between two stores'}</p>
        </div>
        
        {/* Filtros de Seleção */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'pt' ? 'Selecione as Lojas e Período' : 'Select Stores and Period'}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Loja 1 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'pt' ? 'Loja 1' : 'Store 1'}</label>
              <Select
                value={loja1Id?.toString() || ''}
                onValueChange={(value) => setLoja1Id(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'pt' ? 'Selecione a primeira loja' : 'Select the first store'} />
                </SelectTrigger>
                <SelectContent>
                  {lojas.filter(l => l.id !== loja2Id).map((loja) => (
                    <SelectItem key={loja.id} value={loja.id.toString()}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Loja 2 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'pt' ? 'Loja 2' : 'Store 2'}</label>
              <Select
                value={loja2Id?.toString() || ''}
                onValueChange={(value) => setLoja2Id(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'pt' ? 'Selecione a segunda loja' : 'Select the second store'} />
                </SelectTrigger>
                <SelectContent>
                  {lojas.filter(l => l.id !== loja1Id).map((loja) => (
                    <SelectItem key={loja.id} value={loja.id.toString()}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Período */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === 'pt' ? 'Período' : 'Period'}</label>
              <Select
                value={periodoSelecionado ? `${periodoSelecionado.mes}-${periodoSelecionado.ano}` : ''}
                onValueChange={(value) => {
                  const [mes, ano] = value.split('-').map(Number);
                  setPeriodoSelecionado({ mes, ano });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'pt' ? 'Selecione o período' : 'Select the period'} />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((p) => (
                    <SelectItem key={`${p.mes}-${p.ano}`} value={`${p.mes}-${p.ano}`}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Área de Comparação */}
        {!loja1Id || !loja2Id ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'pt' ? 'Selecione duas lojas para ver a comparação' : 'Select two stores to see the comparison'}</p>
            </CardContent>
          </Card>
        ) : loadingComparacao ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !dadosLoja1 || !dadosLoja2 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>{language === 'pt' ? 'Sem dados disponíveis para estas lojas no período selecionado' : 'No data available for these stores in the selected period'}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Análise Automática */}
            {gerarAnalise() && gerarAnalise()!.length > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {language === 'pt' ? 'Análise Comparativa' : 'Comparative Analysis'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {gerarAnalise()!.map((analise, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                        <span className="text-sm" dangerouslySetInnerHTML={{ __html: analise.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            
            {/* Cards Comparativos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Loja 1 */}
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader className="bg-blue-50 dark:bg-blue-950">
                  <CardTitle className="text-xl">{dadosLoja1.lojaNome}</CardTitle>
                  <CardDescription>{dadosLoja1.zona}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Total de Serviços */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Total de Serviços' : 'Total Services'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{dadosLoja1.totalServicos || 0}</div>
                      <IndicadorDiferenca valor1={dadosLoja1.totalServicos} valor2={dadosLoja2.totalServicos} />
                    </div>
                  </div>
                  
                  {/* Objetivo Mensal */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Objetivo Mensal' : 'Monthly Target'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{dadosLoja1.objetivoMensal || 0}</div>
                    </div>
                  </div>
                  
                  {/* Desvio vs Objetivo */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Desvio vs Objetivo' : 'Deviation vs Target'}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${dadosLoja1.desvioPercentualMes && parseFloat(dadosLoja1.desvioPercentualMes.toString()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {dadosLoja1.desvioPercentualMes ? `${(parseFloat(dadosLoja1.desvioPercentualMes.toString()) * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Taxa de Reparação */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Taxa de Reparação' : 'Repair Rate'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {dadosLoja1.taxaReparacao ? `${(parseFloat(dadosLoja1.taxaReparacao.toString()) * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                      <IndicadorDiferenca 
                        valor1={dadosLoja1.taxaReparacao ? parseFloat(dadosLoja1.taxaReparacao.toString()) : null} 
                        valor2={dadosLoja2.taxaReparacao ? parseFloat(dadosLoja2.taxaReparacao.toString()) : null} 
                        formato="percentual"
                      />
                    </div>
                  </div>
                  
                  {/* Colaboradores */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Colaboradores' : 'Employees'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{dadosLoja1.numColaboradores || 0}</div>
                    </div>
                  </div>
                  
                  {/* Serviços por Colaborador */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Serviços/Colaborador' : 'Services/Employee'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {dadosLoja1.servicosPorColaborador ? parseFloat(dadosLoja1.servicosPorColaborador.toString()).toFixed(2) : 'N/A'}
                      </div>
                      <IndicadorDiferenca 
                        valor1={dadosLoja1.servicosPorColaborador ? parseFloat(dadosLoja1.servicosPorColaborador.toString()) : null} 
                        valor2={dadosLoja2.servicosPorColaborador ? parseFloat(dadosLoja2.servicosPorColaborador.toString()) : null}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Loja 2 */}
              <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardHeader className="bg-purple-50 dark:bg-purple-950">
                  <CardTitle className="text-xl">{dadosLoja2.lojaNome}</CardTitle>
                  <CardDescription>{dadosLoja2.zona}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Total de Serviços */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Total de Serviços' : 'Total Services'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{dadosLoja2.totalServicos || 0}</div>
                      <IndicadorDiferenca valor1={dadosLoja2.totalServicos} valor2={dadosLoja1.totalServicos} />
                    </div>
                  </div>
                  
                  {/* Objetivo Mensal */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Objetivo Mensal' : 'Monthly Target'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{dadosLoja2.objetivoMensal || 0}</div>
                    </div>
                  </div>
                  
                  {/* Desvio vs Objetivo */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Desvio vs Objetivo' : 'Deviation vs Target'}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${dadosLoja2.desvioPercentualMes && parseFloat(dadosLoja2.desvioPercentualMes.toString()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {dadosLoja2.desvioPercentualMes ? `${(parseFloat(dadosLoja2.desvioPercentualMes.toString()) * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Taxa de Reparação */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Taxa de Reparação' : 'Repair Rate'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {dadosLoja2.taxaReparacao ? `${(parseFloat(dadosLoja2.taxaReparacao.toString()) * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                      <IndicadorDiferenca 
                        valor1={dadosLoja2.taxaReparacao ? parseFloat(dadosLoja2.taxaReparacao.toString()) : null} 
                        valor2={dadosLoja1.taxaReparacao ? parseFloat(dadosLoja1.taxaReparacao.toString()) : null} 
                        formato="percentual"
                      />
                    </div>
                  </div>
                  
                  {/* Colaboradores */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Colaboradores' : 'Employees'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{dadosLoja2.numColaboradores || 0}</div>
                    </div>
                  </div>
                  
                  {/* Serviços por Colaborador */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{language === 'pt' ? 'Serviços/Colaborador' : 'Services/Employee'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {dadosLoja2.servicosPorColaborador ? parseFloat(dadosLoja2.servicosPorColaborador.toString()).toFixed(2) : 'N/A'}
                      </div>
                      <IndicadorDiferenca 
                        valor1={dadosLoja2.servicosPorColaborador ? parseFloat(dadosLoja2.servicosPorColaborador.toString()) : null} 
                        valor2={dadosLoja1.servicosPorColaborador ? parseFloat(dadosLoja1.servicosPorColaborador.toString()) : null}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
