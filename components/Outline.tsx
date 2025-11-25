
import React, { useState, useEffect, useRef } from 'react';
import { Film, Edit3, ArrowLeft, Plus, Tv, Edit2, Save, ChevronDown, ChevronLeft, Trash2, ArrowRight, LayoutList, FileText, Send, Sparkles, BookOpen, MessageSquare, Mic, Play, Eye, Lightbulb, Layers, Flag, Bookmark, Clock, User } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { generateStoryPlanChat } from '../services/geminiService';
import { ChatMessage } from '../types';

// --- VISUAL BLUEPRINT RENDERER ---
const MarkdownDisplay: React.FC<{ content: string; characterNames: string[] }> = ({ content, characterNames }) => {
    if (!content) return (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 italic text-sm py-20 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                <Sparkles className="w-8 h-8 text-indigo-500/50" />
            </div>
            <p>هیچ پلانێک نییە. لە ڕێگەی چاتەکەوە داوا لە زیرەکی دەستکرد بکە بۆت دروست بکات!</p>
        </div>
    );

    // Helper to detect structural keywords for badges
    const getBadge = (text: string) => {
        const keywords = ['Inciting Incident', 'Plot Point', 'Midpoint', 'Climax', 'Resolution', 'Hook', 'Pinch Point'];
        const found = keywords.find(k => text.includes(k) || text.includes(k.toUpperCase()));
        if (found) {
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 ml-2"><Flag className="w-3 h-3" /> {found}</span>;
        }
        return null;
    };

    // Helper to highlight character names within a string
    const highlightNames = (text: string) => {
        if (!characterNames || characterNames.length === 0) return text;
        
        // Escape regex characters in names and sort by length (longest first) to match "John Doe" before "John"
        const sortedNames = [...characterNames].sort((a, b) => b.length - a.length);
        if (sortedNames.length === 0) return text;

        const regex = new RegExp(`(${sortedNames.join('|')})`, 'gi');
        const parts = text.split(regex);
        
        if (parts.length === 1) return text;

        return parts.map((part, i) => {
            const isMatch = sortedNames.some(name => name.toLowerCase() === part.toLowerCase());
            if (isMatch) {
                return (
                    <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-md mx-0.5 bg-rose-500/10 text-rose-300 font-bold border border-rose-500/20 text-[0.9em]">
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    const parseInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                const inner = part.slice(2, -2);
                return <strong key={index} className="font-bold text-zinc-100">{highlightNames(inner)}</strong>;
            }
            return <span key={index}>{highlightNames(part)}</span>;
        });
    };

    // Helper to check for Episode titles in Kurdish or English
    const isEpisodeTitle = (text: string) => {
        const lower = text.toLowerCase();
        return lower.includes('episode') || lower.includes('ئەڵقە');
    };

    return (
        <div className="dir-rtl pb-32">
            {content.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-3"></div>;

                // --- ACTS (Major Dividers) ---
                if (line.startsWith('# ')) {
                    return (
                        <div key={i} className="relative mt-16 mb-8 text-center group">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-zinc-950 px-6 py-2 text-2xl font-black text-zinc-100 uppercase tracking-widest border border-zinc-800 rounded-xl shadow-2xl group-hover:border-primary-500/50 transition-colors duration-500">
                                    {line.replace('# ', '')}
                                </span>
                            </div>
                        </div>
                    );
                }

                // --- SEQUENCES or EPISODES (Cards) ---
                if (line.startsWith('## ')) {
                    const content = line.replace('## ', '');
                    
                    // Special styling for EPISODES
                    if (isEpisodeTitle(content)) {
                        return (
                            <React.Fragment key={i}>
                                {/* Visual Divider for Episodes */}
                                <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent mt-16 mb-8"></div>
                                
                                <div className="mb-6 flex items-center gap-4 bg-gradient-to-r from-purple-900/20 to-zinc-900/50 border border-purple-500/30 p-5 rounded-xl shadow-lg shadow-purple-900/10 group">
                                    <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Tv className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-purple-200 tracking-wide flex-1">
                                        {parseInline(content)}
                                    </h2>
                                </div>
                            </React.Fragment>
                        );
                    }

                    // Standard SEQUENCES
                    return (
                        <div key={i} className="mt-10 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-900/20 flex items-center justify-center border border-emerald-500/20 text-emerald-500 shadow-sm">
                                <Layers className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-emerald-100 tracking-wide border-b border-zinc-800 pb-1 flex-1">
                                {parseInline(content)}
                            </h2>
                        </div>
                    );
                }

                // --- SCENES (Timeline Nodes) ---
                if (line.startsWith('### ')) {
                    const content = line.replace('### ', '');
                    
                    // Fallback check if Episode is marked with ### instead of ##
                    if (isEpisodeTitle(content)) {
                        return (
                            <div key={i} className="mt-12 mb-4">
                                <div className="w-full h-px bg-zinc-800 mb-6"></div>
                                <div className="flex items-center gap-3 border-r-4 border-purple-500 pr-4 mr-2 bg-purple-900/10 p-3 rounded-l-lg">
                                    <h3 className="text-lg font-bold text-purple-300">
                                        {parseInline(content)}
                                    </h3>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={i} className="mt-6 mb-3 ml-4 relative border-r-2 border-indigo-500/30 pr-6 mr-3">
                            <div className="absolute -right-[9px] top-1 w-4 h-4 rounded-full bg-zinc-950 border-2 border-indigo-500 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                            </div>
                            <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider flex flex-wrap items-center gap-2">
                                {parseInline(content)}
                                {getBadge(line)}
                            </h3>
                        </div>
                    );
                }

                // --- SUB-HEADERS / LOCATIONS ---
                if (line.startsWith('#### ')) {
                    return (
                        <h4 key={i} className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2 mb-1 mr-10 flex items-center gap-2">
                            <Bookmark className="w-3 h-3" />
                            {line.replace('#### ', '')}
                        </h4>
                    );
                }

                // --- BULLET POINTS (Potential Characters) ---
                if (line.startsWith('* ') || line.startsWith('- ')) {
                    const cleanLine = line.replace(/^[\*\-]\s/, '');
                    
                    // Check if this list item looks like a character definition (e.g. "**Name**: description")
                    const isCharacterDef = cleanLine.match(/^\*\*(.*?)\*\*[:\s\-]/) || cleanLine.match(/^__(.*?)__[:\s\-]/);

                    if (isCharacterDef) {
                        return (
                            <div key={i} className="mr-4 my-3 bg-zinc-900/60 border border-zinc-800 p-3 rounded-lg flex items-start gap-3 shadow-sm hover:border-zinc-700 hover:bg-zinc-900 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-rose-900/20 text-rose-400 flex items-center justify-center font-bold text-xs border border-rose-500/10 mt-1 flex-shrink-0">
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="text-sm text-zinc-300 leading-relaxed flex-1">
                                    {parseInline(cleanLine)}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={i} className="mr-8 my-2 flex items-start gap-3">
                            <span className="mt-2 w-1.5 h-1.5 bg-zinc-600 rounded-full flex-shrink-0"></span>
                            <span className="text-zinc-300 text-sm leading-relaxed">{parseInline(cleanLine)}</span>
                        </div>
                    );
                }

                // --- NUMBERED LISTS ---
                if (line.match(/^\d+\./)) {
                    return (
                        <div key={i} className="mr-8 my-2 flex items-start gap-3">
                            <span className="text-zinc-500 font-mono text-xs mt-0.5">{line.split('.')[0]}.</span>
                            <span className="text-zinc-300 text-sm leading-relaxed">{parseInline(line.replace(/^\d+\.\s/, ''))}</span>
                        </div>
                    );
                }

                // --- INSIGHTS / NOTES (Blockquotes) ---
                if (line.startsWith('>')) {
                    return (
                        <div key={i} className="mr-6 my-4 bg-amber-950/10 border-r-4 border-amber-500/40 rounded-l-lg p-4 relative group hover:bg-amber-950/20 transition-colors">
                            <Lightbulb className="absolute left-2 top-2 w-12 h-12 text-amber-500/5 -rotate-12 pointer-events-none" />
                            <div className="relative text-amber-200/90 text-sm italic leading-relaxed flex gap-3">
                                <span className="text-amber-500 text-lg font-serif">"</span>
                                {parseInline(line.replace('> ', ''))}
                            </div>
                        </div>
                    );
                }

                // --- STANDARD PARAGRAPHS ---
                return (
                    <p key={i} className="text-zinc-300 leading-8 my-2 text-justify mr-4 text-sm font-light">
                        {parseInline(line)}
                    </p>
                );
            })}
        </div>
    );
};

const Outline: React.FC = () => {
  const { currentProject, navigateTo, setCurrentSceneId, updateSceneSummary, addScene, deleteScene, showConfirmation, addEpisode, updateEpisode, updateProject, addPlanChatMessage } = useProject();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'scenes' | 'blueprint'>('scenes');
  
  // Scene Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempSummary, setTempSummary] = useState('');
  
  // Episode Editing State
  const [editingEpId, setEditingEpId] = useState<string | null>(null);
  const [tempEpTitle, setTempEpTitle] = useState('');
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});

  // Blueprint State
  const [config, setConfig] = useState({
      duration: 110, pages: 300, wordCount: 80000, seasons: 1, episodes: 8, epDuration: 50
  });

  // Blueprint Chat State
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Blueprint Editor State
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editablePlan, setEditablePlan] = useState('');

  // Use persistent messages from project context
  const planMessages = currentProject?.planChatHistory || [];

  useEffect(() => {
      if (currentProject?.targetMetadata) {
          setConfig(prev => ({
              ...prev,
              duration: currentProject.targetMetadata?.durationMinutes || 110,
              pages: currentProject.targetMetadata?.targetPageCount || 300,
              wordCount: currentProject.targetMetadata?.targetWordCount || 80000,
              seasons: currentProject.targetMetadata?.totalSeasons || 1,
              episodes: currentProject.targetMetadata?.episodesPerSeason || 8,
              epDuration: currentProject.targetMetadata?.episodeDuration || 50
          }));
      }
      if (currentProject?.blueprint) {
          setEditablePlan(currentProject.blueprint);
      }
  }, [currentProject?.id, currentProject?.blueprint]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [planMessages, isChatLoading]);

  const toggleEpisode = (epId: string) => {
    setExpandedEpisodes(prev => ({ ...prev, [epId]: !prev[epId] }));
  };

  const handleConfigChange = (key: string, value: number) => {
      const newConfig = { ...config, [key]: value };
      setConfig(newConfig);
      
      if (currentProject) {
          const metaUpdate: any = {};
          if (currentProject.type === 'Screenplay') metaUpdate.durationMinutes = newConfig.duration;
          if (currentProject.type === 'Novel') {
              metaUpdate.targetPageCount = newConfig.pages;
              metaUpdate.targetWordCount = newConfig.wordCount;
          }
          if (currentProject.type === 'Serial') {
              metaUpdate.totalSeasons = newConfig.seasons;
              metaUpdate.episodesPerSeason = newConfig.episodes;
              metaUpdate.episodeDuration = newConfig.epDuration;
          }
          updateProject(currentProject.id, { targetMetadata: metaUpdate });
      }
  };

  const handleSendPlanChat = async () => {
      if (!currentProject || !chatInput.trim()) return;
      
      const userText = chatInput;
      setChatInput('');
      
      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: userText
      };
      
      // Save user message
      addPlanChatMessage(currentProject.id, userMsg);
      
      setIsChatLoading(true);

      try {
          // Prepare history for API
          const historyForApi = planMessages.map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
          }));
          historyForApi.push({ role: 'user', parts: [{ text: userText }] });

          const result = await generateStoryPlanChat(
              historyForApi,
              userText,
              currentProject.blueprint || '',
              { ...currentProject, targetMetadata: config }
          );

          if (result.newPlan) {
              updateProject(currentProject.id, { blueprint: result.newPlan });
              setEditablePlan(result.newPlan);
          }
          
          const modelMsg: ChatMessage = {
              id: Date.now().toString(),
              role: 'model',
              text: result.text
          };
          
          // Save model message
          addPlanChatMessage(currentProject.id, modelMsg);

      } catch (e) {
          console.error(e);
          const errorMsg: ChatMessage = {
              id: Date.now().toString(),
              role: 'model',
              text: "ببورە، کێشەیەک ڕوویدا."
          };
          addPlanChatMessage(currentProject.id, errorMsg);
      } finally {
          setIsChatLoading(false);
      }
  };

  const handleManualPlanSave = () => {
      if (currentProject) {
          updateProject(currentProject.id, { blueprint: editablePlan });
          setIsEditingPlan(false);
      }
  };

  if (!currentProject) return <div className="p-8 text-zinc-500">تکایە پڕۆژەیەک هەڵبژێرە.</div>;
  const isSerial = currentProject.type === 'Serial';
  const isNovel = currentProject.type === 'Novel';

  const renderScenes = (scenes: any[]) => (
      <div className="space-y-4 relative">
        <div className="absolute right-6 top-4 bottom-4 w-0.5 bg-zinc-800 z-0 hidden md:block"></div>
        {scenes.map((scene) => (
            <div key={scene.id} className="relative z-10 flex flex-col md:flex-row gap-4 group">
                <div className="flex-shrink-0 w-12 flex flex-col items-center pt-2 hidden md:flex">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-400 font-bold z-10 group-hover:border-primary-500 group-hover:text-primary-400 transition-colors">
                        {scene.number}
                    </div>
                </div>
                <div className="flex-1 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-lg p-4 transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <span className="md:hidden text-xs font-mono font-bold text-zinc-500">#{scene.number}</span>
                            <h3 className="text-sm font-medium text-zinc-200">{scene.title || 'دیمەنی بێ ناونیشان'}</h3>
                        </div>
                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => { showConfirmation('دڵنیایت؟', () => deleteScene(scene.id)) }} className="text-red-500 hover:text-red-400">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setCurrentSceneId(scene.id); navigateTo('editor'); }} className="text-xs flex items-center gap-1 text-primary-500 hover:text-primary-400">
                                دەستکاری <ArrowLeft className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    <div className="mt-2">
                        {editingId === scene.id ? (
                            <div className="space-y-2">
                                <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:border-zinc-700 outline-none resize-none h-24" value={tempSummary} onChange={(e) => setTempSummary(e.target.value)} autoFocus />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">پاشگەزبوونەوە</button>
                                    <button onClick={() => { updateSceneSummary(scene.id, tempSummary); setEditingId(null); }} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1 rounded">پاشەکەوت</button>
                                </div>
                            </div>
                        ) : (
                            <div onClick={() => { setEditingId(scene.id); setTempSummary(scene.summary || ''); }} className="text-sm text-zinc-400 leading-relaxed cursor-pointer hover:text-zinc-300 min-h-[3rem] group/summary">
                                {scene.summary || <span className="italic text-zinc-600">کرتە بکە بۆ زیادکردنی کورتە...</span>}
                                <Edit3 className="w-3 h-3 inline mr-2 opacity-0 group-hover/summary:opacity-50" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ))}
      </div>
  );

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto relative bg-zinc-950">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-6 pl-0 md:pl-0 border-b border-zinc-800 pb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
             <div>
                <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">پوختە و پلان</h1>
                <p className="text-sm text-zinc-500 mt-1">{currentProject.title}</p>
             </div>
          </div>
          
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button 
                onClick={() => setActiveTab('scenes')} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition ${activeTab === 'scenes' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                  <LayoutList className="w-3.5 h-3.5" /> دیمەنەکان
              </button>
              <button 
                onClick={() => setActiveTab('blueprint')} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition ${activeTab === 'blueprint' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                  <FileText className="w-3.5 h-3.5" /> پلان (Blueprint)
              </button>
          </div>
        </div>

        {activeTab === 'scenes' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex justify-end mb-4">
                    {isSerial ? (
                        <button onClick={() => addEpisode()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3 py-1.5 rounded shadow-sm flex items-center gap-2 border border-zinc-700">
                            <Tv className="w-3.5 h-3.5" /> ئەڵقەی نوێ
                        </button>
                    ) : (
                        <button onClick={() => addScene()} className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium px-3 py-1.5 rounded shadow-sm flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5" /> زیادکردنی دیمەن
                        </button>
                    )}
                </div>

                {isSerial ? (
                    <div className="space-y-8">
                        {currentProject.episodes?.map(ep => {
                            const isExpanded = expandedEpisodes[ep.id] !== false; 
                            return (
                                <div key={ep.id} className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                                    <div 
                                        className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2 cursor-pointer"
                                        onClick={() => toggleEpisode(ep.id)}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" /> : <ChevronLeft className="w-4 h-4 text-zinc-500 flex-shrink-0" />}

                                            {editingEpId === ep.id ? (
                                                <div className="flex gap-2 items-center flex-1" onClick={e => e.stopPropagation()}>
                                                    <input className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white outline-none w-full" value={tempEpTitle} onChange={e => setTempEpTitle(e.target.value)} autoFocus />
                                                    <button onClick={() => { updateEpisode(ep.id, tempEpTitle); setEditingEpId(null); }}><Save className="w-4 h-4 text-primary-500" /></button>
                                                </div>
                                            ) : (
                                                <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2 group truncate" onClick={(e) => { e.stopPropagation(); setEditingEpId(ep.id); setTempEpTitle(ep.title); }}>
                                                    <span className="truncate">{ep.title}</span>
                                                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 text-zinc-500" />
                                                </h2>
                                            )}
                                        </div>
                                        <div onClick={e => e.stopPropagation()}>
                                        <button onClick={() => addScene(ep.id)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded flex items-center gap-1 ml-4">
                                            <Plus className="w-3 h-3" /> زیادکردن
                                        </button>
                                        </div>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="mt-4 border-t border-zinc-800/50 pt-4 pl-4 border-l border-zinc-800/50 ml-2">
                                            {renderScenes(currentProject.scenes.filter(s => s.episodeId === ep.id))}
                                            {currentProject.scenes.filter(s => s.episodeId === ep.id).length === 0 && (
                                                <div className="text-center py-6 text-zinc-600 italic text-xs">
                                                    هیچ دیمەنێک نییە لەم ئەڵقەیەدا.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    renderScenes(currentProject.scenes)
                )}
            </div>
        )}

        {activeTab === 'blueprint' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Chat Panel */}
                <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-l border-zinc-800 flex flex-col bg-zinc-900/30">
                     <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                         ئەندازیاری چیرۆک
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                         {planMessages.length === 0 && (
                             <div className="text-center text-zinc-500 text-xs mt-10 p-4">
                                 <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                 <p>سڵاو! من ئەندازیاری چیرۆکم. دەتوانم یارمەتیت بدەم لە داڕشتنی پلانی چیرۆکەکەت (Blueprint). باسی چیرۆکەکەم بۆ بکە...</p>
                             </div>
                         )}
                         {planMessages.map((msg) => (
                             <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                 <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-zinc-700' : 'bg-indigo-600'}`}>
                                     {msg.role === 'user' ? <span className="text-[10px]">تۆ</span> : <Sparkles className="w-3 h-3 text-white" />}
                                 </div>
                                 <div className={`text-xs p-3 rounded-lg max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'}`}>
                                     {msg.text}
                                 </div>
                             </div>
                         ))}
                         {isChatLoading && (
                             <div className="flex gap-2 items-center text-zinc-500 text-xs animate-pulse">
                                 <Sparkles className="w-3 h-3" />
                                 <span>بیردەکاتەوە...</span>
                             </div>
                         )}
                         <div ref={messagesEndRef} />
                     </div>
                     <div className="p-3 border-t border-zinc-800 bg-zinc-900">
                         <div className="relative">
                             <textarea 
                                 className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-xs text-zinc-200 focus:border-zinc-700 outline-none resize-none"
                                 rows={2}
                                 placeholder="داوای پلان، بیرۆکە، یان گۆڕانکاری بکە..."
                                 value={chatInput}
                                 onChange={(e) => setChatInput(e.target.value)}
                                 onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendPlanChat(); } }}
                             />
                             <button 
                                 onClick={handleSendPlanChat}
                                 disabled={!chatInput.trim() || isChatLoading}
                                 className="absolute left-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-50 disabled:bg-zinc-800"
                             >
                                 <Send className="w-3 h-3" />
                             </button>
                         </div>
                     </div>
                </div>

                {/* Blueprint Content */}
                <div className="flex-1 flex flex-col h-full bg-zinc-950 relative">
                     {/* Metadata Bar */}
                     <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/20 flex-shrink-0 overflow-x-auto no-scrollbar gap-4">
                         <div className="flex items-center gap-4 text-xs text-zinc-400 whitespace-nowrap">
                             {isSerial ? (
                                 <>
                                    <div className="flex items-center gap-1">
                                        <Tv className="w-3 h-3" />
                                        <span>{config.seasons} Seasons</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Layers className="w-3 h-3" />
                                        <span>{config.episodes} Eps/Season</span>
                                    </div>
                                 </>
                             ) : (
                                 <div className="flex items-center gap-1">
                                     <Clock className="w-3 h-3" />
                                     <span>{currentProject.type === 'Novel' ? `${config.pages} Pages` : `${config.duration} Mins`}</span>
                                 </div>
                             )}
                             <div className="flex items-center gap-1">
                                 <FileText className="w-3 h-3" />
                                 <span>Target: {isNovel ? config.wordCount.toLocaleString() : (isSerial ? (config.epDuration * config.episodes * config.seasons).toLocaleString() + ' Mins' : config.duration * 1 + ' Pages')}</span>
                             </div>
                         </div>
                         <div className="flex items-center gap-2">
                             {isEditingPlan ? (
                                 <button onClick={handleManualPlanSave} className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded">
                                     <Save className="w-3 h-3" /> پاشەکەوت
                                 </button>
                             ) : (
                                 <button onClick={() => setIsEditingPlan(true)} className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded">
                                     <Edit3 className="w-3 h-3" /> دەستکاری
                                 </button>
                             )}
                         </div>
                     </div>

                     {/* Content */}
                     <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                         {isEditingPlan ? (
                             <textarea 
                                 className="w-full h-full bg-transparent border-none outline-none text-zinc-300 font-mono text-sm leading-relaxed resize-none"
                                 value={editablePlan}
                                 onChange={(e) => setEditablePlan(e.target.value)}
                                 placeholder="# Act I&#10;## Sequence A&#10;..."
                             />
                         ) : (
                             <div className="max-w-3xl mx-auto">
                                 <MarkdownDisplay 
                                     content={currentProject.blueprint || ''} 
                                     characterNames={currentProject.characters.map(c => c.name)}
                                 />
                             </div>
                         )}
                     </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Outline;
