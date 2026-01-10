import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface VoiceChatInputProps {
  onTranscriptionComplete: (transcription: string) => void;
  disabled?: boolean;
}

export function VoiceChatInput({ onTranscriptionComplete, disabled }: VoiceChatInputProps) {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const uploadMutation = trpc.voiceTranscription.uploadAudio.useMutation();
  const transcribeMutation = trpc.voiceTranscription.transcribe.useMutation();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Priorizar formatos mais compatíveis com Whisper API
      let mimeType = '';
      
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else {
        mimeType = '';
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        // Processar automaticamente após parar
        await processAudio(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Timer para mostrar tempo de gravação
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success(t('assistenteIA.gravacaoIniciada'));
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast.error(t('assistenteIA.erroMicrofone'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // Remover o handler onstop para não processar
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    chunksRef.current = [];
    toast.info(t('assistenteIA.gravacaoCancelada'));
  };

  const processAudio = async (audioBlob: Blob) => {
    // Verificar tamanho (limite 16MB)
    if (audioBlob.size > 16 * 1024 * 1024) {
      toast.error(t('assistenteIA.audioMuitoGrande'));
      return;
    }
    
    // Verificar variáveis de ambiente
    const apiUrl = import.meta.env.VITE_FRONTEND_FORGE_API_URL;
    const apiKey = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
    
    if (!apiUrl || !apiKey) {
      toast.error(t('assistenteIA.erroConfiguracao'));
      return;
    }

    setIsProcessing(true);

    try {
      toast.info(t('assistenteIA.processandoAudio'));
      
      // Converter blob para base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      // Upload para S3 via tRPC
      const uploadResult = await uploadMutation.mutateAsync({
        audioBase64: base64Audio,
        mimeType: audioBlob.type,
      });
      
      const audioUrl = uploadResult.url;
      toast.info(t('assistenteIA.transcrevendo'));

      // Chamar backend para transcrição
      const transcriptionResult = await transcribeMutation.mutateAsync({
        audioUrl,
        language: 'pt',
      });
      
      // Verificar se houve erro
      if ('error' in transcriptionResult) {
        toast.error(`${t('assistenteIA.erroTranscricao')}: ${String(transcriptionResult.error).substring(0, 50)}`);
        throw new Error(String(transcriptionResult.error));
      }
      
      const transcription = transcriptionResult.text;
      toast.success(t('assistenteIA.transcricaoCompleta'));

      // Enviar transcrição para o chatbot
      onTranscriptionComplete(transcription);
      setRecordingTime(0);
    } catch (error) {
      console.error('[VoiceChatInput] Erro ao processar áudio:', error);
      
      let errorMessage = t('assistenteIA.erroDesconhecido');
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(`${t('common.erro')}: ${errorMessage}`, { duration: 10000 });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Botão de gravar/parar
  if (isProcessing) {
    return (
      <Button 
        type="button"
        variant="ghost" 
        size="icon"
        disabled
        className="relative"
      >
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </Button>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-1">
        {/* Indicador de gravação */}
        <div className="flex items-center gap-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-md">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-mono text-red-600 dark:text-red-400">
            {formatTime(recordingTime)}
          </span>
        </div>
        
        {/* Botão cancelar */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
        
        {/* Botão parar e enviar */}
        <Button
          type="button"
          variant="default"
          size="icon"
          onClick={stopRecording}
          className="h-8 w-8 bg-red-500 hover:bg-red-600"
        >
          <Square className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={startRecording}
      disabled={disabled}
      className={cn(
        "h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      title={t('assistenteIA.gravarVoz')}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
