import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { VoiceChatInput } from "@/components/VoiceChatInput";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  HelpCircle,
  Mic,
  RefreshCw
} from "lucide-react";
import { Streamdown } from "streamdown";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type ChatbotPortalLojaProps = {
  token: string;
  language: string;
  isVolante?: boolean;
};

export function ChatbotPortalLoja({ token, language, isVolante = false }: ChatbotPortalLojaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
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

  // Usar a procedure correta baseado no tipo de portal
  const chatMutationLoja = trpc.todosPortalLoja.chatbot.useMutation({
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(language === 'pt' 
        ? 'Erro ao processar pergunta. Tente novamente.' 
        : 'Error processing question. Please try again.');
      setIsLoading(false);
    }
  });

  const chatMutationVolante = trpc.portalVolante.chatbot.useMutation({
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(language === 'pt' 
        ? 'Erro ao processar pergunta. Tente novamente.' 
        : 'Error processing question. Please try again.');
      setIsLoading(false);
    }
  });

  const chatMutation = isVolante ? chatMutationVolante : chatMutationLoja;

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
        token,
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
        content: language === 'pt' 
          ? 'Desculpe, ocorreu um erro ao processar a sua pergunta. Por favor, tente novamente.'
          : 'Sorry, an error occurred while processing your question. Please try again.',
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
    enviarPergunta(transcription);
  };

  // Categorias para badges
  const categorias = language === 'pt' ? [
    isVolante ? 'Lojas Atribuídas' : 'Resultados',
    'Tarefas',
    'Pendentes',
    isVolante ? 'Agendamentos' : 'Reuniões',
    isVolante ? 'Pedidos de Apoio' : 'Dados Nacionais'
  ] : [
    isVolante ? 'Assigned Stores' : 'Results',
    'Tasks',
    'Pending',
    isVolante ? 'Appointments' : 'Meetings',
    isVolante ? 'Support Requests' : 'National Data'
  ];

  // Sugestões de perguntas
  const sugestoesLoja = language === 'pt' ? [
    "Quais são os meus resultados este mês?",
    "Quantas tarefas tenho pendentes?",
    "Como está a minha performance comparada com outras lojas?",
    "Quais são os meus objetivos para este mês?",
    "Tenho alguma reunião agendada?"
  ] : [
    "What are my results this month?",
    "How many tasks do I have pending?",
    "How is my performance compared to other stores?",
    "What are my goals for this month?",
    "Do I have any meetings scheduled?"
  ];

  const sugestoesVolante = language === 'pt' ? [
    "Quais lojas tenho atribuídas?",
    "Tenho pedidos de apoio pendentes?",
    "Qual é o meu próximo agendamento?",
    "Como estão as lojas da minha zona?",
    "Tenho algum bloqueio de dia agendado?"
  ] : [
    "Which stores are assigned to me?",
    "Do I have pending support requests?",
    "What is my next appointment?",
    "How are the stores in my zone?",
    "Do I have any day blocks scheduled?"
  ];

  const sugestoes = isVolante ? sugestoesVolante : sugestoesLoja;

  // Limpar conversa
  const limparConversa = () => {
    setMessages([]);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Mensagens */}
      <ScrollArea className="flex-1 min-h-0 pr-2 md:pr-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 md:p-8">
            <div className="p-3 md:p-4 bg-primary/10 rounded-full mb-3 md:mb-4">
              <Sparkles className="h-8 w-8 md:h-12 md:w-12 text-primary" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold mb-2">
              PoweringEG
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mb-4 md:mb-6">
              {language === 'pt'
                ? 'Pergunte-me sobre lojas, gestores, relatórios, pendentes ou qualquer informação da plataforma.'
                : 'Ask me about stores, managers, reports, pending items or any platform information.'}
            </p>
            
            {/* Indicador de voz */}
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 bg-muted/50 px-3 md:px-4 py-2 rounded-full">
              <Mic className="h-3 w-3 md:h-4 md:w-4" />
              <span>{language === 'pt' ? 'Gravar mensagem de voz' : 'Record voice message'}</span>
            </div>
            
            {/* Badges de categorias */}
            <div className="flex flex-wrap gap-2 justify-center mb-4 md:mb-6">
              {categorias.map((cat, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 text-xs">
                  <HelpCircle className="h-3 w-3" />
                  {cat}
                </Badge>
              ))}
            </div>
            
            {/* Sugestões de perguntas */}
            <div className="w-full max-w-lg space-y-2">
              {sugestoes.map((sugestao, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2 px-3 text-xs md:text-sm font-normal"
                  onClick={() => enviarPergunta(sugestao)}
                  disabled={isLoading}
                >
                  {sugestao}
                </Button>
              ))}
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
      
      {/* Input com botão de voz - Fixed at bottom */}
      <form onSubmit={handleSubmit} className="mt-3 md:mt-4 flex gap-2 flex-shrink-0 border-t pt-3 md:pt-4">
        <div className="flex-1 flex gap-2 items-center bg-background border rounded-md px-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === 'pt' ? 'Escreva a sua mensagem...' : 'Write your message...'}
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
    </div>
  );
}
