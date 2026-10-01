import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const MEETING_CODE_PATTERN =
  /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{3}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{3}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{3}$/;

export function generateMeetingCode() {
  const bytes = randomBytes(9);
  const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]);
  return `${chars.slice(0, 3).join("")}-${chars.slice(3, 6).join("")}-${chars.slice(6, 9).join("")}`;
}
