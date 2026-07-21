import http from 'http';

const data = JSON.stringify({ query: 'the dink', category: 'movie' });

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/universal-search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log(`Found ${json.length} total results:`);
      json.forEach(m => console.log(`- ${m.title} (${m.subtitle || 'N/A'}) [${m.sourceAttribution}]`));
    } catch (e) {
      console.log('Error parsing response:', body);
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
