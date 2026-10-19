FROM node:20-alpine AS dependencies
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
COPY --from=dependencies /app/node_modules ./node_modules
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup --system --gid 10001 fubito \
    && adduser --system --uid 10001 --ingroup fubito fubito

COPY --from=builder --chown=fubito:fubito /app/public ./public
COPY --from=builder --chown=fubito:fubito /app/.next/standalone ./
COPY --from=builder --chown=fubito:fubito /app/.next/static ./.next/static

USER fubito
EXPOSE 3000

CMD ["node", "server.js"]

