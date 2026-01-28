import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { toast } from "sonner";

type ChatbotPortalLojaProps = {
  token: string;
  language: string;
  isVolante?: boolean; // Indica se é o Portal do Volante
};

export function ChatbotPortalLoja({ token, language, isVolante = false }: ChatbotPortalLojaProps) {
  const [messages, setMessages] = useState<Message[]>([]);

  // Usar a procedure correta baseado no tipo de portal
  const chatMutationLoja = trpc.todosPortalLoja.chatbot.useMutation({
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.resposta
      }]);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(language === 'pt' 
        ? 'Erro ao processar pergunta. Tente novamente.' 
        : 'Error processing question. Please try again.');
    }
  });

  const chatMutationVolante = trpc.portalVolante.chatbot.useMutation({
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.resposta
      }]);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(language === 'pt' 
        ? 'Erro ao processar pergunta. Tente novamente.' 
        : 'Error processing question. Please try again.');
    }
  });

  // Usar a mutação correta baseado no tipo de portal
  const chatMutation = isVolante ? chatMutationVolante : chatMutationLoja;

  const handleSend = (content: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    
    // Converter para o formato esperado pelo backend (sem system messages)
    const historico = newMessages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));
    
    chatMutation.mutate({
      token,
      pergunta: content,
      historico: historico.slice(0, -1) // Remove a última mensagem (a pergunta atual)
    });
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

  return (
    <AIChatBox
      messages={messages}
      onSendMessage={handleSend}
      isLoading={chatMutation.isPending}
      placeholder={language === 'pt' ? 'Faça uma pergunta...' : 'Ask a question...'}
      emptyStateMessage={language === 'pt' 
        ? 'Comece uma conversa com o assistente IA' 
        : 'Start a conversation with the AI assistant'}
      suggestedPrompts={sugestoes}
      height="500px"
    />
  );
}
