import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.cwd(), 'dist');
const files = readdirSync(outputDirectory);

function totalBytes(pattern) {
  return files
    .filter((file) => pattern.test(file))
    .reduce(
      (total, file) => total + statSync(resolve(outputDirectory, file)).size,
      0
    );
}

const measurements = [
  {
    name: 'main JavaScript',
    bytes: totalBytes(/^index_.*\.js$/),
    budget: 920_000
  },
  {
    name: 'route-lazy docs JavaScript',
    bytes: totalBytes(/^docs-page_.*\.js$/),
    budget: 260_000
  },
  {
    name: 'application CSS',
    bytes: totalBytes(/^index_.*\.css$/),
    budget: 110_000
  }
];

for (const measurement of measurements) {
  const formattedSize = `${(measurement.bytes / 1024).toFixed(1)} KiB`;
  const formattedBudget = `${(measurement.budget / 1024).toFixed(1)} KiB`;
  console.log(`${measurement.name}: ${formattedSize} / ${formattedBudget}`);

  if (measurement.bytes > measurement.budget) {
    throw new Error(`${measurement.name} exceeds its initial bundle budget.`);
  }
}
