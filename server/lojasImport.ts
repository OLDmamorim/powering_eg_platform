import * as db from "./db";

export interface LojaImportRow {
  nome: string;
  email?: string;
}

export interface ImportResult {
  success: boolean;
  row: number;
  loja?: any;
  error?: string;
}

export async function importLojas(rows: LojaImportRow[]): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 porque linha 1 é header e arrays começam em 0
    
    try {
      // Validações
      if (!row.nome || row.nome.trim() === "") {
        results.push({
          success: false,
          row: rowNumber,
          error: "Nome é obrigatório"
        });
        continue;
      }
      
      // Validar email se fornecido
      if (row.email && row.email.trim() !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          results.push({
            success: false,
            row: rowNumber,
            error: "Email inválido"
          });
          continue;
        }
      }
      
      // Criar loja
      const loja = await db.createLoja({
        nome: row.nome.trim(),
        email: row.email?.trim() || undefined,
      });
      
      results.push({
        success: true,
        row: rowNumber,
        loja
      });
      
    } catch (error: any) {
      results.push({
        success: false,
        row: rowNumber,
        error: error.message || "Erro desconhecido"
      });
    }
  }
  
  return results;
}
