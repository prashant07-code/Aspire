FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
