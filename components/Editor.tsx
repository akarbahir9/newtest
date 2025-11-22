
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Film, Sparkles, Zap, LayoutTemplate } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { generateAutocomplete } from '../services/geminiService';

// A4 Specs
const MARGIN_BOTTOM_PX = 96; // ~25mm

// --- Helper: Find split point ---
const findBinarySplitIndex = (textNode: Node, bottomLimit: number): number => {
    const text = textNode.textContent || '';
    if (text.length === 0) return 0;
    let low = 0;
    let high = text.length;
    let bestFitIndex = text.length;
    const range = document.createRange();
    
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (mid === 0) { low = 1; continue; }
        try {
            range.setStart(textNode, 0);
            range.setEnd(textNode, mid);
            const rect = range.getBoundingClientRect();
            if (rect.bottom <= bottomLimit) {
                bestFitIndex = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        } catch (e) { break; }
    }
    return bestFitIndex;
};

// --- Sub-Component: Single Page ---
interface PageProps {
    id: string;
    index: number;
    initialContent: string;
    onUpdate: (id: string, content: string) => void;
    onSplit: (id: string, trimmedContent: string, overflowContent: string) => void;
    onUnderflow: (id: string) => void;
    focusRequest?: { mode: 'start' | 'end' } | null;
    isNovelMode: boolean; // Prop for mode
}

