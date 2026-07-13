import { Router } from "express";
import { heartbeatRouter } from "./heartbeat";
import { pokemonRouter } from "./pokemon";

const router = Router();

router.use("/heartbeat", heartbeatRouter);
router.use("/pokemon", pokemonRouter);

export { router as routes };
