import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Save, X, Image, Upload, Loader2, Eye } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { SugestoesModal } from "@/components/SugestoesModal";
import { PendentesLoja } from "@/components/PendentesLoja";
import { EmailConfirmDialog } from "@/components/EmailConfirmDialog";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VisualizarPendente } from "@/components/VisualizarPendente";
import imageCompression from 'browser-image-compression';

export default function RelatorioLivre() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lojasIds, setLojasIds] = useState<string[]>([]);
  const [descricao, setDescricao] = useState("");
  const [comentarioAdmin, setComentarioAdmin] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estadoAcompanhamento, setEstadoAcompanhamento] = useState<"acompanhar" | "em_tratamento" | "tratado">("acompanhar");
  const [pendentes, setPendentes] = useState<string[]>([""]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showSugestoesModal, setShowSugestoesModal] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [relatorioIdCriado, setRelatorioIdCriado] = useState<number | null>(null);
  const [lojaNomeSelecionada, setLojaNomeSelecionada] = useState<string>("");
  const [lojaEmailSelecionada, setLojaEmailSelecionada] = useState<string>("");
  const [pendentesExistentes, setPendentesExistentes] = useState<{id: number; status: "resolvido" | "continua" | null}[]>([]);
  const [dataHoraPersonalizada, setDataHoraPersonalizada] = useState<string>("");
  const [pendenteVisualizando, setPendenteVisualizando] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: lojas } = trpc.lojas.getByGestor.useQuery();

  const createMutation = trpc.relatoriosLivres.create.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório criado com sucesso");
      utils.relatoriosLivres.list.invalidate();
      // Guardar dados para os diálogos
      setRelatorioIdCriado(data.id);
      const primeiraLoja = lojas?.find(l => l.id === parseInt(lojasIds[0]));
      setLojaNomeSelecionada(primeiraLoja?.nome || "");
      setLojaEmailSelecionada(primeiraLoja?.email || "");
      // Mostrar diálogo de confirmação de email primeiro
      setShowEmailDialog(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (user?.role !== "gestor" && user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const handleAddPendente = () => {
    setPendentes([...pendentes, ""]);
  };

  const handleRemovePendente = (index: number) => {
    setPendentes(pendentes.filter((_, i) => i !== index));
  };

  const handlePendenteChange = (index: number, value: string) => {
    const newPendentes = [...pendentes];
    newPendentes[index] = value;
    setPendentes(newPendentes);
  };

  const processTranscriptionMutation = trpc.voiceTranscription.processRelatorioLivre.useMutation();
  const analyzePhotosMutation = trpc.photoAnalysis.analyzePhotos.useMutation();

  const handleVoiceTranscription = async (transcription: string) => {
    try {
      toast.info("A processar transcrição...");
      const processed = await processTranscriptionMutation.mutateAsync({ transcription });
      
      // Preencher campos automaticamente
      setDescricao(processed.descricao);
      setCategoria(processed.categoria);
      // Mapear estado da IA para o enum do schema
      const estadoMap: Record<string, "acompanhar" | "em_tratamento" | "tratado"> = {
        "Em Progresso": "em_tratamento",
        "Concluído": "tratado",
        "Pendente": "acompanhar",
        "Requer Atenção": "acompanhar"
      };
      setEstadoAcompanhamento(estadoMap[processed.estadoAcompanhamento] || "acompanhar");
      
      // Adicionar pendentes identificados
      if (processed.pendentes.length > 0) {
        setPendentes(processed.pendentes);
      }
      
      toast.success("Relatório preenchido automaticamente!");
    } catch (error) {
      console.error("Erro ao processar transcrição:", error);
      toast.error("Erro ao processar transcrição. Tente novamente.");
    }
  };

  const uploadPhotoMutation = trpc.photoAnalysis.uploadPhoto.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('Iniciando upload de', files.length, 'ficheiro(s)');
    setUploading(true);
    const newFotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validar tipo
        if (!file.type.startsWith('image/')) {
          toast.error(`Ficheiro ${file.name} não é uma imagem`);
          continue;
        }

        // Comprimir imagem antes de fazer upload
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg' as const,
          initialQuality: 0.8, // Qualidade 80%
        };
        
        console.log('Comprimindo ficheiro:', file.name, 'tamanho original:', file.size);
        const compressedFile = await imageCompression(file, options);
        console.log('Ficheiro comprimido:', compressedFile.name, 'novo tamanho:', compressedFile.size);
        
        // Converter para base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(compressedFile);
        });
        
        const photoBase64 = await base64Promise;
        
        // Upload via backend tRPC
        console.log('Enviando para backend via tRPC');
        const result = await uploadPhotoMutation.mutateAsync({
          photoBase64,
          mimeType: compressedFile.type,
        });
        
        console.log('Resultado do upload:', result);
        if (result.url) {
          newFotos.push(result.url);
        }
      }

      setFotos([...fotos, ...newFotos]);
      if (newFotos.length > 0) {
        toast.success(`${newFotos.length} foto(s) adicionada(s)`);
        
        // Analisar fotos automaticamente com IA
        toast.info("⚡ A analisar fotos com IA...");
        try {
          const analyses = await analyzePhotosMutation.mutateAsync({ imageUrls: newFotos });
          
          // Coletar pendentes sugeridos
          const allSuggestedPendentes: string[] = [];
          analyses.forEach(analysis => {
            if (analysis.suggestedPendentes.length > 0) {
              allSuggestedPendentes.push(...analysis.suggestedPendentes);
            }
          });
          
          // Adicionar pendentes sugeridos aos existentes
          if (allSuggestedPendentes.length > 0) {
            setPendentes(prev => {
              const filtered = prev.filter(p => p.trim() !== "");
              return [...filtered, ...allSuggestedPendentes];
            });
            toast.success(`🤖 IA identificou ${allSuggestedPendentes.length} pendente(s) nas fotos!`);
          } else {
            toast.success("✅ IA não identificou problemas nas fotos");
          }
        } catch (error) {
          console.error("Erro ao analisar fotos:", error);
          toast.warning("Não foi possível analisar as fotos automaticamente");
        }
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload das fotos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index));
  };

  // Mutation para atualizar pendentes existentes
  const updatePendentesMutation = trpc.pendentes.updateBatch.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lojasIds.length === 0) {
      toast.error("Por favor selecione pelo menos uma loja");
      return;
    }

    // Verificar se todos os pendentes existentes têm estado definido
    const pendentesComEstado = pendentesExistentes.filter(p => p.status !== null);
    const pendentesSemEstado = pendentesExistentes.filter(p => p.status === null);
    
    if (pendentesSemEstado.length > 0) {
      toast.error(`Por favor indique o estado dos ${pendentesSemEstado.length} pendente(s) existente(s) da loja antes de submeter`);
      // Scroll para a secção de pendentes existentes
      const pendentesSection = document.querySelector('[data-pendentes-loja]');
      if (pendentesSection) {
        pendentesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Atualizar pendentes existentes primeiro
    if (pendentesComEstado.length > 0) {
      try {
        await updatePendentesMutation.mutateAsync({
          pendentes: pendentesComEstado.map(p => ({
            id: p.id,
            status: p.status as 'resolvido' | 'continua',
          })),
        });
      } catch (error) {
        toast.error("Erro ao atualizar pendentes");
        return;
      }
    }

    const pendentesValidos = pendentes.filter((p) => p.trim() !== "");

    const dataVisita = dataHoraPersonalizada 
      ? new Date(dataHoraPersonalizada)
      : new Date();

    createMutation.mutate({
      lojasIds: lojasIds.map(id => Number(id)),
      dataVisita,
      descricao,
      comentarioAdmin: comentarioAdmin.trim() || undefined,
      fotos: fotos.length > 0 ? JSON.stringify(fotos) : undefined,
      pendentes: pendentesValidos.length > 0 ? pendentesValidos : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório Livre
          </h1>
          <p className="text-muted-foreground">
            Criar um relatório rápido de visita
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informações da Visita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loja">Lojas * (pode selecionar várias)</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {lojas?.sort((a: any, b: any) => a.nome.localeCompare(b.nome)).map((loja: any) => (
                    <label key={loja.id} className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded">
                      <input
                        type="checkbox"
                        checked={lojasIds.includes(loja.id.toString())}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setLojasIds([...lojasIds, loja.id.toString()]);
                          } else {
                            setLojasIds(lojasIds.filter(id => id !== loja.id.toString()));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{loja.nome}</span>
                    </label>
                  ))}
                </div>
                {lojasIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {lojasIds.length} loja{lojasIds.length > 1 ? 's' : ''} selecionada{lojasIds.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Relatório por Voz */}
              {lojasIds.length > 0 && (
                <VoiceRecorder
                  onTranscriptionComplete={handleVoiceTranscription}
                  disabled={createMutation.isPending}
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="dataHora">Data e Hora da Visita (opcional)</Label>
                <Input
                  id="dataHora"
                  type="datetime-local"
                  value={dataHoraPersonalizada}
                  onChange={(e) => setDataHoraPersonalizada(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Se não especificar, será usada a data/hora atual
                </p>
              </div>

              {/* Pendentes da Loja Selecionada */}
              {lojasIds.length === 1 && (
                <PendentesLoja
                  lojaId={parseInt(lojasIds[0])}
                  onPendentesChange={setPendentesExistentes}
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva os pontos importantes desta visita..."
                  rows={6}
                  required
                />
              </div>

              {/* Campo de Comentários do Admin (apenas visível para admin) */}
              {user?.role === 'admin' && (
                <div className="space-y-2">
                  <Label htmlFor="comentarioAdmin">Notas do Admin (opcional)</Label>
                  <Textarea
                    id="comentarioAdmin"
                    value={comentarioAdmin}
                    onChange={(e) => setComentarioAdmin(e.target.value)}
                    placeholder="Adicione observações, instruções ou feedback para o gestor..."
                    rows={4}
                    className="border-purple-200 focus:border-purple-400 dark:border-purple-800 dark:focus:border-purple-600"
                  />
                  <p className="text-xs text-muted-foreground">
                    Estas notas serão visíveis para o gestor responsável pela loja
                  </p>
                </div>
              )}

              {/* Upload de Fotos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fotos</Label>
                  <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Image className="h-4 w-4 mr-1" />
                    )}
                    {uploading ? 'A enviar...' : 'Tirar Foto'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Carregar Ficheiro
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div></div>
                <p className="text-sm text-muted-foreground">
                  Adicione fotos de evidências da visita (comprimidas automaticamente)
                </p>
                
                {fotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {fotos.map((foto, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={foto}
                          alt={`Foto ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFoto(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pendentes</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPendente}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Items a serem revistos na próxima visita
                </p>
                <div className="space-y-2">
                  {pendentes.map((pendente, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={pendente}
                        onChange={(e) =>
                          handlePendenteChange(index, e.target.value)
                        }
                        placeholder={`Pendente ${index + 1}`}
                        className="cursor-text"
                      />
                      {pendente && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendenteVisualizando(index)}
                          title="Visualizar pendente completo"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {pendentes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePendente(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/dashboard")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || uploading}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Relatório
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

      {/* Diálogo de Confirmação de Email */}
      <EmailConfirmDialog
        open={showEmailDialog}
        onClose={() => {
          setShowEmailDialog(false);
          // Após fechar diálogo de email, mostrar sugestões
          setShowSugestoesModal(true);
        }}
        relatorioId={relatorioIdCriado}
        tipoRelatorio="livre"
        lojaNome={lojaNomeSelecionada}
        lojaEmail={lojaEmailSelecionada}
      />

      {/* Modal de Sugestões */}
      <SugestoesModal
        open={showSugestoesModal}
        onClose={() => {
          setShowSugestoesModal(false);
          setLocation("/meus-relatorios");
        }}
        relatorioId={relatorioIdCriado}
        tipoRelatorio="livre"
        lojaNome={lojaNomeSelecionada}
      />

      {/* Dialog de Visualização de Pendente */}
      {pendenteVisualizando !== null && (
        <VisualizarPendente
          open={pendenteVisualizando !== null}
          onOpenChange={(open) => {
            if (!open) setPendenteVisualizando(null);
          }}
          pendente={{
            descricao: pendentes[pendenteVisualizando] || "",
            categoria: categoria,
          }}
          onSave={(novaDescricao) => {
            handlePendenteChange(pendenteVisualizando, novaDescricao);
          }}
        />
      )}
    </DashboardLayout>
  );
}
