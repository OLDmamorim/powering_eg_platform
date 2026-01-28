import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  HelpCircle,
  Mic
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
  isVolante?: boolean; // Indica se é o Portal do Volante
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

  // Usar a mutação correta baseado no tipo de portal
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
      console.error('Erro ao enviar pergunta:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarPergunta(input);
  };

  const sugestoesLoja = language === 'pt' ? [
    "Quais são os meus resultados este mês?",
    "Quantas tarefas tenho pendentes?",
    "Como está a minha performance comparada com outras lojas?",
    "Quais são os meus objetivos para este mês?",
    "Tenho alguma reunião agendada?"
  ] : [
    "What are my results this month?",
    "How many pending tasks do I have?",
    "How is my performance compared to other stores?",
    "What are my goals for this month?",
    "Do I have any scheduled meetings?"
  ];

  const sugestoesVolante = language === 'pt' ? [
    "Quais são os resultados das minhas lojas este mês?",
    "Que lojas têm mais pedidos de apoio pendentes?",
    "Quantos agendamentos tenho esta semana?",
    "Quais lojas estão com melhor performance?",
    "Tenho algum bloqueio de dias agendado?"
  ] : [
    "What are the results of my stores this month?",
    "Which stores have the most pending support requests?",
    "How many appointments do I have this week?",
    "Which stores have the best performance?",
    "Do I have any day blocks scheduled?"
  ];

  const sugestoes = isVolante ? sugestoesVolante : sugestoesLoja;
  
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

  return (
    <div className="h-full flex flex-col">
      {/* Mensagens */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              PoweringEG
            </h2>
            <p className="text-base text-muted-foreground max-w-md mb-6">
              {language === 'pt'
                ? 'Pergunte-me sobre lojas, gestores, relatórios, pendentes ou qualquer informação da plataforma.'
                : 'Ask me about stores, managers, reports, pending items or any platform information.'}
            </p>
            
            {/* Botão de voz (placeholder) */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 bg-muted/50 px-4 py-2 rounded-full">
              <Mic className="h-4 w-4" />
              <span>{language === 'pt' ? 'Gravar mensagem de voz' : 'Record voice message'}</span>
            </div>
            
            {/* Badges de categorias */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {categorias.map((cat, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 text-xs">
                  <HelpCircle className="h-3 w-3" />
                  {cat}
                </Badge>
              ))}
            </div>
            
            {/* Sugestões de perguntas */}
            <div className="w-full max-w-2xl space-y-2">
              {sugestoes.slice(0, 5).map((sugestao, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4 text-sm font-normal"
                  onClick={() => enviarPergunta(sugestao)}
                  disabled={isLoading}
                >
                  {sugestao}
                </Button>
              ))}
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
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
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
      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={language === 'pt' ? 'Escreva a sua mensagem...' : 'Write your message...'}
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          size="icon"
          className="h-[60px] w-[60px] flex-shrink-0"
          disabled={isLoading || !input.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
