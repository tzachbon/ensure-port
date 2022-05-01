import type { IFileSystem } from '@file-services/types';
import { packageDirectory } from './package-dir';

interface Options {
  fs: IFileSystem;
  rootDir: string | undefined;
}

export function findCacheDir(name: string, { fs, rootDir }: Options) {
  if (process.env.CACHE_DIR && !['true', 'false', '1', '0'].includes(process.env.CACHE_DIR)) {
    const dir = fs.join(process.env.CACHE_DIR, name);

    fs.ensureDirectorySync(dir);

    return dir;
  }

  rootDir = packageDirectory({ fs, cwd: rootDir ?? process.cwd() });

  if (!rootDir) {
    return;
  }

  const nodeModules = getNodeModuleDirectory(rootDir, fs);
  if (!nodeModules) {
    return undefined;
  }

  return fs.join(rootDir, 'node_modules', '.cache', name);
}

function getNodeModuleDirectory(directory: string, fs: IFileSystem) {
  const nodeModules = fs.join(directory, 'node_modules');

  if (!fs.existsSync(nodeModules)) {
    return;
  }

  return nodeModules;
}
