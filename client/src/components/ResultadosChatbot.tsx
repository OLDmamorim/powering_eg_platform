import { useState, useRef, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Loader2, Send, MessageCircle, Sparkles, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function ResultadosChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Query para sugestões
  const { data: sugestoes } = trpc.resultados.sugestoesChatbot.useQuery(undefined, {
    enabled: isOpen && messages.length === 0,
  });
  
  // Mutation para enviar pergunta
  const chatMutation = trpc.resultados.chatbot.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.resposta,
      }]);
    },
    onError: (error) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar a sua pergunta. Por favor, tente novamente.',
      }]);
      console.error('Erro no chatbot:', error);
    },
  });
  
  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSend = () => {
    if (!inputValue.trim() || chatMutation.isPending) return;
    
    const pergunta = inputValue.trim();
    setInputValue('');
    
    // Adicionar mensagem do utilizador
    setMessages(prev => [...prev, {
      role: 'user',
      content: pergunta,
    }]);
    
    // Enviar para o backend
    chatMutation.mutate({
      pergunta,
      historico: messages,
    });
  };
  
  const handleSugestao = (sugestao: string) => {
    setInputValue(sugestao);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Botão flutuante quando fechado
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }
  
  return (
    <Card className={cn(
      "fixed z-50 shadow-2xl transition-all duration-300",
      isExpanded 
        ? "bottom-4 right-4 left-4 top-20 md:left-auto md:w-[600px] md:h-[80vh]" 
        : "bottom-4 right-4 w-[380px] h-[500px]"
    )}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Assistente de Dados</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col h-[calc(100%-80px)] p-0">
        {/* Área de mensagens */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center text-muted-foreground py-4">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/50" />
                <p className="text-sm">
                  Faça perguntas sobre os dados de resultados das lojas.
                </p>
                <p className="text-xs mt-1">
                  Exemplo: "Quantos serviços fez Viana em Agosto?"
                </p>
              </div>
              
              {sugestoes && sugestoes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Sugestões:</p>
                  <div className="flex flex-wrap gap-2">
                    {sugestoes.slice(0, 4).map((sugestao, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1.5 px-2 whitespace-normal text-left"
                        onClick={() => handleSugestao(sugestao)}
                      >
                        {sugestao}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Faça uma pergunta..."
              disabled={chatMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || chatMutation.isPending}
              size="icon"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
