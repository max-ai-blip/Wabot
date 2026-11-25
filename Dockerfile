FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg python3 curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
CMD ["sh","-c","mkdir -p /app/data/session /app/data/media && { [ -f /app/data/config.json ] || cp /app/config.json /app/data/config.json; } && ln -sf /app/data/config.json /app/config.json && ln -sfn /app/data/session /app/session && ln -sfn /app/data/media /app/media && exec node index.js"]
