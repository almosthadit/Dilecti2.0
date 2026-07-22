import "dotenv/config";
import { aiRouter } from "./src/routes/ai";
import { libraryRouter } from "./src/routes/library";
import { ingestionRouter } from "./src/routes/ingestion";
import { adminRouter } from "./src/routes/admin.js";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";





// Helper function to robustly fetch an image for any category


async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(aiRouter);
  app.use(libraryRouter);
  app.use(ingestionRouter);
  app.use(adminRouter);


  // AI Trending Endpoint

  // AI Recommendation Endpoint


  // Universal Recommendation Endpoint

  // AI Bulk Enrich Endpoint

  // AI Library Parsing Endpoint

  // AI Query Fixer Endpoint

  // AI Single Book Scan Endpoint

  // Rich Database Universal Search Endpoint

  // AI Deep Search Endpoint

  // AI Taste Profile Interview Endpoint

  // Update Understanding Endpoint

  // Fill Missing Images Endpoint

  // Vite middleware for development
  app.get('/api/test-route-899', (req, res) => res.json({ success: true, timestamp: Date.now() }));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
