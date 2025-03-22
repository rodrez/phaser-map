FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source files (respecting .dockerignore)
COPY src ./src
COPY public ./public
COPY index.html ./index.html
COPY tsconfig.json ./tsconfig.json
COPY vite ./vite

# Set environment variables
ENV NODE_ENV=development

# Expose the port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173 || exit 1

# Command to run the client
CMD ["npm", "run", "dev-nolog", "--", "--host", "0.0.0.0"] 