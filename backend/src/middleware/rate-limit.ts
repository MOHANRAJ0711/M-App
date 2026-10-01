import rateLimit from "express-rate-limit";

const skipInTest = () => process.env.NODE_ENV === "test";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skip: skipInTest,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  skip: skipInTest,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many uploads. Try again later." },
});
