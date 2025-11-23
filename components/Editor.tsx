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
    projectMetadata: any; // Pass context for AI
}

const Page = React.memo(({ id, index, initialContent, onUpdate, onSplit, onUnderflow, focusRequest, isNovelMode, projectMetadata }: PageProps) => {
    const pageRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);
    const ghostTextRef = useRef<HTMLSpanElement | null>(null);

    // --- Ghost Text Engine ---
    const clearGhostText = () => {
        if (ghostTextRef.current) {
            ghostTextRef.current.remove();
            ghostTextRef.current = null;
        }
    };

    const acceptGhostText = () => {
        if (ghostTextRef.current && pageRef.current) {
            const text = ghostTextRef.current.innerText;
            const parent = ghostTextRef.current.parentNode;
            
            const textNode = document.createTextNode(text);
            
            if (parent) {
                parent.replaceChild(textNode, ghostTextRef.current);
                parent.normalize(); 
            }
            
            ghostTextRef.current = null;
            
            const range = document.createRange();
            range.setStartAfter(textNode);
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            
            handleInput();
        }
    };

    const triggerGhostAI = async () => {
        if (!pageRef.current || ghostTextRef.current) return;
        
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !pageRef.current.contains(sel.anchorNode)) return;

        const range = sel.getRangeAt(0);
        if (!range.collapsed) return;

        const fullText = pageRef.current.innerText;
        
        const suggestion = await generateAutocomplete(fullText, {
            type: isNovelMode ? 'Novel' : 'Screenplay',
            genre: projectMetadata.genres?.[0] || 'General',
            style: isNovelMode ? 'Descriptive Prose' : 'Screenplay Action/Dialogue'
        });

        if (suggestion && document.activeElement === pageRef.current) {
            insertGhostText(suggestion);
        }
    };

    const insertGhostText = (text: string) => {
        clearGhostText();
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        
        const range = sel.getRangeAt(0);
        
        const span = document.createElement('span');
        span.className = 'ai-ghost';
        span.innerText = text;
        span.contentEditable = 'false';
        span.style.color = '#a1a1aa';
        span.style.pointerEvents = 'none';

        range.insertNode(span);
        ghostTextRef.current = span;
        
        range.setStartBefore(span);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    };

    // --- End Ghost Text Engine ---

    const checkOverflow = useCallback(() => {
        if (!pageRef.current) return false;
        
        if (ghostTextRef.current) ghostTextRef.current.style.display = 'none';

        const pageRect = pageRef.current.getBoundingClientRect();
        const bottomLimit = pageRect.bottom - MARGIN_BOTTOM_PX; 
        const nodes: Node[] = Array.from(pageRef.current.childNodes);
        
        let splitNodeIndex = -1;
        let isPartialOverflow = false;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node === ghostTextRef.current) continue;

            let nodeBottom = 0, nodeTop = 0;

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

            if (nodeTop > bottomLimit) { splitNodeIndex = i; break; }
            if (nodeBottom > bottomLimit) { splitNodeIndex = i; isPartialOverflow = true; break; }
        }

        if (ghostTextRef.current) ghostTextRef.current.style.display = 'inline';

        if (splitNodeIndex === -1) return false;

        let overflowHTML = '';
        let trimmedHTML = '';
        
        for(let i=0; i<splitNodeIndex; i++) {
            const node = nodes[i];
            if (node === ghostTextRef.current) continue;
            trimmedHTML += node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement).outerHTML : (node.textContent || '');
        }

        let nodesToRemove: Node[] = [];

        if (isPartialOverflow) {
            const splitNode = nodes[splitNodeIndex];
            if (splitNode.nodeType === Node.TEXT_NODE) {
                 const splitPoint = findBinarySplitIndex(splitNode, bottomLimit);
                 const fullText = splitNode.textContent || '';
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
                 if (node === ghostTextRef.current) return '';
                 return node.nodeType === Node.ELEMENT_NODE 
                    ? (node as HTMLElement).outerHTML 
                    : (isNovelMode ? `<p>${node.textContent}</p>` : `<div class="sp-action">${node.textContent}</div>`);
             }).join('');
             
             nodesToRemove.forEach(node => {
                 if (node !== ghostTextRef.current) node.parentNode?.removeChild(node);
             });
        }

        if (overflowHTML) {
            clearGhostText();
            onSplit(id, trimmedHTML || pageRef.current.innerHTML, overflowHTML);
            return true;
        }
        return false;
    }, [id, onSplit, isNovelMode]);

    useLayoutEffect(() => {
        if (pageRef.current) {
            if (isInternalUpdate.current) {
                isInternalUpdate.current = false;
                return;
            }
            if (pageRef.current.innerHTML !== initialContent) {
                 pageRef.current.innerHTML = initialContent;
                 requestAnimationFrame(() => checkOverflow());
            }
        }
    }, [initialContent, checkOverflow]);

    useEffect(() => {
        if (focusRequest && pageRef.current) {
            const sel = window.getSelection();
            const range = document.createRange();
            if (focusRequest.mode === 'start') {
                let target: Node = pageRef.current.firstChild || pageRef.current;
                range.setStart(target, 0);
                range.collapse(true);
            } else {
                range.selectNodeContents(pageRef.current);
                range.collapse(false);
            }
            sel?.removeAllRanges();
            sel?.addRange(range);
            pageRef.current.focus();
            pageRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, [focusRequest]);

    const handleInput = () => {
        if (!pageRef.current) return;
        clearGhostText();
        isInternalUpdate.current = true;
        const didSplit = checkOverflow();
        if (!didSplit) {
             const rawHTML = pageRef.current.innerHTML.replace(/<span class="ai-ghost".*?>.*?<\/span>/g, '');
             onUpdate(id, rawHTML);
             if (pageRef.current.scrollHeight > pageRef.current.clientHeight) {
                 checkOverflow();
             }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            if (ghostTextRef.current) {
                e.preventDefault();
                acceptGhostText();
            }
            return;
        }
        if (['Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            if (ghostTextRef.current) {
                e.preventDefault();
                clearGhostText();
            }
            return;
        }
        if (e.key === ' ') {
            clearGhostText();
            setTimeout(() => triggerGhostAI(), 10);
        }
        if (e.key === 'Backspace') {
            clearGhostText();
            const sel = window.getSelection();
            if (sel?.rangeCount && sel.getRangeAt(0).collapsed && sel.anchorOffset === 0 && index > 0) {
                if (pageRef.current?.innerText.trim() === '' || (sel.anchorNode === pageRef.current)) {
                    e.preventDefault();
                    onUnderflow(id);
                }
            }
        }
        if (e.key === 'Enter') {
            clearGhostText();
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
  
  const scene = currentProject?.scenes.find(s => s.id === currentSceneId);
  const isNovelMode = currentProject?.type === 'Novel';

  useEffect(() => {
      if (!scene) return;
      const localContent = pages.map(p => p.content).join('');
      const remoteContent = scene.content;

      if (pages.length === 1 && pages[0].content === '' && remoteContent !== '') {
           setPages([{ id: Date.now().toString(), content: remoteContent }]);
           return;
      }
      if (remoteContent.length > localContent.length + 5) {
          const newPart = remoteContent.slice(localContent.length);
          setPages(prev => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              next[lastIndex] = { ...next[lastIndex], content: next[lastIndex].content + newPart };
              return next;
          });
          return;
      }
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
      setPages(prev => {
          const index = prev.findIndex(p => p.id === sourceId);
          if (index === -1) return prev;
          const next = [...prev];
          next[index] = { ...next[index], content: trimmedContent };
          const newId = Date.now().toString() + Math.random().toString().slice(2,6);
          if (index + 1 < next.length) {
              next[index + 1] = { ...next[index + 1], content: overflowContent + next[index + 1].content };
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
                    projectMetadata={currentProject || {}}
                />
            ))}
            <div className="h-32 flex-shrink-0" />
        </div>

        <style>{`
            .ai-ghost {
                color: #a1a1aa;
                opacity: 0.6;
                pointer-events: none;
            }
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
