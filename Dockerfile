FROM node:20-bookworm-slim

# better-sqlite3 is a native module; these are only needed if npm can't fetch a prebuilt
# binary for this platform and has to compile from source.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first so this layer is cached across source-only changes.
COPY runtime/package.json runtime/package-lock.json* ./runtime/
RUN cd runtime && npm install --omit=dev

# server.js serves index.html plus these specific sibling directories at /dashboard/ — see
# runtime/server.js's own comment on why it's these five and never the whole project root
# (that would also expose tests/, scripts/, _archive/, .env, .git).
COPY index.html ./index.html
COPY app ./app
COPY persona ./persona
COPY communication ./communication
COPY schemas ./schemas
COPY data ./data
COPY config ./config
COPY runtime ./runtime

# HOST defaults to 127.0.0.1 in runtime/.env.example (loopback-only, correct for bare-metal)
# but that would bind the server to the container's own loopback only, making it unreachable
# through any port mapping — 0.0.0.0 is what a container actually needs.
ENV HOST=0.0.0.0
ENV PORT=3002
ENV DB_PATH=/app/runtime/data/carc.db
EXPOSE 3002

# SIGNING_SECRET is required for HMAC-signed verification responses (runtime/routes/verify.js)
# and must never be baked into the image — pass it at run time:
#   docker run -e SIGNING_SECRET=... -e CORS_ORIGIN=... -p 3002:3002 -v carc-data:/app/runtime/data carc
VOLUME /app/runtime/data

WORKDIR /app/runtime
CMD ["node", "server.js"]
