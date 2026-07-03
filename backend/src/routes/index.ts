import { Router } from "express";
import { heartbeatRouter } from "./heartbeat";
import { gameRouter } from "./game";

const router = Router();

router.use("/heartbeat", heartbeatRouter);
router.use("/game", gameRouter);

export { router as routes };
