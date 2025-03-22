# Docker Development Environment

This directory contains Docker configurations for the development environment of the MMO Game.

## Directory Structure

- `server.Dockerfile`: Dockerfile for the server component
- `client.Dockerfile`: Dockerfile for the client/frontend component

## Getting Started

1. Make sure you have Docker and Docker Compose installed on your system.
2. Create an environment variable file by copying the example:
   ```bash
   cp .env.example .env
   ```
   Or use the helper script:
   ```bash
   ./dev.sh create-env
   ```
3. Run the development environment using our helper script:
   ```bash
   ./dev.sh start
   ```

This will start all services defined in the docker-compose.yml file.

## Available Services

The development environment includes the following services:

- **postgres**: PostgreSQL database for data storage
- **redis**: Redis for caching and real-time communications
- **server**: Node.js backend server
- **client**: Vite-powered frontend development server

## Helper Script

The `dev.sh` script provides various commands to manage the development environment:

```bash
./dev.sh [command]
```

Available commands:

- `start`: Start all containers
- `stop`: Stop all containers
- `restart`: Restart all containers
- `logs`: Show logs from all containers
- `logs:server`: Show logs from the server container
- `logs:client`: Show logs from the client container
- `logs:postgres`: Show logs from the PostgreSQL container
- `logs:redis`: Show logs from the Redis container
- `build`: Build all containers
- `build:server`: Build only the server container
- `build:client`: Build only the client container
- `shell:server`: Open a shell in the server container
- `shell:client`: Open a shell in the client container
- `shell:postgres`: Open a psql shell in the postgres container
- `shell:redis`: Open a redis-cli shell in the redis container
- `db:reset`: Reset the database
- `db:seed`: Seed the database with sample data
- `db:backup`: Backup the database
- `db:restore`: Restore the database from backup
- `clean`: Remove all containers and volumes
- `prune`: Remove all unused containers, networks, images, and volumes
- `status` or `ps`: Show the status of all containers
- `env`: Show all environment variables used by Docker
- `create-env`: Create a .env file with default values
- `help`: Show the help message

## Configuration

### Environment Variables

Environment variables are loaded from:

1. System environment variables
2. `.env` file in the project root
3. Default values in `docker-compose.yml`

Key environment variables:

- `COMPOSE_PROJECT_NAME`: Prefix for container names (default: "mmo")
- `NODE_ENV`: Node environment (default: "development")
- `POSTGRES_USER`: PostgreSQL username
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_DB`: PostgreSQL database name
- `REDIS_PASSWORD`: Redis password
- `JWT_SECRET`: Secret key for JWT authentication

For a complete list, see `.env.example`.

### .dockerignore

The `.dockerignore` file defines which files and directories should be excluded from the Docker build context. This helps to:

1. **Reduce build time**: By excluding unnecessary files
2. **Reduce image size**: By preventing unnecessary files from being copied
3. **Prevent sensitive information leakage**: By excluding environment-specific files

Key exclusions:

- Node modules and package management files
- Git repositories and history
- Build artifacts and logs
- IDE configuration files
- Test files and documentation

## Networking

Services communicate with each other using the `mmo-network` bridge network. Within this network:

- Services can be accessed by their service name (e.g., "postgres", "redis")
- Default ports are maintained inside the Docker network
- External ports are exposed as defined in the `docker-compose.yml`

## Troubleshooting

If you encounter any issues with the Docker development environment:

1. Check logs using `./dev.sh logs` to identify errors
2. Make sure ports 3000, 5173, 5432, and 6379 are not in use by other applications
3. Try rebuilding the containers with `./dev.sh build`
4. If data seems corrupted, you can reset everything with `./dev.sh clean` followed by `./dev.sh start`
5. Ensure your `.env` file has the correct configuration by comparing with `.env.example`
6. Check container status with `./dev.sh status`

## Note on Data Persistence

Data is persisted using Docker volumes:

- `postgres-data`: Stores PostgreSQL database files
- `redis-data`: Stores Redis data

These volumes persist even when containers are stopped or removed. To completely reset all data, use `./dev.sh clean`. 