
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Film, Share2, Sparkles, Zap, LayoutTemplate } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { generateAutocomplete } from '../services/geminiService';

// A4 Specs
const PAGE_HEIGHT_PX = 1122; // 297mm @ 96dpi
const CONTENT_HEIGHT_PX = 960; // Approximate safe height before overflow check

const Editor: React.FC = () => {
  const { currentProject, currentSceneId, navigateTo, updateSceneContent, isRightPanelOpen, setRightPanelOpen } = useProject();
  const [pages, setPages] = useState<string[]>(['']);
  const [activePageIndex, setActivePageIndex] = useState(0);
  
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scene = currentProject?.scenes.find(s => s.id === currentSceneId);

  // --- Initialization & Sync ---
  useEffect(() => {
    if (scene) {
        // Initial Load: Parse content into pages if it's formatted as such, 
        // or load as one big block and let pagination happen naturally.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scene.content;
        
        // Check if we have existing page structure (custom data attribute or class)
        // For now, we treat the database content as one stream. 
        // In a more advanced version, we would serialize the page breaks.
        // Here, we just load it into Page 1 and let overflow logic handle it if user types.
        
        // Optimization: If local state matches scene content (joined), don't reset to avoid cursor loss
        const currentJoined = pages.join('');
        // Basic check to prevent loop, though incomplete for multi-page exactness
        if (Math.abs(currentJoined.length - scene.content.length) > 20) {
             setPages([scene.content]); 
        }
    }
  }, [currentSceneId]); // Only reset on scene switch

  // --- Sync to Global State ---
  const syncToGlobal = (newPages: string[]) => {
      // We assume simple concatenation for storage. 
      // Ideally, you'd store an array or JSON structure.
      updateSceneContent(currentSceneId!, newPages.join(''));
  };

  // --- Input Handling ---
  const handlePageInput = (index: number, e: React.FormEvent<HTMLDivElement>) => {
      const newContent = e.currentTarget.innerHTML;
      const newPages = [...pages];
      newPages[index] = newContent;
      setPages(newPages);
      setActivePageIndex(index);
      syncToGlobal(newPages);
      
      // Check Overflow
      checkOverflow(index);
  };

  const checkOverflow = (index: number) => {
      const pageEl = pageRefs.current[index];
      if (!pageEl) return;

      if (pageEl.scrollHeight > PAGE_HEIGHT_PX) {
          // Logic: Move last block node to next page
          // This is a simplified "Word Wrap" for DOM nodes
          const children = Array.from(pageEl.children);
          if (children.length > 1) {
              const lastChild = children[children.length - 1] as HTMLElement;
              const lastChildHTML = lastChild.outerHTML;
              
              // Remove from current
              lastChild.remove();
              const updatedCurrentPage = pageEl.innerHTML;
              
              // Add to next
              const newPages = [...pages];
              newPages[index] = updatedCurrentPage;
              
              if (index + 1 < newPages.length) {
                  newPages[index + 1] = lastChildHTML + newPages[index + 1];
              } else {
                  newPages.push(lastChildHTML);
              }
              
              setPages(newPages);
              syncToGlobal(newPages);
              
              // Note: This causes a re-render which might lose focus if not handled carefully.
              // For this demo, we accept slight focus interrupt on page break creation.
          }
      }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Tab') {
          e.preventDefault();
          if (showSuggestion) handleAccept();
          else triggerAI(index);
      }
      
      // Backspace at start of page -> Move to previous
      if (e.key === 'Backspace') {
          const selection = window.getSelection();
          if (selection && selection.anchorOffset === 0 && index > 0) {
               // Check if we are truly at start
               // Simplified: Just focus previous page end
               e.preventDefault();
               const prevPage = pageRefs.current[index - 1];
               if (prevPage) {
                   prevPage.focus();
                   // Move cursor to end
                   const range = document.createRange();
                   range.selectNodeContents(prevPage);
                   range.collapse(false);
                   selection.removeAllRanges();
                   selection.addRange(range);
               }
          }
      }
      
      // Arrow Down at end of page -> Move to next
      if (e.key === 'ArrowDown') {
          // Simplified check
          const pageEl = pageRefs.current[index];
          if(pageEl) {
              // If near bottom? (Complex to detect exact cursor Y vs height)
              // For now, standard behavior usually works unless we want to force jump
          }
      }
  };
  
  // --- AI Features ---
  const triggerAI = async (index: number) => {
    const pageEl = pageRefs.current[index];
    if (!pageEl) return;
    
    setIsLoadingAI(true);
    const textContext = pageEl.innerText;
    const genreContext = currentProject?.genres.join(', ') || 'Sci-Fi';
    
    const result = await generateAutocomplete(textContext, genreContext);
    
    if (result) {
        setSuggestionText(result);
        setShowSuggestion(true);
    }
    setIsLoadingAI(false);
  };

  const handleAccept = () => {
      const index = activePageIndex;
      const pageEl = pageRefs.current[index];
      if (pageEl) {
          const html = `<div class="sp-action">${suggestionText}</div>`;
          // Insert at cursor would be better, but append is safe for MVP
          pageEl.innerHTML += html;
          
          const newPages = [...pages];
          newPages[index] = pageEl.innerHTML;
          setPages(newPages);
          syncToGlobal(newPages);
          
          checkOverflow(index);
      }
      setShowSuggestion(false);
  };

  if (!scene) {
      return <div className="flex items-center justify-center h-full text-zinc-500 bg-[#f5f5f5]">No scene selected.</div>;
  }

  return (
    <div className="view-section active flex flex-col h-full bg-[#f5f5f5] relative overflow-hidden flex-1">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-zinc-200 bg-white z-10 flex-shrink-0 gap-2 shadow-sm">
        <div className="flex items-center gap-2 overflow-hidden">
          <span onClick={() => navigateTo('dashboard')} className="text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer transition whitespace-nowrap hidden sm:inline">Projects</span>
          <span className="text-zinc-400 text-xs hidden sm:inline">/</span>
          <span className="text-xs font-medium text-zinc-800 flex items-center gap-2 truncate">
            <Film className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            <span className="truncate">Sc {String(scene.number).padStart(3, '0')} - {scene.title}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
             <div className="flex bg-zinc-100 p-0.5 rounded-md border border-zinc-200 hidden sm:flex">
                <button className="px-2.5 py-1 rounded bg-white text-zinc-900 text-xs font-medium shadow-sm border border-zinc-200">Screenplay</button>
            </div>
            <button onClick={() => setRightPanelOpen(!isRightPanelOpen)} className={`p-1.5 rounded hover:bg-zinc-200 text-zinc-500 transition ${isRightPanelOpen ? 'text-primary-600 bg-zinc-100' : ''}`}>
                <LayoutTemplate className="w-4 h-4" />
            </button>
        </div>
      </header>

      {/* Multi-Page Editor Container */}
      <div className="flex-1 overflow-y-auto relative flex flex-col items-center py-8 gap-6" id="editor-scroll">
        
        {pages.map((pageContent, i) => (
            <div 
                key={i}
                className="relative group"
                style={{ width: '210mm', minHeight: '297mm' }}
            >
                {/* Page Number Watermark */}
                <div className="absolute -right-12 top-0 text-xs text-zinc-300 font-mono hidden xl:block">
                    Page {i + 1}
                </div>

                {/* The Page Itself */}
                <div
                    ref={el => pageRefs.current[i] = el}
                    contentEditable
                    suppressContentEditableWarning
                    className="page-surface bg-white shadow-sm hover:shadow-md transition-shadow font-screenplay text-[15px] leading-relaxed outline-none text-zinc-900"
                    style={{
                        width: '100%',
                        height: '100%', // Fill the container
                        minHeight: '297mm',
                        padding: '25mm 20mm 20mm 20mm', // Top margin slightly larger
                        boxSizing: 'border-box',
                        overflow: 'hidden' // Text that overflows is hidden until moved
                    }}
                    onInput={(e) => handlePageInput(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={() => setActivePageIndex(i)}
                    dangerouslySetInnerHTML={{ __html: pageContent }}
                />
            </div>
        ))}
        
        {/* Bottom Padding for scroll */}
        <div className="h-20 flex-shrink-0 w-full"></div>

        {/* AI Suggestion Overlay (Positioned relative to active page) */}
        {(showSuggestion || isLoadingAI) && activePageIndex !== null && pageRefs.current[activePageIndex] && (
             <div 
                className="fixed z-50"
                style={{ 
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                }}
            >
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 w-96 backdrop-blur-xl bg-zinc-900/95 text-left animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-2 mb-2 text-primary-400">
                        <Sparkles className={`w-4 h-4 ${isLoadingAI ? 'animate-spin' : ''}`} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Zoer Suggestion</span>
                    </div>
                    {isLoadingAI ? (
                        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse"></div>
                    ) : (
                        <>
                            <div className="text-sm text-zinc-200 font-screenplay mb-4 border-l-2 border-primary-500 pl-3 py-1 italic">
                                "{suggestionText}"
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleAccept} className="flex-1 bg-primary-600 hover:bg-primary-500 text-white text-xs py-1.5 rounded font-medium transition">Accept (Tab)</button>
                                <button onClick={() => setShowSuggestion(false)} className="px-3 py-1.5 hover:bg-zinc-800 text-zinc-400 text-xs rounded transition">Dismiss</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

      </div>

      <style>{`
        .page-surface {
            font-family: 'Courier Prime', 'Courier New', monospace; 
        }
        /* Print-like styling for Screenplay elements inside white pages */
        .page-surface .sp-slug { color: #000; font-weight: bold; text-decoration: underline; margin-top: 1.5rem; }
        .page-surface .sp-action { color: #000; margin-bottom: 1rem; }
        .page-surface .sp-character { color: #000; margin-top: 1rem; text-align: center; }
        .page-surface .sp-dialogue { color: #000; margin-bottom: 1rem; text-align: center; width: 75%; margin-left: auto; margin-right: auto; }
        .page-surface .sp-parenthetical { color: #000; text-align: center; margin-bottom: 0; }
        .page-surface .sp-transition { color: #000; text-align: right; margin-right: 1rem; }
      `}</style>
    </div>
  );
};

export default Editor;
