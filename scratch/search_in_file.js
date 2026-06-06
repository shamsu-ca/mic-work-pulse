import fs from 'fs';

const filePath = 'b:/anitgra ca/WORKPULSE/src/pages/ProjectsEventsPage.jsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

const queries = ['deploy', 'startDate', 'start_date', 'Start Date', 'sync', 'handleSavePhaseDate', 'recurrence_rule', 'is_recurring'];

queries.forEach(q => {
  console.log(`\n=== Matches for "${q}": ===`);
  let count = 0;
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(q.toLowerCase())) {
      if (count < 25) {
        console.log(`${index + 1}: ${line.trim()}`);
      }
      count++;
    }
  });
  console.log(`Total matches for "${q}": ${count}`);
});
