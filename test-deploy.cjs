const http = require('http');

const data = JSON.stringify({
  gitUrl: 'https://github.com/cuansite/afclifescience',
  projectName: 'test-deploy'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/deploy',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
