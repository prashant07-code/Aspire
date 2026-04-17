import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { config } from "./config/env.js";
import { createAdminRouter } from "./routes/admin.js";
import { createComplaintRouter } from "./routes/complaints.js";
import { SarvamSpeechService } from "./services/sarvamService.js";
import { getStorage } from "./storage/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const frontendDirectory = path.resolve(__dirname, "../../frontend");
const pdfAssetsDirectory = path.resolve(frontendDirectory, "pdf_assets");
const storage = await getStorage();
const sarvam = new SarvamSpeechService(config.sarvam);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    storageEngine: config.storage.engine,
    sarvamConfigured: sarvam.isConfigured()
  });
});

app.use("/api", createComplaintRouter({ storage, sarvam }));
app.use("/api/admin", createAdminRouter({ storage }));
app.use(express.static(frontendDirectory));
app.use("/pdf_assets", express.static(pdfAssetsDirectory));

app.get("/admin", (_request, response) => {
  response.sendFile(path.join(frontendDirectory, "admin.html"));
});

app.get("/track", (_request, response) => {
  response.sendFile(path.join(frontendDirectory, "track.html"));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: error.message || "Unexpected server error."
  });
});

app.get("*", (_request, response) => {
  response.sendFile(path.join(frontendDirectory, "index.html"));
});

app.listen(config.port, config.host, () => {
  console.log(`Voice grievance portal running at http://${config.host}:${config.port}`);
});
