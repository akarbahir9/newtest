
import { GoogleGenAI, Type, FunctionDeclaration, Schema, Modality } from "@google/genai";

// Note: GoogleGenAI instance should be created right before use for Veo models 
// to ensure the latest API key from the selection dialog is used.
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
                // Fixed: Changed ARRAY to Type.ARRAY
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
  description: "Create a new scene or chapter. IMPORTANT: For Screenplays/Ads, content must be HTML with screenplay classes. For NOVELS, content must be standard HTML using <h1>, <p>, <em> tags.",
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
            type: { type: Type.STRING, enum: ['Screenplay', 'Novel', 'Serial', 'Advertisement'] },
            format: { type: Type.STRING, enum: ['Feature', 'Short', 'Episode', 'Standard', 'Commercial'] },
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
                    episodeDuration: { type: Type.NUMBER, description: "For Serials/TV (in minutes)" },
                    adDurationSeconds: { type: Type.NUMBER, description: "For Advertisements (in seconds)" }
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
    const ai = getAIClient();
    const model = 'gemini-3-flash-preview';
    const safeContext = projectContext ? projectContext.slice(0, 100000) : '';

    // Check Project Type from context
    const isNovel = safeContext.includes('Type: Novel');
    const isSerial = safeContext.includes('Type: Serial');
    const isAd = safeContext.includes('Type: Advertisement');
    
    // Extract POV
    const povMatch = safeContext.match(/POV: (.*?)\n/);
    const selectedPov = povMatch ? povMatch[1].trim() : "Third Person Limited";

    let systemInstruction = `You are Zoer, an elite creative writing AI. You speak and write primarily in Kurdish (Sorani).
    
    === STRICT NARRATIVE CONTROL & CHUNKING PROTOCOL ===
    Check the [Current Plan Chapter Title] and [Length Target] in the context.
    
    1. **CHAPTER TITLE ENFORCEMENT**:
       - If "CURRENT PLAN CHAPTER TITLE" is present in the context, you **MUST** use that exact title for the chapter header (<h1>).
       - Do **NOT** invent a new title. Match the plan exactly.
    
    2. **LENGTH TARGET & CHUNKING (CRITICAL)**:
       - IF the [Length Target] is HIGH (e.g., > 8 pages or 2000+ words):
         - **DO NOT** attempt to write the entire chapter in one response.
         - **YOU MUST WRITE IN CHUNKS.**
         - Explicitly state at the start: "Writing Part [X] of [Total]..."
         - Write **MAXIMUM DENSITY**. Produce at least 1500-2000 words per response (Chunk).
         - **SLOW DOWN PACING**: Describe everything. The environment, the smell, the light, the internal monologue, the texture of objects.
         - **DO NOT SKIP TIME**. 1 minute of story time can be 2 pages of text.
         - End the response with: "**[End of Part X. Type 'Continue' for next part]**".
       
       - IF the user says "Continue":
         - Pick up EXACTLY where the text left off. Do not summarize the previous part. Continue the action immediately.

    `;

    if (isNovel) {
        // --- NOVEL EXPERT ENGINE ---
        systemInstruction += `
    
    === MODE: NOVEL EXPERT (NOVELIST) ===
    You are a bestselling author in Kurdish literature. Your prose is immersive, sensory, and emotionally resonant.
    
    SELECTED POINT OF VIEW (POV): ${selectedPov}
    
    POV RULES (CRITICAL):
    - **First Person**: Use "Min" (من), "-m" (م-). Filter the world strictly through the narrator's bias.
    - **Third Person Limited**: "Ew" (ئەو). Stay inside ONE head per scene. Show their internal reaction to everything.
    - **Show, Don't Tell**: Don't say "He was angry." Say "His knuckles whitened as he gripped the glass."

    *** CRITICAL FORMATTING FOR NOVELS (STRICT ENFORCEMENT) ***
    1. **SEPARATE DIALOGUE:** NEVER mix action/prose and dialogue in the same paragraph. 
       - IF A CHARACTER SPEAKS, IT MUST BE A NEW PARAGRAPH.
       - IF THE ACTION SHIFTS TO ANOTHER CHARACTER, IT MUST BE A NEW PARAGRAPH.
    2. **HTML TAGS:** 
       - Use <h1> for Chapter Titles (Must match Plan).
       - Use <p> for descriptive prose.
       - **Use <p class="novel-dialogue"> for ANY paragraph that contains dialogue.** THIS IS MANDATORY.
         Example: <p class="novel-dialogue">"بەڵێ، دڵنیام،" ئازاد وتی.</p>
       - Use <em> for internal thoughts or emphasis.
    3. **QUOTES:** Use Kurdish-style quotes (Example: "..." or «...») consistently.
    `;

    } else if (isAd) {
        // --- ADVERTISEMENT EXPERT ENGINE ---
        systemInstruction += `
    
    === MODE: ADVERTISEMENT EXPERT (COPYWRITER) ===
    You are a top-tier Creative Director for TV and Digital commercials. Your goal is IMPACT, CLARITY, and PERSUASION.

    WRITING RULES:
    1. **Structure:** Hook (0-5s) -> Problem -> Solution (Product/Service) -> Call to Action.
    2. **Format:** Use Screenplay formatting but optimize for brevity.
    3. **Visuals:** Focus heavily on the VISUAL column (Action). What do we see? It must be striking.
    4. **Language:** Punchy, energetic, memorable Kurdish.

    FORMATTING (Screenplay Style):
    - <div class="sp-slug">SCENE 1</div>
    - <div class="sp-action">VISUAL: [Describe the shot clearly]</div>
    - <div class="sp-character">ANNOUNCER / ACTOR</div>
    - <div class="sp-dialogue">"Dialogue here."</div>
    `;

    } else if (isSerial) {
        // --- SERIAL / TV EXPERT ENGINE ---
        systemInstruction += `
    
    === MODE: SERIAL/TV EXPERT (SHOWRUNNER) ===
    You are a Showrunner for a high-end drama series. You focus on PACING, ARCS, and HOOKS.

    WRITING RULES:
    1. **Pacing:** TV scenes are shorter and punchier than movies. Get in late, get out early.
    2. **Structure:** Every scene must turn the plot or reveal character.
    3. **Teasers:** End scenes (and especially the episode) with a question or cliffhanger.

    FORMATTING (Standard Screenplay):
    - Use <div class="sp-slug">...</div> for headers.
    - Use <div class="sp-action">...</div> for action.
    - Use <div class="sp-character">...</div> for names.
    - Use <div class="sp-dialogue">...</div> for speech.
    `;

    } else {
        // --- MOVIE / SCREENPLAY EXPERT ENGINE ---
        systemInstruction += `
    
    === MODE: SCREENPLAY EXPERT (SCREENWRITER) ===
    You are a Hollywood-level screenwriter writing in Kurdish. Focus on CINEMATIC storytelling.

    WRITING RULES:
    1. **Visuals:** Only write what can be SEEN or HEARD. No internal thoughts in action lines.
    2. **Economy:** Be concise. 
    3. **Active Voice:** "John runs" (Good). "John is running" (Bad).

    FORMATTING (Standard Screenplay):
    - Use <div class="sp-slug">...</div> for headers.
    - Use <div class="sp-action">...</div> for action.
    - Use <div class="sp-character">...</div> for names.
    - Use <div class="sp-dialogue">...</div> for speech.
    `;
    }
    
    systemInstruction += `
    
    --- UNIVERSAL CAPABILITIES ---
    - **Tools:** Use 'update_scene', 'create_scene', 'create_character' etc. whenever the user asks to change the project data.
    - **WRITING & GENERATION (IMPORTANT):** If the user asks you to write, rewrite, draft, or continue any part of the story (scene, chapter, or dialogue):
      1. You **MUST** wrap the generated story content inside <screenplay>...</screenplay> tags.
      2. Inside these tags, you must use the STRICT HTML format defined above for the current mode (Novel HTML or Screenplay HTML).
      3. Keep any conversational text or explanations OUTSIDE the tags.
      
      Example Response:
      Here is Part 1 of the chapter:
      <screenplay>
      <div class="sp-slug">INT. OFFICE - DAY</div>
      <div class="sp-action">Joe sits at his desk.</div>
      <div class="sp-character">JOE</div>
      <div class="sp-dialogue">"I need to finish this."</div>
      </screenplay>
      [End of Part 1. Type "Continue" for Part 2.]
    
    - **Editing:** When asked to "rewrite" or "fix", output the FULL HTML for the scene wrapped in <screenplay> tags as well.
    
    Be creative, bold, and strictly adhere to the formatting rules above.
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
        const ai = getAIClient();
        const systemInstruction = `You are Zoer's Creative Consultant. You speak in Kurdish (Sorani).
        
        GOAL: Interview the user to build a complete concept for a new Story (Screenplay, Novel, Series, or Advertisement).
        
        PROCESS:
        1. Ask questions one by one.
        2. **CHECK TYPE:** If the user mentions "Advertisement" or "Commercial", set type to 'Advertisement'.
        3. **CATEGORICAL QUESTIONS:**
           - If 'Advertisement': Ask about Product, Target Audience, Key Message, Duration (15s, 30s, 60s).
           - If 'Novel': Ask about POV (First/Third person), Page Count target.
           - If 'Serial': Ask about Seasons/Episodes.
        4. Once you have Title, Type, Logline, and Structure, call 'finalize_story_concept'.
        
        OUTPUT FORMAT (STRICT JSON):
        {
             "message": "Question text...",
             "options": ["Opt 1", "Opt 2"],
             "multiSelect": boolean
        }
        `;

        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
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
                        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
                        rawText = text;
                        const jsonStart = text.indexOf('{');
                        const jsonEnd = text.lastIndexOf('}');

                        if (jsonStart !== -1 && jsonEnd !== -1) {
                             const jsonString = text.substring(jsonStart, jsonEnd + 1);
                             try {
                                responseJson = JSON.parse(jsonString);
                             } catch (e) {
                                responseJson = { message: text };
                             }
                        } else {
                             responseJson = { message: text };
                        }
                    } catch (e) {
                        responseJson = { message: rawText };
                    }
                }
            }
        }

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
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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

export const extractLocationsFromText = async (text: string): Promise<any[]> => {
    if (!text || text.length < 10) return [];

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze the following story plan/blueprint and extract all specific locations mentioned or implied.
            
            STORY PLAN:
            ${text.slice(0, 30000)}
            
            TASK:
            1. Extract distinct physical locations (e.g., "John's Apartment", "The Old Lighthouse").
            2. Infer the type (INT, EXT, or MIXED).
            3. Write a brief visual description.

            CRITICAL RULES:
            - type: MUST be exactly "INT", "EXT", or "MIXED".
            - name: Short, clear name for the location.
            - description: Focus on sensory details (lighting, smell, atmosphere).
            
            IMPORTANT: All text values MUST BE IN KURDISH (SORANI).

            Return a JSON array of locations.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["INT", "EXT", "MIXED"] },
                            description: { type: Type.STRING }
                        },
                        required: ["name", "type", "description"]
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
        console.error("Location Extraction Error:", error);
        return [];
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
      goal?: string, 
      pov?: string,
      sceneGoal?: string, 
      pageTarget?: string,
      actGoal?: string,
      currentWordCount?: number 
  }
): Promise<string> => {
  try {
    if (!currentText) return "";
    const cleanText = currentText.replace(/\u00A0/g, ' ');
    const isTrailingSpace = cleanText.endsWith(' ');
    const textSlice = cleanText.slice(-1200) || "سەرەتای چیرۆکەکە";

    // Detect if we are in Novel Mode based on context type
    const isNovel = context.type === 'Novel';
    const isAd = context.type === 'Advertisement';
    const povInstruction = context.pov ? `POINT OF VIEW: ${context.pov}` : '';

    const wordCount = context.currentWordCount || 0;
    const target = parseInt(context.pageTarget || '0', 10) * 250; // Approx words/page
    const isTargetHigh = target > 0 && wordCount < (target * 0.8);

    let pacingInstruction = "";
    if (isTargetHigh) {
        pacingInstruction = `
        PACING INSTRUCTION: SLOW DOWN.
        - The target length is high and we are early. 
        - Do not rush the plot. 
        - Describe microscopic details, sensory inputs, or internal thoughts.
        - Do not resolve the scene yet.`;
    }

    const ai = getAIClient();
    const prompt = `You are a creative writing assistant for Kurdish (Sorani).
    TASK: Continue the story text naturally.
    
    TYPE: ${isNovel ? 'NOVEL / PROSE' : isAd ? 'ADVERTISEMENT / SCRIPT' : 'SCREENPLAY'}
    ${povInstruction}
    CONTEXT:
    Genre: ${context.genre}
    Style: ${context.style}
    
    CRITICAL GOALS:
    - Current Act Goal: ${context.actGoal || 'N/A'}
    - Current Scene Goal: ${context.sceneGoal || 'Advance the plot'}
    - Length Target: ${context.pageTarget || 'Standard'} (Adjust pacing based on this)
    - Current Word Count: ${wordCount}
    ${pacingInstruction}
    - Overall Goal: ${context.goal}
    
    INPUT TEXT (End of current scene):
    "${textSlice}"
    
    INSTRUCTIONS:
    1. Generate the immediate next 3-10 words in Kurdish (Sorani).
    2. Maintain the tone and style of the input.
    3. STEER the content towards achieving the "Current Scene Goal".
    ${isNovel ? '4. Write in DESCRIPTIVE PROSE. **IF DIALOGUE: Put it in a new paragraph.**' : '4. Write in Screenplay format.'}
    5. Do NOT repeat the last word of the input.
    6. Return ONLY the completion text. No explanations.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    const ai = getAIClient();
    const safeContext = context.slice(0, 100000);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
        const ai = getAIClient();
        // --- MASTER ARCHITECT PROMPT ---
        const charList = projectContext.characters?.map((c: any) => 
            `- ${c.name} (${c.role}, ${c.archetype}): ${c.description}. Goal/Traits: ${c.traits?.join(', ')}`
        ).join('\n') || "No characters yet.";

        const systemInstruction = `You are the MASTER ARCHITECT (سەرمەندازی چیرۆک). You speak in Kurdish (Sorani).
        
        YOUR GOAL: 
        You are not just a list-maker. You are a genius structuralist. You must read the metadata deeply and weave complex, multi-layered storylines.
        
        PROJECT DATA (READ DEEPLY):
        Title: ${projectContext.title}
        Type: ${projectContext.type}
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
        3. **MULTI-THREADING:** Do not just write one story. Create an A-Story (Protagonist), a B-Story (Relationship/Theme), and a C-Story (Subplot/Comedic/World).
        4. **STRUCTURE:** 
           - Use standard structures (Save the Cat, Hero's Journey) but adapt them creatively.
           - Break down into Acts -> Sequences -> Scenes.
        5. **TYPE SPECIFIC LOGIC:**
           - **Novel:** Focus on Chapters and emotional arcs.
           - **Serial:** Focus on Episode Hooks and Season Arcs.
           - **Advertisement:** Focus on Shot List, Key Visuals, and Call to Action.
        
        BEHAVIOR:
        - If the user asks to "create a plan", use 'update_blueprint'. The content must be LONG (2000+ words if needed) and detailed.
        - If the user asks about a subplot, analyze the characters and suggest a deep emotional subplot.
        - Never be superficial. Always ask "Why?" and "So What?".
        `;

        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
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

