import { readFile, writeFile } from 'node:fs/promises';
import { validateRegistry } from './validation.mjs';
const rows = validateRegistry(JSON.parse(await readFile(new URL('../data/hubs.json', import.meta.url), 'utf8')));
await writeFile(new URL('../site/hubs.json', import.meta.url), JSON.stringify(rows, null, 2) + '\n');
console.log(`검증된 허브 ${rows.length}개 빌드 완료`);
