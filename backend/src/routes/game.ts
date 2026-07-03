import { Router } from "express";
import {
  createRoom,
  endTurn,
  forfeitGame,
  joinRoom,
  leaveRoom,
  makeGuess,
  readyUp,
  requestRematch,
  sendChatMessage,
  startGame,
} from "../controllers/game";

const gameRouter = Router();

gameRouter.post("/createRoom", createRoom);
gameRouter.post("/joinRoom", joinRoom);
gameRouter.post("/readyUp", readyUp);
gameRouter.post("/startGame", startGame);
gameRouter.post("/sendChatMessage", sendChatMessage);
gameRouter.post("/endTurn", endTurn);
gameRouter.post("/makeGuess", makeGuess);
gameRouter.post("/forfeitGame", forfeitGame);
gameRouter.post("/leaveRoom", leaveRoom);
gameRouter.post("/requestRematch", requestRematch);

export { gameRouter };
