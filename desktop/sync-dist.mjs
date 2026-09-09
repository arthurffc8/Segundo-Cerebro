/**
 * Copia o app web (raiz do repositório) para desktop/dist,
 * que é o `frontendDist` do Tauri. Rode antes de `tauri dev` / `tauri build`.
 */
import { cp, rm, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const dist = path.join(here, 'dist');

// sw.js fica de fora: o Tauri serve por protocolo próprio e não suporta service worker.
const ITEMS = ['index.html', 'manifest.json', 'icon.svg', 'icons', 'classes', 'background'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const item of ITEMS) {
  const src = path.join(repo, item);
  if (!existsSync(src)) {
    console.log(`· pulando ${item} (não existe)`);
    continue;
  }
  const info = await stat(src);
  await cp(src, path.join(dist, item), { recursive: info.isDirectory() });
  console.log(`✓ ${item}`);
}

console.log(`\ndist pronto em ${dist}`);
