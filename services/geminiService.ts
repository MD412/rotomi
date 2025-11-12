
import { GoogleGenAI, Type } from "@google/genai";

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

const multiCardIdSchema = {
    type: Type.OBJECT,
    properties: {
        cards_detected: {
            type: Type.ARRAY,
            description: "An array of all Pokémon cards detected in the image.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The name of the Pokémon on the card." },
                    set: { type: Type.STRING, description: "The name of the expansion set this card belongs to." },
                    card_number: { type: Type.STRING, description: "The card number within the set, e.g., '17/102'." },
                    rarity: { type: Type.STRING, description: "The rarity of the card, e.g., Common, Rare, Full Art." },
                    confidence: { type: Type.NUMBER, description: "The model's confidence in this detection, from 0.0 to 1.0." },
                    bounding_box: {
                        type: Type.ARRAY,
                        description: "Normalized bounding box coordinates [x_center, y_center, width, height] of the detected card. All values are floats between 0.0 and 1.0.",
                        items: { type: Type.NUMBER }
                    }
                },
                required: ["name", "set", "card_number", "rarity", "confidence", "bounding_box"]
            }
        },
        total_detected: {
            type: Type.INTEGER,
            description: "The total number of cards detected in the image."
        }
    },
    required: ["cards_detected", "total_detected"],
};


export const identifyCards = async (imageFile: File) => {
  const imagePart = await fileToGenerativePart(imageFile);
  const prompt = `
    Detect all visible Pokémon TCG cards in this image. For each card, provide its name, set name, card number, rarity, and a confidence score.
    Also, provide a normalized bounding box [x_center, y_center, width, height] for each detected card. All values in the bounding box must be floats between 0.0 and 1.0, relative to the image dimensions.
    Return a structured list of all detections. Even if confidence is low, include the detection.
    Ensure the response is a valid JSON object matching the provided schema.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [
            imagePart,
            { text: prompt }
        ]},
        config: {
            responseMimeType: "application/json",
            responseSchema: multiCardIdSchema,
        }
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error identifying cards:", error);
    throw new Error("Failed to identify cards. The AI model could not process the image.");
  }
};
