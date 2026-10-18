# Murmullo de Estorninos

Simulador interactivo basado directamente en el archivo **Murmullo de Estorninos.html** proporcionado como referencia. Conserva sus fórmulas 2D, parámetros, perfiles de especies, siluetas, cielo, controles y tamaños en píxeles.

```bash
bun install
bun run view
```

Abrir `http://127.0.0.1:3000/`. Otro puerto: `PORT=3001 bun run view`.

El inicio usa **300 estorninos, sin otras especies ni obstáculos**.

## Controles

- Separación, alineación, cohesión, velocidad y viento cambian sin reiniciar las aves.
- Tres especies: estorninos (0–1200), golondrinas (0–400) y palomas (0–200).
- Tocar el cielo espanta a las aves; el modo obstáculo permite agregar o quitar obstáculos. Hay un máximo de 20.
- Halcón, estelas, pausa, dispersión y eliminación de obstáculos.
- La libreta puede ocultarse. Con movimiento reducido, comienza pausado y sin estelas.

## Organización

- `src/murmuration.ts`: modelo original extraído a `Murmuration`, con búsqueda espacial y buffers reutilizables para las siete vecinas más cercanas. Primero calcula fuerzas para todas las aves, después las integra.
- `src/starling.ts`: entidad `Starling`, con posición, velocidad y aceleración en 2D.
- `viewer/sky-renderer.ts`: cielo y dibujo agrupado por especie, como en la referencia. Sin copias de la bandada, ordenamiento por profundidad ni transformaciones de Canvas por ave.
- `viewer/main.ts`: controles y reloj de animación con dibujo en cada callback del navegador y 120 medios pasos físicos por segundo. Desvincula la velocidad del vuelo de la frecuencia de refresco de pantalla.
- `scripts/viewer.ts`: empaquetado con Bun y servidor local.

El modelo anterior en 3D fue reemplazado por el modelo 2D de la referencia. Las posiciones se expresan en píxeles y las velocidades en píxeles por paso físico. Las diferencias deliberadas con el HTML original son la pausa corregida, soporte de movimiento reducido, tiempo físico fijo a 120 medios pasos por segundo, validación de entradas y snapshots separados del acceso de renderizado.

`view()` ofrece acceso de solo lectura en TypeScript a los datos vivos para dibujo inmediato; no debe modificarse ni retenerse como snapshot. `snapshot()` devuelve copias para otros consumidores. Se conserva el diseño original, incluidas las fuentes de Google Fonts con alternativas locales.

## Uso del módulo

```ts
import { Murmuration } from './index.ts';

const scene = new Murmuration(1280, 720, [300, 0, 0]);
scene.configure({ sep: 1.6, ali: 1, coh: 0.9, spd: 3.4, wind: 0 });
const meanSpeed = scene.step(); // un paso físico, equivalente a 1/60 s
const snapshot = scene.snapshot();
```

Se puede inyectar una función aleatoria como cuarto argumento para reproducir resultados. `bun start` ejecuta un ejemplo determinista de diez segundos en consola.

El dibujo usa todos los callbacks de `requestAnimationFrame`, sin limitador propio. Con callbacks a 120 Hz puede dibujar 120 cuadros por segundo. El panel separa FPS dibujados, frecuencia de callbacks (rAF) y tiempo medio de trabajo de física y dibujo en JavaScript (CPU, sin medir la GPU). Cada actualización física usa `step(0.5)` para conservar la escala de tiempo del original; `step()` mantiene el paso original de 1/60 s.

## Verificación

```bash
bun test
bunx tsc --noEmit
bun run bench
```

La prueba de regresión ejecuta las fórmulas del HTML original guardado en `tests/fixtures/original.html` y compara exactamente las trayectorias usando la misma secuencia aleatoria, incluyendo cambios de viento, cohesión, espanto y halcón. El HTML de referencia se usa como fixture de pruebas y nunca se sirve ni se ejecuta en la visualización.

El benchmark mide únicamente la física en Bun, sin renderizado: no representa los FPS del navegador. Las especies y el comportamiento son aproximaciones artísticas; no hay garantía de ausencia de colisiones ni modelo aerodinámico.

La búsqueda espacial reutiliza los buffers de celdas y comparte las listas de candidatos entre aves de la misma celda. Conserva el orden de recorrido y selección de vecinos de la referencia. El benchmark incluye la configuración inicial de 300 aves y reporta la mediana de cinco ejecuciones de 600 medios pasos, tras calentamiento.

Al pausar, Canvas solo vuelve a dibujar cuando cambian la escena o el tamaño.
