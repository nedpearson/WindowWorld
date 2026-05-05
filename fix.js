const fs = require('fs');
let c = fs.readFileSync('server/src/modules/leads/prospecting.service.ts', 'utf8');

if (!c.includes('sanitizeForLog')) {
  c = c.replace(/import \{ logger \} from '\.\.\/\.\.\/shared\/utils\/logger';/, "import { logger, sanitizeForLog } from '../../shared/utils/logger';");
}

c = c.replace(/logger\.(info|warn|error)\(`([^`]*)`\);/g, (m, p1, p2) => {
  if (p2.includes('${')) {
    return `logger.${p1}(sanitizeForLog(\`${p2}\`));`;
  }
  return m;
});

// Also fix string concat if any
c = c.replace(/logger\.(info|warn|error)\('(.*?)' \+ (.*?)\);/g, (m, p1, p2, p3) => {
  return `logger.${p1}(sanitizeForLog('${p2}' + ${p3}));`;
});

fs.writeFileSync('server/src/modules/leads/prospecting.service.ts', c);
