# Despliegue de Fubito en Dokploy con Compose

## Configuración de Dokploy

1. Cree un servicio **Compose** conectado al repositorio.
2. Use la rama `main`.
3. Configure **Compose Path** como `infra/dokploy/docker-compose.yml`.
4. Copie todas las variables de `.env.example` a **Environment** y reemplace los valores `CAMBIAR_*`.
5. Despliegue una vez. Los servicios `db`, `api` y `frontend` deben quedar `healthy`.
6. En **Domains**, agregue el dominio al servicio `frontend`, puerto `3000`, path `/`, con HTTPS habilitado.
7. El valor de `APP_URL` debe coincidir exactamente con el dominio HTTPS configurado.

No agregue dominios ni puertos públicos a `api` o `db`. El frontend reenvía
`/api/*` y `/uploads/*` por la red privada de Compose.

## Variables obligatorias

- `APP_URL`: URL pública HTTPS, sin barra final.
- `POSTGRES_PASSWORD`: contraseña larga con caracteres URL-safe.
- `SECRET_KEY`: secreto estable; firma JWT y cifra las llaves privadas Culqi.

`GOOGLE_CLIENT_ID` es necesario para Google Sign-In. Después de cambiarlo,
reconstruya las imágenes porque Next.js lo incorpora durante el build.

## Verificación posterior

```text
https://SU_DOMINIO/                  -> Fubito
https://SU_DOMINIO/api/health        -> {"status":"healthy"}
https://SU_DOMINIO/api/public/venues -> JSON del catálogo
```

Pruebe además registro/login, carga de una imagen, reserva y pago Culqi en modo
prueba. Confirme que los volúmenes `postgres_data` y `uploads_data` se conservan
después de un redeploy.

## Copias de seguridad

Configure backups de Dokploy para el volumen `postgres_data`. Si no usa
Supabase Storage, incluya también `uploads_data`. No elimine esos volúmenes en
un redeploy normal.

