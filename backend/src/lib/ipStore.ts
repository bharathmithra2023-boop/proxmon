import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";
const IP_FILE = path.join(DATA_DIR, "vm_ips.json");
const AGENT_IP_FILE = path.join(DATA_DIR, "vm_ips_agent.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile(file: string): Record<string, string> {
  try {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return {};
  }
}

function writeFile(file: string, data: Record<string, string>): void {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Manual overrides ---

export function getStoredIP(type: string, vmid: number): string | null {
  return readFile(IP_FILE)[`${type}:${vmid}`] || null;
}

export function setStoredIP(type: string, vmid: number, ip: string): void {
  const ips = readFile(IP_FILE);
  ips[`${type}:${vmid}`] = ip;
  writeFile(IP_FILE, ips);
}

export function clearStoredIP(type: string, vmid: number): void {
  const ips = readFile(IP_FILE);
  delete ips[`${type}:${vmid}`];
  writeFile(IP_FILE, ips);
}

export function getAllStoredIPs(): Record<string, string> {
  return readFile(IP_FILE);
}

// --- Guest-agent IP cache (auto-updated, lower priority than manual overrides) ---

export function setAgentIP(type: string, vmid: number, ip: string): void {
  const ips = readFile(AGENT_IP_FILE);
  ips[`${type}:${vmid}`] = ip;
  writeFile(AGENT_IP_FILE, ips);
}

export function clearAgentIP(type: string, vmid: number): void {
  const ips = readFile(AGENT_IP_FILE);
  delete ips[`${type}:${vmid}`];
  writeFile(AGENT_IP_FILE, ips);
}

export function getAllAgentIPs(): Record<string, string> {
  return readFile(AGENT_IP_FILE);
}
