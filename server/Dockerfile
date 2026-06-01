FROM node:20-alpine

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY docs/ /app/docs/

ENV NODE_ENV=production
ENV PORT=3000
ENV ORDER_DATA_DIR=/app/server/data

EXPOSE 3000

CMD ["npm", "start"]
