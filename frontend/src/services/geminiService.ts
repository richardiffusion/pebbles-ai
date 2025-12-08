// import { GoogleGenAI, Type, Schema } from "@google/genai";
// import { PebbleData, CognitiveLevel, IconType } from "../types";

// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// // --- New Schema for Magazine Layout ---

// const MAIN_BLOCK_SCHEMA: Schema = {
//   type: Type.OBJECT,
//   properties: {
//     type: { type: Type.STRING, enum: ['text', 'pull_quote', 'key_points'] },
//     heading: { type: Type.STRING, description: "Optional header for the section" },
//     iconType: { 
//       type: Type.STRING, 
//       enum: ['definition', 'history', 'idea', 'controversy', 'future', 'analysis', 'default'],
//       description: "Semantic icon mapping for the section header"
//     },
//     body: { 
//       type: Type.STRING, // We will parse JSON array for key_points manually or just ask for string with delimiters if needed, but here we can try flexible
//       description: "For 'key_points', return a pipe-separated string (e.g. 'Point 1|Point 2'). For others, standard text."
//     },
//   },
//   required: ['type', 'body']
// };

// const SIDEBAR_BLOCK_SCHEMA: Schema = {
//   type: Type.OBJECT,
//   properties: {
//     type: { type: Type.STRING, enum: ['definition', 'profile', 'stat'] },
//     heading: { type: Type.STRING },
//     body: { type: Type.STRING },
//     emoji: { type: Type.STRING, description: "Single emoji for profile avatar or visual" },
//   },
//   required: ['type', 'heading', 'body']
// };

// const LEVEL_CONTENT_SCHEMA: Schema = {
//   type: Type.OBJECT,
//   properties: {
//     title: { type: Type.STRING },
//     summary: { type: Type.STRING },
//     emojiCollage: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 emojis representing the core theme" },
//     mainContent: { type: Type.ARRAY, items: MAIN_BLOCK_SCHEMA },
//     sidebarContent: { type: Type.ARRAY, items: SIDEBAR_BLOCK_SCHEMA },
//     keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
//   },
//   required: ['title', 'summary', 'emojiCollage', 'mainContent', 'sidebarContent', 'keywords']
// };

// const RESPONSE_SCHEMA: Schema = {
//   type: Type.OBJECT,
//   properties: {
//     eli5_content: LEVEL_CONTENT_SCHEMA,
//     academic_content: LEVEL_CONTENT_SCHEMA,
//     socratic_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
//   },
//   required: ["eli5_content", "academic_content", "socratic_questions"],
// };

// // --- Main Generation Function ---

// export const generatePebble = async (topic: string, contextPebbles: PebbleData[] = []): Promise<PebbleData> => {
//   const model = "gemini-2.5-flash"; 
  
//   let contextPrompt = "";
//   if (contextPebbles.length > 0) {
//       contextPrompt = `
//       CONTEXT NODES:
//       The user explicitly referenced these existing pebbles. Connect the new topic to them.
//       ${contextPebbles.map(p => `- ${p.topic}: ${p.content[CognitiveLevel.ELI5].summary}`).join('\n')}
//       `;
//   }

//   const prompt = `
//     You are 'Pebbles', a Cognitive Architect.
//     Topic: "${topic}"
//     ${contextPrompt}

//     Generate a high-density, magazine-style knowledge artifact.
//     Structure the content into two distinct cognitive levels (ELI5 and Academic).
    
//     VISUAL STYLE:
//     - Do NOT generate images. Instead, use "Emoji Collages" (sets of 3-5 emojis) to conceptually represent the topic.
//     - Use "Sidebar" content to offload definitions, stats, and profiles, keeping the main text clean.

//     LAYOUT INSTRUCTIONS:
//     1. **Main Content (70% width)**:
//        - Deep, narrative text broken into logical sections.
//        - Use 'pull_quote' for impactful insights.
//        - Use 'key_points' for checklists or summaries (format body as "Point 1|Point 2|Point 3").
//        - Assign 'iconType' to headers based on semantics:
//          * 'definition' (Lightbulb): Core concepts.
//          * 'history' (Library/Hourglass): Background.
//          * 'idea' (Spark): Key insights.
//          * 'controversy' (Scale): Debates/Issues.
//          * 'future' (Rocket): Outlook.
//          * 'analysis' (Magnifying Glass): Deep dive.

//     2. **Sidebar Content (30% width)**:
//        - 'definition': Brief glossary terms.
//        - 'profile': Key historical figures (assign a relevant emoji avatar).
//        - 'stat': Key numbers or dates.

//     3. **Cognitive Levels**:
//        - ELI5: Use metaphors, analogies. Sidebar focus on fun facts/simple terms.
//        - Academic: Technical depth, historical context. Sidebar focus on citations/complex definitions.

//     Generate 3 Socratic reflection questions for verification.
//   `;

//   try {
//     const response = await ai.models.generateContent({
//       model: model,
//       contents: prompt,
//       config: {
//         responseMimeType: "application/json",
//         responseSchema: RESPONSE_SCHEMA,
//       },
//     });

//     const text = response.text;
//     if (!text) throw new Error("No response from Gemini");

//     const json = JSON.parse(text);

//     // Helper to process body content (split pipes for key_points)
//     const processMainContent = (blocks: any[]) => {
//         return blocks.map(b => {
//             if (b.type === 'key_points' && typeof b.body === 'string') {
//                 return { ...b, body: b.body.split('|').map((s: string) => s.trim()) };
//             }
//             return b;
//         });
//     };

//     const pebble: PebbleData = {
//       id: crypto.randomUUID(),
//       topic: topic,
//       timestamp: Date.now(),
//       folderId: null,
//       isVerified: false,
//       content: {
//         [CognitiveLevel.ELI5]: {
//           ...json.eli5_content,
//           mainContent: processMainContent(json.eli5_content.mainContent)
//         },
//         [CognitiveLevel.ACADEMIC]: {
//           ...json.academic_content,
//           mainContent: processMainContent(json.academic_content.mainContent)
//         },
//       },
//       socraticQuestions: json.socratic_questions,
//     };

//     return pebble;

//   } catch (error) {
//     console.error("Gemini Generation Error:", error);
//     throw error;
//   }
// };