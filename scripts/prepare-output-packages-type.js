import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

// eslint-disable-next-line no-console
const log = (...msgs) => console.log('[PrepareOutputPackagesType]', ...msgs);

async function run() {
  const distDir = join(rootDir, 'dist');
  const commonjsOutputDir = join(distDir, 'cjs');
  const esmOutputDir = join(distDir, 'mjs');

  log('Preparing output packages type...', { commonjsOutputDir, esmOutputDir });

  await Promise.all([
    writePackageJSON(commonjsOutputDir, { type: 'commonjs' }),
    writePackageJSON(esmOutputDir, { type: 'module' }),
  ]);

  log('Done.');
}

function writePackageJSON(dir, content) {
  log('Writing package.json...', { dir, content });
  return writeFile(join(dir, 'package.json'), JSON.stringify(content, null, 2));
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[PrepareOutputPackagesType]', error);
  process.exitCode = 1;
});
