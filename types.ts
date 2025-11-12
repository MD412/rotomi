
export interface PokemonCard {
  id: string;
  name: string;
  setName: string;
  number: string;
  rarity: string;
  marketPrice: number;
  imageUrl: string;
  quantity: number;
}

export interface DetectedCard {
  name: string;
  set: string;
  card_number: string;
  rarity: string;
  confidence: number;
  bounding_box: [number, number, number, number];
  imageIndex: number;
  croppedImageUrl?: string;
}

export interface MultiScanResult {
  cards_detected: DetectedCard[];
  total_detected: number;
  originalImageUrls: string[];
}
