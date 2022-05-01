import { nodeFs } from '@file-services/node';
import { safeListeningHttpServer } from 'create-listening-server';
import type { IFileSystem, WatchEventListener } from '@file-services/types';
import { findCacheDir } from './find-cache-dir';

interface PortsParameters {
  startPort?: number;
  endPort?: number;
}
interface PortsOptions {
  fs?: IFileSystem;
  rootDir?: string;
}

export class Ports {
  private portsPath: string;
  private visitedPorts: Set<number> = new Set();
  private start: number;
  private end: number;
  private fs: IFileSystem;
  private rootDir: string;
  private initialEdges: { start: number; end: number; reached: boolean };
  private watchListener: WatchEventListener;

  constructor({ startPort = 8000, endPort = 9000 }: PortsParameters = {}, options: PortsOptions = {}) {
    this.start = startPort;
    this.end = endPort;
    this.initialEdges = { start: this.start, end: this.end, reached: false };

    this.fs = options.fs ?? nodeFs;
    this.rootDir = options.rootDir ?? process.cwd();

    const tempDir = findCacheDir('e2e-test-kit', { fs: this.fs, rootDir: this.rootDir });

    if (tempDir) {
      this.fs.ensureDirectorySync(tempDir);
    }

    if (!tempDir) {
      throw new Error('Could not find a "e2e-test-kit" temp directory');
    }

    this.portsPath = this.fs.resolve(tempDir, 'ports');

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.watchListener = async () => {
      this.visitedPorts = await this.getPersistentPorts();
    };

    void this.fs.watchService.watchPath(this.portsPath, this.watchListener);
  }

  /**
   * Returns a reserved port.
   */
  public async ensurePort() {
    if (this.initialEdges.reached) {
      throw new Error(`All ports are used between ${this.initialEdges.start} and ${this.initialEdges.end}`);
    }

    if (this.start === this.end) {
      this.initialEdges.reached = true;
    }

    const preferredPort = await this.getPort();
    const { port, httpServer } = await safeListeningHttpServer(preferredPort);

    if (port !== preferredPort) {
      await this.setPort(port);
    }

    await new Promise((resolve, reject) => httpServer.close((error) => (error ? reject(error) : resolve(void 0))));

    this.updateEdges(port);

    return port;
  }

  /**
   * Un-mark a ports as used.
   *
   * @param currentPorts - optional, if provided it will release only these ports
   */
  public async releasePorts(currentPorts?: number[]) {
    await this.updatePersistentPorts((ports) => {
      for (const port of [...(currentPorts ?? this.visitedPorts)]) {
        ports.delete(port);
      }
    });
  }

  /**
   *
   * Sets a port as used.
   *
   * @param port - the port to mark as used
   */
  public async setPort(port: number) {
    await this.updatePersistentPorts((ports) => {
      ports.add(port);
    });
  }

  /**
   * Remove releases all the ports.
   */
  public async clean() {
    this.visitedPorts.clear();
    await this.fs.promises.rm(this.portsPath, { force: true });
  }

  /**
   * Unwatch ports changes
   */
  public dispose() {
    return this.fs.watchService.unwatchPath(this.portsPath, this.watchListener);
  }

  private async getPort() {
    const port = this.getNextPort();

    await this.setPort(port);

    return port;
  }

  private getNextPort(): number {
    let port = randomNumberBetween(this.start, this.end);

    while (this.visitedPorts.has(port)) {
      port = randomNumberBetween(this.start, this.end);
    }

    return port;
  }

  private async updatePersistentPorts(callback: (ports: Set<number>) => void | Promise<void>) {
    const ports = await this.getPersistentPorts();
    const newPorts = new Set(ports);

    await callback(newPorts);

    for (const port of ports) {
      if (newPorts.has(port)) {
        newPorts.delete(port);
        continue;
      }

      await this.fs.promises.rm(this.fs.join(this.portsPath, String(port)), { force: true });
    }

    await Promise.all(
      [...newPorts].map((port) => this.fs.promises.writeFile(this.fs.join(this.portsPath, String(port)), ''))
    );

    this.visitedPorts = await this.getPersistentPorts();
  }

  private async getPersistentPorts() {
    await this.fs.promises.ensureDirectory(this.portsPath);
    return this.fs.promises.readdir(this.portsPath).then((files) => new Set(files.map((file) => Number(file))));
  }

  private updateEdges(port: number) {
    if (port === this.start) {
      let candidatePort = this.start + 1;

      while (this.visitedPorts.has(candidatePort) && !(candidatePort === this.end)) {
        candidatePort++;
      }

      this.start = candidatePort;
    } else if (port === this.end) {
      let candidatePort = this.end - 1;

      while (this.visitedPorts.has(candidatePort) && !(candidatePort === this.start)) {
        candidatePort--;
      }

      this.end = candidatePort;
    }
  }
}

function randomNumberBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
