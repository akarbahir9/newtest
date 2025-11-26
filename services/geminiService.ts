import { GoogleGenAI, Type, FunctionDeclaration, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Existing Tools ---
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
      pov: { type: Type.STRING, description: "Point of View (e.g. First Person, Third Person Limited)" },
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

const createCharacterTool: FunctionDeclaration = {
  name: "create_character",
  description: "Create a new character in the project.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      role: { type: Type.STRING },
      archetype: { type: Type.STRING },
      description: { type: Type.STRING },
      traits: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["name"]
  }
};

const bulkCreateCharactersTool: FunctionDeclaration = {
    name: "bulk_create_characters",
    description: "Create multiple characters at once. Use this when analyzing the Plan/Blueprint to populate the character list automatically.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            characters: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        role: { type: Type.STRING },
                        archetype: { type: Type.STRING },
                        description: { type: Type.STRING },
                        traits: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["name"]
                }
            }
        },
        required: ["characters"]
    }
};

const createLocationTool: FunctionDeclaration = {
  name: "create_location",
  description: "Create a new location in the project.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      type: { type: Type.STRING, enum: ["INT", "EXT", "MIXED"] },
      description: { type: Type.STRING }
    },
    required: ["name"]
  }
};

const createSceneTool: FunctionDeclaration = {
  name: "create_scene",
  description: "Create a new scene or chapter. IMPORTANT: For Screenplays, content must be HTML with screenplay classes. For NOVELS, content must be standard HTML using <h1>, <p>, <em> tags for prose.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      content: { type: Type.STRING, description: "Full HTML content. Screenplay: <div class='sp-slug'>...</div>. Novel: <h1>Chapter X</h1><p>...</p>" },
      summary: { type: Type.STRING }
    },
    required: ["title", "content"]
  }
};

const updateSceneTool: FunctionDeclaration = {
  name: "update_scene",
  description: "Rewrite the content of a specific scene or chapter. YOU MUST PROVIDE THE FULL VALID HTML CONTENT.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sceneId: { type: Type.STRING, description: "The ID of the scene/chapter to update." },
      content: { type: Type.STRING, description: "The full new HTML content." }
    },
    required: ["sceneId", "content"]
  }
};

const deleteItemTool: FunctionDeclaration = {
    name: "delete_item",
    description: "Delete a single item. YOU MUST PROVIDE THE EXACT UUID from the context memory.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING, description: "The UUID of the item to delete." },
            type: { type: Type.STRING, enum: ["character", "location", "scene"], description: "The type of item to delete." }
        },
        required: ["id", "type"]
    }
};

const bulkDeleteItemsTool: FunctionDeclaration = {
    name: "bulk_delete_items",
    description: "Delete multiple items at once. YOU MUST PROVIDE THE EXACT UUIDs from the context memory for 'id'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: "UUID of the item" },
                        type: { type: Type.STRING, enum: ["character", "location", "scene"] }
                    },
                    required: ["id", "type"]
                }
            }
        },
        required: ["items"]
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

const updateBlueprintTool: FunctionDeclaration = {
    name: "update_blueprint",
    description: "Update the project's detailed plan/blueprint. Use this when the user asks to create, modify, or outline the story structure.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING, description: "The full updated Markdown content of the blueprint." }
      },
      required: ["content"]
    }
};

// --- NEW TOOLS FOR STORY CREATION ---
const finalizeStoryTool: FunctionDeclaration = {
    name: "finalize_story_concept",
    description: "Call this tool ONLY when you have gathered enough information (Title, Type, Genres, Logline, Structure, POV, etc.) to create the story. This completes the interview.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['Screenplay', 'Novel', 'Serial'] },
            format: { type: Type.STRING, enum: ['Feature', 'Short', 'Episode', 'Standard'] },
            genres: { type: Type.ARRAY, items: { type: Type.STRING } },
            logline: { type: Type.STRING },
            detailedStory: { type: Type.STRING, description: "A comprehensive summary of the story generated from the conversation." },
            theme: { type: Type.STRING },
            setting: { type: Type.STRING },
            protagonistGoal: { type: Type.STRING },
            pov: { type: Type.STRING, description: "The selected Point of View for the story (e.g. First Person, Third Person Limited)." },
            targetMetadata: {
                type: Type.OBJECT,
                description: "Structural targets based on project type.",
                properties: {
                    durationMinutes: { type: Type.NUMBER, description: "For Movies/Screenplays" },
                    targetPageCount: { type: Type.NUMBER, description: "For Novels" },
                    totalSeasons: { type: Type.NUMBER, description: "For Serials/TV" },
                    episodesPerSeason: { type: Type.NUMBER, description: "For Serials/TV" },
                    episodeDuration: { type: Type.NUMBER, description: "For Serials/TV (in minutes)" }
                }
            },
            characters: { 
                type: Type.ARRAY, 
                description: "List of core characters identified during the chat",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        role: { type: Type.STRING },
                        archetype: { type: Type.STRING },
                        description: { type: Type.STRING }
                    }
                }
            }
        },
        required: ["title", "type", "logline", "detailedStory"]
    }
};

