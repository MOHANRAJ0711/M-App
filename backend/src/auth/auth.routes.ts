import { Router } from "express";
import { guest, login, logout, me, register } from "./auth.controller";
import { requireAuth } from "../middleware/require-auth";

export const authRouter = Router();

authRouter.post("/guest", guest);
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
