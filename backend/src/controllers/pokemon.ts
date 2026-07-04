import { Request, Response } from "express";
import { getAllPokemon, getPokemonById } from "../data/pokemon";

export const listPokemon = (_req: Request, res: Response) => {
  try {
    res.json({ pokemon: getAllPokemon() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pokémon cache unavailable";
    res.status(503).json({ error: message });
  }
};

export const getPokemon = (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id must be a positive integer" });
  }

  try {
    const pokemon = getPokemonById(id);
    if (!pokemon) {
      return res.status(404).json({ error: "Pokémon not found" });
    }
    res.json({ pokemon });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pokémon cache unavailable";
    res.status(503).json({ error: message });
  }
};
