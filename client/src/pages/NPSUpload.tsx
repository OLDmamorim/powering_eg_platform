import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from "@/contexts/LanguageContext";

export default function NPSUpload() {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [ano, setAno] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [resultado, setResultado] = useState<{ sucesso: number; erros: string[] } | null>(null);

  const uploadMutation = trpc.nps.upload.useMutation();

  const anos = [2023, 2024, 2025, 2026, 2027];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validar tipo de arquivo
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        alert('Por favor, selecione um ficheiro Excel (.xlsx ou .xls)');
        return;
      }
      
      setFile(selectedFile);
      setResultado(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !ano) {
      alert('Por favor, selecione o ficheiro e o ano');
      return;
    }

    setUploading(true);
    setResultado(null);

    try {
      // Converter ficheiro para Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          const base64Data = base64.split(',')[1]; // Remover prefixo "data:..."

          // Enviar para o backend
          const result = await uploadMutation.mutateAsync({
            fileBase64: base64Data,
            fileName: file.name,
            ano: parseInt(ano),
          });

          setResultado(result);
          setUploading(false);

          // Limpar formulário se sucesso total
          if (result.erros.length === 0) {
            setFile(null);
            setAno('');
            // Reset do input file
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
          }
        } catch (error: any) {
          console.error('Erro ao fazer upload:', error);
          alert(error.message || 'Erro ao processar ficheiro NPS');
          setUploading(false);
        }
      };

      reader.onerror = () => {
        alert('Erro ao ler o ficheiro');
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      alert(error.message || 'Erro ao processar ficheiro NPS');
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Upload de NPS</h1>
          <p className="text-muted-foreground mt-2">
            Faça upload do ficheiro Excel com os dados NPS (Net Promoter Score) das lojas
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Ficheiro Excel NPS</CardTitle>
              <CardDescription>
                Selecione o ficheiro Excel com a folha "Por Loja" contendo os dados NPS mensais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Ficheiro</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {file ? file.name : 'Selecionar ficheiro Excel NPS'}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {file && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ano">Ano</Label>
                <Select value={ano} onValueChange={setAno}>
                  <SelectTrigger id="ano">
                    <SelectValue placeholder="Selecionar ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((a) => (
                      <SelectItem key={a} value={a.toString()}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || !ano || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                    A processar...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Fazer Upload
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {resultado && (
            <Card className={resultado.erros.length === 0 ? 'border-green-500' : 'border-yellow-500'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {resultado.erros.length === 0 ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Upload Concluído com Sucesso
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      Upload Concluído com Avisos
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">
                    {resultado.sucesso} {resultado.sucesso === 1 ? 'loja processada' : 'lojas processadas'} com sucesso
                  </p>
                </div>

                {resultado.erros.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-600 mb-2">
                      {resultado.erros.length} {resultado.erros.length === 1 ? 'aviso' : 'avisos'}:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {resultado.erros.map((erro, index) => (
                        <li key={index}>{erro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Os dados NPS foram importados e estão disponíveis no dashboard de resultados.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Instruções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• O ficheiro Excel deve conter uma folha chamada <strong>"Por Loja"</strong></p>
              <p>• A folha deve ter os dados NPS mensais (Jan, Fev, Mar... Dez) e a taxa de resposta</p>
              <p>• Os nomes das lojas no Excel devem corresponder aos nomes cadastrados no sistema</p>
              <p>• Se uma loja já tiver dados NPS para o ano selecionado, os dados serão atualizados</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
