import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Verificar o estado actual do Diogo Ferreira (id 60016)
const [diogo] = await connection.execute(
  'SELECT id, nome, tipo, lojaId, gestorId, updatedAt FROM colaboradores WHERE id = 60016'
);
console.log('Estado actual do Diogo:', diogo[0]);

// Simular o que o handleUpdate envia quando muda para volante
// O frontend envia: { id, nome, codigoColaborador, cargo, tipo: "volante", lojaId: null }
// O backend faz: const { id, ...data } = input; -> data = { nome, codigoColaborador, cargo, tipo: "volante", lojaId: null }
// Note: gestorId NÃO está em data

// Vamos ver o SQL que o Drizzle gera
const testData = {
  nome: 'Diogo João Gomes Ferreira',
  codigoColaborador: null,
  cargo: 'tecnico',
  tipo: 'volante',
  lojaId: null,
  updatedAt: new Date()
};

console.log('\nDados que seriam enviados ao Drizzle:', testData);
console.log('\nNota: gestorId NÃO está nos dados, então o Drizzle NÃO deveria actualizá-lo');

// Verificar se o zod com .optional().nullable() pode transformar undefined em null
// Quando o frontend não envia gestorId, o zod com z.number().optional().nullable()
// deveria simplesmente não incluir gestorId no output
// MAS: se o frontend envia gestorId: undefined explicitamente, o zod pode transformar em null?

// Vamos testar com um objecto que tem gestorId: undefined
const inputComUndefined = {
  id: 60016,
  nome: 'Test',
  tipo: 'volante',
  lojaId: null,
  gestorId: undefined,
};

const { id, ...dataFromInput } = inputComUndefined;
console.log('\nDados após destructuring (com gestorId: undefined):', dataFromInput);
console.log('gestorId in dataFromInput:', 'gestorId' in dataFromInput);
console.log('dataFromInput.gestorId:', dataFromInput.gestorId);

// Se gestorId está como undefined no objecto, o Drizzle pode incluí-lo no SET como NULL!
// Isto é o bug provável!

await connection.end();
