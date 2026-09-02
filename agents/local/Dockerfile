FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY agents ./agents
RUN corepack enable && pnpm install --frozen-lockfile
EXPOSE 8080
CMD ["pnpm", "--filter", "@tillu/local-agent", "start"]
