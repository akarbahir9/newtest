

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Sparkles, Check, Play, FileText, ArrowUpRight, ListChecks, ListFilter } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { generateStoryBuilderChat } from '../services/geminiService';
import { ChatMessage } from '../types';

// --- Markdown Renderer ---
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // Sanitize JSON leaks if they happen
    let cleanContent = content;
    
    // Robust cleanup: remove any leftover JSON structures from text display
    if (typeof content === 'string') {
        // If content looks like the full JSON object { "message": ... }
        if (content.trim().startsWith('{') && content.includes('"message":')) {
            try {
                const parsed = JSON.parse(content);
                if (parsed.message) cleanContent = parsed.message;
            } catch(e) {
                 // fallback regex
                 const match = content.match(/"message":\s*"([^"]*)"/);
                 if (match) cleanContent = match[1];
            }
        }
        // If content somehow still contains raw JSON key-values like "options": [...]
        cleanContent = cleanContent.replace(/"options":\s*\[.*?\]/g, '');
        cleanContent = cleanContent.replace(/"multiSelect":\s*(true|false)/g, '');
        cleanContent = cleanContent.replace(/[{}]/g, ''); // remove stray braces if they are wrappers
    }

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

    const lines = cleanContent.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    const flushList = (keyPrefix: string) => {
        if (currentList.length > 0) {
            elements.push(
                <ul key={`${keyPrefix}-ul`} className="mb-4 space-y-2 pr-2 text-zinc-300">
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
                <li key={`li-${i}`} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="mt-2 w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0 block shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                    <span>{itemContent}</span>
                </li>
            );
        } else {
            flushList(`pre-${i}`);
            
            if (trimmed === '') return;

            if (line.startsWith('# ')) {
                 elements.push(
                    <h1 key={`h1-${i}`} className="text-2xl font-bold text-zinc-100 mt-8 mb-4 border-b border-zinc-800 pb-2">
                        {parseInline(line.replace('# ', ''))}
                    </h1>
                );
            } else if (line.startsWith('## ')) {
                elements.push(
                   <h2 key={`h2-${i}`} className="text-xl font-bold text-emerald-400 mt-6 mb-3">
                       {parseInline(line.replace('## ', ''))}
                   </h2>
               );
           } else if (line.startsWith('###')) {
                const text = line.replace(/^###\s*/, '');
                elements.push(
                    <h3 key={`h3-${i}`} className="text-sm font-bold text-emerald-400 mt-6 mb-3 uppercase tracking-wider flex items-center gap-3 after:h-px after:bg-zinc-800 after:flex-1">
                        {parseInline(text)}
                    </h3>
                );
            } else if (line.startsWith('**') && line.endsWith('**')) {
                const text = line.replace(/\*\*/g, '');
                elements.push(
                    <div key={`sh-${i}`} className="mt-5 mb-2 text-xs font-bold text-zinc-500 uppercase tracking-widest border-r-2 border-emerald-500/50 pr-3">
                        {parseInline(text)}
                    </div>
                );
            } else {
                elements.push(<p key={`p-${i}`} className="mb-3 text-zinc-300 leading-7">{parseInline(line)}</p>);
            }
        }
    });
    
    flushList('end');

    return <div className="text-sm font-sans">{elements}</div>;
};

