import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TopicosReuniao() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: topicos, isLoading, refetch } = trpc.reunioesGestores.listarTopicosPendentes.useQuery();
  const criarMutation = trpc.reunioesGestores.criarTopico.useMutation();
  const atualizarMutation = trpc.reunioesGestores.atualizarTopico.useMutation();
  const eliminarMutation = trpc.reunioesGestores.eliminarTopico.useMutation();

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      toast.error(t('topicos.insiraTitulo') || "Por favor, insira um título para o tópico");
      return;
    }

    try {
      if (editandoId) {
        await atualizarMutation.mutateAsync({
          id: editandoId,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
        });
        toast.success(t('topicos.atualizadoSucesso') || "Tópico atualizado com sucesso!");
      } else {
        await criarMutation.mutateAsync({
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
        });
        toast.success(t('topicos.submetidoSucesso') || "Tópico submetido com sucesso!");
      }
      
      setModalAberto(false);
      setEditandoId(null);
      setTitulo("");
      setDescricao("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || t('topicos.erroGuardar') || "Erro ao guardar tópico");
    }
  };

  const handleEditar = (topico: any) => {
    setEditandoId(topico.id);
    setTitulo(topico.titulo);
    setDescricao(topico.descricao || "");
    setModalAberto(true);
  };

  const handleEliminar = async (id: number) => {
    try {
      await eliminarMutation.mutateAsync({ id });
      toast.success(t('topicos.eliminadoSucesso') || "Tópico eliminado com sucesso!");
      setConfirmDelete(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || t('topicos.erroEliminar') || "Erro ao eliminar tópico");
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendente":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "analisado":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><AlertCircle className="h-3 w-3 mr-1" />Em Análise</Badge>;
      case "discutido":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Discutido</Badge>;
      case "nao_discutido":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="h-3 w-3 mr-1" />Não Discutido</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('topicos.titulo') || 'Tópicos para Reunião'}</h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? t('topicos.descricaoAdmin') || "Tópicos submetidos pelos gestores para discussão" 
                : t('topicos.descricaoGestor') || "Submeta tópicos para serem discutidos na próxima reunião de gestores"}
            </p>
          </div>
          {!isAdmin && (
            <Button onClick={() => {
              setEditandoId(null);
              setTitulo("");
              setDescricao("");
              setModalAberto(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Tópico
            </Button>
          )}
        </div>

        {/* Info Card para Gestores */}
        {!isAdmin && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">{t('topicos.comoFunciona') || 'Como funciona?'}</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Submeta tópicos que gostaria de ver discutidos na próxima reunião de gestores. 
                    O administrador irá analisar os tópicos e incluí-los na agenda da reunião. 
                    Após a reunião, será informado se o seu tópico foi discutido e qual foi o resultado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Tópicos */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isAdmin ? "Tópicos Pendentes de Análise" : "Meus Tópicos"}
            </CardTitle>
            <CardDescription>
              {isAdmin 
                ? "Tópicos submetidos pelos gestores aguardando inclusão em reunião"
                : "Tópicos que submeteu para discussão"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !topicos || topicos.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {isAdmin 
                    ? "Nenhum tópico pendente de análise"
                    : "Ainda não submeteu nenhum tópico"}
                </p>
                {!isAdmin && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setModalAberto(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Submeter Primeiro Tópico
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {topicos.map((topico: any) => (
                  <Card key={topico.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{topico.titulo}</h3>
                            {getEstadoBadge(topico.estado)}
                          </div>
                          {topico.descricao && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {topico.descricao}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {isAdmin && topico.gestorNome && (
                              <span>Submetido por: <strong>{topico.gestorNome}</strong></span>
                            )}
                            <span>
                              {format(new Date(topico.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                            </span>
                          </div>
                          {topico.resultadoDiscussao && (
                            <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                              <p className="text-sm font-medium text-green-800">Resultado da Discussão:</p>
                              <p className="text-sm text-green-700">{topico.resultadoDiscussao}</p>
                            </div>
                          )}
                          {topico.notasAdmin && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                              <p className="text-sm font-medium text-blue-800">Notas do Admin:</p>
                              <p className="text-sm text-blue-700">{topico.notasAdmin}</p>
                            </div>
                          )}
                        </div>
                        {/* Ações apenas para tópicos pendentes do próprio gestor */}
                        {!isAdmin && topico.estado === "pendente" && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditar(topico)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(topico.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Criar/Editar */}
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editandoId ? "Editar Tópico" : "Novo Tópico para Reunião"}
              </DialogTitle>
              <DialogDescription>
                {editandoId 
                  ? "Atualize os detalhes do tópico"
                  : "Submeta um tópico para ser discutido na próxima reunião de gestores"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Revisão de procedimentos de atendimento"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva com mais detalhe o que gostaria de discutir..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={criarMutation.isPending || atualizarMutation.isPending}
              >
                {(criarMutation.isPending || atualizarMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editandoId ? "Guardar Alterações" : "Submeter Tópico"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Eliminação */}
        <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Tópico</DialogTitle>
              <DialogDescription>
                Tem a certeza que deseja eliminar este tópico? Esta ação não pode ser revertida.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => confirmDelete && handleEliminar(confirmDelete)}
                disabled={eliminarMutation.isPending}
              >
                {eliminarMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
