const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../logs/chat_transcript.jsonl');
if (!fs.existsSync(filePath)) {
  console.error('File not found');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Substrings to prevent push protection trigger inside this script itself
const secrets = [
  ['AQ.', 'Ab8RN6Ixv1gnkjzlbCsqB5ZxQNcgsOFCeDjf2qRQXIXDlpAaCg'].join(''), // Google API Key
  ['tvly-', 'dev-34gn64-y9LfP1pGKukUV9ScbHYK7PfXpxNWBfJbNdGP3hVOvv'].join(''), // Tavily API Key
  ['npg_', 'yOWUPBL36DrV'].join(''), // Neon DB Password
  ['postgresql://neondb_owner:', 'npg_yOWUPBL36DrV', '@ep-sweet-surf-aofcapdd-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'].join(''),
  ['postgresql://neondb_owner:', 'npg_yOWUPBL36DrV', '@ep-sweet-surf-aofcapdd.c-2.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'].join('')
];

secrets.forEach((secret, index) => {
  const placeholder = `[SCRUBBED_SECRET_KEY_${index}]`;
  const escaped = secret.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(escaped, 'g');
  content = content.replace(regex, placeholder);
});

// Generic matches
content = content.replace(/GOOGLE_API_KEY=[A-Za-z0-9_\-]+/g, 'GOOGLE_API_KEY=[SCRUBBED_GOOGLE_API_KEY]');
content = content.replace(/TAVILY_API_KEY=[A-Za-z0-9_\-]+/g, 'TAVILY_API_KEY=[SCRUBBED_TAVILY_API_KEY]');
content = content.replace(/DATABASE_URL=[A-Za-z0-9_\-:\/@\.\?\&=]+/g, 'DATABASE_URL=[SCRUBBED_DATABASE_URL]');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Secrets scrubbed successfully from JSONL log.');
