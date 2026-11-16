# Administración visual de la base de datos de Arena

CloudBeaver ofrece una interfaz web para administrar PostgreSQL. Esta configuración no publica el puerto de la base de datos (`5432`) ni el puerto interno de CloudBeaver (`8978`) en Internet. Nginx publica únicamente el sitio HTTPS `db.pyroprod.cl`.

## 1. DNS (GoDaddy)

Crear un registro **A**:

| Tipo | Nombre | Valor |
| --- | --- | --- |
| A | `db` | `200.35.159.39` |

Esperar a que `nslookup db.pyroprod.cl 1.1.1.1` responda `200.35.159.39` antes de continuar.

## 2. Instalar en la VPS

```bash
cd /srv/web/arena
git pull --ff-only
cd deploy/cloudbeaver
docker compose up -d
docker compose ps
```

CloudBeaver queda disponible solamente en `127.0.0.1:8978` dentro de la VPS.

## 3. Publicarlo con Nginx y HTTPS

Crear `/etc/nginx/sites-available/cloudbeaver` con este contenido:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name db.pyroprod.cl;

    location / {
        proxy_pass http://127.0.0.1:8978;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
    }
}
```

Activar la configuración y emitir el certificado:

```bash
sudo ln -s /etc/nginx/sites-available/cloudbeaver /etc/nginx/sites-enabled/cloudbeaver
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d db.pyroprod.cl
```

Abrir `https://db.pyroprod.cl`. En el asistente inicial definir una cuenta administradora de CloudBeaver con una contraseña única y robusta. No usar la contraseña de la VPS ni una contraseña de la base de datos.

## 4. Conectar Arena

En CloudBeaver seleccionar **New Connection** → **PostgreSQL** y usar:

| Campo | Valor |
| --- | --- |
| Host | `db` |
| Puerto | `5432` |
| Base de datos | `arena` |
| Usuario | `arena_app` |
| Contraseña | Valor de `POSTGRES_PASSWORD` en `/srv/web/arena/.env` |

El host es `db`, no `localhost`: ambos contenedores comparten la red privada Docker `arena_default`.

## 5. Accesos para otras personas

No compartir el usuario `arena_app`: es el propietario de las tablas. Crear cuentas de base de datos separadas según lo que cada persona pueda hacer. Como administrador, en CloudBeaver abrir un editor SQL y ejecutar uno de los siguientes ejemplos, sustituyendo las contraseñas por valores únicos.

### Solo lectura

```sql
CREATE ROLE arena_lector LOGIN PASSWORD 'CAMBIAR_POR_CONTRASENA_UNICA';
GRANT CONNECT ON DATABASE arena TO arena_lector;
GRANT USAGE ON SCHEMA public TO arena_lector;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO arena_lector;
ALTER DEFAULT PRIVILEGES FOR ROLE arena_app IN SCHEMA public GRANT SELECT ON TABLES TO arena_lector;
```

### Editor de datos (sin permisos para borrar tablas o cambiar estructura)

```sql
CREATE ROLE arena_editor LOGIN PASSWORD 'CAMBIAR_POR_CONTRASENA_UNICA';
GRANT CONNECT ON DATABASE arena TO arena_editor;
GRANT USAGE ON SCHEMA public TO arena_editor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO arena_editor;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO arena_editor;
ALTER DEFAULT PRIVILEGES FOR ROLE arena_app IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arena_editor;
ALTER DEFAULT PRIVILEGES FOR ROLE arena_app IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO arena_editor;
```

Crear en CloudBeaver una conexión distinta para cada rol y entregar a cada persona solo la conexión correspondiente. Además, crearle una cuenta propia dentro de CloudBeaver desde **Settings → Administration → Users**; nunca compartir la cuenta administradora.

## Operación y recuperación

```bash
cd /srv/web/arena/deploy/cloudbeaver
docker compose logs --tail=100 cloudbeaver
docker compose restart cloudbeaver
```

Los datos de usuarios y configuración se conservan en el volumen Docker `arena_cloudbeaver_workspace`. Antes de actualizar la imagen, respaldar ese volumen y la base PostgreSQL de Arena.
