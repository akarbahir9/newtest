import React, { useState, useEffect, useRef } from 'react';
import { Film, Edit3, ArrowLeft, Plus, Tv, Edit2, Save, ChevronDown, ChevronLeft, Trash2, ArrowRight, LayoutList, FileText, Send, Sparkles, BookOpen, MessageSquare, Mic, Play, Eye } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { generateStoryPlanChat } from '../services/geminiService';

// Markdown Helper for the plan
const MarkdownDisplay: React.FC<{ content: string }> = ({ content }) => {
    if (!content) return <div className="text-zinc-500 italic text-sm text-center py-10">هیچ پلانێک نییە. لە ڕێگەی چاتەکەوە داوا لە زیرەکی دەستکرد بکە بۆت دروست بکات!</div>;
    
    return (
        <div className="prose prose-invert prose-sm max-w-none dir-rtl font-sans leading-relaxed">
            {content.split('\n').map((line, i) => {
                if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-primary-400 mt-8 mb-4 border-b border-zinc-800 pb-2">{line.replace('# ', '')}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-zinc-100 mt-6 mb-3">{line.replace('## ', '')}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-emerald-400 mt-5 mb-2">{line.replace('### ', '')}</h3>;
                if (line.startsWith('#### ')) return <h4 key={i} className="text-base font-semibold text-zinc-300 mt-4 mb-2">{line.replace('#### ', '')}</h4>;
                if (line.startsWith('* ') || line.startsWith('- ')) return <li key={i} className="ml-4 text-zinc-300 my-1.5 list-disc pl-2">{line.replace(/^[\*\-]\s/, '')}</li>;
                if (line.match(/^\d+\./)) return <li key={i} className="ml-4 text-zinc-300 my-1.5 list-decimal pl-2">{line.replace(/^\d+\.\s/, '')}</li>;
                if (line.startsWith('>')) return <blockquote key={i} className="border-r-4 border-zinc-700 pr-4 py-1 my-4 text-zinc-400 italic bg-zinc-900/50 rounded-l">{line.replace('> ', '')}</blockquote>;
                if (line.trim() === '') return <br key={i} />;
                return <p key={i} className="text-zinc-300 leading-relaxed my-2">{line}</p>;
            })}
        </div>
    );
};

