import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CalendarIcon, Plus, X, Save, Users, FileText, Tag, Download, Mail, UserPlus, Image as ImageIcon, MessageSquare, CheckCircle2, XCircle, Clock, AlertCircle, FileDown, Send, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { AtribuirAcoesModal } from "@/components/AtribuirAcoesModal";
import { EnviarEmailModal } from "@/components/EnviarEmailModal";
import DashboardLayout from "@/components/DashboardLayout";
import { FiltrosReunioes } from "@/components/FiltrosReunioes";
import { AnexosUpload } from "@/components/AnexosUpload";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ReuniõesGestores() {
  const { t, language } = useLanguage();
  const dateLocale = language === 'pt' ? pt : enUS;
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Todos os useState devem vir antes de qualquer return condicional
  const [data, setData] = useState<Date>(new Date());
  const [gestoresSelecionados, setGestoresSelecionados] = useState<number[]>([]);
  const [outrosPresentes, setOutrosPresentes] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [novaTag, setNovaTag] = useState("");
  const [anexos, setAnexos] = useState<Array<{ nome: string; url: string; tipo: "documento" | "imagem" }>>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState<number | null>(null);
  const [modalAtribuir, setModalAtribuir] = useState(false);
  const [modalEmail, setModalEmail] = useState(false);
  const [filtros, setFiltros] = useState<any>({});
  
  // Estados para tópicos
  const [topicosIncluidos, setTopicosIncluidos] = useState<number[]>([]);
  const [modalFinalizarTopicos, setModalFinalizarTopicos] = useState(false);
  const [reuniaoParaFinalizar, setReuniaoParaFinalizar] = useState<number | null>(null);
  const [topicosFinalizacao, setTopicosFinalizacao] = useState<Array<{ id: number; discutido: boolean; resultadoDiscussao: string }>>([]);
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [reuniaoRelatorio, setReuniaoRelatorio] = useState<number | null>(null);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [modalEnviarRelatorio, setModalEnviarRelatorio] = useState(false);

  // Todas as queries e mutations devem vir antes de qualquer return condicional
  const { data: gestores } = trpc.gestores.list.useQuery();
  const { data: historico, refetch } = trpc.reunioesGestores.listar.useQuery(filtros);
  const { data: topicosPendentes, refetch: refetchTopicos } = trpc.reunioesGestores.listarTopicosPendentes.useQuery();
  const criarMutation = trpc.reunioesGestores.criar.useMutation();
  const atribuirAcoesMutation = trpc.reunioesGestores.atribuirAcoes.useMutation();
  const enviarEmailMutation = trpc.reunioesGestores.enviarEmail.useMutation();
  const marcarAnalisadoMutation = trpc.reunioesGestores.marcarAnalisado.useMutation();
  const desmarcarAnalisadoMutation = trpc.reunioesGestores.desmarcarAnalisado.useMutation();
  const finalizarTopicosMutation = trpc.reunioesGestores.finalizarTopicos.useMutation();
  const libertarTopicosMutation = trpc.reunioesGestores.libertarTopicosNaoDiscutidos.useMutation();
  const gerarRelatorioMutation = trpc.reunioesGestores.gerarRelatorioReuniao.useMutation();
  const criarPendentesMutation = trpc.reunioesGestores.criarPendentesDeAcoes.useMutation();
  const enviarRelatorioEmailMutation = trpc.reunioesGestores.enviarRelatorioEmail.useMutation();
  const utils = trpc.useUtils();

  const { data: relatorioReuniao } = trpc.reunioesGestores.getRelatorioReuniao.useQuery(
    { reuniaoId: reuniaoRelatorio! },
    { enabled: !!reuniaoRelatorio && modalRelatorio }
  );

  const { data: topicosReuniao } = trpc.reunioesGestores.getTopicosReuniao.useQuery(
    { reuniaoId: reuniaoRelatorio! },
    { enabled: !!reuniaoRelatorio && modalRelatorio }
  );

  // Pré-selecionar todos os gestores
  useEffect(() => {
    if (gestores && gestoresSelecionados.length === 0) {
      setGestoresSelecionados(gestores.map((g: any) => g.id));
    }
  }, [gestores]);

  // Verificação de user após todos os hooks
  if (!user) return null;

  const handleSubmit = async () => {
    if (!conteudo.trim()) {
      toast.error(t('reunioesGestores.erroConteudo') || "Por favor, descreva o conteúdo da reunião");
      return;
    }

    try {
      const result = await criarMutation.mutateAsync({
        data,
        presencas: gestoresSelecionados,
        outrosPresentes: outrosPresentes.trim() || undefined,
        conteudo,
        tags: tags.length > 0 ? tags : undefined,
        anexos: anexos.length > 0 ? anexos : undefined,
      });

      // Se há tópicos incluídos, marcar como analisados
      if (topicosIncluidos.length > 0 && result.reuniao) {
        for (const topicoId of topicosIncluidos) {
          await marcarAnalisadoMutation.mutateAsync({
            topicoId,
            reuniaoId: result.reuniao.id,
          });
        }
      }

      toast.success(t('reunioesGestores.reuniaoCriada'));
      
      // Limpar formulário
      setData(new Date());
      setGestoresSelecionados(gestores?.map(g => g.id) || []);
      setOutrosPresentes("");
      setConteudo("");
      setTags([]);
      setAnexos([]);
      setTopicosIncluidos([]);
      setMostrarFormulario(false);
      
      refetch();
      refetchTopicos();
    } catch (error: any) {
      toast.error(error.message || t('reunioesGestores.erroCrear'));
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

  const handleIncluirTopico = (topicoId: number) => {
    if (topicosIncluidos.includes(topicoId)) {
      setTopicosIncluidos(topicosIncluidos.filter(id => id !== topicoId));
    } else {
      setTopicosIncluidos([...topicosIncluidos, topicoId]);
    }
  };

  const handleAbrirFinalizacao = async (reuniaoId: number) => {
    setReuniaoParaFinalizar(reuniaoId);
    
    // Buscar tópicos da reunião
    const topicos = await utils.client.reunioesGestores.getTopicosReuniao.query({ reuniaoId });
    setTopicosFinalizacao(topicos.map((t: any) => ({
      id: t.id,
      discutido: t.estado === 'discutido',
      resultadoDiscussao: t.resultadoDiscussao || '',
    })));
    
    setModalFinalizarTopicos(true);
  };

  const handleFinalizarTopicos = async () => {
    if (!reuniaoParaFinalizar) return;
    
    try {
      await finalizarTopicosMutation.mutateAsync({
        reuniaoId: reuniaoParaFinalizar,
        topicos: topicosFinalizacao,
      });
      
      toast.success(t('reunioesGestores.topicosFinalizados'));
      setModalFinalizarTopicos(false);
      setReuniaoParaFinalizar(null);
      refetch();
      refetchTopicos();
    } catch (error: any) {
      toast.error(error.message || t('reunioesGestores.erroFinalizar'));
    }
  };

  const handleLibertarTopicos = async (reuniaoId: number) => {
    try {
      await libertarTopicosMutation.mutateAsync({ reuniaoId });
      toast.success(t('reunioesGestores.topicosLibertados'));
      refetchTopicos();
    } catch (error: any) {
      toast.error(error.message || t('reunioesGestores.erroLibertar'));
    }
  };

  const handleGerarRelatorio = async (reuniaoId: number) => {
    setReuniaoRelatorio(reuniaoId);
    setGerandoRelatorio(true);
    
    try {
      const relatorio = await gerarRelatorioMutation.mutateAsync({ reuniaoId });
      toast.success(t('reunioesGestores.analiseSucesso'));
      setModalRelatorio(true);
    } catch (error: any) {
      toast.error(error.message || t('reunioesGestores.erroAnalise'));
    } finally {
      setGerandoRelatorio(false);
    }
  };

  const handleDownloadPDF = async (reuniaoId: number) => {
    try {
      const result = await utils.client.reunioesGestores.gerarPDFRelatorio.query({ reuniaoId });
      window.open(result.url, '_blank');
      toast.success(t('common.sucesso'));
    } catch (error: any) {
      toast.error(error.message || t('common.erro'));
    }
  };

  const handleEnviarRelatorioEmail = async (reuniaoId: number, gestorIds: number[]) => {
    try {
      const result = await enviarRelatorioEmailMutation.mutateAsync({
        reuniaoId,
        gestorIds,
      });
      toast.success(t('reunioesGestores.emailEnviado'));
      setModalEnviarRelatorio(false);
    } catch (error: any) {
      toast.error(error.message || t('reunioesGestores.erroEmail'));
    }
  };

  const handleCriarPendentes = async (reuniaoId: number) => {
    if (!relatorioReuniao?.acoesDefinidas) {
      toast.error(t('alertas.nenhumaAcao'));
      return;
    }

    const acoes = typeof relatorioReuniao.acoesDefinidas === 'string' 
      ? JSON.parse(relatorioReuniao.acoesDefinidas) 
      : relatorioReuniao.acoesDefinidas;

    // Mapear ações para gestores (simplificado - atribuir ao primeiro gestor)
    const acoesParaPendentes = acoes.map((acao: any) => ({
      descricao: acao.descricao,
      gestorId: gestores?.[0]?.id || 1, // Simplificado
      prazo: acao.prazo ? new Date(acao.prazo) : undefined,
    }));

    try {
      await criarPendentesMutation.mutateAsync({
        reuniaoId,
        acoes: acoesParaPendentes,
      });
      toast.success(t('reunioesGestores.pendentesCriados') || "Pendentes criados com sucesso!");
    } catch (error: any) {
      toast.error(error.message || t('common.erro'));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Filtros */}
      {!mostrarFormulario && historico && (
        <FiltrosReunioes
          onFiltrar={setFiltros}
          todasTags={Array.from(new Set(historico.flatMap(r => r.tags ? JSON.parse(r.tags) : [])))}
          gestores={gestores?.map(g => ({ id: g.id, nome: g.nome }))}
        />
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('reunioesGestores.title')}</h1>
          <p className="text-muted-foreground">
            {isAdmin ? t('reunioesLojas.criarGerirReunioes') : t('reunioesLojas.consultarReunioes')}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setMostrarFormulario(!mostrarFormulario)}>
            {mostrarFormulario ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {mostrarFormulario ? t('common.cancelar') : t('reunioesGestores.novaReuniao')}
          </Button>
        )}
      </div>

      {/* Formulário de Criação (apenas admin) */}
      {isAdmin && mostrarFormulario && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reunioesGestores.novaReuniao')}</CardTitle>
            <CardDescription>{t('reunioesGestores.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="detalhes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="detalhes">{t('reunioesGestores.detalhesReuniao') || "Detalhes da Reunião"}</TabsTrigger>
                <TabsTrigger value="topicos">
                  {t('reunioesGestores.topicosPendentes')}
                  {topicosPendentes && topicosPendentes.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{topicosPendentes.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="detalhes" className="space-y-4 mt-4">
                {/* Data */}
                <div className="space-y-2">
                  <Label>{t('reunioesGestores.data')}</Label>
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
                        {data ? format(data, "PPP", { locale: dateLocale }) : t('reuniao.dataReuniaoPlaceholder')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={data} onSelect={(d) => d && setData(d)} locale={dateLocale} />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Presenças */}
                <div className="space-y-2">
                  <Label>{t('reunioesGestores.presencasGestores') || "Presenças (Gestores)"}</Label>
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
                        <label className="text-sm cursor-pointer">{gestor.user?.name || gestor.nome || t('common.semNome') || 'Sem nome'}</label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outros Presentes */}
                <div className="space-y-2">
                  <Label htmlFor="outros">{t('reunioesGestores.outrosPresentes') || "Outros Presentes (opcional)"}</Label>
                  <Input
                    id="outros"
                    placeholder={t('reunioesGestores.outrosPresentesPlaceholder') || "Ex: João Silva, Maria Costa..."}
                    value={outrosPresentes}
                    onChange={(e) => setOutrosPresentes(e.target.value)}
                  />
                </div>

                {/* Conteúdo */}
                <div className="space-y-2">
                  <Label htmlFor="conteudo">{t('reunioesGestores.conteudoReuniao') || "Conteúdo da Reunião"}</Label>
                  <Textarea
                    id="conteudo"
                    placeholder={t('reunioesGestores.conteudoPlaceholder') || "Descreva os tópicos discutidos, decisões tomadas, etc..."}
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    rows={15}
                    className="min-h-[300px]"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>{t('reunioesGestores.tagsOpcional') || "Tags (opcional)"}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('reunioesGestores.tagsPlaceholder') || "Ex: Vendas, Estratégia..."}
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

                {/* Anexos */}
                <AnexosUpload
                  anexos={anexos}
                  onChange={setAnexos}
                  maxFiles={10}
                />
              </TabsContent>
              
              <TabsContent value="topicos" className="space-y-4 mt-4">
                {/* Tópicos Pendentes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t('reunioesGestores.topicosSubmetidos')}
                    </Label>
                    {topicosIncluidos.length > 0 && (
                      <Badge variant="default">{topicosIncluidos.length} {t('reunioesGestores.selecionados') || "selecionado(s)"}</Badge>
                    )}
                  </div>
                  
                  {!topicosPendentes || topicosPendentes.length === 0 ? (
                    <div className="border rounded-md p-8 text-center text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('reunioesGestores.nenhumTopicoPendente')}</p>
                      <p className="text-sm">{t('reunioesGestores.gestoresPodemSubmeter')}</p>
                    </div>
                  ) : (
                    <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                      {topicosPendentes.map((topico: any) => (
                        <div 
                          key={topico.id} 
                          className={cn(
                            "p-4 cursor-pointer transition-colors",
                            topicosIncluidos.includes(topico.id) 
                              ? "bg-primary/10 border-l-4 border-l-primary" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => handleIncluirTopico(topico.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={topicosIncluidos.includes(topico.id)}
                              onCheckedChange={() => handleIncluirTopico(topico.id)}
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{topico.titulo}</h4>
                              {topico.descricao && (
                                <p className="text-sm text-muted-foreground mt-1">{topico.descricao}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>{t('reunioesGestores.submetidoPor') || "Submetido por"}: <strong>{topico.gestorNome}</strong></span>
                                <span>•</span>
                                <span>{format(new Date(topico.createdAt), "dd/MM/yyyy", { locale: dateLocale })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {topicosIncluidos.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>{topicosIncluidos.length}</strong> {t('reunioesGestores.topicosSeraoIncluidos') || "tópico(s) serão incluídos nesta reunião. Após criar a reunião, poderá marcar quais foram efetivamente discutidos."}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={handleSubmit} disabled={criarMutation.isPending} className="w-full">
              {criarMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('reunioesGestores.aGerarResumo') || "A gerar resumo com IA..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('reunioesGestores.criarReuniao') || "Criar Reunião"}
                  {topicosIncluidos.length > 0 && ` (${t('reunioesGestores.comTopicos') || "com"} ${topicosIncluidos.length} ${t('reunioesGestores.topicos') || "tópico(s)"})`}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reunioesGestores.historicoReunioes') || "Histórico de Reuniões"}</CardTitle>
          <CardDescription>{t('reunioesGestores.reunioesRealizadas') || "Reuniões operacionais realizadas"}</CardDescription>
        </CardHeader>
        <CardContent>
          {!historico ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : historico.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('reunioesGestores.semReunioes')}</p>
          ) : (
            <div className="space-y-4">
              {historico.map((reuniao) => {
                const resumoIA = reuniao.resumoIA ? JSON.parse(reuniao.resumoIA) : null;
                const presencas = JSON.parse(reuniao.presencas) as number[];
                const gestoresPresentes = gestores?.filter((g: any) => presencas.includes(g.id)) || [];
                const tagsReuniao = reuniao.tags ? (JSON.parse(reuniao.tags) as string[]) : [];
                const anexosReuniao = reuniao.anexos ? (JSON.parse(reuniao.anexos) as Array<{ nome: string; url: string; tipo: string }>) : [];

                return (
                  <Card key={reuniao.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {t('reunioesGestores.reuniaoDe') || "Reunião de"} {format(new Date(reuniao.data), "dd/MM/yyyy")}
                          </CardTitle>
                          <CardDescription>
                            {t('reunioesGestores.criadoPor') || "Criado por"} {reuniao.criadoPorNome} {t('reunioesGestores.em') || "em"}{" "}
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
                          {t('reunioesGestores.presencas') || "Presenças"}
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
                          <h4 className="font-semibold text-sm">{t('reunioesGestores.resumoAutomatico') || "Resumo Automático"}</h4>
                          <p className="text-sm text-muted-foreground">{resumoIA.resumo}</p>
                          
                          {resumoIA.topicos.length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-1">{t('reunioesGestores.topicosPrincipais') || "Tópicos Principais"}:</p>
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
                              <p className="text-xs font-medium mb-1">{t('reunioesGestores.acoesIdentificadas') || "Ações Identificadas"}:</p>
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
                          {t('reunioesGestores.verConteudoCompleto') || "Ver Conteúdo Completo"}
                        </summary>
                        <div className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">
                          {reuniao.conteudo}
                        </div>
                      </details>

                      {/* Anexos */}
                      {anexosReuniao.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('common.anexos')} ({anexosReuniao.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {anexosReuniao.map((anexo, idx) => (
                              <a
                                key={idx}
                                href={anexo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-accent transition-colors"
                              >
                                {anexo.tipo === "imagem" ? (
                                  <ImageIcon className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                                <span className="text-sm truncate max-w-[200px]">{anexo.nome}</span>
                                <Download className="h-3 w-3 ml-1" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ações (apenas admin) */}
                      {isAdmin && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAbrirFinalizacao(reuniao.id)}
                          >
                            <ListChecks className="h-4 w-4 mr-2" />
                            {t('reunioesGestores.finalizarTopicos')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGerarRelatorio(reuniao.id)}
                            disabled={gerandoRelatorio}
                          >
                            {gerandoRelatorio && reuniaoRelatorio === reuniao.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4 mr-2" />
                            )}
                            {t('reunioesGestores.gerarRelatorio') || "Gerar Relatório"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(reuniao.id)}
                          >
                            <FileDown className="h-4 w-4 mr-2" />
                            {t('reunioesGestores.downloadPDF') || "Download PDF"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReuniaoRelatorio(reuniao.id);
                              setModalEnviarRelatorio(true);
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {t('reunioesGestores.enviarEmail')}
                          </Button>
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
                              {t('reunioesGestores.atribuirAcoes') || "Atribuir Ações"}
                            </Button>
                          )}
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

      {/* Modal Finalizar Tópicos */}
      <Dialog open={modalFinalizarTopicos} onOpenChange={setModalFinalizarTopicos}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('reunioesGestores.finalizarTopicosTitle') || "Finalizar Tópicos da Reunião"}</DialogTitle>
            <DialogDescription>
              {t('reunioesGestores.finalizarTopicosDesc') || "Marque quais tópicos foram efetivamente discutidos e adicione o resultado da discussão. Tópicos não discutidos serão libertados para a próxima reunião."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {topicosFinalizacao.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {t('reunioesGestores.nenhumTopicoAssociado') || "Nenhum tópico associado a esta reunião"}
              </p>
            ) : (
              topicosFinalizacao.map((topico, index) => (
                <Card key={topico.id} className={cn(
                  "transition-colors",
                  topico.discutido ? "border-green-200 bg-green-50/50 dark:bg-green-900/10" : ""
                )}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={topico.discutido}
                        onCheckedChange={(checked) => {
                          const updated = [...topicosFinalizacao];
                          updated[index].discutido = !!checked;
                          setTopicosFinalizacao(updated);
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{t('reunioesGestores.topico') || "Tópico"} #{topico.id}</p>
                      </div>
                      {topico.discutido ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('reunioesGestores.topicosDiscutidos')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-700">
                          <XCircle className="h-3 w-3 mr-1" />
                          {t('reunioesGestores.topicosNaoDiscutidos')}
                        </Badge>
                      )}
                    </div>
                    
                    {topico.discutido && (
                      <div className="space-y-2">
                        <Label>{t('reunioesGestores.resultadoDiscussao') || "Resultado da Discussão"}</Label>
                        <Textarea
                          placeholder={t('reunioesGestores.resultadoPlaceholder') || "Descreva o que foi decidido ou concluído..."}
                          value={topico.resultadoDiscussao}
                          onChange={(e) => {
                            const updated = [...topicosFinalizacao];
                            updated[index].resultadoDiscussao = e.target.value;
                            setTopicosFinalizacao(updated);
                          }}
                          rows={3}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalFinalizarTopicos(false)}>
              {t('common.cancelar')}
            </Button>
            <Button onClick={handleFinalizarTopicos} disabled={finalizarTopicosMutation.isPending}>
              {finalizarTopicosMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t('reunioesGestores.finalizarTopicos')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Relatório */}
      <Dialog open={modalRelatorio} onOpenChange={setModalRelatorio}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('reunioesGestores.relatorioReuniao') || "Relatório da Reunião"}</DialogTitle>
            <DialogDescription>
              {t('reunioesGestores.relatorioGeradoDesc') || "Relatório gerado automaticamente com base no conteúdo da reunião e tópicos discutidos."}
            </DialogDescription>
          </DialogHeader>
          
          {relatorioReuniao ? (
            <div className="space-y-6 py-4">
              {/* Resumo Executivo */}
              <div>
                <h3 className="font-semibold text-lg mb-2">{t('reunioesGestores.resumoExecutivo') || "Resumo Executivo"}</h3>
                <p className="text-muted-foreground">{relatorioReuniao.resumoExecutivo}</p>
              </div>
              
              {/* Tópicos Discutidos */}
              {topicosReuniao && topicosReuniao.filter((t: any) => t.estado === 'discutido').length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">{t('reunioesGestores.topicosDiscutidos')}</h3>
                  <div className="space-y-2">
                    {topicosReuniao.filter((t: any) => t.estado === 'discutido').map((topico: any) => (
                      <div key={topico.id} className="border-l-4 border-green-500 pl-3 py-2">
                        <p className="font-medium">{topico.titulo}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('reunioesGestores.propostoPor') || "Proposto por"}: {topico.gestorNome}
                        </p>
                        {topico.resultadoDiscussao && (
                          <p className="text-sm mt-1">{topico.resultadoDiscussao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Decisões Tomadas */}
              {relatorioReuniao.decisoesTomadas && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">{t('reunioesGestores.decisoesTomadas')}</h3>
                  <p className="text-muted-foreground">{relatorioReuniao.decisoesTomadas}</p>
                </div>
              )}
              
              {/* Ações Definidas */}
              {relatorioReuniao.acoesDefinidas && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">{t('reunioesGestores.acoesDefinidas') || "Ações Definidas"}</h3>
                  <div className="space-y-2">
                    {(typeof relatorioReuniao.acoesDefinidas === 'string' 
                      ? JSON.parse(relatorioReuniao.acoesDefinidas) 
                      : relatorioReuniao.acoesDefinidas
                    ).map((acao: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 border rounded-md">
                        <div className="flex-1">
                          <p className="font-medium">{acao.descricao}</p>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span>{t('reunioesGestores.responsavel') || "Responsável"}: {acao.responsavel}</span>
                            <span>{t('reunioesGestores.prazo') || "Prazo"}: {acao.prazo}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => reuniaoRelatorio && handleCriarPendentes(reuniaoRelatorio)}
                    disabled={criarPendentesMutation.isPending}
                  >
                    {criarPendentesMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t('reunioesGestores.criarPendentesAcoes') || "Criar Pendentes a partir das Ações"}
                  </Button>
                </div>
              )}
              
              {/* Tópicos Não Discutidos */}
              {topicosReuniao && topicosReuniao.filter((t: any) => t.estado === 'nao_discutido').length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">{t('reunioesGestores.adiadosProximaReuniao') || "Adiados para Próxima Reunião"}</h3>
                  <div className="space-y-2">
                    {topicosReuniao.filter((t: any) => t.estado === 'nao_discutido').map((topico: any) => (
                      <div key={topico.id} className="border-l-4 border-gray-300 pl-3 py-2">
                        <p className="font-medium">{topico.titulo}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('reunioesGestores.propostoPor') || "Proposto por"}: {topico.gestorNome}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => reuniaoRelatorio && handleLibertarTopicos(reuniaoRelatorio)}
                    disabled={libertarTopicosMutation.isPending}
                  >
                    {libertarTopicosMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t('reunioesGestores.libertarProximaReuniao') || "Libertar para Próxima Reunião"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRelatorio(false)}>
              {t('common.fechar')}
            </Button>
            {reuniaoRelatorio && (
              <>
                <Button variant="outline" onClick={() => handleDownloadPDF(reuniaoRelatorio)}>
                  <FileDown className="h-4 w-4 mr-2" />
                  {t('reunioesGestores.downloadPDF') || "Download PDF"}
                </Button>
                <Button onClick={() => {
                  setModalRelatorio(false);
                  setModalEnviarRelatorio(true);
                }}>
                  <Send className="h-4 w-4 mr-2" />
                  {t('reunioesGestores.enviarEmail')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Enviar Relatório por Email */}
      <Dialog open={modalEnviarRelatorio} onOpenChange={setModalEnviarRelatorio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reunioesGestores.enviarRelatorioEmail') || "Enviar Relatório por Email"}</DialogTitle>
            <DialogDescription>
              {t('reunioesGestores.selecioneGestoresEmail') || "Selecione os gestores que devem receber o relatório da reunião por email."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
              {gestores?.map((gestor: any) => (
                <div key={gestor.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`email-gestor-${gestor.id}`}
                    defaultChecked
                  />
                  <label htmlFor={`email-gestor-${gestor.id}`} className="text-sm cursor-pointer flex-1">
                    {gestor.nome || gestor.user?.name || t('common.semNome') || 'Sem nome'}
                    {gestor.email && (
                      <span className="text-muted-foreground ml-2">({gestor.email})</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEnviarRelatorio(false)}>
              {t('common.cancelar')}
            </Button>
            <Button 
              onClick={() => {
                if (reuniaoRelatorio && gestores) {
                  handleEnviarRelatorioEmail(reuniaoRelatorio, gestores.map(g => g.id));
                }
              }}
              disabled={enviarRelatorioEmailMutation.isPending}
            >
              {enviarRelatorioEmailMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t('reunioesGestores.enviarRelatorio') || "Enviar Relatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modais existentes */}
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
    </DashboardLayout>
  );
}
