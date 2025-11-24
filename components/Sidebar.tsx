

import React, { useState } from 'react';
import { 
  ChevronsUpDown, LayoutDashboard, Search, Inbox, Plus, 
  FolderOpen, Book, Users, MapPin, Settings, X, Tv, Trash2, PanelRight, Wifi, WifiOff
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { ViewType } from '../types';

const Sidebar: React.FC = () => {
  const { 
    currentView, navigateTo, projects, currentProject, 
    setCurrentProject, setCurrentSceneId, currentSceneId, addScene, deleteScene, showConfirmation,
    isSidebarOpen, setSidebarOpen, addEpisode, isOffline
  } = useProject();
  
  const [isProjectOpen, setIsProjectOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});

  const toggleEpisode = (epId: string) => {
      setExpandedEpisodes(prev => ({...prev, [epId]: !prev[epId]}));
  };

  const getItemClass = (view: ViewType) => {
    const common = "sidebar-item flex flex-row items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition cursor-pointer whitespace-nowrap overflow-hidden w-full flex-nowrap";
    return currentView === view 
        ? `${common} bg-zinc-800/50 text-zinc-100` 
        : `${common} text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30`;
  };

  const isNovel = currentProject?.type === 'Novel';
  const isSerial = currentProject?.type === 'Serial';

  const handleDeleteScene = (e: React.MouseEvent, sceneId: string, sceneTitle: string) => {
      e.stopPropagation();
      showConfirmation(`دڵنیایت لە سڕینەوەی "${sceneTitle || 'بێ ناونیشان'}"؟`, () => {
          deleteScene(sceneId);
      });
  };

  return (
    <aside 
        className={`
            fixed inset-y-0 right-0 z-[70] h-full
            bg-zinc-925
            transition-all duration-300 ease-in-out flex-shrink-0
            md:relative md:translate-x-0 md:w-64 md:border-l md:border-zinc-800/60
            ${isSidebarOpen 
                ? 'translate-x-0 w-64 border-l border-zinc-800/60' 
                : 'translate-x-full'}
        `}
        style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)'
        }}
    >
      <div className={`flex flex-col h-full w-64 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
        {/* Brand & Project Switcher */}
        <div className="relative flex-shrink-0"> 
            <div 
                className="h-12 flex items-center px-4 border-b border-zinc-800/60 justify-between" 
            >
                <div 
                    className="flex items-center gap-2 text-zinc-100 font-semibold tracking-tight truncate flex-1 min-w-0 cursor-pointer hover:text-white"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    <div className="w-5 h-5 bg-zinc-100 rounded-sm flex items-center justify-center text-zinc-950 text-xs font-bold shrink-0">Z</div>
                    <span className="truncate">{currentProject?.title || 'پڕۆژە هەڵبژێرە'}</span>
                    <ChevronsUpDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                </div>
            </div>
            
            {/* Dropdown Logic remains same */}
            {isDropdownOpen && (
                <div className="absolute top-full right-0 w-full bg-zinc-900 border border-zinc-800 shadow-xl rounded-b-md py-1 z-50">
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
                            + پڕۆژەی نوێ
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Primary Nav */}
        <div className="px-2 py-3 space-y-0.5 flex-shrink-0">
            <div onClick={() => navigateTo('dashboard')} className={getItemClass('dashboard')}>
                <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" /> 
                <span className="truncate">داشبۆرد</span>
            </div>
            <div onClick={() => navigateTo('search')} className={getItemClass('search')}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" /> 
                <span className="truncate">گەڕان</span>
            </div>
            <div onClick={() => navigateTo('inbox')} className={getItemClass('inbox')}>
                <Inbox className="w-3.5 h-3.5 flex-shrink-0" /> 
                <span className="truncate">نامەدان</span>
                <span className="mr-auto bg-primary-600 text-white text-[9px] px-1.5 rounded-full flex-shrink-0">3</span>
            </div>
        </div>

        {/* Project Tree */}
        {currentProject && (
            <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
                <div className="text-xxs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2 flex justify-between items-center group">
                پێکهاتەی پڕۆژە
                {isSerial ? (
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addEpisode(); }} 
                        className="bg-transparent p-0 border-none cursor-pointer opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition text-inherit flex items-center" 
                        title="زیادکردنی ئەڵقە"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                ) : (
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addScene(); }} 
                        className="bg-transparent p-0 border-none cursor-pointer opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition text-inherit flex items-center" 
                        title={isNovel ? "زیادکردنی بەش" : "زیادکردنی دیمەن"}
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                )}
                </div>
                
                <div className="group">
                <div onClick={() => setIsProjectOpen(!isProjectOpen)} className="flex items-center gap-2 px-2 py-1.5 text-zinc-200 rounded text-xs font-medium cursor-pointer hover:bg-zinc-800/30 whitespace-nowrap">
                    <FolderOpen className={`w-3.5 h-3.5 text-primary-500 transition-transform flex-shrink-0 ${isProjectOpen ? 'rotate-90' : ''}`} /> 
                    <span className="truncate">{currentProject.title}</span>
                </div>
                
                {isProjectOpen && (
                    <div className="pr-4 mt-1 space-y-0.5 border-r border-zinc-800 mr-3.5 transition-all overflow-hidden">
                    <div onClick={() => navigateTo('outline')} className={getItemClass('outline')}>
                        <Book className="w-3 h-3 flex-shrink-0" /> <span className="truncate">پوختە</span>
                    </div>
                    <div onClick={() => navigateTo('characters')} className={getItemClass('characters')}>
                        <Users className="w-3 h-3 flex-shrink-0" /> <span className="truncate">کاراکتەرەکان</span>
                    </div>
                    <div onClick={() => navigateTo('locations')} className={getItemClass('locations')}>
                        <MapPin className="w-3 h-3 flex-shrink-0" /> <span className="truncate">شوێنەکان</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-zinc-800/50">
                        {isSerial ? (
                            <div>
                                {currentProject.episodes?.map(ep => {
                                    const epScenes = currentProject.scenes.filter(s => s.episodeId === ep.id);
                                    const isExpanded = expandedEpisodes[ep.id] !== false; 
                                    return (
                                        <div key={ep.id} className="mb-1">
                                            <div className="flex items-center justify-between px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 rounded cursor-pointer group/ep" onClick={() => toggleEpisode(ep.id)}>
                                                <div className="flex items-center gap-1 overflow-hidden">
                                                    <Tv className="w-3 h-3 flex-shrink-0" />
                                                    <span className="text-xs truncate">{ep.title}</span>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); addScene(ep.id); }} className="opacity-0 group-hover/ep:opacity-100 hover:text-zinc-100"><Plus className="w-3 h-3" /></button>
                                            </div>
                                            {isExpanded && (
                                                <div className="pr-3 mt-0.5 space-y-0.5 border-r border-zinc-800 mr-1.5">
                                                    {epScenes.map(scene => (
                                                        <div 
                                                            key={scene.id}
                                                            onClick={() => { setCurrentSceneId(scene.id); navigateTo('editor'); }}
                                                            className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] cursor-pointer w-full group/scene ${currentSceneId === scene.id ? 'bg-zinc-800/50 text-primary-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                                                        >
                                                            <span className="w-4 text-center text-[9px] font-mono opacity-50 flex-shrink-0">{scene.number}</span>
                                                            <span className="truncate flex-1 text-right">{scene.title}</span>
                                                            <button onClick={(e) => handleDeleteScene(e, scene.id, scene.title)} className="opacity-0 group-hover/scene:opacity-100 hover:text-red-400 p-0.5"><Trash2 className="w-2.5 h-2.5" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div>
                                {currentProject.scenes.map(scene => (
                                    <div 
                                        key={scene.id}
                                        onClick={() => { setCurrentSceneId(scene.id); navigateTo('editor'); }}
                                        className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] cursor-pointer w-full group/scene ${currentSceneId === scene.id ? 'bg-zinc-800/50 text-primary-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                                    >
                                        <span className="w-4 text-center text-[9px] font-mono opacity-50 flex-shrink-0">{scene.number}</span>
                                        <span className="truncate flex-1 text-right">{scene.title || 'بێ ناونیشان'}</span>
                                        <button onClick={(e) => handleDeleteScene(e, scene.id, scene.title)} className="opacity-0 group-hover/scene:opacity-100 hover:text-red-400 p-0.5"><Trash2 className="w-2.5 h-2.5" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    </div>
                )}
                </div>
            </div>
        )}

        <div className="p-2 mt-auto border-t border-zinc-800 flex-shrink-0">
            <div onClick={() => navigateTo('settings')} className={getItemClass('settings')}>
            <Settings className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">ڕێکخستنەکان</span>
            <div className={`mr-auto w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500'}`} title={isOffline ? 'Offline' : 'Connected'}></div>
            </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;