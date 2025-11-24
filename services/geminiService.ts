import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Tool Definitions
const updateProjectTool: FunctionDeclaration = {
  name: "update_project_metadata",
  description: "Update the current project's global metadata. Use this when the user asks to change the title, logline, theme, setting, goal, or detailed story.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      logline: { type: Type.STRING },
      detailedStory: { type: Type.STRING, description: "The full detailed story or synopsis" },
      theme: { type: Type.STRING },
      setting: { type: Type.STRING },
      protagonistGoal: { type: Type.STRING },
      genres: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  }
};

const updateCharacterTool: FunctionDeclaration = {
  name: "update_character",
  description: "Update an existing character's details. Requires the character ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "The ID of the character to update" },
      name: { type: Type.STRING },
      role: { type: Type.STRING },
      archetype: { type: Type.STRING },
      description: { type: Type.STRING },
      traits: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["id"]
  }
};

const updateSceneTool: FunctionDeclaration = {
  name: "update_scene",
  description: "Rewrite the content of a specific scene. Use this to change dialogue, action, or rewrite the whole scene based on user request. You MUST provide the FULL valid HTML content for the scene, maintaining the screenplay formatting classes (sp-slug, sp-action, sp-character, sp-dialogue, sp-parenthetical).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sceneId: { type: Type.STRING, description: "The ID of the scene to update. Use 'current' for the active scene." },
      content: { type: Type.STRING, description: "The full new HTML content of the scene." }
    },
    required: ["sceneId", "content"]
  }
};

const findReplaceTool: FunctionDeclaration = {
  name: "find_replace",
  description: "Replace a specific word or exact phrase across the entire project or just the current scene. Useful for renaming characters or changing repeated terms.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      search: { type: Type.STRING, description: "The exact text to find." },
      replace: { type: Type.STRING, description: "The text to replace it with." },
      scope: { type: Type.STRING, enum: ["project", "scene"], description: "Scope of the replacement: 'project' for all scenes, 'scene' for current scene only." }
    },
    required: ["search", "replace", "scope"]
  }
};

export const generateAssistantResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  projectContext?: string
): Promise<{ text: string, toolCalls?: any[] }> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // Truncate context if excessive
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
    
    CAPABILITIES:
    - You can update project metadata (title, logline, detailed story, etc.).
    - You can update character details.
    - You can REWRITE specific scenes using the 'update_scene' tool.
    - You can Find & Replace text globally or locally using the 'find_replace' tool.
    - If you perform an update, confirm it in the text response.

    MODES OF OPERATION:
    
    A. SELECTION MODE (Specific Text):
    If the prompt includes "SELECTED TEXT", assume the user wants changes ONLY to that specific segment.
    - Analyze or rewrite ONLY the selected text.
    - Wrap the rewritten segment in <screenplay> tags.

    B. EDITING & UPDATING:
    - If the user asks to "change X to Y" in the whole script, use 'find_replace' with scope='project'.
    - If the user asks to rewrite the current scene or change specific dialogue/action in it, generate the NEW full HTML for the scene and use 'update_scene'.

    C. GENERAL CHAT & ANALYSIS:
    If the user asks for information, summaries, or character analysis:
    - Use **Markdown** for formatting.
    - Be concise and visually clean.
    - Respond in Kurdish (Sorani).
    `;

    if (safeContext) {
        systemInstruction += `\n\n=== PROJECT MEMORY & CONTEXT ===\n${safeContext}\n=== END MEMORY ===\n\nUse the specific details from the Project Memory above to answer questions. If updating characters, use the IDs provided in the memory.`;
    }

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [updateProjectTool, updateCharacterTool, updateSceneTool, findReplaceTool] }],
      },
      history: history,
    });

    const response = await chat.sendMessage({ message });
    
    // Check for function calls in the candidate
    const candidate = response.candidates?.[0];
    let toolCalls = [];
    
    if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
            if (part.functionCall) {
                toolCalls.push(part.functionCall);
            }
        }
    }

    return {
        text: response.text || (toolCalls.length > 0 ? "داواکارییەکەت جێبەجێ دەکەم..." : "نەمتوانی وەڵامێک دروست بکەم."),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "ببورە، کێشەیەک هەیە لە پەیوەندیکردن بە خزمەتگوزاری زیرەکی دەستکرد." };
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
    
    const cleanText = currentText.replace(/\u00A0/g, ' ');
    const isTrailingSpace = cleanText.endsWith(' ');
    
    const textSlice = cleanText.slice(-1200) || "سەرەتای چیرۆکەکە";

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
    4. Return ONLY the completion text. No explanations.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 80,
        temperature: 0.45,
        stopSequences: ["<"], 
      }
    });
    
    let suggestion = response.text?.trim() || "";
    
    if (!suggestion) return "";

    suggestion = suggestion.replace(/^["']|["']$/g, '');
    
    if (isTrailingSpace && suggestion.startsWith(' ')) {
        suggestion = suggestion.trimStart();
    }
    else if (!isTrailingSpace && !suggestion.startsWith(' ') && !/^[.,;?!،؛؟]/.test(suggestion)) {
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