import express from "express";

import { complaintStatuses } from "../data/categories.js";
import {
  clearAdminSessionCookie,
  isAdminAuthenticated,
  isValidAdminPassword,
  requireAdminAuth,
  setAdminSessionCookie
} from "../utils/adminSession.js";

export function createAdminRouter({ storage }) {
  const router = express.Router();

  router.get("/session", (request, response) => {
    response.json({
      authenticated: isAdminAuthenticated(request)
    });
  });

  router.post("/login", (request, response) => {
    const password = String(request.body?.password || "").trim();

    if (!password) {
      return response.status(400).json({
        error: "Admin password is required."
      });
    }

    if (!isValidAdminPassword(password)) {
      return response.status(401).json({
        error: "Invalid admin password."
      });
    }

    setAdminSessionCookie(response);
    return response.json({
      authenticated: true
    });
  });

  router.post("/logout", (_request, response) => {
    clearAdminSessionCookie(response);
    response.json({
      authenticated: false
    });
  });

  router.use(requireAdminAuth);

  router.get("/summary", async (_request, response, next) => {
    try {
      response.json(await storage.getSummary());
    } catch (error) {
      next(error);
    }
  });

  router.get("/complaints", async (request, response, next) => {
    try {
      const limit = Number(request.query.limit || 100);
      const complaints = await storage.list({ limit });
      response.json({ complaints });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/complaints/:trackingId/status", async (request, response, next) => {
    try {
      const nextStatus = String(request.body?.status || "").trim();

      if (!complaintStatuses.includes(nextStatus)) {
        return response.status(400).json({
          error: "Invalid complaint status."
        });
      }

      const updatedComplaint = await storage.updateStatus(
        request.params.trackingId,
        nextStatus
      );

      if (!updatedComplaint) {
        return response.status(404).json({
          error: "Complaint not found."
        });
      }

      response.json({ complaint: updatedComplaint });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
