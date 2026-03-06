import { Router } from "express";
import { getAllUsers, createUser, updateUser, deleteUser } from "../lib/userStore";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get("/", (_req, res) => {
  try {
    res.json({ success: true, data: getAllUsers() });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post("/", (req, res) => {
  try {
    const { username, password, role, fullName, email } = req.body;
    if (!username || !password || !role) {
      res.status(400).json({ success: false, error: "username, password and role are required" });
      return;
    }
    if (!["admin", "operator", "viewer"].includes(role)) {
      res.status(400).json({ success: false, error: "Invalid role" });
      return;
    }
    const user = createUser({ username, password, role, fullName: fullName || username, email: email || "" });
    res.json({ success: true, data: user });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const { password, role, fullName, email, active } = req.body;
    if (role && !["admin", "operator", "viewer"].includes(role)) {
      res.status(400).json({ success: false, error: "Invalid role" });
      return;
    }
    const user = updateUser(req.params.id, { password, role, fullName, email, active });
    res.json({ success: true, data: user });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    if (req.user!.userId === req.params.id) {
      res.status(400).json({ success: false, error: "Cannot delete your own account" });
      return;
    }
    deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

export default router;
