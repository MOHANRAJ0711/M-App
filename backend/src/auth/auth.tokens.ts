import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "freemeet_token";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET is not set.");
  }
  return value;
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: "7d" });
}

export function readUserId(token: string) {
  const payload = jwt.verify(token, secret());
  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid token.");
  }
  return payload.sub;
}

export function readUserIdFromRequest(req: Request) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || typeof token !== "string") return null;
  return readUserId(token);
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
