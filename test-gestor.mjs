import { getAllGestores } from './server/db.ts';

async function test() {
  try {
    console.log('Testing getAllGestores...');
    const gestores = await getAllGestores();
    console.log('SUCCESS! Gestores:', JSON.stringify(gestores, null, 2));
  } catch (error) {
    console.log('ERROR:', error.message);
    console.log('Stack:', error.stack);
  }
  process.exit(0);
}

test();
