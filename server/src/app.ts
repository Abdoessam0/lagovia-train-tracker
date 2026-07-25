import cors, { type CorsOptions } from "cors";
import express, { type ErrorRequestHandler } from "express";

import departuresRouter from "./routes/departures.routes.js";

const LOCAL_FRONTEND_ORIGIN = "http://localhost:5173";
const CORS_ERROR_CODE = "CORS_ORIGIN_DENIED";

class CorsOriginError extends Error {}

function parseAllowedOrigins(configuredOrigins?: string): Set<string> {
  const origins = (configuredOrigins ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.includes("*")) {
    throw new Error(
      'CORS_ORIGIN must contain explicit origins; "*" is not allowed.',
    );
  }

  return new Set(
    origins.length > 0 ? origins : [LOCAL_FRONTEND_ORIGIN],
  );
}

export function createApp(corsOrigin = process.env.CORS_ORIGIN) {
  const allowedOrigins = parseAllowedOrigins(corsOrigin);
  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new CorsOriginError());
    },
  };

  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "lagovia-train-tracker-api",
    });
  });

  app.use("/api/departures", departuresRouter);

  const corsErrorHandler: ErrorRequestHandler = (
    error,
    _req,
    res,
    next,
  ) => {
    if (error instanceof CorsOriginError) {
      res.status(403).json({
        error: {
          code: CORS_ERROR_CODE,
          message: "This request origin is not allowed.",
        },
      });
      return;
    }

    next(error);
  };

  app.use(corsErrorHandler);

  return app;
}

const app = createApp();

export default app;
