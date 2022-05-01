import type { IFileSystem } from '@file-services/types';

export function packageDirectory({ fs, cwd }: { fs: IFileSystem; cwd: string }) {
  const file = fs.findClosestFileSync(cwd, 'package.json');

  return file && fs.dirname(file);
}
