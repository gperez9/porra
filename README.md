# Porra Mundial

Aplicacion web para crear y comparar predicciones del Mundial 2026.

## Fase actual

Fase 10: pulido MVP.

Incluye:

- Next.js con App Router y TypeScript estricto.
- Tailwind CSS.
- Prisma preparado para PostgreSQL.
- Estructura inicial por capas.
- Scripts de lint, typecheck, tests y migraciones.
- Seed inicial para crear el torneo y un admin opcional desde variables de entorno.
- Seed oficial de 48 equipos, 12 grupos y 72 partidos de fase de grupos.
- Calculo puro de clasificaciones de grupo con desempates deterministas.
- PostgreSQL local con Docker Compose.
- Script de verificacion de seed local.
- Registro, login, logout y dashboard protegido con cookies HTTP-only.
- Crear, listar, renombrar, duplicar y borrar predicciones en borrador.
- Marcadores de fase de grupos con guardado parcial y tablas calculadas.
- Ranking de mejores terceros y resolucion de slots de ronda de 32.
- Seed de bracket FIFA 2026 desde M73 hasta M104.
- Seed de 495 combinaciones de terceros validado por tests de integridad.
- Pantalla de eliminatorias desde ronda de 32 hasta final.
- Validacion de clasificado y penaltis en empates.
- Propagacion de ganadores y perdedores de semifinal para tercer puesto.
- Dashboard con resumen de predicciones, progreso, campeon, finalistas y semifinalistas.
- Estadisticas agregadas de progreso y campeones previstos.
- Pantalla admin para cargar resultados reales de grupos y eliminatorias.
- Bloqueo/desbloqueo manual de edicion de predicciones.
- Calculo de clasificaciones reales, mejores terceros y bracket real parcial.
- Motor de puntuacion configurable desde seed.
- Persistencia de `PredictionScore` y recalculo al guardar resultados.
- Leaderboard global por prediccion con desglose de puntos.
- Estados globales de carga, error y pagina no encontrada.
- Mejoras basicas de accesibilidad: skip link, focus visible y mensajes `aria-live`.
- Scripts de CI y deploy de migraciones.

## Requisitos

- Node.js 24 o superior.
- npm 11 o superior.
- Docker Desktop o PostgreSQL accesible por `DATABASE_URL`.

## Puesta en marcha

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

`npm run db:setup` arranca PostgreSQL con Docker Compose, aplica migraciones,
ejecuta el seed oficial y verifica los conteos basicos de datos.

El PostgreSQL de Docker se publica en `127.0.0.1:55432` para evitar conflictos
con instalaciones locales que ya usen `5432`.

Para parar la base local:

```bash
npm run db:down
```

## Variables de entorno

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-before-deploy
```

`ADMIN_USERNAME` y `ADMIN_PASSWORD` son opcionales en desarrollo, pero deben
definirse una vez para crear o actualizar el primer admin por seed.

## Deploy

Flujo recomendado para produccion:

```bash
npm install
npm run prisma:deploy
npm run db:seed
npm run build
npm run start
```

Antes de desplegar, usa un `DATABASE_URL` de PostgreSQL gestionado y cambia
`ADMIN_PASSWORD`. El seed es idempotente: actualiza datos base y el admin si las
variables estan presentes.

## Comprobaciones

```bash
npm run lint
npm run typecheck
npm run test
npm run prisma:validate
npm run db:verify
```

O todo junto:

```bash
npm run check
```

Para CI:

```bash
npm run ci
```
