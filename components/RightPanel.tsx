import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, AlertTriangle, Sparkles, Mic2, 
  Image, Mic, ArrowUp, FileInput, 
  FileCheck, Replace
} from 'lucide-react';
import { generateAssistantResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { useProject } from '../context/ProjectContext';

// Helper for unique IDs
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
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
  const { currentProject, currentSceneId, updateSceneContent, isRightPanelOpen, setRightPanelOpen, showConfirmation } = useProject();
  const [activeTab, setActiveTab] = useState<'assistant' | 'visuals'>('assistant');
  
  // Chat State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'user', text: 'پێویستم بە یارمەتییە لەم دیمەنە.' },
    { 
      id: '2', 
      role: 'model', 
      text: 'دەتوانم یارمەتیت بدەم. داوام لێ بکە دیمەنەکە شیبکەمەوە یان پێشنیاری نووسینەوە بکەم.',
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scene = currentProject?.scenes.find(s => s.id === currentSceneId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  const buildDeepContext = () => {
      const charDetails = currentProject?.characters.map(c => {
          const rels = c.relationships?.map(r => {
              const target = currentProject.characters.find(tc => tc.id === r.targetId)?.name || 'Unknown';
              return `${r.type} of ${target} (${r.description})`;
          }).join(', ');
          
          return `* ${c.name} (${c.role}, ${c.archetype}): ${c.description}. Traits: [${c.traits.join(', ')}]. ${rels ? `Relationships: ${rels}` : ''}`;
      }).join('\n');

      const genreString = currentProject?.genres.join(', ') || 'Unknown Genre';

      const fullScriptHistory = currentProject?.scenes
        .sort((a, b) => a.number - b.number)
        .map(s => {
            const isCurrent = s.id === currentSceneId;
            const cleanContent = s.content ? s.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
            return `SCENE ${s.number} [${s.title}]${isCurrent ? ' (CURRENTLY EDITING)' : ''}:\n${cleanContent}\n`;
        })
        .join('\n----------------\n') || "No scenes yet.";

      return `
        Project: ${currentProject?.title || 'Untitled'}
        Type: ${currentProject?.type} (${currentProject?.format || 'Standard'})
        Genres: ${genreString}
        Logline: ${currentProject?.logline || 'N/A'}
        Theme: ${currentProject?.theme || 'N/A'}
        Setting: ${currentProject?.setting || 'N/A'}
        Protagonist Goal: ${currentProject?.protagonistGoal || 'N/A'}
        
        CHARACTERS & RELATIONSHIPS:
        ${charDetails || 'No characters defined.'}

        === FULL SCRIPT MEMORY ===
        
        ${fullScriptHistory}
        
        === END SCRIPT MEMORY ===

        CURRENT SCENE: ${scene?.title || 'Unknown'}
        CONTENT: ${scene?.content.replace(/<[^>]*>?/gm, '') || ''}
      `;
  };

  const executeCommand = async (command: string) => {
      if (isChatLoading) return;
      const userMsg: ChatMessage = { id: generateId(), role: 'user', text: command };
      setMessages(prev => [...prev, userMsg]);
      setIsChatLoading(true);

      try {
        const contextString = buildDeepContext();
        const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));
        
        const responseText = await generateAssistantResponse(
            history, 
            command,
            contextString
        );
        
        const modelMsg: ChatMessage = {
          id: generateId(),
          role: 'model',
          text: responseText
        };
        setMessages(prev => [...prev, modelMsg]);
      } catch (e) {
        console.error(e);
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
                  prompt = "Check this entire scene for pacing, structure, and character voice issues. Suggest improvements in Kurdish (Sorani).";
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
    
    showConfirmation("ئەمە ناوەڕۆکی دیمەنەکە بە تەواوی دەگۆڕێت بە پێشنیارەکەی زیرەکی دەستکرد. ئەم کردارە پاشگەزبوونەوەی نییە. دڵنیایت؟", () => {
        const cleanContent = contentToInsert.replace(/<\/?screenplay>/g, '');
        updateSceneContent(scene.id, cleanContent);
    });
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
             <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 shadow-lg overflow-hidden relative">
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
            ${isRightPanelOpen 
                ? '-translate-x-0 ml-0 w-full md:w-80 border-r border-zinc-800/60' 
                : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0'}
            md:inset-y-0 bottom-0 top-12 md:top-0 
            h-[calc(100dvh-3rem)] md:h-full 
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
            {/* Fixed Context Header */}
            <div className="p-4 pb-0 flex-shrink-0 z-10 bg-zinc-925">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                    <span className="text-xxs font-semibold text-zinc-500 uppercase">دۆخی ئێستا</span>
                    <span className="text-xxs text-emerald-500 flex items-center gap-1"><Wifi className="w-2.5 h-2.5" /> چالاک</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                    <span className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-xxs text-zinc-300">دیمەنی {scene?.number || '?' }</span>
                    {currentProject?.characters.slice(0, 2).map(c => (
                        <span key={c.id} className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-xxs text-zinc-300">{c.name}</span>
                    ))}
                    </div>
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
                            {msg.hasContradiction && (
                                <div className="flex items-start gap-2 mb-2 text-amber-400 bg-amber-400/10 p-2 rounded border border-amber-400/20">
                                <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
                                <div>
                                    <span className="font-medium block mb-0.5">ناکۆکی دۆزرایەوە</span>
                                    <span className="opacity-80">لە دیمەنی ٠٠١، ئاریا دەستی شکا. لێرە هەردوو دەستی بەکاردەهێنێت.</span>
                                </div>
                                </div>
                            )}
                            
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
                        <span className="text-[10px] font-medium text-zinc-300">پشکنین</span>
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
        </>
      )}

      {activeTab === 'visuals' && (
        <div className="flex-1 overflow-y-auto p-4">
             <div className="grid grid-cols-2 gap-2">
                 <div className="aspect-square bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center text-zinc-600">
                     <Image className="w-6 h-6" />
                 </div>
                 <div className="aspect-square bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center text-zinc-600">
                     <Image className="w-6 h-6" />
                 </div>
             </div>
             <p className="text-xxs text-zinc-500 text-center mt-2">وێنەی دروستکراوی دیمەن</p>
        </div>
      )}

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
    </aside>
  );
};

export default RightPanel;