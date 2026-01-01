import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Save, Loader2, Image, Upload, X, AlertTriangle, Building2, Globe, MapPin } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import imageCompression from 'browser-image-compression';

export default function OcorrenciaEstrutural() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Form state
  const [tema, setTema] = useState("");
  const [descricao, setDescricao] = useState("");
  const [abrangencia, setAbrangencia] = useState<"nacional" | "regional" | "zona">("nacional");
  const [zonaAfetada, setZonaAfetada] = useState("");
  const [lojasAfetadas, setLojasAfetadas] = useState<number[]>([]);
  const [impacto, setImpacto] = useState<"baixo" | "medio" | "alto" | "critico">("medio");
  const [sugestaoAcao, setSugestaoAcao] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredTemas, setFilteredTemas] = useState<Array<{ id: number; nome: string; usageCount: number }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const temaInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  
  // Queries
  const { data: lojas } = trpc.lojas.list.useQuery();
  const { data: temas } = trpc.ocorrenciasEstruturais.getTemas.useQuery();
  
  // Mutation
  const createMutation = trpc.ocorrenciasEstruturais.criar.useMutation({
    onSuccess: () => {
      toast.success("Ocorrência estrutural reportada com sucesso");
      utils.ocorrenciasEstruturais.listMinhas.invalidate();
      utils.ocorrenciasEstruturais.getTemas.invalidate();
      setLocation("/ocorrencias-estruturais/historico");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Filtrar temas baseado no input
  useEffect(() => {
    if (tema.length > 0 && temas) {
      const filtered = temas.filter(t => 
        t.nome.toLowerCase().includes(tema.toLowerCase())
      );
      setFilteredTemas(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredTemas(temas || []);
      setShowSuggestions(tema.length === 0 && (temas?.length || 0) > 0);
    }
  }, [tema, temas]);

  if (user?.role !== "gestor" && user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const handleTemaSelect = (selectedTema: string) => {
    setTema(selectedTema);
    setShowSuggestions(false);
    temaInputRef.current?.blur();
  };

  const handleLojaToggle = (lojaId: number) => {
    setLojasAfetadas(prev => 
      prev.includes(lojaId) 
        ? prev.filter(id => id !== lojaId)
        : [...prev, lojaId]
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newFotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Comprimir imagem
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        
        const compressedFile = await imageCompression(file, options);
        
        // Converter para base64
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
        });
        
        newFotos.push(base64);
      }
      
      setFotos(prev => [...prev, ...newFotos]);
      toast.success(`${newFotos.length} foto(s) adicionada(s)`);
    } catch (error) {
      toast.error("Erro ao processar imagens");
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!tema.trim()) {
      toast.error("Por favor, indique o tema/tag da ocorrência");
      return;
    }
    if (!descricao.trim() || descricao.length < 10) {
      toast.error("A descrição deve ter pelo menos 10 caracteres");
      return;
    }
    if ((abrangencia === "regional" || abrangencia === "zona") && !zonaAfetada.trim()) {
      toast.error("Por favor, indique a zona afetada");
      return;
    }

    createMutation.mutate({
      tema: tema.trim(),
      descricao: descricao.trim(),
      abrangencia,
      zonaAfetada: zonaAfetada.trim() || undefined,
      lojasAfetadas: lojasAfetadas.length > 0 ? lojasAfetadas : undefined,
      impacto,
      fotos: fotos.length > 0 ? fotos : undefined,
      sugestaoAcao: sugestaoAcao.trim() || undefined,
    });
  };

  const impactoColors = {
    baixo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    medio: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    alto: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    critico: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Nova Ocorrência Estrutural</h1>
          <p className="text-muted-foreground">
            Reporte situações que não estão ligadas a uma loja específica
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Coluna Principal */}
          <div className="space-y-6">
            {/* Tema/Tag com Autocomplete */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Tema da Ocorrência
                </CardTitle>
                <CardDescription>
                  Comece a escrever para ver sugestões ou crie um novo tema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input
                    ref={temaInputRef}
                    value={tema}
                    onChange={(e) => setTema(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Ex: Fornecedor, Logística, Formação, Equipamento..."
                    className="text-lg"
                  />
                  
                  {/* Dropdown de sugestões */}
                  {showSuggestions && filteredTemas.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredTemas.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-accent flex items-center justify-between"
                          onClick={() => handleTemaSelect(t.nome)}
                        >
                          <span>{t.nome}</span>
                          <Badge variant="secondary" className="text-xs">
                            {t.usageCount}x usado
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {tema && !temas?.some(t => t.nome.toLowerCase() === tema.toLowerCase()) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Novo tema: <Badge variant="outline">{tema}</Badge> será criado
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Descrição */}
            <Card>
              <CardHeader>
                <CardTitle>Descrição da Ocorrência</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva detalhadamente a situação estrutural que pretende reportar..."
                  rows={6}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {descricao.length} caracteres (mínimo 10)
                </p>
              </CardContent>
            </Card>

            {/* Sugestão de Ação */}
            <Card>
              <CardHeader>
                <CardTitle>Sugestão de Ação (Opcional)</CardTitle>
                <CardDescription>
                  Proponha uma solução ou ação para resolver esta situação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sugestaoAcao}
                  onChange={(e) => setSugestaoAcao(e.target.value)}
                  placeholder="O que sugere para resolver esta situação?"
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Coluna Secundária */}
          <div className="space-y-6">
            {/* Abrangência e Impacto */}
            <Card>
              <CardHeader>
                <CardTitle>Classificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Abrangência */}
                <div className="space-y-2">
                  <Label>Abrangência Geográfica</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={abrangencia === "nacional" ? "default" : "outline"}
                      className="flex items-center gap-2"
                      onClick={() => setAbrangencia("nacional")}
                    >
                      <Globe className="h-4 w-4" />
                      Nacional
                    </Button>
                    <Button
                      type="button"
                      variant={abrangencia === "regional" ? "default" : "outline"}
                      className="flex items-center gap-2"
                      onClick={() => setAbrangencia("regional")}
                    >
                      <MapPin className="h-4 w-4" />
                      Regional
                    </Button>
                    <Button
                      type="button"
                      variant={abrangencia === "zona" ? "default" : "outline"}
                      className="flex items-center gap-2"
                      onClick={() => setAbrangencia("zona")}
                    >
                      <Building2 className="h-4 w-4" />
                      Zona
                    </Button>
                  </div>
                </div>

                {/* Zona Afetada (se não for nacional) */}
                {(abrangencia === "regional" || abrangencia === "zona") && (
                  <div className="space-y-2">
                    <Label>Zona Afetada</Label>
                    <Input
                      value={zonaAfetada}
                      onChange={(e) => setZonaAfetada(e.target.value)}
                      placeholder="Ex: Norte, Centro, Lisboa..."
                    />
                  </div>
                )}

                {/* Impacto */}
                <div className="space-y-2">
                  <Label>Nível de Impacto</Label>
                  <Select value={impacto} onValueChange={(v) => setImpacto(v as typeof impacto)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixo">
                        <div className="flex items-center gap-2">
                          <Badge className={impactoColors.baixo}>Baixo</Badge>
                          <span className="text-muted-foreground">- Situação menor</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medio">
                        <div className="flex items-center gap-2">
                          <Badge className={impactoColors.medio}>Médio</Badge>
                          <span className="text-muted-foreground">- Requer atenção</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="alto">
                        <div className="flex items-center gap-2">
                          <Badge className={impactoColors.alto}>Alto</Badge>
                          <span className="text-muted-foreground">- Urgente</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="critico">
                        <div className="flex items-center gap-2">
                          <Badge className={impactoColors.critico}>Crítico</Badge>
                          <span className="text-muted-foreground">- Ação imediata</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Lojas Afetadas (Opcional) */}
            <Card>
              <CardHeader>
                <CardTitle>Lojas Afetadas (Opcional)</CardTitle>
                <CardDescription>
                  Selecione se há lojas específicas envolvidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lojas && lojas.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {lojas.map((loja) => (
                      <div key={loja.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`loja-${loja.id}`}
                          checked={lojasAfetadas.includes(loja.id)}
                          onCheckedChange={() => handleLojaToggle(loja.id)}
                        />
                        <label
                          htmlFor={`loja-${loja.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {loja.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma loja disponível</p>
                )}
                
                {lojasAfetadas.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {lojasAfetadas.map((lojaId) => {
                      const loja = lojas?.find(l => l.id === lojaId);
                      return loja ? (
                        <Badge key={lojaId} variant="secondary">
                          {loja.nome}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fotos/Evidências */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Evidências (Opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Galeria
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Câmara
                  </Button>
                </div>

                {fotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {fotos.map((foto, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={foto}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botão de Submissão */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !tema.trim() || descricao.length < 10}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Reportar Ocorrência
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
