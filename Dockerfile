FROM node:20-alpine

WORKDIR /app

# Copy only package files first
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy remaining code
WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend

# Set working directory to backend
WORKDIR /app/backend

# Environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
