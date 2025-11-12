import { GoogleGenAI, Type } from "@google/genai";
import { DetectedCard } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const multiCardDetectionSchema = {
    type: Type.OBJECT,
    properties: {
        cards_detected: {
            type: Type.ARRAY,
            description: "An array of all detected Pokémon cards.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The name of the Pokémon on the card." },
                    set: { type: Type.STRING, description: "The name of the expansion set this card belongs to." },
                    card_number: { type: Type.STRING, description: "The card number within the set, e.g., '17/102'." },
                    rarity: { type: Type.STRING, description: "The rarity of the card, e.g., Common, Rare, Full Art." },
                    confidence: { type: Type.NUMBER, description: "The model's confidence in this identification, from 0.0 to 1.0." },
                    bounding_box: {
                        type: Type.ARRAY,
                        description: "Crucially, this must be an extremely tight and precise normalized bounding box [x_center, y_center, width, height] corresponding to the very edge of the card itself, excluding any surrounding binder sleeve.",
                        items: { type: Type.NUMBER }
                    }
                },
                required: ["name", "set", "card_number", "rarity", "confidence", "bounding_box"]
            }
        }
    },
    required: ["cards_detected"]
};


export const identifyCardsInImage = async (imageFile: File): Promise<DetectedCard[]> => {
  const imagePart = await fileToGenerativePart(imageFile);
  const prompt = `
    Detect all visible Pokémon TCG cards in this image. For each card, provide its name, set name, card number, and rarity.
    Also, provide a confidence score for each identification.
    It is critical that you also provide an extremely tight and precise normalized bounding box [x_center, y_center, width, height] for each card.
    The bounding box MUST correspond to the very edge of the card itself, completely excluding any surrounding material like plastic binder sleeves.
    Return a structured list of all detections. Even if confidence is low, include the detection.
    Ensure the response is a valid JSON object matching the provided schema.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: multiCardDetectionSchema,
        }
    });
    
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.cards_detected || [];

  } catch (error) {
    console.error("Error identifying cards in image:", error);
    throw new Error("Failed to identify cards. The AI model could not process the image.");
  }
};