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
