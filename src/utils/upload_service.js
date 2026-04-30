const { config } = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET;
const isPublicBucket = process.env.SUPABASE_STORAGE_PUBLIC === "true";
const signedUrlExpiresIn = parseInt(
  process.env.SUPABASE_SIGNED_URL_EXPIRES_IN || "3600",
  10
);

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not configured");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
}

if (!bucketName) {
  throw new Error("SUPABASE_STORAGE_BUCKET is not configured");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function sanitizeFileName(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildObjectPath(saveAt, originalName) {
  const sanitizedName = sanitizeFileName(originalName || "file");
  return `${saveAt}/${Date.now()}_${sanitizedName}`;
}

function getPublicOrSignedUrl(objectPath) {
  if (isPublicBucket) {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  return supabase.storage
    .from(bucketName)
    .createSignedUrl(objectPath, signedUrlExpiresIn)
    .then(({ data, error }) => {
      if (error) throw error;
      return data.signedUrl;
    });
}

function extractObjectPath(value) {
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\/+/, "");
  }

  try {
    const parsed = new URL(value);
    const marker = `/object/${isPublicBucket ? "public" : "sign"}/${bucketName}/`;
    const index = parsed.pathname.indexOf(marker);

    if (index >= 0) {
      return decodeURIComponent(parsed.pathname.slice(index + marker.length));
    }

    const fallbackMarker = `/${bucketName}/`;
    const fallbackIndex = parsed.pathname.indexOf(fallbackMarker);
    if (fallbackIndex >= 0) {
      return decodeURIComponent(
        parsed.pathname.slice(fallbackIndex + fallbackMarker.length)
      );
    }
  } catch (error) {
    console.error("Failed to parse storage URL:", error);
  }

  return null;
}

async function FBuploadFiles(files, saveAt) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  try {
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const objectPath = buildObjectPath(saveAt, file.originalname);

        const { error } = await supabase.storage.from(bucketName).upload(
          objectPath,
          file.buffer,
          {
            contentType: file.mimetype,
            upsert: false,
          }
        );

        if (error) {
          throw error;
        }

        const url = await getPublicOrSignedUrl(objectPath);

        return {
          key: objectPath,
          alt: `File description ${file.originalname}`,
          url,
        };
      })
    );

    return uploadResults;
  } catch (error) {
    console.error("Supabase upload error:", error);
    throw new Error("Supabase upload failed");
  }
}

async function FBdeleteFiles(keys) {
  try {
    const objectPaths = (keys || [])
      .map(extractObjectPath)
      .filter(Boolean);

    if (objectPaths.length === 0) {
      return;
    }

    const { error } = await supabase.storage.from(bucketName).remove(objectPaths);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Supabase delete error:", error);
    throw new Error("Supabase deletion failed");
  }
}

async function FBdeleteAllFilesInPath(pathPrefix) {
  try {
    let offset = 0;
    const pageSize = 100;
    const objectPaths = [];

    while (true) {
      const { data, error } = await supabase.storage.from(bucketName).list(
        pathPrefix,
        {
          limit: pageSize,
          offset,
        }
      );

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      objectPaths.push(
        ...data
          .filter((item) => item.name)
          .map((item) => `${pathPrefix}/${item.name}`)
      );

      if (data.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    if (objectPaths.length === 0) {
      return;
    }

    const { error } = await supabase.storage.from(bucketName).remove(objectPaths);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(`Error deleting files in path "${pathPrefix}":`, error);
    throw new Error("Failed to delete existing files before upload.");
  }
}

module.exports = {
  FBuploadFiles,
  FBdeleteFiles,
  FBdeleteAllFilesInPath,
};
