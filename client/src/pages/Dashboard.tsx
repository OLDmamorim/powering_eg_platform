import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, ClipboardList, FileText, ListTodo } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isGestor = user?.role === "gestor";

  const { data: lojas } = trpc.lojas.list.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: gestores } = trpc.gestores.list.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: minhasLojas } = trpc.lojas.getByGestor.useQuery(undefined, {
    enabled: isGestor,
  });
  const { data: relatoriosLivres } = trpc.relatoriosLivres.list.useQuery();
  const { data: relatoriosCompletos } = trpc.relatoriosCompletos.list.useQuery();
  const { data: pendentes } = trpc.pendentes.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao PoweringEG Platform
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Lojas
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lojas?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Lojas ativas na rede
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Gestores
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {gestores?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gestores registados
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {isGestor && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Minhas Lojas
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {minhasLojas?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lojas sob sua gestão
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Relatórios Livres
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {relatoriosLivres?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Relatórios criados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Relatórios Completos
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {relatoriosCompletos?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Relatórios detalhados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendentes?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Items por resolver
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {relatoriosLivres?.slice(0, 5).map((relatorio: any) => (
                  <div
                    key={relatorio.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {relatorio.loja?.nome || "Loja"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(relatorio.dataVisita).toLocaleDateString(
                          "pt-PT"
                        )}
                      </p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Relatório Livre
                    </span>
                  </div>
                ))}
                {(!relatoriosLivres || relatoriosLivres.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum relatório recente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pendentes Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendentes?.slice(0, 5).map((pendente: any) => (
                  <div
                    key={pendente.id}
                    className="flex items-start justify-between border-b pb-2 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {pendente.loja?.nome || "Loja"}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {pendente.descricao}
                      </p>
                    </div>
                  </div>
                ))}
                {(!pendentes || pendentes.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum pendente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
