import { db } from './server/db.ts';
import { tokensVolante, volantes } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function testAPI() {
  try {
    // Buscar um token ativo
    const tokenResult = await db
      .select()
      .from(tokensVolante)
      .where(eq(tokensVolante.ativo, true))
      .limit(1);
    
    if (tokenResult.length === 0) {
      console.log('Nenhum token ativo encontrado');
      return;
    }
    
    const token = tokenResult[0].token;
    console.log('Token encontrado:', token);
    
    // Testar a API
    const url = `https://3000-ivgtlk1sd0ws3uaof6l7i-1d6524a7.us2.manus.computer/api/trpc/portalVolante.dashboardLoja`;
    const params = new URLSearchParams({
      batch: '1',
      input: JSON.stringify({
        "0": {
          "json": {
            "token": token,
            "lojaId": 1,
            "meses": [{ "mes": 1, "ano": 2026 }]
          }
        }
      })
    });
    
    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    
    console.log('\n=== Resposta da API ===');
    console.log(JSON.stringify(data, null, 2));
    
    const resultado = data[0]?.result?.data?.json;
    if (resultado) {
      console.log('\n=== Taxa de Reparação ===');
      console.log('Valor retornado:', resultado.taxaReparacao);
      console.log('Esperado: ~40.9% (9 reparações / 22 para-brisas)');
      console.log('Errado: ~15.8% (9 reparações / 57 serviços)');
    }
  } catch (error) {
    console.error('Erro:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testAPI();
