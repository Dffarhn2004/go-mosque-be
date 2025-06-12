import { config } from "dotenv";
import admin from "firebase-admin";

config(); // Load .env variables

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
// console.log("Firebase service account loaded from environment variables");
// console.log("Firebase service account:", serviceAccount);

if (!serviceAccount) {
  throw new Error(
    "Firebase service account credentials not found in environment variables"
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://bekaspakaistorage.appspot.com",
});

const bucket = admin.storage().bucket();

export async function FBuploadFiles(files, saveAt) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  try {
    const uploadPromises = files.map(async (file) => {
      const { buffer, originalname } = file;
      const firebaseFile = bucket.file(
        `${saveAt}/${Date.now()}_${originalname}`
      ); // Unique filename with timestamp

      const stream = firebaseFile.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      // Handle the buffer stream and upload to Firebase
      stream.end(buffer);

      return new Promise((resolve, reject) => {
        stream.on("finish", async () => {
          const url = await firebaseFile.getSignedUrl({
            action: "read",
            expires: "01-01-2030", // Customize expiration date as needed
          });
          resolve({
            key: firebaseFile.name,
            alt: `File description ${originalname}`, // Customize alt text as needed
            url: url[0],
          });
        });

        stream.on("error", (error) => {
          console.error("Upload error:", error);
          reject(new Error("Firebase upload failed"));
        });
      });
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Firebase upload error:", error);
    throw new Error("Firebase upload failed");
  }
}

// Delete files from Firebase
export async function FBdeleteFiles(keys) {
  try {
    const deletePromises = keys.map(async (key) => {
      const file = bucket.file(key);
      await file.delete();
    });
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Firebase delete error:", error);
    throw new Error("Firebase deletion failed");
  }
}

// Delete all files in a folder path
export async function FBdeleteAllFilesInPath(pathPrefix) {
  try {
    const [files] = await bucket.getFiles({ prefix: pathPrefix });
    if (files.length === 0) return;

    const deletePromises = files.map((file) => file.delete());
    await Promise.all(deletePromises);
    console.log(`Deleted all files in path: ${pathPrefix}`);
  } catch (error) {
    console.error(`Error deleting files in path "${pathPrefix}":`, error);
    throw new Error("Failed to delete existing files before upload.");
  }
}
