FROM node:22-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate
RUN pnpm build
RUN pnpm prune --prod

EXPOSE 3000

CMD ["node", "build"]
