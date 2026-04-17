import express from "express";

import {
  complaintCategories,
  findCategory,
  toClientCategory
} from "../data/categories.js";
import { classifyComplaint } from "../services/classifier.js";
import { createTrackingId } from "../utils/tracking.js";
import { createStatusHistoryEntry } from "../utils/statusHistory.js";

const trimString = (value) => (typeof value === "string" ? value.trim() : "");

function cleanBase64(dataUrl) {
  return String(dataUrl || "").includes(",")
    ? String(dataUrl).split(",").pop()
    : String(dataUrl || "");
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLocation(location = {}) {
  return {
    latitude: toNumber(location.latitude ?? location.lat),
    longitude: toNumber(location.longitude ?? location.lng),
    accuracy: toNumber(location.accuracy),
    address: trimString(location.address),
    source: trimString(location.source) || "browser"
  };
}

export function createComplaintRouter({ storage, sarvam }) {
  const router = express.Router();

  router.get("/categories", (_request, response) => {
    response.json({
      categories: complaintCategories.map(toClientCategory)
    });
  });

  router.post("/transcribe", async (request, response, next) => {
    try {
      const {
        audioBase64,
        mimeType = "audio/webm",
        languageCode,
        mode,
        withTimestamps
      } = request.body || {};

      if (!audioBase64) {
        return response.status(400).json({
          error: "Audio is required before transcription."
        });
      }

      const audioBuffer = Buffer.from(cleanBase64(audioBase64), "base64");
      const transcript = await sarvam.transcribeAudio({
        audioBuffer,
        mimeType,
        languageCode,
        mode,
        withTimestamps
      });

      response.json({
        transcript,
        classification: classifyComplaint(transcript.transcript)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/complaints", async (request, response, next) => {
    try {
      const complaintText =
        trimString(request.body?.description) || trimString(request.body?.transcript);

      if (!complaintText) {
        return response.status(400).json({
          error: "Transcript or complaint description is required."
        });
      }

      const autoClassification = classifyComplaint(complaintText);
      const selectedCategory =
        findCategory(request.body?.selectedCategory) ||
        findCategory(autoClassification.recommendedCategory.slug) ||
        findCategory("other");
      const now = new Date().toISOString();
      const initialStatus = "Submitted";

      const complaint = {
        trackingId: createTrackingId(new Date()),
        citizenName: trimString(request.body?.citizenName),
        phoneNumber: trimString(request.body?.phoneNumber),
        area: trimString(request.body?.area),
        transcript: trimString(request.body?.transcript),
        description: complaintText,
        category: {
          slug: selectedCategory.slug,
          label: selectedCategory.label,
          department: selectedCategory.department
        },
        classification: autoClassification,
        languageCode:
          trimString(request.body?.languageCode) ||
          trimString(request.body?.transcription?.languageCode) ||
          null,
        status: initialStatus,
        location: normalizeLocation(request.body?.location),
        transcription: request.body?.transcription
          ? {
              provider: "Sarvam AI",
              requestId: request.body.transcription.requestId || null,
              mode: request.body.transcription.mode || null,
              model: request.body.transcription.model || null,
              languageCode: request.body.transcription.languageCode || null,
              languageProbability:
                request.body.transcription.languageProbability ?? null
            }
          : null,
        statusHistory: [
          createStatusHistoryEntry(
            initialStatus,
            now,
            "Complaint submitted successfully."
          )
        ],
        createdAt: now,
        updatedAt: now
      };

      const savedComplaint = await storage.create(complaint);

      response.status(201).json({
        complaint: savedComplaint
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/complaints/:trackingId", async (request, response, next) => {
    try {
      const complaint = await storage.getByTrackingId(request.params.trackingId);

      if (!complaint) {
        return response.status(404).json({
          error: "Complaint not found."
        });
      }

      response.json({ complaint });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
