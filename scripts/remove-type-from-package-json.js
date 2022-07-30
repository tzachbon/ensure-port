import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const packageJsonPath = resolve('package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

Reflect.deleteProperty(packageJson, 'type');

writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
