import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Brain,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Star,
  Clock,
  MapPin,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Car,
  Store,
  Calendar,
  Info,
} from "lucide-react";

interface ScoreDetalhes {
  disponibilidade: number;
  carga: number;
  proximidade: number;
  historico: number;
  especializacao?: number;
  redireccionado?: boolean;
}

interface LogEntry {
  id: number;
  lojaId: number;
  lojaNome: string;
  volanteId: number;
  volanteNome: string;
  data: string;
  periodo: string;
  tipoApoio: string;
  estado: string;
  atribuidoPorIA: boolean;
  scoreAtribuicao: number | null;
  scoreDetalhes: ScoreDetalhes | null;
  redireccionadoDe: number | null;
  observacoes: string | null;
  createdAt: string;
  dataResposta: string | null;
  motivoReprovacao: string | null;
}

function ScoreBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const percentage = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-32 text-xs text-gray-500 dark:text-gray-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-mono w-10 text-right">{percentage}%</span>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  switch (estado) {
    case "aprovado":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Aprovado
        </Badge>
      );
    case "reprovado":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300">
          <XCircle className="h-3 w-3 mr-1" />
          Reprovado
        </Badge>
      );
    case "pendente":
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
    case "cancelado":
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-300">
          Cancelado
        </Badge>
      );
    case "anulado":
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-300">
          Anulado
        </Badge>
      );
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
}

function TipoApoioBadge({ tipo }: { tipo: string }) {
  switch (tipo) {
    case "cobertura_ferias":
      return <Badge variant="outline" className="text-xs">Cobertura Férias</Badge>;
    case "substituicao_vidros":
      return <Badge variant="outline" className="text-xs">Substituição Vidros</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Outro</Badge>;
  }
}

