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
    if (step === 292) {
      const parsed = JSON.parse(line);
      console.log(parsed.content);
      break;
    }
  }
}

searchLogs().catch(console.error);
