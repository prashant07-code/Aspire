import crypto from "node:crypto";

export function createTrackingId(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RR30-${stamp}-${random}`;
}
