import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, ChevronDown, BarChart3, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ==========================================
// Componente Autocomplete reutilizável
// ==========================================
function AutocompleteInput({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { id: number; nome: string }[];
  placeholder: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Se o utilizador escreveu algo novo, aceitar como novo valor
        if (inputValue.trim() && inputValue !== value) {
          onChange(inputValue.trim());
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, onChange]);

  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) return options;
    const termo = inputValue.toLowerCase();
    return options.filter(o => o.nome.toLowerCase().includes(termo));
  }, [inputValue, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
  };

  const handleSelect = (nome: string) => {
    setInputValue(nome);
    onChange(nome);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        onChange(inputValue.trim());
        setIsOpen(false);
      }
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Label>{label} {required && '*'}</Label>
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-8"
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-teal-50 text-sm transition-colors"
              onClick={() => handleSelect(option.nome)}
            >
              {option.nome}
            </button>
          ))}
          {inputValue.trim() && !filteredOptions.some(o => o.nome.toLowerCase() === inputValue.toLowerCase()) && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-teal-50 text-sm text-teal-700 font-medium border-t"
              onClick={() => handleSelect(inputValue.trim())}
            >
              + Adicionar "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
      {isOpen && filteredOptions.length === 0 && inputValue.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-teal-50 text-sm text-teal-700 font-medium"
            onClick={() => handleSelect(inputValue.trim())}
          >
            + Adicionar "{inputValue.trim()}"
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Formatação de matrícula XX-XX-XX
// ==========================================
function formatarMatricula(valor: string): string {
  // Remover tudo que não seja letra ou número
  const limpo = valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Aplicar formato XX-XX-XX
  let resultado = '';
  for (let i = 0; i < Math.min(limpo.length, 6); i++) {
    if (i > 0 && i % 2 === 0) {
      resultado += '-';
    }
    resultado += limpo[i];
  }
  
  return resultado;
}

function validarMatricula(matricula: string): boolean {
  // Formato XX-XX-XX onde X pode ser letra ou número
  return /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/.test(matricula);
}

// ==========================================
// Componente Principal
// ==========================================
export default function PortalRecalibra() {
  const [, setLocation] = useLocation();

  const [token, setToken] = useState('');
  const [tokenValidado, setTokenValidado] = useState(false);
  const [lojaId, setLojaId] = useState<string>('');
  const [data, setData] = useState('');
  const [matricula, setMatricula] = useState('');
  const [tipoCalibragem, setTipoCalibragem] = useState<'DINÂMICA' | 'ESTÁTICA' | 'CORE' | ''>('');
  const [marca, setMarca] = useState('');
  const [tipologiaViatura, setTipologiaViatura] = useState<'LIGEIRO' | 'PESADO'>('LIGEIRO');
  const [localidade, setLocalidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [outrosLoja, setOutrosLoja] = useState('');
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const ITEMS_POR_PAGINA = 20;

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

  // Carregar localidades e marcas para autocomplete
  const { data: localidadesData } = trpc.portalRecalibra.pesquisarLocalidades.useQuery(
    { termo: '' },
    { enabled: tokenValidado }
  );
  const { data: marcasData } = trpc.portalRecalibra.pesquisarMarcas.useQuery(
    { termo: '' },
    { enabled: tokenValidado }
  );

  // Mutations para criar localidade/marca novas
  const criarLocalidadeMutation = trpc.portalRecalibra.criarLocalidade.useMutation();
  const criarMarcaMutation = trpc.portalRecalibra.criarMarca.useMutation();

  // Mutation para registar calibragem
  const registarMutation = trpc.portalRecalibra.registarCalibragem.useMutation({
    onSuccess: () => {
      toast.success('Calibragem registada com sucesso!');
      // Limpar formulário
      setLojaId('');
      setData('');
      setMatricula('');
      setTipoCalibragem('');
      setMarca('');
      setTipologiaViatura('LIGEIRO');
      setLocalidade('');
      setObservacoes('');
      setOutrosLoja('');
    },
    onError: (error: any) => {
      toast.error('Erro ao registar calibragem', { description: error.message });
    },
  });

  // Carregar calibragens para histórico
  const utils = trpc.useUtils();
  const { data: calibragensData } = trpc.portalRecalibra.listarCalibragens.useQuery(
    { token },
    { enabled: tokenValidado && !!token }
  );

  // Mutation para apagar calibragem
  const apagarMutation = trpc.portalRecalibra.apagarCalibragem.useMutation({
    onSuccess: () => {
      toast.success('Calibragem apagada com sucesso');
      utils.portalRecalibra.listarCalibragens.invalidate();
      utils.portalRecalibra.estatisticas.invalidate();
    },
    onError: (error: any) => {
      toast.error('Erro ao apagar calibragem', { description: error.message });
    },
  });

  const handleValidarToken = () => {
    if (!token) {
      toast.error('Insira um token');
      return;
    }
    // A validação acontece automaticamente via query
    setTokenValidado(false); // Reset para re-trigger
  };

  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarMatricula(e.target.value);
    setMatricula(formatted);
  };

  const handleRegistar = async () => {
    // Validações
    if (!lojaId || !data || !matricula || !tipoCalibragem) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!validarMatricula(matricula)) {
      toast.error('Matrícula inválida', { description: 'Formato correto: XX-XX-XX (ex: AA-00-BB)' });
      return;
    }

    if (lojaId === 'outros' && !outrosLoja.trim()) {
      toast.error('Indique o nome da loja externa');
      return;
    }

    // Se localidade é nova, criar primeiro
    let localidadeFinal = localidade;
    if (localidade && localidadesData && !localidadesData.some(l => l.nome === localidade)) {
      try {
        await criarLocalidadeMutation.mutateAsync({ nome: localidade });
      } catch (e) {
        // Ignorar se já existe
      }
    }

    // Se marca é nova, criar primeiro
    if (marca && marcasData && !marcasData.some(m => m.nome === marca)) {
      try {
        await criarMarcaMutation.mutateAsync({ nome: marca });
      } catch (e) {
        // Ignorar se já existe
      }
    }

    // Preparar dados
    const lojaIdFinal = lojaId === 'outros' ? 0 : parseInt(lojaId);
    const observacoesFinal = lojaId === 'outros' 
      ? `[Loja Externa: ${outrosLoja.trim()}]${observacoes ? ' ' + observacoes : ''}`
      : observacoes;

    registarMutation.mutate({
      token,
      lojaId: lojaIdFinal,
      data,
      matricula: matricula.toUpperCase(),
      tipoCalibragem: tipoCalibragem as 'DINÂMICA' | 'ESTÁTICA' | 'CORE',
      marca: marca || undefined,
      tipologiaViatura,
      localidade: localidadeFinal || undefined,
      observacoes: observacoesFinal || undefined,
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

  // Lojas disponíveis (com opção Outros)
  const lojasDisponiveis = tokenData?.lojas || [];

  // Portal principal (após validação)
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-teal-900">{tokenData?.unidade.nome}</h1>
              <p className="text-muted-foreground">Portal de Registo de Calibragens</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setLocation('/dashboard-recalibra')}>
                <BarChart3 className="mr-1 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Formulário de Registo */}
        <Card>
          <CardHeader>
            <CardTitle>Registar Nova Calibragem</CardTitle>
            <CardDescription>
              Preencha os dados da calibragem realizada. Campos com * são obrigatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Loja */}
              <div>
                <Label htmlFor="loja">Loja *</Label>
                <Select value={lojaId} onValueChange={(v) => { setLojaId(v); if (v !== 'outros') setOutrosLoja(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojasDisponiveis.map((loja: any) => (
                      <SelectItem key={loja.id} value={loja.id.toString()}>
                        {loja.nome}
                      </SelectItem>
                    ))}
                    <SelectItem value="outros">
                      🏪 Outros (Loja externa)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campo de loja externa (quando "Outros" selecionado) */}
              {lojaId === 'outros' && (
                <div>
                  <Label htmlFor="outrosLoja">Nome da Loja Externa *</Label>
                  <Input
                    id="outrosLoja"
                    value={outrosLoja}
                    onChange={(e) => setOutrosLoja(e.target.value)}
                    placeholder="Ex: ExpressGlass Lisboa, Loja parceira..."
                  />
                </div>
              )}

              {/* Data */}
              <div>
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              {/* Matrícula com formatação automática */}
              <div>
                <Label htmlFor="matricula">Matrícula *</Label>
                <Input
                  id="matricula"
                  value={matricula}
                  onChange={handleMatriculaChange}
                  placeholder="XX-XX-XX"
                  maxLength={8}
                  className="uppercase font-mono text-lg tracking-wider"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato: XX-XX-XX (letras e números, ex: AA-00-BB)
                </p>
              </div>

              {/* Tipo de Calibragem */}
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

              {/* Marca com autocomplete */}
              <AutocompleteInput
                label="Marca do Veículo"
                value={marca}
                onChange={setMarca}
                options={marcasData || []}
                placeholder="Escreva para pesquisar ou adicionar nova marca"
              />

              {/* Tipologia */}
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

              {/* Localidade com autocomplete */}
              <AutocompleteInput
                label="Localidade"
                value={localidade}
                onChange={setLocalidade}
                options={localidadesData || []}
                placeholder="Escreva para pesquisar ou adicionar nova localidade"
              />

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Notas adicionais sobre a calibragem..."
                  rows={3}
                />
              </div>

              <Button 
                className="w-full bg-teal-600 hover:bg-teal-700" 
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

        {/* Histórico de Calibragens */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Histórico de Calibragens</CardTitle>
            <CardDescription>
              Últimas calibragens registadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!calibragensData || calibragensData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma calibragem registada ainda
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Matrícula</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Marca</th>
                      <th className="text-left p-2">Loja</th>
                      <th className="text-left p-2">Localidade</th>
                      <th className="text-center p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibragensData.slice(0, paginaHistorico * ITEMS_POR_PAGINA).map((item: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-muted/30">
                        <td className="p-2">{item.data || '-'}</td>
                        <td className="p-2 font-mono">{item.matricula || '-'}</td>
                        <td className="p-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.tipoCalibragem === 'DIN\u00c2MICA' ? 'bg-blue-100 text-blue-800' :
                            item.tipoCalibragem === 'EST\u00c1TICA' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {item.tipoCalibragem || '-'}
                          </span>
                        </td>
                        <td className="p-2">{item.marca || '-'}</td>
                        <td className="p-2">{item.loja?.nome || 'Outros'}</td>
                        <td className="p-2">{item.localidade || '-'}</td>
                        <td className="p-2 text-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Apagar calibragem?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem a certeza que deseja apagar esta calibragem?
                                  <br />
                                  <strong>{item.data}</strong> — {item.matricula || 'Sem matrícula'} — {item.tipoCalibragem || 'Sem tipo'}
                                  <br />
                                  Esta ação não pode ser revertida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => apagarMutation.mutate({ token, calibragemId: item.id })}
                                >
                                  Apagar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-col items-center gap-2 mt-4">
                  <p className="text-muted-foreground text-sm">
                    Mostrando {Math.min(paginaHistorico * ITEMS_POR_PAGINA, calibragensData.length)} de {calibragensData.length} registos
                  </p>
                  {paginaHistorico * ITEMS_POR_PAGINA < calibragensData.length && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaHistorico(p => p + 1)}
                    >
                      <ChevronDown className="mr-1 h-4 w-4" />
                      Carregar mais
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