export const generateSceneVideo = async (sceneContext: string): Promise<string | null> => {
  try {
    const ai = getAIClient();
    const prompt = `A cinematic cinematic video clip for the following story scene. High production value, atmosphere. \n\nSCENE:\n${sceneContext.slice(0, 1000)}`;
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      return `${downloadLink}&key=${process.env.API_KEY}`;
    }
    return null;
  } catch (error) {
    console.error("Video Generation Error:", error);
    // Handle API key selection if requested
    if (error.message && error.message.includes("Requested entity was not found")) {
        throw new Error("API_KEY_RESET");
    }
    return null;
  }
};

export const generateStoryboardImage = async (sceneContext: string): Promise<string | null> => {
  try {
    const ai = getAIClient();
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

export const generateCharacterVisuals = async (name: string, description: string, role: string): Promise<{ refSheet: string | null, avatar: string | null }> => {
  try {
    const ai = getAIClient();
    const refPrompt = `Character Design Reference Sheet: "${name}", ${role}. ${description}.
    Layout: Three distinct views (Front, Side, Back) arranged horizontally. Full body.
    Style: Masterpiece Concept Art, 8k Resolution, Unreal Engine 5 Render style, detailed textures.
    Background: Simple, non-distracting gradient.`;
    
    const avatarPrompt = `Cinematic Character Portrait: "${name}", ${role}. ${description}.
    Composition: Head and shoulders, facing forward.
    Style: Masterpiece Concept Art, 8k Resolution, highly detailed face and eyes.
    Lighting: Dramatic studio lighting.`;

    const [refResponse, avatarResponse] = await Promise.all([
         ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: refPrompt }] },
              config: { imageConfig: { aspectRatio: "16:9" } }
         }),
         ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: avatarPrompt }] },
              config: { imageConfig: { aspectRatio: "1:1" } }
         })
    ]);

    let refSheet = null;
    let avatar = null;

    for (const part of refResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            refSheet = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    for (const part of avatarResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            avatar = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    return { refSheet, avatar };

  } catch (error) {
    console.error("Character Image Gen Error:", error);
    return { refSheet: null, avatar: null };
  }
};

export const generateLocationVisuals = async (name: string, description: string, type: string): Promise<string | null> => {
  try {
    const ai = getAIClient();
    const prompt = `A cinematic environment concept art sheet for the location "${name}" (${type}).
    DESCRIPTION: ${description}.
    
    The image MUST be a composition showing:
    1. A Wide Establishing Shot (Main focus)
    2. An Interior or Detail Shot (Inset or side panel)
    3. Different lighting conditions (Day/Night split if applicable)
    
    Style: High-End Concept Art, 4K, Atmospheric, Detailed.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
            aspectRatio: "16:9" // Wide for landscapes
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Location Image Gen Error:", error);
    return null;
  }
};
