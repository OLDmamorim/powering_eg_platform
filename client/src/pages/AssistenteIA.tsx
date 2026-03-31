import { useState, useRef, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { VoiceChatInput } from '@/components/VoiceChatInput';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RefreshCw,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  Mic,
  Plus,
  History,
  Trash2,
  ChevronLeft,
  Clock,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Streamdown } from 'streamdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AssistenteIA() {
  const { language, t } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessaoAtualId, setSessaoAtualId] = useState<number | null>(null);
  const [showHistorico, setShowHistorico] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = trpc.chatbot.pergunta.useMutation();
  const { data: sugestoes, isLoading: sugestoesLoading, refetch: refetchSugestoes } = trpc.chatbot.sugestoes.useQuery({ language });
  const { data: sessoes, isLoading: sessoesLoading, refetch: refetchSessoes } = trpc.chatbot.listarSessoes.useQuery();
  const eliminarSessaoMutation = trpc.chatbot.eliminarSessao.useMutation();
  
  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement;
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    }
  }, [messages, isLoading]);

  // Scroll adicional quando o conteúdo da última mensagem muda
  const lastMessageContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    if (lastMessageContent && scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement;
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    }
  }, [lastMessageContent]);
  
  const enviarPergunta = async (pergunta: string) => {
    if (!pergunta.trim() || isLoading) return;
    
    const novaMensagemUser: Message = {
      role: 'user',
      content: pergunta,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, novaMensagemUser]);
    setInput('');
    setIsLoading(true);
    
    try {
      const historico = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const resultado = await chatMutation.mutateAsync({
        pergunta,
        historico,
        sessaoId: sessaoAtualId || undefined,
      });
      
      // Se é uma nova sessão, guardar o ID
      if (resultado.sessaoId && !sessaoAtualId) {
        setSessaoAtualId(resultado.sessaoId);
        // Atualizar lista de sessões
        refetchSessoes();
      }
      
      const novaMensagemBot: Message = {
        role: 'assistant',
        content: resultado.resposta,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, novaMensagemBot]);
    } catch (error) {
      const mensagemErro: Message = {
        role: 'assistant',
        content: t('assistenteIA.erro'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, mensagemErro]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarPergunta(input);
  };

  const handleVoiceTranscription = (transcription: string) => {
    enviarPergunta(transcription);
  };
  
  const novaConversa = () => {
    setMessages([]);
    setSessaoAtualId(null);
    setShowHistorico(false);
  };
  
  const carregarSessao = async (sessaoId: number) => {
    try {
      // Usar fetch direto para obter mensagens da sessão
      const utils = trpc.useUtils();
      const mensagens = await utils.chatbot.obterSessao.fetch({ sessaoId });
      
      if (mensagens && mensagens.length > 0) {
        const msgs: Message[] = mensagens.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        setMessages(msgs);
        setSessaoAtualId(sessaoId);
        setShowHistorico(false);
      }
    } catch (error) {
      toast.error('Erro ao carregar conversa');
    }
  };
  
  const eliminarSessao = async (sessaoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await eliminarSessaoMutation.mutateAsync({ sessaoId });
      refetchSessoes();
      // Se a sessão eliminada é a atual, limpar
      if (sessaoId === sessaoAtualId) {
        novaConversa();
      }
      toast.success('Conversa eliminada');
    } catch (error) {
      toast.error('Erro ao eliminar conversa');
    }
  };
  
  const formatarData = (data: Date | string) => {
    const d = new Date(data);
    const agora = new Date();
    const diff = agora.getTime() - d.getTime();
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (dias === 0) return 'Hoje';
    if (dias === 1) return 'Ontem';
    if (dias < 7) return `Há ${dias} dias`;
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  // Agrupar sessões por data
  const sessoesAgrupadas = useMemo(() => {
    if (!sessoes) return {};
    const grupos: Record<string, typeof sessoes> = {};
    sessoes.forEach((s) => {
      const label = formatarData(s.updatedAt);
      if (!grupos[label]) grupos[label] = [];
      grupos[label].push(s);
    });
    return grupos;
  }, [sessoes]);
  
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col gap-3 md:gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold">{t('assistenteIA.title')}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t('assistenteIA.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistorico(!showHistorico)}
              className="text-xs md:text-sm"
            >
              <History className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Histórico</span>
              {sessoes && sessoes.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{sessoes.length}</Badge>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchSugestoes()}
              className="text-xs md:text-sm"
            >
              <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t('common.atualizar')}</span>
            </Button>
            {messages.length > 0 && (
              <Button 
                variant="default" 
                size="sm"
                onClick={novaConversa}
                className="text-xs md:text-sm"
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Nova Conversa</span>
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* Painel de Histórico */}
          {showHistorico && (
            <Card className="w-72 md:w-80 flex-shrink-0 flex flex-col overflow-hidden">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Conversas Anteriores
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowHistorico(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-3 pb-3">
                  {sessoesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="py-2 px-2">
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ))
                  ) : !sessoes || sessoes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sem conversas anteriores</p>
                      <p className="text-xs mt-1">As suas conversas serão guardadas automaticamente</p>
                    </div>
                  ) : (
                    Object.entries(sessoesAgrupadas).map(([label, grupo]) => (
                      <div key={label} className="mb-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1">
                          {label}
                        </div>
                        {grupo.map((sessao) => (
                          <div
                            key={sessao.id}
                            onClick={() => carregarSessao(sessao.id)}
                            className={`group flex items-start gap-2 py-2 px-2 rounded-md cursor-pointer transition-colors ${
                              sessao.id === sessaoAtualId 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate leading-tight">
                                {sessao.titulo || 'Conversa sem título'}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(sessao.updatedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  · {sessao.totalMensagens || 0} msgs
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => eliminarSessao(sessao.id, e)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          
          {/* Área de Chat */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardContent className="h-full flex flex-col p-3 md:p-4 overflow-hidden">
              {/* Mensagens */}
              <ScrollArea className="flex-1 min-h-0 pr-2 md:pr-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 md:p-8">
                    <div className="p-3 md:p-4 bg-primary/10 rounded-full mb-3 md:mb-4">
                      <Sparkles className="h-8 w-8 md:h-12 md:w-12 text-primary" />
                    </div>
                    <h2 className="text-lg md:text-xl font-semibold mb-2">
                      {t('assistenteIA.title')}
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground max-w-md mb-4 md:mb-6">
                      {t('assistenteIA.descricaoAjuda')}
                    </p>
                    
                    {/* Indicador de voz */}
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 bg-muted/50 px-3 md:px-4 py-2 rounded-full">
                      <Mic className="h-3 w-3 md:h-4 md:w-4" />
                      <span>{t('assistenteIA.gravarVoz')}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <HelpCircle className="h-3 w-3" />
                        {t('assistenteIA.lojasEGestores')}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <HelpCircle className="h-3 w-3" />
                        {t('assistenteIA.relatorios')}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <HelpCircle className="h-3 w-3" />
                        {t('assistenteIA.pendentes')}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <HelpCircle className="h-3 w-3" />
                        {t('assistenteIA.ocorrencias')}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <HelpCircle className="h-3 w-3" />
                        {t('assistenteIA.tarefasToDo')}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <HelpCircle className="h-3 w-3" />
                        {t('assistenteIA.resultados')}
                      </Badge>
                    </div>
                    
                    {/* Botão de histórico quando não há mensagens */}
                    {sessoes && sessoes.length > 0 && !showHistorico && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setShowHistorico(true)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        Ver {sessoes.length} conversa{sessoes.length > 1 ? 's' : ''} anterior{sessoes.length > 1 ? 'es' : ''}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4 py-3 md:py-4">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-2 md:gap-3 ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[calc(100vw-5rem)] sm:max-w-[85%] md:max-w-[80%] rounded-lg px-3 py-2 md:px-4 md:py-3 overflow-hidden ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.role === 'assistant' ? (
                            <div 
                              className="prose prose-sm dark:prose-invert max-w-none text-sm"
                              style={{ 
                                wordBreak: 'break-word', 
                                overflowWrap: 'anywhere',
                                hyphens: 'auto'
                              }}
                            >
                              <div 
                                className="chatbot-content"
                                style={{
                                  overflowX: 'auto',
                                  WebkitOverflowScrolling: 'touch'
                                }}
                              >
                                <Streamdown>{msg.content}</Streamdown>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{msg.content}</p>
                          )}
                          <p className="text-xs opacity-60 mt-1 md:mt-2">
                            {msg.timestamp.toLocaleTimeString('pt-PT', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center">
                            <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-2 md:gap-3 justify-start">
                        <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-3 py-2 md:px-4 md:py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              
              {/* Input com botão de voz */}
              <form onSubmit={handleSubmit} className="mt-3 md:mt-4 flex gap-2 flex-shrink-0">
                <div className="flex-1 flex gap-2 items-center bg-background border rounded-md px-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('assistenteIA.placeholder')}
                    disabled={isLoading}
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base"
                  />
                  <VoiceChatInput 
                    onTranscriptionComplete={handleVoiceTranscription}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" disabled={isLoading || !input.trim()} size="sm" className="md:size-default px-3">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {/* Painel de Sugestões - Hidden on mobile */}
          <Card className="w-80 flex-shrink-0 hidden lg:flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                {t('assistenteIA.sugestoes')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2">
                {sugestoesLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-start gap-2 py-2 px-3">
                      <Skeleton className="h-3 w-3 rounded-sm flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))
                ) : sugestoes?.length ? (
                  sugestoes.map((sugestao, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 px-3 text-sm font-normal hover:bg-primary/10"
                      onClick={() => enviarPergunta(sugestao)}
                      disabled={isLoading}
                    >
                      <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2">{sugestao}</span>
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('assistenteIA.semSugestoes')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
