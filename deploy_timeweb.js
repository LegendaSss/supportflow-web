const { Client } = require('ssh2');

const dockerCompose = `
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    volumes:
      - postgres_data:/var/lib/postgresql/data

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@db:5432/\${POSTGRES_DB}?schema=public
      - TELEGRAM_BOT_TOKEN=\${TELEGRAM_BOT_TOKEN}
      - REMNAWAVE_URL=\${REMNAWAVE_URL}
      - REMNAWAVE_PUBLIC_URL=\${REMNAWAVE_PUBLIC_URL}
      - REMNAWAVE_API_KEY=\${REMNAWAVE_API_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - db

  bot:
    build:
      context: ./bot
      dockerfile: Dockerfile
    restart: always
    environment:
      - DB_URL=postgresql+asyncpg://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@db:5432/\${POSTGRES_DB}
      - BOT_TOKEN=\${VPN_BOT_TOKEN}
      - ADMIN_IDS=\${ADMIN_IDS}
      - REMNAWAVE_URL=\${REMNAWAVE_URL}
      - REMNAWAVE_API_KEY=\${REMNAWAVE_API_KEY}
    depends_on:
      - db

volumes:
  postgres_data:
`;

const envFile = `
POSTGRES_USER=postgres
POSTGRES_PASSWORD=hFaNk+iB2GBi4h
POSTGRES_DB=supportflow
TELEGRAM_BOT_TOKEN=7684943328:AAHR76K3U8ckNS6OohIIiyS9VooIDgOOQ4Y
VPN_BOT_TOKEN=7889235087:AAGIkGbgvDPbD1SIwYlOXz0RVaku8f-yTN0
ADMIN_IDS=123456789,987654321
REMNAWAVE_URL=https://go.ooo.limo
REMNAWAVE_PUBLIC_URL=https://sub.ooo.limo
REMNAWAVE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiOGQxNzQ1MGMtZjA4MS00MGRkLTgwNjQtMzE3M2QyMzkzM2JkIiwidXNlcm5hbWUiOm51bGwsInJvbGUiOiJBUEkiLCJpYXQiOjE3NzIwNDgwMjIsImV4cCI6MTA0MTE5NjE2MjJ9.9Q6DdMUhL7K7eyaMWIkoKe9iYasWX9aNZJO1-Z7Xt3M
`;

const conn = new Client();
console.log('Connecting to Timeweb server...');

conn.on('ready', () => {
  console.log('Connection ready. Writing files and starting containers...');
  
  // Escape variables for bash
  const escapedCompose = dockerCompose.replace(/\\$/g, '\\\\$').replace(/\`/g, '\\\\`');
  
  const cmd = "cd /root/app && \\\n" +
    "sed -i 's|public.ecr.aws/docker/library/||g' web/Dockerfile bot/Dockerfile || true && \\\n" +
    "sed -i 's|FROM node:20-alpine|FROM public.ecr.aws/docker/library/node:20-alpine|g' web/Dockerfile && \\\n" +
    "sed -i 's|FROM python:3.11-slim|FROM public.ecr.aws/docker/library/python:3.11-slim|g' bot/Dockerfile && \\\n" +
    "cat << 'EOF' > docker-compose.yml\n" +
    escapedCompose.replace('postgres:15-alpine', 'public.ecr.aws/docker/library/postgres:15-alpine') + "\n" +
    "EOF\n" +
    "cat << 'EOF' > .env\n" +
    envFile + "\n" +
    "EOF\n" +
    "docker-compose build --no-cache && docker-compose up -d";

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Process completed with code ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('Connection Error:', err);
}).connect({
  host: '93.183.83.53',
  port: 22,
  username: 'root',
  password: 'hFaNk+iB2GBi4h',
  readyTimeout: 20000
});
