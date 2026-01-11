/**
 * Dados fictícios para o modo de demonstração
 * Estes dados substituem os dados reais quando o modo demo está ativo
 */

// Lojas fictícias
export const demoLojas = [
  { id: 1, nome: "Lisboa Centro", email: "lisboa.centro@demo.pt", contacto: "211234567", gestorId: 1, gestorNome: "Ana Silva" },
  { id: 2, nome: "Porto Boavista", email: "porto.boavista@demo.pt", contacto: "221234567", gestorId: 1, gestorNome: "Ana Silva" },
  { id: 3, nome: "Coimbra Shopping", email: "coimbra.shopping@demo.pt", contacto: "231234567", gestorId: 2, gestorNome: "Carlos Santos" },
  { id: 4, nome: "Braga Retail Park", email: "braga.retail@demo.pt", contacto: "251234567", gestorId: 2, gestorNome: "Carlos Santos" },
  { id: 5, nome: "Faro Marina", email: "faro.marina@demo.pt", contacto: "281234567", gestorId: 3, gestorNome: "Maria Costa" },
  { id: 6, nome: "Setúbal Centro", email: "setubal.centro@demo.pt", contacto: "261234567", gestorId: 3, gestorNome: "Maria Costa" },
  { id: 7, nome: "Aveiro Fórum", email: "aveiro.forum@demo.pt", contacto: "241234567", gestorId: 4, gestorNome: "João Ferreira" },
  { id: 8, nome: "Viseu Palácio", email: "viseu.palacio@demo.pt", contacto: "231234568", gestorId: 4, gestorNome: "João Ferreira" },
  { id: 9, nome: "Leiria Shopping", email: "leiria.shopping@demo.pt", contacto: "241234568", gestorId: 5, gestorNome: "Sofia Martins" },
  { id: 10, nome: "Évora Centro", email: "evora.centro@demo.pt", contacto: "261234568", gestorId: 5, gestorNome: "Sofia Martins" },
];

// Gestores fictícios
export const demoGestores = [
  { id: 1, nome: "Ana Silva", email: "ana.silva@demo.pt", role: "gestor", lojas: 2 },
  { id: 2, nome: "Carlos Santos", email: "carlos.santos@demo.pt", role: "gestor", lojas: 2 },
  { id: 3, nome: "Maria Costa", email: "maria.costa@demo.pt", role: "gestor", lojas: 2 },
  { id: 4, nome: "João Ferreira", email: "joao.ferreira@demo.pt", role: "gestor", lojas: 2 },
  { id: 5, nome: "Sofia Martins", email: "sofia.martins@demo.pt", role: "gestor", lojas: 2 },
];

// Resultados mensais fictícios (últimos 6 meses)
const mesesAnteriores = () => {
  const meses = [];
  const hoje = new Date();
  for (let i = 5; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ mes: data.getMonth() + 1, ano: data.getFullYear() });
  }
  return meses;
};

export const demoResultadosMensais = mesesAnteriores().flatMap(({ mes, ano }) =>
  demoLojas.map((loja, idx) => ({
    id: mes * 100 + idx,
    lojaId: loja.id,
    lojaNome: loja.nome,
    mes,
    ano,
    zona: ["Norte", "Centro", "Sul"][idx % 3],
    totalServicosFaturados: Math.floor(80 + Math.random() * 120),
    numServDiariosPorColaborador: Math.round((2 + Math.random() * 3) * 10) / 10,
    numColaboradoresLoja: Math.floor(3 + Math.random() * 5),
    objetivoAoDiaActual: Math.floor(70 + Math.random() * 50),
    objetivoMensal: Math.floor(150 + Math.random() * 100),
    servDiariosAcumuladosVsObj: Math.round((0.8 + Math.random() * 0.4) * 100) / 100,
    vsObjDia: Math.round((-15 + Math.random() * 40) * 10) / 10,
    vsObjMes: Math.round((-10 + Math.random() * 30) * 10) / 10,
    taxaReparacaoQIV: Math.round((15 + Math.random() * 15) * 10) / 10,
    qtdReparacoes: Math.floor(20 + Math.random() * 40),
    qtdParaBrisas: Math.floor(50 + Math.random() * 80),
    qtdReparacoesEmFaltaParaTaxa22: Math.floor(Math.random() * 10),
  }))
);

// Estatísticas do dashboard
export const demoEstatisticas = {
  totalLojas: demoLojas.length,
  totalGestores: demoGestores.length,
  totalRelatoriosLivres: 45,
  totalRelatoriosCompletos: 12,
  totalPendentes: 23,
  pendentesResolvidos: 18,
  alertasPendentes: 3,
};

// Relatórios livres fictícios
export const demoRelatoriosLivres = [
  {
    id: 1,
    lojaId: 1,
    lojaNome: "Lisboa Centro",
    gestorId: 1,
    gestorNome: "Ana Silva",
    dataVisita: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    descricao: "Visita de rotina. Loja em bom estado geral. Equipa motivada e atenciosa com os clientes. Stock de vidros bem organizado.",
    categoria: "Visita Regular",
    estadoAcompanhamento: "Tratado",
    fotos: [],
  },
  {
    id: 2,
    lojaId: 2,
    lojaNome: "Porto Boavista",
    gestorId: 1,
    gestorNome: "Ana Silva",
    dataVisita: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    descricao: "Verificação de EPIs. Todos os colaboradores com equipamento adequado. Sugerido reforço de stock de luvas.",
    categoria: "Segurança",
    estadoAcompanhamento: "Acompanhar",
    fotos: [],
  },
  {
    id: 3,
    lojaId: 3,
    lojaNome: "Coimbra Shopping",
    gestorId: 2,
    gestorNome: "Carlos Santos",
    dataVisita: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    descricao: "Reunião com equipa sobre objetivos mensais. Definidas estratégias para aumentar vendas de escovas.",
    categoria: "Reunião",
    estadoAcompanhamento: "Em Tratamento",
    fotos: [],
  },
];

