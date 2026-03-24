import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
vi.mock('./db', () => ({
  getAllGestores: vi.fn(),
  getGestorByUserId: vi.fn(),
  getLojasByGestorId: vi.fn(),
  getColaboradoresByLojaId: vi.fn(),
  getColaboradoresVolantesByGestorId: vi.fn(),
  getAllColaboradoresByGestorId: vi.fn(),
  registarEnvioRH: vi.fn(),
  updateGestorEnvioRH: vi.fn(),
}));

// Mock emailService
vi.mock('./emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock pdfRelacaoRH
vi.mock('./pdfRelacaoRH', () => ({
  gerarPDFRelacaoRH: vi.fn().mockResolvedValue(Buffer.from('fake-pdf')),
}));

import { enviarRelacaoRHAutomatico } from './envioAutomaticoRH';
import * as db from './db';
import { sendEmail } from './emailService';
import { gerarPDFRelacaoRH } from './pdfRelacaoRH';

describe('envioAutomaticoRH', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar resultado vazio quando não há gestores', async () => {
    vi.mocked(db.getAllGestores).mockResolvedValue([]);
    
    const resultado = await enviarRelacaoRHAutomatico();
    
    expect(resultado.total).toBe(0);
    expect(resultado.enviados).toBe(0);
    expect(resultado.erros).toHaveLength(0);
  });

  it('deve enviar relação para cada gestor com colaboradores', async () => {
    vi.mocked(db.getAllGestores).mockResolvedValue([
      { id: 1, userId: 100, nome: 'Marco Amorim', email: 'mamorim@expressglass.pt' }
    ]);
    vi.mocked(db.getGestorByUserId).mockResolvedValue({
      id: 1, userId: 100, lastEnvioRH: null
    } as any);
    vi.mocked(db.getLojasByGestorId).mockResolvedValue([
      { id: 10, nome: 'Loja Braga', numeroLoja: 30, numColaboradores: 3 } as any
    ]);
    vi.mocked(db.getColaboradoresByLojaId).mockResolvedValue([
      { nome: 'João', codigoColaborador: '001', cargo: 'tecnico', tipo: 'loja' } as any,
      { nome: 'Ana', codigoColaborador: '002', cargo: 'administrativo', tipo: 'loja' } as any,
    ]);
    vi.mocked(db.getColaboradoresVolantesByGestorId).mockResolvedValue([]);
    vi.mocked(db.getAllColaboradoresByGestorId).mockResolvedValue([]);
    vi.mocked(sendEmail).mockResolvedValue(true);
    vi.mocked(db.registarEnvioRH).mockResolvedValue({} as any);
    vi.mocked(db.updateGestorEnvioRH).mockResolvedValue(undefined);

    const resultado = await enviarRelacaoRHAutomatico();

    expect(resultado.total).toBe(1);
    expect(resultado.enviados).toBe(1);
    expect(resultado.erros).toHaveLength(0);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'recursoshumanos@expressglass.pt',
      subject: expect.stringContaining('Marco Amorim'),
      attachments: expect.arrayContaining([
        expect.objectContaining({
          contentType: 'application/pdf'
        })
      ])
    }));
    expect(gerarPDFRelacaoRH).toHaveBeenCalled();
    expect(db.registarEnvioRH).toHaveBeenCalled();
    expect(db.updateGestorEnvioRH).toHaveBeenCalledWith(1);
  });

  it('deve ignorar gestor que já enviou este mês', async () => {
    const agora = new Date();
    vi.mocked(db.getAllGestores).mockResolvedValue([
      { id: 1, userId: 100, nome: 'Marco Amorim', email: 'mamorim@expressglass.pt' }
    ]);
    vi.mocked(db.getGestorByUserId).mockResolvedValue({
      id: 1, userId: 100, lastEnvioRH: agora // já enviou este mês
    } as any);

    const resultado = await enviarRelacaoRHAutomatico();

    expect(resultado.total).toBe(1);
    expect(resultado.enviados).toBe(0);
    expect(resultado.detalhes[0]).toContain('já enviou este mês');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('deve ignorar gestor sem colaboradores', async () => {
    vi.mocked(db.getAllGestores).mockResolvedValue([
      { id: 2, userId: 200, nome: 'Rui Adriao', email: 'rui@expressglass.pt' }
    ]);
    vi.mocked(db.getGestorByUserId).mockResolvedValue({
      id: 2, userId: 200, lastEnvioRH: null
    } as any);
    vi.mocked(db.getLojasByGestorId).mockResolvedValue([]);
    vi.mocked(db.getColaboradoresVolantesByGestorId).mockResolvedValue([]);
    vi.mocked(db.getAllColaboradoresByGestorId).mockResolvedValue([]);

    const resultado = await enviarRelacaoRHAutomatico();

    expect(resultado.total).toBe(1);
    expect(resultado.enviados).toBe(0);
    expect(resultado.detalhes[0]).toContain('sem colaboradores');
  });
});
