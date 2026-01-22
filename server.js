import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./src/config/env.js";
import routes from "./src/routes/index.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.isProd ? "combined" : "dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static landing pages
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api", routes);

// Basic health
app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
