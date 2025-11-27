

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, AlertTriangle, Sparkles, Mic2, 
  Image, Mic, ArrowUp, FileInput, 
  FileCheck, Replace, PanelLeft, Loader2, RotateCcw, Target, Scale
} from 'lucide-react';
import { generateAssistantResponse, generateStoryboardImage } from '../services/geminiService';
import { ChatMessage, Character } from '../types';
import { useProject } from '../context/ProjectContext';

// Helper for unique IDs
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// --- Blueprint Parser Helper ---
const extractGoalAndTarget = (blueprint: string, sceneNumber: number, title: string, type: string) => {
    if (!blueprint) return { goal: null, target: null, planTitle: null };
    
    let goal = null;
    let target = null;
    let planTitle = null;
    let actGoal = null;
    
    // 1. Find the section for this specific Scene/Chapter
    // Matches: "## Chapter 1", "## 1.", "### Scene 1", "### 1", etc.
    const headerRegex = new RegExp(`(?:^|\\n)(#{2,3})\\s*(?:Chapter|Scene|Episode)?\\s*${sceneNumber}\\b[:.]?\\s*(.*?)(?=(?:\\n#{2,3})|$)`, 'is');
    const match = blueprint.match(headerRegex);

    if (match) {
        const fullSection = match[0];
        const rawTitle = match[2]?.trim();
        planTitle = rawTitle ? rawTitle.replace(/\[.*?\]/g, '').trim() : `Chapter ${sceneNumber}`;
        
        // Extract Goal from Section
        const goalMatch = fullSection.match(/(?:\*\*|\[)?\s*Goal\s*(?:\*\*|\])?:?\s*(.*?)(?:\]|\n|$)/i);
        if (goalMatch && goalMatch[1]) goal = goalMatch[1].trim();

        // Extract Target from Section
        const targetMatch = fullSection.match(/(?:\*\*|\[)?\s*(?:Page Target|Target|Length|Word Count)\s*(?:\*\*|\])?:?\s*(.*?)(?:\]|\n|$)/i);
        if (targetMatch && targetMatch[1]) target = targetMatch[1].trim();
        
        // 2. Find Parent Act Goal (Backward Search)
        const index = match.index || 0;
        const textBefore = blueprint.substring(0, index);
        // Find last "# Act X" occurrence
        const acts = [...textBefore.matchAll(/^#\s*Act\s+\w+.*$/gm)];
        if (acts.length > 0) {
            const lastActHeader = acts[acts.length - 1][0];
            // Find goal associated with this Act line (or immediate lines after)
            const actIndex = textBefore.lastIndexOf(lastActHeader);
            const actSection = textBefore.substring(actIndex, index); // Text between Act Header and Current Scene
            
            const actGoalMatch = actSection.match(/(?:\*\*|\[)?\s*Act Goal\s*(?:\*\*|\])?:?\s*(.*?)(?:\]|\n|$)/i);
            if (actGoalMatch) actGoal = actGoalMatch[1].trim();
        }
    }
    
    return { goal, target, planTitle, actGoal };
};


