import crypto from "node:crypto";

import { config } from "../config/env.js";

const SESSION_VERSION = "v1";

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", config.admin.sessionSecret)
    .update(`${payload}:${config.admin.password}`)
    .digest("hex");
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function createSessionToken() {
  const expiresAt = Date.now() + config.admin.sessionTtlMs;
  const payload = `${SESSION_VERSION}:${expiresAt}`;
  const signature = signPayload(payload);
  return Buffer.from(`${payload}:${signature}`, "utf8").toString("base64url");
}

function verifySessionToken(token) {
  if (!token) {
    return false;
  }

  try {
    const decoded = Buffer.from(String(token), "base64url").toString("utf8");
    const [version, expiresAt, signature] = decoded.split(":");

    if (version !== SESSION_VERSION || !expiresAt || !signature) {
      return false;
    }

    if (Number(expiresAt) <= Date.now()) {
      return false;
    }

    const expectedSignature = signPayload(`${version}:${expiresAt}`);
    return safeEqual(signature, expectedSignature);
  } catch {
    return false;
  }
}

export function isValidAdminPassword(password) {
  return safeEqual(password, config.admin.password);
}

export function isAdminAuthenticated(request) {
  const cookies = parseCookies(request.headers.cookie || "");
  return verifySessionToken(cookies[config.admin.cookieName]);
}

export function setAdminSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    serializeCookie(config.admin.cookieName, createSessionToken(), {
      maxAge: Math.floor(config.admin.sessionTtlMs / 1000),
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production"
    })
  );
}

export function clearAdminSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    serializeCookie(config.admin.cookieName, "", {
      maxAge: 0,
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production"
    })
  );
}

export function requireAdminAuth(request, response, next) {
  if (isAdminAuthenticated(request)) {
    next();
    return;
  }

  response.status(401).json({
    error: "Admin authentication required."
  });
}
