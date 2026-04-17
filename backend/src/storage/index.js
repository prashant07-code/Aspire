import { config } from "../config/env.js";
import { FileComplaintStorage } from "./fileStorage.js";

let storageInstance;

export async function getStorage() {
  if (!storageInstance) {
    if (config.storage.engine === "mongo") {
      if (!config.storage.mongodbUri) {
        throw new Error(
          "MongoDB storage requires a valid MONGODB_URI. Add it in your environment before starting the server."
        );
      }

      const { MongoComplaintStorage } = await import("./mongoStorage.js");
      storageInstance = new MongoComplaintStorage(config.storage.mongodbUri);
    } else {
      storageInstance = new FileComplaintStorage(config.storage.filePath);
    }

    await storageInstance.init();
  }

  return storageInstance;
}