function PeriodoBadge({ periodo }: { periodo: string }) {
  switch (periodo) {
    case "manha":
      return <span className="text-xs text-gray-500">Manhã</span>;
    case "tarde":
      return <span className="text-xs text-gray-500">Tarde</span>;
    case "dia_todo":
      return <span className="text-xs text-gray-500">Dia Todo</span>;
    default:
      return <span className="text-xs text-gray-500">{periodo}</span>;
  }
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  
  const dataFormatada = new Date(entry.data).toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  
  const criadoEm = new Date(entry.createdAt).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* IA indicator */}
        <div className="flex-shrink-0">
          {entry.atribuidoPorIA ? (
            <Tooltip>
              <TooltipTrigger>
                <div className="p-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30">
                  <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Atribuído por IA (Score: {entry.scoreAtribuicao})</TooltipContent>
            </Tooltip>
          ) : (
            <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
              <Car className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>

        {/* Loja */}
        <div className="flex items-center gap-1.5 w-40 min-w-0">
          <Store className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{entry.lojaNome}</span>
        </div>

        {/* Arrow */}
        <ArrowRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />

        {/* Volante */}
        <div className="flex items-center gap-1.5 w-36 min-w-0">
          <Car className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{entry.volanteNome}</span>
        </div>

        {/* Score */}
        <div className="w-16 flex-shrink-0">
          {entry.scoreAtribuicao !== null ? (
            <Tooltip>
              <TooltipTrigger>
                <div className={`text-sm font-mono font-bold ${
                  entry.scoreAtribuicao >= 0.8 ? 'text-emerald-600 dark:text-emerald-400' :
                  entry.scoreAtribuicao >= 0.6 ? 'text-amber-600 dark:text-amber-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {(entry.scoreAtribuicao * 100).toFixed(0)}%
                </div>
              </TooltipTrigger>
              <TooltipContent>Score de atribuição: {entry.scoreAtribuicao}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>

        {/* Data */}
        <div className="flex items-center gap-1 w-28 flex-shrink-0">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">{dataFormatada}</span>
        </div>

        {/* Periodo + Tipo */}
        <div className="flex items-center gap-2 w-36 flex-shrink-0">
          <PeriodoBadge periodo={entry.periodo} />
          <TipoApoioBadge tipo={entry.tipoApoio} />
        </div>

        {/* Estado */}
        <div className="w-28 flex-shrink-0">
          <EstadoBadge estado={entry.estado} />
        </div>

        {/* Redireccionamento */}
        <div className="w-8 flex-shrink-0">
          {entry.redireccionadoDe && (
            <Tooltip>
              <TooltipTrigger>
                <RefreshCw className="h-4 w-4 text-blue-500" />
              </TooltipTrigger>
              <TooltipContent>Redireccionado do pedido #{entry.redireccionadoDe}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Expand */}
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Score detalhado */}
            {entry.scoreDetalhes && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  Score Detalhado
                </h4>
                <div className="space-y-1.5 bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <ScoreBar
                    label="Disponibilidade"
                    value={entry.scoreDetalhes.disponibilidade}
                    icon={<Zap className="h-3 w-3" />}
                    color="bg-emerald-500"
                  />
                  <ScoreBar
                    label="Carga Semanal"
                    value={entry.scoreDetalhes.carga}
                    icon={<BarChart3 className="h-3 w-3" />}
                    color="bg-blue-500"
                  />
                  <ScoreBar
                    label="Proximidade"
                    value={entry.scoreDetalhes.proximidade}
                    icon={<MapPin className="h-3 w-3" />}
                    color="bg-amber-500"
                  />
                  <ScoreBar
                    label="Histórico"
                    value={entry.scoreDetalhes.historico}
                    icon={<Star className="h-3 w-3" />}
                    color="bg-purple-500"
                  />
                  {entry.scoreDetalhes.redireccionado && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
                      <RefreshCw className="h-3 w-3" />
                      <span>Redireccionado automaticamente após reprovação</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                  <span>Pesos: Disp. 40% | Carga 25% | Prox. 20% | Hist. 10%</span>
                </div>
              </div>
            )}

            {/* Info adicional */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Info className="h-3 w-3" />
                Detalhes do Pedido
              </h4>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ID Pedido:</span>
                  <span className="font-mono">#{entry.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Criado em:</span>
                  <span>{criadoEm}</span>
                </div>
                {entry.dataResposta && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Respondido em:</span>
                    <span>{new Date(entry.dataResposta).toLocaleDateString("pt-PT", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    })}</span>
                  </div>
                )}
                {entry.observacoes && (
                  <div className="text-sm">
                    <span className="text-gray-500 block mb-1">Observações:</span>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded p-2 text-xs">
                      {entry.observacoes}
                    </p>
                  </div>
                )}
                {entry.motivoReprovacao && (
                  <div className="text-sm">
                    <span className="text-red-500 block mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Motivo Reprovação:
                    </span>
                    <p className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded p-2 text-xs">
                      {entry.motivoReprovacao}
                    </p>
                  </div>
                )}
                {entry.redireccionadoDe && (
                  <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                    <RefreshCw className="h-3 w-3" />
                    <span>Redireccionado do pedido #{entry.redireccionadoDe}</span>
                  </div>
                )}
                {!entry.atribuidoPorIA && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Info className="h-3 w-3" />
                    <span>Atribuição manual (sem algoritmo IA)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LogAtribuicoes() {
  const { data: log, isLoading, refetch } = trpc.volantes.logAtribuicoes.useQuery({ limit: 100 });

  // Estatísticas
  const stats = log ? {
    total: log.length,
    porIA: log.filter((e: LogEntry) => e.atribuidoPorIA).length,
    redireccionados: log.filter((e: LogEntry) => e.redireccionadoDe).length,
    aprovados: log.filter((e: LogEntry) => e.estado === "aprovado").length,
    reprovados: log.filter((e: LogEntry) => e.estado === "reprovado").length,
    pendentes: log.filter((e: LogEntry) => e.estado === "pendente").length,
    scoreMedia: log.filter((e: LogEntry) => e.scoreAtribuicao !== null).length > 0
      ? (log.filter((e: LogEntry) => e.scoreAtribuicao !== null).reduce((acc: number, e: LogEntry) => acc + (e.scoreAtribuicao || 0), 0) / log.filter((e: LogEntry) => e.scoreAtribuicao !== null).length)
      : 0,
  } : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-violet-600" />
              Log de Atribuições Inteligentes
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Histórico de atribuições de pedidos aos volantes com detalhes do algoritmo de scoring
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="py-0">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Pedidos</p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-violet-600">{stats.porIA}</p>
                <p className="text-xs text-gray-500">Por IA</p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.redireccionados}</p>
                <p className="text-xs text-gray-500">Redireccionados</p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.aprovados}</p>
                <p className="text-xs text-gray-500">Aprovados</p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.reprovados}</p>
                <p className="text-xs text-gray-500">Reprovados</p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.pendentes}</p>
                <p className="text-xs text-gray-500">Pendentes</p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-violet-600">{(stats.scoreMedia * 100).toFixed(0)}%</p>
                <p className="text-xs text-gray-500">Score Médio</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela de Log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              Histórico de Pedidos
              {log && <Badge variant="outline" className="ml-2 text-xs">{log.length} registos</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">A carregar log...</span>
              </div>
            ) : log && log.length > 0 ? (
              <div className="overflow-x-auto">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                  <div className="w-9 flex-shrink-0">IA</div>
                  <div className="w-40">Loja</div>
                  <div className="w-5"></div>
                  <div className="w-36">Volante</div>
                  <div className="w-16">Score</div>
                  <div className="w-28">Data</div>
                  <div className="w-36">Período / Tipo</div>
                  <div className="w-28">Estado</div>
                  <div className="w-8">Red.</div>
                  <div className="w-6"></div>
                </div>
                {/* Rows */}
                {log.map((entry: LogEntry) => (
                  <LogRow key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-violet-100 dark:bg-violet-900/30 rounded-full mb-4">
                  <Brain className="h-8 w-8 text-violet-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Sem registos de atribuições
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  Os registos aparecerão aqui quando as lojas começarem a pedir apoio e o algoritmo de atribuição inteligente for activado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legenda */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-gray-500 mb-3">Legenda do Algoritmo</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/30 mt-0.5">
                  <Zap className="h-3 w-3 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium">Disponibilidade (40%)</p>
                  <p className="text-xs text-gray-500">Volante livre no dia/período pedido</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 mt-0.5">
                  <BarChart3 className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Carga Semanal (25%)</p>
                  <p className="text-xs text-gray-500">Menos serviços na semana = melhor score</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30 mt-0.5">
                  <MapPin className="h-3 w-3 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Proximidade (20%)</p>
                  <p className="text-xs text-gray-500">Loja preferencial do volante = score alto</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/30 mt-0.5">
                  <Star className="h-3 w-3 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Histórico (10%)</p>
                  <p className="text-xs text-gray-500">Continuidade com a loja nos últimos 3 meses</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
