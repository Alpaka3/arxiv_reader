# --- build ---
FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci
COPY . .
# public を使っていなくても COPY エラーにならないように作成しておく
RUN mkdir -p public
# Next.js をビルド（next.config.js に output: 'standalone' を設定）
RUN npm run build

# --- run ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# standalone では node_modules 相当が同梱されるので npm ci は不要
# public（空でもOK）
COPY --from=build /app/public ./public
# Next.js 出力物
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# .next/trace は省略（なくてもOK）
# COPY --from=build /app/.next/trace ./.next/trace

EXPOSE 3000
CMD ["node", "server.js"]
