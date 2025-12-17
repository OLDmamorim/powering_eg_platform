import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Download, FileUp, Upload } from "lucide-react";
import Papa from "papaparse";
import { useState } from "react";
import { toast } from "sonner";

interface ImportLojasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  nome: string;
  email?: string;
}

export default function ImportLojasDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportLojasDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);

  const importMutation = trpc.lojas.import.useMutation({
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (errorCount === 0) {
        toast.success(`${successCount} lojas importadas com sucesso!`);
      } else {
        toast.warning(
          `${successCount} importadas, ${errorCount} com erros. Verifique os detalhes.`
        );
        
        // Mostrar erros
        results
          .filter((r) => !r.success)
          .forEach((r) => {
            toast.error(`Linha ${r.row}: ${r.error}`);
          });
      }

      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message);
      setImporting(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Apenas ficheiros CSV são suportados");
      return;
    }

    setFile(selectedFile);

    // Parse CSV
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const parsed: ParsedRow[] = rows.map((row) => ({
          nome: row.Nome || row.nome || "",
          email: row.Email || row.email || "",
        }));

        setPreview(parsed);
      },
      error: (error) => {
        toast.error(`Erro ao ler ficheiro: ${error.message}`);
      },
    });
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }

    setImporting(true);
    importMutation.mutate(preview);
  };

  const handleDownloadTemplate = () => {
    const csv = "Nome,Email\nLoja Exemplo,loja@exemplo.com";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_lojas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setImporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Lojas</DialogTitle>
          <DialogDescription>
            Faça upload de um ficheiro CSV com as lojas a importar. As colunas
            devem ser: Nome, Email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Descarregar Template
            </Button>
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileUp className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {file
                  ? file.name
                  : "Clique para selecionar ficheiro CSV"}
              </p>
            </label>
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">
                Pré-visualização ({preview.length} lojas)
              </h4>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.nome}</td>
                        <td className="p-2">{row.email || "-"}</td>
                      </tr>
                    ))}
                    {preview.length > 10 && (
                      <tr className="border-t">
                        <td colSpan={2} className="p-2 text-center text-muted-foreground">
                          ... e mais {preview.length - 10} lojas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={preview.length === 0 || importing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "A importar..." : `Importar ${preview.length} lojas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
