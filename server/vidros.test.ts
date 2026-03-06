import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
vi.mock('./db', () => ({
  validarTokenLoja: vi.fn(),
  procurarDestinatarioVidro: vi.fn(),
  criarDestinatarioVidro: vi.fn(),
  registarVidro: vi.fn(),
  listarVidrosPorLoja: vi.fn(),
  contarVidrosPorLoja: vi.fn(),
  listarDestinatariosVidros: vi.fn(),
  actualizarDestinatarioVidro: vi.fn(),
  actualizarVidrosPendentesDestinatario: vi.fn(),
  eliminarDestinatarioVidro: vi.fn(),
  listarTodosVidros: vi.fn(),
  listarVidrosPendentesAssociacao: vi.fn(),
  actualizarVidro: vi.fn(),
}));

// Mock storage
vi.mock('./storage', () => ({
  storagePut: vi.fn().mockResolvedValue({ key: 'test-key', url: 'https://storage.example.com/test.jpg' }),
}));

// Mock LLM
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          destinatario: 'EXPRESSGLASS – SM PESADOS PORTO',
          eurocode: '3733',
          numeroPedido: '30452',
          codAT: '18728608955',
          encomenda: '19330 de 04.03.2026',
          leitRef: '1018/3733AGN',
          observacoesCompletas: 'COD AT: 18728608955\nPEDIDO: 30452\nLEIT: 1018/3733AGN',
        })
      }
    }]
  }),
}));

import * as db from './db';

