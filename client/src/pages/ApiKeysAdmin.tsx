import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Key, Plus, Copy, Trash2, Power, PowerOff, Eye, EyeOff, Clock, Activity, Shield, BookOpen } from "lucide-react";

const PERMISSOES_DISPONIVEIS = [
  { id: "resultados", label: "Resultados das Lojas", descricao: "Acesso a resultados mensais, NPS e lista de lojas" },
  { id: "*", label: "Todas as permissões", descricao: "Acesso total a todos os endpoints da API" },
];

export default function ApiKeysAdmin() {
  const { data: keys, isLoading, refetch } = trpc.apiKeys.listar.useQuery();
  const criarMutation = trpc.apiKeys.criar.useMutation({
    onSuccess: (data) => {
      setNovaChave(data.key);
      setMostrarChave(true);
      refetch();
      toast.success("API Key criada com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });
  const toggleMutation = trpc.apiKeys.toggleAtivo.useMutation({
    onSuccess: () => { refetch(); toast.success("Estado atualizado"); },
    onError: (err) => toast.error(err.message),
  });
  const eliminarMutation = trpc.apiKeys.eliminar.useMutation({
    onSuccess: () => { refetch(); toast.success("API Key eliminada"); },
    onError: (err) => toast.error(err.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [permissoes, setPermissoes] = useState<string[]>(["resultados"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [novaChave, setNovaChave] = useState("");
  const [mostrarChave, setMostrarChave] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  const handleCriar = () => {
    if (!nome.trim()) { toast.error("Nome obrigatório"); return; }
    if (permissoes.length === 0) { toast.error("Selecione pelo menos uma permissão"); return; }
    criarMutation.mutate({
      nome: nome.trim(),
      permissoes,
      expiresAt: expiresAt || undefined,
    });
  };

  const handleCopiar = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const resetForm = () => {
    setNome("");
    setPermissoes(["resultados"]);
    setExpiresAt("");
    setNovaChave("");
    setMostrarChave(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            API Keys
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerir chaves de acesso para aplicações externas
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Documentação API
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Documentação da API Externa</DialogTitle>
                <DialogDescription>Como usar a API para aceder aos dados da plataforma</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-base mb-2">Autenticação</h3>
                  <p className="text-muted-foreground mb-2">Inclua a chave no header de cada request:</p>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`curl -H "X-API-Key: peg_sua_chave_aqui" \\
  https://seu-dominio.com/api/external/resultados?mes=1&ano=2026`}
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-2">Endpoints Disponíveis</h3>
                  <div className="space-y-3">
                    <div className="border rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-green-600 border-green-600">GET</Badge>
                        <code className="text-xs font-mono">/api/external/lojas</code>
                      </div>
                      <p className="text-muted-foreground text-xs">Lista todas as lojas. Filtro opcional: <code>?zona=norte</code></p>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-green-600 border-green-600">GET</Badge>
                        <code className="text-xs font-mono">/api/external/resultados?mes=1&ano=2026</code>
                      </div>
                      <p className="text-muted-foreground text-xs">Resultados mensais. Filtros: <code>lojaId</code>, <code>zona</code></p>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-green-600 border-green-600">GET</Badge>
                        <code className="text-xs font-mono">/api/external/resultados/:lojaId</code>
                      </div>
                      <p className="text-muted-foreground text-xs">Histórico de resultados de uma loja. Filtro: <code>?ano=2026</code></p>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-green-600 border-green-600">GET</Badge>
                        <code className="text-xs font-mono">/api/external/nps?ano=2026</code>
                      </div>
                      <p className="text-muted-foreground text-xs">Dados NPS e Taxa de Resposta. Filtro: <code>lojaId</code></p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-2">Exemplo de Resposta</h3>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "periodo": { "mes": 1, "ano": 2026 },
  "total": 70,
  "totais": {
    "totalServicos": 4500,
    "totalObjetivo": 5000,
    "totalReparacoes": 800,
    "mediaReparacao": 15.1
  },
  "resultados": [
    {
      "lojaId": 1,
      "lojaNome": "Loja Exemplo",
      "zona": "ZONA NORTE",
      "totalServicos": 65,
      "objetivoMensal": 70,
      ...
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{mostrarChave ? "API Key Criada" : "Criar Nova API Key"}</DialogTitle>
                <DialogDescription>
                  {mostrarChave 
                    ? "Copie a chave agora. Não será possível vê-la novamente." 
                    : "Configure o nome, permissões e expiração da chave"
                  }
                </DialogDescription>
              </DialogHeader>

              {mostrarChave ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Atenção: Guarde esta chave!</span>
                    </div>
                    <p className="text-amber-700 dark:text-amber-300 text-xs">
                      Esta é a única vez que a chave completa será mostrada. Copie-a e guarde-a num local seguro.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input value={novaChave} readOnly className="font-mono text-xs" />
                    <Button size="sm" variant="outline" onClick={() => handleCopiar(novaChave)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setDialogOpen(false); resetForm(); }}>Fechar</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome da Chave</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Power BI, App Mobile, Integração CRM..."
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Permissões</Label>
                    <div className="space-y-2 mt-2">
                      {PERMISSOES_DISPONIVEIS.map((p) => (
                        <div key={p.id} className="flex items-start gap-2">
                          <Checkbox
                            id={`perm-${p.id}`}
                            checked={permissoes.includes(p.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPermissoes([...permissoes, p.id]);
                              } else {
                                setPermissoes(permissoes.filter((x) => x !== p.id));
                              }
                            }}
                          />
                          <div>
                            <label htmlFor={`perm-${p.id}`} className="text-sm font-medium cursor-pointer">{p.label}</label>
                            <p className="text-xs text-muted-foreground">{p.descricao}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expires">Data de Expiração (opcional)</Label>
                    <Input
                      id="expires"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Deixe vazio para sem expiração</p>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                    <Button onClick={handleCriar} disabled={criarMutation.isPending}>
                      {criarMutation.isPending ? "A criar..." : "Criar API Key"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      {keys && keys.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{keys.length}</p>
                  <p className="text-xs text-muted-foreground">Total de Chaves</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Power className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{keys.filter(k => k.ativo).length}</p>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{keys.reduce((s, k) => s + (k.totalRequests || 0), 0)}</p>
                  <p className="text-xs text-muted-foreground">Total de Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Keys List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      ) : !keys || keys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Key className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma API Key criada</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Crie uma chave para permitir que aplicações externas acedam aos dados da plataforma.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id} className={!key.ativo ? "opacity-60" : ""}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${key.ativo ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <Key className={`h-5 w-5 ${key.ativo ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{key.nome}</span>
                        <Badge variant={key.ativo ? "default" : "destructive"} className="text-xs">
                          {key.ativo ? "Ativa" : "Desativada"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{key.keyPrefix}...</span>
                        <span>Permissões: {(key.permissoes as string[]).join(", ")}</span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {key.totalRequests || 0} requests
                        </span>
                        {key.ultimoUso && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Último uso: {new Date(key.ultimoUso).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                        {key.expiresAt && (
                          <span className={`flex items-center gap-1 ${new Date(key.expiresAt) < new Date() ? 'text-red-500' : ''}`}>
                            Expira: {new Date(key.expiresAt).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Criada por {key.criadoPorNome} em {new Date(key.createdAt).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: key.id, ativo: !key.ativo })}
                      disabled={toggleMutation.isPending}
                    >
                      {key.ativo ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Tem a certeza que quer eliminar esta API Key? Esta ação é irreversível.")) {
                          eliminarMutation.mutate({ id: key.id });
                        }
                      }}
                      disabled={eliminarMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
