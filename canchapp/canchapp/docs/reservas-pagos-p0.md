# Reservas y pagos: operación y verificación

Base: `81103ac`, última revisión publicada de `codex/fubito-dokploy-production`
al iniciar este trabajo. Se conserva el cobro completo por Culqi/Yape.

## Flujo del jugador

1. Al continuar se crea una separación sin cobro, durante un máximo de 10 minutos
   y nunca después del comienzo del partido. El precio total queda guardado.
2. Se abre Culqi con ese importe. Solo se confirma tras comprobar en el servidor
   el cargo, importe, moneda, captura, resultado y referencia de la reserva.
3. Una autorización de Yape solo puede utilizarse en una reserva. Los callbacks
   y reintentos devuelven el resultado existente sin enviar otro cargo.
4. Un rechazo definitivo libera el horario. La falta de respuesta del proveedor
   conserva el horario y muestra «Pago en verificación», con un enlace persistente.
5. Las separaciones sin pago iniciado vencen al consultar disponibilidad o reservas.
   Un pago en proceso o incierto nunca vence automáticamente: podría haberse cobrado.

## Operación del dueño

- En el panel, «Esperando pago» no permite confirmar dinero no verificado.
- «Verificar con Culqi» solicita el ID `chr_test_...` o `chr_live_...` del cargo
  que figura en el CulqiPanel del propio comercio. Fubito consulta ese cargo
  con la llave del comercio y comprueba que pertenece a la reserva.
- Si todavía no aparece ningún resultado definitivo, se conserva la verificación.
  Consultar al proveedor antes de cobrar otra vez o liberar el horario. No se
  convierte la ausencia de un resultado en una cancelación automática.
- Cancelar una reserva pagada libera el horario y conserva el registro del cobro.
  La devolución del dinero se realiza desde CulqiPanel, como en la versión anterior.
- «Actualizar pago / devolución» consulta de nuevo el cargo y registra las
  devoluciones parciales o totales verificadas; no solicita otra devolución.
  Una devolución total verificada cancela la reserva y libera su horario.
- Los reportes muestran pagos verificados menos devoluciones sincronizadas,
  incluyendo cobros de reservas canceladas que todavía no se han devuelto.
  No descuentan comisiones del proveedor. La ocupación solo usa reservas confirmadas.
- Las reservas antiguas sin importe original se etiquetan `legacy_estimated`:
  el valor se conserva desde la migración, pero no demuestra cuánto se cobró.
  Una captura histórica nunca se cuenta como dinero verificado.

## Despliegue en Dokploy

Conservar `SECRET_KEY`, `POSTGRES_PASSWORD`, volúmenes y configuración Culqi.
Cambiar `SECRET_KEY` impediría descifrar las llaves existentes.

Desde la raíz del repositorio:

```text
Branch: codex/fubito-dokploy-production
Compose Path: ./canchapp/canchapp/infra/dokploy/docker-compose.yml
Domain Service: frontend
Domain Port: 3000
Domain Path: /
```

La migración es aditiva, atómica e idempotente. Conserva las tablas y los datos;
añade precios originales, claves de idempotencia, auditoría de pagos, restricciones
de solapamiento y protección entre bloqueos y reservas. PostgreSQL necesita permitir
`CREATE EXTENSION btree_gist` al usuario de la aplicación (la imagen PostgreSQL del
Compose lo permite). Antes de actualizar producción, conservar una copia de seguridad.

Si hay conflictos históricos, el inicio se detiene con sus conteos sin borrar ni
reasignar reservas. Deben resolverse revisando las reservas originales. El comando
de diagnóstico es de solo lectura, disponible en la imagen actualizada:

```text
python -m app.services.booking_preflight
```

Después de Deploy, `/api/health` debe devolver `booking_integrity: 1`.
Probar Culqi con un comercio de pruebas antes de habilitar tráfico de pagos reales.

## Comprobantes históricos

Los archivos de comprobantes locales ya no se sirven por `/uploads`.
El dueño los descarga autenticado mediante `/api/reservations/{id}/receipt`.
Las fotos y los logos siguen siendo públicos.

Si antes se guardaron comprobantes en un bucket público externo de Supabase,
separar esos objetos en almacenamiento privado y revocar su acceso público en
Supabase. La aplicación no puede revocar copias o enlaces públicos externos
solo mediante el despliegue. El endpoint autenticado admite el storage configurado.

## Pruebas reproducibles en Windows

Usar exclusivamente bases locales desechables cuyos nombres terminen en `_test`.
La suite rechaza hosts remotos; las llamadas de cobro están sustituidas y no
pueden enviar cargos a cuentas reales.

Desde `backend`, con el entorno virtual del proyecto activo:

```powershell
python -m pip install -r requirements-dev.txt
$env:TEST_DATABASE_URL='postgresql+psycopg2://USUARIO:CLAVE@127.0.0.1:55439/fubito_test'
python -m pytest tests -q
```

Desde `frontend`, con una base local independiente `fubito_e2e_test`:

```powershell
npm ci
npx playwright install chromium
$env:TEST_DATABASE_URL='postgresql+psycopg2://USUARIO:CLAVE@127.0.0.1:55439/fubito_e2e_test'
npm run test:checkout
npm run check
npm run build
npm audit --omit=dev
```

Las pruebas móviles sustituyen el checkout de Culqi y usan un servidor de prueba
separado. Comprueban la integración del flujo de Fubito; no certifican una
transacción real ni la activación comercial del proveedor.
