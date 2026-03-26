const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  conn.exec('curl -s -H "User-Agent: SupportFlow-Native/1.0" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiOGQxNzQ1MGMtZjA4MS00MGRkLTgwNjQtMzE3M2QyMzkzM2JkIiwidXNlcm5hbWUiOm51bGwsInJvbGUiOiJBUEkiLCJpYXQiOjE3NzIwNDgwMjIsImV4cCI6MTA0MTE5NjE2MjJ9.9Q6DdMUhL7K7eyaMWIkoKe9iYasWX9aNZJO1-Z7Xt3M" -H "X-Api-Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiOGQxNzQ1MGMtZjA4MS00MGRkLTgwNjQtMzE3M2QyMzkzM2JkIiwidXNlcm5hbWUiOm51bGwsInJvbGUiOiJBUEkiLCJpYXQiOjE3NzIwNDgwMjIsImV4cCI6MTA0MTE5NjE2MjJ9.9Q6DdMUhL7K7eyaMWIkoKe9iYasWX9aNZJO1-Z7Xt3M" https://go.ooo.limo/api/users/by-telegram-id/1495719377', (err, stream) => { 
    stream.on('close', () => { conn.end(); process.exit(0); })
    .on('data', data => process.stdout.write(data))
    .stderr.on('data', data => process.stderr.write(data)); 
  }); 
}).connect({ host: '93.183.83.53', port: 22, username: 'root', password: 'hFaNk+iB2GBi4h' });
