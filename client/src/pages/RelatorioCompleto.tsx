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
import { ChevronLeft, ChevronRight, Plus, Save, X, Image, Upload, Loader2, RotateCcw } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { SugestoesModal } from "@/components/SugestoesModal";
import { PendentesLoja } from "@/components/PendentesLoja";
import { EmailConfirmDialog } from "@/components/EmailConfirmDialog";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useLanguage } from "@/contexts/LanguageContext";
import imageCompression from 'browser-image-compression';

export default function RelatorioCompleto() {
  const { language, t } = useLanguage();
  const uploadPhotoMutation = trpc.photoAnalysis.uploadPhoto.useMutation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(0);
  const [lojaId, setLojaId] = useState("");
  const [lojasIds, setLojasIds] = useState<string[]>([]);
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
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const STORAGE_KEY = 'relatorio_completo_draft';

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
    comentarioAdmin: "",
  });

  const utils = trpc.useUtils();
  const { data: lojas } = trpc.lojas.getByGestor.useQuery();

  // Carregar rascunho guardado ao iniciar
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // Verificar se o rascunho tem menos de 24 horas
        const savedTime = new Date(draft.savedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          // Recuperar dados do rascunho
          if (draft.formData) setFormData(draft.formData);
          if (draft.lojaId) setLojaId(draft.lojaId);
          if (draft.lojasIds) setLojasIds(draft.lojasIds);
          if (draft.pendentes) setPendentes(draft.pendentes);
          if (draft.fotos) setFotos(draft.fotos);
          if (draft.currentPage) setCurrentPage(draft.currentPage);
          if (draft.pendentesExistentes) setPendentesExistentes(draft.pendentesExistentes);
          if (draft.dataHoraPersonalizada) setDataHoraPersonalizada(draft.dataHoraPersonalizada);
          setHasRecoveredDraft(true);
          setLastSaved(savedTime);
          toast.info(
            language === 'pt' 
              ? `Rascunho recuperado! (guardado ${savedTime.toLocaleString('pt-PT')})` 
              : `Draft recovered! (saved ${savedTime.toLocaleString('en-US')})`,
            { duration: 5000 }
          );
        } else {
          // Rascunho expirado, limpar
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
    }
  }, []);

  // Auto-save a cada alteração (com debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Só guardar se houver algum dado preenchido
      const hasData = lojaId || lojasIds.length > 0 || 
        Object.values(formData).some(v => v !== '' && v !== undefined) ||
        pendentes.some(p => p !== '') || fotos.length > 0;
      
      if (hasData) {
        try {
          const draft = {
            formData,
            lojaId,
            lojasIds,
            pendentes,
            fotos,
            currentPage,
            pendentesExistentes,
            dataHoraPersonalizada,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
          setLastSaved(new Date());
        } catch (error) {
          console.error('Erro ao guardar rascunho:', error);
        }
      }
    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(timeoutId);
  }, [formData, lojaId, lojasIds, pendentes, fotos, currentPage, pendentesExistentes, dataHoraPersonalizada]);

  // Função para limpar rascunho
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasRecoveredDraft(false);
    setLastSaved(null);
    // Reset form
    setFormData({
      episFardamento: "",
      kitPrimeirosSocorros: "",
      consumiveis: "",
      espacoFisico: "",
      reclamacoes: "",
      vendasComplementares: "",
      fichasServico: "",
      documentacaoObrigatoria: "",
      reuniaoQuinzenal: undefined,
      resumoSupervisao: "",
      colaboradoresPresentes: "",
      pontosPositivos: "",
      pontosNegativos: "",
      comentarioAdmin: "",
    });
    setLojaId("");
    setLojasIds([]);
    setPendentes([""]);
    setFotos([]);
    setCurrentPage(0);
    setPendentesExistentes([]);
    setDataHoraPersonalizada("");
    toast.success(language === 'pt' ? 'Rascunho limpo!' : 'Draft cleared!');
  };

  const createMutation = trpc.relatoriosCompletos.create.useMutation({
    onSuccess: (data) => {
      toast.success(language === 'pt' ? "Relatório completo criado com sucesso" : "Complete report created successfully");
      utils.relatoriosCompletos.list.invalidate();
      // Limpar rascunho após submissão bem-sucedida
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
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

  const pages = [
    { title: language === 'pt' ? "Seleção de Loja" : "Store Selection", fields: ["loja"] },
    { title: language === 'pt' ? "EPIs e Fardamento" : "PPE and Uniforms", fields: ["episFardamento"] },
    { title: language === 'pt' ? "Kit de 1ºs Socorros" : "First Aid Kit", fields: ["kitPrimeirosSocorros"] },
    { title: language === 'pt' ? "Consumíveis" : "Consumables", fields: ["consumiveis"] },
    { title: language === 'pt' ? "Espaço Físico da Loja" : "Store Physical Space", fields: ["espacoFisico"] },
    { title: language === 'pt' ? "Reclamações" : "Complaints", fields: ["reclamacoes"] },
    { title: language === 'pt' ? "Vendas Complementares" : "Complementary Sales", fields: ["vendasComplementares"] },
    { title: language === 'pt' ? "Fichas de Serviço" : "Service Sheets", fields: ["fichasServico"] },
    { title: language === 'pt' ? "Documentação Obrigatória" : "Mandatory Documentation", fields: ["documentacaoObrigatoria"] },
    { title: language === 'pt' ? "Reunião Quinzenal" : "Bi-weekly Meeting", fields: ["reuniaoQuinzenal"] },
    { title: language === 'pt' ? "Resumo e Colaboradores" : "Summary and Employees", fields: ["resumoSupervisao", "colaboradoresPresentes"] },
    { title: language === 'pt' ? "Pontos a Destacar" : "Key Points", fields: ["pontosPositivos", "pontosNegativos"] },
    { title: language === 'pt' ? "Fotos" : "Photos", fields: ["fotos"] },
    { title: language === 'pt' ? "Pendentes" : "Pending Items", fields: ["pendentes"] },
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
      toast.info(language === 'pt' ? "A processar transcrição..." : "Processing transcription...");
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
      
      toast.success(language === 'pt' ? "Relatório preenchido automaticamente!" : "Report filled automatically!");
    } catch (error) {
      console.error("Erro ao processar transcrição:", error);
      toast.error(language === 'pt' ? "Erro ao processar transcrição. Tente novamente." : "Error processing transcription. Please try again.");
    }
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('Iniciando upload de', files.length, 'ficheiro(s)');
    setUploading(true);
    const newFotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`Ficheiro ${file.name} não é uma imagem`);
          continue;
        }

        try {
          // Comprimir imagem antes de fazer upload
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/jpeg' as const,
            initialQuality: 0.8,
          };
          
          console.log('Comprimindo ficheiro:', file.name, 'tamanho original:', file.size);
          let compressedFile: File | Blob;
          try {
            compressedFile = await imageCompression(file, options);
            console.log('Ficheiro comprimido:', (compressedFile as File).name || 'blob', 'novo tamanho:', compressedFile.size);
          } catch (compressionError) {
            console.warn('Erro na compressão, usando ficheiro original:', compressionError);
            compressedFile = file;
          }

          // Converter para base64
          const base64Promise = new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                if (!base64) {
                  reject(new Error('Falha ao extrair base64'));
                  return;
                }
                resolve(base64);
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = () => reject(new Error('Erro ao ler ficheiro'));
            reader.readAsDataURL(compressedFile);
          });
          
          const photoBase64 = await base64Promise;
          
          // Upload via backend tRPC
          console.log('Enviando para backend via tRPC');
          const result = await uploadPhotoMutation.mutateAsync({
            photoBase64,
            mimeType: compressedFile.type || 'image/jpeg',
          });
          
          console.log('Resultado do upload:', result);
          if (result.url) {
            newFotos.push(result.url);
          }
        } catch (fileError) {
          console.error('Erro ao processar ficheiro:', file.name, fileError);
          toast.error(`Erro ao processar ${file.name}`);
        }
      }

      if (newFotos.length > 0) {
        setFotos(prev => [...prev, ...newFotos]);
        toast.success(`${newFotos.length} foto(s) adicionada(s)`);
        
        // Analisar fotos automaticamente com IA (em background, sem bloquear)
        toast.info(language === 'pt' ? "⚡ A analisar fotos com IA..." : "⚡ Analyzing photos with AI...");
        analyzePhotosMutation.mutateAsync({ imageUrls: newFotos })
          .then((analyses) => {
            const allSuggestedPendentes: string[] = [];
            analyses.forEach((analysis: any) => {
              if (analysis.suggestedPendentes && analysis.suggestedPendentes.length > 0) {
                allSuggestedPendentes.push(...analysis.suggestedPendentes);
              }
            });
            
            if (allSuggestedPendentes.length > 0) {
              setPendentes(prev => {
                const filtered = prev.filter(p => p.trim() !== "");
                return [...filtered, ...allSuggestedPendentes];
              });
              toast.success(`🤖 IA identificou ${allSuggestedPendentes.length} pendente(s) nas fotos!`);
            } else {
              toast.success(language === 'pt' ? "✅ IA não identificou problemas nas fotos" : "✅ AI found no issues in photos");
            }
          })
          .catch((error) => {
            console.error("Erro ao analisar fotos:", error);
            toast.warning(language === 'pt' ? "Não foi possível analisar as fotos automaticamente" : "Could not analyze photos automatically");
          });
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(language === 'pt' ? 'Erro ao fazer upload das fotos' : 'Error uploading photos');
    } finally {
      setUploading(false);
      // Limpar inputs de forma segura
      requestAnimationFrame(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        if (cameraInputRef.current) {
          cameraInputRef.current.value = '';
        }
      });
    }
  }, [language, uploadPhotoMutation, analyzePhotosMutation]);

  const handleRemoveFoto = useCallback((index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Mutation para atualizar pendentes existentes
  const updatePendentesMutation = trpc.pendentes.updateBatch.useMutation();

  const handleNext = () => {
    if (currentPage === 0 && lojasIds.length === 0) {
      toast.error(language === 'pt' ? "Por favor selecione pelo menos uma loja" : "Please select at least one store");
      return;
    }
    // Verificar pendentes na página 0
    if (currentPage === 0 && pendentesExistentes.length > 0) {
      const pendentesSemEstado = pendentesExistentes.filter(p => p.status === null);
      if (pendentesSemEstado.length > 0) {
        toast.error(language === 'pt' ? "Por favor indique o estado de todos os pendentes antes de avançar" : "Please indicate the status of all pending items before proceeding");
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
      toast.error(language === 'pt' ? "Por favor selecione pelo menos uma loja" : "Please select at least one store");
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
        toast.error(language === 'pt' ? "Erro ao atualizar pendentes" : "Error updating pending items");
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
              <Label htmlFor="loja">{language === 'pt' ? 'Lojas * (pode selecionar várias)' : 'Stores * (can select multiple)'}</Label>
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
              <Label htmlFor="dataHora">{language === 'pt' ? 'Data e Hora da Visita (opcional)' : 'Visit Date and Time (optional)'}</Label>
              <Input
                id="dataHora"
                type="datetime-local"
                value={dataHoraPersonalizada}
                onChange={(e) => setDataHoraPersonalizada(e.target.value)}
                max={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-muted-foreground">
                {language === 'pt' ? 'Se não especificar, será usada a data/hora atual' : 'If not specified, current date/time will be used'}
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-2">
            <Label htmlFor="episFardamento">{language === 'pt' ? 'EPIs e Fardamento' : 'PPE and Uniforms'}</Label>
            <Textarea
              id="episFardamento"
              value={formData.episFardamento}
              onChange={(e) =>
                setFormData({ ...formData, episFardamento: e.target.value })
              }
              placeholder={language === 'pt' ? 'Verificar: Luvas de Corte, Luvas Nitrilo, Óculos de Proteção, Sapatos de Proteção. Mencionar colaboradores que não estão em conformidade.' : 'Check: Cut Gloves, Nitrile Gloves, Safety Glasses, Safety Shoes. Mention non-compliant employees.'}
              rows={6}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-2">
            <Label htmlFor="kitPrimeirosSocorros">{language === 'pt' ? 'Kit de 1ºs Socorros / Quase Acidente' : 'First Aid Kit / Near Miss'}</Label>
            <Textarea
              id="kitPrimeirosSocorros"
              value={formData.kitPrimeirosSocorros}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  kitPrimeirosSocorros: e.target.value,
                })
              }
              placeholder={language === 'pt' ? 'Verificar validade dos produtos no Kit de 1ºs Socorros.' : 'Check product expiry dates in First Aid Kit.'}
              rows={6}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-2">
            <Label htmlFor="consumiveis">{language === 'pt' ? 'Consumíveis' : 'Consumables'}</Label>
            <Textarea
              id="consumiveis"
              value={formData.consumiveis}
              onChange={(e) =>
                setFormData({ ...formData, consumiveis: e.target.value })
              }
              placeholder={language === 'pt' ? 'Verificar: Primários e Ativadores, Produto polimento faróis, Acrílico/Plexiglass, Película autocolante, Escovas.' : 'Check: Primers and Activators, Headlight polish, Acrylic/Plexiglass, Adhesive film, Brushes.'}
              rows={6}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-2">
            <Label htmlFor="espacoFisico">{language === 'pt' ? 'Espaço Físico da Loja' : 'Store Physical Space'}</Label>
            <Textarea
              id="espacoFisico"
              value={formData.espacoFisico}
              onChange={(e) =>
                setFormData({ ...formData, espacoFisico: e.target.value })
              }
              placeholder={language === 'pt' ? 'Verificar: WC, Área vedada do cliente, Cacifos, Espaço de alimentação, Resíduos, Balcão e Secretária, Single Cut, Easy Cut, Aspirador, LilBuddy, Compressor, Caixa de Ferramentas.' : 'Check: WC, Customer restricted area, Lockers, Eating area, Waste, Counter and Desk, Single Cut, Easy Cut, Vacuum, LilBuddy, Compressor, Toolbox.'}
              rows={6}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-2">
            <Label htmlFor="reclamacoes">{language === 'pt' ? 'Reclamações' : 'Complaints'}</Label>
            <Textarea
              id="reclamacoes"
              value={formData.reclamacoes}
              onChange={(e) =>
                setFormData({ ...formData, reclamacoes: e.target.value })
              }
              placeholder={language === 'pt' ? 'Verificar existência de reclamações e respetivo ponto de situação.' : 'Check for complaints and their current status.'}
              rows={6}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-2">
            <Label htmlFor="vendasComplementares">{language === 'pt' ? 'Vendas Complementares' : 'Complementary Sales'}</Label>
            <Textarea
              id="vendasComplementares"
              value={formData.vendasComplementares}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  vendasComplementares: e.target.value,
                })
              }
              placeholder={language === 'pt' ? 'Análise de vendas: Escovas, Polimentos, Tratamentos Ferrugem, Colagem Capotas.' : 'Sales analysis: Brushes, Polishes, Rust Treatments, Roof Bonding.'}
              rows={6}
            />
          </div>
        );

      case 7:
        return (
          <div className="space-y-2">
            <Label htmlFor="fichasServico">{language === 'pt' ? '10 Últimas Fichas de Serviço' : 'Last 10 Service Sheets'}</Label>
            <Textarea
              id="fichasServico"
              value={formData.fichasServico}
              onChange={(e) =>
                setFormData({ ...formData, fichasServico: e.target.value })
              }
              placeholder={language === 'pt' ? 'Validar: Correto preenchimento do CL, Utilização de capas de proteção, Notas que esclareçam o ponto de situação, Utilização de envio de SMS.' : 'Validate: Correct CL completion, Use of protective covers, Notes clarifying status, SMS sending usage.'}
              rows={6}
            />
          </div>
        );

      case 8:
        return (
          <div className="space-y-2">
            <Label htmlFor="documentacaoObrigatoria">{language === 'pt' ? 'Documentação Obrigatória Afixada' : 'Posted Mandatory Documentation'}</Label>
            <Textarea
              id="documentacaoObrigatoria"
              value={formData.documentacaoObrigatoria}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  documentacaoObrigatoria: e.target.value,
                })
              }
              placeholder={language === 'pt' ? 'Verificar afixação: ASAE, Horário, Férias, Contactos Úteis, Seguro, Preços Escovas, Preço Mão Obra.' : 'Check posting: ASAE, Schedule, Holidays, Useful Contacts, Insurance, Brush Prices, Labor Price.'}
              rows={6}
            />
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <Label>{language === 'pt' ? 'Reunião Quinzenal' : 'Bi-weekly Meeting'}</Label>
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
                  {language === 'pt' ? 'Sim' : 'Yes'}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="nao" />
                <Label htmlFor="nao" className="cursor-pointer">
                  {language === 'pt' ? 'Não' : 'No'}
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resumoSupervisao">{language === 'pt' ? 'Resumo da Supervisão' : 'Supervision Summary'}</Label>
              <Textarea
                id="resumoSupervisao"
                value={formData.resumoSupervisao}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    resumoSupervisao: e.target.value,
                  })
                }
                placeholder={language === 'pt' ? 'Escreva as instruções adequadas à supervisão realizada.' : 'Write appropriate instructions for the supervision performed.'}
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="colaboradoresPresentes">{language === 'pt' ? 'Colaboradores Presentes' : 'Employees Present'}</Label>
              <Textarea
                id="colaboradoresPresentes"
                value={formData.colaboradoresPresentes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    colaboradoresPresentes: e.target.value,
                  })
                }
                placeholder={language === 'pt' ? 'Nome dos colaboradores presentes durante a supervisão.' : 'Names of employees present during supervision.'}
                rows={4}
              />
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pontosPositivos">{language === 'pt' ? 'Pontos Positivos a Destacar' : 'Positive Points to Highlight'}</Label>
              <Textarea
                id="pontosPositivos"
                value={formData.pontosPositivos}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pontosPositivos: e.target.value,
                  })
                }
                placeholder={language === 'pt' ? 'Descreva os pontos positivos observados durante a visita (ex: boa organização, equipa motivada, loja limpa, etc.)' : 'Describe positive points observed during the visit (e.g.: good organization, motivated team, clean store, etc.)'}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pontosNegativos">{language === 'pt' ? 'Pontos Negativos a Destacar' : 'Negative Points to Highlight'}</Label>
              <Textarea
                id="pontosNegativos"
                value={formData.pontosNegativos}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pontosNegativos: e.target.value,
                  })
                }
                placeholder={language === 'pt' ? 'Descreva os pontos negativos observados durante a visita (ex: falta de stock, problemas de organização, etc.)' : 'Describe negative points observed during the visit (e.g.: stock shortage, organization issues, etc.)'}
                rows={5}
              />
            </div>
            
            {/* Campo de Comentários do Admin (apenas visível para admin) */}
            {user?.role === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="comentarioAdmin">{language === 'pt' ? 'Notas do Admin (opcional)' : 'Admin Notes (optional)'}</Label>
                <Textarea
                  id="comentarioAdmin"
                  value={formData.comentarioAdmin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      comentarioAdmin: e.target.value,
                    })
                  }
                  placeholder={language === 'pt' ? 'Adicione observações, instruções ou feedback para o gestor...' : 'Add observations, instructions or feedback for the manager...'}
                  rows={4}
                  className="border-purple-200 focus:border-purple-400 dark:border-purple-800 dark:focus:border-purple-600"
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'pt' ? 'Estas notas serão visíveis para o gestor responsável pela loja' : 'These notes will be visible to the manager responsible for the store'}
                </p>
              </div>
            )}
          </div>
        );

      case 12:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                {language === 'pt' ? 'Fotos' : 'Photos'}
              </Label>
              <div className="flex gap-2">
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
                  {uploading ? (language === 'pt' ? 'A enviar...' : 'Uploading...') : (language === 'pt' ? 'Tirar Foto' : 'Take Photo')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {language === 'pt' ? 'Carregar Ficheiro' : 'Upload File'}
                </Button>
              </div>
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
            </div>
            <p className="text-sm text-muted-foreground">
              {language === 'pt' ? 'Adicione fotos de evidências da visita (comprimidas automaticamente)' : 'Add visit evidence photos (automatically compressed)'}
            </p>
            
            {fotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {fotos.map((foto, index) => (
                  <div key={`foto-${foto.slice(-20)}-${index}`} className="relative group">
                    <img
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border"
                      loading="lazy"
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
              <Label>{language === 'pt' ? 'Pendentes' : 'Pending Items'}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPendente}
              >
                <Plus className="h-4 w-4 mr-1" />
                {language === 'pt' ? 'Adicionar' : 'Add'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {language === 'pt' ? 'Items a serem revistos na próxima visita' : 'Items to be reviewed on next visit'}
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
            {language === 'pt' ? 'Relatório Completo' : 'Complete Report'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'pt' ? 'Relatório detalhado de supervisão' : 'Detailed supervision report'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{pages[currentPage].title}</CardTitle>
              <div className="flex items-center gap-4">
                {lastSaved && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Save className="h-3 w-3" />
                    {language === 'pt' ? 'Guardado automaticamente' : 'Auto-saved'} {lastSaved.toLocaleTimeString(language === 'pt' ? 'pt-PT' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {(hasRecoveredDraft || lastSaved) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearDraft}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {language === 'pt' ? 'Limpar rascunho' : 'Clear draft'}
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">
                  {language === 'pt' ? 'Página' : 'Page'} {currentPage + 1} {language === 'pt' ? 'de' : 'of'} {pages.length}
                </span>
              </div>
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
                {language === 'pt' ? 'Anterior' : 'Previous'}
              </Button>

              {currentPage === pages.length - 1 ? (
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'pt' ? 'Guardar Relatório' : 'Save Report'}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  {language === 'pt' ? 'Seguinte' : 'Next'}
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