// --- Markdown Parser Helper ---
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        const isKey = inner.trim().endsWith(':');
        return (
            <strong 
                key={index} 
                className={`font-semibold ${isKey ? 'text-emerald-400' : 'text-zinc-100'}`}
            >
                {inner}
            </strong>
        );
      }
      return part;
    });
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = (keyPrefix: string) => {
    if (currentList.length > 0) {
        elements.push(
            <ul key={`${keyPrefix}-ul`} className="mb-4 space-y-1.5 pr-1 text-zinc-300">
                {currentList}
            </ul>
        );
        currentList = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const listMatch = line.match(/^\s*[\-\*]\s+(.*)/);
    
    if (listMatch) {
      const itemContent = parseInline(listMatch[1]);
      currentList.push(
        <li key={`li-${i}`} className="flex items-start gap-2.5 text-xs leading-relaxed">
           <span className="mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0 block shadow-[0_0_6px_rgba(99,102,241,0.5)]"></span>
           <span>{itemContent}</span>
        </li>
      );
    } else {
      flushList(`pre-${i}`);
      
      if (trimmed === '') return;

      if (line.startsWith('###')) {
         const text = line.replace(/^###\s*/, '');
         elements.push(
            <h3 key={`h3-${i}`} className="text-xs font-bold text-indigo-400 mt-5 mb-3 uppercase tracking-wider flex items-center gap-3 after:h-px after:bg-zinc-800 after:flex-1">
                {parseInline(text)}
            </h3>
         );
      } else if (line.startsWith('**') && line.endsWith('**')) {
         const text = line.replace(/\*\*/g, '');
         elements.push(
             <div key={`sh-${i}`} className="mt-4 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-r-2 border-emerald-500/50 pr-2">
                 {parseInline(text)}
             </div>
         );
      } else {
         elements.push(<p key={`p-${i}`} className="mb-2.5 text-zinc-300 leading-relaxed">{parseInline(line)}</p>);
      }
    }
  });
  
  flushList('end');

  return <div className="text-xs font-sans">{elements}</div>;
};

