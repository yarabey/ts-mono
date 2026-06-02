// Ambient shim: socks-proxy-agent ships an `exports` map that the backend's
// `node10` module resolution can't read for types (Node/esbuild resolve it at
// runtime/build just fine). This declares the only surface we use.
declare module 'socks-proxy-agent' {
  import type { Agent } from 'http';
  export class SocksProxyAgent extends Agent {
    constructor(uri: string);
  }
}
