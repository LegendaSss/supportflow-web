const net = require('net');

const client = new net.Socket();
client.setTimeout(2000);

console.log('Checking if port 5432 is still open on 93.183.83.53...');

client.connect(5432, '93.183.83.53', function() {
    console.log('WARNING: Port 5432 is STILL OPEN!');
    client.destroy();
});

client.on('error', function(err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        console.log('SUCCESS: Port 5432 is CLOSED (Connection Refused/Timed Out).');
    } else {
        console.log('Port 5432 check error:', err.message);
    }
    client.destroy();
});

client.on('timeout', function() {
    console.log('SUCCESS: Port 5432 is CLOSED (Timed Out).');
    client.destroy();
});
