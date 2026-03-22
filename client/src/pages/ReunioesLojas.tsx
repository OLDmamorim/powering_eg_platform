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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, CalendarIcon, Plus, X, Save, Store, FileText, Tag, Info, Download, Mail, UserPlus, Image as ImageIcon, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useAuth } from "@/_core/hooks/useAuth";
import { AtribuirAcoesModal } from "@/components/AtribuirAcoesModal";
import { EnviarEmailModal } from "@/components/EnviarEmailModal";
import DashboardLayout from "@/components/DashboardLayout";
import { FiltrosReunioes } from "@/components/FiltrosReunioes";
import { AnexosUpload } from "@/components/AnexosUpload";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ReuniõesLojas() {
  const { t, language } = useLanguage();
  const dateLocale = language === 'pt' ? pt : enUS;
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  if (!user) return null;
  
  const [data, setData] = useState<Date>(new Date());
  const [lojasSelecionadas, setLojasSelecionadas] = useState<number[]>([]);
  const [presencas, setPresencas] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [novaTag, setNovaTag] = useState("");
  const [anexos, setAnexos] = useState<Array<{ nome: string; url: string; tipo: "documento" | "imagem" }>>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [miniResumo, setMiniResumo] = useState<string | null>(null);
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState<number | null>(null);
  const [reuniaoExpandida, setReuniaoExpandida] = useState<number | null>(null);
  const [modalAtribuir, setModalAtribuir] = useState(false);
  const [modalEmail, setModalEmail] = useState(false);
  const [filtros, setFiltros] = useState<any>({});
  const [reuniaoRecenteCriada, setReuniaoRecenteCriada] = useState<{ id: number; lojaIds: number[] } | null>(null);
  const [mostrarSugestaoEmail, setMostrarSugestaoEmail] = useState(false);

  // Admin vê todas as lojas, gestor vê apenas as suas
  const { data: todasLojas } = trpc.lojas.list.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: minhasLojas } = trpc.lojas.getByGestor.useQuery(undefined, {
    enabled: !isAdmin,
  });
  const { data: historico, refetch } = trpc.reunioesLojas.listar.useQuery(filtros);
  const criarMutation = trpc.reunioesLojas.criar.useMutation();
  const atribuirAcoesMutation = trpc.reunioesLojas.atribuirAcoes.useMutation();
  const enviarEmailMutation = trpc.reunioesLojas.enviarEmail.useMutation();
  const { data: gestores } = trpc.gestores.list.useQuery();
  const utils = trpc.useUtils();
  const getMiniResumoQuery = trpc.reunioesLojas.getMiniResumo.useQuery(
    { lojaId: lojasSelecionadas[0] || 0 },
    { enabled: lojasSelecionadas.length === 1 }
  );

  const lojasDisponiveis = isAdmin ? todasLojas : minhasLojas;

  // Atualizar mini resumo quando selecionar uma loja
  useEffect(() => {
    if (lojasSelecionadas.length === 1 && getMiniResumoQuery.data) {
      setMiniResumo(getMiniResumoQuery.data);
    } else {
      setMiniResumo(null);
    }
  }, [lojasSelecionadas, getMiniResumoQuery.data]);

  const handleSubmit = async () => {
    if (lojasSelecionadas.length === 0) {
      toast.error(t('reunioesLojas.erroSelecionarLoja') || "Por favor, selecione pelo menos uma loja");
      return;
    }
    if (!presencas.trim()) {
      toast.error(t('reunioesLojas.erroPresencas') || "Por favor, indique os presentes na reunião");
      return;
    }
    if (!conteudo.trim()) {
      toast.error(t('reunioesLojas.erroConteudo') || "Por favor, descreva o conteúdo da reunião");
      return;
    }

    try {
      const result = await criarMutation.mutateAsync({
        data,
        lojaIds: lojasSelecionadas,
        presencas,
        conteudo,
        tags: tags.length > 0 ? tags : undefined,
        anexos: anexos.length > 0 ? anexos : undefined,
      });

      toast.success(t('reunioesGestores.reuniaoCriada'));
      
      // Guardar informação da reunião criada para sugestão de email
      const lojaIdsCriados = [...lojasSelecionadas];
      
      // Limpar formulário
      setData(new Date());
      setLojasSelecionadas([]);
      setPresencas("");
      setConteudo("");
      setTags([]);
      setAnexos([]);
      setMiniResumo(null);
      setMostrarFormulario(false);
      
      await refetch();
      
      // Mostrar sugestão de envio de email após gravar
      if (result?.reuniao?.id) {
        setReuniaoRecenteCriada({ id: result.reuniao.id, lojaIds: lojaIdsCriados });
        setMostrarSugestaoEmail(true);
      }
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

  const toggleReuniao = (reuniaoId: number) => {
    setReuniaoExpandida(reuniaoExpandida === reuniaoId ? null : reuniaoId);
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
          <h1 className="text-3xl font-bold">{t('reunioesLojas.title')}</h1>
          <p className="text-muted-foreground">
            {t('reunioesLojas.criarGerirReunioes')}
          </p>
        </div>
        <Button onClick={() => setMostrarFormulario(!mostrarFormulario)}>
          {mostrarFormulario ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {mostrarFormulario ? t('common.cancelar') : t('reunioesLojas.novaReuniao')}
        </Button>
      </div>

      {/* Formulário de Criação */}
      {mostrarFormulario && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reunioesLojas.novaReuniaoLoja') || "Nova Reunião de Loja"}</CardTitle>
            <CardDescription>{t('reunioesLojas.preencherDetalhes') || "Preencha os detalhes da reunião operacional"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {/* Seleção de Lojas */}
            <div className="space-y-2">
              <Label>{t('reunioesLojas.lojas') || "Loja(s)"}</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                {lojasDisponiveis?.map((loja: any) => (
                  <div key={loja.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={lojasSelecionadas.includes(loja.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setLojasSelecionadas([...lojasSelecionadas, loja.id]);
                        } else {
                          setLojasSelecionadas(lojasSelecionadas.filter((id) => id !== loja.id));
                        }
                      }}
                    />
                    <label className="text-sm">{loja.nome}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Resumo da Reunião Anterior */}
            {miniResumo && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="prose prose-sm max-w-none">
                    <Streamdown>{miniResumo}</Streamdown>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Presenças */}
            <div className="space-y-2">
              <Label htmlFor="presencas">{t('reunioesGestores.presencas') || "Presenças"}</Label>
              <Input
                id="presencas"
                placeholder={t('reunioesLojas.presencasPlaceholder') || "Ex: João Silva, Maria Costa, Pedro Alves..."}
                value={presencas}
                onChange={(e) => setPresencas(e.target.value)}
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
                  placeholder={t('reunioesLojas.tagsPlaceholder') || "Ex: Vendas, Operações..."}
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
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Histórico - Lista Compacta */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reunioesGestores.historicoReunioes') || "Histórico de Reuniões"}</CardTitle>
          <CardDescription>
            {isAdmin ? t('reunioesLojas.todasReunioes') : t('reunioesLojas.reunioesSuasLojas')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!historico ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : historico.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('reunioesLojas.semReunioes')}</p>
          ) : (
            <div className="space-y-2">
              {historico.map((reuniao: any) => {
                const resumoIA = reuniao.resumoIA ? JSON.parse(reuniao.resumoIA) : null;
                const tagsReuniao = reuniao.tags ? (JSON.parse(reuniao.tags) as string[]) : [];
                const anexosReuniao = reuniao.anexos ? (JSON.parse(reuniao.anexos) as Array<{ nome: string; url: string; tipo: string }>) : [];
                const isExpanded = reuniaoExpandida === reuniao.id;

                return (
                  <div key={reuniao.id} className="border rounded-lg overflow-hidden">
                    {/* Linha Compacta - Clicável */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => toggleReuniao(reuniao.id)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <ChevronRight className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform flex-shrink-0",
                          isExpanded && "rotate-90"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {t('reunioesGestores.reuniaoDe') || "Reunião de"} {format(new Date(reuniao.data), "dd/MM/yyyy")}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {reuniao.lojasNomes.join(", ")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {t('reunioesGestores.criadoPor') || "Criado por"} {reuniao.criadoPorNome}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {tagsReuniao.length > 0 && (
                          <div className="hidden sm:flex flex-wrap gap-1">
                            {tagsReuniao.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {tagsReuniao.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{tagsReuniao.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo Expandido */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-4 space-y-4">
                        {/* Presenças */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">{t('reunioesGestores.presencas') || "Presenças"}</h4>
                          <p className="text-sm text-muted-foreground">{reuniao.presencas}</p>
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

                        {/* Ações */}
                        <div className="flex gap-2 pt-2">
                          {resumoIA && resumoIA.acoes.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReuniaoSelecionada(reuniao.id);
                                setModalAtribuir(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              {t('reunioesGestores.atribuirAcoes') || "Atribuir Ações"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReuniaoSelecionada(reuniao.id);
                              setModalEmail(true);
                            }}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {t('reunioesGestores.enviarEmail')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const result = await utils.client.reunioesLojas.gerarPDF.query({ reuniaoId: reuniao.id });
                                window.open(result.url, '_blank');
                                toast.success(t('common.sucesso'));
                              } catch (error: any) {
                                toast.error(error.message || t('common.erro'));
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {t('reunioesGestores.downloadPDF') || "Download PDF"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Sugestão de Envio de Email */}
      <AlertDialog open={mostrarSugestaoEmail} onOpenChange={setMostrarSugestaoEmail}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {language === 'pt' ? 'Enviar Resumo para a Loja?' : 'Send Summary to Store?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'pt' 
                ? 'A reunião foi gravada com sucesso! Deseja enviar o resumo por email para a loja?'
                : 'Meeting saved successfully! Would you like to send the summary by email to the store?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setMostrarSugestaoEmail(false);
              setReuniaoRecenteCriada(null);
            }}>
              {language === 'pt' ? 'Mais Tarde' : 'Later'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (reuniaoRecenteCriada) {
                setReuniaoSelecionada(reuniaoRecenteCriada.id);
                setMostrarSugestaoEmail(false);
                setModalEmail(true);
              }
            }}>
              <Mail className="h-4 w-4 mr-2" />
              {language === 'pt' ? 'Enviar Agora' : 'Send Now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            tipo="lojas"
            lojaNome={(() => {
              const reuniao = historico?.find(r => r.id === reuniaoSelecionada);
              if (reuniao?.lojaIds && lojasDisponiveis) {
                const lojaIds = JSON.parse(reuniao.lojaIds) as number[];
                const lojasReuniao = lojasDisponiveis.filter(l => lojaIds.includes(l.id));
                return lojasReuniao.map(l => l.nome).join(', ');
              }
              return undefined;
            })()}
            lojaEmail={(() => {
              const reuniao = historico?.find(r => r.id === reuniaoSelecionada);
              if (reuniao?.lojaIds && lojasDisponiveis) {
                const lojaIds = JSON.parse(reuniao.lojaIds) as number[];
                const lojasReuniao = lojasDisponiveis.filter(l => lojaIds.includes(l.id));
                const lojaComEmail = lojasReuniao.find(l => l.email);
                return lojaComEmail?.email || undefined;
              }
              return undefined;
            })()}
            onEnviar={async (reuniaoId) => {
              // Não passa email - o backend usa o email da loja automaticamente
              await enviarEmailMutation.mutateAsync({
                reuniaoId,
              });
            }}
          />
        </>
      )}
      </div>
    </DashboardLayout>
  );
}
