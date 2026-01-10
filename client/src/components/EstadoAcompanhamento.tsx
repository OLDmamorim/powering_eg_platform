import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Clock, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Estado = "acompanhar" | "em_tratamento" | "tratado" | null;

interface EstadoAcompanhamentoProps {
  value: Estado;
  onChange: (value: Estado) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

const getEstadoConfig = (language: 'pt' | 'en') => ({
  acompanhar: {
    label: language === 'pt' ? "Acompanhar" : "Follow up",
    icon: Eye,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
  },
  em_tratamento: {
    label: language === 'pt' ? "Em Tratamento" : "In Treatment",
    icon: Clock,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20",
  },
  tratado: {
    label: language === 'pt' ? "Tratado" : "Treated",
    icon: CheckCircle2,
    color: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
  },
});

export function EstadoAcompanhamentoBadge({ estado }: { estado: Estado }) {
  const { language } = useLanguage();
  
  if (!estado) return null;
  
  const estadoConfig = getEstadoConfig(language);
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
  const { language } = useLanguage();
  const estadoConfig = getEstadoConfig(language);
  const placeholderText = language === 'pt' ? "Definir estado..." : "Set status...";
  
  return (
    <Select
      value={value || ""}
      onValueChange={(val) => onChange(val as Estado)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={placeholderText}>
          {value ? (
            <EstadoAcompanhamentoBadge estado={value} />
          ) : (
            <span className="text-muted-foreground">{placeholderText}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="acompanhar">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            <span>{estadoConfig.acompanhar.label}</span>
          </div>
        </SelectItem>
        <SelectItem value="em_tratamento">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>{estadoConfig.em_tratamento.label}</span>
          </div>
        </SelectItem>
        <SelectItem value="tratado">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{estadoConfig.tratado.label}</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
