const fs = require('fs');
let code = fs.readFileSync('src/components/UniversalAddModal.tsx', 'utf-8');
code = code.replace(
  /<div className="w-16 h-16 bg-black\/5 text-black rounded-2xl flex items-center justify-center text-2xl font-bold font-serif shrink-0 border border-black\/10 dark:border-white\/10 dark:bg-white\/5 dark:text-white">\s*\{rating\.toFixed\(1\)\}\s*<\/div>/s,
  `<div 
                       className="w-16 h-16 bg-black/5 text-black rounded-2xl flex items-center justify-center text-2xl font-bold font-serif shrink-0 border border-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
                       onClick={() => { setRating(0); setCriticScore(0); }}
                       title="Click to reset rating"
                     >
                       <span className="group-hover:hidden">{rating.toFixed(1)}</span>
                       <span className="hidden group-hover:block text-neutral-400">
                         <X className="w-6 h-6" />
                       </span>
                     </div>`
);
fs.writeFileSync('src/components/UniversalAddModal.tsx', code);
