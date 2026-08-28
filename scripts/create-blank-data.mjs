import { mkdirSync, writeFileSync } from 'node:fs';

const now = new Date();
const year = String(now.getFullYear());
const month = String(now.getMonth() + 1).padStart(2, '0');
const outputDir = new URL(`../public/data/review-data/${year}/`, import.meta.url);
const outputPath = new URL(`${month}.json`, outputDir);

const blankData = {
  generated_at: now.toISOString(),
  archive_month: `${year}/${month}`,
  items: [],
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(blankData, null, 2)}\n`);
console.log(`Created blank review data at public/data/review-data/${year}/${month}.json`);
