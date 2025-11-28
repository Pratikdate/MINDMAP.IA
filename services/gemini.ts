
import { GoogleGenAI, Type } from "@google/genai";
import { MindMapNode } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert at structuring information into clear, hierarchical mind maps.
Your goal is to analyze text or documents and extract the core topics, sub-topics, and key details.
Return the result as a flat list of nodes where each node has a unique ID and a parent ID.
The root node must have 'parentId' as null.
Keep labels concise (1-5 words). Use the description for extra context if strictly necessary.
`;

const extractJson = (text: string): any => {
    try {
        // Find the first '{' and the last '}'
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            const jsonString = text.substring(firstOpen, lastClose + 1);
            return JSON.parse(jsonString);
        }
        throw new Error("No JSON found");
    } catch (e) {
        throw new Error("Failed to parse AI response structure");
    }
}

export const generateMindMapFromText = async (input: string): Promise<MindMapNode[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const trimmedInput = input.trim();
  const isUrl = /^https?:\/\//i.test(trimmedInput);

  if (isUrl) {
      // URL MODE: Use Google Search Tool
      // Note: responseSchema and responseMimeType are NOT compatible with tools in the current API version,
      // so we use prompt engineering to request JSON.
      const prompt = `
        Analyze the content of the following website: ${trimmedInput}
        
        Create a comprehensive mind map based on the key information, topics, and details found on the page.
        Structure the output as a flat list of nodes suitable for a tree diagram.
        
        STRICTLY return the result as a JSON object with the following structure:
        {
            "nodes": [
                { 
                    "id": "string (unique)", 
                    "parentId": "string (or null for root)", 
                    "label": "string (concise title)", 
                    "description": "string (optional detailed summary)" 
                }
            ]
        }
        
        Important Rules:
        1. The root node must have "parentId": null.
        2. The root node's description should mention "Source: ${trimmedInput}".
        3. Do not include any markdown formatting (like \`\`\`json) outside of the JSON block if possible, but valid JSON is the priority.
      `;

      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
              tools: [{ googleSearch: {} }],
          }
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("No response from AI");
      
      const parsed = extractJson(jsonText);
      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error("Invalid JSON structure returned by AI");
      }
      return parsed.nodes;

  } else {
      // TEXT MODE: Use standard extraction with strict Schema
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create a comprehensive mind map from the following text: \n\n${trimmedInput}`,
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
  }
};
