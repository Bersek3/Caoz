# Iconos CZ ARENA

Los componentes importan sus iconos desde `@/components/icons`. La familia propia es SVG, sin imágenes externas, fuentes de iconos ni otra dependencia de runtime.

## Lenguaje visual

- Cuadrícula de 24 × 24; trazo de 1,65; esquinas angulares y rellenos suaves que heredan el color del componente.
- Copas de campeonato, armas de enfrentamiento, mandos, escuadras con escudos, perfiles con casco, insignias verificadas, rangos y llaves de eliminación.
- Cronómetros de partida, calendario de jornadas, rachas, mejoras de experiencia, soporte con auriculares y pases de inscripción.
- Las acciones de cerrar, volver, copiar, guardar y eliminar conservan los controles reconocibles de Lucide.
- Los iconos decorativos están ocultos a lectores de pantalla; los botones conservan su texto o nombre accesible. Un icono independiente puede usar `aria-label`.

## Uso

```tsx
import { Trophy, Swords, Users, Receipt } from '@/components/icons';

<Trophy className="h-5 w-5 text-red-300" />
<Swords size={24} />
<Users size={32} aria-label="Equipo" />
<Receipt className="h-8 w-8 text-red-300" />
```

El alias `Layers` representa llaves de eliminación, `Sparkles` una mejora de experiencia y `LifeBuoy` el soporte de la arena. Se mantienen estos nombres para preservar los componentes existentes.

La muestra visual de esta versión está en [iconos-arena.html](iconos-arena.html).
