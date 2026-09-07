import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve('node_modules/three/examples/jsm');
const target = path.resolve('public/game/vendor/addons');
const copied = new Set();
async function copy(relative) {
  const file = path.resolve(source, relative);
  if (!file.startsWith(source + path.sep))
    throw new Error('Unexpected dependency outside Three.js addons.');
  if (copied.has(file)) return;
  copied.add(file);
  const text = await readFile(file, 'utf8'),
    destination = path.join(target, path.relative(source, file));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, text);
  for (const match of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (match[1].startsWith('.'))
      await copy(
        path.relative(source, path.resolve(path.dirname(file), match[1])),
      );
  }
}
for (const file of [
  'EffectComposer',
  'RenderPass',
  'UnrealBloomPass',
  'OutputPass',
])
  await copy(`postprocessing/${file}.js`);
for (const file of ['three.module.js', 'three.core.js'])
  await copyFile(
    `node_modules/three/build/${file}`,
    `public/game/vendor/${file}`,
  );
await copyFile('node_modules/three/LICENSE', 'public/game/vendor/LICENSE');
console.log(`Copied ${copied.size} required Three.js addon modules.`);
