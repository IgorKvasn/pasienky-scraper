# This Dockerfile is in a subdirectory.
# The build context should be the project root directory.
# Example build command from the root:
# docker build -t pasienky-app -f docs/dev-pasienky/Dockerfile .

# Stage 1: Build Stage
FROM node:20 AS builder

WORKDIR /usr/src/app

# Copy package files from the root of the build context
COPY ./package*.json ./
RUN ls -al
RUN npm install

# Copy all source code from the build context
COPY . .

# Build the TypeScript project
RUN npm run build

# Prune development dependencies for a smaller image
RUN npm prune --production

# Stage 2: Production Stage
FROM node:20-slim

# Create a non-root user for better security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

WORKDIR /home/appuser

# Copy only the necessary files from the builder stage
COPY --chown=appuser:nodejs --from=builder /usr/src/app/dist ./dist
COPY --chown=appuser:nodejs --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=appuser:nodejs --from=builder /usr/src/app/package.json .
COPY --chown=appuser:nodejs --from=builder /usr/src/app/ecosystem.config.js .

# Create and set permissions for volumes
RUN mkdir -p downloads logs && \
    chown -R appuser:nodejs downloads logs

USER appuser

EXPOSE 3000

# Start the application using pm2-runtime
CMD [ "npm", "start" ] 