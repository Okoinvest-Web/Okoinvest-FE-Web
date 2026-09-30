FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY src ./src
COPY sql ./sql
USER node
EXPOSE 8443 8081
CMD ["node", "src/index.js"]
