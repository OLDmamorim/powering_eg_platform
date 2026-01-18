import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import type { ChartConfiguration } from 'chart.js';

const width = 500;
const height = 250;

const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
  width, 
  height,
  backgroundColour: 'white'
});

interface EvolucaoItem {
  mes: number;
  ano: number;
  totalServicos: number | null;
  objetivoMensal: number | null;
  qtdReparacoes: number | null;
}

const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Cores
const azul = 'rgba(59, 130, 246, 0.8)';
const roxo = 'rgba(139, 92, 246, 0.8)';
const verde = 'rgba(16, 185, 129, 0.8)';
const vermelho = 'rgba(239, 68, 68, 0.8)';
const laranja = 'rgba(249, 115, 22, 0.8)';

export async function gerarGraficoServicosVsObjetivo(evolucao: EvolucaoItem[]): Promise<Buffer> {
  const labels = evolucao.map(e => `${mesesNomes[e.mes - 1]}/${String(e.ano).slice(2)}`);
  const servicos = evolucao.map(e => e.totalServicos || 0);
  const objetivos = evolucao.map(e => e.objetivoMensal || 0);

  const configuration: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Serviços',
          data: servicos,
          backgroundColor: azul,
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          barPercentage: 0.7,
        },
        {
          label: 'Objetivo',
          data: objetivos,
          backgroundColor: roxo,
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 1,
          barPercentage: 0.7,
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Serviços vs Objetivo (Últimos 6 Meses)',
          font: { size: 14, weight: 'bold' },
          color: '#374151'
        },
        legend: {
          position: 'bottom',
          labels: { color: '#374151' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(0,0,0,0.1)' }
        },
        x: {
          ticks: { color: '#6b7280' },
          grid: { display: false }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

export async function gerarGraficoDesvio(evolucao: EvolucaoItem[]): Promise<Buffer> {
  const labels = evolucao.map(e => `${mesesNomes[e.mes - 1]}/${String(e.ano).slice(2)}`);
  const desvios = evolucao.map(e => {
    const servicos = e.totalServicos || 0;
    const objetivo = e.objetivoMensal || 0;
    return objetivo > 0 ? ((servicos - objetivo) / objetivo * 100) : 0;
  });

  const backgroundColors = desvios.map(d => d >= 0 ? verde : vermelho);

  const configuration: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Desvio %',
          data: desvios,
          backgroundColor: backgroundColors,
          borderColor: desvios.map(d => d >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'),
          borderWidth: 1,
          barPercentage: 0.6,
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Desvio do Objetivo (%)',
          font: { size: 14, weight: 'bold' },
          color: '#374151'
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          ticks: { 
            color: '#6b7280',
            callback: function(value) {
              return value + '%';
            }
          },
          grid: { color: 'rgba(0,0,0,0.1)' }
        },
        x: {
          ticks: { color: '#6b7280' },
          grid: { display: false }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

export async function gerarGraficoTaxaReparacao(evolucao: EvolucaoItem[]): Promise<Buffer> {
  const labels = evolucao.map(e => `${mesesNomes[e.mes - 1]}/${String(e.ano).slice(2)}`);
  const taxas = evolucao.map(e => {
    const servicos = e.totalServicos || 0;
    const reparacoes = e.qtdReparacoes || 0;
    return servicos > 0 ? (reparacoes / servicos * 100) : 0;
  });

  // Linha de objetivo 22%
  const objetivoLinha = evolucao.map(() => 22);

  const configuration: ChartConfiguration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Taxa Reparação',
          data: taxas,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: taxas.map(t => t >= 22 ? verde : laranja),
          pointBorderColor: taxas.map(t => t >= 22 ? verde : laranja),
          pointRadius: 6,
        },
        {
          label: 'Objetivo (22%)',
          data: objetivoLinha,
          borderColor: 'rgba(239, 68, 68, 0.8)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Taxa de Reparação (%)',
          font: { size: 14, weight: 'bold' },
          color: '#374151'
        },
        legend: {
          position: 'bottom',
          labels: { color: '#374151' }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 35,
          ticks: { 
            color: '#6b7280',
            callback: function(value) {
              return value + '%';
            }
          },
          grid: { color: 'rgba(0,0,0,0.1)' }
        },
        x: {
          ticks: { color: '#6b7280' },
          grid: { display: false }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}


interface ComplementaresData {
  escovasQtd: number;
  polimentoQtd: number;
  tratamentoQtd: number;
  lavagensTotal: number;
  outrosQtd: number;
}

// Cores para gráfico de complementares
const coresComplementares = [
  'rgba(59, 130, 246, 0.8)',   // Azul - Escovas
  'rgba(139, 92, 246, 0.8)',  // Roxo - Polimento
  'rgba(16, 185, 129, 0.8)',  // Verde - Tratamento
  'rgba(249, 115, 22, 0.8)',  // Laranja - Lavagens
  'rgba(107, 114, 128, 0.8)', // Cinza - Outros
];

const borderComplementares = [
  'rgba(59, 130, 246, 1)',
  'rgba(139, 92, 246, 1)',
  'rgba(16, 185, 129, 1)',
  'rgba(249, 115, 22, 1)',
  'rgba(107, 114, 128, 1)',
];

export async function gerarGraficoComplementares(complementares: ComplementaresData): Promise<Buffer> {
  const labels = ['Escovas', 'Polimento', 'Tratamento', 'Lavagens', 'Outros'];
  const data = [
    complementares.escovasQtd,
    complementares.polimentoQtd,
    complementares.tratamentoQtd,
    complementares.lavagensTotal,
    complementares.outrosQtd,
  ];

  const total = data.reduce((a, b) => a + b, 0);

  const configuration: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: coresComplementares,
          borderColor: borderComplementares,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: `Vendas Complementares (Total: ${total})`,
          font: { size: 14, weight: 'bold' },
          color: '#374151'
        },
        legend: {
          position: 'right',
          labels: { 
            color: '#374151',
            generateLabels: function(chart) {
              const datasets = chart.data.datasets;
              return chart.data.labels?.map((label, i) => {
                const value = datasets[0].data[i] as number;
                return {
                  text: `${label}: ${value}`,
                  fillStyle: coresComplementares[i],
                  strokeStyle: borderComplementares[i],
                  lineWidth: 2,
                  hidden: false,
                  index: i
                };
              }) || [];
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return `${context.label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

export async function gerarGraficoBarrasComplementares(complementares: ComplementaresData): Promise<Buffer> {
  const labels = ['Escovas', 'Polimento', 'Tratamento', 'Lavagens', 'Outros'];
  const data = [
    complementares.escovasQtd,
    complementares.polimentoQtd,
    complementares.tratamentoQtd,
    complementares.lavagensTotal,
    complementares.outrosQtd,
  ];

  const configuration: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Quantidade',
          data,
          backgroundColor: coresComplementares,
          borderColor: borderComplementares,
          borderWidth: 1,
          barPercentage: 0.7,
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Vendas Complementares por Categoria',
          font: { size: 14, weight: 'bold' },
          color: '#374151'
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(0,0,0,0.1)' }
        },
        y: {
          ticks: { color: '#6b7280' },
          grid: { display: false }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}
