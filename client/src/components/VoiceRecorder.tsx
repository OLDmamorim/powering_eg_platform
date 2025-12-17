import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Square, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcription: string) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onTranscriptionComplete, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const transcribeMutation = trpc.voiceTranscription.transcribe.useMutation();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Timer para mostrar tempo de gravação
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success("Gravação iniciada");
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast.error("Erro ao aceder ao microfone. Verifique as permissões.");
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
      toast.success("Gravação concluída");
    }
  };

  const processAudio = async () => {
    if (!audioBlob) {
      toast.error("Nenhum áudio gravado");
      return;
    }

    // Verificar tamanho (limite 16MB)
    if (audioBlob.size > 16 * 1024 * 1024) {
      toast.error("Áudio muito grande (máx 16MB). Grave um áudio mais curto.");
      return;
    }

    setIsProcessing(true);

    try {
      // Upload para S3
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const uploadResponse = await fetch(`${import.meta.env.VITE_FRONTEND_FORGE_API_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_FRONTEND_FORGE_API_KEY}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Erro ao fazer upload do áudio');
      }

      const { url: audioUrl } = await uploadResponse.json();

      // Chamar backend para transcrição usando tRPC
      const transcriptionResult = await transcribeMutation.mutateAsync({
        audioUrl,
        language: 'pt',
      });
      
      // Verificar se houve erro
      if ('error' in transcriptionResult) {
        throw new Error(String(transcriptionResult.error));
      }
      
      const transcription = transcriptionResult.text;

      toast.success("Transcrição concluída!");
      onTranscriptionComplete(transcription);
      
      // Limpar estado
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error("Erro ao processar áudio:", error);
      toast.error("Erro ao processar áudio. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">Relatório por Voz</h3>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-red-600">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {isRecording 
            ? "Descreva a visita em voz alta. Clique em 'Parar' quando terminar."
            : audioBlob
            ? "Áudio gravado! Clique em 'Processar' para transcrever e preencher o relatório."
            : "Clique em 'Gravar' e descreva a visita. A IA irá estruturar automaticamente o relatório."}
        </p>

        <div className="flex gap-2">
          {!isRecording && !audioBlob && (
            <Button
              onClick={startRecording}
              disabled={disabled || isProcessing}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Mic className="mr-2 h-4 w-4" />
              Gravar
            </Button>
          )}

          {isRecording && (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex-1"
            >
              <Square className="mr-2 h-4 w-4" />
              Parar Gravação
            </Button>
          )}

          {audioBlob && !isProcessing && (
            <>
              <Button
                onClick={() => {
                  setAudioBlob(null);
                  setRecordingTime(0);
                }}
                variant="outline"
                className="flex-1"
              >
                Descartar
              </Button>
              <Button
                onClick={processAudio}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Processar
              </Button>
            </>
          )}

          {isProcessing && (
            <Button disabled className="flex-1">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A processar...
            </Button>
          )}
        </div>

        {audioBlob && (
          <div className="text-xs text-muted-foreground text-center">
            Tamanho: {(audioBlob.size / 1024 / 1024).toFixed(2)} MB | Duração: {formatTime(recordingTime)}
          </div>
        )}
      </div>
    </Card>
  );
}
