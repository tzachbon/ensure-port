# Ensure Port

[![Build Status](https://github.com/tzachbon/ensure-port/workflows/tests/badge.svg)](https://github.com/tzachbon/ensure-port/actions)

Makes sure you get an available port.

## Installation

```bash
npm i ensure-port
```

```bash
yarn add ensure-port
```

## Usage

```ts
import { Ports } from 'ensure-port';

const ports = new Ports({
  startPort: 8000,
  endPort: 9000,
});

const port = await ports.ensure(); // This would be a random port between 8000 and 9000 that is not used (validated again file-system and http server)

// When you finish - remove watcher
await ports.dispose();
```



## How does it work?

It saves inside your `node_modules` a directory that contain all the ports that are in use.
This is why it works in parallel.

## License

[MIT](./LICENSE)

## Contributing

Feel free to fork and create pull requests!
