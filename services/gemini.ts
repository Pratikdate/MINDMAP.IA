import { GoogleGenAI, Type } from "@google/genai";
import { MindMapNode } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert at structuring information into clear, hierarchical mind maps.
Your goal is to analyze text or documents and extract the core topics, sub-topics, and key details.
Return the result as a flat list of nodes where each node has a unique ID and a parent ID.
The root node must have 'parentId' as null.
Keep labels concise (1-5 words). Use the description for extra context if strictly necessary.
`;

export const generateMindMapFromText = async (text: string): Promise<MindMapNode[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define schema for a flat list of nodes to avoid recursion depth issues in strict schemas
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Create a comprehensive mind map from the following text: \n\n${text}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            description: "A flat list of all nodes in the mind map tree.",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Unique identifier, e.g., 'root', '1', '1-1'" },
                parentId: { type: Type.STRING, description: "ID of the parent node. Null for the root node.", nullable: true },
                label: { type: Type.STRING, description: "Concise title of the node" },
                description: { type: Type.STRING, description: "Optional brief detail", nullable: true },
              },
              required: ["id", "label"],
            },
          },
        },
        required: ["nodes"],
      },
    },
  });

  const jsonText = response.text;
  if (!jsonText) {
    throw new Error("No response from AI");
  }

  try {
    const parsed = JSON.parse(jsonText);
    return parsed.nodes;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("Failed to parse AI response structure");
  }
};
