import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { upload, download, downloadDraft, preflight } from "./documentFiles";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({ path: "/documents/upload", method: "POST", handler: upload });

http.route({
  path: "/documents/upload",
  method: "OPTIONS",
  handler: preflight,
});

http.route({ path: "/documents/download", method: "GET", handler: download });

http.route({
  path: "/documents/download",
  method: "OPTIONS",
  handler: preflight,
});

export default http;

http.route({ path: "/documents/draft", method: "GET", handler: downloadDraft });

http.route({ path: "/documents/draft", method: "OPTIONS", handler: preflight });
