import React, { useState } from 'react';
import { Film, Edit3, ArrowLeft, Plus, Tv, Edit2, Save, ChevronDown, ChevronLeft, Trash2, ArrowRight } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const Outline: React.FC = () => {
  const { currentProject, navigateTo, setCurrentSceneId, updateSceneSummary, addScene, deleteScene, showConfirmation, addEpisode, updateEpisode, isSidebarOpen, setSidebarOpen } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempSummary, setTempSummary] = useState('');
  
  const [editingEpId, setEditingEpId] = useState<string | null>(null);
  const [tempEpTitle, setTempEpTitle] = useState('');
  
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});

  const toggleEpisode = (epId: string) => {
    setExpandedEpisodes(prev => ({ ...prev, [epId]: !prev[epId] }));
  };

  if (!currentProject) return <div className="p-8 text-zinc-500">تکایە پڕۆژەیەک هەڵبژێرە.</div>;

  const isSerial = currentProject.type === 'Serial';

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
        {/* Vertical Line - Positioned Right for RTL */}
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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8 pl-0 md:pl-0">
          <div className="flex items-center gap-4">
             <div>
                <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">پوختە</h1>
                <p className="text-sm text-zinc-500 mt-1">{currentProject.title} ({currentProject.type === 'Screenplay' ? 'سیناریۆ' : currentProject.type === 'Serial' ? 'زنجیرە' : 'ڕۆمان'})</p>
             </div>
          </div>
          <div className="flex gap-2">
              {isSerial && (
                  <button onClick={() => addEpisode()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3 py-1.5 rounded shadow-sm flex items-center gap-2">
                      <Tv className="w-3.5 h-3.5" /> ئەڵقەی نوێ
                  </button>
              )}
              {!isSerial && (
                  <button onClick={() => addScene()} className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium px-3 py-1.5 rounded shadow-sm flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> زیادکردنی دیمەن
                  </button>
              )}
          </div>
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
    </div>
  );
};

export default Outline;