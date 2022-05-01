import type { IFileSystem } from '@file-services/types';

export function getPortsFromCacheDir(fs: IFileSystem, rootDir: string) {
  const portsPath = fs.resolve(rootDir, 'node_modules', '.cache', 'e2e-test-kit', 'ports');
  return fs.readdirSync(portsPath, 'utf8').map((port) => Number(port));
}
