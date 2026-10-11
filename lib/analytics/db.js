import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

let connection, initialized, testDatabase;
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8').split(';').map(s => s.trim()).filter(Boolean);
export function setTestDatabase(db) {
  if (process.env.NODE_ENV !== 'test') throw new Error('test-only');
  testDatabase = db; initialized = undefined;
}
function sql() {
  if (!connection) {
    if (!process.env.DATABASE_URL) throw Object.assign(new Error('not-configured'), { status: 503 });
    connection = neon(process.env.DATABASE_URL);
  }
  return connection;
}
export async function query(text, values = []) {
  if (testDatabase) return (await testDatabase.query(text, values)).rows;
  return sql().query(text, values, { fetchOptions: { signal: AbortSignal.timeout(12000) } });
}
export async function transaction(statements) {
  if (testDatabase) return testDatabase.transaction(async tx => {
    const result = []; for (const [text, values = []] of statements) result.push((await tx.query(text, values)).rows); return result;
  });
  return sql().transaction(statements.map(([text, values = []]) => sql().query(text, values)), { isolationLevel: 'Serializable', fetchOptions: { signal: AbortSignal.timeout(15000) } });
}
export async function ready() {
  if (!initialized) initialized = transaction(schema.map(text => [text])).catch(error => { initialized = undefined; throw error; });
  return initialized;
}
export async function serial(work) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await work(); } catch (error) { if (error.code !== '40001' || attempt === 2) throw error; }
  }
}
export const configured = () => Boolean(process.env.DATABASE_URL && process.env.ANALYTICS_SECRET?.length >= 32) || Boolean(testDatabase);
