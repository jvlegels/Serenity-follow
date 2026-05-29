declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
};

declare module 'node:fs' {
  export function createReadStream(path: string): { pipe(destination: unknown): void };
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function statSync(path: string): { isFile(): boolean };
  export function writeFileSync(path: string, data: string): void;
}

declare module 'node:http' {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    headers: { host?: string };
  }

  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string>): void;
    end(data?: string): void;
  }

  export function createServer(
    listener: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
  ): { listen(port: number, callback?: () => void): void };
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function extname(path: string): string;
  export function join(...paths: string[]): string;
  export function normalize(path: string): string;
}
