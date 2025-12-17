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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Plus, Save, X, Image, Upload, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { SugestoesModal } from "@/components/SugestoesModal";
import { PendentesLoja } from "@/components/PendentesLoja";
import { EmailConfirmDialog } from "@/components/EmailConfirmDialog";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import imageCompression from 'browser-image-compression';

export default function RelatorioCompleto() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(0);
  const [lojaId, setLojaId] = useState("");
  const [lojasIds, setLojasIds] = useState<string[]>([]);
  const [pendentes, setPendentes] = useState<string[]>([""]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSugestoesModal, setShowSugestoesModal] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [relatorioIdCriado, setRelatorioIdCriado] = useState<number | null>(null);
  const [lojaNomeSelecionada, setLojaNomeSelecionada] = useState<string>("");
  const [lojaEmailSelecionada, setLojaEmailSelecionada] = useState<string>("");
  const [pendentesExistentes, setPendentesExistentes] = useState<{id: number; status: "resolvido" | "continua" | null}[]>([]);
  const [dataHoraPersonalizada, setDataHoraPersonalizada] = useState<string>("");

  const FORGE_API_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL;
  const FORGE_API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;

  const [formData, setFormData] = useState({
    episFardamento: "",
    kitPrimeirosSocorros: "",
    consumiveis: "",
    espacoFisico: "",
    reclamacoes: "",
    vendasComplementares: "",
    fichasServico: "",
    documentacaoObrigatoria: "",
    reuniaoQuinzenal: undefined as boolean | undefined,
    resumoSupervisao: "",
    colaboradoresPresentes: "",
    pontosPositivos: "",
    pontosNegativos: "",
  });

  const utils = trpc.useUtils();
  const { data: lojas } = trpc.lojas.getByGestor.useQuery();

  const createMutation = trpc.relatoriosCompletos.create.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório completo criado com sucesso");
      utils.relatoriosCompletos.list.invalidate();
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

  if (user?.role !== "gestor") {
    setLocation("/dashboard");
    return null;
  }

  const pages = [
    { title: "Seleção de Loja", fields: ["loja"] },
    { title: "EPIs e Fardamento", fields: ["episFardamento"] },
    { title: "Kit de 1ºs Socorros", fields: ["kitPrimeirosSocorros"] },
    { title: "Consumíveis", fields: ["consumiveis"] },
    { title: "Espaço Físico da Loja", fields: ["espacoFisico"] },
    { title: "Reclamações", fields: ["reclamacoes"] },
    { title: "Vendas Complementares", fields: ["vendasComplementares"] },
    { title: "Fichas de Serviço", fields: ["fichasServico"] },
    { title: "Documentação Obrigatória", fields: ["documentacaoObrigatoria"] },
    { title: "Reunião Quinzenal", fields: ["reuniaoQuinzenal"] },
    { title: "Resumo e Colaboradores", fields: ["resumoSupervisao", "colaboradoresPresentes"] },
    { title: "Pontos a Destacar", fields: ["pontosPositivos", "pontosNegativos"] },
    { title: "Fotos", fields: ["fotos"] },
    { title: "Pendentes", fields: ["pendentes"] },
  ];

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

  const processTranscriptionMutation = trpc.voiceTranscription.processRelatorioCompleto.useMutation();
  const analyzePhotosMutation = trpc.photoAnalysis.analyzePhotos.useMutation();

  const handleVoiceTranscription = async (transcription: string) => {
    try {
      toast.info("A processar transcrição...");
      const processed = await processTranscriptionMutation.mutateAsync({ transcription });
      
      // Preencher campos automaticamente
      setFormData(prev => ({
        ...prev,
        resumoSupervisao: processed.resumoSupervisao,
        pontosPositivos: processed.pontosPositivos.join("\n"),
        pontosNegativos: processed.pontosNegativos.join("\n"),
      }));
      
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newFotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
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
        };
        
        const compressedFile = await imageCompression(file, options);

        const formData = new FormData();
        formData.append('file', compressedFile);

        const response = await fetch(`${FORGE_API_URL}/storage/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FORGE_API_KEY}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Erro ao fazer upload de ${file.name}`);
        }

        const result = await response.json();
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
          analyses.forEach((analysis: any) => {
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

  const handleNext = () => {
    if (currentPage === 0 && lojasIds.length === 0) {
      toast.error("Por favor selecione pelo menos uma loja");
      return;
    }
    // Verificar pendentes na página 0
    if (currentPage === 0 && pendentesExistentes.length > 0) {
      const pendentesSemEstado = pendentesExistentes.filter(p => p.status === null);
      if (pendentesSemEstado.length > 0) {
        toast.error("Por favor indique o estado de todos os pendentes antes de avançar");
        return;
      }
    }
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSubmit = async () => {
    if (lojasIds.length === 0) {
      toast.error("Por favor selecione pelo menos uma loja");
      return;
    }

    // Atualizar pendentes existentes primeiro
    const pendentesComEstado = pendentesExistentes.filter(p => p.status !== null);
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
      ...formData,
      fotos: fotos.length > 0 ? JSON.stringify(fotos) : undefined,
      pendentes: pendentesValidos.length > 0 ? pendentesValidos : undefined,
    });
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loja">Lojas * (pode selecionar várias)</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {lojas?.map((loja: any) => (
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
            
            {/* Pendentes da Loja Selecionada */}
            {lojasIds.length === 1 && (
              <PendentesLoja
                lojaId={parseInt(lojasIds[0])}
                onPendentesChange={setPendentesExistentes}
              />
            )}
            
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
          </div>
        );

      case 1:
        return (
          <div className="space-y-2">
            <Label htmlFor="episFardamento">EPIs e Fardamento</Label>
            <Textarea
              id="episFardamento"
              value={formData.episFardamento}
              onChange={(e) =>
                setFormData({ ...formData, episFardamento: e.target.value })
              }
              placeholder="Verificar: Luvas de Corte, Luvas Nitrilo, Óculos de Proteção, Sapatos de Proteção. Mencionar colaboradores que não estão em conformidade."
              rows={6}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-2">
            <Label htmlFor="kitPrimeirosSocorros">Kit de 1ºs Socorros / Quase Acidente</Label>
            <Textarea
              id="kitPrimeirosSocorros"
              value={formData.kitPrimeirosSocorros}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  kitPrimeirosSocorros: e.target.value,
                })
              }
              placeholder="Verificar validade dos produtos no Kit de 1ºs Socorros."
              rows={6}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-2">
            <Label htmlFor="consumiveis">Consumíveis</Label>
            <Textarea
              id="consumiveis"
              value={formData.consumiveis}
              onChange={(e) =>
                setFormData({ ...formData, consumiveis: e.target.value })
              }
              placeholder="Verificar: Primários e Ativadores, Produto polimento faróis, Acrílico/Plexiglass, Película autocolante, Escovas."
              rows={6}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-2">
            <Label htmlFor="espacoFisico">Espaço Físico da Loja</Label>
            <Textarea
              id="espacoFisico"
              value={formData.espacoFisico}
              onChange={(e) =>
                setFormData({ ...formData, espacoFisico: e.target.value })
              }
              placeholder="Verificar: WC, Área vedada do cliente, Cacifos, Espaço de alimentação, Resíduos, Balcão e Secretária, Single Cut, Easy Cut, Aspirador, LilBuddy, Compressor, Caixa de Ferramentas."
              rows={6}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-2">
            <Label htmlFor="reclamacoes">Reclamações</Label>
            <Textarea
              id="reclamacoes"
              value={formData.reclamacoes}
              onChange={(e) =>
                setFormData({ ...formData, reclamacoes: e.target.value })
              }
              placeholder="Verificar existência de reclamações e respetivo ponto de situação."
              rows={6}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-2">
            <Label htmlFor="vendasComplementares">Vendas Complementares</Label>
            <Textarea
              id="vendasComplementares"
              value={formData.vendasComplementares}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  vendasComplementares: e.target.value,
                })
              }
              placeholder="Análise de vendas: Escovas, Polimentos, Tratamentos Ferrugem, Colagem Capotas."
              rows={6}
            />
          </div>
        );

      case 7:
        return (
          <div className="space-y-2">
            <Label htmlFor="fichasServico">10 Últimas Fichas de Serviço</Label>
            <Textarea
              id="fichasServico"
              value={formData.fichasServico}
              onChange={(e) =>
                setFormData({ ...formData, fichasServico: e.target.value })
              }
              placeholder="Validar: Correto preenchimento do CL, Utilização de capas de proteção, Notas que esclareçam o ponto de situação, Utilização de envio de SMS."
              rows={6}
            />
          </div>
        );

      case 8:
        return (
          <div className="space-y-2">
            <Label htmlFor="documentacaoObrigatoria">Documentação Obrigatória Afixada</Label>
            <Textarea
              id="documentacaoObrigatoria"
              value={formData.documentacaoObrigatoria}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  documentacaoObrigatoria: e.target.value,
                })
              }
              placeholder="Verificar afixação: ASAE, Horário, Férias, Contactos Úteis, Seguro, Preços Escovas, Preço Mão Obra."
              rows={6}
            />
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <Label>Reunião Quinzenal</Label>
            <RadioGroup
              value={formData.reuniaoQuinzenal?.toString()}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  reuniaoQuinzenal: value === "true",
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="sim" />
                <Label htmlFor="sim" className="cursor-pointer">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="nao" />
                <Label htmlFor="nao" className="cursor-pointer">
                  Não
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resumoSupervisao">Resumo da Supervisão</Label>
              <Textarea
                id="resumoSupervisao"
                value={formData.resumoSupervisao}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    resumoSupervisao: e.target.value,
                  })
                }
                placeholder="Escreva as instruções adequadas à supervisão realizada."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="colaboradoresPresentes">Colaboradores Presentes</Label>
              <Textarea
                id="colaboradoresPresentes"
                value={formData.colaboradoresPresentes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    colaboradoresPresentes: e.target.value,
                  })
                }
                placeholder="Nome dos colaboradores presentes durante a supervisão."
                rows={4}
              />
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pontosPositivos">Pontos Positivos a Destacar</Label>
              <Textarea
                id="pontosPositivos"
                value={formData.pontosPositivos}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pontosPositivos: e.target.value,
                  })
                }
                placeholder="Descreva os pontos positivos observados durante a visita (ex: boa organização, equipa motivada, loja limpa, etc.)"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pontosNegativos">Pontos Negativos a Destacar</Label>
              <Textarea
                id="pontosNegativos"
                value={formData.pontosNegativos}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pontosNegativos: e.target.value,
                  })
                }
                placeholder="Descreva os pontos negativos observados durante a visita (ex: falta de stock, problemas de organização, etc.)"
                rows={5}
              />
            </div>
          </div>
        );

      case 12:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Fotos
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                {uploading ? 'A enviar...' : 'Adicionar Fotos'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Adicione fotos de evidências da visita (máx. 5MB por foto)
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
        );

      case 13:
        return (
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
                  />
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
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório Completo
          </h1>
          <p className="text-muted-foreground">
            Relatório detalhado de supervisão
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{pages[currentPage].title}</CardTitle>
              <span className="text-sm text-muted-foreground">
                Página {currentPage + 1} de {pages.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderPageContent()}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              {currentPage === pages.length - 1 ? (
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Relatório
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  Seguinte
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
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
        tipoRelatorio="completo"
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
        tipoRelatorio="completo"
        lojaNome={lojaNomeSelecionada}
      />
    </DashboardLayout>
  );
}
