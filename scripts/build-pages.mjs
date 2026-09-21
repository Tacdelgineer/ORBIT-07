import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('public/game');
const output = path.resolve('dist-pages');
const basePath = '/ORBIT-07/';

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

const indexPath = path.join(output, 'index.html');
let index = await readFile(indexPath, 'utf8');
if (!index.includes('<main id="game"') || !index.includes('./js/main.js')) {
  throw new Error('Pages index is not the ORBIT / 07 game entry point.');
}
index = index.replace('<head>', `<head><base href="${basePath}">`);
await writeFile(indexPath, index);
await writeFile(path.join(output, '.nojekyll'), '');

for (const relative of [
  'index.html',
  'styles.css',
  'icon.svg',
  'js/main.js',
  'vendor/three.module.js',
]) {
  await readFile(path.join(output, relative));
}

console.log(`Pages game staged at dist-pages with base ${basePath}`);
