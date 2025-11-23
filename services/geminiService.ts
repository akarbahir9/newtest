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
      style: string
  }
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an inline Ghost Text autocomplete engine for a creative writing app.
      Your job is to provide a VERY short continuation (3-10 words) of the user's current sentence or thought.
      
      CONTEXT:
      Project Type: ${context.type}
      Genre: ${context.genre}
      Writing Style: ${context.style}
      
      INPUT TEXT (Last 500 chars):
      "${currentText.slice(-500)}"
      
      RULES:
      1. Provide ONLY the suggested text. No explanations. No quotes.
      2. If the input stops mid-sentence, finish it naturally.
      3. If the input is a complete sentence, suggest the start of the next logical action or dialogue.
      4. MATCH THE FORMAT:
         - If Screenplay: Suggest action lines or dialogue.
         - If Novel: Suggest prose.
      5. Keep it short (max 15 words). It must look like a natural continuation.
      6. Do NOT repeat words that are already at the end of the input.
      
      COMPLETION:`,
      config: {
        maxOutputTokens: 25,
        temperature: 0.4,
        stopSequences: ["\n", ".", "  "]
      }
    });
    const suggestion = response.text?.trim() || "";
    const lastWord = currentText.trim().split(' ').pop();
    if (lastWord && suggestion.startsWith(lastWord)) {
        return suggestion.slice(lastWord.length).trim();
    }
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
      
      For the 'complication', make it dramatic and relevant to the genre.`,
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
