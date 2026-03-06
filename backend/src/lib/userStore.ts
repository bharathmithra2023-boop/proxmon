import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export type Role = "admin" | "operator" | "viewer";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  active: boolean;
}

export interface SafeUser {
  id: string;
  username: string;
  role: Role;
  fullName: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  active: boolean;
}

const DATA_DIR = process.env.DATA_DIR || "/app/data";
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readUsers(): User[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeUsers(users: User[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function toSafe(user: User): SafeUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export function initDefaultAdmin() {
  const users = readUsers();
  if (users.length === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    const admin: User = {
      id: "1",
      username: "admin",
      passwordHash: hash,
      role: "admin",
      fullName: "Administrator",
      email: "admin@proxmon.local",
      createdAt: new Date().toISOString(),
      active: true,
    };
    writeUsers([admin]);
    console.log("[Auth] Default admin created: admin / admin123");
  }
}

export function findByUsername(username: string): User | undefined {
  return readUsers().find((u) => u.username === username);
}

export function findById(id: string): User | undefined {
  return readUsers().find((u) => u.id === id);
}

export function getAllUsers(): SafeUser[] {
  return readUsers().map(toSafe);
}

export function validatePassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}

export function updateLastLogin(id: string) {
  const users = readUsers();
  const u = users.find((u) => u.id === id);
  if (u) {
    u.lastLogin = new Date().toISOString();
    writeUsers(users);
  }
}

export function createUser(data: {
  username: string;
  password: string;
  role: Role;
  fullName: string;
  email: string;
}): SafeUser {
  const users = readUsers();
  if (users.find((u) => u.username === data.username)) {
    throw new Error("Username already exists");
  }
  const newUser: User = {
    id: Date.now().toString(),
    username: data.username,
    passwordHash: bcrypt.hashSync(data.password, 10),
    role: data.role,
    fullName: data.fullName,
    email: data.email,
    createdAt: new Date().toISOString(),
    active: true,
  };
  users.push(newUser);
  writeUsers(users);
  return toSafe(newUser);
}

export function updateUser(
  id: string,
  data: Partial<{ password: string; role: Role; fullName: string; email: string; active: boolean }>
): SafeUser {
  const users = readUsers();
  const u = users.find((u) => u.id === id);
  if (!u) throw new Error("User not found");
  if (data.password) u.passwordHash = bcrypt.hashSync(data.password, 10);
  if (data.role !== undefined) u.role = data.role;
  if (data.fullName !== undefined) u.fullName = data.fullName;
  if (data.email !== undefined) u.email = data.email;
  if (data.active !== undefined) u.active = data.active;
  writeUsers(users);
  return toSafe(u);
}

export function deleteUser(id: string) {
  const users = readUsers();
  const admins = users.filter((u) => u.role === "admin" && u.active);
  const target = users.find((u) => u.id === id);
  if (!target) throw new Error("User not found");
  if (target.role === "admin" && admins.length === 1) {
    throw new Error("Cannot delete the last admin account");
  }
  writeUsers(users.filter((u) => u.id !== id));
}
