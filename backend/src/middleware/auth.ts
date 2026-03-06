import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { findById } from "../lib/userStore";

export interface AuthPayload {
  userId: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "proxmon-change-this-secret";

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = findById(decoded.userId);
    if (!user || !user.active) {
      res.status(401).json({ success: false, error: "Account disabled or not found" });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }
  next();
}

export function requireOperator(req: Request, res: Response, next: NextFunction) {
  if (!["admin", "operator"].includes(req.user?.role || "")) {
    res.status(403).json({ success: false, error: "Operator access required" });
    return;
  }
  next();
}