// --- MAIN ASSISTANT ---

export const generateAssistantResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  projectContext?: string
): Promise<{ text: string, toolCalls?: any[] }> => {
  try {
    const model = 'gemini-2.5-flash';
    const safeContext = projectContext ? projectContext.slice(0, 100000) : '';

    // Check Project Type from context to decide instructions
    const isNovel = safeContext.includes('Type: Novel');
    const povMatch = safeContext.match(/POV: (.*?)\n/);
    const selectedPov = povMatch ? povMatch[1].trim() : "Third Person Limited";

    let systemInstruction = `You are Zoer, an advanced AI story assistant. You speak and write primarily in Kurdish (Sorani).`;

    if (isNovel) {
        systemInstruction += `
    
    MODE: NOVEL / PROSE WRITING
    SELECTED POINT OF VIEW (POV): ${selectedPov}
    
    POV RULES (CRITICAL):
    - **First Person**: Use Kurdish pronouns like "Min" (من) and suffixes "-m" (م-). You are inside the head of the narrator.
    - **Second Person**: Use Kurdish pronoun "To" (تۆ). Address the reader/protagonist directly.
    - **Third Person**: Use Kurdish pronouns like "Ew" (ئەو).
    - **Third Person Limited**: Stick strictly to ONE character's internal thoughts per scene.
    - **Third Person Omniscient**: You know everything about everyone.
    - **Third Person Objective**: Describe ONLY what is visible/audible (like a camera). No internal thoughts.

    CRITICAL FORMATTING RULES FOR NOVELS:
    1. When asked to write, rewrite, or generate chapter content, you MUST enclose the actual story text within <screenplay> and </screenplay> tags (using this tag for consistency, but the content will be prose).
    2. Inside these tags, use STANDARD HTML for books/novels:
       - Use <h1> for Chapter Titles.
       - Use <p> for paragraphs.
       - Use <em> for emphasis/thought.
       - Use <strong> for strong emphasis.
       - DO NOT use screenplay slugs (INT./EXT.) or screenplay classes (.sp-action).
    
    STYLE GUIDE:
    - Write in engaging, descriptive prose in KURDISH (SORANI).
    - Focus on internal monologue (if POV permits), sensory details, and show-dont-tell.
    - Use Kurdish (Sorani) literary style suitable for novels.
    - STRICTLY ADHERE TO THE SELECTED POV: ${selectedPov}.
        `;
    } else {
        systemInstruction += `
    
    MODE: SCREENPLAY / SCRIPT WRITING
        
    CRITICAL FORMATTING RULES FOR SCREENPLAYS:
    1. When asked to write, rewrite, or generate scene content, you MUST enclose the actual screenplay text within <screenplay> and </screenplay> tags.
    2. Inside these tags, use HTML with the following classes for "Hollywood Standard" formatting (but with Kurdish Content):
       - <div class="sp-slug">NAW./DER. SHWÊN - KAT (ROJ/SHEW)</div> (Use Kurdish slugs: NAWEWE/DEREWE)
       - <div class="sp-action">Action description here...</div>
       - <div class="sp-character">CHARACTER NAME</div>
       - <div class="sp-parenthetical">(wryly)</div>
       - <div class="sp-dialogue">Dialogue goes here.</div>
       - <div class="sp-transition">CUT TO:</div> (Use Kurdish Transition if appropriate, or English standard)
    3. Keep your analysis, introduction, or appendix notes OUTSIDE the <screenplay> tags.
        `;
    }
    
    systemInstruction += `
    CAPABILITIES:
    - You can update project metadata (title, logline, detailed story, etc.).
    - You can CREATE new characters, locations, or scenes (Chapters).
    - You can BULK CREATE characters using 'bulk_create_characters'. Use this when the user asks to generate characters from the Plan/Blueprint, or if you analyze the Blueprint and see characters that don't exist in the database.
    - You can DELETE single items using 'delete_item' or multiple items using 'bulk_delete_items'. Always find the correct IDs from the context.
    - You can update character details.
    - You can REWRITE specific scenes/chapters using the 'update_scene' tool.
    - You can Find & Replace text globally or locally using the 'find_replace' tool.

    MODES OF OPERATION:
    
    A. GOAL MONITORING & PROGRESS CHECKING (CRITICAL):
    - You are actively monitoring the project against the Blueprint Plan.
    - The "CURRENT ACTIVE GOAL" is provided in the context.
    - When you analyze the current scene content, compare it against the "CURRENT ACTIVE GOAL".
    - IF the content fully satisfies the goal, you MUST explicitly tell the user: 
      "✅ ئامانجەکە بەدەست هات: [Goal Description]. دەتوانیت کۆتایی بەم بەشە بهێنیت یان بچیتە بەشی داهاتوو." (Goal Reached).
    - Be alert to "Page Targets" or "Word Counts" if provided. If a chapter seems too short for its target, suggest expanding.

    B. PLANNING & CREATION:
    - Always check the "Plan/Blueprint" in the context. If the user asks to "populate characters" or "create characters from the plan", analyze the blueprint text and use 'bulk_create_characters' to add them all at once.
    
    C. DELETION (CRITICAL):
    - You have tools to delete items: 'delete_item' (single) and 'bulk_delete_items' (multiple).
    - You MUST retrieve the specific 'id' (UUID) of the item(s) from the provided Context Memory sections (=== CHARACTERS ===, etc).
    - If the user says "delete characters" (implying all) or "delete [Name] and [Name]", you MUST extract the IDs for ALL matched items and use 'bulk_delete_items'.
    - If the user says "delete [Name]", find the ID associated with [Name] and use 'delete_item'.
    - NEVER reply with just text like "I will delete them" when a tool is available. You MUST call the tool.

    D. EDITING & UPDATING:
    - If the user asks to "change X to Y" in the whole script, use 'find_replace' with scope='project'.
    - If the user asks to rewrite the current scene or change specific dialogue/action in it, generate the NEW full HTML for the scene and use 'update_scene'.

    E. GENERAL CHAT & ANALYSIS:
    If the user asks for information, summaries, or character analysis:
    - Use **Markdown** for formatting.
    - Be concise and visually clean.
    - Respond in Kurdish (Sorani).
    `;

    if (safeContext) {
        systemInstruction += `\n\n=== PROJECT MEMORY & CONTEXT ===\n${safeContext}\n=== END MEMORY ===\n\nUse the specific details from the Project Memory above to answer questions. If updating or deleting characters/scenes, use the exact UUIDs provided in the memory.`;
    }

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [
            updateProjectTool, 
            updateCharacterTool, 
            createCharacterTool,
            bulkCreateCharactersTool,
            createLocationTool,
            createSceneTool,
            updateSceneTool, 
            deleteItemTool,
            bulkDeleteItemsTool,
            findReplaceTool
        ] }],
      },
      history: history,
    });

    const response = await chat.sendMessage({ message });
    
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
        text: response.text || (toolCalls.length > 0 ? "داواکارییەکەت جێبەجێ دەکەم..." : "نەمتوانی وەڵامێک دروست بکەم. تکایە دڵنیابەرەوە کە ئایتمەکە بوونی هەیە."),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "ببورە، کێشەیەک هەیە لە پەیوەندیکردن بە خزمەتگوزاری زیرەکی دەستکرد." };
  }
};

