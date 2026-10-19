import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Abstracție de stocare. În dezvoltare: disc local. În producție se adaugă un driver
 * S3-compatibil (Cloudflare R2 / AWS S3) cu aceeași interfață — [PLANIFICAT].
 */
export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(keys: string[]): Promise<void>;
}

class LocalStorage implements StorageDriver {
  constructor(private root: string) {}

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    // Protecție împotriva path traversal: cheia trebuie să rămână în directorul de stocare.
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Cheie de stocare invalidă.");
    return full;
  }

  async put(key: string, data: Buffer) {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }

  async get(key: string) {
    try {
      return await readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async remove(keys: string[]) {
    await Promise.all(keys.map((k) => rm(this.resolve(k), { force: true })));
  }
}

let driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  driver ??= new LocalStorage(path.resolve(process.env.STORAGE_DIR ?? "./storage"));
  return driver;
}
