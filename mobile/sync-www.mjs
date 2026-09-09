/**
 * Copia o app web (que mora na raiz do repositório) para mobile/www,
 * que é o webDir do Capacitor. Rode antes de `npx cap sync android`.
 */
import { cp, rm, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const www = path.join(here, 'www');

// Arquivos e pastas do app web. sw.js fica de fora de propósito: dentro do APK
// o conteúdo já é local, e um service worker só atrapalharia a atualização.
const ITEMS = [
  'index.html',
  'manifest.json',
  'icon.svg',
  'icons',
  'classes',
  'background',
  'widgets',
];

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });

for (const item of ITEMS) {
  const src = path.join(repo, item);
  if (!existsSync(src)) {
    console.log(`· pulando ${item} (não existe)`);
    continue;
  }
  const info = await stat(src);
  await cp(src, path.join(www, item), { recursive: info.isDirectory() });
  console.log(`✓ ${item}`);
}

console.log(`\nwww pronto em ${www}`);
console.log('Agora: npx cap sync android');
