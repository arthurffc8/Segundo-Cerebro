/**
 * Valida a sintaxe do bloco <script type="text/babel"> do index.html usando
 * o mesmo Babel que o app carrega no navegador. Saída: "OK" ou o erro de parse.
 * Uso: node check_jsx.mjs  (requer @babel/standalone instalado neste diretório)
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Babel = require('@babel/standalone');

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!m) { console.error('ERRO: bloco text/babel não encontrado'); process.exit(1); }
try {
  Babel.transform(m[1], { presets: ['react'], filename: 'index.jsx' });
  console.log('OK — JSX do index.html parseia sem erros');
} catch (e) {
  console.error('ERRO DE SINTAXE:\n' + e.message.split('\n').slice(0, 12).join('\n'));
  process.exit(1);
}
