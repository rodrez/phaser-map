#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment variables
export COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-mmo}
export NODE_ENV=${NODE_ENV:-development}

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo -e "${BLUE}Loading environment variables from .env file...${NC}"
    export $(grep -v '^#' .env | xargs)
fi

function show_help {
    echo -e "${BLUE}MMO Game Development Helper${NC}"
    echo
    echo "Usage: ./dev.sh [command]"
    echo
    echo "Commands:"
    echo -e "  ${GREEN}start${NC}           Start all containers"
    echo -e "  ${GREEN}stop${NC}            Stop all containers"
    echo -e "  ${GREEN}restart${NC}         Restart all containers"
    echo -e "  ${GREEN}logs${NC}            Show logs from all containers"
    echo -e "  ${GREEN}logs:server${NC}     Show logs from the server container"
    echo -e "  ${GREEN}logs:client${NC}     Show logs from the client container"
    echo -e "  ${GREEN}logs:postgres${NC}   Show logs from the PostgreSQL container"
    echo -e "  ${GREEN}logs:redis${NC}      Show logs from the Redis container"
    echo -e "  ${GREEN}build${NC}           Build all containers"
    echo -e "  ${GREEN}build:server${NC}    Build only the server container"
    echo -e "  ${GREEN}build:client${NC}    Build only the client container"
    echo -e "  ${GREEN}shell:server${NC}    Open a shell in the server container"
    echo -e "  ${GREEN}shell:client${NC}    Open a shell in the client container"
    echo -e "  ${GREEN}shell:postgres${NC}  Open a psql shell in the postgres container"
    echo -e "  ${GREEN}shell:redis${NC}     Open a redis-cli shell in the redis container"
    echo -e "  ${GREEN}db:reset${NC}        Reset the database"
    echo -e "  ${GREEN}db:seed${NC}         Seed the database with sample data"
    echo -e "  ${GREEN}db:backup${NC}       Backup the database"
    echo -e "  ${GREEN}db:restore${NC}      Restore the database from backup"
    echo -e "  ${GREEN}clean${NC}           Remove all containers and volumes"
    echo -e "  ${GREEN}prune${NC}           Remove all unused containers, networks, images, and volumes"
    echo -e "  ${GREEN}status${NC}          Show the status of all containers"
    echo -e "  ${GREEN}ps${NC}              Alias for status"
    echo -e "  ${GREEN}env${NC}             Show all environment variables used by Docker"
    echo -e "  ${GREEN}create-env${NC}      Create a .env file with default values"
    echo -e "  ${GREEN}help${NC}            Show this help message"
    echo
    echo "Environment Variables:"
    echo -e "  ${YELLOW}COMPOSE_PROJECT_NAME${NC}  Prefix for container names (default: mmo)"
    echo -e "  ${YELLOW}NODE_ENV${NC}              Node environment (default: development)"
    echo
}

function check_docker {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is required but not installed.${NC}"
        exit 1
    fi

    if ! command -v docker compose &> /dev/null; then
        if ! command -v docker-compose &> /dev/null; then
            echo -e "${RED}Error: Docker Compose is required but not installed.${NC}"
            exit 1
        else
            # Use docker-compose if docker compose is not available
            DOCKER_COMPOSE="docker-compose"
        fi
    else
        # Use docker compose (newer version) if available
        DOCKER_COMPOSE="docker compose"
    fi
}

function show_env {
    echo -e "${BLUE}Environment Variables:${NC}"
    echo -e "${YELLOW}COMPOSE_PROJECT_NAME${NC}=${GREEN}${COMPOSE_PROJECT_NAME}${NC}"
    echo -e "${YELLOW}NODE_ENV${NC}=${GREEN}${NODE_ENV}${NC}"
    echo -e "${YELLOW}POSTGRES_USER${NC}=${GREEN}${POSTGRES_USER:-postgres}${NC}"
    echo -e "${YELLOW}POSTGRES_DB${NC}=${GREEN}${POSTGRES_DB:-mmogamedb}${NC}"
    echo -e "${YELLOW}JWT_SECRET${NC}=${GREEN}${JWT_SECRET:-<default from docker-compose>}${NC}"
}

