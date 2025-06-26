# This Dockerfile is in a subdirectory.
# The build context should be the project root directory.
# Example build command from the root:
# docker build -t pasienky-app -f docs/dev-pasienky/Dockerfile .

# Stage 1: Build Stage
FROM ghcr.io/browserless/chromium:v2.31.1 AS builder

WORKDIR /usr/src/app

USER blessuser
RUN chown -R blessuser:nodejs *
# Install dependencies and build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build && npm prune --production

# Stage 2: Production Stage
FROM ghcr.io/browserless/chromium:v2.31.1

USER root

# Install Chromium dependencies
# RUN apt-get update && \
#     apt-get install -y --no-install-recommends \
#       wget ca-certificates fonts-liberation libappindicator3-1 libasound2 \
#       libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 \
#       libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 \
#       libxrandr2 xdg-utils && \
#     rm -rf /var/lib/apt/lists/*

# Create appuser and set up directories in one layer
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser && \
    mkdir -p /home/appuser/downloads /home/appuser/logs /home/appuser/.cache/puppeteer && \
    chown -R appuser:nodejs /home/appuser

WORKDIR /home/appuser

# Copy built app and dependencies from builder
COPY --from=builder --chown=appuser:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /usr/src/app/package.json .
COPY --from=builder --chown=appuser:nodejs /usr/src/app/ecosystem.config.js .

ENV HOME=/home/appuser
ENV PUPPETEER_CACHE_DIR=/home/appuser/.cache/puppeteer

USER blessuser

EXPOSE 3000

CMD [ "npm", "start" ] 