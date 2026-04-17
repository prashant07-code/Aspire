import fs from "node:fs/promises";
import path from "node:path";

import { buildSummary } from "../utils/analytics.js";
import {
  createStatusHistoryEntry,
  ensureStatusHistory
} from "../utils/statusHistory.js";

export class FileComplaintStorage {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, "[]\n", "utf8");
    }
  }

  async #readAll() {
    await this.init();
    const content = await fs.readFile(this.filePath, "utf8");
    return JSON.parse(content || "[]").map(ensureStatusHistory);
  }

  async #writeAll(records) {
    await fs.writeFile(this.filePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  }

  async create(record) {
    const records = await this.#readAll();
    const complaint = ensureStatusHistory(record);
    records.unshift(complaint);
    await this.#writeAll(records);
    return complaint;
  }

  async list({ limit = 100 } = {}) {
    const records = await this.#readAll();
    return records
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, limit);
  }

  async getByTrackingId(trackingId) {
    const records = await this.#readAll();
    return records.find((record) => record.trackingId === trackingId) || null;
  }

  async updateStatus(trackingId, status) {
    const records = await this.#readAll();
    const target = records.find((record) => record.trackingId === trackingId);

    if (!target) {
      return null;
    }

    if (target.status === status) {
      return ensureStatusHistory(target);
    }

    const history = ensureStatusHistory(target).statusHistory;
    target.status = status;
    target.updatedAt = new Date().toISOString();
    target.statusHistory = [
      ...history,
      createStatusHistoryEntry(status, target.updatedAt, "Updated by admin.")
    ];
    await this.#writeAll(records);
    return ensureStatusHistory(target);
  }

  async getSummary() {
    const records = await this.#readAll();
    return buildSummary(records);
  }
}
