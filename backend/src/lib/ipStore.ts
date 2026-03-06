import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";
const IP_FILE = path.join(DATA_DIR, "vm_ips.json");

function readIPs(): Record<string, string> {
  try {
    if (!fs.existsSync(IP_FILE)) return {};
    return JSON.parse(fs.readFileSync(IP_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeIPs(ips: Record<string, string>): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(IP_FILE, JSON.stringify(ips, null, 2));
}

export function getStoredIP(type: string, vmid: number): string | null {
  return readIPs()[`${type}:${vmid}`] || null;
}

export function setStoredIP(type: string, vmid: number, ip: string): void {
  const ips = readIPs();
  ips[`${type}:${vmid}`] = ip;
  writeIPs(ips);
}

export function clearStoredIP(type: string, vmid: number): void {
  const ips = readIPs();
  delete ips[`${type}:${vmid}`];
  writeIPs(ips);
}

export function getAllStoredIPs(): Record<string, string> {
  return readIPs();
}
