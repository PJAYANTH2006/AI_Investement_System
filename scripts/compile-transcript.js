const fs = require('fs');
const path = require('path');

const logsDir = './logs';
const jsonlPath = path.join(logsDir, 'chat_transcript.jsonl');
const mdPath = path.join(logsDir, 'chat_transcript.md');

if (!fs.existsSync(jsonlPath)) {
  console.error(`Source file ${jsonlPath} not found.`);
  process.exit(1);
}

const fileContent = fs.readFileSync(jsonlPath, 'utf8');
const lines = fileContent.split('\n');

let mdContent = `# AI Pairing Chat Transcript

This log contains the complete, chronological chat conversation between the developer and the AI agent during the construction of the AI Investment Research Agent.

---

`;

let turnNum = 1;

for (let line of lines) {
  if (!line.trim()) continue;
  try {
    const step = JSON.parse(line);
    if (step.type === 'USER_INPUT') {
      const userText = step.content || '';
      mdContent += `### 👤 User Turn ${turnNum}\n\n`;
      const cleanedText = userText.replace(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/g, '$1');
      mdContent += `${cleanedText.trim()}\n\n`;
      mdContent += `---\n\n`;
      turnNum++;
    } else if (step.type === 'PLANNER_RESPONSE') {
      const aiText = step.content || '';
      if (aiText.trim()) {
        mdContent += `### 🤖 AI Assistant\n\n`;
        mdContent += `${aiText.trim()}\n\n`;
        mdContent += `---\n\n`;
      }
    }
  } catch (err) {
    // Ignore lines that aren't valid JSON
  }
}

fs.writeFileSync(mdPath, mdContent, 'utf8');
console.log(`Markdown transcript compiled successfully at: ${mdPath}`);
process.exit(0);
