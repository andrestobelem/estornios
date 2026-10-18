# Estornios

Motor de simulación de bandadas de estorninos en 3D, escrito en TypeScript y ejecutable con Bun. No requiere dependencias de ejecución.

```bash
bun install
bun start
bun test
bunx tsc --noEmit
```

`bun start` simula 300 aves durante 10 segundos y muestra una muestra del estado final en JSON.

## Uso del módulo

```ts
import { StarlingSimulation } from './index.ts';

const flock = new StarlingSimulation({ count: 500, seed: 42 });
flock.step(1 / 60);
const birds = flock.snapshot();
// Cada ave tiene id, position: { x, y, z }, velocity: { x, y, z }.
```

El motor es independiente del renderizado. `snapshot()` devuelve copias que pueden usarse en un visualizador sin modificar el estado interno. `step(seconds)` admite entre 0 y 1 segundo y subdivide el intervalo en pasos de hasta 1/60 s. Para resultados reproducibles, usar la misma configuración y secuencia de pasos.

## Parámetros

| Parámetro | Predeterminado | Significado |
| --- | --- | --- |
| count / seed | 300 / 1 | Cantidad de aves y semilla entera |
| bounds | { x: 100, y: 60, z: 100 } | Semiextensiones del volumen centrado en el origen |
| perceptionRadius | 30 | Distancia máxima de percepción |
| separationRadius | 6 | Radio de evitación de otras aves |
| neighbors | 7 | Vecinos más cercanos para alineación y cohesión |
| minSpeed / maxSpeed | 8 / 18 | Límites de rapidez |
| maxAcceleration | 20 | Límite de la aceleración de dirección |
| separationWeight | 1.8 | Fuerza de separación |
| alignmentWeight | 1 | Tendencia a igualar velocidades |
| cohesionWeight | 0.7 | Tendencia a acercarse al centro de los vecinos |

Las distancias usan unidades arbitrarias consistentes y el tiempo se expresa en segundos. Un índice espacial limita la búsqueda de vecinos a celdas cercanas. Todas las aves se actualizan desde el mismo estado anterior.

## Modelo y límites

Aproximación Boids con separación, alineación y cohesión. La separación considera todas las aves dentro de su radio; alineación y cohesión usan los vecinos más cercanos dentro del radio de percepción. Hay un giro hacia el interior cerca de los límites y reflexión en la pared como respaldo.

No es un modelo aerodinámico ni una validación biológica del vuelo real: no incluye alas, viento, depredadores ni garantía de ausencia de colisiones. El límite de aceleración corresponde a la fuerza de dirección; el ajuste de rapidez mínima y la reflexión pueden producir cambios de velocidad adicionales. La búsqueda espacial puede degradarse con bandadas muy densas.

## Organización del código

`StarlingSimulation` coordina la inicialización y los pasos de tiempo. Cada ave es una instancia de `Starling`, que encapsula su estado y aplica aceleración, límites de rapidez y reflexión en los bordes mediante `advance()`. Este método devuelve una nueva instancia para conservar el estado anterior durante las consultas de vecinos. `snapshot()` entrega una copia de los datos del ave. Compone un `SeededRandom` para generar el estado inicial, la función `createSimulationOptions()` para validar y copiar los parámetros en una configuración inmutable (incluidos los límites del volumen) y un `FlockingBehavior` para calcular las fuerzas. En cada paso construye un `SpatialGrid` que consulta vecinos sobre el estado anterior. Los contratos `Bird`, `Vector3` y `SimulationOptions` siguen disponibles desde `index.ts`; las operaciones vectoriales son funciones puras internas.

La prueba de regresión compara una trayectoria con datos capturados antes de la refactorización para verificar que la reorganización conserva los resultados.

La API de `Starling` exige un identificador entero seguro no negativo y componentes finitas para posición, velocidad y aceleración. `advance()` valida también los límites de vuelo y lanza `RangeError` ante entradas inválidas, incluso si el tiempo es cero. Estas validaciones se comparten con la configuración de la simulación.

## Visualización interactiva

```bash
bun run view
```

Abrir `http://127.0.0.1:3000/`. La visualización usa el mismo motor 3D y dibuja cada ave como una flecha orientada según su velocidad. Permite pausar, reiniciar con semilla 42, elegir 100, 300 o 600 aves y alternar entre vista oblicua, superior o lateral. Los cambios de cantidad reinician la bandada. Con la preferencia del sistema de movimiento reducido, comienza pausada.

El renderizado está separado en `viewer/`: `FlightCamera` proyecta el volumen y el controlador conecta Canvas con `StarlingSimulation`. El servidor local compila todo con Bun, sin dependencias ni servicios externos. Los pasos físicos son fijos de 1/60 s; al ocultar la pestaña se suspende el avance y se descarta el tiempo acumulado. Si el equipo no alcanza el ritmo de renderizado, se limita el tiempo recuperado por cuadro a 0.1 s.

Para usar otro puerto: `PORT=3001 bun run view`. Para generar un fragmento autocontenido: `bun run scripts/viewer.ts --fragment /ruta/visualizacion.html`.
