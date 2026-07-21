const fs = require('fs');
let code = fs.readFileSync('src/components/CategoryZone.tsx', 'utf-8');

// Replace:
/*
      </div>
      </>
      )}
      <RecommendationModal 
*/
// With:
/*
      </>
      )}
      </div>
      <RecommendationModal 
*/
code = code.replace(
  /<\/div>\n\s*<\/>\n\s*\}\)\}\n\s*<RecommendationModal/s,
  '</>\n      )}\n      </div>\n      <RecommendationModal'
);

fs.writeFileSync('src/components/CategoryZone.tsx', code);
