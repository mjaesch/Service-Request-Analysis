import type { Part } from './types';

export interface RecommendedPart {
  part_number: string;
  name: string;
  stock: number;
  price: number;
}

export function enrichWithParts(machine: string, likelyPartNames: string[], parts: Part[]): RecommendedPart[] {
  return parts
    .filter((p) => likelyPartNames.includes(p.name) && p.compatible_machines.includes(machine))
    .map(({ part_number, name, stock, price }) => ({ part_number, name, stock, price }));
}
