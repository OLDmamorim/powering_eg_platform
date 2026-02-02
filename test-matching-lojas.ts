import * as db from "./server/db";

async function testMatchingLojas() {
  // Lista de nomes de lojas do Excel que não estavam a ser encontradas
  const nomesExcel = [
    "Abrantes",
    "Algés",
    "Almada",
    "Amadora",
    "Barcelos",
    "Braga",
    "Braga SM",
    "Caldas",
    "Canelas",
    "Castanheira do Ribatejo",
    "Entroncamento",
    "Famalicão",
    "Famalicão SM",
    "Faro",
    "Faro SM",
    "Feira",
    "Gaia",
    "Gondomar",
    "Guimarães",
    "Leziria do Tejo SM",
    "Lisboa",
    "Lisboa SM",
    "Loures",
    "Maia",
    "Maia SM",
    "Matosinhos",
    "Montijo",
    "Mycarcenter",
    "Paços de Ferreira",
    "Paredes",
    "Paredes SM",
    "Portimão",
    "Porto",
    "Porto alto",
    "Póvoa de Stªa Iria",
    "Póvoa de Varzim",
    "Recalibra Minho",
    "Sacavém",
    "Santarém",
    "Telheiras",
    "Trucks Service Beiras",
    "Vale do Tejo SM",
    "Viana",
    "Viana SM",
    "Vila Verde"
  ];
  
  console.log("Testando matching de lojas...\n");
  
  let encontradas = 0;
  let naoEncontradas = 0;
  
  for (const nome of nomesExcel) {
    const loja = await db.getLojaByNomeAproximado(nome);
    if (loja) {
      console.log(`✓ "${nome}" → "${loja.nome}" (ID: ${loja.id})`);
      encontradas++;
    } else {
      console.log(`✗ "${nome}" → NÃO ENCONTRADA`);
      naoEncontradas++;
    }
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`Encontradas: ${encontradas}/${nomesExcel.length}`);
  console.log(`Não encontradas: ${naoEncontradas}/${nomesExcel.length}`);
  
  process.exit(0);
}

testMatchingLojas().catch(console.error);
