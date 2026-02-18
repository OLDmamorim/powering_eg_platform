import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Calendar, Mail, CheckCircle2, XCircle } from "lucide-react";

export function HistoricoEnviosVolante() {
  const { data: historico, isLoading } = trpc.relatorios.getHistoricoEnvios.useQuery({
    tipo: 'volante',
  });

  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!historico || historico.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum envio registado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {historico.map((envio) => {
        const mesNome = mesesNomes[envio.mesReferencia - 1];
        const totalEmails = envio.emailsEnviadosUnidades + envio.emailsEnviadosGestores;
        const temErros = envio.emailsErro > 0;

        return (
          <div key={envio.id} className="flex items-center justify-between p-4 bg-muted rounded-lg border-l-4 border-green-500">
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Mês de Referência</div>
                  <div className="font-medium">{mesNome} {envio.anoReferencia}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Emails Enviados</div>
                  <div className="font-medium">
                    {totalEmails} total
                    <span className="text-xs text-muted-foreground ml-2">
                      ({envio.emailsEnviadosUnidades} lojas + {envio.emailsEnviadosGestores} gestores)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                {temErros ? (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="font-medium text-red-600">{envio.emailsErro} erro(s)</div>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="font-medium text-green-600">Sucesso</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground ml-4">
              {formatarData(envio.dataEnvio)}
            </div>
          </div>
        );
      })}
      
      <div className="text-center text-sm text-muted-foreground pt-2">
        Total de {historico.length} envio(s) registado(s)
      </div>
    </div>
  );
}
