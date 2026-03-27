import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  FileText,
  Sparkles,
  Trash2,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Volume2,
  Download,
  ChevronDown,
  ChevronUp,
  Save,
  Pencil,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";

// Formatar duração em mm:ss ou hh:mm:ss
function formatDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Estado visual por estado da gravação
const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  a_gravar: { label: "A Gravar", color: "bg-red-100 text-red-700", icon: Mic },
  gravado: { label: "Gravado", color: "bg-blue-100 text-blue-700", icon: Volume2 },
  a_transcrever: { label: "A Transcrever...", color: "bg-amber-100 text-amber-700", icon: Loader2 },
  transcrito: { label: "Transcrito", color: "bg-green-100 text-green-700", icon: FileText },
  a_resumir: { label: "A Gerar Resumo...", color: "bg-purple-100 text-purple-700", icon: Loader2 },
  concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  erro: { label: "Erro", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

// ==================== GRAVADOR DE ÁUDIO ====================
function AudioRecorder({
  onGravacaoConcluida,
}: {
  onGravacaoConcluida: (audioBlob: Blob, duracao: number, mimeType: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [modoCaptura, setModoCaptura] = useState<"completo" | "microfone">("completo");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const allStreamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      allStreamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()));
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();

      // 1. Microfone (voz do utilizador)
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      allStreamsRef.current.push(micStream);
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(destination);

      // 2. Áudio do sistema (o que se ouve) - via getDisplayMedia
      let temAudioSistema = false;
      if (modoCaptura === "completo") {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true, // obrigatório, mas não usamos
            audio: true, // áudio do sistema
          });
          allStreamsRef.current.push(displayStream);

          // Verificar se tem tracks de áudio
          const audioTracks = displayStream.getAudioTracks();
          if (audioTracks.length > 0) {
            const sysSource = audioCtx.createMediaStreamSource(
              new MediaStream(audioTracks)
            );
            sysSource.connect(destination);
            temAudioSistema = true;
          }

          // Parar o vídeo (não precisamos)
          displayStream.getVideoTracks().forEach(t => t.stop());

          // Se o utilizador parar a partilha de ecrã, parar gravação
          displayStream.getAudioTracks().forEach(t => {
            t.onended = () => {
              // Track de áudio do sistema parou, mas a gravação continua só com microfone
            };
          });
        } catch (displayErr) {
          // Utilizador cancelou a partilha de ecrã ou browser não suporta
          // Continuar só com microfone
          console.warn("Sem áudio do sistema, a gravar só com microfone");
        }
      }

      // Stream combinado para gravação
      const combinedStream = destination.stream;
      streamRef.current = combinedStream;

      // Analisador de áudio para visualização
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      micSource.connect(analyser); // Visualizar nível do microfone
      analyserRef.current = analyser;

      // Determinar formato suportado
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onGravacaoConcluida(blob, duracao, mimeType.split(";")[0]);
        allStreamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()));
        allStreamsRef.current = [];
        streamRef.current = null;
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Chunks de 1 segundo
      setIsRecording(true);
      setIsPaused(false);
      setDuracao(0);

      if (modoCaptura === "completo" && !temAudioSistema) {
        toast.info("A gravar só com microfone (sem áudio do sistema)");
      } else if (temAudioSistema) {
        toast.success("A gravar microfone + áudio do sistema");
      }

      // Timer de duração
      timerRef.current = setInterval(() => {
        setDuracao(prev => prev + 1);
      }, 1000);

      // Visualização de nível de áudio
      const updateLevel = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      toast.error("Não foi possível aceder ao microfone. Verifique as permissões do browser.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => setDuracao(prev => prev + 1), 1000);
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) clearInterval(timerRef.current);
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // Verificar tamanho estimado (16MB limit)
  const tamanhoEstimado = duracao * 16000; // ~16KB/s para webm opus
  const excedeLimite = tamanhoEstimado > 16 * 1024 * 1024;

  return (
    <div className="space-y-4">
      {/* Selector de modo de captura */}
      {!isRecording && (
        <div className="flex justify-center gap-2">
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
              modoCaptura === "completo"
                ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setModoCaptura("completo")}
          >
            <Volume2 className="h-3.5 w-3.5" />
            Reunião Completa
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
              modoCaptura === "microfone"
                ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setModoCaptura("microfone")}
          >
            <Mic className="h-3.5 w-3.5" />
            Só Microfone
          </button>
        </div>
      )}
      {!isRecording && modoCaptura === "completo" && (
        <p className="text-[11px] text-muted-foreground text-center">
          Ao iniciar, o browser vai pedir para partilhar o ecrã. Selecione o separador/janela da reunião e marque <strong>"Partilhar áudio"</strong> para captar o que ouve.
        </p>
      )}

      {/* Visualização de nível de áudio */}
      {isRecording && (
        <div className="flex items-center justify-center gap-1 h-16">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-red-500 transition-all duration-75"
              style={{
                height: `${Math.max(4, audioLevel * 64 * (0.5 + Math.random() * 0.5))}px`,
                opacity: 0.4 + audioLevel * 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* Timer */}
      <div className="text-center">
        <span className={`text-4xl font-mono font-bold ${isRecording && !isPaused ? "text-red-600" : "text-foreground"}`}>
          {formatDuracao(duracao)}
        </span>
        {isRecording && (
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-amber-500" : "bg-red-500 animate-pulse"}`} />
            <span className="text-xs text-muted-foreground">
              {isPaused ? "Em pausa" : "A gravar..."}
            </span>
          </div>
        )}
        {excedeLimite && (
          <p className="text-xs text-destructive mt-1 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Gravação longa — pode exceder o limite de 16MB
          </p>
        )}
      </div>

      {/* Controlos */}
      <div className="flex items-center justify-center gap-3">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            size="lg"
            className="gap-2 bg-red-600 hover:bg-red-700 text-white rounded-full h-14 w-14 p-0"
          >
            <Mic className="h-6 w-6" />
          </Button>
        ) : (
          <>
            <Button
              onClick={pauseRecording}
              variant="outline"
              size="lg"
              className="rounded-full h-12 w-12 p-0"
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button
              onClick={stopRecording}
              size="lg"
              className="gap-2 bg-gray-800 hover:bg-gray-900 text-white rounded-full h-14 w-14 p-0"
            >
              <Square className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {!isRecording && duracao === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Clica no microfone para começar a gravar
        </p>
      )}
    </div>
  );
}

