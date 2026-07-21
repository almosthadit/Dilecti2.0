const fs = require('fs');
let content = fs.readFileSync('./src/routes/ai.ts', 'utf8');

// Replace the massive multi-line OR conditions with a clean function call or simpler condition
content = content.replace(/error\?\.status === "UNAVAILABLE" \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.status === 429 \|\| error\?\.status === "UNAVAILABLE" \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.status === 503 \|\| error\?\.status === "UNAVAILABLE" \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.status === "UNAVAILABLE" \|\| error\?\.status === "UNAVAILABLE" \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.status\?\.includes\("503"\) \|\|/g, 'String(error?.status).includes("503") ||');
content = content.replace(/error\?\.status === "UNAVAILABLE" \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.status\?\.includes\("429"\) \|\|/g, 'String(error?.status).includes("429") ||');
content = content.replace(/error\?\.status === "UNAVAILABLE" \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.status\?\.includes\("quota"\) \|\|/g, 'String(error?.status).includes("quota") ||');
content = content.replace(/error\?\.status === "UNAVAILABLE" \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.status\?\.includes\("RESOURCE_EXHAUSTED"\)/g, 'String(error?.status).includes("RESOURCE_EXHAUSTED")');

// Replace the weird warn string
content = content.replace(/error\?\.status === "UNAVAILABLE" \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.status/g, 'error?.status');

fs.writeFileSync('./src/routes/ai.ts', content);
