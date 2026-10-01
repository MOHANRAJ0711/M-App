import type { Request, Response } from "express";
import { guestSchema, loginSchema, registerSchema } from "./auth.schemas";
import { createGuest, loginUser, registerUser } from "./auth.service";
import { clearAuthCookie, readUserIdFromRequest, setAuthCookie, signToken } from "./auth.tokens";
import { prisma } from "../utils/prisma";
import { toPublicUser } from "../utils/serialize";

export async function guest(req: Request, res: Response) {
  const input = guestSchema.parse(req.body);
  const existingId = readUserIdFromRequest(req);
  if (existingId) {
    const existing = await prisma.user.findUnique({ where: { id: existingId } });
    if (existing) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { name: input.name },
      });
      res.json({ user: toPublicUser(user) });
      return;
    }
  }

  const user = await createGuest(input.name);
  setAuthCookie(res, signToken(user.id));
  res.status(201).json({ user });
}

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const user = await registerUser(input);
  setAuthCookie(res, signToken(user.id));
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const user = await loginUser(input);
  setAuthCookie(res, signToken(user.id));
  res.json({ user });
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