const StoryBuilder: React.FC = () => {
  const { navigateTo, addStory, updateStory, createProjectFromStory, currentStoryId, stories } = useProject();
  
  const [chat, setChat] = useState<ChatMessage[]>([]);
  
  // Selection State (Local to component, processed when sent)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  const [finalStoryData, setFinalStoryData] = useState<any | null>(null);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat (New or Edit)
  useEffect(() => {
    if (currentStoryId) {
        const existingStory = stories.find(s => s.id === currentStoryId);
        if (existingStory) {
             if (existingStory.chatSession) {
                 setChat(existingStory.chatSession);
             }
             if (existingStory.structuredData && existingStory.structuredData.detailedStory) {
                 setFinalStoryData(existingStory.structuredData);
             }
        } else {
            // Fallback if session missing
            setChat([{
                id: 'init',
                role: 'model',
                text: 'سڵاو! دەتەوێت چۆن دەستکاری ئەم چیرۆکە بکەین؟'
            }]);
        }
    } else {
        // New Story Mode
        setChat([{
            id: 'init',
            role: 'model',
            text: 'بەخێربێیت بۆ ژووری داڕشتنی چیرۆک. من لێرەم بۆ یارمەتیدانت. سەرەتا پێم بڵێ، بیرۆکەکەت چییە یان دەتەوێت چ جۆرە چیرۆکێک بنووسیت؟'
        }]);
    }
  }, [currentStoryId, stories]);

  // Auto-scroll
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, isLoading, finalStoryData]);

  const handleSend = async (textOverride?: string) => {
      const userText = textOverride || input;
      if (!userText.trim()) return;

      const userMsg: ChatMessage = { 
          id: Date.now().toString(), 
          role: 'user', 
          text: userText 
      };

      setChat(prev => [...prev, userMsg]);
      setInput('');
      setSelectedOptions([]); // Clear local selection
      setIsLoading(true);

      // Prepare history
      const historyForApi = chat.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      historyForApi.push({ role: 'user', parts: [{ text: userText }] });

      try {
          const response = await generateStoryBuilderChat(historyForApi, userText);
          
          let modelText = response.text;
          
          // If we got final data, construct a nice message
          if (response.finalData) {
              setFinalStoryData(response.finalData);
              const { title, logline, detailedStory, theme, type, genres } = response.finalData;
              modelText = `
# ${title}

**Logline:** ${logline}
**Type:** ${type}
**Genres:** ${genres?.join(', ')}
**Theme:** ${theme}

## Detailed Story
${detailedStory}
              `;
          }

          const modelMsg: ChatMessage = { 
              id: Date.now().toString(), 
              role: 'model', 
              text: modelText,
              options: response.options,
              isMultiSelect: response.multiSelect
          };

          setChat(prev => [...prev, modelMsg]);

          // Save/Update Logic
          if (currentStoryId) {
             // We are in Edit Mode - Update immediately
             const updatedSession = [...chat, userMsg, modelMsg];
             const updates: any = { chatSession: updatedSession };
             
             if (response.finalData) {
                 updates.title = response.finalData.title;
                 updates.summary = response.finalData.logline;
                 updates.structuredData = response.finalData;
             }
             
             await updateStory(currentStoryId, updates);

          } else {
             // We are in Create Mode
             if (response.finalData) {
                 await addStory(
                    response.finalData.title || 'Untitled Story',
                    response.finalData.logline || 'No logline',
                    [...chat, userMsg, modelMsg],
                    response.finalData
                );
                // Don't navigate away, let user read
             }
          }

      } catch (error) {
          console.error(error);
      } finally {
          setIsLoading(false);
      }
  };

  const handleAutoFinalize = () => {
      handleSend("بەپێی گفتوگۆکەمان، تکایە هەموو زانیارییەکان کۆبکەرەوە و چیرۆکەکە بە وردەکاری تەواوەوە دروست بکە. دڵنیابەرەوە کە تەواوی چیرۆکەکە لە وەڵامەکەتدا دەنووسیت.");
  };

  const handleCreateProject = async () => {
      // Handle fallback if ID isn't set yet (rare but possible in create flow)
      // If we have finalStoryData, we can technically create project even without saved story ID
      if (finalStoryData) {
           const storyToUse = stories.find(s => s.id === currentStoryId) || {
               id: 'temp-id',
               title: finalStoryData.title,
               summary: finalStoryData.logline,
               chatSession: chat,
               structuredData: finalStoryData,
               createdAt: new Date().toISOString()
           };
           
           await createProjectFromStory(storyToUse);
           navigateTo('dashboard');
           return;
      }
      
      if (!currentStoryId) {
          alert("تکایە چاوەڕێ بکە تا چیرۆکەکە پاشەکەوت دەکرێت...");
          return;
      }
  };

  const toggleOption = (option: string, isMulti: boolean) => {
      if (isMulti) {
          if (selectedOptions.includes(option)) {
              setSelectedOptions(prev => prev.filter(o => o !== option));
          } else {
              setSelectedOptions(prev => [...prev, option]);
          }
      } else {
          // Single select -> send immediately
          handleSend(option);
      }
  };

  return (
    <div className="view-section active flex-1 flex flex-col h-full bg-zinc-950 relative overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 h-16 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-between px-6 z-10">
            <div className="flex items-center gap-4">
                <button onClick={() => navigateTo('dashboard')} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        {currentStoryId ? 'دەستکاری چیرۆک' : 'داڕشتنی چیرۆک'}
                    </h1>
                    <p className="text-xs text-zinc-500">یاریدەدەری زیرەک بۆ گەڵاڵەکردنی بیرۆکە</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="hidden md:block px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 text-xs font-medium">
                    {currentStoryId ? 'دۆخی دەستکاری' : 'دۆخی ئامادەکاری'}
                </div>
                {!finalStoryData && (
                    <button 
                        onClick={handleAutoFinalize}
                        disabled={isLoading || chat.length < 2}
                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed group"
                        title="کۆکردنەوەی زانیارییەکان و دروستکردنی چیرۆکی تەواو"
                    >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden md:inline">دروستکردنی چیرۆکی تەواو</span>
                    </button>
                )}
                {finalStoryData && (
                    <button 
                        onClick={handleCreateProject}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-primary-900/20"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">بیکە بە پڕۆژە</span>
                    </button>
                )}
            </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-3xl mx-auto w-full p-6 pb-32 flex flex-col gap-8">
                {chat.map((msg, i) => (
                    <div 
                        key={msg.id} 
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                    >
                        <div className={`flex items-center gap-3 mb-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${msg.role === 'user' ? 'bg-zinc-700 text-zinc-300' : 'bg-emerald-600 text-white'}`}>
                                {msg.role === 'user' ? <span className="text-xs font-bold">تۆ</span> : <Sparkles className="w-4 h-4" />}
                            </div>
                            <span className="text-xs font-medium text-zinc-500">{msg.role === 'user' ? 'نووسەر' : 'یاریدەدەر'}</span>
                        </div>
                        
                        <div className={`max-w-[95%] md:max-w-[85%] text-base leading-8 p-5 rounded-2xl shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-zinc-800 text-zinc-100 rounded-tr-none' 
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none font-sans'
                        }`}>
                             {msg.role === 'user' ? (
                                msg.text
                             ) : (
                                <MarkdownRenderer content={msg.text} />
                             )}

                             {/* OPTIONS RENDERED INSIDE MESSAGE */}
                             {msg.options && msg.options.length > 0 && (
                                 <div className="mt-6 pt-4 border-t border-zinc-800/50">
                                     <div className="flex items-center justify-between mb-4">
                                         <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-2">
                                             {msg.isMultiSelect ? <ListChecks className="w-3.5 h-3.5" /> : <ListFilter className="w-3.5 h-3.5" />}
                                             {msg.isMultiSelect ? 'هەڵبژاردنی فرە (دەتوانیت زیاتر لە دانەیەک هەڵبژێریت):' : 'یەکێک هەڵبژێرە:'}
                                         </span>
                                         {msg.isMultiSelect && selectedOptions.length > 0 && i === chat.length - 1 && (
                                              <button 
                                                  onClick={() => handleSend(selectedOptions.join(', '))}
                                                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-full flex items-center gap-2 font-bold animate-in zoom-in shadow-lg shadow-emerald-900/30"
                                              >
                                                  ناردنی هەڵبژاردنەکان <ArrowUpRight className="w-3.5 h-3.5" />
                                              </button>
                                         )}
                                     </div>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                         {msg.options.map((opt, idx) => {
                                             const isSelected = selectedOptions.includes(opt);
                                             const isInteractive = i === chat.length - 1; 
                                             
                                             return (
                                                 <button
                                                     key={idx}
                                                     onClick={() => isInteractive && toggleOption(opt, !!msg.isMultiSelect)}
                                                     disabled={!isInteractive}
                                                     className={`
                                                        group relative flex items-center p-3 rounded-xl border text-right transition-all duration-200
                                                        ${isSelected 
                                                            ? 'bg-emerald-900/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                                            : isInteractive
                                                                ? 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
                                                                : 'bg-zinc-900/50 border-zinc-800/50 opacity-60 cursor-not-allowed'
                                                        }
                                                     `}
                                                 >
                                                     {/* Icon */}
                                                     <div className={`
                                                        w-5 h-5 flex-shrink-0 flex items-center justify-center rounded transition-colors ml-3
                                                        ${msg.isMultiSelect ? 'rounded-md' : 'rounded-full'}
                                                        ${isSelected ? 'bg-emerald-500 text-white' : 'bg-zinc-700/50 text-transparent border border-zinc-600'}
                                                     `}>
                                                         {msg.isMultiSelect && <Check className="w-3.5 h-3.5" />}
                                                         {!msg.isMultiSelect && <div className={`w-2 h-2 bg-white rounded-full ${isSelected ? 'scale-100' : 'scale-0'} transition-transform`} />}
                                                     </div>

                                                     {/* Text */}
                                                     <span className={`text-xs font-medium ${isSelected ? 'text-emerald-100' : 'text-zinc-300'}`}>
                                                         {opt}
                                                     </span>

                                                     {/* Interactive hover glow */}
                                                     {isInteractive && !isSelected && (
                                                         <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                     )}
                                                 </button>
                                             );
                                         })}
                                     </div>
                                 </div>
                             )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex flex-col items-start animate-pulse">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-600/50 flex items-center justify-center shadow-lg">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-medium text-zinc-500">یاریدەدەر</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl rounded-tl-none w-24 h-12 flex items-center justify-center">
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    </div>
                )}
                
                {finalStoryData && !isLoading && (
                    <div className="flex justify-center mt-4 mb-10">
                        <button 
                            onClick={handleCreateProject}
                            className="flex items-center gap-3 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-xl text-sm font-bold shadow-2xl shadow-primary-900/30 hover:scale-105 transition-transform"
                        >
                            <FileText className="w-5 h-5" />
                            دەستپێکردنی نووسینی ئەم پڕۆژەیە
                            <ArrowUpRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
                
                <div ref={chatEndRef} />
            </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-zinc-950 border-t border-zinc-800 flex-shrink-0 z-20">
            <div className="max-w-3xl mx-auto w-full space-y-4">
                {/* Text Input */}
                <div className="relative flex items-end gap-2 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700 transition-all shadow-sm">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="وەڵامەکەت بنووسە..."
                        className="w-full bg-transparent border-none text-sm text-zinc-200 placeholder:text-zinc-600 focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-2 dir-auto"
                        rows={1}
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={!input.trim()}
                        className="p-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all flex-shrink-0 mb-0.5"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StoryBuilder;