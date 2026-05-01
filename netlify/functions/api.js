const serverless = require("serverless-http");
const app = require("../../index");

module.exports.handler = serverless(app, {
  request(req, event) {
    console.log("[EVENT] method:", event.httpMethod);
    console.log("[EVENT] path:", event.path);
    console.log("[EVENT] body:", event.body);
    console.log("[EVENT] isBase64Encoded:", event.isBase64Encoded);
    console.log("[EVENT] content-type:", req.headers["content-type"]);

    if (event.body) {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf-8")
        : event.body;

      const ct = req.headers["content-type"] || "";
      try {
        req.body = ct.includes("application/json") ? JSON.parse(raw) : raw;
      } catch {
        req.body = {};
      }
    } else {
      req.body = {};
    }

    console.log("[REQ BODY]", JSON.stringify(req.body));
  },
});
