# fubito — MVP

Sistema de reservas para canchas sintéticas. Un dueño se registra, crea su
cancha y comparte un link público (ej. `fubito/c/los-olivos`). Los jugadores
ven la disponibilidad del día, eligen uno o varios horarios y pagan la reserva completa
con Yape mediante Culqi. El pago llega directamente al comercio Culqi de cada
dueño y la reserva queda confirmada sin subir capturas.

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
4. Llena nombre, dirección, precio y horarios. Desde **Pagos y plan**, conecta
   primero las llaves de prueba de tu propio comercio Culqi.
5. Vuelve al dashboard. Verás el link público `/c/tu-slug`. Cópialo, ábrelo en
   modo incógnito (para no llevar el token).
6. En la página pública, elige fecha y un horario libre. Llena tus datos y abre
   el checkout de Yape. En las canchas referenciales no se envía dinero.
7. Cuando Culqi aprueba el pago, la reserva queda confirmada y aparece en el
   dashboard del dueño.

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
- **Cobro por dueño**: cada dueño conecta sus propias llaves Culqi. La llave
  privada se guarda cifrada en el backend y nunca se expone al navegador.
- **Yape sin capturas**: Culqi Checkout genera un token temporal y el backend
  realiza el cargo. Fubito no recibe ni distribuye el dinero de las reservas.
- **Modelo de Fubito**: 30 días gratis y luego S/50 al mes. El cobro de esa
  mensualidad todavía está desactivado y se avisará antes de habilitarlo.

## Próximos pasos (post-MVP)

- Email de notificación al dueño cuando llega reserva nueva
- Reservas recurrentes ("todos los martes")
- Múltiples canchas por dueño (ya soportado en BD, falta UI)
- Reportes mensuales (ingresos estimados, ocupación)
- Activar el cobro del plan Fubito de S/50 al terminar la prueba
- Automatizar devoluciones de Culqi cuando el dueño cancela una reserva pagada
- Mapa con todas las canchas de fubito (cuando haya 5+)

## Notas para vender a dueños

Antes de codear más, hablá con 3 dueños de canchas en Arequipa:

1. ¿Cómo manejas reservas hoy?
2. ¿Cuántas se te caen por confusión o no-show?
3. ¿Cuánto tiempo de WhatsApp te toma por día?
4. ¿Pagarías S/100/mes por automatizarlo?

Si los 3 dicen que sí, sigue construyendo. Si te dicen que no, ajusta el
producto antes de meterle más horas.
