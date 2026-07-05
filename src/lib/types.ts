export interface ServiceCase {
  id: string;
  machine: string;
  error_code: string;
  symptoms: string[];
  known_causes: string[];
  recommended_checks: string[];
  likely_parts: string[];
}

export interface Part {
  part_number: string;
  name: string;
  compatible_machines: string[];
  stock: number;
  price: number;
}
