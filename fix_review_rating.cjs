const fs = require('fs');
let code = fs.readFileSync('src/components/ReviewEditor.tsx', 'utf-8');
code = code.replace(
  /<div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-xl font-bold font-serif shrink-0 shadow-lg dark:bg-white">\s*\{criticScore\.toFixed\(1\)\}\s*<\/div>/s,
  `<div 
                   className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-xl font-bold font-serif shrink-0 shadow-lg dark:bg-white cursor-pointer hover:bg-neutral-800 transition-colors group"
                   onClick={() => { setRating(0); setCriticScore(0); }}
                   title="Click to reset rating"
                 >
                   <span className="group-hover:hidden">{criticScore.toFixed(1)}</span>
                   <span className="hidden group-hover:block text-neutral-400">
                     <X className="w-6 h-6" />
                   </span>
                 </div>`
);
fs.writeFileSync('src/components/ReviewEditor.tsx', code);