function create_env_file {
    if [ -f .env ]; then
        echo -e "${YELLOW}.env file already exists. Do you want to overwrite it? [y/N]${NC}"
        read answer
        if [[ ! "$answer" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Operation cancelled.${NC}"
            return
        fi
    fi

    echo -e "${BLUE}Creating .env file with default values...${NC}"
    cat > .env << EOF
# Docker Compose configuration
COMPOSE_PROJECT_NAME=mmo

# Node environment
NODE_ENV=development

# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespass
POSTGRES_DB=mmogamedb

# Redis Configuration
REDIS_PASSWORD=redispass

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-in-production
EOF
    echo -e "${GREEN}.env file created successfully.${NC}"
}

function show_status {
    echo -e "${BLUE}Container status:${NC}"
    $DOCKER_COMPOSE ps
}

# Check if docker is installed and set DOCKER_COMPOSE
check_docker

# Parse command
case "$1" in
    start)
        echo -e "${GREEN}Starting all containers...${NC}"
        $DOCKER_COMPOSE up -d
        ;;
    stop)
        echo -e "${YELLOW}Stopping all containers...${NC}"
        $DOCKER_COMPOSE down
        ;;
    restart)
        echo -e "${YELLOW}Restarting all containers...${NC}"
        $DOCKER_COMPOSE down && $DOCKER_COMPOSE up -d
        ;;
    logs)
        echo -e "${BLUE}Showing logs from all containers...${NC}"
        $DOCKER_COMPOSE logs -f
        ;;
    logs:server)
        echo -e "${BLUE}Showing logs from the server container...${NC}"
        $DOCKER_COMPOSE logs -f server
        ;;
    logs:client)
        echo -e "${BLUE}Showing logs from the client container...${NC}"
        $DOCKER_COMPOSE logs -f client
        ;;
    logs:postgres)
        echo -e "${BLUE}Showing logs from the PostgreSQL container...${NC}"
        $DOCKER_COMPOSE logs -f postgres
        ;;
    logs:redis)
        echo -e "${BLUE}Showing logs from the Redis container...${NC}"
        $DOCKER_COMPOSE logs -f redis
        ;;
    build)
        echo -e "${GREEN}Building all containers...${NC}"
        $DOCKER_COMPOSE build
        ;;
    build:server)
        echo -e "${GREEN}Building server container...${NC}"
        $DOCKER_COMPOSE build server
        ;;
    build:client)
        echo -e "${GREEN}Building client container...${NC}"
        $DOCKER_COMPOSE build client
        ;;
    shell:server)
        echo -e "${BLUE}Opening a shell in the server container...${NC}"
        $DOCKER_COMPOSE exec server sh
        ;;
    shell:client)
        echo -e "${BLUE}Opening a shell in the client container...${NC}"
        $DOCKER_COMPOSE exec client sh
        ;;
    shell:postgres)
        echo -e "${BLUE}Opening a psql shell in the postgres container...${NC}"
        $DOCKER_COMPOSE exec postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-mmogamedb}
        ;;
    shell:redis)
        echo -e "${BLUE}Opening a redis-cli shell in the redis container...${NC}"
        $DOCKER_COMPOSE exec redis redis-cli -a ${REDIS_PASSWORD:-redispass}
        ;;
    db:reset)
        echo -e "${YELLOW}Resetting the database...${NC}"
        $DOCKER_COMPOSE exec server npm run db:reset
        ;;
    db:seed)
        echo -e "${GREEN}Seeding the database with sample data...${NC}"
        $DOCKER_COMPOSE exec server npm run db:seed
        ;;
    db:backup)
        echo -e "${GREEN}Backing up the database...${NC}"
        $DOCKER_COMPOSE exec server npm run db:backup
        ;;
    db:restore)
        echo -e "${GREEN}Restoring the database from backup...${NC}"
        $DOCKER_COMPOSE exec server npm run db:restore
        ;;
    clean)
        echo -e "${RED}Removing all containers and volumes...${NC}"
        $DOCKER_COMPOSE down -v
        ;;
    prune)
        echo -e "${RED}Removing all unused containers, networks, images, and volumes...${NC}"
        echo -e "${YELLOW}This will remove all unused Docker resources. Are you sure? [y/N]${NC}"
        read answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            docker system prune -a --volumes
        else
            echo -e "${YELLOW}Operation cancelled.${NC}"
        fi
        ;;
    status|ps)
        show_status
        ;;
    env)
        show_env
        ;;
    create-env)
        create_env_file
        ;;
    *)
        show_help
        ;;
esac 