import { useState, useRef, useEffect } from 'react';
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
  Mic
} from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = trpc.chatbot.pergunta.useMutation();
  const { data: sugestoes, isLoading: sugestoesLoading, refetch: refetchSugestoes } = trpc.chatbot.sugestoes.useQuery({ language });
  
  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
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
        historico
      });
      
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

  // Handler para transcrição de voz
  const handleVoiceTranscription = (transcription: string) => {
    // Enviar automaticamente a transcrição como pergunta
    enviarPergunta(transcription);
  };
  
  const limparConversa = () => {
    setMessages([]);
  };
  
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col gap-3 md:gap-4 overflow-hidden">
        {/* Header - Mobile optimized */}
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
              onClick={() => refetchSugestoes()}
              className="text-xs md:text-sm"
            >
              <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t('common.atualizar')}</span>
            </Button>
            {messages.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={limparConversa}
                className="text-xs md:text-sm"
              >
                <MessageSquare className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">{t('assistenteIA.limparConversa')}</span>
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* Área de Chat */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardContent className="flex-1 flex flex-col p-3 md:p-4 min-h-0 overflow-hidden">
              {/* Mensagens */}
              <ScrollArea className="flex-1 pr-2 md:pr-4" ref={scrollRef}>
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
                          className={`max-w-[85%] md:max-w-[80%] rounded-lg px-3 py-2 md:px-4 md:py-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                              <Streamdown>{msg.content}</Streamdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
              
              {/* Input com botão de voz - Fixed at bottom */}
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
                  // Skeleton loading para sugestões
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