// ==================== TIPO SEGMENTO ====================
interface Segmento {
  start: number;
  end: number;
  text: string;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ==================== TRANSCRIÇÃO EDITÁVEL POR BLOCOS ====================
function TranscricaoEditavel({
  segmentos,
  onSegmentosChange,
  onGuardar,
  aGuardar,
  editavel,
}: {
  segmentos: Segmento[];
  onSegmentosChange: (segs: Segmento[]) => void;
  onGuardar: () => void;
  aGuardar: boolean;
  editavel: boolean;
}) {
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [alterado, setAlterado] = useState(false);

  const iniciarEdicao = (idx: number) => {
    if (!editavel) return;
    setEditandoIdx(idx);
    setTextoEditado(segmentos[idx].text);
  };

  const confirmarEdicao = (idx: number) => {
    const novosSegmentos = [...segmentos];
    novosSegmentos[idx] = { ...novosSegmentos[idx], text: textoEditado };
    onSegmentosChange(novosSegmentos);
    setEditandoIdx(null);
    setAlterado(true);
  };

  const cancelarEdicao = () => {
    setEditandoIdx(null);
    setTextoEditado("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          Transcrição por Blocos
        </h3>
        {editavel && alterado && (
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs gap-1"
            onClick={() => { onGuardar(); setAlterado(false); }}
            disabled={aGuardar}
          >
            {aGuardar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Guardar Alterações
          </Button>
        )}
      </div>
      {editavel && (
        <p className="text-xs text-muted-foreground mb-2">
          Clique num bloco para editar o texto. Corrija nomes, termos técnicos ou frases incorretas antes de gerar o resumo.
        </p>
      )}
      <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1">
        {segmentos.map((seg, idx) => (
          <div
            key={idx}
            className={`group flex gap-2 rounded-lg p-2 transition-colors ${
              editandoIdx === idx
                ? 'bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-300'
                : editavel
                  ? 'hover:bg-muted/60 cursor-pointer'
                  : 'bg-muted/30'
            }`}
            onClick={() => editandoIdx === null && iniciarEdicao(idx)}
          >
            {/* Timestamp */}
            <div className="flex-shrink-0 pt-0.5">
              <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                {formatTimestamp(seg.start)}
              </span>
            </div>
            {/* Texto */}
            <div className="flex-1 min-w-0">
              {editandoIdx === idx ? (
                <div className="space-y-1.5">
                  <Textarea
                    value={textoEditado}
                    onChange={(e) => setTextoEditado(e.target.value)}
                    className="text-xs min-h-[60px] resize-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        confirmarEdicao(idx);
                      }
                      if (e.key === 'Escape') cancelarEdicao();
                    }}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" className="h-6 text-[10px] gap-0.5" onClick={() => confirmarEdicao(idx)}>
                      <Save className="h-2.5 w-2.5" /> OK
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={cancelarEdicao}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1">
                  <p className="text-xs leading-relaxed flex-1">{seg.text}</p>
                  {editavel && (
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== DIALOG DE NOVA GRAVAÇÃO ====================
export function NovaGravacaoDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [etapa, setEtapa] = useState<"gravar" | "processar" | "editar" | "a_resumir" | "resultado">("gravar");
  const [gravacaoId, setGravacaoId] = useState<number | null>(null);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [transcricao, setTranscricao] = useState("");
  const [resumo, setResumo] = useState("");
  const [processando, setProcessando] = useState(false);
  const [etapaProcesso, setEtapaProcesso] = useState("");

  const utils = trpc.useUtils();

  const criarMutation = trpc.notas.criarGravacao.useMutation();
  const uploadMutation = trpc.notas.uploadAudioGravacao.useMutation();
  const transcreverMutation = trpc.notas.transcreverGravacao.useMutation();
  const guardarTranscricaoMutation = trpc.notas.guardarTranscricaoEditada.useMutation();
  const resumoMutation = trpc.notas.gerarResumoGravacao.useMutation();

  const handleGravacaoConcluida = async (audioBlob: Blob, duracao: number, mimeType: string) => {
    if (!titulo.trim()) {
      toast.error("Insere um título para a gravação");
      return;
    }

    setEtapa("processar");
    setProcessando(true);

    try {
      // 1. Criar registo na DB
      setEtapaProcesso("A criar registo...");
      const gravacao = await criarMutation.mutateAsync({ titulo: titulo.trim() });
      if (!gravacao) throw new Error("Erro ao criar gravação");
      setGravacaoId(gravacao.id);

      // 2. Upload áudio para S3
      setEtapaProcesso("A enviar áudio...");
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(audioBlob);
      });

      await uploadMutation.mutateAsync({
        gravacaoId: gravacao.id,
        audioBase64: base64,
        mimeType,
        duracaoSegundos: duracao,
      });

      // 3. Transcrever (agora devolve segmentos)
      setEtapaProcesso("A transcrever áudio...");
      const resultTranscricao = await transcreverMutation.mutateAsync({
        gravacaoId: gravacao.id,
      });
      setTranscricao(resultTranscricao.transcricao);
      
      // Se temos segmentos, mostrar a etapa de edição
      const segs = (resultTranscricao as any).segmentos;
      if (segs && segs.length > 0) {
        setSegmentos(segs);
        setEtapa("editar");
        toast.success("Transcrição concluída! Reveja e corrija os blocos antes de gerar o resumo.");
      } else {
        // Sem segmentos, criar blocos artificiais (1 bloco por frase)
        const frases = resultTranscricao.transcricao.split(/(?<=[.!?])\s+/).filter((f: string) => f.trim());
        const segsFallback: Segmento[] = frases.map((f: string, i: number) => ({
          start: i * 30,
          end: (i + 1) * 30,
          text: f.trim(),
        }));
        setSegmentos(segsFallback);
        setEtapa("editar");
        toast.success("Transcrição concluída! Reveja os blocos antes de gerar o resumo.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar gravação");
      setEtapa("gravar");
    } finally {
      setProcessando(false);
      setEtapaProcesso("");
    }
  };

  const handleGuardarTranscricao = async () => {
    if (!gravacaoId) return;
    try {
      await guardarTranscricaoMutation.mutateAsync({
        gravacaoId,
        segmentos,
      });
      toast.success("Transcrição guardada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao guardar transcrição");
    }
  };

  const handleGerarResumo = async () => {
    if (!gravacaoId) return;
    setEtapa("a_resumir");
    setProcessando(true);
    try {
      // Guardar transcrição editada primeiro
      await guardarTranscricaoMutation.mutateAsync({
        gravacaoId,
        segmentos,
      });
      
      // Gerar resumo IA
      const resultResumo = await resumoMutation.mutateAsync({
        gravacaoId,
      });
      setResumo(typeof resultResumo.resumo === 'string' ? resultResumo.resumo : '');
      setEtapa("resultado");
      utils.notas.listarGravacoes.invalidate();
      toast.success("Resumo IA gerado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar resumo");
      setEtapa("editar");
    } finally {
      setProcessando(false);
    }
  };

  const handleClose = () => {
    setTitulo("");
    setEtapa("gravar");
    setGravacaoId(null);
    setSegmentos([]);
    setTranscricao("");
    setResumo("");
    setProcessando(false);
    setEtapaProcesso("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-red-500" />
            {etapa === "gravar" ? "Gravar Reunião" 
              : etapa === "processar" ? "A Processar..." 
              : etapa === "editar" ? "Rever Transcrição" 
              : etapa === "a_resumir" ? "A Gerar Resumo..."
              : "Resultado"}
          </DialogTitle>
        </DialogHeader>

        {etapa === "gravar" && (
          <div className="space-y-4">
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da reunião (ex: Reunião semanal Famalicão)"
              className="text-lg"
            />
            <AudioRecorder onGravacaoConcluida={handleGravacaoConcluida} />
          </div>
        )}

        {etapa === "processar" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-lg font-medium">{etapaProcesso}</p>
            <p className="text-sm text-muted-foreground">
              Isto pode demorar alguns segundos...
            </p>
          </div>
        )}

        {etapa === "editar" && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Reveja a transcrição abaixo.</strong> Clique em qualquer bloco para corrigir nomes, termos técnicos ou frases incorretas. Quando estiver satisfeito, clique em <strong>"Gerar Resumo IA"</strong>.
              </p>
            </div>
            <TranscricaoEditavel
              segmentos={segmentos}
              onSegmentosChange={setSegmentos}
              onGuardar={handleGuardarTranscricao}
              aGuardar={guardarTranscricaoMutation.isPending}
              editavel={true}
            />
          </div>
        )}

        {etapa === "a_resumir" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
            <p className="text-lg font-medium">A gerar resumo IA...</p>
            <p className="text-sm text-muted-foreground">
              A analisar a transcrição corrigida...
            </p>
          </div>
        )}

        {etapa === "resultado" && (
          <div className="space-y-6">
            {/* Transcrição por blocos (só leitura) */}
            {segmentos.length > 0 ? (
              <TranscricaoEditavel
                segmentos={segmentos}
                onSegmentosChange={() => {}}
                onGuardar={() => {}}
                aGuardar={false}
                editavel={false}
              />
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Transcrição
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 max-h-[200px] overflow-y-auto text-sm whitespace-pre-wrap">
                  {transcricao || "Sem transcrição disponível"}
                </div>
              </div>
            )}

            {/* Resumo IA */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Resumo IA
              </h3>
              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 max-h-[300px] overflow-y-auto text-sm prose prose-sm max-w-none">
                <Streamdown>{resumo}</Streamdown>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {etapa === "editar" && (
            <Button onClick={handleGerarResumo} className="gap-1">
              <Sparkles className="h-4 w-4" />
              Gerar Resumo IA
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            {etapa === "resultado" ? "Fechar" : "Cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== CARD DE GRAVAÇÃO ====================
function GravacaoCard({
  gravacao,
  onEliminar,
  onTranscrever,
  onGerarResumo,
}: {
  gravacao: any;
  onEliminar: () => void;
  onTranscrever: () => void;
  onGerarResumo: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const config = ESTADO_CONFIG[gravacao.estado] || ESTADO_CONFIG.gravado;
  const EstadoIcon = config.icon;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{gravacao.titulo}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={`text-[10px] h-5 ${config.color}`}>
                <EstadoIcon className={`h-3 w-3 mr-0.5 ${gravacao.estado === "a_transcrever" || gravacao.estado === "a_resumir" ? "animate-spin" : ""}`} />
                {config.label}
              </Badge>
              {gravacao.duracaoSegundos && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuracao(gravacao.duracaoSegundos)}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(gravacao.createdAt).toLocaleDateString("pt-PT", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            {gravacao.estado === "gravado" && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onTranscrever}>
                <FileText className="h-3.5 w-3.5" />
                Transcrever
              </Button>
            )}
            {gravacao.estado === "transcrito" && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onGerarResumo}>
                <Sparkles className="h-3.5 w-3.5" />
                Resumo IA
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={onEliminar}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Áudio player */}
        {gravacao.audioUrl && (
          <audio controls className="w-full h-8" preload="none">
            <source src={gravacao.audioUrl} />
          </audio>
        )}

        {/* Expandir transcrição/resumo */}
        {(gravacao.transcricao || gravacao.resumoIA) && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 w-full justify-center"
              onClick={() => setExpandido(!expandido)}
            >
              {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expandido ? "Recolher" : "Ver transcrição e resumo"}
            </Button>

            {expandido && (
              <div className="space-y-3 mt-2">
                {gravacao.transcricao && (
                  <div>
                    {gravacao.transcricaoSegmentos ? (() => {
                      try {
                        const segs: Segmento[] = JSON.parse(gravacao.transcricaoSegmentos);
                        return (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Transcrição por Blocos
                            </h4>
                            <div className="max-h-[250px] overflow-y-auto space-y-0.5">
                              {segs.map((seg, idx) => (
                                <div key={idx} className="flex gap-2 p-1.5 rounded bg-muted/30">
                                  <span className="text-[9px] font-mono text-muted-foreground bg-muted rounded px-1 py-0.5 flex-shrink-0">
                                    {formatTimestamp(seg.start)}
                                  </span>
                                  <p className="text-xs leading-relaxed">{seg.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      } catch {
                        return (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Transcrição
                            </h4>
                            <div className="bg-muted/50 rounded-lg p-3 max-h-[200px] overflow-y-auto text-xs whitespace-pre-wrap">
                              {gravacao.transcricao}
                            </div>
                          </div>
                        );
                      }
                    })() : (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Transcrição
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-3 max-h-[200px] overflow-y-auto text-xs whitespace-pre-wrap">
                          {gravacao.transcricao}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {gravacao.resumoIA && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      Resumo IA
                    </h4>
                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 max-h-[300px] overflow-y-auto text-xs prose prose-sm max-w-none">
                      <Streamdown>{gravacao.resumoIA}</Streamdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ==================== LISTA DE GRAVAÇÕES ====================
export function ListaGravacoes() {
  const utils = trpc.useUtils();
  const { data: gravacoes, isLoading } = trpc.notas.listarGravacoes.useQuery();

  const eliminarMutation = trpc.notas.eliminarGravacao.useMutation({
    onSuccess: () => {
      utils.notas.listarGravacoes.invalidate();
      toast.success("Gravação eliminada");
    },
  });

  const transcreverMutation = trpc.notas.transcreverGravacao.useMutation({
    onSuccess: () => {
      utils.notas.listarGravacoes.invalidate();
      toast.success("Transcrição concluída!");
    },
    onError: (err) => {
      utils.notas.listarGravacoes.invalidate();
      toast.error(err.message || "Erro na transcrição");
    },
  });

  const resumoMutation = trpc.notas.gerarResumoGravacao.useMutation({
    onSuccess: () => {
      utils.notas.listarGravacoes.invalidate();
      toast.success("Resumo IA gerado!");
    },
    onError: (err) => {
      utils.notas.listarGravacoes.invalidate();
      toast.error(err.message || "Erro ao gerar resumo");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!gravacoes || gravacoes.length === 0) {
    return (
      <div className="text-center py-12">
        <Mic className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Nenhuma gravação
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Grava a tua primeira reunião para começar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gravacoes.map((g: any) => (
        <GravacaoCard
          key={g.id}
          gravacao={g}
          onEliminar={() => eliminarMutation.mutate({ id: g.id })}
          onTranscrever={() => transcreverMutation.mutate({ gravacaoId: g.id })}
          onGerarResumo={() => resumoMutation.mutate({ gravacaoId: g.id })}
        />
      ))}
    </div>
  );
}
