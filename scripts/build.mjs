import { readFile, writeFile } from 'node:fs/promises';
import { validateRegistry } from './validation.mjs';
const rows = validateRegistry(JSON.parse(await readFile(new URL('../data/hubs.json', import.meta.url), 'utf8')));
await writeFile(new URL('../site/hubs.json', import.meta.url), JSON.stringify(rows, null, 2) + '\n');
await writeFile(new URL('../site/registration-validation.mjs',import.meta.url),await readFile(new URL('validation.mjs',import.meta.url)));
console.log(`검증된 허브 ${rows.length}개 빌드 완료`);
