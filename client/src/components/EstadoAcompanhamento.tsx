import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Clock, CheckCircle2 } from "lucide-react";

type Estado = "acompanhar" | "em_tratamento" | "tratado" | null;

interface EstadoAcompanhamentoProps {
  value: Estado;
  onChange: (value: Estado) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

const estadoConfig = {
  acompanhar: {
    label: "Acompanhar",
    icon: Eye,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
  },
  em_tratamento: {
    label: "Em Tratamento",
    icon: Clock,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20",
  },
  tratado: {
    label: "Tratado",
    icon: CheckCircle2,
    color: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
  },
};

export function EstadoAcompanhamentoBadge({ estado }: { estado: Estado }) {
  if (!estado) return null;
  
  const config = estadoConfig[estado];
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export function EstadoAcompanhamentoSelect({
  value,
  onChange,
  disabled = false,
  showLabel = true,
}: EstadoAcompanhamentoProps) {
  return (
    <Select
      value={value || ""}
      onValueChange={(val) => onChange(val as Estado)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Definir estado...">
          {value ? (
            <EstadoAcompanhamentoBadge estado={value} />
          ) : (
            <span className="text-muted-foreground">Definir estado...</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="acompanhar">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            <span>Acompanhar</span>
          </div>
        </SelectItem>
        <SelectItem value="em_tratamento">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Em Tratamento</span>
          </div>
        </SelectItem>
        <SelectItem value="tratado">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Tratado</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
