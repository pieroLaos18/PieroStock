import { copyFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDir = path.join(frontendRoot, 'dist-demo');

await copyFile(path.join(outputDir, 'demo-only.html'), path.join(outputDir, 'index.html'));
await rm(path.join(outputDir, 'demo-only.html'));
await writeFile(
  path.join(outputDir, 'vercel.json'),
  JSON.stringify({ rewrites: [{ source: '/(.*)', destination: '/index.html' }] }, null, 2),
  'utf8',
);
