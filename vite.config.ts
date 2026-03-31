import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import https from "node:https";

function shopifyAdminProxy(): Plugin {
  return {
    name: "shopify-admin-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || "";
        if (!rawUrl.startsWith("/shopify-proxy/")) return next();

        const token = req.headers["x-shopify-access-token"];
        if (typeof token !== "string" || !token) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing X-Shopify-Access-Token" }));
          return;
        }

        const pathOnly = rawUrl.split("?")[0] || "";
        const rest = pathOnly.slice("/shopify-proxy/".length);
        const slashIdx = rest.indexOf("/");
        if (slashIdx === -1) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Invalid proxy path" }));
          return;
        }

        const shopHost = decodeURIComponent(rest.slice(0, slashIdx));
        let shopPath = rest.slice(slashIdx);
        const q = rawUrl.includes("?") ? "?" + rawUrl.split("?").slice(1).join("?") : "";
        shopPath += q;

        const opts: https.RequestOptions = {
          hostname: shopHost,
          path: shopPath,
          method: req.method || "GET",
          headers: {
            "X-Shopify-Access-Token": token,
            Accept: "application/json",
          },
        };

        const proxyReq = https.request(opts, (proxyRes) => {
          res.statusCode = proxyRes.statusCode || 502;
          const h = proxyRes.headers;
          for (const key of Object.keys(h)) {
            const v = h[key];
            if (v === undefined) continue;
            if (key.toLowerCase() === "transfer-encoding") continue;
            res.setHeader(key, v);
          }
          proxyRes.pipe(res);
        });

        proxyReq.on("error", (err) => {
          if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ errors: err.message }));
          }
        });

        req.pipe(proxyReq);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), shopifyAdminProxy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
