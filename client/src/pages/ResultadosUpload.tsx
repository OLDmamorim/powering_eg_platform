import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Home } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLocation } from 'wouter';
// Toast removido - usando alerts

export default function ResultadosUpload() {
  const [, setLocation] = useLocation();
  // Toast removido
  const [file, setFile] = useState<File | null>(null);
  const [mes, setMes] = useState<string>('');
  const [ano, setAno] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [resultado, setResultado] = useState<{ sucesso: number; erros: string[] } | null>(null);

  const uploadMutation = trpc.resultados.upload.useMutation();

  const meses = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

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
    if (!file || !mes || !ano) {
      alert('Por favor, selecione o ficheiro, mês e ano');
      return;
    }

    setUploading(true);
    setResultado(null);

    try {
      // Converter ficheiro para Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remover prefixo data:...

        try {
          const result = await uploadMutation.mutateAsync({
            fileData: base64Data,
            fileName: file.name,
            mes: parseInt(mes),
            ano: parseInt(ano),
          });

          setResultado(result);
          
          if (result.sucesso > 0) {
            // Upload concluído com sucesso
          }

          if (result.erros.length > 0) {
            // Erros encontrados - exibidos na UI
          }

          // Limpar formulário
          setFile(null);
          setMes('');
          setAno('');
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } catch (error: any) {
            alert(`Erro ao processar ficheiro: ${error.message || 'Erro desconhecido'}`);
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      alert(`Erro ao fazer upload: ${error.message || 'Erro desconhecido'}`);
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upload de Resultados</h1>
        <p className="text-muted-foreground mt-2">
          Faça upload do ficheiro Excel mensal com os resultados das lojas
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Ficheiro Excel</CardTitle>
            <CardDescription>
              Selecione o ficheiro Excel com as folhas "Faturados" e "Complementares"
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
                  {file ? file.name : 'Selecionar ficheiro Excel'}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mes">Mês</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger id="mes">
                    <SelectValue placeholder="Selecionar mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || !mes || !ano || uploading}
              className="w-full"
            >
              {uploading ? 'A processar...' : 'Fazer Upload e Processar'}
            </Button>
          </CardContent>
        </Card>

        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {resultado.erros.length === 0 ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Upload Concluído com Sucesso
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Upload Concluído com Avisos
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <span className="font-medium">Lojas processadas com sucesso:</span>
                <span className="text-2xl font-bold text-green-600">{resultado.sucesso}</span>
              </div>

              {resultado.erros.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-orange-600">Erros encontrados:</h3>
                  <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                    {resultado.erros.map((erro, index) => (
                      <p key={index} className="text-sm text-orange-800 dark:text-orange-200">
                        • {erro}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              <Button
                onClick={() => setLocation('/')}
                variant="outline"
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Instruções - Folha "Faturados"</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>• O ficheiro Excel deve conter uma folha chamada <strong>"Faturados"</strong></p>
            <p>• Apenas as <strong>colunas A a N</strong> serão processadas</p>
            <p>• A <strong>linha 8</strong> deve conter os cabeçalhos</p>
            <p>• Os dados das lojas começam na <strong>linha 11</strong></p>
            <p>• Os nomes das lojas devem corresponder aos registados no sistema</p>
            <p>• Se já existirem dados para o mesmo mês/ano, serão <strong>substituídos</strong></p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100">Instruções - Folha "Complementares" (Opcional)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-green-800 dark:text-green-200 space-y-2">
            <p>• Se existir uma folha chamada <strong>"Complementares"</strong>, será processada automaticamente</p>
            <p>• A <strong>linha 9</strong> deve conter os cabeçalhos das colunas</p>
            <p>• Os dados das lojas começam na <strong>linha 11</strong></p>
            <p>• Colunas processadas: <strong>Escovas, Polimento, Tratamentos, Outros, Películas, Lavagens ECO</strong></p>
            <p>• Os dados aparecem na secção <strong>"Vendas Complementares"</strong> do Dashboard de Resultados</p>
          </CardContent>
        </Card>
      </div>
      </div>
    </DashboardLayout>
  );
}
