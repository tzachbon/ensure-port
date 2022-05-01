import type { IFileSystem } from '@file-services/types';
import type { Ports } from 'ensure-port';

export function getPortsFromCacheDir(fs: IFileSystem, rootDir: string) {
  const portsPath = fs.resolve(rootDir, 'node_modules', '.cache', 'e2e-test-kit', 'ports');
  return fs.readdirSync(portsPath, 'utf8').map((port) => Number(port));
}

export async function allocatePorts(portsLength: number, ports: Ports) {
  const usedPorts = new Set<number>();
  let i = 0;

  while (++i <= portsLength) {
    const port = await ports.ensurePort();

    if (usedPorts.has(port)) {
      throw new Error(`Port ${port} has been used before`);
    } else {
      usedPorts.add(port);
    }
  }

  return {
    usedPorts,
  };
}
