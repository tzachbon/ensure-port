import type { IFileSystem } from '@file-services/types';
import type { Ports } from 'ensure-port';

export function getPortsFromCacheDir(fs: IFileSystem, rootDir: string) {
  const portsPath = fs.resolve(rootDir, 'node_modules', '.cache', 'ensure-port', 'ports');
  return fs.readdirSync(portsPath, 'utf8').map((port) => Number(port));
}

export async function allocatePorts(portsLength: number, ports: Ports) {
  const usedPorts = new Set<number>();
  let i = 0;
  let port = -1;

  try {
    while (++i <= portsLength) {
      port = await ports.ensure();

      if (usedPorts.has(port)) {
        throw new Error(`Port ${port} has been used before`);
      } else {
        usedPorts.add(port);
      }
    }
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Found an error on the ${i} iteration and port ${String(port)}: ${error as Error}`);
  }

  return {
    usedPorts,
  };
}
