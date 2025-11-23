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
    const safeContext = projectContext ? projectContext.slice(0, 100000) : '';

    let systemInstruction = `You are Zoer, an advanced AI story assistant. You speak and write primarily in Kurdish (Sorani).
        
    CRITICAL FORMATTING RULES:
    1. When asked to write, rewrite, or generate scene content, you MUST enclose the actual screenplay text within <screenplay> and </screenplay> tags.
    2. Inside these tags, use HTML with the following classes for "Hollywood Standard" formatting (but with Kurdish Content):
       - <div class="sp-slug">NAW./DER. SHWÊN - KAT (ROJ/SHEW)</div> (Use Kurdish slugs: NAWEWE/DEREWE)
       - <div class="sp-action">Action description here...</div>
       - <div class="sp-character">CHARACTER NAME</div>
       - <div class="sp-parenthetical">(wryly)</div>
       - <div class="sp-dialogue">Dialogue goes here.</div>
       - <div class="sp-transition">CUT TO:</div> (Use Kurdish Transition if appropriate, or English standard)
    3. Keep your analysis, introduction, or appendix notes OUTSIDE the <screenplay> tags.
    
    MODES OF OPERATION:
    
    A. SELECTION MODE (Specific Text):
    If the prompt includes "SELECTED TEXT", assume the user wants changes ONLY to that specific segment.
    - Analyze or rewrite ONLY the selected text.
    - Provide alternatives ONLY for the selected text.
    - Do NOT output the whole scene.
    - Wrap the rewritten segment in <screenplay> tags.

    B. SCENE MODE (General):
    If the user asks to "check", "review", "analyze", or "critique" the scene (and NO selected text is provided):
    1. First, provide a bulleted list of feedback (Pacing, Dialogue, Conflict, formatting) in Kurdish.
    2. Then, provide a "SUGGESTED REWRITE" or "IMPROVED VERSION" block.
    3. This rewrite block MUST be wrapped in <screenplay> tags.

    C. GENERAL CHAT & ANALYSIS (No Screenplay generation):
    If the user asks for information, summaries, or character analysis:
    - Use **Markdown** for formatting.
    - Use **Bold** keys (e.g., **Name:**) for structured data.
    - Use bullet points (*) for lists.
    - Be concise and visually clean.
    - Respond in Kurdish (Sorani).
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
    return response.text || "نەمتوانی وەڵامێک دروست بکەم.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "ببورە، کێشەیەک هەیە لە پەیوەندیکردن بە خزمەتگوزاری زیرەکی دەستکرد. ڕەنگە دەقەکە زۆر گەورە بێت یان کێشەی ئینتەرنێت هەبێت.";
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
    
    // Context Slice - ensure we capture enough RTL context
    // Taking the last 1200 chars to be safe for context window and RTL flow
    const textSlice = cleanText.slice(-1200) || "سەرەتای چیرۆکەکە";

    // Optimized Prompt for Kurdish Sorani
    const prompt = `You are a creative writing assistant for Kurdish (Sorani).
    
    TASK: Continue the story text naturally.
    
    CONTEXT:
    Genre: ${context.genre}
    Style: ${context.style}
    Current Scene Goal: ${context.goal || 'Advance the plot'}
    
    INPUT TEXT (End of current scene):
    "${textSlice}"
    
    INSTRUCTIONS:
    1. Generate the immediate next 3-10 words in Kurdish (Sorani).
    2. Maintain the tone and style of the input.
    3. Do NOT repeat the last word of the input.
    4. Do NOT start with a space if the input already ends with one.
    5. Return ONLY the completion text. No explanations.
    6. If the input is dialogue (inside quotes), complete the dialogue.
    7. If the input is action, complete the action description.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 30, // Increased slightly
        temperature: 0.45, // Increased for creativity
        stopSequences: ["<", "\n", "["], // Stop on new block or HTML
      }
    });
    
    let suggestion = response.text?.trim() || "";
    
    if (!suggestion) return "";

    // Cleanup quotes if model hallucinates them
    suggestion = suggestion.replace(/^["']|["']$/g, '');
    
    // Space Handling:
    // If the input didn't end with a space, and the suggestion doesn't start with punctuation, add a space.
    // Added Kurdish punctuation checks (، ؛ ؟)
    if (!suggestion.startsWith(' ') && !isTrailingSpace && !/^[.,;?!،؛؟]/.test(suggestion)) {
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
    const safeContext = context.slice(0, 100000);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a sophisticated story engine. Analyze the provided metadata and scene content.
      
      Generate 4 distinct types of suggestions in Kurdish (Sorani) based on the context:
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
      
      For the 'complication', make it dramatic.
      ENSURE ALL TEXT VALUES ARE IN KURDISH (SORANI).`,
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
