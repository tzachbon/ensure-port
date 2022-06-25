import { nodeFs } from '@file-services/node';
import { safeListeningHttpServer } from 'create-listening-server';
import type { IFileSystem, WatchEventListener } from '@file-services/types';
import { findCacheDir } from './find-cache-dir.js';

export interface PortsParameters {
  /**
   * Port to start searching from.
   */
  startPort?: number;

  /**
   * Port to end searching at.
   */
  endPort?: number;
  /**
   * Search strategy to look for a new port if one is not available
   */
  strategy?: 'random' | 'sequential';
}

export interface PortsOptions {
  /**
   * File system implementation, providing a subset of the original fs methods, a watch service, and path methods.
   * @default nodeFs
   * @see https://www.npmjs.com/package/@file-services/node
   */
  fs?: IFileSystem;
  /**
   * Root directory to use for the persistent ports data.
   */
  rootDir?: string;
}

export class Ports {
  private portsPath: string;
  private totalPorts: Set<number> = new Set();
  private localPorts: Set<number> = new Set();
  private start: number;
  private end: number;
  private fs: IFileSystem;
  private rootDir: string;
  private initialEdges: { start: number; end: number; reached: boolean };
  private watchListener: WatchEventListener;
  private strategy: 'random' | 'sequential';

  constructor(
    { startPort = 8000, endPort = 9000, strategy = 'random' }: PortsParameters = {},
    { fs = nodeFs, rootDir = process.cwd() }: PortsOptions = {}
  ) {
    this.start = startPort;
    this.end = endPort;
    this.strategy = strategy;

    this.fs = fs;
    this.rootDir = rootDir;
    this.initialEdges = { start: this.start, end: this.end, reached: false };

    const tempDir = findCacheDir('ensure-port', { fs: this.fs, rootDir: this.rootDir });

    if (tempDir) {
      this.fs.ensureDirectorySync(tempDir);
    }

    if (!tempDir) {
      throw new Error('Could not find a "ensure-port" temp directory');
    }

    this.portsPath = this.fs.resolve(tempDir, 'ports');

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.watchListener = async () => {
      this.totalPorts = await this.getPersistentPorts();
    };

    void this.fs.watchService.watchPath(this.portsPath, this.watchListener);
  }

  /**
   * Returns a reserved port.
   */
  public async ensure() {
    if (this.initialEdges.reached) {
      throw new Error(`All ports are used between ${this.initialEdges.start} and ${this.initialEdges.end}`);
    }

    if (this.start === this.end) {
      this.initialEdges.reached = true;
    }

    const preferredPort = await this.getPort();
    const { port, httpServer } = await safeListeningHttpServer(preferredPort);

    if (port !== preferredPort) {
      await this.set(port);
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
  public async release(currentPorts?: number[]) {
    await this.updatePersistentPorts((ports) => {
      for (const port of [...(currentPorts ?? this.localPorts)]) {
        this.localPorts.delete(port);
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
  public async set(port: number) {
    await this.updatePersistentPorts((ports) => {
      this.localPorts.add(port);
      ports.add(port);
    });
  }

  /**
   * Releases all the ports.
   */
  public async clean() {
    this.totalPorts.clear();
    await this.fs.promises.rm(this.portsPath, { force: true });
  }

  /**
   * Unwatch ports changes
   */
  public dispose() {
    return this.fs.watchService.unwatchPath(this.portsPath, this.watchListener);
  }

  private async getPort() {
    const port = await this.getNextPort();

    await this.set(port);

    return port;
  }

  private async getNextPort() {
    const tried = new Set<number>();
    let port: number | undefined;

    do {
      if (this.strategy === 'random') {
        port = randomNumberBetween(this.start, this.end);

        if (tried.size === this.end - this.start + 1) {
          throw new Error(`Could not find a free port between ${this.start} and ${this.end}`);
        }

        tried.add(port);
      } else if (this.strategy === 'sequential') {
        port = port ? port + 1 : this.start;
      } else {
        throw new Error(`Unknown strategy "${this.strategy}"`);
      }
    } while (await Promise.resolve(this.totalPorts.has(port)));

    return port;
  }

  private async updatePersistentPorts(callback: (ports: Set<number>) => void | Promise<void>) {
    const ports = await this.getPersistentPorts();
    const newPorts = new Set(ports);

    await callback(newPorts);

    const releasedPorts = new Set<number>();

    for (const port of ports) {
      if (newPorts.has(port)) {
        newPorts.delete(port);
        continue;
      }

      releasedPorts.add(port);
    }

    await Promise.all(
      [...releasedPorts].map((port) => this.fs.promises.rm(this.fs.join(this.portsPath, String(port)), { force: true }))
    );

    await Promise.all(
      [...newPorts].map((port) => this.fs.promises.writeFile(this.fs.join(this.portsPath, String(port)), ''))
    );

    this.totalPorts = await this.getPersistentPorts();
  }

  private async getPersistentPorts() {
    await this.fs.promises.ensureDirectory(this.portsPath);
    return this.fs.promises.readdir(this.portsPath).then((files) => new Set(files.map((file) => Number(file))));
  }

  private updateEdges(port: number) {
    if (port === this.start) {
      let candidatePort = this.start + 1;

      while (this.totalPorts.has(candidatePort) && !(candidatePort === this.end)) {
        candidatePort++;
      }

      this.start = candidatePort;
    } else if (port === this.end) {
      let candidatePort = this.end - 1;

      while (this.totalPorts.has(candidatePort) && !(candidatePort === this.start)) {
        candidatePort--;
      }

      this.end = candidatePort;
    }
  }
}

function randomNumberBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