const RightPanel: React.FC = () => {
  const { 
    currentProject, currentSceneId, updateSceneContent, updateProject, updateCharacter, 
    addCharacter, addLocation, addScene, deleteCharacter, deleteLocation, deleteScene, bulkDeleteItems,
    addChatMessage, showConfirmation, isRightPanelOpen, replaceTextInProject 
  } = useProject();
  const [activeTab, setActiveTab] = useState<'assistant' | 'visuals'>('assistant');
  
  // Chat State
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Visuals State
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Goal State
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState<string | null>(null);

  const scene = currentProject?.scenes.find(s => s.id === currentSceneId);
  
  // Use messages from current project
  const messages = currentProject?.chatHistory || [];

  // Reset loading state when project changes to avoid ghost loading states
  useEffect(() => {
    setIsChatLoading(false);
    setGeneratedImage(null);
    setIsImageLoading(false);
  }, [currentProject?.id]);

  useEffect(() => {
    // Reset image when scene changes
    setGeneratedImage(null);
  }, [currentSceneId]);

  // GOAL EXTRACTION EFFECT
  useEffect(() => {
      if (currentProject && scene) {
          const { goal, target, planTitle } = extractGoalAndTarget(
              currentProject.blueprint || '', 
              scene.number, 
              scene.title, 
              currentProject.type
          );
          setActiveGoal(goal);
          setActiveTarget(target);
          setPlanTitle(planTitle);
      }
  }, [currentProject?.blueprint, scene?.id, scene?.number]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading, currentProject?.id]);

  const handleGenerateImage = async () => {
    if (!scene || !scene.content) return;
    setIsImageLoading(true);
    // Strip HTML tags for cleaner prompt
    const plainText = scene.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const imgData = await generateStoryboardImage(plainText || scene.title);
    if (imgData) {
      setGeneratedImage(imgData);
    }
    setIsImageLoading(false);
  };

  const buildDeepContext = () => {
      const charDetails = currentProject?.characters.map(c => {
          const rels = c.relationships?.map(r => {
              const target = currentProject.characters.find(tc => tc.id === r.targetId)?.name || 'Unknown';
              return `${r.type} of ${target} (${r.description})`;
          }).join(', ');
          
          return `- ID: "${c.id}" | Name: "${c.name}" | Role: ${c.role} (${c.archetype}) | Traits: [${c.traits.join(', ')}] | Desc: ${c.description} ${rels ? `| Rels: ${rels}` : ''}`;
      }).join('\n');

      const genreString = currentProject?.genres.join(', ') || 'Unknown Genre';

      const fullScriptHistory = currentProject?.scenes
        .sort((a, b) => a.number - b.number)
        .map(s => {
            const isCurrent = s.id === currentSceneId;
            const cleanContent = s.content ? s.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
            return `- ID: "${s.id}" | SCENE ${s.number} [${s.title}]${isCurrent ? ' (CURRENTLY EDITING)' : ''}: ${cleanContent}`;
        })
        .join('\n') || "No scenes yet.";
        
      const locationDetails = currentProject?.locations.map(l => 
          `- ID: "${l.id}" | Name: "${l.name}" | Type: ${l.type} | Desc: ${l.description}`
      ).join('\n');

      return `
        Project: ${currentProject?.title || 'Untitled'}
        Type: ${currentProject?.type} (${currentProject?.format || 'Standard'})
        Genres: ${genreString}
        Logline: ${currentProject?.logline || 'N/A'}
        Detailed Story: ${currentProject?.detailedStory || 'N/A'}
        Theme: ${currentProject?.theme || 'N/A'}
        Setting: ${currentProject?.setting || 'N/A'}
        Protagonist Goal: ${currentProject?.protagonistGoal || 'N/A'}
        POV: ${currentProject?.pov || 'N/A'}
        
        === PLAN / BLUEPRINT ===
        ${currentProject?.blueprint || 'No plan defined.'}
        
        === CURRENT ACTIVE GOAL (Extracted from Plan) ===
        Matched Plan Section: ${planTitle || 'Unknown'}
        Goal: ${activeGoal || 'None detected'}
        Length Target: ${activeTarget || 'None detected'}

        === CHARACTERS (IDs are UUIDs) ===
        ${charDetails || 'No characters defined.'}
        
        === LOCATIONS (IDs are UUIDs) ===
        ${locationDetails || 'No locations defined.'}

        === FULL SCRIPT MEMORY ===
        ${fullScriptHistory}
        === END SCRIPT MEMORY ===

        CURRENT SCENE (Raw HTML): ${scene?.title || 'Unknown'}
        CONTENT: ${scene?.content || ''}
      `;
  };

  const executeCommand = async (command: string) => {
      if (isChatLoading || !currentProject) return;
      const projectId = currentProject.id;
      const userMsg: ChatMessage = { id: generateId(), role: 'user', text: command };
      
      // Update persistent storage immediately
      addChatMessage(projectId, userMsg);
      
      setIsChatLoading(true);

      try {
        const contextString = buildDeepContext();
        
        // Reconstruct history for API from current project state + new message
        const currentHistory = currentProject.chatHistory || [];
        const apiHistory = [...currentHistory, userMsg].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));
        
        const response = await generateAssistantResponse(
            apiHistory, 
            command,
            contextString
        );
        
        // Handle Tool Calls (Logic remains same as before)
        if (response.toolCalls && response.toolCalls.length > 0) {
            for (const call of response.toolCalls) {
                if (call.name === 'update_project_metadata') {
                    updateProject(projectId, call.args);
                    addChatMessage(projectId, { id: generateId(), role: 'model', text: "✅ زانیارییەکانی پڕۆژە نوێکرانەوە." });
                } else if (call.name === 'update_character') {
                     const existing = currentProject.characters.find(c => c.id === call.args.id);
                     if (existing) {
                         const updatedChar: Character = { ...existing, ...call.args, traits: call.args.traits || existing.traits };
                         updateCharacter(updatedChar);
                         addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ کاراکتەری ${updatedChar.name} نوێکرایەوە.` });
                     }
                } else if (call.name === 'create_character') {
                     addCharacter({
                        name: call.args.name,
                        role: call.args.role || 'Supporting',
                        archetype: call.args.archetype || '',
                        description: call.args.description || '',
                        traits: call.args.traits || []
                     });
                     addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ کاراکتەری نوێ "${call.args.name}" دروستکرا.` });
                } else if (call.name === 'bulk_create_characters') {
                     const chars = call.args.characters || [];
                     for (const c of chars) {
                         addCharacter({
                             name: c.name,
                             role: c.role || 'Supporting',
                             archetype: c.archetype || '',
                             description: c.description || '',
                             traits: c.traits || []
                         });
                     }
                     addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ ${chars.length} کاراکتەر لەسەر بنەمای پلانەکە دروستکران.` });
                } else if (call.name === 'create_location') {
                     addLocation({
                        name: call.args.name,
                        type: call.args.type || 'MIXED',
                        description: call.args.description || ''
                     });
                     addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ شوێنی نوێ "${call.args.name}" دروستکرا.` });
                } else if (call.name === 'create_scene') {
                     addScene(undefined, {
                         title: call.args.title,
                         content: call.args.content,
                         summary: call.args.summary
                     });
                     addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ دیمەنی نوێ "${call.args.title}" زیادکرا بۆ پڕۆژەکە.` });
                } else if (call.name === 'update_scene') {
                    let targetId = call.args.sceneId;
                    if (targetId === 'current' || !targetId) targetId = currentSceneId;
                    if (targetId) {
                        updateSceneContent(targetId, call.args.content);
                        addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ دیمەنەکە نوێکرایەوە.` });
                    }
                } else if (call.name === 'delete_item') {
                    const { id, type } = call.args;
                    let itemName = 'item';
                    if (type === 'character') itemName = currentProject.characters.find(c => c.id === id)?.name || 'Character';
                    if (type === 'location') itemName = currentProject.locations.find(l => l.id === id)?.name || 'Location';
                    if (type === 'scene') itemName = currentProject.scenes.find(s => s.id === id)?.title || 'Scene';

                    showConfirmation(`ئایا دڵنیایت دەتەوێت ${type === 'character' ? 'کاراکتەری' : type === 'location' ? 'شوێنی' : 'دیمەنی'} "${itemName}" بسڕیتەوە؟`, () => {
                         if (type === 'character') deleteCharacter(id);
                         if (type === 'location') deleteLocation(id);
                         if (type === 'scene') deleteScene(id);
                         addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ ${itemName} سڕایەوە.` });
                    });
                    addChatMessage(projectId, { id: generateId(), role: 'model', text: `⚠️ داوای ڕەزامەندی سڕینەوەی "${itemName}" دەکەم...` });

                } else if (call.name === 'bulk_delete_items') {
                    const items: {id: string, type: 'character' | 'location' | 'scene'}[] = call.args.items || [];
                    if (items.length === 0) {
                        addChatMessage(projectId, { id: generateId(), role: 'model', text: `⚠️ هیچ ئایتمێک نەدۆزرایەوە بۆ سڕینەوە.` });
                    } else {
                        showConfirmation(`ئایا دڵنیایت دەتەوێت ${items.length} ئایتم بەیەکەوە بسڕیتەوە؟`, () => {
                             bulkDeleteItems(items);
                             addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ ${items.length} ئایتم بە سەرکەوتوویی سڕانەوە.` });
                        });
                        addChatMessage(projectId, { id: generateId(), role: 'model', text: `⚠️ داوای ڕەزامەندی سڕینەوەی ${items.length} ئایتم دەکەم...` });
                    }

                } else if (call.name === 'find_replace') {
                    const { search, replace, scope } = call.args;
                    if (scope === 'project') {
                        replaceTextInProject(currentProject.id, search, replace);
                        addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ "${search}" گۆڕدرا بۆ "${replace}" لە هەموو پڕۆژەکەدا.` });
                    } else {
                        if (scene) {
                             const newContent = scene.content.split(search).join(replace);
                             updateSceneContent(scene.id, newContent);
                             addChatMessage(projectId, { id: generateId(), role: 'model', text: `✅ "${search}" گۆڕدرا بۆ "${replace}" لەم دیمەنەدا.` });
                        }
                    }
                }
            }
        }
        
        if (response.text && (!response.toolCalls || response.text.length > 30)) {
            const modelMsg: ChatMessage = {
              id: generateId(),
              role: 'model',
              text: response.text
            };
            addChatMessage(projectId, modelMsg);
        }

      } catch (e) {
        console.error(e);
        addChatMessage(projectId, { id: generateId(), role: 'model', text: "تێکچوونێک ڕوویدا." });
      } finally {
        setIsChatLoading(false);
      }
  };

  const handleQuickAction = (type: 'check' | 'fix' | 'alternates') => {
      const selection = window.getSelection()?.toString().trim();
      let prompt = "";

      if (selection && selection.length > 0) {
          switch (type) {
              case 'check':
                  prompt = `Analyze ONLY the following selected text for pacing, subtext, and impact. Provide specific feedback in Kurdish (Sorani).\n\nSELECTED TEXT:\n"${selection}"`;
                  break;
              case 'fix':
                  prompt = `Rewrite ONLY the selected text below to be punchier in Kurdish (Sorani). Return ONLY the rewritten segment wrapped in <screenplay> tags.\n\nSELECTED TEXT:\n"${selection}"`;
                  break;
              case 'alternates':
                  prompt = `Generate 3 distinct alternate versions of ONLY the selected text below in Kurdish (Sorani). Return them wrapped in <screenplay> tags.\n\nSELECTED TEXT:\n"${selection}"`;
                  break;
          }
      } else {
          switch (type) {
              case 'check':
                  prompt = "Check this entire scene. Compare it against the BLUEPRINT GOAL. Is the goal achieved? Is the pacing right? Suggest improvements.";
                  break;
              case 'fix':
                  prompt = "Rewrite the dialogue in this entire scene to be punchier in Kurdish (Sorani). Wrap the result in <screenplay> tags.";
                  break;
              case 'alternates':
                  prompt = "Suggest 3 ways to rewrite this scene to increase conflict, in Kurdish (Sorani).";
                  break;
          }
      }
      
      executeCommand(prompt);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const cmd = input;
    setInput('');
    await executeCommand(cmd);
  };

  const handleInsert = (contentToInsert: string) => {
      if (!scene || !contentToInsert) return;
      const cleanContent = contentToInsert.replace(/<\/?screenplay>/g, '');
      
      let finalContent = scene.content;
      if (!cleanContent.startsWith('<div') && !cleanContent.startsWith('<p')) {
          if (currentProject?.type === 'Novel') {
              finalContent += `<p>${cleanContent}</p>`;
          } else {
              finalContent += `<div class="sp-action">${cleanContent}</div>`;
          }
      } else {
          finalContent += cleanContent;
      }
      updateSceneContent(scene.id, finalContent);
  };

  const handleReplace = (contentToInsert: string) => {
    if (!scene || !contentToInsert) return;
    const cleanContent = contentToInsert.replace(/<\/?screenplay>/g, '');
    updateSceneContent(scene.id, cleanContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(<screenplay>[\s\S]*?<\/screenplay>)/g);
    return parts.map((part, index) => {
      if (part.startsWith('<screenplay>')) {
        const content = part.replace(/<\/?screenplay>/g, '').trim();
        return (
          <div key={index} className="my-3 relative group">
             <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-lg overflow-hidden relative">
                <div className="absolute top-2 left-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                        onClick={() => handleInsert(content)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-600 flex items-center gap-1 shadow-lg backdrop-blur-sm transition-all"
                        title="زیادکردن بۆ دیمەن"
                    >
                        <FileInput className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">زیادکردن</span>
                    </button>
                    <button 
                        onClick={() => handleReplace(content)}
                        className="p-1.5 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 rounded border border-emerald-500/30 flex items-center gap-1 shadow-lg backdrop-blur-sm transition-all"
                        title="گۆڕینی دیمەن"
                    >
                        <Replace className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">گۆڕین</span>
                    </button>
                </div>
                <div 
                    className="font-screenplay text-xs text-zinc-300 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar select-text cursor-text text-right"
                    dangerouslySetInnerHTML={{ __html: content }}
                />
             </div>
          </div>
        );
      } else if (part.trim().length > 0) {
        return (
          <div key={index} className="select-text">
            <MarkdownRenderer content={part.trim()} />
          </div>
        );
      }
      return null;
    });
  };

  return (
    <aside 
        className={`
            fixed left-0 z-[60] md:z-40
            bg-zinc-925 flex flex-col flex-shrink-0 
            transition-all duration-300 ease-in-out md:relative shadow-2xl md:shadow-none
            md:translate-x-0 md:w-80 md:border-r md:border-zinc-800/60 md:inset-y-0 md:h-full
            ${isRightPanelOpen 
                ? '-translate-x-0 ml-0 w-full border-r border-zinc-800/60' 
                : '-translate-x-full'}
            bottom-0 
            top-[calc(3rem+env(safe-area-inset-top))] md:top-0
            pt-2 md:pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
        `}
    >
        
      {/* Tabs */}
      <div className="flex border-b border-zinc-800 relative items-center flex-shrink-0">
        <button 
          onClick={() => setActiveTab('assistant')} 
          className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${activeTab === 'assistant' ? 'border-primary-500 text-zinc-200 bg-zinc-900/30' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'}`}
        >
          یاریدەدەر
        </button>
        <button 
          onClick={() => setActiveTab('visuals')} 
          className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${activeTab === 'visuals' ? 'border-primary-500 text-zinc-200 bg-zinc-900/30' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'}`}
        >
          بینراوەکان
        </button>
      </div>

      {/* CONTENT: ASSISTANT */}
      {activeTab === 'assistant' && (
        <>
            {/* GOAL TRACKER (NEW) */}
            <div className="p-4 pb-0 flex-shrink-0 z-10 bg-zinc-925">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xxs font-semibold text-zinc-500 uppercase flex items-center gap-1 truncate max-w-[70%]">
                            <Target className="w-3 h-3 flex-shrink-0" />
                            {planTitle ? `ئامانجی: ${planTitle}` : 'ئامانجی ئەم بەشە'}
                        </span>
                        {activeTarget && (
                            <span className="text-xxs text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                                <Scale className="w-2.5 h-2.5" /> {activeTarget}
                            </span>
                        )}
                    </div>
                    {activeGoal ? (
                        <p className="text-xs text-zinc-300 leading-relaxed font-medium border-l-2 border-primary-500 pl-2">
                            {activeGoal}
                        </p>
                    ) : (
                        <p className="text-xs text-zinc-600 italic">
                            هیچ ئامانجێک لە پلانەکەدا نەدۆزرایەوە بۆ ئەم بەشە.
                        </p>
                    )}
                </div>
            </div>

            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 custom-scrollbar">
                <div className="space-y-4">
                    {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                        {msg.role === 'user' ? (
                        <div className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-xxs text-zinc-300">E</div>
                        ) : (
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex-shrink-0 flex items-center justify-center text-xxs text-white"><Sparkles className="w-3.5 h-3.5" /></div>
                        )}
                        
                        <div className="space-y-1 w-full min-w-0">
                        <div className={`text-xs ${msg.role === 'user' ? 'text-zinc-400' : 'text-primary-400 font-medium'}`}>
                            {msg.role === 'user' ? 'ئێلێنا' : 'یاریدەدەری زۆری'}
                        </div>
                        
                        {msg.role === 'user' ? (
                            <div className="text-sm text-zinc-300 bg-zinc-800/50 p-2 rounded-lg inline-block">{msg.text}</div>
                        ) : (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 relative shadow-sm">
                            {renderMessageContent(msg.text)}
                            </div>
                        )}
                        </div>
                    </div>
                    ))}
                    {isChatLoading && (
                        <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex-shrink-0 flex items-center justify-center text-xxs text-white"><Sparkles className="w-3.5 h-3.5" /></div>
                        <div className="space-y-2 w-full">
                            <div className="text-xs text-primary-400 font-medium">یاریدەدەری زۆری</div>
                            <div className="text-xs text-zinc-500 animate-pulse">بیردەکاتەوە...</div>
                        </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="p-2 md:p-3 border-t border-zinc-800/50 bg-zinc-925 flex-shrink-0 z-10">
                <div className="text-xxs font-semibold text-zinc-500 uppercase mb-2 tracking-wider">کردارە خێراکان</div>
                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                    <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleQuickAction('check')}
                        className="flex flex-row items-center gap-2 p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded transition group text-right"
                    >
                        <FileCheck className="w-3 h-3 text-orange-500 group-hover:text-orange-400 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-zinc-300">پشکنینی ئامانج</span>
                    </button>
                    <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleQuickAction('fix')}
                        className="flex flex-row items-center gap-2 p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded transition group text-right"
                    >
                        <Mic2 className="w-3 h-3 text-emerald-500 group-hover:text-emerald-400 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-zinc-300">چاککردن</span>
                    </button>
                    <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleQuickAction('alternates')}
                        className="flex flex-row items-center justify-center gap-2 p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded transition group text-right col-span-2"
                    >
                        <Sparkles className="w-3 h-3 text-primary-500 group-hover:text-primary-400 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-zinc-300">نووسینی جیاواز</span>
                    </button>
                </div>
            </div>
            
            {/* Chat Input */}
            <div className="p-2 md:p-3 border-t border-zinc-800 bg-zinc-900/30 flex-shrink-0">
                <div className="relative">
                <textarea 
                    rows={2} 
                    placeholder="داوا لە زۆری بکە شیکاری بکات یان بنووسێت..." 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-base md:text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                ></textarea>
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                    <button className="p-1 hover:bg-zinc-800 rounded text-zinc-500 transition"><Mic className="w-3 h-3" /></button>
                    <button onClick={handleSend} className="p-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded transition shadow-lg shadow-white/10"><ArrowUp className="w-3 h-3" /></button>
                </div>
                </div>
                <div className="mt-2 flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xxs text-zinc-500 hidden sm:block">مۆدێل: Gemini 2.5</span>
                    </div>
                    <span className="text-xxs text-zinc-600">Cmd+K بۆ فرمانەکان</span>
                </div>
            </div>
        </>
      )}

      {activeTab === 'visuals' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full text-center mb-6">
                <h3 className="text-sm font-bold text-zinc-200 mb-1">وێنەکێشانی دیمەن (Storyboard Sketch)</h3>
                <p className="text-xs text-zinc-500 mb-4">دیمەنی ئێستا بکە بە وێنەیەکی ڕەش و سپی سینەمایی.</p>
                
                {generatedImage ? (
                    <div className="relative group">
                        <img src={generatedImage} alt="Storyboard sketch" className="w-full rounded-lg shadow-lg border border-zinc-700" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                             <a href={generatedImage} download="storyboard_sketch.png" className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-zinc-200">
                                 داگرتن
                             </a>
                        </div>
                    </div>
                ) : (
                    <div className="aspect-square bg-zinc-950 rounded-lg border border-zinc-800 border-dashed flex flex-col items-center justify-center text-zinc-600">
                        <Image className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs">هیچ وێنەیەک نییە</span>
                    </div>
                )}

                <div className="mt-4 flex justify-center">
                     <button 
                        onClick={handleGenerateImage}
                        disabled={isImageLoading || !scene}
                        className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                     >
                        {isImageLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (generatedImage ? <RotateCcw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />)}
                        {generatedImage ? "دروستکردنەوە" : "دروستکردنی سکێچ"}
                     </button>
                </div>
             </div>
             
             {!scene && (
                 <p className="text-xs text-zinc-500 text-center">تکایە سەرەتا دیمەنێک لە دەستکاریکەر (Editor) دیاری بکە.</p>
             )}
        </div>
      )}
    </aside>
  );
};

export default RightPanel;