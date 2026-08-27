import { writeFileSync } from 'node:fs';

const outputPath = new URL('../public/data/review-data.json', import.meta.url);

const blankData = {
  generated_at: new Date().toISOString(),
  items: [],
};

writeFileSync(outputPath, `${JSON.stringify(blankData, null, 2)}\n`);
console.log('Created blank review data at public/data/review-data.json');
