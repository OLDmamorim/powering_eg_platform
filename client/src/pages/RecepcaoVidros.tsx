import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Package, 
  Loader2, 
  Search, 
  Link2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Store, 
  RefreshCw, 
  Trash2, 
  Eye,
  Filter,
  Image as ImageIcon
} from "lucide-react";

export default function RecepcaoVidros() {
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroLoja, setFiltroLoja] = useState<string>("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [dialogAssociar, setDialogAssociar] = useState<{ id: number; nome: string } | null>(null);
  const [lojaAssociar, setLojaAssociar] = useState<string>("");
  const [dialogFoto, setDialogFoto] = useState<string | null>(null);

  // Queries
  const { data: destinatarios, isLoading: loadingDest, refetch: refetchDest } = trpc.vidros.listarDestinatarios.useQuery();
  const { data: vidros, isLoading: loadingVidros, refetch: refetchVidros } = trpc.vidros.listarTodos.useQuery(
    filtroEstado !== "todos" || filtroLoja !== "todas" 
      ? { 
          estado: filtroEstado !== "todos" ? filtroEstado : undefined, 
          lojaId: filtroLoja !== "todas" ? parseInt(filtroLoja) : undefined 
        } 
      : {}
  );
  const { data: pendentes, refetch: refetchPendentes } = trpc.vidros.listarPendentes.useQuery();
  const { data: lojasData } = trpc.lojas.list.useQuery();

  // Mutations
  const associarMutation = trpc.vidros.associarDestinatario.useMutation({
    onSuccess: (data) => {
      toast.success(`Destinatário associado! ${data.vidrosActualizados} vidro(s) actualizado(s).`);
      setDialogAssociar(null);
      setLojaAssociar("");
      refetchDest();
      refetchVidros();
      refetchPendentes();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const eliminarDestMutation = trpc.vidros.eliminarDestinatario.useMutation({
    onSuccess: () => {
      toast.success("Mapeamento eliminado.");
      refetchDest();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const formatDate = (date: any) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'recebido':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle2 className="h-3 w-3 mr-1" />Recebido</Badge>;
      case 'confirmado':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmado</Badge>;
      case 'pendente_associacao':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><AlertCircle className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getLojaNome = (lojaId: number | null) => {
    if (!lojaId || !lojasData) return 'Não associada';
    const loja = lojasData.find((l: any) => l.id === lojaId);
    return loja?.nome || `Loja #${lojaId}`;
  };

  // Filtrar vidros por pesquisa
  const vidrosFiltrados = vidros?.filter((v: any) => {
    if (!pesquisa) return true;
    const termo = pesquisa.toLowerCase();
    return (
      v.eurocode?.toLowerCase().includes(termo) ||
      v.numeroPedido?.toLowerCase().includes(termo) ||
      v.destinatarioRaw?.toLowerCase().includes(termo) ||
      v.codAT?.toLowerCase().includes(termo) ||
      v.encomenda?.toLowerCase().includes(termo)
    );
  }) || [];

  // Destinatários sem loja associada
  const destSemLoja = destinatarios?.filter((d: any) => !d.lojaId) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" />
              Recepção de Vidros
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestão de mapeamentos de destinatários e monitorização de vidros recebidos
            </p>
          </div>
          <Button variant="outline" onClick={() => { refetchDest(); refetchVidros(); refetchPendentes(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Alertas de pendentes */}
        {destSemLoja.length > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                {destSemLoja.length} Destinatário(s) por Associar
              </CardTitle>
              <CardDescription className="text-amber-700">
                Os seguintes nomes de etiquetas ainda não estão associados a nenhuma loja. Associe-os para que os vidros sejam encaminhados correctamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {destSemLoja.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                  <div>
                    <p className="font-medium">{d.nomeEtiqueta}</p>
                    <p className="text-xs text-muted-foreground">Identificado em {formatDate(d.createdAt)}</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => setDialogAssociar({ id: d.id, nome: d.nomeEtiqueta })}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Associar Loja
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pendentes de associação */}
        {pendentes && pendentes.length > 0 && (
          <Card className="border-orange-300 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                <Clock className="h-5 w-5" />
                {pendentes.length} Vidro(s) Pendentes de Associação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700">
                Estes vidros foram registados mas o destinatário ainda não está associado a uma loja. 
                Associe os destinatários acima para resolver automaticamente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Mapeamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Mapeamentos de Destinatários
            </CardTitle>
            <CardDescription>
              Associação entre nomes das etiquetas e lojas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDest ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !destinatarios || destinatarios.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum mapeamento encontrado. Os mapeamentos serão criados automaticamente quando forem fotografadas etiquetas.
              </p>
            ) : (
              <div className="space-y-2">
                {destinatarios.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="font-medium">{d.nomeEtiqueta}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Store className="h-3 w-3 text-muted-foreground" />
                        {d.lojaId ? (
                          <span className="text-sm text-green-700 font-medium">{getLojaNome(d.lojaId)}</span>
                        ) : (
                          <span className="text-sm text-amber-600 font-medium">Não associada</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setDialogAssociar({ id: d.id, nome: d.nomeEtiqueta })}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        {d.lojaId ? 'Alterar' : 'Associar'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Eliminar este mapeamento?')) {
                            eliminarDestMutation.mutate({ id: d.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Vidros Registados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Vidros Registados
            </CardTitle>
            <CardDescription>
              Todos os vidros registados via scan de etiqueta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Pesquisar por eurocode, pedido, destinatário..." 
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os estados</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="pendente_associacao">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger className="w-[200px]">
                  <Store className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {lojasData?.map((l: any) => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista */}
            {loadingVidros ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : vidrosFiltrados.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum vidro encontrado com os filtros actuais.
              </p>
            ) : (
              <div className="space-y-2">
                {vidrosFiltrados.map((v: any) => (
                  <div key={v.id} className="border rounded-lg p-4 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          {v.eurocode && v.eurocode.split(',').map((ec: string, i: number) => (
                            <span key={i} className="inline-block bg-blue-100 text-blue-800 font-bold text-base px-2 py-0.5 rounded-md">
                              {ec.trim()}
                            </span>
                          ))}
                          {getEstadoBadge(v.estado)}
                        </div>
                        
                        {v.destinatarioRaw && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Destinatário:</span>{' '}
                            <span className="font-medium">{v.destinatarioRaw}</span>
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          {v.numeroPedido && (
                            <div>
                              <span className="text-muted-foreground">Pedido:</span>{' '}
                              <span className="font-medium">{v.numeroPedido}</span>
                            </div>
                          )}
                          {v.encomenda && (
                            <div>
                              <span className="text-muted-foreground">Encomenda:</span>{' '}
                              <span className="font-medium">{v.encomenda}</span>
                            </div>
                          )}
                          {v.codAT && (
                            <div>
                              <span className="text-muted-foreground">COD AT:</span>{' '}
                              <span className="font-mono text-xs">{v.codAT}</span>
                            </div>
                          )}
                          {v.leitRef && (
                            <div>
                              <span className="text-muted-foreground">LEIT:</span>{' '}
                              <span className="font-mono text-xs">{v.leitRef}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(v.createdAt)}
                          </span>
                          {v.lojaDestinoId && (
                            <span className="flex items-center gap-1">
                              <Store className="h-3 w-3" />
                              {getLojaNome(v.lojaDestinoId)}
                            </span>
                          )}
                        </div>
                      </div>

                      {v.fotoUrl && (
                        <button 
                          onClick={() => setDialogFoto(v.fotoUrl)}
                          className="flex-shrink-0"
                        >
                          <img 
                            src={v.fotoUrl} 
                            alt="Etiqueta" 
                            className="w-20 h-20 object-cover rounded-lg border hover:opacity-80 cursor-pointer" 
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Associar Loja */}
      <Dialog open={!!dialogAssociar} onOpenChange={() => { setDialogAssociar(null); setLojaAssociar(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associar Destinatário a Loja</DialogTitle>
            <DialogDescription>
              Seleccione a loja que corresponde ao destinatário "{dialogAssociar?.nome}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium text-muted-foreground">Nome na etiqueta:</p>
              <p className="font-semibold text-lg">{dialogAssociar?.nome}</p>
            </div>
            <Select value={lojaAssociar} onValueChange={setLojaAssociar}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar loja..." />
              </SelectTrigger>
              <SelectContent>
                {lojasData?.map((l: any) => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogAssociar(null); setLojaAssociar(""); }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (!dialogAssociar || !lojaAssociar) return;
                associarMutation.mutate({
                  destinatarioId: dialogAssociar.id,
                  lojaId: parseInt(lojaAssociar),
                });
              }}
              disabled={!lojaAssociar || associarMutation.isPending}
            >
              {associarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Link2 className="h-4 w-4 mr-1" />
              )}
              Associar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Foto */}
      <Dialog open={!!dialogFoto} onOpenChange={() => setDialogFoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Foto da Etiqueta
            </DialogTitle>
          </DialogHeader>
          {dialogFoto && (
            <img src={dialogFoto} alt="Etiqueta" className="w-full object-contain rounded-lg max-h-[70vh]" />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
