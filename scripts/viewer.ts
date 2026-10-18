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
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vuelo de estorninos</title><style>
  :root { color-scheme: light dark; --foreground: light-dark(#202521,#e5ece6); --background: light-dark(#f7f9f6,#111814); --border: light-dark(#d4ddd4,#35463a); --muted-foreground: light-dark(#566257,#b0bfb2); --viz-series-1: light-dark(#236b46,#8bd4a4); }
  body { margin: 0; padding: 24px; background: var(--background); color: var(--foreground); font: 15px system-ui,sans-serif; }
  main { max-width: 960px; margin: auto; } h2 { font-size: 22px; font-weight: 500; }
  .viz-controls { display:flex; flex-wrap:wrap; align-items:center; gap:12px; }
  button, select { font: inherit; color: var(--foreground); background: var(--background); border:1px solid var(--border); border-radius:6px; padding:8px 12px; }
  button { cursor:pointer; } .tabular-nums { font-variant-numeric: tabular-nums; }
  .sr-only { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
  @media(pointer:coarse) { button,select { min-height:44px; } }
  </style></head><body><main>${fragment}</main></body></html>`;
  const server = Bun.serve({ hostname: '127.0.0.1', port: Number(process.env.PORT ?? 3000), fetch(request) {
    return new URL(request.url).pathname === '/' ? new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }) : new Response('Not found', { status: 404 });
  } });
  console.log(`Visualización: ${server.url}`);
}
