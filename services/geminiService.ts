import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAssistantResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  projectContext?: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // Truncate context if excessive to prevent browser XHR errors (code 6)
    // 100,000 chars is roughly 25-30k tokens, which is safe for most network conditions
    // while still utilizing a good chunk of Flash's context window.
    const safeContext = projectContext ? projectContext.slice(0, 100000) : '';

    let systemInstruction = `You are Zoer, an advanced AI story assistant. 
        
    CRITICAL FORMATTING RULES:
    1. When asked to write, rewrite, or generate scene content, you MUST enclose the actual screenplay text within <screenplay> and </screenplay> tags.
    2. Inside these tags, use HTML with the following classes for "Hollywood Standard" formatting:
       - <div class="sp-slug">INT./EXT. SLUG - DAY</div>
       - <div class="sp-action">Action description here...</div>
       - <div class="sp-character">CHARACTER NAME</div>
       - <div class="sp-parenthetical">(wryly)</div>
       - <div class="sp-dialogue">Dialogue goes here.</div>
       - <div class="sp-transition">CUT TO:</div>
    3. Keep your analysis, introduction, or appendix notes OUTSIDE the <screenplay> tags.
    4. Be concise in your analysis.

    SCENE CHECK & ANALYSIS MODE:
    If the user asks to "check", "review", "analyze", or "critique" the scene:
    1. First, provide a bulleted list of feedback (Pacing, Dialogue, Conflict, formatting).
    2. Then, provide a "SUGGESTED REWRITE" or "IMPROVED VERSION" block.
    3. This rewrite block MUST be wrapped in <screenplay> tags so the user can apply it directly to their editor.
    `;

    if (safeContext) {
        systemInstruction += `\n\n=== PROJECT MEMORY & CONTEXT ===\n${safeContext}\n=== END MEMORY ===\n\nUse the specific details from the Project Memory above to answer questions about previous scenes, callback to earlier events, or maintain continuity.`;
    }

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction,
      },
      history: history,
    });

    const response = await chat.sendMessage({ message });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error connecting to the AI service. The context might be too large or there is a network issue.";
  }
};

export const generateAutocomplete = async (
  currentText: string,
  context: {
      type: string,
      genre: string,
      style: string,
      title?: string,
      logline?: string,
      characters?: string,
      setting?: string,
      goal?: string
  }
): Promise<string> => {
  try {
    if (!currentText) return "";
    
    // Normalize text
    const cleanText = currentText.replace(/\u00A0/g, ' ');
    const isTrailingSpace = cleanText.endsWith(' ');
    
    // Context Slice
    const textSlice = cleanText.slice(-600) || "The story begins with";

    // Optimized Prompt
    const prompt = `Complete the following sentence naturally. 
    
    CONTEXT:
    Genre: ${context.genre}
    Style: ${context.style}
    
    INPUT TEXT:
    "${textSlice}"
    
    INSTRUCTIONS:
    - Provide ONLY the next 3-8 words.
    - Do NOT repeat the input text.
    - Do NOT wrap in quotes.
    - Do NOT add comments.
    - Return text suitable for inline autocomplete.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 20, 
        temperature: 0.3,
        stopSequences: ["<"], // Only stop on HTML tags to allow punctuation
      }
    });
    
    let suggestion = response.text?.trim() || "";
    
    if (!suggestion) return "";

    // Cleanup quotes if model hallucinates them
    suggestion = suggestion.replace(/^["']|["']$/g, '');
    
    // Space Handling:
    // If the editor has a trailing space (user typed "word "), we usually want the next word "next".
    // If the editor is "word", we usually want " next".
    // Since we usually trigger on space, `isTrailingSpace` is typically true.
    if (!suggestion.startsWith(' ') && !isTrailingSpace && !/^[.,;?!]/.test(suggestion)) {
        suggestion = ' ' + suggestion;
    }
    
    return suggestion;
  } catch (error) {
    console.error("Autocomplete Error", error);
    return "";
  }
};

export const generateStructuredSuggestions = async (context: string): Promise<any> => {
  try {
    // Truncate context for suggestions as well
    const safeContext = context.slice(0, 100000);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a sophisticated story engine. Analyze the provided metadata and scene content.
      
      Generate 4 distinct types of suggestions based on the context:
      1. Plot: Next beats or scene ideas.
      2. Character: How characters should react or develop.
      3. World: Sensory details or lore to add.
      4. Complication: A MAJOR plot twist or obstacle to raise the stakes immediately.
      
      CONTEXT:
      ${safeContext}
      
      Return ONLY valid JSON with this structure:
      {
        "plot": ["suggestion 1", "suggestion 2"],
        "character": ["suggestion 1", "suggestion 2"],
        "world": ["suggestion 1", "suggestion 2"],
        "complication": "A single paragraph describing a major complication."
      }
      
      For the 'complication', make it dramatic.`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Suggestion Generation Error:", error);
    return null;
  }
};