const fs = require('fs');
let content = fs.readFileSync('./src/routes/ai.ts', 'utf8');

const s503 = 'error?.status === "UNAVAILABLE" || error?.message?.includes("high demand") || error?.status === 429 || error?.status === "UNAVAILABLE" || error?.message?.includes("high demand") || error?.status === 503 || error?.status === "UNAVAILABLE" || error?.message?.includes("high demand") || error?.status === "UNAVAILABLE" || error?.status === "UNAVAILABLE" || error?.message?.includes("high demand") || error?.status?.includes("503") ||';
const s429 = 'error?.status === "UNAVAILABLE" || error?.message?.includes("high demand") || error?.status?.includes("429") ||';
const squota = 'error?.status === "UNAVAILABLE" || error?.message?.includes("high demand") || error?.status?.includes("quota") ||';
const sres = 'error?.status === "UNAVAILABLE" || error?.message?.includes("high demand") || error?.status?.includes("RESOURCE_EXHAUSTED")';

content = content.split(s503).join('String(error?.status).includes("503") ||');
content = content.split(s429).join('String(error?.status).includes("429") ||');
content = content.split(squota).join('String(error?.status).includes("quota") ||');
content = content.split(sres).join('String(error?.status).includes("RESOURCE_EXHAUSTED")');

content = content.split('error?.status === "UNAVAILABLE" || error?.message?.includes("high demand") || error?.status').join('error?.status');

fs.writeFileSync('./src/routes/ai.ts', content);
