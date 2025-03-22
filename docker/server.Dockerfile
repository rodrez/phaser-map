FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy server files (respecting .dockerignore)
COPY server ./server

# Copy any needed configuration files
COPY tsconfig.json ./

# Set environment variables
ENV NODE_ENV=development \
    PORT=3000

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Command to run the server
CMD ["npm", "run", "server"] 