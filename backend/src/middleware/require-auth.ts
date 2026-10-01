import type { NextFunction, Request, Response } from "express";
import { readUserIdFromRequest } from "../auth/auth.tokens";
import { prisma } from "../utils/prisma";
import { toPublicUser } from "../utils/serialize";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = readUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    req.user = toPublicUser(user);
    next();
  } catch {
    res.status(401).json({ error: "Authentication required." });
  }
}
