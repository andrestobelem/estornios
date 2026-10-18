import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const build = await Bun.build({ entrypoints: [join(root, 'viewer/main.ts')], target: 'browser', format: 'iife', minify: true });
if (!build.success || !build.outputs[0]) throw new Error('No se pudo compilar la visualización');
const script = (await build.outputs[0].text()).replace(/<\/script/gi, '<\\/script');
const fragment = await Bun.file(join(root, 'viewer/fragment.html')).text() + `\n<script>${script}</script>\n`;

if (process.argv[2] === '--fragment') {
  const destination = process.argv[3];
  if (!destination) throw new Error('Falta la ruta de destino');
  await Bun.write(destination, fragment);
} else {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Murmullo de Estorninos</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap"></head><body>${fragment}</body></html>`;
  const server = Bun.serve({ hostname: '127.0.0.1', port: Number(process.env.PORT ?? 3000), fetch(request) {
    return new URL(request.url).pathname === '/' ? new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }) : new Response('Not found', { status: 404 });
  } });
  console.log(`Visualización: ${server.url}`);
}