const Outline: React.FC = () => {
  const { currentProject, navigateTo, setCurrentSceneId, updateSceneSummary, addScene, deleteScene, showConfirmation, addEpisode, updateEpisode, isSidebarOpen, setSidebarOpen, updateProject } = useProject();
  
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
      duration: 110,
      pages: 300,
      wordCount: 80000,
      seasons: 1,
      episodes: 8,
      epDuration: 50
  });

  // Blueprint Chat State
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [planMessages, setPlanMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Blueprint Editor State
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editablePlan, setEditablePlan] = useState('');

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
  }, [planMessages]);

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
      
      const userMsg = chatInput;
      setChatInput('');
      setPlanMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsChatLoading(true);

      try {
          // Prepare history for API
          const historyForApi = planMessages.map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
          }));

          const result = await generateStoryPlanChat(
              historyForApi,
              userMsg,
              currentProject.blueprint || '',
              { ...currentProject, targetMetadata: config }
          );

          if (result.newPlan) {
              updateProject(currentProject.id, { blueprint: result.newPlan });
              setEditablePlan(result.newPlan);
          }
          
          setPlanMessages(prev => [...prev, { role: 'model', text: result.text }]);

      } catch (e) {
          console.error(e);
          setPlanMessages(prev => [...prev, { role: 'model', text: "ببورە، کێشەیەک ڕوویدا." }]);
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

  // --- Render Helpers ---

  const handleStartEdit = (id: string, currentSummary: string) => {
    setEditingId(id);
    setTempSummary(currentSummary || '');
  };

  const handleSaveSummary = (id: string) => {
    updateSceneSummary(id, tempSummary);
    setEditingId(null);
  };

  const handleSaveEpisodeTitle = (id: string) => {
      updateEpisode(id, tempEpTitle);
      setEditingEpId(null);
  };

  const handleDeleteScene = (sceneId: string, sceneTitle: string) => {
    showConfirmation(`دڵنیایت لە سڕینەوەی "${sceneTitle || 'بێ ناونیشان'}"؟`, () => {
        deleteScene(sceneId);
    });
  };

  const renderScenes = (scenes: any[]) => (
      <div className="space-y-4 relative">
        <div className="absolute right-6 top-4 bottom-4 w-0.5 bg-zinc-800 z-0 hidden md:block"></div>
        {scenes.map((scene, index) => (
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
                            <button onClick={() => handleDeleteScene(scene.id, scene.title)} className="text-red-500 hover:text-red-400">
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
                                    <button onClick={() => handleSaveSummary(scene.id)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1 rounded">پاشەکەوت</button>
                                </div>
                            </div>
                        ) : (
                            <div onClick={() => handleStartEdit(scene.id, scene.summary || '')} className="text-sm text-zinc-400 leading-relaxed cursor-pointer hover:text-zinc-300 min-h-[3rem] group/summary">
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
                    {isSerial && (
                        <button onClick={() => addEpisode()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3 py-1.5 rounded shadow-sm flex items-center gap-2 border border-zinc-700">
                            <Tv className="w-3.5 h-3.5" /> ئەڵقەی نوێ
                        </button>
                    )}
                    {!isSerial && (
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
                                                    <button onClick={() => handleSaveEpisodeTitle(ep.id)}><Save className="w-4 h-4 text-primary-500" /></button>
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
                                            <Plus className="w-3 h-3" /> زیادکردنی دیمەن
                                        </button>
                                        </div>
                                    </div>
                                    {isExpanded && renderScenes(currentProject.scenes.filter(s => s.episodeId === ep.id))}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    renderScenes(currentProject.scenes)
                )}
            </div>
        )}

        {activeTab === 'blueprint' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
                {/* LEFT SIDEBAR: Config & Chat */}
                <div className="lg:col-span-1 flex flex-col gap-4 h-full min-h-0">
                    
                    {/* 1. Structure Config Box */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-shrink-0">
                        <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wide flex items-center gap-2 mb-3">
                            <BookOpen className="w-3.5 h-3.5 text-primary-400" /> پێکهاتەی چیرۆک
                        </h3>
                        
                        <div className="space-y-3">
                            {!isSerial && !isNovel && (
                                <div>
                                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                        <span>ماوەی فیلم</span>
                                        <span className="text-zinc-200">{config.duration} خولەک</span>
                                    </div>
                                    <input 
                                        type="range" min="60" max="180" step="5" 
                                        value={config.duration}
                                        onChange={(e) => handleConfigChange('duration', parseInt(e.target.value))}
                                        className="w-full accent-primary-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            )}
                            
                            {isNovel && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1">ژمارەی پەڕە</label>
                                        <input type="number" value={config.pages} onChange={(e) => handleConfigChange('pages', parseInt(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 outline-none focus:border-primary-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1">کۆی وشەکان</label>
                                        <input type="number" step="1000" value={config.wordCount} onChange={(e) => handleConfigChange('wordCount', parseInt(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 outline-none focus:border-primary-500" />
                                    </div>
                                </div>
                            )}

                            {isSerial && (
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1">وەرز</label>
                                        <input type="number" min="1" max="20" value={config.seasons} onChange={(e) => handleConfigChange('seasons', parseInt(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 outline-none focus:border-primary-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1">ئەڵقە</label>
                                        <input type="number" min="1" max="50" value={config.episodes} onChange={(e) => handleConfigChange('episodes', parseInt(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 outline-none focus:border-primary-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 mb-1">ماوە (خ)</label>
                                        <input type="number" min="10" max="90" value={config.epDuration} onChange={(e) => handleConfigChange('epDuration', parseInt(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 outline-none focus:border-primary-500" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Planning Chat */}
                    <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
                        <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
                             <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> یاریدەدەری پلاندانان
                             </h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-zinc-950/30">
                            {planMessages.length === 0 && (
                                <div className="text-center mt-10 opacity-50">
                                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                                    <p className="text-xs text-zinc-500">سڵاو! من لێرەم بۆ یارمەتیدانت لە داڕشتنی پلانی "{currentProject.title}". چۆن دەست پێ بکەین؟</p>
                                </div>
                            )}
                            {planMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[85%] rounded-lg p-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-zinc-800 text-zinc-200 rounded-br-none' : 'bg-primary-900/40 text-primary-100 border border-primary-500/20 rounded-bl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex justify-end">
                                    <div className="bg-primary-900/20 rounded-lg p-2 rounded-bl-none">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce delay-75"></span>
                                            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce delay-150"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-2 border-t border-zinc-800 bg-zinc-900">
                            <div className="relative">
                                <input 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendPlanChat()}
                                    placeholder="نموونە: پلانێک بۆ ئەکت ١ دابنێ..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                                    disabled={isChatLoading}
                                />
                                <button 
                                    onClick={handleSendPlanChat}
                                    disabled={!chatInput.trim() || isChatLoading}
                                    className="absolute left-1.5 top-1.5 p-1 bg-primary-600 hover:bg-primary-500 rounded text-white disabled:opacity-50 disabled:bg-zinc-700"
                                >
                                    <Send className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Plan Editor/Viewer */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col min-h-0 overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900/50">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-zinc-200">پلانی پڕۆژە (Blueprint)</h3>
                            <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-700">Markdown</span>
                        </div>
                        <div className="flex bg-zinc-950 rounded border border-zinc-800 p-0.5">
                            <button 
                                onClick={() => setIsEditingPlan(false)}
                                className={`px-2 py-1 text-[10px] font-medium rounded transition flex items-center gap-1 ${!isEditingPlan ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Eye className="w-3 h-3" /> بینین
                            </button>
                            <button 
                                onClick={() => setIsEditingPlan(true)}
                                className={`px-2 py-1 text-[10px] font-medium rounded transition flex items-center gap-1 ${isEditingPlan ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Edit2 className="w-3 h-3" /> دەستکاری
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-zinc-900 relative">
                        {isEditingPlan ? (
                            <div className="h-full flex flex-col">
                                <textarea 
                                    value={editablePlan}
                                    onChange={(e) => setEditablePlan(e.target.value)}
                                    className="flex-1 w-full h-full bg-zinc-950 border border-zinc-800 rounded p-4 text-sm font-mono text-zinc-300 outline-none focus:border-primary-500/50 leading-relaxed resize-none"
                                    spellCheck={false}
                                />
                                <div className="mt-2 flex justify-end">
                                    <button onClick={handleManualPlanSave} className="bg-primary-600 hover:bg-primary-500 text-white text-xs px-4 py-2 rounded flex items-center gap-2">
                                        <Save className="w-3.5 h-3.5" /> پاشەکەوتکردن
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <MarkdownDisplay content={currentProject.blueprint || ''} />
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