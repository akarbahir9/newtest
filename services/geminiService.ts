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

export const checkContradictions = async (context: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following story context for logical contradictions, specifically regarding character injuries or location states. 
      
      Context: ${context}
      
      If a contradiction exists, explain it briefly in one sentence. If none, return "NO_CONTRADICTION".`,
    });
    
    const text = response.text?.trim();
    return text === "NO_CONTRADICTION" ? null : text || null;
  } catch (error) {
    return null;
  }
};

export const generateAutocomplete = async (
  currentText: string,
  genre: string = "Sci-Fi"
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Complete the following screenplay scene snippet. It is a ${genre} script. 
      Provide only the next 1-2 sentences of dialogue or action. Do not repeat the input.
      
      Input:
      ${currentText}`,
      config: {
        maxOutputTokens: 50,
        temperature: 0.6,
      }
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};