import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Part, ServiceCase } from './types';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');

export function loadServiceCases(): ServiceCase[] {
  const raw = readFileSync(path.join(dataDir, 'service_cases.json'), 'utf-8');
  return JSON.parse(raw) as ServiceCase[];
}

export function loadParts(): Part[] {
  const raw = readFileSync(path.join(dataDir, 'parts.json'), 'utf-8');
  return JSON.parse(raw) as Part[];
}
