import { Router } from "express";
import { getPokemon, listPokemon } from "../controllers/pokemon";

export const pokemonRouter = Router();

pokemonRouter.get("/", listPokemon);
pokemonRouter.get("/:id", getPokemon);
