import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);
  
  const result = await db.execute(sql`
    SELECT id, nome, loja, ano, totalAprovados, totalNaoAprovados, totalFaltas, dias
    FROM ferias_colaboradores
    WHERE LOWER(nome) LIKE '%ana filipa%moreira%'
    ORDER BY ano DESC
    LIMIT 5
  `);
  
  const rows = result[0];
  
  if (!rows || rows.length === 0) {
    console.log('Nenhum registo encontrado para Ana Filipa Campos Moreira');
    await connection.end();
    return;
  }
  
  for (const row of rows) {
    console.log(`\n=== ${row.nome} | Loja: ${row.loja} | Ano: ${row.ano} ===`);
    console.log(`Dias aprovados: ${row.totalAprovados}, Por aprovar: ${row.totalNaoAprovados}, Faltas: ${row.totalFaltas}`);
    
    if (row.dias) {
      const dias = typeof row.dias === 'string' ? JSON.parse(row.dias) : row.dias;
      
      // Extrair períodos por aprovar
      const ano = row.ano || new Date().getFullYear();
      const totalDias = (ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)) ? 366 : 365;
      
      const diaParaData = (diaAno) => {
        const d = new Date(ano, 0, diaAno);
        return `${d.getDate()}/${d.getMonth() + 1}/${ano}`;
      };
      
      // Listar todos os dias por aprovar
      const diasPorAprovar = [];
      const diasAprovados = [];
      const diasFaltas = [];
      
      for (let d = 1; d <= totalDias; d++) {
        const estado = dias[String(d)];
        if (estado === 'nao_aprovado') diasPorAprovar.push(d);
        if (estado === 'aprovado') diasAprovados.push(d);
        if (estado === 'falta') diasFaltas.push(d);
      }
      
      // Converter para períodos legíveis
      const formatarPeriodos = (listaDias) => {
        if (listaDias.length === 0) return 'Nenhum';
        const periodos = [];
        let inicio = listaDias[0];
        let anterior = listaDias[0];
        
        for (let i = 1; i <= listaDias.length; i++) {
          if (i < listaDias.length && listaDias[i] === anterior + 1) {
            anterior = listaDias[i];
          } else {
            if (inicio === anterior) {
              periodos.push(diaParaData(inicio));
            } else {
              periodos.push(`${diaParaData(inicio)} a ${diaParaData(anterior)}`);
            }
            if (i < listaDias.length) {
              inicio = listaDias[i];
              anterior = listaDias[i];
            }
          }
        }
        return periodos.join(', ');
      };
      
      console.log(`\n📋 DIAS POR APROVAR (${diasPorAprovar.length} dias):`);
      console.log(formatarPeriodos(diasPorAprovar));
      
      console.log(`\n✅ DIAS APROVADOS (${diasAprovados.length} dias):`);
      console.log(formatarPeriodos(diasAprovados));
      
      if (diasFaltas.length > 0) {
        console.log(`\n❌ FALTAS (${diasFaltas.length} dias):`);
        console.log(formatarPeriodos(diasFaltas));
      }
    }
  }
  
  await connection.end();
}

main().catch(e => console.error(e));