// --- STORY BUILDER CHAT ---
export const generateStoryBuilderChat = async (
    history: { role: string; parts: { text: string }[] }[],
    message: string
): Promise<{ 
    text: string, 
    options?: string[], 
    multiSelect?: boolean,
    finalData?: any 
}> => {
    try {
        const systemInstruction = `You are Zoer's Creative Consultant. You speak in Kurdish (Sorani).
        
        GOAL: Interview the user to build a complete concept for a new Story (Screenplay, Novel, or Series).
        
        PROCESS:
        1. Ask questions one by one. Do not overwhelm the user.
        2. When asking about categorical things (Genre, Tone, Setting, Protagonist Archetype, Theme), you MUST provide a list of creative options in the JSON response in KURDISH.
        3. Be smart: Use the context of previous answers to generate better options.
        4. **CRITICAL - STRUCTURAL & FORMATTING QUESTIONS:**
           - If the user chooses 'Serial' (Series), you MUST ask about: Number of Seasons, Episodes per Season, and Episode Duration. Give options.
           - If the user chooses 'Screenplay' (Movie), you MUST ask about the approximate duration.
           - If the user chooses 'Novel', you MUST ask about the target page count.
           - **IF THE PROJECT IS A NOVEL:** You MUST ask about the "Point of View" (POV). 
             You MUST offer these 5 options (Translate them to Kurdish Sorani for the user):
             1. کەسی یەکەم - First Person (من)
             2. کەسی دووەم - Second Person (تۆ)
             3. کەسی سێیەم ( سنووردار) - Third Person Limited
             4. کەسی سێیەم (زانا بە هەموو شت) - Third Person Omniscient
             5. کەسی سێیەم (بابەتی/کامێرا) - Third Person Objective
        5. Once you have enough info (Title, Type, Logline, Structure/Metadata, POV if novel, characters, setting), call the 'finalize_story_concept' tool.
        
        OUTPUT FORMAT (STRICT JSON):
        Unless calling a tool, you MUST output a JSON object with this structure:
        {
             "message": "The text of your question or response in Kurdish. Use Markdown for bolding.",
             "options": ["Option 1", "Option 2", ...], // REQUIRED when asking a question that can have options. Provide options in KURDISH.
             "multiSelect": boolean // True if multiple options can be picked (Genre), False for single (Type, Tone).
        }
        
        IMPORTANT: 
        - DO NOT output Markdown code blocks like \`\`\`json. Just output the raw JSON object.
        - DO NOT include the "message" inside the "options" or vice versa.
        - The "message" field MUST contain the human readable question/text in Kurdish.
        
        EXAMPLES:
        User: "I want a horror movie."
        Assistant: {
           "message": "نایابە! چ جۆرە ترسناکێکت دەوێت؟",
           "options": ["ترسناکی دەروونی", "سلاشەر", "خەیاڵی", "فۆتێجی دۆزراوە", "ترسناکی جەستەیی"],
           "multiSelect": false
        }
        
        TONE: Enthusiastic, creative, helpful, professional.
        `;

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction,
                tools: [{ functionDeclarations: [finalizeStoryTool] }],
            },
            history: history,
        });

        const response = await chat.sendMessage({ message });
        
        const candidate = response.candidates?.[0];
        let finalData = undefined;
        let responseJson: any = {};
        let rawText = "";

        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.functionCall && part.functionCall.name === 'finalize_story_concept') {
                    finalData = part.functionCall.args;
                    responseJson = { message: "زانیارییەکانم وەرگرت. چیرۆکەکەت ئامادە دەکرێت..." };
                } else if (part.text) {
                    try {
                        let text = part.text.trim();
                        // Strip markdown blocks aggressively
                        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
                        
                        rawText = text;

                        // Robust JSON extraction: Find first '{' and last '}'
                        const jsonStart = text.indexOf('{');
                        const jsonEnd = text.lastIndexOf('}');

                        if (jsonStart !== -1 && jsonEnd !== -1) {
                             const jsonString = text.substring(jsonStart, jsonEnd + 1);
                             try {
                                responseJson = JSON.parse(jsonString);
                             } catch (e) {
                                console.warn("Failed to parse extracted JSON string:", e);
                                // Fallback: Treat as simple text
                                responseJson = { message: text };
                             }
                        } else {
                             // No JSON found, usually just text
                             responseJson = { message: text };
                        }
                    } catch (e) {
                        console.warn("JSON Parse failed in StoryBuilder:", e);
                        // Fallback: Check if we can extract message via regex
                        const messageMatch = rawText.match(/"message":\s*"([^"]*)"/);
                        if (messageMatch && messageMatch[1]) {
                             responseJson = { message: messageMatch[1] };
                        } else {
                             responseJson = { message: rawText };
                        }
                    }
                }
            }
        }

        // Final safety check to ensure text is never raw JSON
        let cleanText = responseJson.message || "...";
        if (cleanText.includes('{"message"')) {
            try {
                const parsed = JSON.parse(cleanText);
                cleanText = parsed.message || cleanText;
            } catch (e) {}
        }

        return { 
            text: cleanText,
            options: responseJson.options,
            multiSelect: responseJson.multiSelect,
            finalData 
        };

    } catch (error) {
        console.error("Story Builder Error:", error);
        return { text: "ببورە، کێشەیەک ڕوویدا." };
    }
}

