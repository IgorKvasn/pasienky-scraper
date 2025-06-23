# This Dockerfile is in a subdirectory.
# The build context should be the project root directory.
# Example build command from the root:
# docker build -t pasienky-app -f docs/dev-pasienky/Dockerfile .

# Stage 1: Build Stage
FROM arm64v8/node:22.16 AS builder

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
FROM arm64v8/node:22.16

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

# Install Chromium dependencies and Chromium itself
RUN apt-get update && \
    apt-get install -y wget ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 \
    libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Ensure home is owned by appuser
RUN chown -R appuser:nodejs /home/appuser

# Create Puppeteer cache directory and set permissions
RUN mkdir -p /home/appuser/.cache/puppeteer && \
    chown -R appuser:nodejs /home/appuser/.cache

ENV HOME=/home/appuser
ENV PUPPETEER_CACHE_DIR=/home/appuser/.cache/puppeteer

RUN npx puppeteer browsers install chrome

USER appuser

EXPOSE 3000

# Start the application
CMD [ "npm", "start" ] 