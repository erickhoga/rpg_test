import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
rmSync('docs', { recursive: true, force: true });
mkdirSync('docs', { recursive: true });
cpSync('dist', 'docs', { recursive: true });
writeFileSync('docs/.nojekyll', '');
console.log('GitHub Pages atualizado em docs/. Inclua essa pasta no commit.');
