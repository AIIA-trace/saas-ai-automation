const https = require('https');

const options = {
  hostname: 'westeurope.api.cognitive.microsoft.com',
  port: 443,
  path: '/',
  method: 'HEAD'
};

const req = https.request(options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log('✅ Headers:', res.headers);
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.end();