const Page = React.memo(({ id, index, initialContent, onUpdate, onSplit, onUnderflow, focusRequest, isNovelMode }: PageProps) => {
    const pageRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);

    // Define checkOverflow with useCallback so it can be used in effects
    const checkOverflow = useCallback(() => {
        if (!pageRef.current) return false;
        const pageRect = pageRef.current.getBoundingClientRect();
        const bottomLimit = pageRect.bottom - MARGIN_BOTTOM_PX; 
        const nodes: Node[] = Array.from(pageRef.current.childNodes);
        
        let splitNodeIndex = -1;
        let isPartialOverflow = false;

        // 1. Detect Overflow
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            let nodeBottom = 0;
            let nodeTop = 0;

            if (node.nodeType === Node.ELEMENT_NODE) {
                const rect = (node as HTMLElement).getBoundingClientRect();
                nodeBottom = rect.bottom;
                nodeTop = rect.top;
            } else if (node.nodeType === Node.TEXT_NODE) {
                const range = document.createRange();
                range.selectNodeContents(node);
                const rect = range.getBoundingClientRect();
                nodeBottom = rect.bottom;
                nodeTop = rect.top;
            }

            if (nodeTop > bottomLimit) {
                splitNodeIndex = i;
                break;
            }
            if (nodeBottom > bottomLimit) {
                splitNodeIndex = i;
                isPartialOverflow = true;
                break;
            }
        }

        if (splitNodeIndex === -1) return false;

        // 2. Calculate Split Content
        let overflowHTML = '';
        let trimmedHTML = '';
        
        for(let i=0; i<splitNodeIndex; i++) {
            const node = nodes[i];
            trimmedHTML += node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement).outerHTML : (node.textContent || '');
        }

        let nodesToRemove: Node[] = [];

        if (isPartialOverflow) {
            const splitNode = nodes[splitNodeIndex];
            if (splitNode.nodeType === Node.TEXT_NODE) {
                 const splitPoint = findBinarySplitIndex(splitNode, bottomLimit);
                 const fullText = splitNode.textContent || '';
                 
                 // Prevent splitting if it results in empty predecessor (unless it's the only node)
                 if (splitNodeIndex === 0 && splitPoint === 0) return false;

                 if (splitPoint > 0 && splitPoint < fullText.length) {
                     trimmedHTML += fullText.substring(0, splitPoint);
                     overflowHTML += isNovelMode ? `<p>${fullText.substring(splitPoint)}</p>` : `<div class="sp-action">${fullText.substring(splitPoint)}</div>`;
                     nodesToRemove = nodes.slice(splitNodeIndex + 1);
                 } else {
                     nodesToRemove = nodes.slice(splitNodeIndex);
                 }
            } else if (splitNode.nodeType === Node.ELEMENT_NODE) {
                const el = splitNode as HTMLElement;
                if (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE) {
                    const textNode = el.firstChild;
                    const splitPoint = findBinarySplitIndex(textNode, bottomLimit);
                    const fullText = textNode.textContent || '';
                    
                    if (splitNodeIndex === 0 && splitPoint === 0) return false;

                    if (splitPoint > 0 && splitPoint < fullText.length) {
                        const tagName = el.tagName.toLowerCase();
                        const className = el.className;
                        trimmedHTML += `<${tagName} class="${className}">${fullText.substring(0, splitPoint)}</${tagName}>`;
                        overflowHTML += `<${tagName} class="${className}">${fullText.substring(splitPoint)}</${tagName}>`;
                        nodesToRemove = nodes.slice(splitNodeIndex + 1);
                    } else {
                        nodesToRemove = nodes.slice(splitNodeIndex);
                    }
                } else {
                    nodesToRemove = nodes.slice(splitNodeIndex);
                }
            }
        } else {
            nodesToRemove = nodes.slice(splitNodeIndex);
        }

        if (nodesToRemove.length > 0) {
             overflowHTML += nodesToRemove.map(node => {
                 return node.nodeType === Node.ELEMENT_NODE 
                    ? (node as HTMLElement).outerHTML 
                    : (isNovelMode ? `<p>${node.textContent}</p>` : `<div class="sp-action">${node.textContent}</div>`);
             }).join('');
             
             nodesToRemove.forEach(node => node.parentNode?.removeChild(node));
        }

        if (overflowHTML) {
            onSplit(id, trimmedHTML || pageRef.current.innerHTML, overflowHTML);
            return true;
        }
        return false;
    }, [id, onSplit, isNovelMode]);

    // Sync Content & Check Overflow (Externally Triggered)
    useLayoutEffect(() => {
        if (pageRef.current) {
            if (isInternalUpdate.current) {
                isInternalUpdate.current = false;
                return;
            }

            const currentLen = pageRef.current.innerHTML.length;
            const newLen = initialContent.length;
            
            // Update DOM if external content changed
            if (Math.abs(currentLen - newLen) > 0) {
                 pageRef.current.innerHTML = initialContent;
                 
                 // Check for overflow after external update (e.g. AI insert or Paste)
                 requestAnimationFrame(() => {
                     checkOverflow();
                 });
            }
        }
    }, [initialContent, checkOverflow]);

    // Handle Focus
    useEffect(() => {
        if (focusRequest && pageRef.current) {
            const sel = window.getSelection();
            const range = document.createRange();
            
            if (focusRequest.mode === 'start') {
                let target: Node = pageRef.current;
                if (pageRef.current.firstChild) target = pageRef.current.firstChild;
                range.setStart(target, 0);
                range.collapse(true);
            } else {
                range.selectNodeContents(pageRef.current);
                range.collapse(false);
            }
            
            sel?.removeAllRanges();
            sel?.addRange(range);
            pageRef.current.focus();
            
            // Scroll to the top of this page to ensure user knows they moved DOWN to a new page
            pageRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, [focusRequest]);

    const handleInput = () => {
        if (!pageRef.current) return;
        isInternalUpdate.current = true;
        
        const didSplit = checkOverflow();
        
        if (!didSplit) {
             onUpdate(id, pageRef.current.innerHTML);
             if (pageRef.current.scrollHeight > pageRef.current.clientHeight) {
                 checkOverflow();
             }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace') {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && sel.getRangeAt(0).collapsed) {
                if (sel.anchorOffset === 0 && index > 0) {
                    if (pageRef.current?.innerText.trim() === '' || (sel.anchorNode === pageRef.current)) {
                        e.preventDefault();
                        onUnderflow(id);
                    }
                }
            }
        }
        if (e.key === 'Enter') {
            // Allow Enter to register, then check for overflow immediately
            requestAnimationFrame(() => handleInput());
        }
    };

    return (
        <div className="relative group mb-8 flex-shrink-0 flex flex-col items-center">
             <div className="absolute -right-12 top-0 text-xs text-zinc-600 font-mono hidden xl:block">
                Page {index + 1}
            </div>
            <div 
                ref={pageRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                className={`page-surface bg-zinc-900 border border-zinc-800 shadow-2xl text-[15px] leading-relaxed outline-none text-zinc-300 ${isNovelMode ? 'font-serif novel-mode' : 'font-screenplay screenplay-mode'}`}
                style={{
                    width: '210mm',
                    height: '297mm',
                    padding: '25mm 20mm 20mm 20mm', 
                    boxSizing: 'border-box',
                    overflow: 'hidden', 
                    position: 'relative'
                }}
            />
        </div>
    );
});

