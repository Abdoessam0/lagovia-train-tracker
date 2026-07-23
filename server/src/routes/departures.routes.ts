import { Router } from "express";

import { getDepartures } from "../controllers/departures.controller.js";

const departuresRouter = Router();

departuresRouter.get("/", getDepartures);

export default departuresRouter;
