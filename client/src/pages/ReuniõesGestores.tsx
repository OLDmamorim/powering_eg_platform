import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarIcon, Plus, X, Save, Users, FileText, Tag, Download, Mail, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useAuth } from "@/_core/hooks/useAuth";
import { AtribuirAcoesModal } from "@/components/AtribuirAcoesModal";
import { EnviarEmailModal } from "@/components/EnviarEmailModal";

export default function ReuniõesGestores() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [data, setData] = useState<Date>(new Date());
  const [gestoresSelecionados, setGestoresSelecionados] = useState<number[]>([]);
  const [outrosPresentes, setOutrosPresentes] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [novaTag, setNovaTag] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState<number | null>(null);
  const [modalAtribuir, setModalAtribuir] = useState(false);
  const [modalEmail, setModalEmail] = useState(false);

  const { data: gestores } = trpc.gestores.list.useQuery();
  const { data: historico, refetch } = trpc.reunioesGestores.listar.useQuery();
  const criarMutation = trpc.reunioesGestores.criar.useMutation();
  const atribuirAcoesMutation = trpc.reunioesGestores.atribuirAcoes.useMutation();
  const enviarEmailMutation = trpc.reunioesGestores.enviarEmail.useMutation();
  const utils = trpc.useUtils();

  // Pré-selecionar todos os gestores
  useState(() => {
    if (gestores && gestoresSelecionados.length === 0) {
      setGestoresSelecionados(gestores.map((g: any) => g.id));
    }
  });

  const handleSubmit = async () => {
    if (!conteudo.trim()) {
      toast.error("Por favor, descreva o conteúdo da reunião");
      return;
    }

    try {
      const result = await criarMutation.mutateAsync({
        data,
        presencas: gestoresSelecionados,
        outrosPresentes: outrosPresentes.trim() || undefined,
        conteudo,
        tags: tags.length > 0 ? tags : undefined,
      });

      toast.success("Reunião criada com sucesso!");
      
      // Limpar formulário
      setData(new Date());
      setGestoresSelecionados(gestores?.map(g => g.id) || []);
      setOutrosPresentes("");
      setConteudo("");
      setTags([]);
      setMostrarFormulario(false);
      
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar reunião");
    }
  };

  const adicionarTag = () => {
    if (novaTag.trim() && !tags.includes(novaTag.trim())) {
      setTags([...tags, novaTag.trim()]);
      setNovaTag("");
    }
  };

  const removerTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reuniões de Gestores</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Criar e gerir reuniões operacionais" : "Consultar reuniões operacionais"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setMostrarFormulario(!mostrarFormulario)}>
            {mostrarFormulario ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {mostrarFormulario ? "Cancelar" : "Nova Reunião"}
          </Button>
        )}
      </div>

      {/* Formulário de Criação (apenas admin) */}
      {isAdmin && mostrarFormulario && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Reunião de Gestores</CardTitle>
            <CardDescription>Preencha os detalhes da reunião operacional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Data */}
            <div className="space-y-2">
              <Label>Data da Reunião</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !data && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, "PPP", { locale: pt }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={data} onSelect={(d) => d && setData(d)} locale={pt} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Presenças */}
            <div className="space-y-2">
              <Label>Presenças (Gestores)</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                {gestores?.map((gestor: any) => (
                  <div key={gestor.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={gestoresSelecionados.includes(gestor.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setGestoresSelecionados([...gestoresSelecionados, gestor.id]);
                        } else {
                          setGestoresSelecionados(gestoresSelecionados.filter((id) => id !== gestor.id));
                        }
                      }}
                    />
                    <label className="text-sm">{gestor.nome}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Outros Presentes */}
            <div className="space-y-2">
              <Label htmlFor="outros">Outros Presentes (opcional)</Label>
              <Input
                id="outros"
                placeholder="Ex: João Silva, Maria Costa..."
                value={outrosPresentes}
                onChange={(e) => setOutrosPresentes(e.target.value)}
              />
            </div>

            {/* Conteúdo */}
            <div className="space-y-2">
              <Label htmlFor="conteudo">Conteúdo da Reunião</Label>
              <Textarea
                id="conteudo"
                placeholder="Descreva os tópicos discutidos, decisões tomadas, etc..."
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={8}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Vendas, Estratégia..."
                  value={novaTag}
                  onChange={(e) => setNovaTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarTag())}
                />
                <Button type="button" variant="outline" onClick={adicionarTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removerTag(tag)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleSubmit} disabled={criarMutation.isPending} className="w-full">
              {criarMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A gerar resumo com IA...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Criar Reunião
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Reuniões</CardTitle>
          <CardDescription>Reuniões operacionais realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {!historico ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : historico.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma reunião registada</p>
          ) : (
            <div className="space-y-4">
              {historico.map((reuniao) => {
                const resumoIA = reuniao.resumoIA ? JSON.parse(reuniao.resumoIA) : null;
                const presencas = JSON.parse(reuniao.presencas) as number[];
                const gestoresPresentes = gestores?.filter((g: any) => presencas.includes(g.id)) || [];
                const tagsReuniao = reuniao.tags ? (JSON.parse(reuniao.tags) as string[]) : [];

                return (
                  <Card key={reuniao.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Reunião de {format(new Date(reuniao.data), "dd/MM/yyyy")}
                          </CardTitle>
                          <CardDescription>
                            Criado por {reuniao.criadoPorNome} em{" "}
                            {format(new Date(reuniao.createdAt), "dd/MM/yyyy HH:mm")}
                          </CardDescription>
                        </div>
                        {tagsReuniao.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tagsReuniao.map((tag) => (
                              <Badge key={tag} variant="outline">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Presenças */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Presenças
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {gestoresPresentes.map((g: any) => (
                            <Badge key={g.id} variant="secondary">
                              {g.nome}
                            </Badge>
                          ))}
                          {reuniao.outrosPresentes && (
                            <Badge variant="outline">{reuniao.outrosPresentes}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Resumo IA */}
                      {resumoIA && (
                        <div className="border-l-4 border-primary pl-4 space-y-2">
                          <h4 className="font-semibold text-sm">Resumo Automático</h4>
                          <p className="text-sm text-muted-foreground">{resumoIA.resumo}</p>
                          
                          {resumoIA.topicos.length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-1">Tópicos Principais:</p>
                              <ul className="text-sm space-y-1">
                                {resumoIA.topicos.map((topico: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-primary">•</span>
                                    <span>{topico}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {resumoIA.acoes.length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-1">Ações Identificadas:</p>
                              <ul className="text-sm space-y-1">
                                {resumoIA.acoes.map((acao: any, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <Badge variant={acao.prioridade === "alta" ? "destructive" : "secondary"} className="text-xs">
                                      {acao.prioridade}
                                    </Badge>
                                    <span>{acao.descricao}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Conteúdo Completo */}
                      <details className="border rounded-md p-3">
                        <summary className="cursor-pointer font-semibold text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Ver Conteúdo Completo
                        </summary>
                        <div className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">
                          {reuniao.conteudo}
                        </div>
                      </details>

                      {/* Ações (apenas admin) */}
                      {isAdmin && (
                        <div className="flex gap-2 pt-2">
                          {resumoIA && resumoIA.acoes.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReuniaoSelecionada(reuniao.id);
                                setModalAtribuir(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Atribuir Ações
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReuniaoSelecionada(reuniao.id);
                              setModalEmail(true);
                            }}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Enviar Email
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const result = await utils.client.reunioesGestores.gerarPDF.query({ reuniaoId: reuniao.id });
                                window.open(result.url, '_blank');
                                toast.success('PDF gerado com sucesso!');
                              } catch (error: any) {
                                toast.error(error.message || 'Erro ao gerar PDF');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      {reuniaoSelecionada && (
        <>
          <AtribuirAcoesModal
            open={modalAtribuir}
            onOpenChange={setModalAtribuir}
            reuniaoId={reuniaoSelecionada}
            gestores={gestores || []}
            acoesIA={historico?.find(r => r.id === reuniaoSelecionada)?.resumoIA
              ? JSON.parse(historico.find(r => r.id === reuniaoSelecionada)!.resumoIA!).acoes
              : []}
            onSuccess={() => refetch()}
            onAtribuir={async (reuniaoId, acoes) => {
              await atribuirAcoesMutation.mutateAsync({ reuniaoId, acoes });
            }}
          />
          <EnviarEmailModal
            open={modalEmail}
            onOpenChange={setModalEmail}
            reuniaoId={reuniaoSelecionada}
            tipo="gestores"
            gestores={gestores}
            onEnviar={async (reuniaoId, destinatarios) => {
              await enviarEmailMutation.mutateAsync({
                reuniaoId,
                gestorIds: destinatarios as number[],
              });
            }}
          />
        </>
      )}
    </div>
  );
}
