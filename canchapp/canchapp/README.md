# CanchApp — MVP

Sistema de reservas para canchas sintéticas. Un dueño se registra, crea su
cancha y comparte un link público (ej. `cancha.pe/c/los-olivos`). Los jugadores
ven la disponibilidad del día, eligen un slot, pagan el adelanto por Yape y
suben la captura. El dueño confirma desde su panel con un clic y le llega un
mensaje de WhatsApp al jugador.

**Stack:** FastAPI + PostgreSQL + Next.js 14 + Tailwind.

---

## Estructura

```
canchapp/
├── backend/          FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── core/         config, db, security, deps
│   │   ├── models/       Owner, Court, Reservation, BlockedSlot
│   │   ├── schemas/      Pydantic
│   │   ├── routers/      auth, courts, public, reservations
│   │   └── services/     whatsapp links, availability calc
│   ├── uploads/      archivos subidos (foto, QR Yape, capturas)
│   ├── requirements.txt
│   └── .env.example
├── frontend/         Next.js 14 (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               landing
│   │   │   ├── login/                 login dueño
│   │   │   ├── register/              registro dueño
│   │   │   ├── dashboard/             panel + crear cancha
│   │   │   └── c/[slug]/              página pública por cancha
│   │   ├── components/
│   │   └── lib/                       api client, types
│   ├── tailwind.config.ts
│   └── package.json
└── docker-compose.yml    Postgres local
```

## Prerrequisitos (Windows)

- Python 3.11+
- Node.js 18+ (recomiendo 20)
- Docker Desktop (para Postgres) — o instala Postgres local
- Git

## Setup paso a paso

### 1. Base de datos

```bash
cd canchapp
docker compose up -d
```

Esto levanta Postgres en `localhost:5432` con usuario/pass/db = `canchapp`.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # ajusta SECRET_KEY si quieres
uvicorn app.main:app --reload --port 8000
```

API en `http://localhost:8000`. Docs interactivas en `http://localhost:8000/docs`.

Las tablas se crean automáticamente al primer arranque (para MVP).

### 3. Frontend

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Frontend en `http://localhost:3000`.

## Flujo de prueba

1. Abre `http://localhost:3000` → click "Registrar cancha".
2. Crea tu cuenta de dueño (usa un email de prueba, password ≥ 8 chars,
   whatsapp en formato `+51987654321`).
3. Te redirige al dashboard. Click "Crear cancha".
4. Llena nombre, dirección, precio, horarios. Sube una foto y un QR de Yape si
   tienes (cualquier imagen sirve para probar).
5. Vuelve al dashboard. Verás el link público `/c/tu-slug`. Cópialo, ábrelo en
   modo incógnito (para no llevar el token).
6. En la página pública, elige fecha y un horario libre. Llena nombre/WhatsApp,
   sube cualquier imagen como "captura", confirma.
7. Vuelve al dashboard del dueño (sesión normal). Verás la reserva pendiente.
8. Click "Confirmar" → se abre WhatsApp Web con un mensaje pre-llenado para
   el jugador. La reserva pasa a "confirmada".

## Endpoints clave

- `POST /api/auth/register` — registrar dueño
- `POST /api/auth/login` — login (OAuth2 password form)
- `GET /api/auth/me` — info del dueño autenticado
- `POST /api/courts` — crear cancha
- `GET /api/courts` — listar mis canchas
- `POST /api/courts/{id}/upload` — subir foto/logo/QR
- `GET /api/public/courts/{slug}` — info pública de la cancha
- `GET /api/public/courts/{slug}/availability?fecha=YYYY-MM-DD`
- `POST /api/public/courts/{slug}/reservations` — crear reserva
- `PATCH /api/reservations/{id}` — cambiar estado
- `GET /api/reservations/{id}/whatsapp-link?action=confirm|reject`

## Decisiones de diseño

- **Auth simple por JWT** en localStorage. Suficiente para MVP. Para
  producción, considera httpOnly cookies y refresh tokens.
- **Tablas se crean con `Base.metadata.create_all`**. Para producción usa
  Alembic (ya está en requirements).
- **Uploads locales** en `./uploads`. Sirven via FastAPI con StaticFiles. Para
  producción mueve a S3/R2/Supabase Storage.
- **WhatsApp via `wa.me` links**, no API oficial. Cero costo, el dueño envía
  con su número personal. Si crece, migrar a WhatsApp Business API.
- **Slots de 1 hora** calculados en runtime (no materializados en BD). Es
  más simple y soporta cambios de horario sin migraciones.
- **Sin cobro en línea por ahora**: adelanto manual por Yape + verificación
  visual del dueño. Es 100x más rápido que integrar pasarela y suficiente para
  validar la idea.

## Próximos pasos (post-MVP)

- Email de notificación al dueño cuando llega reserva nueva
- Reservas recurrentes ("todos los martes")
- Múltiples canchas por dueño (ya soportado en BD, falta UI)
- Reportes mensuales (ingresos estimados, ocupación)
- Plan de pago: free → S/100/mes después de 60 días
- Integrar pasarela (Culqi o Izipay) si los dueños lo piden
- Mapa con todas las canchas de cancha.pe (cuando haya 5+)

## Notas para vender a dueños

Antes de codear más, hablá con 3 dueños de canchas en Arequipa:

1. ¿Cómo manejas reservas hoy?
2. ¿Cuántas se te caen por confusión o no-show?
3. ¿Cuánto tiempo de WhatsApp te toma por día?
4. ¿Pagarías S/100/mes por automatizarlo?

Si los 3 dicen que sí, sigue construyendo. Si te dicen que no, ajusta el
producto antes de meterle más horas.
