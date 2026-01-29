import net from 'net';
import { EventEmitter } from 'events';

export interface SOCKS5ProxyOptions {
  port?: number;
  host?: string;
  auth?: {
    username: string;
    password: string;
  };
}

/**
 * SOCKS5 proxy server for TX mode
 * Handles long-lived connections for slow bitrate
 */
export class SOCKS5Proxy extends EventEmitter {
  private server: net.Server;
  private port: number;
  private host: string;
  private auth?: { username: string; password: string };
  private connections: Map<string, net.Socket>;

  constructor(options: SOCKS5ProxyOptions = {}) {
    super();
    this.port = options.port || 1080;
    this.host = options.host || '127.0.0.1';
    this.auth = options.auth;
    this.connections = new Map();
    this.server = net.createServer(this.handleConnection.bind(this));
  }

  /**
   * Start the proxy server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`SOCKS5 proxy listening on ${this.host}:${this.port}`);
        resolve();
      });
      
      this.server.on('error', reject);
    });
  }

  /**
   * Stop the proxy server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all connections
      for (const socket of this.connections.values()) {
        socket.destroy();
      }
      this.connections.clear();

      this.server.close(() => {
        console.log('SOCKS5 proxy stopped');
        resolve();
      });
    });
  }

  /**
   * Handle incoming connection
   */
  private handleConnection(socket: net.Socket): void {
    const connectionId = `${socket.remoteAddress}:${socket.remotePort}`;
    this.connections.set(connectionId, socket);

    socket.on('close', () => {
      this.connections.delete(connectionId);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      this.connections.delete(connectionId);
    });

    // Set keepalive for long-lived connections
    socket.setKeepAlive(true, 30000);
    socket.setTimeout(300000); // 5 minute timeout

    this.handleSocks5Handshake(socket);
  }

  /**
   * Handle SOCKS5 handshake
   */
  private async handleSocks5Handshake(socket: net.Socket): Promise<void> {
    // Read greeting
    const greeting = await this.readBytes(socket, 2);
    if (!greeting || greeting[0] !== 0x05) {
      socket.end();
      return;
    }

    const numMethods = greeting[1];
    const methods = await this.readBytes(socket, numMethods);
    if (!methods) {
      socket.end();
      return;
    }

    // Send method selection (0x00 = no auth, 0x02 = username/password)
    const selectedMethod = this.auth ? 0x02 : 0x00;
    socket.write(Buffer.from([0x05, selectedMethod]));

    // Handle authentication if required
    if (this.auth) {
      const authSuccess = await this.handleAuth(socket);
      if (!authSuccess) {
        socket.end();
        return;
      }
    }

    // Handle connection request
    await this.handleRequest(socket);
  }

  /**
   * Handle authentication
   */
  private async handleAuth(socket: net.Socket): Promise<boolean> {
    const authData = await this.readBytes(socket, 2);
    if (!authData || authData[0] !== 0x01) {
      return false;
    }

    const usernameLen = authData[1];
    const username = await this.readBytes(socket, usernameLen);
    if (!username) return false;

    const passwordLenBuf = await this.readBytes(socket, 1);
    if (!passwordLenBuf) return false;

    const passwordLen = passwordLenBuf[0];
    const password = await this.readBytes(socket, passwordLen);
    if (!password) return false;

    const isValid = !!(this.auth &&
      username.toString() === this.auth.username &&
      password.toString() === this.auth.password);

    socket.write(Buffer.from([0x01, isValid ? 0x00 : 0x01]));
    return isValid;
  }

  /**
   * Handle SOCKS5 request
   */
  private async handleRequest(socket: net.Socket): Promise<void> {
    const request = await this.readBytes(socket, 4);
    if (!request || request[0] !== 0x05) {
      socket.end();
      return;
    }

    const cmd = request[1];
    const addrType = request[3];

    let addr: string;
    let port: number;

    // Parse address
    if (addrType === 0x01) {
      // IPv4
      const ipv4 = await this.readBytes(socket, 4);
      if (!ipv4) return;
      addr = Array.from(ipv4).join('.');
    } else if (addrType === 0x03) {
      // Domain name
      const lenBuf = await this.readBytes(socket, 1);
      if (!lenBuf) return;
      const len = lenBuf[0];
      const domain = await this.readBytes(socket, len);
      if (!domain) return;
      addr = domain.toString();
    } else if (addrType === 0x04) {
      // IPv6
      const ipv6 = await this.readBytes(socket, 16);
      if (!ipv6) return;
      addr = Array.from(ipv6).map(b => b.toString(16).padStart(2, '0')).join(':');
    } else {
      socket.end();
      return;
    }

    const portBuf = await this.readBytes(socket, 2);
    if (!portBuf) return;
    port = portBuf.readUInt16BE(0);

    // Only support CONNECT command
    if (cmd !== 0x01) {
      socket.write(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
      socket.end();
      return;
    }

    // Emit request event for handling
    this.emit('request', {
      address: addr,
      port,
      socket,
      reply: (success: boolean) => {
        const response = Buffer.from([0x05, success ? 0x00 : 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
        socket.write(response);
      }
    });
  }

  /**
   * Read exact number of bytes from socket
   */
  private readBytes(socket: net.Socket, count: number): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const buffer = socket.read(count);
      if (buffer && buffer.length === count) {
        resolve(buffer);
      } else {
        const onReadable = () => {
          const buf = socket.read(count);
          if (buf && buf.length === count) {
            socket.removeListener('readable', onReadable);
            resolve(buf);
          }
        };
        socket.on('readable', onReadable);
        
        // Timeout
        setTimeout(() => {
          socket.removeListener('readable', onReadable);
          resolve(null);
        }, 10000);
      }
    });
  }
}
