
import React, { useState } from 'react';
import { Film, Edit3, ArrowRight, Plus } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const Outline: React.FC = () => {
  const { currentProject, navigateTo, setCurrentSceneId, updateSceneSummary, addScene } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempSummary, setTempSummary] = useState('');

  if (!currentProject) return <div className="p-8 text-zinc-500">Please select a project.</div>;

  const handleStartEdit = (id: string, currentSummary: string) => {
    setEditingId(id);
    setTempSummary(currentSummary || '');
  };

  const handleSaveSummary = (id: string) => {
    updateSceneSummary(id, tempSummary);
    setEditingId(null);
  };

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto relative bg-zinc-950">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Outline & Beat Sheet</h1>
            <p className="text-sm text-zinc-500 mt-1">Structure your narrative flow for <span className="text-primary-400">{currentProject.title}</span>.</p>
          </div>
          <button 
            onClick={() => addScene()}
            className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium px-3 py-1.5 rounded shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add Scene
          </button>
        </div>

        <div className="space-y-4 relative">
            {/* Timeline Line (Visual only) */}
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-zinc-800 z-0 hidden md:block"></div>

            {currentProject.scenes.map((scene, index) => (
                <div key={scene.id} className="relative z-10 flex flex-col md:flex-row gap-4 group">
                    {/* Scene Number / Marker */}
                    <div className="flex-shrink-0 w-12 flex flex-col items-center pt-2 hidden md:flex">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-400 font-bold z-10 group-hover:border-primary-500 group-hover:text-primary-400 transition-colors">
                            {index + 1}
                        </div>
                    </div>

                    {/* Card */}
                    <div className="flex-1 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-lg p-4 transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="md:hidden text-xs font-mono font-bold text-zinc-500">#{index + 1}</span>
                                <h3 className="text-sm font-medium text-zinc-200">{scene.title || 'UNTITLED SCENE'}</h3>
                            </div>
                            <button 
                                onClick={() => { setCurrentSceneId(scene.id); navigateTo('editor'); }}
                                className="text-xs flex items-center gap-1 text-primary-500 hover:text-primary-400 opacity-0 group-hover:opacity-100 transition"
                            >
                                Edit Script <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Summary / Beat */}
                        <div className="mt-2">
                            {editingId === scene.id ? (
                                <div className="space-y-2">
                                    <textarea 
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:border-zinc-700 outline-none resize-none h-24"
                                        value={tempSummary}
                                        onChange={(e) => setTempSummary(e.target.value)}
                                        placeholder="Describe the main conflict and outcome of this scene..."
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setEditingId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
                                        <button onClick={() => handleSaveSummary(scene.id)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1 rounded">Save Beat</button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => handleStartEdit(scene.id, scene.summary || '')}
                                    className="text-sm text-zinc-400 leading-relaxed cursor-pointer hover:text-zinc-300 min-h-[3rem] group/summary"
                                >
                                    {scene.summary ? (
                                        scene.summary
                                    ) : (
                                        <span className="italic text-zinc-600">Click to add scene summary/beats...</span>
                                    )}
                                    <Edit3 className="w-3 h-3 inline ml-2 opacity-0 group-hover/summary:opacity-50" />
                                </div>
                            )}
                        </div>

                        {/* Footer Stats */}
                        <div className="mt-4 pt-3 border-t border-zinc-800/50 flex gap-4 text-xxs text-zinc-600 font-mono">
                            <span className="flex items-center gap-1"><Film className="w-3 h-3" /> {scene.content.length > 50 ? 'Drafted' : 'Empty'}</span>
                            <span>~{Math.ceil(scene.content.length / 1000)} Pages</span>
                        </div>
                    </div>
                </div>
            ))}

            {/* Empty State Add */}
            <div 
                onClick={() => addScene()}
                className="ml-0 md:ml-16 border border-dashed border-zinc-800 rounded-lg p-4 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/30 cursor-pointer transition h-20"
            >
                <span className="text-xs flex items-center gap-2"><Plus className="w-4 h-4" /> Add New Scene</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Outline;