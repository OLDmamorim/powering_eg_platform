import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import { VoiceChatInput } from '@/components/VoiceChatInput';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RefreshCw,
  MessageSquare,
  ExternalLink,
  Loader2,
  LogIn,
  Download,
  Trash2
} from 'lucide-react';
import { Streamdown } from 'streamdown';
import { getLoginUrl } from '@/const';
import { toast } from 'sonner';
import { usePWAInstallAssistente } from '@/hooks/usePWAInstallAssistente';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AssistenteWidget() {
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const { isInstallable, isInstalled, install } = usePWAInstallAssistente();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const chatMutation = trpc.chatbot.pergunta.useMutation();
  
  // O hook usePWAInstallAssistente já trata da troca de manifest automaticamente
  
  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      }
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
      inputRef.current?.focus();
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarPergunta(input);
  };

  const handleVoiceTranscription = (transcription: string) => {
    enviarPergunta(transcription);
  };
  
  const limparConversa = () => {
    setMessages([]);
    toast.success(language === 'pt' ? 'Conversa limpa!' : 'Conversation cleared!');
  };

  // Tela de loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Tela de login
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <Bot className="h-12 w-12 mx-auto text-violet-600 mb-4" />
            <h1 className="text-xl font-bold mb-2">PoweringEG</h1>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'pt' ? 'Faça login para usar o assistente' : 'Login to use the assistant'}
            </p>
            <Button
              className="w-full bg-violet-600 hover:bg-violet-700"
              onClick={() => window.location.href = getLoginUrl()}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {language === 'pt' ? 'Fazer Login' : 'Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificar se é gestor ou admin
  const isAuthorized = user.role === 'admin' || user.role === 'gestor';
  
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <Bot className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h1 className="text-xl font-bold mb-2">{language === 'pt' ? 'Acesso Restrito' : 'Restricted Access'}</h1>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'pt' 
                ? 'O PoweringEG está disponível apenas para gestores e administradores.' 
                : 'The AI Assistant is only available for managers and administrators.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sugestões rápidas
  const sugestoesRapidas = language === 'pt' 
    ? [
        'Quantos pendentes tenho?',
        'Qual loja tem mais alertas?',
        'Resumo da semana',
      ]
    : [
        'How many pending items?',
        'Which store has most alerts?',
        'Weekly summary',
      ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex flex-col">
      {/* Header Compacto */}
      <header className="bg-violet-600 text-white p-3 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <div>
              <h1 className="font-semibold text-sm leading-tight">PoweringEG</h1>
              <p className="text-xs text-violet-200">
                {user?.name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {isInstallable && !isInstalled && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-violet-700 h-8 px-2 text-xs bg-green-600/20"
                onClick={async () => {
                  toast.info(
                    language === 'pt' 
                      ? 'A preparar instalação...' 
                      : 'Preparing installation...',
                    { duration: 2000 }
                  );
                  const result = await install();
                  if (result === 'ios') {
                    toast.info(
                      language === 'pt' 
                        ? 'No iOS: Toque em "Partilhar" e depois "Adicionar ao Ecrã Principal"' 
                        : 'On iOS: Tap "Share" then "Add to Home Screen"',
                      { duration: 6000 }
                    );
                  } else if (result === 'manual') {
                    // Mostrar instruções de instalação manual
                    toast.info(
                      language === 'pt' 
                        ? 'Toque no menu ⋮ do Chrome e selecione "Instalar aplicação" ou "Adicionar ao ecrã inicial"' 
                        : 'Tap Chrome menu ⋮ and select "Install app" or "Add to home screen"',
                      { duration: 8000 }
                    );
                  } else if (result === true) {
                    toast.success(language === 'pt' ? 'App instalada com sucesso!' : 'App installed successfully!');
                  } else if (result === false) {
                    toast.info(language === 'pt' ? 'Instalação cancelada' : 'Installation cancelled');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                {language === 'pt' ? 'Instalar' : 'Install'}
              </Button>
            )}
            {messages.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-violet-700 h-8 w-8 p-0"
                onClick={limparConversa}
                title={language === 'pt' ? 'Limpar conversa' : 'Clear conversation'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-violet-700 h-8 w-8 p-0"
              onClick={() => window.location.href = '/assistente-ia'}
              title={language === 'pt' ? 'Abrir versão completa' : 'Open full version'}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="p-3 bg-violet-100 rounded-full mb-3">
                <Sparkles className="h-8 w-8 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold mb-2">
                {language === 'pt' ? 'Olá! Como posso ajudar?' : 'Hello! How can I help?'}
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">
                {language === 'pt' 
                  ? 'Pergunte sobre lojas, pendentes, relatórios, alertas ou qualquer informação da plataforma.'
                  : 'Ask about stores, pending items, reports, alerts or any platform information.'}
              </p>
              
              {/* Sugestões rápidas */}
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {sugestoesRapidas.map((sugestao, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white/80 hover:bg-violet-100 border-violet-200"
                    onClick={() => enviarPergunta(sugestao)}
                    disabled={isLoading}
                  >
                    {sugestao}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-violet-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white'
                        : 'bg-white shadow-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm overflow-x-auto [&_table]:min-w-[300px] [&_table]:text-xs [&_table]:w-max [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-violet-200' : 'text-muted-foreground'}`}>
                      {msg.timestamp.toLocaleTimeString('pt-PT', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="bg-white shadow-sm rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area - Fixed at bottom */}
        <div className="p-3 bg-white/80 backdrop-blur-sm border-t">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <div className="flex-1 flex gap-2 items-center bg-white border rounded-lg px-2 shadow-sm">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={language === 'pt' ? 'Escreva a sua pergunta...' : 'Type your question...'}
                disabled={isLoading}
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              />
              <VoiceChatInput
                onTranscriptionComplete={handleVoiceTranscription}
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 bg-violet-600 hover:bg-violet-700 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
