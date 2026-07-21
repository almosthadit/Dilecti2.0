import http from 'http';

function search(query, category) {
  const data = JSON.stringify({ query, category });
  const options = {
    hostname: '127.0.0.1',
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
        console.log(`[${category}] Query '${query}' returned ${json.length} results.`);
        json.slice(0, 3).forEach(m => console.log(`  - ${m.title} (${m.releaseYear || m.subtitle || 'N/A'}) [${m.sourceAttribution}]`));
      } catch (e) {
        console.log('Error parsing response:', body.substring(0, 100));
      }
    });
  });
  req.on('error', error => console.error(error));
  req.write(data);
  req.end();
}

search('the dink', 'movie');
search('the dink', 'any');
search('avatar', 'movie');
search('dink', 'movie');