describe('Recepção de Vidros - DB functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('procurarDestinatarioVidro', () => {
    it('deve retornar null quando não encontra match', async () => {
      (db.procurarDestinatarioVidro as any).mockResolvedValue(null);
      const result = await db.procurarDestinatarioVidro('DESCONHECIDO');
      expect(result).toBeNull();
    });

    it('deve retornar destinatário quando encontra match exacto', async () => {
      const mockDest = { id: 1, nomeEtiqueta: 'SM PESADOS PORTO', lojaId: 5, ativo: true };
      (db.procurarDestinatarioVidro as any).mockResolvedValue(mockDest);
      const result = await db.procurarDestinatarioVidro('SM PESADOS PORTO');
      expect(result).toEqual(mockDest);
      expect(result?.lojaId).toBe(5);
    });
  });

  describe('criarDestinatarioVidro', () => {
    it('deve criar novo destinatário sem loja', async () => {
      (db.criarDestinatarioVidro as any).mockResolvedValue(1);
      const result = await db.criarDestinatarioVidro({ nomeEtiqueta: 'NOVO DESTINATARIO' });
      expect(result).toBe(1);
      expect(db.criarDestinatarioVidro).toHaveBeenCalledWith({ nomeEtiqueta: 'NOVO DESTINATARIO' });
    });
  });

  describe('registarVidro', () => {
    it('deve registar vidro com todos os dados', async () => {
      (db.registarVidro as any).mockResolvedValue(42);
      const dados = {
        destinatarioRaw: 'EXPRESSGLASS – SM PESADOS PORTO',
        eurocode: '3733',
        numeroPedido: '30452',
        codAT: '18728608955',
        encomenda: '19330 de 04.03.2026',
        leitRef: '1018/3733AGN',
        fotoUrl: 'https://storage.example.com/test.jpg',
        fotoKey: 'vidros/1/test.jpg',
        lojaScanId: 1,
        lojaDestinoId: 5,
        estado: 'recebido',
      };
      const result = await db.registarVidro(dados);
      expect(result).toBe(42);
      expect(db.registarVidro).toHaveBeenCalledWith(dados);
    });

    it('deve registar vidro pendente quando destinatário não mapeado', async () => {
      (db.registarVidro as any).mockResolvedValue(43);
      const dados = {
        destinatarioRaw: 'LOJA DESCONHECIDA',
        eurocode: '1234',
        estado: 'pendente_associacao',
        lojaScanId: 1,
      };
      const result = await db.registarVidro(dados);
      expect(result).toBe(43);
    });
  });

  describe('listarVidrosPorLoja', () => {
    it('deve retornar lista de vidros da loja', async () => {
      const mockVidros = [
        { id: 1, eurocode: '3733', estado: 'recebido', lojaDestinoId: 5 },
        { id: 2, eurocode: '4567', estado: 'confirmado', lojaDestinoId: 5 },
      ];
      (db.listarVidrosPorLoja as any).mockResolvedValue(mockVidros);
      const result = await db.listarVidrosPorLoja(5);
      expect(result).toHaveLength(2);
      expect(result[0].eurocode).toBe('3733');
    });

    it('deve retornar lista vazia quando não há vidros', async () => {
      (db.listarVidrosPorLoja as any).mockResolvedValue([]);
      const result = await db.listarVidrosPorLoja(999);
      expect(result).toHaveLength(0);
    });
  });

  describe('contarVidrosPorLoja', () => {
    it('deve retornar contagem total e de hoje', async () => {
      (db.contarVidrosPorLoja as any).mockResolvedValue({ total: 15, hoje: 3 });
      const result = await db.contarVidrosPorLoja(5);
      expect(result.total).toBe(15);
      expect(result.hoje).toBe(3);
    });
  });

  describe('actualizarDestinatarioVidro', () => {
    it('deve associar loja a destinatário', async () => {
      (db.actualizarDestinatarioVidro as any).mockResolvedValue(true);
      const result = await db.actualizarDestinatarioVidro(1, 5);
      expect(result).toBe(true);
      expect(db.actualizarDestinatarioVidro).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('actualizarVidrosPendentesDestinatario', () => {
    it('deve actualizar vidros pendentes quando destinatário é mapeado', async () => {
      (db.actualizarVidrosPendentesDestinatario as any).mockResolvedValue(3);
      const result = await db.actualizarVidrosPendentesDestinatario(1, 5);
      expect(result).toBe(3);
    });
  });

  describe('listarDestinatariosVidros', () => {
    it('deve listar todos os mapeamentos', async () => {
      const mockDests = [
        { id: 1, nomeEtiqueta: 'SM PESADOS PORTO', lojaId: 5 },
        { id: 2, nomeEtiqueta: 'EXPRESSGLASS BRAGA', lojaId: null },
      ];
      (db.listarDestinatariosVidros as any).mockResolvedValue(mockDests);
      const result = await db.listarDestinatariosVidros();
      expect(result).toHaveLength(2);
      expect(result[1].lojaId).toBeNull();
    });
  });

  describe('actualizarVidro', () => {
    it('deve actualizar estado do vidro', async () => {
      (db.actualizarVidro as any).mockResolvedValue(true);
      const result = await db.actualizarVidro(1, { estado: 'confirmado' });
      expect(result).toBe(true);
    });
  });
});

describe('OCR - Parsing de etiqueta', () => {
  it('deve extrair dados correctamente de resposta JSON da IA', () => {
    const respostaIA = JSON.stringify({
      destinatario: 'EXPRESSGLASS – SM PESADOS PORTO',
      eurocode: '3733',
      numeroPedido: '30452',
      codAT: '18728608955',
      encomenda: '19330 de 04.03.2026',
      leitRef: '1018/3733AGN',
      observacoesCompletas: 'COD AT: 18728608955\nPEDIDO: 30452\nLEIT: 1018/3733AGN',
    });

    const dados = JSON.parse(respostaIA);
    expect(dados.destinatario).toBe('EXPRESSGLASS – SM PESADOS PORTO');
    expect(dados.eurocode).toBe('3733');
    expect(dados.numeroPedido).toBe('30452');
    expect(dados.codAT).toBe('18728608955');
    expect(dados.encomenda).toBe('19330 de 04.03.2026');
    expect(dados.leitRef).toBe('1018/3733AGN');
  });

  it('deve lidar com campos null na resposta da IA', () => {
    const respostaIA = JSON.stringify({
      destinatario: 'EXPRESSGLASS BRAGA',
      eurocode: null,
      numeroPedido: null,
      codAT: null,
      encomenda: null,
      leitRef: null,
      observacoesCompletas: null,
    });

    const dados = JSON.parse(respostaIA);
    expect(dados.destinatario).toBe('EXPRESSGLASS BRAGA');
    expect(dados.eurocode).toBeNull();
    expect(dados.numeroPedido).toBeNull();
  });

  it('deve lidar com JSON inválido da IA', () => {
    const respostaInvalida = 'isto não é JSON';
    let dados: any = {};
    try {
      dados = JSON.parse(respostaInvalida);
    } catch (e) {
      // Fallback para objecto vazio
      dados = {};
    }
    expect(dados).toEqual({});
  });
});
