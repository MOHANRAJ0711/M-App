import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { toPublicUser } from "../utils/serialize";

function rounds() {
  return Number(process.env.BCRYPT_ROUNDS ?? 10);
}

export async function createGuest(name: string) {
  const user = await prisma.user.create({
    data: {
      name: name.trim() || "Guest",
      email: `guest-${crypto.randomUUID()}@freemeet.local`,
      passwordHash: "guest",
    },
  });
  return toPublicUser(user);
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const email = input.email.toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, rounds());

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
      },
    });
    return toPublicUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "An account with this email already exists.");
    }
    throw error;
  }
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (!user) {
    throw new HttpError(401, "Email or password is incorrect.");
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw new HttpError(401, "Email or password is incorrect.");
  }

  return toPublicUser(user);
}
