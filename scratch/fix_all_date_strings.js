import fs from 'fs';

const files = [
  'b:/anitgra ca/WORKPULSE/src/pages/ReportsPage.jsx',
  'b:/anitgra ca/WORKPULSE/src/pages/PlanningPage.jsx',
  'b:/anitgra ca/WORKPULSE/src/pages/NotificationsPage.jsx',
  'b:/anitgra ca/WORKPULSE/src/pages/AllTasksPage.jsx',
  'b:/anitgra ca/WORKPULSE/src/pages/ProjectsEventsPage.jsx'
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} does not exist.`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Add getISTDateString import if not present
  if (content.includes('from \'../lib/dateUtils\'') || content.includes('from "../lib/dateUtils"')) {
    if (!content.includes('getISTDateString')) {
      content = content.replace(
        /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]\.\.\/lib\/dateUtils['"]/g,
        (match, p1) => {
          const imports = p1.split(',').map(x => x.trim());
          if (!imports.includes('getISTDateString')) {
            imports.push('getISTDateString');
          }
          return `import { ${imports.join(', ')} } from '../lib/dateUtils'`;
        }
      );
    }
  } else {
    // If no dateUtils import at all (like in some files), import it
    console.log(`Warning: ${filePath} does not seem to import dateUtils.`);
  }

  // 2. Perform replacements
  let newContent = content;

  // Pattern: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]
  newContent = newContent.replace(
    /new\s+Date\(\s*new\s+Date\(\)\.setDate\(\s*new\s+Date\(\)\.getDate\(\)\s*\+\s*1\s*\)\s*\)\.toISOString\(\)\.split\('T'\)\[0\]/g,
    'getISTDateString(new Date(Date.now() + 86400000))'
  );

  // Pattern: new Date(lastArchive.archive_date).toISOString().split('T')[0]
  newContent = newContent.replace(
    /new\s+Date\(\s*lastArchive\.archive_date\s*\)\.toISOString\(\)\.split\('T'\)\[0\]/g,
    'getISTDateString(lastArchive.archive_date)'
  );

  // Pattern: new Date(completed_at/t.completed_at/etc.).toISOString().split('T')[0]
  newContent = newContent.replace(
    /new\s+Date\(\s*([^)]+)\s*\)\.toISOString\(\)\.split\('T'\)\[0\]/g,
    'getISTDateString($1)'
  );

  // Pattern: yesterday.toISOString().split('T')[0]
  newContent = newContent.replace(
    /([a-zA-Z0-9_\.]+)\.toISOString\(\)\.split\('T'\)\[0\]/g,
    (match, p1) => {
      // Avoid matching new Date().toISOString()
      if (p1 === 'Date') return match;
      return `getISTDateString(${p1})`;
    }
  );

  // Pattern: new Date().toISOString().split('T')[0]
  newContent = newContent.replace(
    /new\s+Date\(\s*\)\.toISOString\(\)\.split\('T'\)\[0\]/g,
    'getISTDateString()'
  );

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Successfully processed and updated: ${filePath}`);
  } else {
    console.log(`No changes made to: ${filePath}`);
  }
});
