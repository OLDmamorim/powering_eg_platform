import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { History, Calendar, Mail, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export function HistoricoEnviosRelatorios() {
  const { language } = useLanguage();
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'volante' | 'recalibra'>('todos');
  
  const { data: historico, isLoading } = trpc.relatorios.getHistoricoEnvios.useQuery({
    tipo: filtroTipo === 'todos' ? undefined : filtroTipo,
  });

  const mesesNomes = language === 'pt' 
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const formatarData = (data: Date) => {
    const d = new Date(data);
    return d.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }) + ' ' + d.toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTipoBadgeColor = (tipo: string) => {
    return tipo === 'volante' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>
              {language === 'pt' ? 'Histórico de Envios de Relatórios Mensais' : 'Monthly Reports Sending History'}
            </CardTitle>
          </div>
          <CardDescription>
            {language === 'pt' 
              ? 'Registo de todos os relatórios mensais enviados automaticamente (Volante e Recalibra)'
              : 'Record of all automatically sent monthly reports (Volante and Recalibra)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroTipo === 'todos'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {language === 'pt' ? 'Todos' : 'All'}
            </button>
            <button
              onClick={() => setFiltroTipo('volante')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroTipo === 'volante'
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {language === 'pt' ? 'Volante' : 'Volante'}
            </button>
            <button
              onClick={() => setFiltroTipo('recalibra')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroTipo === 'recalibra'
                  ? 'bg-orange-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {language === 'pt' ? 'Recalibra' : 'Recalibra'}
            </button>
          </div>

          {/* Lista de envios */}
          {!historico || historico.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'pt' ? 'Nenhum envio registado' : 'No sends recorded'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historico.map((envio) => {
                const mesNome = mesesNomes[envio.mesReferencia - 1];
                const totalEmails = envio.emailsEnviadosUnidades + envio.emailsEnviadosGestores;
                const temErros = envio.emailsErro > 0;

                return (
                  <Card key={envio.id} className="border-l-4" style={{ borderLeftColor: envio.tipo === 'volante' ? '#10b981' : '#f97316' }}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getTipoBadgeColor(envio.tipo)}>
                              {envio.tipo === 'volante' ? 'Volante' : 'Recalibra'}
                            </Badge>
                            <span className="text-sm font-medium">
                              {mesNome} {language === 'pt' ? 'de' : ''} {envio.anoReferencia}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  {language === 'pt' ? 'Data de Envio' : 'Send Date'}
                                </div>
                                <div className="font-medium">
                                  {formatarData(envio.dataEnvio)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  {language === 'pt' ? 'Emails Enviados' : 'Emails Sent'}
                                </div>
                                <div className="font-medium">
                                  {totalEmails} {language === 'pt' ? 'total' : 'total'}
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({envio.emailsEnviadosUnidades} {envio.tipo === 'volante' ? (language === 'pt' ? 'lojas' : 'stores') : (language === 'pt' ? 'unidades' : 'units')} + {envio.emailsEnviadosGestores} {language === 'pt' ? 'gestores' : 'managers'})
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              {temErros ? (
                                <>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <div>
                                    <div className="text-xs text-muted-foreground">
                                      {language === 'pt' ? 'Erros' : 'Errors'}
                                    </div>
                                    <div className="font-medium text-red-600">
                                      {envio.emailsErro} {language === 'pt' ? 'erro(s)' : 'error(s)'}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <div>
                                    <div className="text-xs text-muted-foreground">
                                      {language === 'pt' ? 'Status' : 'Status'}
                                    </div>
                                    <div className="font-medium text-green-600">
                                      {language === 'pt' ? 'Sucesso' : 'Success'}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {historico && historico.length > 0 && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {language === 'pt' 
                ? `Total de ${historico.length} envio(s) registado(s)`
                : `Total of ${historico.length} send(s) recorded`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
