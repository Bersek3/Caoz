# CAOZ Portal & Arena Esports 🎮🏆

Portal oficial del creador de contenido y streamer **Caoz** (+2.17M de comunidad) integrado con la plataforma de torneos y competencias esports **Caoz Arena**.

---

## 🚀 Estructura del Proyecto

* **`/` (Inicio)**: Landing oficial interactiva de Caoz:
  * Transmisión en directo (reproductor Kick / Twitch con chat integrado).
  * Métricas consolidadas (YouTube 1.07M+, TikTok 923K+, Kick, Twitch e Instagram).
  * Colaboraciones y patrocinios oficiales (Red Bull, Logitech G, Kick).
  * Sección destacada con acceso directo a **Caoz Arena**.
  * Formulario de propuestas comerciales y contacto directo.
* **`/torneos`**: Plataforma completa de gestión de torneos y competencias estilo Battlefy:
  * Explorador de torneos por juego (Valorant, LoL, CS2, Fortnite, EA FC).
  * Filtros por estado (Inscripciones abiertas, en vivo, finalizados).
  * Brackets de eliminación simple y doble eliminación interactivos.
  * Check-in de jugadores y salas de chat privadas por partida.
  * Creador de torneos para administradores.
* **`/tournament/[id]`**: Sala y vista detallada del torneo, brackets y reporte de resultados.
* **`/profile`**: Perfil de jugador con vinculación de IDs de juego (Riot ID, Steam ID, Epic Games, etc.) y gestión de autorizaciones.
* **`/api/...`**: Backend con endpoints REST en Next.js con autenticación segura y persistencia en base de datos PostgreSQL.

---

## 🛠️ Tecnologías

* **Framework**: Next.js 16 (App Router & Turbopack)
* **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Canvas Confetti
* **Backend & DB**:
  * Desarrollo local: PostgreSQL embebido vía `@electric-sql/pglite` (sin necesidad de instalar software extra).
  * Producción: Compatible con cualquier PostgreSQL en la nube (Neon Serverless Postgres, Supabase, Vercel Postgres) mediante la variable `DATABASE_URL`.
* **Seguridad**: Autenticación con JWT (`jsonwebtoken`) y encriptación de contraseñas con `bcryptjs`.

---

## 💻 Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abre [http://localhost:3000](http://localhost:3000) para ver la landing oficial o [http://localhost:3000/torneos](http://localhost:3000/torneos) para la plataforma de torneos.

---

## 🌐 Despliegue en Vercel

1. Sube este repositorio a tu cuenta de GitHub (`Bersek3/Caoz`).
2. Entra a [vercel.com](https://vercel.com/) y crea un nuevo proyecto importando este repositorio.
3. Vercel detectará Next.js automáticamente en la raíz.
4. En **Settings > Environment Variables**, añade:
   * `DATABASE_URL`: La URL de conexión a tu base de datos PostgreSQL en la nube (ejemplo gratuito: [Neon](https://neon.tech/) o [Supabase](https://supabase.com/)).
   * `JWT_SECRET`: Una clave secreta para la generación de tokens (opcional).
5. Haz clic en **Deploy**. ¡Tu portal y plataforma de torneos estarán online bajo el mismo dominio!
