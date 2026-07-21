const fs = require('fs');
let content = fs.readFileSync('./src/routes/ai.ts', 'utf8');

content = content.replace(/error\?\.status === "UNAVAILABLE"[\s\S]*?error\?\.status\?\.includes\("503"\) \|\|/g, 'String(error?.status).includes("503") ||');
content = content.replace(/error\?\.status === "UNAVAILABLE"[\s\S]*?error\?\.status\?\.includes\("429"\) \|\|/g, 'String(error?.status).includes("429") ||');
content = content.replace(/error\?\.status === "UNAVAILABLE"[\s\S]*?error\?\.status\?\.includes\("quota"\) \|\|/g, 'String(error?.status).includes("quota") ||');
content = content.replace(/error\?\.status === "UNAVAILABLE"[\s\S]*?error\?\.status\?\.includes\("RESOURCE_EXHAUSTED"\)/g, 'String(error?.status).includes("RESOURCE_EXHAUSTED")');
content = content.replace(/error\?\.status === "UNAVAILABLE" \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.status/g, 'error?.status');

fs.writeFileSync('./src/routes/ai.ts', content);
