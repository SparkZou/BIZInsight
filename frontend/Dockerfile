# Serves the server-rendered site. The build itself (build/client + build/server) is produced by
# GitHub Actions and bind-mounted into the container at /app/build, so this image only carries the
# runtime dependencies and rebuilds only when package.json changes.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

EXPOSE 3000
CMD ["node_modules/.bin/react-router-serve", "./build/server/index.js"]
