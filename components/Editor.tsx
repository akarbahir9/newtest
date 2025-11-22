
import React, { useState, useEffect, useRef } from 'react';
import { Film, Share2, Sparkles, Zap, LayoutTemplate } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { generateAutocomplete } from '../services/geminiService';

const Editor: React.FC = () => {
  const { currentProject, currentSceneId, navigateTo, updateSceneContent, isRightPanelOpen, setRightPanelOpen } = useProject();
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  
  const scene = currentProject?.scenes.find(s => s.id === currentSceneId);

  useEffect(() => {
    if (editorRef.current && scene) {
        // Sync logic: Only update DOM if content differs significantly to avoid cursor jumps during typing
        // or if the user switched scenes.
        // We assume external updates (like from RightPanel) change length > 5 chars or are identical.
        const currentHTML = editorRef.current.innerHTML;
        if (currentHTML !== scene.content) {
             // Simple heuristic: if difference is large, it's likely an external update (AI insert)
             // If difference is small, it might be local typing latency loop, so we ignore to keep cursor stable.
             // Exception: switching scenes (content changes completely)
             if (Math.abs(currentHTML.length - scene.content.length) > 10 || currentHTML.substring(0, 20) !== scene.content.substring(0, 20)) {
                 editorRef.current.innerHTML = scene.content;
             }
        }
    }
  }, [currentSceneId, scene?.content]);

  const handleInput = () => {
    if (editorRef.current && currentSceneId) {
        updateSceneContent(currentSceneId, editorRef.current.innerHTML);
    }
  };

  const triggerAI = async () => {
    if (!editorRef.current) return;
    setIsLoadingAI(true);
    const textContext = editorRef.current.innerText;
    const genreContext = currentProject?.genres.join(', ') || 'Sci-Fi';
    
    const result = await generateAutocomplete(textContext, genreContext);
    
    if (result) {
        setSuggestionText(result);
        setShowSuggestion(true);
    }
    setIsLoadingAI(false);
  };

  const handleAccept = () => {
      if (editorRef.current) {
          // Default to Action formatting for generic autocomplete
          const html = `<div class="sp-action">${suggestionText}</div>`;
          editorRef.current.innerHTML += html;
          handleInput();
      }
      setShowSuggestion(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Tab') {
          e.preventDefault();
          if (showSuggestion) {
              handleAccept();
          } else {
              triggerAI();
          }
      }
  };

  if (!scene) {
      return (
          <div className="flex items-center justify-center h-full text-zinc-500">
              No scene selected.
          </div>
      );
  }

  return (
    <div className="view-section active flex flex-col h-full bg-zinc-950 relative overflow-hidden flex-1">
      {/* Editor Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm z-10 flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span onClick={() => navigateTo('dashboard')} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition whitespace-nowrap hidden sm:inline">Projects</span>
          <span className="text-zinc-700 text-xs hidden sm:inline">/</span>
          <span className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition whitespace-nowrap hidden md:inline">{currentProject?.title}</span>
          <span className="text-zinc-700 text-xs hidden md:inline">/</span>
          <span className="text-xs font-medium text-zinc-200 flex items-center gap-2 truncate">
            <Film className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            <span className="truncate">Sc {String(scene.number).padStart(3, '0')} - {scene.title}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex bg-zinc-900 p-0.5 rounded-md border border-zinc-800 hidden sm:flex">
            <button className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 text-xs font-medium shadow-sm shadow-black/50">Screenplay</button>
            <button className="px-2.5 py-1 rounded text-zinc-500 hover:text-zinc-300 text-xs font-medium transition">Novel</button>
          </div>
          <div className="h-4 w-px bg-zinc-800 hidden sm:block"></div>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded transition shadow-lg shadow-primary-500/20">
            <Share2 className="w-3 h-3" /> <span className="hidden sm:inline">Share</span>
          </button>
          
          {/* Right Panel Toggle */}
          <button 
            onClick={() => setRightPanelOpen(!isRightPanelOpen)} 
            className={`p-1.5 rounded hover:bg-zinc-800 text-zinc-400 transition ${isRightPanelOpen ? 'text-primary-400 bg-zinc-800' : ''}`}
            title="Toggle Assistant"
          >
            <LayoutTemplate className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Editor Surface */}
      <div className="flex-1 overflow-y-auto relative bg-zinc-925 flex justify-center" id="editor-scroll">
        <div className="w-full max-w-3xl bg-zinc-950 min-h-[120%] my-8 p-8 md:p-12 shadow-2xl border border-zinc-800/50 relative mx-2 md:mx-0">
          {/* Scene Header Stats */}
          <div className="absolute top-4 right-4 text-xxs text-zinc-600 font-mono border border-zinc-800 px-2 py-1 rounded opacity-50 hover:opacity-100 transition cursor-pointer hidden sm:block">
            {Math.ceil(scene.content.length / 1000)} Pgs • {Math.ceil(scene.content.length / 20)}s Est.
          </div>

          {/* Script Content */}
          <div 
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            className="font-screenplay text-[15px] text-zinc-200 leading-relaxed outline-none min-h-[500px]"
            suppressContentEditableWarning={true}
          >
          </div>

            {/* AI Suggestion Block */}
            {(showSuggestion || isLoadingAI) && (
            <div className="mt-2 relative group">
              <div className="absolute -left-6 top-0 text-primary-500 opacity-100 transition">
                <Sparkles className={`w-4 h-4 ${isLoadingAI ? 'animate-spin' : ''}`} />
              </div>
              
              {showSuggestion && (
                  <>
                    <div className="font-screenplay text-[15px] text-primary-300/70 italic mb-2 pl-4 border-l-2 border-primary-500/30">
                        {suggestionText}
                    </div>
                    
                    <div className="absolute left-0 right-0 md:right-auto md:left-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-3 w-full md:w-96 z-20 backdrop-blur-xl bg-zinc-900/90">
                        <div className="flex items-center justify-between mb-2">
                        <span className="text-xxs font-semibold text-primary-400 uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3" /> T_SCENE_AUTOCOMPLETE
                        </span>
                        <span className="text-xxs text-zinc-500 hidden sm:inline">Tab to accept</span>
                        </div>
                        <div className="text-sm text-zinc-300 font-screenplay mb-3">
                            "{suggestionText}"
                        </div>
                        <div className="flex gap-2">
                        <button onClick={triggerAI} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-1 px-2 rounded border border-zinc-700 transition">Generate Alts</button>
                        <button onClick={handleAccept} className="flex-1 bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 text-xs py-1 px-2 rounded border border-primary-500/30 transition">Accept</button>
                        </div>
                    </div>
                  </>
              )}
            </div>
            )}
        </div>
      </div>

      {/* Editor Footer Stats */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-4 text-xxs text-zinc-500 shadow-lg z-20 whitespace-nowrap max-w-[90%] overflow-hidden text-ellipsis">
        <span>{scene.content.split(' ').length} Words</span>
        <span className="w-px h-3 bg-zinc-700 hidden sm:block"></span>
        <span className="flex items-center gap-1 text-emerald-500 hidden sm:flex">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Saved
        </span>
         <span className="w-px h-3 bg-zinc-700 hidden sm:block"></span>
         <span className="text-primary-400 hidden sm:inline">Press TAB for AI</span>
      </div>
    </div>
  );
};

export default Editor;
