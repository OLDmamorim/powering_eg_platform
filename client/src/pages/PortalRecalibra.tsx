import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function PortalRecalibra() {
  const [, setLocation] = useLocation();

  const [token, setToken] = useState('');
  const [tokenValidado, setTokenValidado] = useState(false);
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [data, setData] = useState('');
  const [matricula, setMatricula] = useState('');
  const [tipoCalibragem, setTipoCalibragem] = useState<'DINÂMICA' | 'ESTÁTICA' | 'CORE' | ''>('');
  const [marca, setMarca] = useState('');
  const [tipologiaViatura, setTipologiaViatura] = useState<'LIGEIRO' | 'PESADO'>('LIGEIRO');
  const [localidade, setLocalidade] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Carregar token do localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('recalibra_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Validar token
  const { data: tokenData, isLoading: validandoToken } = trpc.portalRecalibra.validarToken.useQuery(
    { token },
    { enabled: !!token && !tokenValidado }
  );

  useEffect(() => {
    if (tokenData) {
      setTokenValidado(true);
      localStorage.setItem('recalibra_token', token);
    }
  }, [tokenData, token]);

  // Mutation para registar calibragem
  const registarMutation = trpc.portalRecalibra.registarCalibragem.useMutation({
    onSuccess: () => {
      toast({ title: 'Calibragem registada com sucesso!' });
      // Limpar formulário
      setLojaId(null);
      setData('');
      setMatricula('');
      setTipoCalibragem('');
      setMarca('');
      setTipologiaViatura('LIGEIRO');
      setLocalidade('');
      setObservacoes('');
    },
    onError: (error) => {
      toast({ title: 'Erro ao registar calibragem', description: error.message, variant: 'destructive' });
    },
  });

  const handleValidarToken = () => {
    if (!token) {
      toast({ title: 'Insira um token', variant: 'destructive' });
      return;
    }
    // A validação acontece automaticamente via query
  };

  const handleRegistar = () => {
    if (!lojaId || !data || !matricula || !tipoCalibragem) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    registarMutation.mutate({
      token,
      lojaId,
      data,
      matricula,
      tipoCalibragem,
      marca,
      tipologiaViatura,
      localidade,
      observacoes,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('recalibra_token');
    setToken('');
    setTokenValidado(false);
    setLocation('/');
  };

  // Se ainda não validou o token, mostrar formulário de login
  if (!tokenValidado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardTitle className="text-2xl">Portal Recalibra</CardTitle>
            <CardDescription>
              Registo de Calibragens ExpressGlass
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="token">Token de Acesso</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Insira o seu token"
                  onKeyDown={(e) => e.key === 'Enter' && handleValidarToken()}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleValidarToken}
                disabled={validandoToken || !token}
              >
                {validandoToken && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Portal principal (após validação)
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-teal-900">{tokenData?.unidade.nome}</h1>
              <p className="text-muted-foreground">Portal de Registo de Calibragens</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>

        {/* Formulário de Registo */}
        <Card>
          <CardHeader>
            <CardTitle>Registar Nova Calibragem</CardTitle>
            <CardDescription>
              Preencha os dados da calibragem realizada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="loja">Loja *</Label>
                <Select value={lojaId?.toString()} onValueChange={(v) => setLojaId(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokenData?.lojas.map((loja) => (
                      <SelectItem key={loja.id} value={loja.id.toString()}>
                        {loja.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="matricula">Matrícula *</Label>
                <Input
                  id="matricula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                  placeholder="Ex: AA-00-BB"
                />
              </div>

              <div>
                <Label htmlFor="tipoCalibragem">Tipo de Calibragem *</Label>
                <Select value={tipoCalibragem} onValueChange={(v: any) => setTipoCalibragem(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DINÂMICA">Dinâmica</SelectItem>
                    <SelectItem value="ESTÁTICA">Estática</SelectItem>
                    <SelectItem value="CORE">CORE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="marca">Marca do Veículo</Label>
                <Input
                  id="marca"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Ex: Peugeot, BMW, Mercedes"
                />
              </div>

              <div>
                <Label htmlFor="tipologiaViatura">Tipologia</Label>
                <Select value={tipologiaViatura} onValueChange={(v: any) => setTipologiaViatura(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIGEIRO">Ligeiro</SelectItem>
                    <SelectItem value="PESADO">Pesado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="localidade">Localidade</Label>
                <Input
                  id="localidade"
                  value={localidade}
                  onChange={(e) => setLocalidade(e.target.value)}
                  placeholder="Onde foi realizada a calibragem"
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Notas adicionais sobre a calibragem..."
                  rows={4}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleRegistar}
                disabled={registarMutation.isPending}
              >
                {registarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!registarMutation.isPending && <CheckCircle2 className="mr-2 h-4 w-4" />}
                Registar Calibragem
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Histórico (placeholder) */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Histórico de Calibragens</CardTitle>
            <CardDescription>
              Últimas calibragens registadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Histórico em desenvolvimento
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
