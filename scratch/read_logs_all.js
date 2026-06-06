import fs from 'fs';
import readline from 'readline';

const logFile = 'C:/Users/casha/.gemini/antigravity-ide/brain/eb97307a-cc39-4951-a13e-05688cd7aec0/.system_generated/logs/transcript.jsonl';

async function searchLogs() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let step = 0;
  for await (const line of rl) {
    step++;
    const parsed = JSON.parse(line);
    const content = parsed.content || '';
    if (content.toLowerCase().includes('reopen')) {
      console.log(`\n--- [Step ${step}] [Source: ${parsed.source}] [Type: ${parsed.type}] ---`);
      // print first 500 characters
      console.log(content.substring(0, 1000));
    }
  }
}

searchLogs().catch(console.error);
