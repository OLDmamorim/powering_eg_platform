// Simular a função calcularPeriodoMultiplosMeses
function calcularPeriodoMultiplosMeses(meses) {
  if (!meses || meses.length === 0) {
    const agora = new Date();
    return {
      dataInicio: new Date(agora.getFullYear(), agora.getMonth() - 1, 1),
      dataFim: new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59)
    };
  }
  
  const ordenados = [...meses].sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.mes - b.mes;
  });
  
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  
  return {
    dataInicio: new Date(primeiro.ano, primeiro.mes - 1, 1),
    dataFim: new Date(ultimo.ano, ultimo.mes, 0, 23, 59, 59)
  };
}

// Testar para Dezembro 2025
const mesesSelecionados = [{ mes: 12, ano: 2025 }];
const { dataInicio, dataFim } = calcularPeriodoMultiplosMeses(mesesSelecionados);

console.log('Meses selecionados:', mesesSelecionados);
console.log('Data Início:', dataInicio.toISOString());
console.log('Data Fim:', dataFim.toISOString());
console.log('');
console.log('Período esperado: 2025-12-01 a 2025-12-31');
