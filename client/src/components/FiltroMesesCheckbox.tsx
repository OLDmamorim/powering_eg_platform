import { useState, useEffect, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MesSelecionado {
  mes: number; // 1-12
  ano: number;
}

interface FiltroMesesCheckboxProps {
  mesesDisponiveis?: MesSelecionado[];
  mesesSelecionados: MesSelecionado[];
  onMesesChange: (meses: MesSelecionado[]) => void;
  maxMeses?: number; // Número máximo de meses que podem ser selecionados
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const NOMES_MESES_CURTOS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

/**
 * Gera os últimos N meses a partir da data atual
 * Filtra apenas meses de 2025 em diante
 */
function gerarUltimosMeses(quantidade: number = 24): MesSelecionado[] {
  const meses: MesSelecionado[] = [];
  const hoje = new Date();
  const ANO_MINIMO = 2025;
  
  for (let i = 0; i < quantidade; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    // Filtrar apenas meses de 2025 em diante
    if (data.getFullYear() >= ANO_MINIMO) {
      meses.push({
        mes: data.getMonth() + 1,
        ano: data.getFullYear()
      });
    }
  }
  
  return meses;
}

/**
 * Formata um mês para exibição
 */
function formatarMes(mesSelecionado: MesSelecionado, curto: boolean = false): string {
  const nomes = curto ? NOMES_MESES_CURTOS : NOMES_MESES;
  return `${nomes[mesSelecionado.mes - 1]} ${mesSelecionado.ano}`;
}

/**
 * Verifica se dois meses são iguais
 */
function mesesIguais(a: MesSelecionado, b: MesSelecionado): boolean {
  return a.mes === b.mes && a.ano === b.ano;
}

/**
 * Verifica se um mês está na lista de selecionados
 */
function mesEstaSelecionado(mes: MesSelecionado, selecionados: MesSelecionado[]): boolean {
  return selecionados.some(s => mesesIguais(s, mes));
}

export default function FiltroMesesCheckbox({
  mesesDisponiveis,
  mesesSelecionados,
  onMesesChange,
  maxMeses,
  className,
  placeholder = "Selecionar meses",
  disabled = false
}: FiltroMesesCheckboxProps) {
  const [open, setOpen] = useState(false);
  
  // Usar meses disponíveis fornecidos ou gerar os últimos 24 meses
  const meses = useMemo(() => {
    return mesesDisponiveis || gerarUltimosMeses(24);
  }, [mesesDisponiveis]);
  
  // Agrupar meses por ano
  const mesesPorAno = useMemo(() => {
    const grupos: Record<number, MesSelecionado[]> = {};
    meses.forEach(m => {
      if (!grupos[m.ano]) {
        grupos[m.ano] = [];
      }
      grupos[m.ano].push(m);
    });
    // Ordenar meses dentro de cada ano
    Object.keys(grupos).forEach(ano => {
      grupos[parseInt(ano)].sort((a, b) => a.mes - b.mes);
    });
    return grupos;
  }, [meses]);
  
  // Anos ordenados (mais recente primeiro)
  const anosOrdenados = useMemo(() => {
    return Object.keys(mesesPorAno).map(Number).sort((a, b) => b - a);
  }, [mesesPorAno]);
  
  const handleToggleMes = (mes: MesSelecionado) => {
    const estaSelecionado = mesEstaSelecionado(mes, mesesSelecionados);
    
    if (estaSelecionado) {
      // Remover
      onMesesChange(mesesSelecionados.filter(s => !mesesIguais(s, mes)));
    } else {
      // Adicionar (se não exceder o máximo)
      if (maxMeses && mesesSelecionados.length >= maxMeses) {
        return;
      }
      onMesesChange([...mesesSelecionados, mes]);
    }
  };
  
  const handleSelecionarTrimestre = (trimestre: number, ano: number) => {
    const mesesTrimestre = [
      [1, 2, 3],   // Q1
      [4, 5, 6],   // Q2
      [7, 8, 9],   // Q3
      [10, 11, 12] // Q4
    ][trimestre];
    
    const novosMeses = mesesTrimestre.map(m => ({ mes: m, ano }));
    const mesesExistentes = mesesSelecionados.filter(
      s => !novosMeses.some(n => mesesIguais(n, s))
    );
    
    // Verificar se todos os meses do trimestre já estão selecionados
    const todosJaSelecionados = novosMeses.every(n => 
      mesEstaSelecionado(n, mesesSelecionados)
    );
    
    if (todosJaSelecionados) {
      // Desselecionar todos
      onMesesChange(mesesExistentes);
    } else {
      // Selecionar todos
      onMesesChange([...mesesExistentes, ...novosMeses]);
    }
  };
  
  const handleLimpar = () => {
    onMesesChange([]);
  };
  
  // Texto do botão
  const textoSelecionado = useMemo(() => {
    if (mesesSelecionados.length === 0) {
      return placeholder;
    }
    if (mesesSelecionados.length === 1) {
      return formatarMes(mesesSelecionados[0]);
    }
    if (mesesSelecionados.length <= 3) {
      return mesesSelecionados.map(m => formatarMes(m, true)).join(", ");
    }
    return `${mesesSelecionados.length} meses selecionados`;
  }, [mesesSelecionados, placeholder]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between min-w-[200px] font-normal",
            mesesSelecionados.length === 0 && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">{textoSelecionado}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Selecionar Meses</span>
            {mesesSelecionados.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimpar}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          {maxMeses && (
            <p className="text-xs text-muted-foreground mt-1">
              Máximo de {maxMeses} meses
            </p>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto p-3 space-y-4">
          {anosOrdenados.map(ano => (
            <div key={ano} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{ano}</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(q => {
                    const mesesQ = [
                      [1, 2, 3],
                      [4, 5, 6],
                      [7, 8, 9],
                      [10, 11, 12]
                    ][q];
                    const mesesQDisponiveis = mesesQ.filter(m => 
                      mesesPorAno[ano]?.some(d => d.mes === m)
                    );
                    if (mesesQDisponiveis.length === 0) return null;
                    
                    const todosQSelecionados = mesesQDisponiveis.every(m =>
                      mesEstaSelecionado({ mes: m, ano }, mesesSelecionados)
                    );
                    
                    return (
                      <Button
                        key={q}
                        variant={todosQSelecionados ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleSelecionarTrimestre(q, ano)}
                      >
                        Q{q + 1}
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {mesesPorAno[ano]?.map(mes => {
                  const selecionado = mesEstaSelecionado(mes, mesesSelecionados);
                  const desabilitado = !selecionado && maxMeses !== undefined && mesesSelecionados.length >= maxMeses;
                  
                  return (
                    <div
                      key={`${mes.ano}-${mes.mes}`}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors",
                        selecionado 
                          ? "bg-primary/10 border-primary" 
                          : "hover:bg-muted/50",
                        desabilitado && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => !desabilitado && handleToggleMes(mes)}
                    >
                      <Checkbox
                        id={`mes-${mes.ano}-${mes.mes}`}
                        checked={selecionado}
                        disabled={desabilitado}
                        onCheckedChange={() => handleToggleMes(mes)}
                      />
                      <Label
                        htmlFor={`mes-${mes.ano}-${mes.mes}`}
                        className="text-xs cursor-pointer"
                      >
                        {NOMES_MESES_CURTOS[mes.mes - 1]}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {mesesSelecionados.length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              <strong>{mesesSelecionados.length}</strong> {mesesSelecionados.length === 1 ? "mês selecionado" : "meses selecionados"}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Exportar utilitários para uso em outras partes da aplicação
export { formatarMes, mesesIguais, mesEstaSelecionado, gerarUltimosMeses, NOMES_MESES, NOMES_MESES_CURTOS };

/**
 * Converte meses selecionados em datas de início e fim
 */
export function mesesParaDatas(meses: MesSelecionado[]): { dataInicio: Date; dataFim: Date } | null {
  if (meses.length === 0) return null;
  
  // Ordenar meses
  const ordenados = [...meses].sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.mes - b.mes;
  });
  
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  
  const dataInicio = new Date(primeiro.ano, primeiro.mes - 1, 1);
  const dataFim = new Date(ultimo.ano, ultimo.mes, 0, 23, 59, 59); // Último dia do mês
  
  return { dataInicio, dataFim };
}

/**
 * Gera label descritivo para os meses selecionados
 */
export function gerarLabelMeses(meses: MesSelecionado[]): string {
  if (meses.length === 0) return "Nenhum período selecionado";
  if (meses.length === 1) return formatarMes(meses[0]);
  
  // Ordenar meses
  const ordenados = [...meses].sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.mes - b.mes;
  });
  
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  
  // Verificar se são consecutivos
  let consecutivos = true;
  for (let i = 1; i < ordenados.length; i++) {
    const prev = ordenados[i - 1];
    const curr = ordenados[i];
    const prevDate = new Date(prev.ano, prev.mes - 1);
    const currDate = new Date(curr.ano, curr.mes - 1);
    const diffMeses = (currDate.getFullYear() - prevDate.getFullYear()) * 12 + (currDate.getMonth() - prevDate.getMonth());
    if (diffMeses !== 1) {
      consecutivos = false;
      break;
    }
  }
  
  if (consecutivos) {
    return `${formatarMes(primeiro, true)} a ${formatarMes(ultimo, true)}`;
  }
  
  return `${meses.length} meses selecionados`;
}
