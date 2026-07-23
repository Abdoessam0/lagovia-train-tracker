import cors from "cors";
import express from "express";

import departuresRouter from "./routes/departures.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "lagovia-train-tracker-api",
  });
});

app.use("/api/departures", departuresRouter);

export default app;
