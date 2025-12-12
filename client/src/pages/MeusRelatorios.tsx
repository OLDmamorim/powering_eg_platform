import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Building2, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function MeusRelatorios() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: relatoriosLivres, isLoading: loadingLivres } =
    trpc.relatoriosLivres.list.useQuery();
  const { data: relatoriosCompletos, isLoading: loadingCompletos } =
    trpc.relatoriosCompletos.list.useQuery();

  if (user?.role !== "gestor") {
    setLocation("/dashboard");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Meus Relatórios
          </h1>
          <p className="text-muted-foreground">
            Histórico dos seus relatórios de supervisão
          </p>
        </div>

        <Tabs defaultValue="livres" className="space-y-4">
          <TabsList>
            <TabsTrigger value="livres">Relatórios Livres</TabsTrigger>
            <TabsTrigger value="completos">Relatórios Completos</TabsTrigger>
          </TabsList>

          <TabsContent value="livres" className="space-y-4">
            {loadingLivres ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : relatoriosLivres && relatoriosLivres.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {relatoriosLivres.map((relatorio: any) => (
                  <Card key={relatorio.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            {relatorio.loja?.nome || "Loja"}
                          </div>
                        </CardTitle>
                        <Badge>Livre</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(relatorio.dataVisita).toLocaleString("pt-PT")}
                      </div>
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {relatorio.descricao}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    Ainda não criou relatórios livres
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completos" className="space-y-4">
            {loadingCompletos ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : relatoriosCompletos && relatoriosCompletos.length > 0 ? (
              <div className="grid gap-4">
                {relatoriosCompletos.map((relatorio: any) => (
                  <Card key={relatorio.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            {relatorio.loja?.nome || "Loja"}
                          </div>
                        </CardTitle>
                        <Badge variant="secondary">Completo</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(relatorio.dataVisita).toLocaleString("pt-PT")}
                      </div>

                      <div className="grid gap-3">
                        {relatorio.episFardamento && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">
                              EPIs e Fardamento
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {relatorio.episFardamento}
                            </p>
                          </div>
                        )}
                        {relatorio.resumoSupervisao && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">
                              Resumo da Supervisão
                            </p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {relatorio.resumoSupervisao}
                            </p>
                          </div>
                        )}
                        {relatorio.colaboradoresPresentes && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">
                              Colaboradores Presentes
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {relatorio.colaboradoresPresentes}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    Ainda não criou relatórios completos
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
