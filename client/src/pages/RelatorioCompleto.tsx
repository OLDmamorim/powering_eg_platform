import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Plus, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function RelatorioCompleto() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(0);
  const [lojaId, setLojaId] = useState("");
  const [pendentes, setPendentes] = useState<string[]>([""]);
  const [formData, setFormData] = useState({
    episFardamento: "",
    kitPrimeirosSocorros: "",
    consumiveis: "",
    espacoFisico: "",
    reclamacoes: "",
    vendasComplementares: "",
    fichasServico: "",
    documentacaoObrigatoria: "",
    reuniaoQuinzenal: undefined as boolean | undefined,
    resumoSupervisao: "",
    colaboradoresPresentes: "",
  });

  const utils = trpc.useUtils();
  const { data: lojas } = trpc.lojas.getByGestor.useQuery();

  const createMutation = trpc.relatoriosCompletos.create.useMutation({
    onSuccess: () => {
      toast.success("Relatório completo criado com sucesso");
      utils.relatoriosCompletos.list.invalidate();
      setLocation("/meus-relatorios");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (user?.role !== "gestor") {
    setLocation("/dashboard");
    return null;
  }

  const pages = [
    { title: "Seleção de Loja", fields: ["loja"] },
    { title: "EPIs e Fardamento", fields: ["episFardamento"] },
    { title: "Kit de 1ºs Socorros", fields: ["kitPrimeirosSocorros"] },
    { title: "Consumíveis", fields: ["consumiveis"] },
    { title: "Espaço Físico da Loja", fields: ["espacoFisico"] },
    { title: "Reclamações", fields: ["reclamacoes"] },
    { title: "Vendas Complementares", fields: ["vendasComplementares"] },
    { title: "Fichas de Serviço", fields: ["fichasServico"] },
    { title: "Documentação Obrigatória", fields: ["documentacaoObrigatoria"] },
    { title: "Reunião Quinzenal", fields: ["reuniaoQuinzenal"] },
    { title: "Resumo e Colaboradores", fields: ["resumoSupervisao", "colaboradoresPresentes"] },
    { title: "Pendentes", fields: ["pendentes"] },
  ];

  const handleAddPendente = () => {
    setPendentes([...pendentes, ""]);
  };

  const handleRemovePendente = (index: number) => {
    setPendentes(pendentes.filter((_, i) => i !== index));
  };

  const handlePendenteChange = (index: number, value: string) => {
    const newPendentes = [...pendentes];
    newPendentes[index] = value;
    setPendentes(newPendentes);
  };

  const handleNext = () => {
    if (currentPage === 0 && !lojaId) {
      toast.error("Por favor selecione uma loja");
      return;
    }
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSubmit = () => {
    if (!lojaId) {
      toast.error("Por favor selecione uma loja");
      return;
    }

    const pendentesValidos = pendentes.filter((p) => p.trim() !== "");

    createMutation.mutate({
      lojaId: Number(lojaId),
      dataVisita: new Date(),
      ...formData,
      pendentes: pendentesValidos.length > 0 ? pendentesValidos : undefined,
    });
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loja">Loja *</Label>
              <Select value={lojaId} onValueChange={setLojaId} required>
                <SelectTrigger id="loja">
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {lojas?.map((loja: any) => (
                    <SelectItem key={loja.id} value={loja.id.toString()}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data e Hora</Label>
              <Input
                id="data"
                type="text"
                value={new Date().toLocaleString("pt-PT")}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                A data e hora são registadas automaticamente
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-2">
            <Label htmlFor="episFardamento">EPIs e Fardamento</Label>
            <Textarea
              id="episFardamento"
              value={formData.episFardamento}
              onChange={(e) =>
                setFormData({ ...formData, episFardamento: e.target.value })
              }
              placeholder="Verificar: Luvas de Corte, Luvas Nitrilo, Óculos de Proteção, Sapatos de Proteção. Mencionar colaboradores que não estão em conformidade."
              rows={6}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-2">
            <Label htmlFor="kitPrimeirosSocorros">Kit de 1ºs Socorros / Quase Acidente</Label>
            <Textarea
              id="kitPrimeirosSocorros"
              value={formData.kitPrimeirosSocorros}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  kitPrimeirosSocorros: e.target.value,
                })
              }
              placeholder="Verificar validade dos produtos no Kit de 1ºs Socorros."
              rows={6}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-2">
            <Label htmlFor="consumiveis">Consumíveis</Label>
            <Textarea
              id="consumiveis"
              value={formData.consumiveis}
              onChange={(e) =>
                setFormData({ ...formData, consumiveis: e.target.value })
              }
              placeholder="Verificar: Primários e Ativadores, Produto polimento faróis, Acrílico/Plexiglass, Película autocolante, Escovas."
              rows={6}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-2">
            <Label htmlFor="espacoFisico">Espaço Físico da Loja</Label>
            <Textarea
              id="espacoFisico"
              value={formData.espacoFisico}
              onChange={(e) =>
                setFormData({ ...formData, espacoFisico: e.target.value })
              }
              placeholder="Verificar: WC, Área vedada do cliente, Cacifos, Espaço de alimentação, Resíduos, Balcão e Secretária, Single Cut, Easy Cut, Aspirador, LilBuddy, Compressor, Caixa de Ferramentas."
              rows={6}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-2">
            <Label htmlFor="reclamacoes">Reclamações</Label>
            <Textarea
              id="reclamacoes"
              value={formData.reclamacoes}
              onChange={(e) =>
                setFormData({ ...formData, reclamacoes: e.target.value })
              }
              placeholder="Verificar existência de reclamações e respetivo ponto de situação."
              rows={6}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-2">
            <Label htmlFor="vendasComplementares">Vendas Complementares</Label>
            <Textarea
              id="vendasComplementares"
              value={formData.vendasComplementares}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  vendasComplementares: e.target.value,
                })
              }
              placeholder="Análise de vendas: Escovas, Polimentos, Tratamentos Ferrugem, Colagem Capotas."
              rows={6}
            />
          </div>
        );

      case 7:
        return (
          <div className="space-y-2">
            <Label htmlFor="fichasServico">10 Últimas Fichas de Serviço</Label>
            <Textarea
              id="fichasServico"
              value={formData.fichasServico}
              onChange={(e) =>
                setFormData({ ...formData, fichasServico: e.target.value })
              }
              placeholder="Validar: Correto preenchimento do CL, Utilização de capas de proteção, Notas que esclareçam o ponto de situação, Utilização de envio de SMS."
              rows={6}
            />
          </div>
        );

      case 8:
        return (
          <div className="space-y-2">
            <Label htmlFor="documentacaoObrigatoria">Documentação Obrigatória Afixada</Label>
            <Textarea
              id="documentacaoObrigatoria"
              value={formData.documentacaoObrigatoria}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  documentacaoObrigatoria: e.target.value,
                })
              }
              placeholder="Verificar afixação: ASAE, Horário, Férias, Contactos Úteis, Seguro, Preços Escovas, Preço Mão Obra."
              rows={6}
            />
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <Label>Reunião Quinzenal</Label>
            <RadioGroup
              value={formData.reuniaoQuinzenal?.toString()}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  reuniaoQuinzenal: value === "true",
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="sim" />
                <Label htmlFor="sim" className="cursor-pointer">
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="nao" />
                <Label htmlFor="nao" className="cursor-pointer">
                  Não
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resumoSupervisao">Resumo da Supervisão</Label>
              <Textarea
                id="resumoSupervisao"
                value={formData.resumoSupervisao}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    resumoSupervisao: e.target.value,
                  })
                }
                placeholder="Escreva as instruções adequadas à supervisão realizada."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="colaboradoresPresentes">Colaboradores Presentes</Label>
              <Textarea
                id="colaboradoresPresentes"
                value={formData.colaboradoresPresentes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    colaboradoresPresentes: e.target.value,
                  })
                }
                placeholder="Nome dos colaboradores presentes durante a supervisão."
                rows={4}
              />
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Pendentes</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPendente}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Items a serem revistos na próxima visita
            </p>
            <div className="space-y-2">
              {pendentes.map((pendente, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={pendente}
                    onChange={(e) =>
                      handlePendenteChange(index, e.target.value)
                    }
                    placeholder={`Pendente ${index + 1}`}
                  />
                  {pendentes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePendente(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório Completo
          </h1>
          <p className="text-muted-foreground">
            Relatório detalhado de supervisão
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{pages[currentPage].title}</CardTitle>
              <span className="text-sm text-muted-foreground">
                Página {currentPage + 1} de {pages.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderPageContent()}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              {currentPage === pages.length - 1 ? (
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Relatório
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  Seguinte
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
