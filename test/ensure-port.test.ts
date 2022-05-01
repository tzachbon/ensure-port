import { Ports } from 'ensure-port';
import { createMemoryFs } from '@file-services/memory';
import { expect } from 'expect';
import { allocatePorts, getPortsFromCacheDir } from './helpers';
import type { IFileSystem } from '@file-services/types';

describe('ensurePort', () => {
  let ports: Ports;
  let fs: IFileSystem;

  const startPort = 8989;
  const endPort = 9989;

  beforeEach(() => {
    fs = createMemoryFs({
      '/node_modules': {},
      '/package.json': JSON.stringify({
        name: 'ensure-port',
        version: '1.0.0',
      }),
    });

    ports = new Ports({ startPort, endPort }, { fs, rootDir: '/' });
  });

  afterEach(async () => {
    await ports.dispose();
  });

  it('should return a port in range', async () => {
    const port = await ports.ensurePort();

    expect(port).toBeGreaterThanOrEqual(startPort);
    expect(port).toBeLessThanOrEqual(endPort);
  });

  it('should return a port that has not been used before', async () => {
    const { usedPorts } = await allocatePorts(endPort - startPort + 1, ports);

    expect(usedPorts.size).toBe(1001);

    const actualPorts = [...usedPorts].sort((a, b) => a - b);
    const allAvailablePorts = Array.from({ length: 1001 }).map((_, i) => startPort + i);

    expect(actualPorts).toEqual(allAvailablePorts);
    expect(actualPorts).toEqual(getPortsFromCacheDir(fs, '/').sort((a, b) => a - b));
  });

  it('should throw when no ports are available', async () => {
    await expect(allocatePorts(endPort - startPort + 2, ports)).rejects.toThrowError(
      `All ports are used between ${startPort} and ${endPort}`
    );
  });

  it('should release only local ports', async () => {
    const anotherPorts = new Ports({ startPort, endPort }, { fs, rootDir: '/' });

    await ports.ensurePort();
    const anotherPort = await anotherPorts.ensurePort();

    await ports.releasePorts();

    expect(getPortsFromCacheDir(fs, '/')).toEqual([anotherPort]);
  });
});
