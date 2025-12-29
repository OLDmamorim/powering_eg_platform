import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FiltrosReunioesProps {
  onFiltrar: (filtros: {
    dataInicio?: Date;
    dataFim?: Date;
    tags?: string[];
    criadoPor?: number;
    pesquisa?: string;
  }) => void;
  todasTags: string[];
  gestores?: Array<{ id: number; nome: string }>;
}

export function FiltrosReunioes({ onFiltrar, todasTags, gestores }: FiltrosReunioesProps) {
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);
  const [criadoPor, setCriadoPor] = useState<number | undefined>();
  const [pesquisa, setPesquisa] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const aplicarFiltros = () => {
    onFiltrar({
      dataInicio,
      dataFim,
      tags: tagsSelecionadas.length > 0 ? tagsSelecionadas : undefined,
      criadoPor,
      pesquisa: pesquisa.trim() || undefined,
    });
  };

  const limparFiltros = () => {
    setDataInicio(undefined);
    setDataFim(undefined);
    setTagsSelecionadas([]);
    setCriadoPor(undefined);
    setPesquisa("");
    onFiltrar({});
  };

  const toggleTag = (tag: string) => {
    setTagsSelecionadas(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const temFiltrosAtivos = dataInicio || dataFim || tagsSelecionadas.length > 0 || criadoPor || pesquisa.trim();

  return (
    <div className="space-y-4">
      {/* Barra de pesquisa sempre visível */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar no conteúdo..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {temFiltrosAtivos && (
            <Badge variant="secondary" className="ml-2">
              {[dataInicio, dataFim, tagsSelecionadas.length > 0, criadoPor, pesquisa.trim()].filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Painel de filtros avançados */}
      {mostrarFiltros && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Data Início */}
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "PPP", { locale: pt }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    locale={pt}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "PPP", { locale: pt }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    locale={pt}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Criado Por */}
            {gestores && gestores.length > 0 && (
              <div className="space-y-2">
                <Label>Criado Por</Label>
                <Select
                  value={criadoPor?.toString() || "todos"}
                  onValueChange={(value) => setCriadoPor(value === "todos" ? undefined : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {gestores.map((gestor) => (
                      <SelectItem key={gestor.id} value={gestor.id.toString()}>
                        {gestor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Tags */}
          {todasTags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {todasTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={tagsSelecionadas.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={limparFiltros} disabled={!temFiltrosAtivos}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            <Button onClick={aplicarFiltros}>
              Aplicar Filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
