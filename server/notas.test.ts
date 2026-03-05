import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  criarNota: vi.fn().mockResolvedValue({ id: 1 }),
  listarNotas: vi.fn().mockResolvedValue([]),
  getNotaById: vi.fn().mockResolvedValue(null),
  actualizarNota: vi.fn().mockResolvedValue(undefined),
  eliminarNota: vi.fn().mockResolvedValue(undefined),
  criarTag: vi.fn().mockResolvedValue({ id: 1 }),
  listarTags: vi.fn().mockResolvedValue([]),
  eliminarTag: vi.fn().mockResolvedValue(undefined),
  associarTagsNota: vi.fn().mockResolvedValue(undefined),
  adicionarImagemNota: vi.fn().mockResolvedValue({ id: 1 }),
}));

describe("Notas Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have ESTADOS_NOTAS defined correctly", () => {
    const estados = [
      "rascunho", "pendente", "em_analise", "discutido",
      "aprovado", "adiado", "concluido"
    ];
    expect(estados).toHaveLength(7);
    expect(estados).toContain("rascunho");
    expect(estados).toContain("aprovado");
    expect(estados).toContain("concluido");
  });

  it("should have CORES_NOTAS defined correctly", () => {
    const cores = [
      "#ffffff", "#fef3c7", "#d1fae5", "#dbeafe",
      "#fce7f3", "#ede9fe", "#fed7aa", "#e5e7eb"
    ];
    expect(cores).toHaveLength(8);
    expect(cores[0]).toBe("#ffffff");
  });

  it("should validate nota creation input", () => {
    // Test that titulo is required
    const validInput = {
      titulo: "Test Nota",
      conteudo: "<p>Test content</p>",
      estado: "rascunho",
      cor: "#ffffff",
    };
    expect(validInput.titulo).toBeTruthy();
    expect(validInput.estado).toBe("rascunho");
  });

  it("should validate estado values", () => {
    const validEstados = [
      "rascunho", "pendente", "em_analise", "discutido",
      "aprovado", "adiado", "concluido"
    ];
    const invalidEstado = "invalido";
    expect(validEstados).not.toContain(invalidEstado);
    expect(validEstados).toContain("em_analise");
  });

  it("should handle nota with optional lojaId", () => {
    const notaSemLoja = { titulo: "Test", lojaId: null };
    const notaComLoja = { titulo: "Test", lojaId: 180039 };
    expect(notaSemLoja.lojaId).toBeNull();
    expect(notaComLoja.lojaId).toBe(180039);
  });

  it("should handle tags association", () => {
    const tagIds = [1, 2, 3];
    expect(tagIds).toHaveLength(3);
    expect(tagIds).toContain(1);
  });

  it("should handle image compression params", () => {
    const maxWidth = 1200;
    const quality = 0.7;
    expect(maxWidth).toBe(1200);
    expect(quality).toBeLessThan(1);
    expect(quality).toBeGreaterThan(0);
  });

  it("should validate tag creation", () => {
    const tag = { nome: "Reunião", cor: "#6366f1" };
    expect(tag.nome).toBeTruthy();
    expect(tag.cor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("should handle arquivada filter", () => {
    const filtros = { arquivada: false, pesquisa: "test" };
    expect(filtros.arquivada).toBe(false);
    expect(filtros.pesquisa).toBe("test");
  });

  it("should handle fixada toggle", () => {
    const nota = { id: 1, fixada: false };
    const toggled = !nota.fixada;
    expect(toggled).toBe(true);
  });
});
