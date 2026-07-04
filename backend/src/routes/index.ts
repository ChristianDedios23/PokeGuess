import { Router } from "express";
import { heartbeatRouter } from "./heartbeat";
import { gameRouter } from "./game";
import { pokemonRouter } from "./pokemon";

const router = Router();

router.use("/heartbeat", heartbeatRouter);
router.use("/game", gameRouter);
router.use("/pokemon", pokemonRouter);

export { router as routes };
