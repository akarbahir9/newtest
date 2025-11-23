import React, { useState } from 'react';
import { 
  ChevronsUpDown, LayoutDashboard, Search, Inbox, Plus, 
  FolderOpen, Book, Users, MapPin, Settings, FilePlus, X, Tv, ChevronDown, ChevronRight, Trash2
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { ViewType } from '../types';

const Sidebar: React.FC = () => {
  const { 
    currentView, navigateTo, projects, currentProject, 
    setCurrentProject, setCurrentSceneId, currentSceneId, addScene, deleteScene, showConfirmation,
    isSidebarOpen, setSidebarOpen, addEpisode
  } = useProject();
  
  const [isProjectOpen, setIsProjectOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});

  const toggleEpisode = (epId: string) => {
      setExpandedEpisodes(prev => ({...prev, [epId]: !prev[epId]}));
  };

  const getItemClass = (view: ViewType) => {
    const base = "sidebar-item flex items-center gap-2 px-2 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 rounded text-xs font-medium transition cursor-pointer";
    return currentView === view ? "bg-zinc-800/50 text-zinc-100" : base;
  };

  const isNovel = currentProject?.type === 'Novel';
  const isSerial = currentProject?.type === 'Serial';

  const handleDeleteScene = (e: React.MouseEvent, sceneId: string, sceneTitle: string) => {
      e.stopPropagation();
      showConfirmation(`Are you sure you want to delete "${sceneTitle || 'Untitled'}"?`, () => {
          deleteScene(sceneId);
      });
  };

  return (
    <aside 
        className={`
            fixed md:relative inset-y-0 left-0 z-50 w-64 
            border-r border-zinc-800/60 bg-zinc-925 flex flex-col h-full 
            transition-transform duration-300 ease-in-out flex-shrink-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
    >
      {/* Brand & Project Switcher */}
      <div className="relative">
        <div 
            className="h-12 flex items-center px-4 border-b border-zinc-800/60 justify-between cursor-pointer hover:bg-zinc-900/50" 
        >
            <div 
                className="flex items-center gap-2 text-zinc-100 font-semibold tracking-tight truncate flex-1 min-w-0"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
                <div className="w-5 h-5 bg-zinc-100 rounded-sm flex items-center justify-center text-zinc-950 text-xs font-bold shrink-0">Z</div>
                <span className="truncate">{currentProject?.title || 'Select Project'}</span>
                <ChevronsUpDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            </div>
            
            <button 
                className="md:hidden text-zinc-500 hover:text-zinc-200 ml-2"
                onClick={() => setSidebarOpen(false)}
            >
                <X className="w-5 h-5" />
            </button>
        </div>
        
        {isDropdownOpen && (
            <div className="absolute top-full left-0 w-full bg-zinc-900 border border-zinc-800 shadow-xl rounded-b-md py-1 z-50">
                {projects.map(p => (
                    <div 
                        key={p.id}
                        onClick={() => { setCurrentProject(p.id); setIsDropdownOpen(false); }}
                        className="px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                    >
                        {p.title}
                        {p.id === currentProject?.id && <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>}
                    </div>
                ))}
                <div className="border-t border-zinc-800 mt-1 pt-1">
                     <div onClick={() => { navigateTo('dashboard'); setIsDropdownOpen(false); }} className="px-4 py-2 text-xs text-primary-400 hover:bg-zinc-800 cursor-pointer font-medium">
                         + New Project
                     </div>
                </div>
            </div>
        )}
      </div>

      {/* Primary Nav */}
      <div className="px-2 py-3 space-y-0.5">
        <div onClick={() => navigateTo('dashboard')} className={getItemClass('dashboard')}>
          <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
        </div>
        <div onClick={() => navigateTo('search')} className={getItemClass('search')}>
          <Search className="w-3.5 h-3.5" /> Search
        </div>
        <div onClick={() => navigateTo('inbox')} className={getItemClass('inbox')}>
          <Inbox className="w-3.5 h-3.5" /> Inbox 
          <span className="ml-auto bg-primary-600 text-white text-[9px] px-1.5 rounded-full">3</span>
        </div>
      </div>

      {/* Project Tree */}
      {currentProject && (
        <div className="flex-1 overflow-y-auto py-2 px-2">
            <div className="text-xxs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2 flex justify-between items-center group">
            Project Structure
            {isSerial ? (
                <Plus onClick={(e) => { e.stopPropagation(); addEpisode(); }} className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition" title="Add Episode" />
            ) : (
                <Plus 
                    onClick={(e) => { e.stopPropagation(); addScene(); }} 
                    className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition" 
                    title={isNovel ? "Add Chapter" : "Add Scene"}
                />
            )}
            </div>
            
            <div className="group">
            <div onClick={() => setIsProjectOpen(!isProjectOpen)} className="flex items-center gap-2 px-2 py-1.5 text-zinc-200 rounded text-xs font-medium cursor-pointer hover:bg-zinc-800/30">
                <FolderOpen className={`w-3.5 h-3.5 text-primary-500 transition-transform ${isProjectOpen ? 'rotate-90' : ''}`} /> 
                {currentProject.title}
            </div>
            
            {isProjectOpen && (
                <div className="pl-4 mt-1 space-y-0.5 border-l border-zinc-800 ml-3.5 transition-all overflow-hidden">
                <div onClick={() => navigateTo('outline')} className={getItemClass('outline')}>
                    <Book className="w-3 h-3" /> Outline
                </div>
                <div onClick={() => navigateTo('characters')} className={getItemClass('characters')}>
                    <Users className="w-3 h-3" /> Characters
                </div>
                <div onClick={() => navigateTo('locations')} className={getItemClass('locations')}>
                    <MapPin className="w-3 h-3" /> Locations
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-800/50">
                    {isSerial ? (
                        <div>
                            {currentProject.episodes?.map(ep => {
                                const epScenes = currentProject.scenes.filter(s => s.episodeId === ep.id);
                                const isExpanded = expandedEpisodes[ep.id] !== false; 
                                return (
                                    <div key={ep.id} className="mb-1">
                                        <div className="flex items-center justify-between px-2 py-1 text-zinc-400 hover:bg-zinc-800/20 rounded cursor-pointer group/ep" onClick={() => toggleEpisode(ep.id)}>
                                            <div className="flex items-center gap-1.5 text-xs overflow-hidden">
                                                <Tv className="w-3 h-3 text-zinc-600" />
                                                <span className="truncate font-medium text-zinc-300">{ep.title}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <Plus onClick={(e) => { e.stopPropagation(); addScene(ep.id); if (!isExpanded) toggleEpisode(ep.id); }} className="w-3 h-3 mr-1 opacity-0 group-hover/ep:opacity-100 hover:text-white" title="Add Scene to Ep" />
                                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="pl-3 border-l border-zinc-800/50 ml-2 mt-0.5 space-y-0.5">
                                                {epScenes.map(scene => (
                                                    <div key={scene.id} onClick={() => { navigateTo('editor'); setCurrentSceneId(scene.id); }} className={`group/scene flex items-center justify-between gap-2 px-2 py-1 rounded text-xs cursor-pointer ${currentSceneId === scene.id ? 'text-zinc-100 bg-zinc-800/40' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                                        <span className="truncate">{scene.title || 'Untitled Scene'}</span>
                                                        <Trash2 onClick={(e) => handleDeleteScene(e, scene.id, scene.title)} className="w-3 h-3 text-zinc-600 hover:text-red-500 opacity-0 group-hover/scene:opacity-100 flex-shrink-0" />
                                                    </div>
                                                ))}
                                                {epScenes.length === 0 && <div className="text-[10px] text-zinc-600 px-2 italic">No scenes</div>}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <>
                            <div className="px-2 text-xxs text-zinc-600 mb-1 flex justify-between">
                                {isNovel ? 'CHAPTERS' : 'SCENES'}
                                <FilePlus className="w-3 h-3 cursor-pointer hover:text-primary-400" onClick={(e) => { e.stopPropagation(); addScene(); }} />
                            </div>
                            {currentProject.scenes.map((scene) => (
                                <div key={scene.id} onClick={() => { navigateTo('editor'); setCurrentSceneId(scene.id); }} className={`group/scene flex items-center justify-between gap-2 px-2 py-1 rounded text-xs cursor-pointer ${currentSceneId === scene.id && currentView === 'editor' ? 'text-zinc-100 bg-zinc-800/40' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20'}`}>
                                    <div className="flex items-center gap-2 truncate">
                                      <span className={`font-mono text-xxs w-4 ${currentSceneId === scene.id ? 'text-primary-500' : 'text-zinc-600'}`}>{String(scene.number).padStart(3, '0')}</span> 
                                      <span className="truncate">{scene.title || 'UNTITLED'}</span>
                                    </div>
                                    <Trash2 onClick={(e) => handleDeleteScene(e, scene.id, scene.title)} className="w-3 h-3 text-zinc-600 hover:text-red-500 opacity-0 group-hover/scene:opacity-100 flex-shrink-0" />
                                </div>
                            ))}
                        </>
                    )}
                </div>
                </div>
            )}
            </div>
        </div>
      )}

      {/* Bottom: Usage & Profile */}
      <div className="p-3 border-t border-zinc-800/60 bg-zinc-950/30">
        <div onClick={() => navigateTo('settings')} className="flex items-center gap-2 cursor-pointer group">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-xxs text-white border border-zinc-600">EL</div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-200 font-medium group-hover:text-white">Elena R.</span>
            <span className="text-xxs text-zinc-500">Pro Plan</span>
          </div>
          <Settings className="w-3.5 h-3.5 ml-auto text-zinc-500 hover:text-zinc-300" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
