import { readFileSync } from 'node:fs';

const readmes = ['packages/core/README.md', 'packages/cli/README.md', 'packages/mcp/README.md'];
const failures = [];

for (const file of readmes) {
  const lines = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n');
  let fences = 0;
  for (let index = 0; index < lines.length; index++) {
    if (lines[index].startsWith('```')) fences++;
    if (!lines[index].trim().startsWith('|')) continue;
    const block = [];
    const firstLine = index;
    while (index < lines.length && lines[index].trim().startsWith('|')) block.push(lines[index++].trim());
    index--;
    if (block.length < 2 || !/^\|(?:\s*:?-+:?\s*\|)+$/.test(block[1])) {
      failures.push(`${file}:${firstLine + 1}: malformed Markdown table separator`);
      continue;
    }
    const columns = block[0].split('|').length - 2;
    block.forEach((row, rowIndex) => {
      const rowColumns = row.split('|').length - 2;
      if (rowColumns !== columns) failures.push(`${file}:${firstLine + rowIndex + 1}: table has ${rowColumns} columns; expected ${columns}`);
    });
  }
  if (fences % 2 !== 0) failures.push(`${file}: unclosed fenced code block`);
}

if (failures.length) {
  console.error(`Package README check failed (${failures.length}):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Package README check passed for ${readmes.length} npm packages.`);
