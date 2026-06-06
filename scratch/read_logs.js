import fs from 'fs';
import readline from 'readline';

const logFile = 'C:/Users/casha/.gemini/antigravity-ide/brain/eb97307a-cc39-4951-a13e-05688cd7aec0/.system_generated/logs/transcript.jsonl';

async function searchLogs() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const keywords = ['reopen', 'self task', 'notification', 'audit'];
  console.log("Searching logs for keywords:", keywords);

  let step = 0;
  for await (const line of rl) {
    step++;
    const parsed = JSON.parse(line);
    const content = parsed.content || '';
    
    // Check if any keyword matches
    const matches = keywords.filter(kw => content.toLowerCase().includes(kw));
    if (matches.length > 0 && parsed.source === 'USER_EXPLICIT') {
      console.log(`\n--- [Step ${step}] Match found for user message (Keywords: ${matches.join(', ')}): ---`);
      console.log(content);
    }
  }
}

searchLogs().catch(console.error);