const Editor: React.FC = () => {
  const { currentProject, currentSceneId, navigateTo, updateSceneContent, isRightPanelOpen, setRightPanelOpen } = useProject();
  
  const [pages, setPages] = useState<{id: string, content: string}[]>([{id: 'init', content: ''}]);
  const [focusTarget, setFocusTarget] = useState<{ id: string, mode: 'start' | 'end' } | null>(null);

  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  const scene = currentProject?.scenes.find(s => s.id === currentSceneId);
  const isNovelMode = currentProject?.type === 'Novel';

  // --- Sync Logic: Handles both scene switching and external updates (Insert AI) ---
  useEffect(() => {
      if (!scene) return;

      const localContent = pages.map(p => p.content).join('');
      const remoteContent = scene.content;

      // 1. Scene Switch / Fresh Load
      if (pages.length === 1 && pages[0].content === '' && remoteContent !== '') {
           setPages([{ id: Date.now().toString(), content: remoteContent }]);
           return;
      }

      // 2. Check for Append (AI Insertion)
      if (remoteContent.length > localContent.length + 5) {
          const lengthDiff = remoteContent.length - localContent.length;
          const newPart = remoteContent.slice(-lengthDiff);
          
          setPages(prev => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              next[lastIndex] = { 
                  ...next[lastIndex], 
                  content: next[lastIndex].content + newPart 
              };
              return next;
          });
          return;
      }

      // 3. Fallback: Drastic Change
      if (Math.abs(remoteContent.length - localContent.length) > 20) {
           setPages([{ id: Date.now().toString(), content: remoteContent }]);
      }

  }, [currentSceneId, scene?.content]); 

  const syncToGlobal = (newPages: {id: string, content: string}[]) => {
      updateSceneContent(currentSceneId!, newPages.map(p => p.content).join(''));
  };

  const handlePageUpdate = useCallback((id: string, content: string) => {
      setPages(prev => {
          const next = prev.map(p => p.id === id ? { ...p, content } : p);
          syncToGlobal(next);
          return next;
      });
  }, [currentSceneId]);

  const handlePageSplit = useCallback((sourceId: string, trimmedContent: string, overflowContent: string) => {
      // Allow empty/whitespace splits (e.g. hitting Enter at end of page)
      const hasContent = overflowContent.trim().length > 0;
      if (!hasContent && !overflowContent.includes('<')) {
          // Allow splits for newlines
      }

      setPages(prev => {
          const index = prev.findIndex(p => p.id === sourceId);
          if (index === -1) return prev;

          const next = [...prev];
          next[index] = { ...next[index], content: trimmedContent };

          const newId = Date.now().toString() + Math.random().toString().slice(2,6);
          
          if (index + 1 < next.length) {
              next[index + 1] = { 
                  ...next[index + 1], 
                  content: overflowContent + next[index + 1].content 
              };
              setFocusTarget({ id: next[index + 1].id, mode: 'start' });
          } else {
              next.splice(index + 1, 0, { id: newId, content: overflowContent });
              setFocusTarget({ id: newId, mode: 'start' });
          }
          
          syncToGlobal(next);
          return next;
      });
      
      setTimeout(() => setFocusTarget(null), 50);
  }, [currentSceneId]);

  const handleUnderflow = useCallback((id: string) => {
       setPages(prev => {
           const index = prev.findIndex(p => p.id === id);
           if (index <= 0) return prev;

           const next = [...prev];
           if (!next[index].content.replace(/<[^>]*>/g, '').trim()) {
               const prevPageId = next[index - 1].id;
               next.splice(index, 1);
               syncToGlobal(next);
               setFocusTarget({ id: prevPageId, mode: 'end' });
               setTimeout(() => setFocusTarget(null), 100);
               return next;
           }
           return prev;
       });
  }, []);

  const triggerAI = async () => {
     const fullText = pages.map(p => p.content).join('\n');
     const genreContext = currentProject?.genres.join(', ') || 'Sci-Fi';
     setIsLoadingAI(true);
     const result = await generateAutocomplete(fullText.slice(-2000), genreContext); 
     if (result) {
         setSuggestionText(result);
         setShowSuggestion(true);
     }
     setIsLoadingAI(false);
  };

  const handleAcceptAI = () => {
      const targetIndex = pages.length - 1;
      const targetPage = pages[targetIndex];
      const newContent = targetPage.content + `<div class="sp-action">${suggestionText}</div>`;
      handlePageUpdate(targetPage.id, newContent);
      setShowSuggestion(false);
  };

  if (!scene) return <div className="flex items-center justify-center h-full text-zinc-500 bg-zinc-950">No scene selected.</div>;

  return (
    <div className="view-section active flex flex-col h-full bg-zinc-950 relative overflow-hidden flex-1">
        <header className="h-12 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm z-10 flex-shrink-0 gap-2 shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
            <span onClick={() => navigateTo('dashboard')} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition whitespace-nowrap hidden sm:inline">Projects</span>
            <span className="text-zinc-600 text-xs hidden sm:inline">/</span>
            <span className="text-xs font-medium text-zinc-200 flex items-center gap-2 truncate">
                <Film className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                <span className="truncate">{isNovelMode ? 'Ch' : 'Sc'} {String(scene.number).padStart(3, '0')} - {scene.title}</span>
            </span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setRightPanelOpen(!isRightPanelOpen)} className={`p-1.5 rounded hover:bg-zinc-800 text-zinc-500 transition ${isRightPanelOpen ? 'text-primary-400 bg-zinc-900' : ''}`}>
                    <LayoutTemplate className="w-4 h-4" />
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto relative flex flex-col items-center py-8 gap-6 bg-zinc-950 scroll-smooth" id="editor-scroll">
            {pages.map((page, i) => (
                <Page 
                    key={page.id} 
                    id={page.id}
                    index={i}
                    initialContent={page.content}
                    onUpdate={handlePageUpdate}
                    onSplit={handlePageSplit}
                    onUnderflow={handleUnderflow}
                    focusRequest={focusTarget?.id === page.id ? focusTarget : null}
                    isNovelMode={isNovelMode}
                />
            ))}
            <div className="h-32 flex-shrink-0" />
        </div>

        {showSuggestion && (
             <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-96 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 backdrop-blur-xl animate-in slide-in-from-bottom-4">
                 <div className="flex items-center gap-2 mb-2 text-primary-400">
                    <Zap className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Zoer Suggestion</span>
                </div>
                <div className="text-sm text-zinc-200 font-screenplay mb-4 italic pl-2 border-l-2 border-primary-500">"{suggestionText}"</div>
                <div className="flex gap-2">
                    <button onClick={handleAcceptAI} className="flex-1 bg-primary-600 hover:bg-primary-500 text-white text-xs py-1.5 rounded font-medium">Accept</button>
                    <button onClick={() => setShowSuggestion(false)} className="px-3 py-1.5 hover:bg-zinc-800 text-zinc-400 text-xs rounded">Dismiss</button>
                </div>
             </div>
        )}

        <style>{`
            /* Dark Mode Screenplay Formatting */
            .screenplay-mode .sp-slug { color: #e4e4e7; font-weight: bold; text-decoration: underline; margin-top: 1.5rem; text-transform: uppercase; }
            .screenplay-mode .sp-action { color: #d4d4d8; margin-bottom: 1rem; line-height: 1.6; }
            .screenplay-mode .sp-character { color: #e4e4e7; margin-top: 1rem; text-align: center; width: 50%; margin-left: auto; margin-right: auto; font-weight: 600; text-transform: uppercase; }
            .screenplay-mode .sp-dialogue { color: #d4d4d8; margin-bottom: 1rem; text-align: center; width: 75%; margin-left: auto; margin-right: auto; }
            .screenplay-mode .sp-parenthetical { color: #a1a1aa; text-align: center; margin-bottom: 0; font-size: 0.9em; }
            .screenplay-mode .sp-transition { color: #e4e4e7; text-align: right; margin-right: 1rem; text-transform: uppercase; }
            
            /* Novel Mode Formatting */
            .novel-mode .novel-chapter { font-size: 1.5em; font-weight: bold; text-align: center; margin-bottom: 2rem; margin-top: 1rem; color: #e4e4e7; }
            .novel-mode p { text-indent: 2rem; margin-bottom: 1rem; line-height: 1.8; color: #d4d4d8; }
            .page-surface div { margin-bottom: 0.5rem; }
        `}</style>
    </div>
  );
};

export default Editor;