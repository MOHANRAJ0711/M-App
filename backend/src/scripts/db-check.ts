import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { createMeeting } from "../meetings/meeting.service";

const email = `check-${Date.now()}@example.com`;
const user = await prisma.user.create({
  data: {
    name: "Db Check",
    email,
    passwordHash: await bcrypt.hash("password123", 4),
  },
});

const created = await createMeeting(user.id, "Check meeting");
const found = await prisma.meeting.findUnique({
  where: { id: created.meetingId },
  include: { participants: true },
});

if (!found || found.participants.length !== 1) {
  throw new Error("Database round trip failed.");
}

await prisma.meeting.delete({ where: { id: found.id } });
await prisma.user.delete({ where: { id: user.id } });
console.log("Database check passed.");
await prisma.$disconnect();
