import type { Request, Response } from "express";

import { getDeparturesForQuery } from "../services/departures.service.js";

export async function getDepartures(
  req: Request,
  res: Response,
) {
  const rawQuery = req.query.q;

  if (typeof rawQuery !== "string") {
    return res.status(400).json({
      error: {
        code: "QUERY_REQUIRED",
        message: "Please provide a station search query.",
      },
    });
  }

  const query = rawQuery.trim();

  if (query.length < 3) {
    return res.status(400).json({
      error: {
        code: "QUERY_TOO_SHORT",
        message: "Please enter at least 3 characters.",
      },
    });
  }

  try {
    const result = await getDeparturesForQuery(query);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to load iRail stations:", error);

    return res.status(502).json({
      error: {
        code: "UPSTREAM_API_ERROR",
        message: "Train information is temporarily unavailable.",
      },
    });
  }
}
