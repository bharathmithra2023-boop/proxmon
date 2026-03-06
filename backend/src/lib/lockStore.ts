import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";
const LOCK_FILE = path.join(DATA_DIR, "locks.json");

function readLocks(): Set<string> {
  try {
    if (!fs.existsSync(LOCK_FILE)) return new Set();
    const data = JSON.parse(fs.readFileSync(LOCK_FILE, "utf-8"));
    return new Set(Array.isArray(data) ? data : []);
  } catch {
    return new Set();
  }
}

function writeLocks(locks: Set<string>): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify([...locks], null, 2));
}

function key(type: string, vmid: number) {
  return `${type}:${vmid}`;
}

export function isLocked(type: string, vmid: number): boolean {
  return readLocks().has(key(type, vmid));
}

export function lockVM(type: string, vmid: number): void {
  const locks = readLocks();
  locks.add(key(type, vmid));
  writeLocks(locks);
}

export function unlockVM(type: string, vmid: number): void {
  const locks = readLocks();
  locks.delete(key(type, vmid));
  writeLocks(locks);
}

export function getLockedKeys(): Set<string> {
  return readLocks();
}
