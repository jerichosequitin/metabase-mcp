# Metabase MCP Server Dockerfile
# Base image: Node.js LTS Alpine for minimum footprint

FROM node:lts-alpine

LABEL maintainer="Jericho Sequitin <https://github.com/jerichosequitin>"
LABEL description="High-performance MCP server for Metabase with response optimization and robust error handling"
LABEL version="1.1.3"

# Set working directory
WORKDIR /usr/src/app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci --ignore-scripts

# Copy application code
COPY . .

# Run comprehensive tests during build
RUN npm run test:coverage

# Build the TypeScript project and clean up dev dependencies
RUN npm run build:fast && \
    chmod +x build/src/index.js && \
    npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Create export directory with proper permissions
RUN mkdir -p /home/node/exports && chown node:node /home/node/exports

# Default environment variables
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    EXPORT_DIRECTORY=/home/node/exports \
    METABASE_READ_ONLY_MODE=true

# Use non-root user for better security
USER node

# Volume for accessing exported files from host
VOLUME /home/node/exports

# Run the server
CMD ["node", "build/src/index.js"]