// Relatórios completos fictícios
export const demoRelatoriosCompletos = [
  {
    id: 1,
    lojaId: 4,
    lojaNome: "Braga Retail Park",
    gestorId: 2,
    gestorNome: "Carlos Santos",
    dataVisita: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    resumoSupervisao: "Supervisão completa realizada. Loja apresenta bom desempenho geral com algumas áreas de melhoria identificadas.",
    pontosPositivos: "Equipa coesa e motivada\nBom atendimento ao cliente\nStock bem organizado",
    pontosNegativos: "Falta de alguns consumíveis\nSinalética exterior precisa de manutenção",
    fotos: [],
  },
  {
    id: 2,
    lojaId: 5,
    lojaNome: "Faro Marina",
    gestorId: 3,
    gestorNome: "Maria Costa",
    dataVisita: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    resumoSupervisao: "Visita de supervisão trimestral. Loja com excelente apresentação e resultados acima do objetivo.",
    pontosPositivos: "Resultados acima do objetivo\nExcelente apresentação da loja\nEquipa proativa",
    pontosNegativos: "Necessário atualizar documentação de formação",
    fotos: [],
  },
];

// Pendentes fictícios
export const demoPendentes = [
  { id: 1, lojaId: 1, lojaNome: "Lisboa Centro", descricao: "Repor stock de escovas", resolvido: false, dataCriacao: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 2, lojaId: 2, lojaNome: "Porto Boavista", descricao: "Verificar ar condicionado", resolvido: false, dataCriacao: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 3, lojaId: 3, lojaNome: "Coimbra Shopping", descricao: "Atualizar preçário", resolvido: true, dataCriacao: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 4, lojaId: 4, lojaNome: "Braga Retail Park", descricao: "Reparar sinalética exterior", resolvido: false, dataCriacao: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 5, lojaId: 5, lojaNome: "Faro Marina", descricao: "Encomendar fardas novas", resolvido: false, dataCriacao: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
];

// Alertas fictícios
export const demoAlertas = [
  { id: 1, lojaId: 6, lojaNome: "Setúbal Centro", tipo: "pontos_negativos", mensagem: "3 pontos negativos consecutivos", estado: "pendente", dataCriacao: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 2, lojaId: 7, lojaNome: "Aveiro Fórum", tipo: "sem_visita", mensagem: "Sem visita há mais de 30 dias", estado: "pendente", dataCriacao: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 3, lojaId: 8, lojaNome: "Viseu Palácio", tipo: "pendente_antigo", mensagem: "Pendente há mais de 15 dias", estado: "resolvido", dataCriacao: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
];

// Vendas complementares fictícias
export const demoVendasComplementares = mesesAnteriores().flatMap(({ mes, ano }) =>
  demoLojas.map((loja, idx) => ({
    id: mes * 100 + idx,
    lojaId: loja.id,
    lojaNome: loja.nome,
    mes,
    ano,
    escovas: Math.floor(5 + Math.random() * 20),
    polimento: Math.floor(2 + Math.random() * 10),
    peliculas: Math.floor(1 + Math.random() * 5),
    lavagens: Math.floor(3 + Math.random() * 15),
    percentagemEscovas: Math.round((5 + Math.random() * 10) * 10) / 10,
  }))
);

// Totais globais fictícios
export const demoTotaisGlobais = {
  totalServicos: 1850,
  totalObjetivo: 1700,
  taxaReparacaoMedia: 22.5,
  lojasAcimaObjetivo: 7,
  totalLojas: 10,
  percentagemEscovasMedia: 8.2,
};

// Atividade recente fictícia
export const demoAtividadeRecente = [
  { id: 1, tipo: "relatorio_livre", descricao: "Relatório livre criado para Lisboa Centro", autor: "Ana Silva", createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
  { id: 2, tipo: "pendente_resolvido", descricao: "Pendente resolvido em Porto Boavista", autor: "Ana Silva", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  { id: 3, tipo: "relatorio_completo", descricao: "Supervisão completa em Braga Retail Park", autor: "Carlos Santos", createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  { id: 4, tipo: "alerta", descricao: "Alerta gerado para Setúbal Centro", autor: "Sistema", createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
  { id: 5, tipo: "relatorio_livre", descricao: "Relatório livre criado para Coimbra Shopping", autor: "Carlos Santos", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
];

// Utilizador demo
export const demoUser = {
  id: 999,
  name: "Administrador Demo",
  email: "admin@demo.pt",
  role: "admin" as const,
  openId: "demo-user",
};

// Função para verificar se está em modo demo
export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('demo') === 'true';
};

// Função para obter URL com modo demo
export const getDemoUrl = (path: string = '/'): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}${path}?demo=true`;
};
