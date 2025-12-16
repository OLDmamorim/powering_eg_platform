import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Calendar,
  User,
  FileText,
  ClipboardList,
  AlertTriangle,
  Image as ImageIcon,
  Tag,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface RelatorioDetalheModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatorioId: number | null;
  tipoRelatorio: "livre" | "completo" | null;
}

export function RelatorioDetalheModal({
  open,
  onOpenChange,
  relatorioId,
  tipoRelatorio,
}: RelatorioDetalheModalProps) {
  // Query para relatório livre
  const { data: relatorioLivre, isLoading: loadingLivre } =
    trpc.relatoriosLivres.getById.useQuery(
      { id: relatorioId! },
      { enabled: open && tipoRelatorio === "livre" && !!relatorioId }
    );

  // Query para relatório completo
  const { data: relatorioCompleto, isLoading: loadingCompleto } =
    trpc.relatoriosCompletos.getById.useQuery(
      { id: relatorioId! },
      { enabled: open && tipoRelatorio === "completo" && !!relatorioId }
    );

  const isLoading = loadingLivre || loadingCompleto;
  const relatorio = (tipoRelatorio === "livre" ? relatorioLivre : relatorioCompleto) as any;
  const relatorioCompleteData = relatorioCompleto as any;

  // Parse fotos
  const fotos = relatorio?.fotos ? JSON.parse(relatorio.fotos) : [];

  // Parse pendentes (para relatórios livres)
  const pendentes = relatorio?.pendentes
    ? typeof relatorio.pendentes === "string"
      ? JSON.parse(relatorio.pendentes)
      : relatorio.pendentes
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tipoRelatorio === "livre" ? (
              <FileText className="h-5 w-5 text-blue-500" />
            ) : (
              <ClipboardList className="h-5 w-5 text-purple-500" />
            )}
            Detalhes do Relatório {tipoRelatorio === "livre" ? "Livre" : "Completo"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : relatorio ? (
            <div className="space-y-6">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Loja</p>
                    <p className="font-medium">{relatorio.loja?.nome || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Gestor</p>
                    <p className="font-medium">{relatorio.gestor?.nome || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data da Visita</p>
                    <p className="font-medium">
                      {new Date(relatorio.dataVisita).toLocaleDateString("pt-PT", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                {relatorio.categoria && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Categoria</p>
                      <Badge variant="outline" className="mt-1">
                        {relatorio.categoria}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Descrição */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrição
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {relatorio.descricao || "Sem descrição"}
                </p>
              </div>

              {/* Campos específicos do relatório completo */}
              {tipoRelatorio === "completo" && relatorioCompleteData && (
                <>
                  {relatorioCompleteData.episFardamento && (
                    <div>
                      <h4 className="font-medium mb-2">EPIs e Fardamento</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.episFardamento}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.kitPrimeirosSocorros && (
                    <div>
                      <h4 className="font-medium mb-2">Kit de 1ºs Socorros</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.kitPrimeirosSocorros}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.consumiveis && (
                    <div>
                      <h4 className="font-medium mb-2">Consumíveis</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.consumiveis}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.espacoFisico && (
                    <div>
                      <h4 className="font-medium mb-2">Espaço Físico</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.espacoFisico}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.reclamacoes && (
                    <div>
                      <h4 className="font-medium mb-2">Reclamações</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.reclamacoes}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.vendasComplementares && (
                    <div>
                      <h4 className="font-medium mb-2">Vendas Complementares</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.vendasComplementares}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.fichasServico && (
                    <div>
                      <h4 className="font-medium mb-2">Fichas de Serviço</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.fichasServico}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.documentacaoObrigatoria && (
                    <div>
                      <h4 className="font-medium mb-2">Documentação Obrigatória</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.documentacaoObrigatoria}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.reuniaoQuinzenal !== undefined && relatorioCompleteData.reuniaoQuinzenal !== null && (
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Reunião Quinzenal:</h4>
                      {relatorioCompleteData.reuniaoQuinzenal ? (
                        <Badge className="bg-green-500/10 text-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Realizada
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          Não Realizada
                        </Badge>
                      )}
                    </div>
                  )}
                  {relatorioCompleteData.resumoSupervisao && (
                    <div>
                      <h4 className="font-medium mb-2">Resumo da Supervisão</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.resumoSupervisao}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.colaboradoresPresentes && (
                    <div>
                      <h4 className="font-medium mb-2">Colaboradores Presentes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {relatorioCompleteData.colaboradoresPresentes}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.pontosPositivos && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Pontos Positivos
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-green-500/5 p-3 rounded-lg border border-green-500/20">
                        {relatorioCompleteData.pontosPositivos}
                      </p>
                    </div>
                  )}
                  {relatorioCompleteData.pontosNegativos && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Pontos Negativos
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-red-500/5 p-3 rounded-lg border border-red-500/20">
                        {relatorioCompleteData.pontosNegativos}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Pendentes */}
              {pendentes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Pendentes ({pendentes.length})
                  </h4>
                  <div className="space-y-2">
                    {pendentes.map((pendente: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20"
                      >
                        <span className="text-amber-500 font-medium text-sm">
                          {index + 1}.
                        </span>
                        <span className="text-sm">{pendente}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fotos */}
              {fotos.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Fotos ({fotos.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {fotos.map((foto: string, index: number) => (
                      <a
                        key={index}
                        href={foto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={foto}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Relatório não encontrado
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
