# client/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the client source
COPY . .

# Vite dev server config already binds 0.0.0.0:3021 in vite.config.ts
EXPOSE 3021

CMD ["npm", "run", "dev"]
