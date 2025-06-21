# Stage 1: Build Stage
FROM node:20-slim AS builder

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY ../../package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# Stage 2: Production Stage
FROM node:20-slim

# Set user
# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

WORKDIR /home/appuser

# Copy built files and dependencies from the builder stage
COPY --chown=appuser:nodejs --from=builder /usr/src/app/dist ../../dist
COPY --chown=appuser:nodejs --from=builder /usr/src/app/node_modules ../../node_modules
COPY --chown=appuser:nodejs --from=builder /usr/src/app/package.json ../../package.json
COPY --chown=appuser:nodejs --from=builder /usr/src/app/ecosystem.config.js ../../ecosystem.config.js
COPY --chown=appuser:nodejs --from=builder /usr/src/app/downloads ../../downloads
COPY --chown=appuser:nodejs --from=builder /usr/src/app/logs ../../logs

# Switch to the non-root user
USER appuser

# Expose port
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ] 