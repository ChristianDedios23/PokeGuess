import { Router } from "express";
import { feedbackRouter } from "./feedback";
import { heartbeatRouter } from "./heartbeat";
import { pokemonRouter } from "./pokemon";

const router = Router();

router.use("/heartbeat", heartbeatRouter);
router.use("/pokemon", pokemonRouter);
router.use("/feedback", feedbackRouter);

export { router as routes };