export const extractCharactersFromText = async (text: string): Promise<any[]> => {
    if (!text || text.length < 10) return [];
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following story plan/blueprint and extract all characters mentioned or implied.
            
            STORY PLAN:
            ${text.slice(0, 30000)}
            
            TASK:
            1. Extract all characters.
            2. Infer their specific details (Role, Archetype, Description) based on the text.
            3. Infer relationships.
            
            CRITICAL FIELD RULES:
            - name: The character's name.
            - role: MUST be a short string like "Protagonist", "Antagonist", "Mentor", "Supporting". Do NOT put long descriptions here.
            - archetype: MUST be a short string like "The Hero", "The Jester", "The Shadow".
            - description: Visual and personality details. Do NOT include the Name or Role in this field.
            - traits: An array of single adjectives.
            
            IMPORTANT: All text values MUST BE IN KURDISH (SORANI).
            
            Return a JSON array where each item represents a character.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            role: { type: Type.STRING },
                            archetype: { type: Type.STRING },
                            description: { type: Type.STRING },
                            traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                            relationships: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        targetName: { type: Type.STRING },
                                        type: { type: Type.STRING },
                                        description: { type: Type.STRING }
                                    },
                                    required: ["targetName", "type"]
                                }
                            }
                        },
                        required: ["name", "role", "archetype", "description", "traits"]
                    }
                }
            }
        });
        
        let jsonStr = response.text || '[]';
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Extraction Error:", error);
        return [];
    }
}

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
      goal?: string, // Overall goal (protagonist goal)
      pov?: string,
      sceneGoal?: string, // Specific scene/chapter goal from blueprint
      pageTarget?: string // Specific length target
  }
): Promise<string> => {
  try {
    if (!currentText) return "";
    const cleanText = currentText.replace(/\u00A0/g, ' ');
    const isTrailingSpace = cleanText.endsWith(' ');
    const textSlice = cleanText.slice(-1200) || "سەرەتای چیرۆکەکە";

    // Detect if we are in Novel Mode based on context type
    const isNovel = context.type === 'Novel';
    const povInstruction = context.pov ? `POINT OF VIEW: ${context.pov}` : '';

    const prompt = `You are a creative writing assistant for Kurdish (Sorani).
    TASK: Continue the story text naturally.
    
    TYPE: ${isNovel ? 'NOVEL / PROSE' : 'SCREENPLAY'}
    ${povInstruction}
    CONTEXT:
    Genre: ${context.genre}
    Style: ${context.style}
    
    CRITICAL GOALS:
    - Current Scene Goal: ${context.sceneGoal || 'Advance the plot'}
    - Length Target: ${context.pageTarget || 'Standard'}
    - Overall Goal: ${context.goal}
    
    INPUT TEXT (End of current scene):
    "${textSlice}"
    
    INSTRUCTIONS:
    1. Generate the immediate next 3-10 words in Kurdish (Sorani).
    2. Maintain the tone and style of the input.
    3. STEER the content towards achieving the "Current Scene Goal".
    ${isNovel ? '4. Write in DESCRIPTIVE PROSE using Kurdish pronouns correctly. Do not write screenplay instructions.' : '4. Write in Screenplay format (Action or Dialogue).'}
    5. Do NOT repeat the last word of the input.
    6. Return ONLY the completion text. No explanations.
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
    if (isTrailingSpace && suggestion.startsWith(' ')) suggestion = suggestion.trimStart();
    else if (!isTrailingSpace && !suggestion.startsWith(' ') && !/^[.,;?!،؛؟]/.test(suggestion)) suggestion = ' ' + suggestion;
    
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
      Generate 4 distinct types of suggestions in Kurdish (Sorani): Plot, Character, World, Complication.
      CONTEXT: ${safeContext}
      Return ONLY valid JSON.
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

export const generateStoryPlanChat = async (
    history: { role: string; parts: { text: string }[] }[],
    message: string,
    currentPlan: string,
    projectContext: any
): Promise<{ text: string, newPlan?: string }> => {
    try {
        // --- MASTER ARCHITECT PROMPT ---
        const charList = projectContext.characters?.map((c: any) => 
            `- ${c.name} (${c.role}, ${c.archetype}): ${c.description}. Goal/Traits: ${c.traits?.join(', ')}`
        ).join('\n') || "No characters yet.";

        const systemInstruction = `You are the MASTER ARCHITECT (سەرمەندازی چیرۆک). You speak in Kurdish (Sorani).
        
        YOUR GOAL: 
        You are not just a list-maker. You are a genius structuralist. You must read the metadata deeply and weave complex, multi-layered storylines.
        
        PROJECT DATA (READ DEEPLY):
        Title: ${projectContext.title}
        Logline: ${projectContext.logline}
        Theme: ${projectContext.theme}
        Protagonist Goal: ${projectContext.protagonistGoal}
        Detailed Story: ${projectContext.detailedStory}
        POV: ${projectContext.pov || "Not specified"}
        
        FULL CHARACTER ROSTER:
        ${charList}
        
        CURRENT BLUEPRINT:
        ${currentPlan || "(Empty)"}
        
        CRITICAL RULES FOR PLAN GENERATION (MUST FOLLOW):
        1. **LENGTH TARGETS:** You MUST assign a specific Length Target for every Chapter or Episode. 
           - Format: "## Chapter X [Page Target: 10]" or "## Episode X [Duration: 45 min]".
        2. **GOAL ORIENTED:** You MUST assign a specific Narrative Goal for every Scene, Chapter, or Episode.
           - **YOU MUST USE THIS EXACT FORMAT**: [Goal: Describe what needs to happen/change in this unit].
           - Examples:
             - "## Chapter 1 [Page Target: 10] [Goal: Introduce hero and flaw]"
             - "### Scene 3 [Goal: The inciting incident happens]"
        3. **MULTI-THREADING:** Do not just write one story. Create an A-Story (Protagonist), a B-Story (Relationship/Theme), and a C-Story (Subplot/Comedic/World).
        4. **STRUCTURE:** 
           - Use standard structures (Save the Cat, Hero's Journey) but adapt them creatively.
           - Break down into Acts -> Sequences -> Scenes.
        5. **FORMATTING:** Use robust Markdown.
           - # Act I
           - ## Chapter 1 [Page Target: 12] [Goal: Establish normal world]
           - ### Scene 1 [Goal: Show the flaw in action]
           - > *Thematic Note: Why this scene matters.*
        
        BEHAVIOR:
        - If the user asks to "create a plan", use 'update_blueprint'. The content must be LONG (2000+ words if needed) and detailed.
        - If the user asks about a subplot, analyze the characters and suggest a deep emotional subplot.
        - Never be superficial. Always ask "Why?" and "So What?".
        `;

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction,
                tools: [{ functionDeclarations: [updateBlueprintTool] }],
            },
            history: history,
        });

        const response = await chat.sendMessage({ message });
        
        let newPlan = undefined;
        let responseText = response.text || "";

        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.functionCall && part.functionCall.name === 'update_blueprint') {
                    newPlan = part.functionCall.args['content'];
                    if (!responseText) responseText = "پلانێکی تێروتەسەل و قووڵم بۆ داڕشتیت کە هەموو وردەکارییەکان و چیرۆکە لاوەکییەکان لەخۆ دەگرێت.";
                }
            }
        }

        return { text: responseText, newPlan };

    } catch (error) {
        console.error("Plan Chat Error:", error);
        return { text: "ببورە، کێشەیەک ڕوویدا." };
    }
};

export const generateStoryboardImage = async (sceneContext: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Draw a black and white cinematic storyboard sketch for the following scene. High contrast, rough pencil style. \n\nSCENE:\n${sceneContext.slice(0, 1000)}` }],
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};