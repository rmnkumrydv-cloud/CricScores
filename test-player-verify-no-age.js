const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const user = JSON.parse(data);
        console.log('Registered Player:', user.isVerified);
        
        const token = user.token;
        const putBody = JSON.stringify({ name: 'Testing Player No Age', isVerified: true, playerRole: 'Batsman' });
        
        const putReq = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/users/profile',
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
                'Content-Length': Buffer.byteLength(putBody)
            }
        }, (res2) => {
            let d2 = '';
            res2.on('data', chunk => d2 += chunk);
            res2.on('end', () => {
                const updated = JSON.parse(d2);
                console.log('PUT Player Profile (No Age) Result:', updated.isVerified ? 'VERIFIED' : 'NOT VERIFIED');
                console.log('Player Data:', JSON.stringify(updated, null, 2));
            });
        });
        putReq.write(putBody);
        putReq.end();
    });
});
req.write(JSON.stringify({
    name: 'Test Player 2',
    username: 'testplayer2_' + Date.now(),
    email: 'testplayer2_' + Date.now() + '@example.com',
    password: 'password123',
    role: 'player'
}));
req.end();
