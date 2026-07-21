import fs from 'fs';

async function run() {
  const url = `http://localhost:3000/api/fill-missing-images`;
  
  // Just test if the local server responds
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        { id: '1', title: 'Taco Shack', category: 'food' },
        { id: '2', title: 'Home Slice Pizza', category: 'food' }
      ]
    })
  });
  console.log(await res.json());
}
run().catch(console.error);
