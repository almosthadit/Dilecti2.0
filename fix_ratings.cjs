const fs = require('fs');

let rCode = fs.readFileSync('src/components/ReviewEditor.tsx', 'utf-8');
rCode = rCode.replace(/onClick=\{\(\) => setReaction\(r\.id\)\}/g, "onClick={() => setReaction(reaction === r.id ? null : r.id)}");
fs.writeFileSync('src/components/ReviewEditor.tsx', rCode);

let aCode = fs.readFileSync('src/components/UniversalAddModal.tsx', 'utf-8');
aCode = aCode.replace(/onClick=\{\(\) => \{\s*setReaction\(r\.id\);\s*if \(status === 'up-next'\) setStatus\('completed'\);\s*\}\}/g, 
  "onClick={() => { const newR = reaction === r.id ? null : r.id; setReaction(newR); if (newR && status === 'up-next') setStatus('completed'); }}");
fs.writeFileSync('src/components/UniversalAddModal.tsx', aCode);

