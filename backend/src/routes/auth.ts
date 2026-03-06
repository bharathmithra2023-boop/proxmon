import { Router } from "express";
import { findByUsername, validatePassword, updateLastLogin, findById } from "../lib/userStore";
import { signToken, requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: "Username and password required" });
    return;
  }
  const user = findByUsername(username);
  if (!user || !user.active) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }
  if (!validatePassword(user, password)) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }
  updateLastLogin(user.id);
  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
      },
    },
  });
});

router.get("/me", requireAuth, (req, res) => {
  const user = findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }
  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
    },
  });
});

export default router;
