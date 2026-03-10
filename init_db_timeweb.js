const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Timeweb server to initialize DB schema...');

conn.on('ready', () => {
  console.log('Connection ready. Pushing Prisma schema to the database...');
  const cmd = "cd /root/app && docker-compose exec -u root -T web sh -c \"rm -f prisma.config.* && npm install @prisma/config dotenv && echo \\\"import { defineConfig } from '@prisma/config'; export default defineConfig({ earlyAccess: true, schema: 'prisma/schema.prisma', datasource: { url: process.env.DATABASE_URL } });\\\" > prisma.config.mjs && npx prisma db push --accept-data-loss\"";

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('DB Initialization completed with code ' + code);
      conn.end();
      process.exit(code);
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
});

conn.connect({
  host: '93.183.83.53',
  port: 22,
  username: 'root',
  password: 'hFaNk+iB2GBi4h',
  readyTimeout: 99999
});
