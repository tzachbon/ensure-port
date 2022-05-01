import { Ports } from 'ensure-port';
import { createMemoryFs } from '@file-services/memory';
import { expect } from 'expect';
import { getPortsFromCacheDir } from './helpers';
import type { IFileSystem } from '@file-services/types';

describe('ensurePort', () => {
  let ports: Ports;
  let fs: IFileSystem;

  beforeEach(() => {
    fs = createMemoryFs({
      '/node_modules': {},
      '/package.json': JSON.stringify({
        name: 'ensure-port',
        version: '1.0.0',
      }),
    });

    ports = new Ports({ startPort: 8000, endPort: 9000 }, { fs, rootDir: '/' });
  });

  it('should return a port in range', async () => {
    const port = await ports.ensurePort();

    expect(port).toBeGreaterThan(8000);
    expect(port).toBeLessThanOrEqual(9000);
  });

  it('should return a port that has not been used before', async () => {
    const usedPorts = new Set<number>();
    let i = 0;

    while (++i <= 1001) {
      const port = await ports.ensurePort();

      if (usedPorts.has(port)) {
        throw new Error(`Port ${port} has been used before`);
      } else {
        usedPorts.add(port);
      }
    }

    expect(usedPorts.size).toBe(1001);

    const actualPorts = [...usedPorts].sort((a, b) => a - b);
    const allAvailablePorts = Array.from({ length: 1001 }).map((_, i) => 8000 + i);

    expect(actualPorts).toEqual(allAvailablePorts);
    expect(actualPorts).toEqual(getPortsFromCacheDir(fs, '/').sort((a, b) => a - b));
  });
});
