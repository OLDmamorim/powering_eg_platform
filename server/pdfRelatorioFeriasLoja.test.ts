import { describe, it, expect } from 'vitest';
import { gerarPDFRelatorioFeriasLoja } from './pdfRelatorioFeriasLoja';
import type { RelatorioLoja } from './feriasRelatorioLojaService';

const mockRelatorio: RelatorioLoja = {
  loja: 'FAMALICÃO',
  totalColaboradores: 3,
  analiseColaboradores: [
    {
      nome: 'JOÃO SILVA',
      totalPedidos: 22,
      diasP1: 3, diasP2: 14, diasP3: 5, diasP4: 0,
      pctP1: 14, pctP2: 64, pctP3: 23, pctP4: 0,
      corP1: 'red', corP2: 'red', corP3: 'green', corP4: 'green',
      problemas: ['1.º período: apenas 3 dias (14%) — mínimo obrigatório: 5 dias', '2.º período: 14 dias (64%) — EXCEDE máximo de 10 dias (+4)'],
      sugestoes: ['Redistribuir 2 dias para Jan-Mai', 'Retirar 4 dias de Jun-Set'],
      gravidade: 'critico',
    },
    {
      nome: 'MARIA SANTOS',
      totalPedidos: 22,
      diasP1: 5, diasP2: 10, diasP3: 5, diasP4: 2,
      pctP1: 23, pctP2: 45, pctP3: 23, pctP4: 9,
      corP1: 'green', corP2: 'green', corP3: 'green', corP4: 'green',
      problemas: [],
      sugestoes: [],
      gravidade: 'conforme',
    },
    {
      nome: 'PEDRO COSTA',
      totalPedidos: 0,
      diasP1: 0, diasP2: 0, diasP3: 0, diasP4: 0,
      pctP1: 0, pctP2: 0, pctP3: 0, pctP4: 0,
      corP1: 'green', corP2: 'green', corP3: 'green', corP4: 'green',
      problemas: ['SEM FÉRIAS PEDIDAS — data-limite era 28 de Fevereiro'],
      sugestoes: ['Pedir urgentemente os 22 dias'],
      gravidade: 'critico',
    },
  ],
  sobreposicoes: [
    { data: '15/7', colaboradores: ['JOÃO SILVA', 'MARIA SANTOS'] },
    { data: '16/7', colaboradores: ['JOÃO SILVA', 'MARIA SANTOS'] },
  ],
  resumo: {
    conformes: 1,
    comAvisos: 0,
    criticos: 2,
    totalDiasPedidos: 44,
    mediaDiasPedidos: 14.7,
    semFeriasPedidas: 1,
    comExcessoP2: 1,
    comDeficitP1: 1,
    totalSobreposicoes: 2,
  },
  recomendacoesIA: `## 📋 Resumo da Loja
A loja FAMALICÃO tem 3 colaboradores.

## 🔄 Plano de Redistribuição

### JOÃO SILVA
- **Problema**: 14 dias no 2.º período (64%) — EXCEDE máximo de 10 dias
- **Ação**: Retirar 4 dias de Jun-Set e colocar em Jan-Mai

## ✅ Próximos Passos
1. Contactar Pedro Costa urgentemente
2. Redistribuir dias de João Silva`,
};

describe('gerarPDFRelatorioFeriasLoja — Nova Estrutura', () => {
  it('deve gerar um buffer PDF válido', async () => {
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(mockRelatorio, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('deve gerar PDF sem sobreposições', async () => {
    const relSemSobreposicoes: RelatorioLoja = {
      ...mockRelatorio,
      sobreposicoes: [],
      resumo: { ...mockRelatorio.resumo, totalSobreposicoes: 0 },
    };
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(relSemSobreposicoes, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('deve gerar PDF com todos conformes', async () => {
    const relConformes: RelatorioLoja = {
      loja: 'TESTE',
      totalColaboradores: 1,
      analiseColaboradores: [mockRelatorio.analiseColaboradores[1]],
      sobreposicoes: [],
      resumo: {
        conformes: 1, comAvisos: 0, criticos: 0,
        totalDiasPedidos: 22, mediaDiasPedidos: 22,
        semFeriasPedidas: 0, comExcessoP2: 0, comDeficitP1: 0, totalSobreposicoes: 0,
      },
      recomendacoesIA: '## ✅ Todos conformes.',
    };
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(relConformes, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('deve gerar PDF com muitos colaboradores (paginação)', async () => {
    const muitosColabs = Array.from({ length: 20 }, (_, i) => ({
      ...mockRelatorio.analiseColaboradores[0],
      nome: `COLABORADOR ${i + 1}`,
    }));
    const relGrande: RelatorioLoja = {
      ...mockRelatorio,
      totalColaboradores: 20,
      analiseColaboradores: muitosColabs,
    };
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(relGrande, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(5000);
  });

  it('deve gerar PDF sem recomendações IA', async () => {
    const relSemIA: RelatorioLoja = {
      ...mockRelatorio,
      recomendacoesIA: '',
    };
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(relSemIA, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });
});
