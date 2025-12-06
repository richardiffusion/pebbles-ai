import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PebbleData, CognitiveLevel, ContentBlock, ImageBlockData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    eli5_title: { type: Type.STRING },
    eli5_summary: { type: Type.STRING },
    eli5_blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['text', 'image', 'stat', 'quote'] },
          weight: { type: Type.INTEGER },
          heading: { type: Type.STRING },
          body: { type: Type.STRING },
        },
        required: ['type', 'weight', 'body']
      },
    },
    eli5_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    
    academic_title: { type: Type.STRING },
    academic_summary: { type: Type.STRING },
    academic_blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['text', 'image', 'stat', 'quote'] },
          weight: { type: Type.INTEGER },
          heading: { type: Type.STRING },
          body: { type: Type.STRING },
        },
        required: ['type', 'weight', 'body']
      },
    },
    academic_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    socratic_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "eli5_title", "eli5_summary", "eli5_blocks", "eli5_keywords",
    "academic_title", "academic_summary", "academic_blocks", "academic_keywords",
    "socratic_questions"
  ],
};

// --- Image Retrieval Service ---

async function fetchStockImage(keywords: string, weight: number): Promise<ImageBlockData> {
  const orientation = weight === 3 ? 'landscape' : weight === 2 ? 'portrait' : 'squarish';
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  // 1. Try Unsplash API if key exists
  if (accessKey) {
     try {
       const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&orientation=${orientation}&per_page=1`, {
         headers: { Authorization: `Client-ID ${accessKey}` }
       });
       const data = await res.json();
       if (data.results && data.results.length > 0) {
         const img = data.results[0];
         return {
           url_regular: img.urls.regular,
           url_thumb: img.urls.small,
           alt_text: img.alt_description || keywords,
           photographer: {
             name: img.user.name,
             url: img.user.links.html
           },
           download_location: img.links.download_location
         };
       }
     } catch (e) {
       console.warn("Unsplash API failed/missing, falling back to generative stock.");
     }
  }

  // 2. Fallback: Generative Stock Photography (Pollinations.ai)
  // We simulate stock photography by injecting style keywords
  const stylePrompt = `stock photography of ${keywords}, highly detailed, 8k, photorealistic, cinematic lighting, aesthetic, unsplash style`;
  
  // Dimensions based on weight
  let width = 600;
  let height = 600;
  if (weight === 3) { width = 1200; height = 800; } // Landscape Hero
  else if (weight === 2) { width = 600; height = 900; } // Portrait
  
  const seed = Math.floor(Math.random() * 1000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(stylePrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
  
  return {
    url_regular: url,
    url_thumb: url,
    alt_text: keywords,
    photographer: { name: "AI Generated", url: "#" }
  };
}

async function hydrateBlocks(blocks: any[]): Promise<ContentBlock[]> {
  return Promise.all(blocks.map(async (block) => {
    if (block.type === 'image') {
      const imageData = await fetchStockImage(block.body, block.weight);
      return { ...block, data: imageData };
    }
    return block;
  }));
}

// --- Main Generation Function ---

export const generatePebble = async (topic: string, contextPebbles: PebbleData[] = []): Promise<PebbleData> => {
  const model = "gemini-2.5-flash"; 
  
  let contextPrompt = "";
  if (contextPebbles.length > 0) {
      contextPrompt = `
      CONTEXT:
      The user has explicitly referenced the following existing knowledge nodes. 
      Use these to contrast, connect, or deepen the analysis of the new topic. 
      Do not just repeat them, but show how the new topic relates to them.
      
      Referenced Nodes:
      ${contextPebbles.map(p => `- Topic: "${p.topic}"\n  Summary: "${p.content[CognitiveLevel.ELI5].summary}"`).join('\n')}
      `;
  }

  const prompt = `
    You are 'Pebbles', a Generative Cognitive Builder. 
    Analyze the topic: "${topic}".
    ${contextPrompt}
    
    Create a modular knowledge artifact with two cognitive levels (ELI5 and Academic).
    Instead of a linear essay, generate "Blocks" with specific Weights and Types.

    Weights dictate visual importance:
    - Weight 3 (Hero): The core concept or key visualization. Large, central.
    - Weight 2 (Major): Key arguments, main evidence, or illustrations.
    - Weight 1 (Minor): Fun facts, definitions, stats, or short quotes.

    Types:
    - 'text': Standard explanation.
    - 'image': A stock photo search query.
    - 'stat': A single number or short stat (e.g., "99%", "1945").
    - 'quote': A memorable quote or aphorism.

    REQUIREMENTS:
    1. ELI5: Use analogies, metaphors. 
       - Include at least one 'image' block (Weight 2 or 3).
       - Include at least one 'stat' or 'quote' block (Weight 1).
    2. Academic: Deep technical analysis.
       - Include one complex 'image' block (Weight 3).
       - Include dense 'text' blocks (Weight 2).
    
    CRITICAL IMAGE INSTRUCTIONS (Search Query Generation):
    - For 'image' blocks, the 'body' field must be a comma-separated list of 2-3 CONCRETE, PHYSICAL keywords for a stock photo search engine.
    - Do NOT use abstract concepts like "freedom" or "efficiency". 
    - TRANSLATE abstract concepts into visual metaphors. 
      Example: Instead of "Confusion", use "maze, fog, tangled wires".
      Example: Instead of "Idea", use "lightbulb, glowing filament, spark".
    - The 'heading' field acts as the caption for the image.
    
    3. Generate 3 Socratic reflection questions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const json = JSON.parse(text);

    // Hydrate images (fetch URLs)
    const eli5Blocks = await hydrateBlocks(json.eli5_blocks);
    const academicBlocks = await hydrateBlocks(json.academic_blocks);

    const pebble: PebbleData = {
      id: crypto.randomUUID(),
      topic: topic,
      timestamp: Date.now(),
      folderId: null, // Initialize at root
      isVerified: false,
      content: {
        [CognitiveLevel.ELI5]: {
          title: json.eli5_title,
          summary: json.eli5_summary,
          blocks: eli5Blocks,
          keywords: json.eli5_keywords,
        },
        [CognitiveLevel.ACADEMIC]: {
          title: json.academic_title,
          summary: json.academic_summary,
          blocks: academicBlocks,
          keywords: json.academic_keywords,
        },
      },
      socraticQuestions: json.socratic_questions,
    };

    return pebble;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};