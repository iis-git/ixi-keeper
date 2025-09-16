# server/Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the server source
COPY . .

# Environment
ENV NODE_ENV=development
ENV PORT=3020

EXPOSE 3020

# Start in dev mode with nodemon for hot reload (bind mount will be used)
CMD ["npm", "run", "dev"]
