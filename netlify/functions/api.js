const serverless = require("serverless-http");
const app = require("../../index");

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  console.log("[EVENT] httpMethod:", event.httpMethod);
  console.log("[EVENT] path:", event.path);
  console.log("[EVENT] isBase64Encoded:", event.isBase64Encoded);
  console.log("[EVENT] content-type:", event.headers?.["content-type"]);
  console.log("[EVENT] body:", event.body);

  // Decode base64 body jika Netlify encode body sebagai base64
  if (event.isBase64Encoded && event.body) {
    event.body = Buffer.from(event.body, "base64").toString("utf-8");
    event.isBase64Encoded = false;
  }

  // Pastikan body adalah string (bukan object) agar express.json() bisa parse
  if (event.body && typeof event.body === "object") {
    event.body = JSON.stringify(event.body);
  }

  return handler(event, context);
};
