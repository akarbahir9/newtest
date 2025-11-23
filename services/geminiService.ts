import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAssistantResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: `You are Zoer, an advanced AI story assistant. 
        
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
        
        Example Output:
        Here is the rewritten scene with more tension:
        <screenplay>
        <div class="sp-slug">INT. AIRLOCK - NIGHT</div>
        <div class="sp-action">Sparks shower from the ceiling.</div>
        </screenplay>
        I added sparks to increase urgency.`,
      },
      history: history,
    });

    const response = await chat.sendMessage({ message });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error connecting to the AI service. Please check your API key.";
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
    // Construct rich context for the model
    const projectContext = `
    PROJECT DETAILS:
    Title: ${context.title || 'Untitled'}
    Format: ${context.type}
    Genre: ${context.genre}
    Style: ${context.style}
    Logline: ${context.logline || 'N/A'}
    Setting: ${context.setting || 'N/A'}
    Protagonist Goal: ${context.goal || 'N/A'}
    Key Characters: ${context.characters || 'N/A'}
    `;

    const prompt = `You are an expert creative writing co-pilot (Ghost Text).
    
    ${projectContext}
    
    TASK:
    Predict the immediate next few words (2-10 words) to continue the story naturally.
    The input text ends abruptly. You must continue it seamlessly.
    
    RULES:
    1. Output ONLY the continuation text.
    2. Do NOT repeat the last word of the input.
    3. Do NOT provide explanations or quotes.
    4. Match the tone and voice of the input exactly.
    5. If the input ends with a space, provide the next word.
    
    INPUT TEXT (The story so far):
    ${currentText.slice(-2000)}
    
    CONTINUATION:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 20, // Keep it short for inline feel
        temperature: 0.4,    // Balanced creativity and coherence
        stopSequences: ["\n"] // Stop at line breaks to prevent multi-line ghosts
      }
    });
    
    let suggestion = response.text?.trim() || "";
    if (!suggestion) return "";

    // Intelligent overlap removal to prevent stuttering
    // e.g. Input: "Hello world" -> Suggestion: "world is big" -> Result: " is big"
    const words = currentText.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    
    if (lastWord) {
        const lowerSuggestion = suggestion.toLowerCase();
        const lowerLastWord = lastWord.toLowerCase();
        
        // If suggestion starts with the last word, strip it
        if (lowerSuggestion.startsWith(lowerLastWord)) {
             suggestion = suggestion.slice(lastWord.length).trim();
        }
    }
    
    // Safety cleanup: remove leading punctuation if it doesn't make sense (optional, but good for flow)
    // For now, we trust the model mostly, but ensure leading space is handled by the UI
    
    return suggestion;
  } catch (error) {
    return "";
  }
};

export const generateStructuredSuggestions = async (context: string): Promise<any> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a sophisticated story engine. Analyze the provided metadata and scene content.
      
      Generate 4 distinct types of suggestions based on the context:
      1. Plot: Next beats or scene ideas.
      2. Character: How characters should react or develop.
      3. World: Sensory details or lore to add.
      4. Complication: A MAJOR plot twist or obstacle to raise the stakes immediately.
      
      CONTEXT:
      ${context}
      
      Return ONLY valid JSON with this structure:
      {
        "plot": ["suggestion 1", "suggestion 2"],
        "character": ["suggestion 1", "suggestion 2"],
        "world": ["suggestion 1", "suggestion 2"],
        "complication": "A single paragraph describing a major complication."
      }
      
      For the 'complication', make it dramatic and relevant to the horrific genre.`,
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