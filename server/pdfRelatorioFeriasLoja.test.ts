import { describe, it, expect } from 'vitest';
import { gerarPDFRelatorioFeriasLoja } from './pdfRelatorioFeriasLoja';

const mockRelatorio = {
  loja: 'FAMALICÃO',
  totalColaboradores: 3,
  analiseColaboradores: [
    {
      nome: 'JOÃO SILVA',
      totalAprovados: 22,
      totalNaoAprovados: 0,
      totalMarcados: 22,
      janMai: 6,
      junSet: 9,
      outNov: 5,
      dez: 2,
      problemas: [],
      sugestoes: [],
      corJanMai: 'green' as const,
      corJunSet: 'green' as const,
      corDez: 'green' as const,
      corTotal: 'green' as const,
      statusGeral: 'green' as const,
    },
    {
      nome: 'MARIA SANTOS',
      totalAprovados: 18,
      totalNaoAprovados: 2,
      totalMarcados: 20,
      janMai: 2,
      junSet: 12,
      outNov: 3,
      dez: 1,
      problemas: [
        'Jan-Mai: apenas 2 dias (mínimo obrigatório: 5)',
        'Jun-Set: 12 dias (máximo permitido: 10) — EXCESSO DE 2 DIAS',
        'Apenas 18 dias aprovados de 22 — subsídio de férias em risco',
      ],
      sugestoes: [
        'Mover 3 dia(s) de outro período para Jan-Mai',
        'Mover 2 dia(s) de Jun-Set para Jan-Mai ou Out-Nov',
        'Aprovar os 2 dias pendentes para completar os 22 dias',
      ],
      corJanMai: 'red' as const,
      corJunSet: 'yellow' as const,
      corDez: 'green' as const,
      corTotal: 'yellow' as const,
      statusGeral: 'red' as const,
    },
    {
      nome: 'PEDRO COSTA',
      totalAprovados: 0,
      totalNaoAprovados: 0,
      totalMarcados: 0,
      janMai: 0,
      junSet: 0,
      outNov: 0,
      dez: 0,
      problemas: ['SEM FÉRIAS MARCADAS — data-limite era 28 de Fevereiro'],
      sugestoes: ['Marcar urgentemente os 22 dias: distribuir ≥5 dias em Jan-Mai, ≤10 dias em Jun-Set, restantes em Out-Nov'],
      corJanMai: 'red' as const,
      corJunSet: 'green' as const,
      corDez: 'green' as const,
      corTotal: 'red' as const,
      statusGeral: 'red' as const,
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
    totalDiasAprovados: 40,
    mediaAprovados: 13.3,
    semFeriasMarcadas: 1,
    subsidioEmRisco: 1,
  },
  recomendacoesIA: `## 📋 Resumo da Loja
A loja FAMALICÃO tem 3 colaboradores, dos quais apenas 1 está conforme.

## 🔄 Plano de Redistribuição

### MARIA SANTOS
- **Problema**: Apenas 2 dias em Jan-Mai (mínimo: 5) e 12 dias em Jun-Set (máximo: 10)
- **Ação**: Mover 2 dias de Jun-Set para Jan-Mai (ficaria com 4 em Jan-Mai e 10 em Jun-Set)
- Aprovar os 2 dias pendentes

### PEDRO COSTA
- **Problema**: SEM FÉRIAS MARCADAS
- **Ação**: Marcar urgentemente 22 dias

## ⚠️ Sobreposições a Resolver
- 15/7 e 16/7: João Silva + Maria Santos — sugerir que Maria mova para outra data

## ✅ Próximos Passos
1. Contactar Pedro Costa urgentemente
2. Redistribuir dias de Maria Santos
3. Resolver sobreposições de Julho`,
};

describe('gerarPDFRelatorioFeriasLoja', () => {
  it('deve gerar um buffer PDF válido', async () => {
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(mockRelatorio, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // Verificar assinatura PDF
    const header = pdfBuffer.subarray(0, 5).toString();
    expect(header).toBe('%PDF-');
  });

  it('deve gerar PDF mesmo com relatório sem sobreposições', async () => {
    const relSemSobreposicoes = {
      ...mockRelatorio,
      sobreposicoes: [],
    };
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(relSemSobreposicoes, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('deve gerar PDF com relatório onde todos estão conformes', async () => {
    const relConformes = {
      ...mockRelatorio,
      analiseColaboradores: [mockRelatorio.analiseColaboradores[0]],
      sobreposicoes: [],
      resumo: {
        conformes: 1,
        comAvisos: 0,
        criticos: 0,
        totalDiasAprovados: 22,
        mediaAprovados: 22,
        semFeriasMarcadas: 0,
        subsidioEmRisco: 0,
      },
      recomendacoesIA: '## ✅ Resumo\nTodos os colaboradores estão conformes.',
    };
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(relConformes, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    const header = pdfBuffer.subarray(0, 5).toString();
    expect(header).toBe('%PDF-');
  });

  it('deve gerar PDF com muitos colaboradores (paginação)', async () => {
    const muitosColabs = Array.from({ length: 20 }, (_, i) => ({
      ...mockRelatorio.analiseColaboradores[1],
      nome: `COLABORADOR ${i + 1}`,
    }));
    const relGrande = {
      ...mockRelatorio,
      totalColaboradores: 20,
      analiseColaboradores: muitosColabs,
    };
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(relGrande, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    // Com 20 colaboradores com problemas, deve ter mais de uma página
    expect(pdfBuffer.length).toBeGreaterThan(5000);
  });

  it('deve gerar PDF sem recomendações IA', async () => {
    const relSemIA = {
      ...mockRelatorio,
      recomendacoesIA: '',
    };
    const pdfBuffer = await gerarPDFRelatorioFeriasLoja(relSemIA, 2026);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });
});
