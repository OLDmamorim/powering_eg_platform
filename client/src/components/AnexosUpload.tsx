import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Anexo {
  nome: string;
  url: string;
  tipo: "documento" | "imagem";
}

interface AnexosUploadProps {
  anexos: Anexo[];
  onChange: (anexos: Anexo[]) => void;
  maxFiles?: number;
}

export function AnexosUpload({ anexos, onChange, maxFiles = 10 }: AnexosUploadProps) {
  const { language } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const uploadMutation = trpc.uploadAnexo.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (anexos.length + files.length > maxFiles) {
      toast.error(language === 'pt' ? `Máximo de ${maxFiles} anexos permitidos` : `Maximum ${maxFiles} attachments allowed`);
      return;
    }

    setUploading(true);

    try {
      const novosAnexos: Anexo[] = [];

      for (const file of files) {
        // Validar tamanho (máx 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(language === 'pt' ? `${file.name} é muito grande (máx 10MB)` : `${file.name} is too large (max 10MB)`);
          continue;
        }

        // Determinar tipo
        const isImage = file.type.startsWith("image/");
        const tipo: "documento" | "imagem" = isImage ? "imagem" : "documento";

        // Converter para base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < buffer.length; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        const base64 = btoa(binary);
        
        // Upload via tRPC
        const { url } = await uploadMutation.mutateAsync({
          fileName: file.name,
          fileData: base64,
          contentType: file.type || 'application/octet-stream',
        });

        novosAnexos.push({
          nome: file.name,
          url,
          tipo,
        });
      }

      onChange([...anexos, ...novosAnexos]);
      toast.success(language === 'pt' ? `${novosAnexos.length} arquivo(s) adicionado(s)` : `${novosAnexos.length} file(s) added`);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error(language === 'pt' ? "Erro ao fazer upload dos arquivos" : "Error uploading files");
    } finally {
      setUploading(false);
      // Limpar input
      e.target.value = "";
    }
  };

  const removerAnexo = (index: number) => {
    const novosAnexos = anexos.filter((_, i) => i !== index);
    onChange(novosAnexos);
  };

  return (
    <div className="space-y-2">
      <Label>Anexos (opcional)</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={uploading || anexos.length >= maxFiles}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A carregar...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Adicionar Ficheiros
            </>
          )}
        </Button>
        <input
          id="file-upload"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <span className="text-sm text-muted-foreground">
          {anexos.length}/{maxFiles} ficheiros
        </span>
      </div>

      {anexos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {anexos.map((anexo, index) => (
            <Badge key={index} variant="secondary" className="gap-2 pr-1">
              {anexo.tipo === "imagem" ? (
                <ImageIcon className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              <span className="max-w-[150px] truncate">{anexo.nome}</span>
              <button
                type="button"
                onClick={() => removerAnexo(index)}
                className="ml-1 rounded-sm hover:bg-secondary-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Formatos suportados: Imagens, PDF, Word, Excel, PowerPoint, TXT (máx 10MB por ficheiro)
      </p>
    </div>
  );
}
