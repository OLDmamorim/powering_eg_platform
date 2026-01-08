import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RefreshCw,
  MessageSquare,
  Lightbulb,
  HelpCircle
} from 'lucide-react';
import { Streamdown } from 'streamdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AssistenteIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = trpc.chatbot.pergunta.useMutation();
  const { data: sugestoes, refetch: refetchSugestoes } = trpc.chatbot.sugestoes.useQuery();
  
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
        content: 'Desculpe, ocorreu um erro ao processar a sua pergunta. Por favor, tente novamente.',
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
  
  const limparConversa = () => {
    setMessages([]);
  };
  
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Assistente IA</h1>
              <p className="text-sm text-muted-foreground">
                Pergunte-me qualquer coisa sobre a plataforma
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchSugestoes()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Novas sugestões
            </Button>
            {messages.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={limparConversa}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Nova conversa
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Área de Chat */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="flex-1 flex flex-col p-4 min-h-0">
              {/* Mensagens */}
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                      <Sparkles className="h-12 w-12 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">
                      Olá! Sou o Assistente IA da PoweringEG
                    </h2>
                    <p className="text-muted-foreground max-w-md mb-6">
                      Posso ajudá-lo com informações sobre lojas, gestores, relatórios, 
                      pendentes, alertas, ocorrências, tarefas, reuniões e muito mais.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        Lojas e Gestores
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        Relatórios
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        Pendentes
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        Ocorrências
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        Tarefas To-Do
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        Resultados
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <Streamdown>{msg.content}</Streamdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          )}
                          <p className="text-xs opacity-60 mt-2">
                            {msg.timestamp.toLocaleTimeString('pt-PT', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-4 py-3">
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
              
              {/* Input */}
              <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escreva a sua pergunta..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {/* Painel de Sugestões */}
          <Card className="w-80 flex-shrink-0 hidden lg:flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Sugestões de Perguntas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2">
                {sugestoes?.map((sugestao, index) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
