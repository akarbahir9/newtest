import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Film, Undo, Redo, ZoomIn, ZoomOut, MapPin, User, MessageSquare, AlignLeft, ArrowRight, Parentheses, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { generateAutocomplete } from '../services/geminiService';

// Helper for unique IDs
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// A4 Specs
const MARGIN_BOTTOM_PX = 96; // ~25mm

// --- Sub-Component: Single Page ---
interface PageProps {
    id: string;
    index: number;
    initialContent: string;
    onUpdate: (id: string, content: string) => void;
    onSplit: (id: string, trimmedContent: string, overflowContent: string) => void;
    onUnderflow: (id: string) => void;
    focusRequest?: { mode: 'start' | 'end' } | null;
    isNovelMode: boolean;
    projectMetadata: any;
    zoomLevel: number;
}

const Page = React.memo(({ id, index, initialContent, onUpdate, onSplit, onUnderflow, focusRequest, isNovelMode, projectMetadata, zoomLevel }: PageProps) => {
    const pageRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);
    const ghostTextRef = useRef<HTMLSpanElement | null>(null);
    const requestVersion = useRef(0);
    const lastKeyRef = useRef<string | null>(null);

    // --- Ghost Text Engine ---
    
    const removeGhostNode = () => {
        // Robust cleanup finding any existing ghosts
        const ghosts = pageRef.current?.querySelectorAll('.ai-ghost');
        if (ghosts && ghosts.length > 0) {
            ghosts.forEach(g => g.remove());
            // Normalize to merge broken text nodes
            pageRef.current?.normalize();
        }
        ghostTextRef.current = null;
    };

    const acceptGhostText = () => {
        const ghost = pageRef.current?.querySelector('.ai-ghost') as HTMLElement;
        if (ghost && pageRef.current) {
            const text = ghost.innerText;
            const textNode = document.createTextNode(text);
            
            // Replace ghost with real text
            ghost.parentNode?.replaceChild(textNode, ghost);
            ghostTextRef.current = null;
            
            // Move cursor to end of inserted text
            const range = document.createRange();
            range.setStartAfter(textNode);
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            
            // Normalize and trigger save
            pageRef.current.normalize();
            handleInput(undefined, true);
        }
    };

    const getTextContext = () => {
        if (!pageRef.current) return '';
        const sel = window.getSelection();
        
        // We want text specifically up to the cursor
        try {
            const range = document.createRange();
            range.selectNodeContents(pageRef.current);
            if (sel && sel.rangeCount > 0 && sel.anchorNode && pageRef.current.contains(sel.anchorNode)) {
                range.setEnd(sel.anchorNode, sel.anchorOffset);
            }
            return range.toString();
        } catch (e) {
            // Fallback if selection is invalid
            return pageRef.current.innerText;
        }
    };

    const triggerGhostAI = async () => {
        if (!pageRef.current) return;
        
        // 1. Get Context
        const contextText = getTextContext();
        // Allow even short context, but ensure it exists
        if (!contextText || contextText.trim().length < 2) return; 

        // 2. Setup Versioning to prevent race conditions
        const currentVersion = ++requestVersion.current;
        
        // 3. Call AI
        const suggestion = await generateAutocomplete(contextText, {
            type: isNovelMode ? 'Novel' : 'Screenplay',
            genre: projectMetadata.genres?.join(', ') || 'General',
            style: isNovelMode ? 'Descriptive Prose' : 'Screenplay Action/Dialogue',
            title: projectMetadata.title,
            logline: projectMetadata.logline,
            setting: projectMetadata.setting,
            goal: projectMetadata.protagonistGoal,
            characters: projectMetadata.characters?.map((c: any) => `${c.name} (${c.role})`).join('; ')
        });

        // 4. Validate State (User hasn't typed anything else)
        if (currentVersion !== requestVersion.current) return;
        if (!suggestion) return;
        if (document.activeElement !== pageRef.current) return;

        // 5. Insert Ghost Text
        insertGhostElement(suggestion);
    };

    const insertGhostElement = (text: string) => {
        removeGhostNode(); // Safety clear

        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        
        const range = sel.getRangeAt(0);
        
        // Create the ghost element
        const span = document.createElement('span');
        span.className = 'ai-ghost';
        span.innerText = text; 
        span.contentEditable = 'false'; // Critical for atomic behavior
        span.setAttribute('data-ai-ghost', 'true');

        // Insert at cursor
        try {
            range.insertNode(span);
            ghostTextRef.current = span;
            
            // Fix Cursor: Ensure it stays BEFORE the ghost text
            range.setStartBefore(span);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) {
            console.warn("Could not insert ghost text", e);
        }
    };

    // --- Overflow Logic ---

    const checkOverflow = useCallback(() => {
        if (!pageRef.current) return false;
        
        // Ignore ghost for measurement
        const ghost = ghostTextRef.current;
        if (ghost) ghost.style.display = 'none';

        const pageRect = pageRef.current.getBoundingClientRect();
        // Adjust margin check based on zoom level because getBoundingClientRect returns viewport coords
        const bottomLimit = pageRect.bottom - (MARGIN_BOTTOM_PX * zoomLevel); 
        const nodes: Node[] = Array.from(pageRef.current.childNodes);
        
        let splitNodeIndex = -1;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            // Skip ghost
            if ((node as HTMLElement).className === 'ai-ghost') continue;

            let nodeBottom = 0;
            if (node.nodeType === Node.ELEMENT_NODE) {
                const rect = (node as HTMLElement).getBoundingClientRect();
                nodeBottom = rect.bottom;
            } else if (node.nodeType === Node.TEXT_NODE) {
                const range = document.createRange();
                range.selectNodeContents(node);
                const rect = range.getBoundingClientRect();
                nodeBottom = rect.bottom;
            }

            if (nodeBottom > bottomLimit) { 
                splitNodeIndex = i; 
                break; 
            }
        }

        // Restore ghost
        if (ghost) ghost.style.display = 'inline';

        if (splitNodeIndex === -1) return false;

        // Collect Overflow
        let overflowHTML = '';
        let trimmedHTML = '';
        
        const nodesToRemove = nodes.slice(splitNodeIndex);
        if (nodesToRemove.length > 0) {
             // Remove ghost from overflow content calculation
             overflowHTML += nodesToRemove.map(node => {
                 if ((node as HTMLElement).className === 'ai-ghost') return '';
                 return node.nodeType === Node.ELEMENT_NODE 
                    ? (node as HTMLElement).outerHTML 
                    : (isNovelMode ? `<p>${node.textContent}</p>` : `<div class="sp-action">${node.textContent}</div>`);
             }).join('');
             
             nodesToRemove.forEach(node => {
                 if ((node as HTMLElement).className !== 'ai-ghost') node.parentNode?.removeChild(node);
             });
        }

        if (overflowHTML) {
            removeGhostNode();
            onSplit(id, trimmedHTML || pageRef.current.innerHTML, overflowHTML);
            return true;
        }
        return false;
    }, [id, onSplit, isNovelMode, zoomLevel]);

    // --- Lifecycle & Events ---

    useLayoutEffect(() => {
        if (pageRef.current) {
            if (isInternalUpdate.current) {
                isInternalUpdate.current = false;
                return;
            }
            // Only update if genuine content change
            const currentRaw = pageRef.current.innerHTML.replace(/<span class="ai-ghost".*?>.*?<\/span>/g, '');
            if (currentRaw !== initialContent) {
                 pageRef.current.innerHTML = initialContent;
                 // Ensure we check overflow when external content is loaded
                 checkOverflow();
            }
        }
    }, [initialContent, checkOverflow]);

    useEffect(() => {
        if (focusRequest && pageRef.current) {
            const sel = window.getSelection();
            const range = document.createRange();
            if (focusRequest.mode === 'start') {
                const target: Node = pageRef.current.firstChild || pageRef.current;
                range.setStart(target, 0);
                range.collapse(true);
            } else {
                range.selectNodeContents(pageRef.current);
                range.collapse(false);
            }
            sel?.removeAllRanges();
            sel?.addRange(range);
            pageRef.current.focus();
        }
    }, [focusRequest]);

    const handleInput = (e?: React.FormEvent, skipGhostCheck = false) => {
        if (!pageRef.current) return;
        requestVersion.current++; // Invalidate pending AI requests
        
        // 1. Detect Typing vs Ghost
        // Always clear ghost on input. The user typed something.
        removeGhostNode();

        // 2. Sync State
        isInternalUpdate.current = true;
        const didSplit = checkOverflow();
        
        if (!didSplit) {
             const rawHTML = pageRef.current.innerHTML.replace(/<span class="ai-ghost".*?>.*?<\/span>/g, '');
             onUpdate(id, rawHTML);
        }

        if (skipGhostCheck) return;

        // 3. Trigger Logic
        const nativeEvent = e?.nativeEvent as InputEvent;
        const inputData = nativeEvent?.data;

        // Reliable Trigger: Space (normal or nbsp), Punctuation, or explicitly captured keys
        const shouldTriggerAI = 
            inputData === ' ' || inputData === '\u00A0' || // Space variants
            (inputData && /^[.,;?!،؛؟]/.test(inputData)) || // Punctuation
            lastKeyRef.current === ' ' || lastKeyRef.current === 'Space';

        if (shouldTriggerAI) {
            // IMMEDIATE TRIGGER
            triggerGhostAI();
            lastKeyRef.current = null; // Reset
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        lastKeyRef.current = e.key;

        // TAB: Accept Ghost
        if (e.key === 'Tab') {
            const ghost = pageRef.current?.querySelector('.ai-ghost');
            if (ghost) {
                e.preventDefault();
                acceptGhostText();
                return;
            }
        }
        
        // Escape: Dismiss Ghost
        if (e.key === 'Escape') {
             removeGhostNode();
             return;
        }

        // Backspace: Clean ghost + logic
        if (e.key === 'Backspace') {
            removeGhostNode();
            
            const sel = window.getSelection();
            if (sel?.rangeCount && sel.getRangeAt(0).collapsed && sel.anchorOffset === 0 && index > 0) {
                const isAtStart = (sel.anchorNode === pageRef.current) || (sel.anchorNode?.parentNode === pageRef.current && !sel.anchorNode.previousSibling);
                if (pageRef.current?.innerText.trim() === '' || isAtStart) {
                    e.preventDefault();
                    onUnderflow(id);
                }
            }
        }
    };

    return (
        <div className="relative group mb-4 md:mb-8 flex-shrink-0 flex flex-col items-center">
            <div 
                ref={pageRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                className={`page-surface bg-zinc-900 border border-zinc-800 shadow-2xl text-[15px] leading-relaxed outline-none text-zinc-300 ${isNovelMode ? 'font-serif novel-mode' : 'font-screenplay screenplay-mode'} whitespace-pre-wrap`}
                style={{
                    width: '210mm',
                    height: '297mm',
                    padding: '25mm 20mm 20mm 20mm', 
                    boxSizing: 'border-box',
                    overflow: 'hidden', 
                    position: 'relative'
                }}
            />
            {/* Page Number - Bottom Center */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 font-mono pointer-events-none select-none opacity-60">
                {index + 1}.
            </div>
        </div>
    );
});

// --- Toolbar Component ---
const FormattingToolbar: React.FC<{ onFormat: (cls: string) => void, activeFormat: string }> = ({ onFormat, activeFormat }) => {
    
    // Config for each button style
    const buttons = [
        { id: 'sp-slug', icon: MapPin, label: 'شوێن', activeClass: 'bg-zinc-300 text-zinc-900', inactiveClass: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800', shortcut: 'Cmd+1' },
        { id: 'sp-action', icon: AlignLeft, label: 'کردار', activeClass: 'bg-zinc-600 text-white', inactiveClass: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800', shortcut: 'Cmd+2' },
        { id: 'sp-character', icon: User, label: 'کاراکتەر', activeClass: 'bg-blue-600 text-white', inactiveClass: 'text-blue-500 hover:text-blue-400 hover:bg-zinc-800', shortcut: 'Cmd+3' },
        { id: 'sp-parenthetical', icon: Parentheses, label: 'کەوانە', activeClass: 'bg-amber-600 text-white', inactiveClass: 'text-amber-500 hover:text-amber-400 hover:bg-zinc-800', shortcut: 'Cmd+4' },
        { id: 'sp-dialogue', icon: MessageSquare, label: 'دیالۆگ', activeClass: 'bg-emerald-600 text-white', inactiveClass: 'text-emerald-500 hover:text-emerald-400 hover:bg-zinc-800', shortcut: 'Cmd+5' },
        { id: 'sp-transition', icon: ArrowRight, label: 'گواستنەوە', activeClass: 'bg-orange-600 text-white', inactiveClass: 'text-orange-500 hover:text-orange-400 hover:bg-zinc-800', shortcut: 'Cmd+6' },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 p-1.5 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.6)] flex items-center gap-1 z-50 animate-in fade-in slide-in-from-bottom-4 w-auto max-w-[95vw] overflow-x-auto no-scrollbar touch-pan-x">
            {buttons.map((btn, idx) => {
                const isActive = activeFormat === btn.id;
                return (
                    <React.Fragment key={btn.id}>
                        <button 
                            onMouseDown={(e) => { e.preventDefault(); onFormat(btn.id); }}
                            className={`flex flex-col items-center justify-center w-12 h-11 rounded-lg transition-all duration-200 group relative flex-shrink-0 ${isActive ? btn.activeClass + ' shadow-md scale-105' : btn.inactiveClass}`}
                            title={`${btn.label} (${btn.shortcut})`}
                        >
                            <btn.icon className={`w-4 h-4 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">{btn.label}</span>
                            
                            {/* Active Indicator Dot (Optional extra visual) */}
                            {isActive && <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white/50"></div>}
                        </button>
                        {idx < buttons.length - 1 && <div className="w-px h-6 bg-zinc-800/50 mx-0.5 flex-shrink-0"></div>}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// --- Main Editor Component ---

const Editor: React.FC = () => {
  const { currentProject, currentSceneId, navigateTo, updateSceneContent, isRightPanelOpen, setRightPanelOpen, isSidebarOpen, setSidebarOpen, setCurrentSceneId } = useProject();
  
  const [pages, setPages] = useState<{id: string, content: string}[]>([{id: 'init', content: ''}]);
  const [focusTarget, setFocusTarget] = useState<{ id: string, mode: 'start' | 'end' } | null>(null);
  
  // History State
  const [history, setHistory] = useState<{id: string, content: string}[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zoom State
  const [zoom, setZoom] = useState(1);

  // Formatting State
  const [activeFormat, setActiveFormat] = useState('');
  
  // Track last synced content to detect external updates (like AI)
  const lastSyncedContent = useRef<string>('');
  
  const scene = currentProject?.scenes.find(s => s.id === currentSceneId);
  const isNovelMode = currentProject?.type === 'Novel';

  // Navigation Logic
  const scenes = currentProject?.scenes || [];
  const currentSceneIndex = scenes.findIndex(s => s.id === currentSceneId);
  const prevScene = scenes[currentSceneIndex - 1];
  const nextScene = scenes[currentSceneIndex + 1];

  const handlePrevScene = useCallback(() => {
      if (prevScene) setCurrentSceneId(prevScene.id);
  }, [prevScene, setCurrentSceneId]);

  const handleNextScene = useCallback(() => {
      if (nextScene) setCurrentSceneId(nextScene.id);
  }, [nextScene, setCurrentSceneId]);

  const handleZoomIn = () => setZoom(prev => Math.min(Math.round((prev + 0.1) * 10) / 10, 1.5));
  const handleZoomOut = () => setZoom(prev => Math.max(Math.round((prev - 0.1) * 10) / 10, 0.3)); // Allow smaller zoom for mobile
  const handleZoomReset = () => {
       // Trigger auto-calculation
       window.dispatchEvent(new Event('resize'));
  };

  useEffect(() => {
    const updateZoom = () => {
        const container = document.getElementById('editor-scroll');
        if (!container) return;

        const containerWidth = container.clientWidth;
        const targetPageWidth = 794; // 210mm approx 794px at 96 DPI
        const padding = 24; // Less padding for mobile calculation

        if (containerWidth < targetPageWidth + padding) {
            // Mobile/Tablet: Scale down to fit width precisely
            const scale = (containerWidth - padding) / targetPageWidth;
            setZoom(Math.max(scale, 0.3)); // Minimum scale 0.3
        } else {
            // Desktop
            const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
            if (isDesktop && (isSidebarOpen || isRightPanelOpen)) {
                 // Slight scale down if panels crowd the view
                 const availableWidth = window.innerWidth - (isSidebarOpen ? 256 : 0) - (isRightPanelOpen ? 320 : 0);
                 if (availableWidth < 900) {
                     setZoom(0.85);
                 } else {
                     setZoom(1);
                 }
            } else {
                setZoom(1);
            }
        }
    };
    
    // Initial check
    setTimeout(updateZoom, 100); // Small delay to ensure layout is ready

    // Listener for resize
    window.addEventListener('resize', updateZoom);
    // Helper to trigger re-calc when sidebar/panel toggles, handled by dependency
    return () => window.removeEventListener('resize', updateZoom);
  }, [isSidebarOpen, isRightPanelOpen]);

  // Detect Active Format based on Selection
  useEffect(() => {
      const checkFormat = () => {
          const sel = window.getSelection();
          if (!sel?.anchorNode) {
              setActiveFormat('');
              return;
          }
          let n: Node | null = sel.anchorNode;
          
          // Handle text nodes
          if (n.nodeType === Node.TEXT_NODE) n = n.parentNode;
          
          let found = ''; // Start with no active format
          
          while (n && n.nodeName !== 'BODY') {
               const el = n as HTMLElement;
               
               // Exact match for known formatting classes
               if (el.classList?.contains('sp-slug')) { found = 'sp-slug'; break; }
               if (el.classList?.contains('sp-character')) { found = 'sp-character'; break; }
               if (el.classList?.contains('sp-dialogue')) { found = 'sp-dialogue'; break; }
               if (el.classList?.contains('sp-parenthetical')) { found = 'sp-parenthetical'; break; }
               if (el.classList?.contains('sp-transition')) { found = 'sp-transition'; break; }
               if (el.classList?.contains('sp-action')) { found = 'sp-action'; break; }
               
               // Stop if we hit the page surface to avoid infinite climb
               if (el.classList?.contains('page-surface')) break;
               
               n = n.parentNode;
          }
          setActiveFormat(found);
      };
      
      document.addEventListener('selectionchange', checkFormat);
      document.addEventListener('keyup', checkFormat);
      document.addEventListener('mouseup', checkFormat);
      document.addEventListener('click', checkFormat); 
      
      return () => {
          document.removeEventListener('selectionchange', checkFormat);
          document.removeEventListener('keyup', checkFormat);
          document.removeEventListener('mouseup', checkFormat);
          document.removeEventListener('click', checkFormat);
      };
  }, []);

  // Push to history with optional replacement
  const pushToHistory = useCallback((newPages: {id: string, content: string}[], replace = false) => {
      setHistory(prev => {
          const current = prev.slice(0, historyIndex + 1);
          if (replace && current.length > 0) {
               const newHistory = [...current];
               newHistory[newHistory.length - 1] = JSON.parse(JSON.stringify(newPages));
               return newHistory;
          }
          const nextHistory = [...current, JSON.parse(JSON.stringify(newPages))];
          if (nextHistory.length > 50) nextHistory.shift(); 
          return nextHistory;
      });
      setHistoryIndex(prev => {
          if (replace) return prev;
          return Math.min(prev + 1, 49);
      });
  }, [historyIndex]);

  // Initialize pages from scene content & Handle External Updates
  useEffect(() => {
      if (!scene) return;
      const remoteContent = scene.content;

      // 1. Initial Load
      if (pages.length === 1 && pages[0].id === 'init') {
           const initPages = [{ id: generateId(), content: remoteContent }];
           setPages(initPages);
           setHistory([initPages]);
           setHistoryIndex(0);
           lastSyncedContent.current = remoteContent;
           return;
      }
      
      // 2. Check for External Updates
      // If the content is different from what we last synced, it's an external change.
      if (remoteContent !== lastSyncedContent.current) {
           // It's an external update (e.g. AI appended text)
           const newPages = [{ id: generateId(), content: remoteContent }];
           setPages(newPages);
           lastSyncedContent.current = remoteContent;
           
           // Push to history to allow undoing the AI change
           if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
           pushToHistory(newPages);
      }
  }, [currentSceneId, scene?.content, pushToHistory]);

  // Init History when pages are first loaded (Safety check)
  useEffect(() => {
      if (pages.length > 0 && pages[0].id !== 'init' && history.length === 0) {
          const snap = JSON.parse(JSON.stringify(pages));
          setHistory([snap]);
          setHistoryIndex(0);
      }
  }, [pages, history.length]);

  const syncToGlobal = (newPages: {id: string, content: string}[]) => {
      const fullContent = newPages.map(p => p.content).join('');
      lastSyncedContent.current = fullContent;
      updateSceneContent(currentSceneId!, fullContent);
  };

  const handleUndo = () => {
      // Clear pending updates to avoid race condition where typing debounce pushes OLD state
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);

      if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const prevState = history[newIndex];
          setHistoryIndex(newIndex);
          setPages(prevState);
          syncToGlobal(prevState);
      }
  };

  const handleRedo = () => {
      // Clear pending updates
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);

      if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          const nextState = history[newIndex];
          setHistoryIndex(newIndex);
          setPages(nextState);
          syncToGlobal(nextState);
      }
  };

  const handlePageUpdate = useCallback((id: string, content: string) => {
      setPages(prev => {
          const next = prev.map(p => p.id === id ? { ...p, content } : p);
          syncToGlobal(next);
          
          // Debounce history push
          if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
          historyTimeoutRef.current = setTimeout(() => {
              pushToHistory(next);
          }, 800);
          
          return next;
      });
  }, [currentSceneId, pushToHistory]);

  const handlePageSplit = useCallback((sourceId: string, trimmedContent: string, overflowContent: string) => {
      setPages(prev => {
          const index = prev.findIndex(p => p.id === sourceId);
          if (index === -1) return prev;
          const next = [...prev];
          next[index] = { ...next[index], content: trimmedContent };
          
          // Robust ID for new page
          const newId = generateId();
          
          if (index + 1 < next.length) {
              next[index + 1] = { ...next[index + 1], content: overflowContent + next[index + 1].content };
              setFocusTarget({ id: next[index + 1].id, mode: 'start' });
          } else {
              next.splice(index + 1, 0, { id: newId, content: overflowContent });
              setFocusTarget({ id: newId, mode: 'start' });
          }
          syncToGlobal(next);
          
          // Check if content matches (just layout split) to replace history instead of push
          const prevContent = prev.map(p => p.content).join('');
          const nextContent = next.map(p => p.content).join('');
          const isLayoutOnly = prevContent === nextContent;

          // Immediate history push on structure change
          if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
          
          // Use setTimeout to allow state to settle, though not strictly required inside setPages updater
          setTimeout(() => {
              pushToHistory(next, isLayoutOnly);
          }, 0);

          return next;
      });
      setTimeout(() => setFocusTarget(null), 50);
  }, [currentSceneId, pushToHistory]);

  const handleUnderflow = useCallback((id: string) => {
       setPages(prev => {
           const index = prev.findIndex(p => p.id === id);
           if (index <= 0) return prev;
           const next = [...prev];
           if (!next[index].content.replace(/<[^>]*>/g, '').trim()) {
               const prevPageId = next[index - 1].id;
               next.splice(index, 1);
               syncToGlobal(next);
               // Immediate history push
               if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
               pushToHistory(next);
               setFocusTarget({ id: prevPageId, mode: 'end' });
               setTimeout(() => setFocusTarget(null), 100);
               return next;
           }
           return prev;
       });
  }, [pushToHistory]);

  // --- Formatting Logic ---
  const applyFormat = useCallback((formatClass: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // We primarily care about the anchor node (where the cursor is)
    const anchorNode = selection.anchorNode;
    let targetNode: HTMLElement | null = null;

    // 1. Find the block container inside a page
    let curr = anchorNode;
    while (curr && curr.nodeName !== 'BODY') {
        // If we hit the page container, the previous element was likely our block target
        // OR we are sitting directly on the page container (raw text node case)
        if ((curr as HTMLElement).classList?.contains('page-surface')) {
            break; 
        }
        // If this is a DIV/P inside the page surface, this is our target
        if (curr.nodeType === Node.ELEMENT_NODE && curr.parentNode && (curr.parentNode as HTMLElement).classList?.contains('page-surface')) {
            targetNode = curr as HTMLElement;
            break;
        }
        curr = curr.parentNode;
    }

    // 2. Apply Format
    if (targetNode) {
        // Prevent messing with ghost text
        if (targetNode.classList.contains('ai-ghost')) return;

        targetNode.className = formatClass;
        // Dispatch input to trigger React state update in Page component
        targetNode.dispatchEvent(new Event('input', { bubbles: true }));
        setActiveFormat(formatClass);
    } else {
        // Fallback: If selection is on a raw text node directly inside page-surface
        // We use execCommand to wrap it in a div first
        document.execCommand('formatBlock', false, 'div');
        
        // Re-acquire the node after wrapping
        const newSel = window.getSelection();
        if (newSel?.anchorNode) {
            let n = newSel.anchorNode;
            while (n && n.parentNode && !(n.parentNode as HTMLElement).classList?.contains('page-surface')) {
                n = n.parentNode;
            }
            if (n && n.nodeType === Node.ELEMENT_NODE) {
                (n as HTMLElement).className = formatClass;
                (n as HTMLElement).dispatchEvent(new Event('input', { bubbles: true }));
                setActiveFormat(formatClass);
            }
        }
    }
    
    // Keep focus
    if (selection.rangeCount > 0) {
        // Focus is usually kept, but ensure page is active
        const pageEl = selection.anchorNode?.parentElement?.closest('.page-surface');
        if (pageEl) (pageEl as HTMLElement).focus();
    }
  }, []);

  // Keyboard Shortcuts for Formatting & Navigation
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
        // Check modifiers (Cmd on Mac, Ctrl on Windows)
        if (!(e.metaKey || e.ctrlKey)) return;

        // Navigation Shortcuts
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handleNextScene(); // In RTL, ArrowLeft is NEXT (Forward)
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            handlePrevScene(); // In RTL, ArrowRight is PREV (Back)
            return;
        }

        // Skip formatting if novel mode
        if (isNovelMode) return;

        let format = '';
        switch(e.key) {
            case '1': format = 'sp-slug'; break;
            case '2': format = 'sp-action'; break;
            case '3': format = 'sp-character'; break;
            case '4': format = 'sp-parenthetical'; break;
            case '5': format = 'sp-dialogue'; break;
            case '6': format = 'sp-transition'; break;
        }

        if (format) {
            e.preventDefault();
            applyFormat(format);
        }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
         if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) {
                  handleRedo();
              } else {
                  handleUndo();
              }
          }
    };

    window.addEventListener('keydown', handleShortcuts);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
        window.removeEventListener('keydown', handleShortcuts);
        window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [applyFormat, isNovelMode, handleRedo, handleUndo, handlePrevScene, handleNextScene]); 

  if (!scene) return <div className="flex items-center justify-center h-full text-zinc-500 bg-zinc-950">هیچ دیمەنێک دیاری نەکراوە.</div>;

  return (
    <div className="view-section active flex-1 flex flex-col h-full bg-zinc-950 relative overflow-hidden">
        <header className="h-12 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm z-10 flex-shrink-0 gap-2 shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
                <span onClick={() => navigateTo('dashboard')} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition whitespace-nowrap hidden sm:inline ml-8 md:ml-0">پڕۆژەکان</span>
                <span className="text-zinc-600 text-xs hidden sm:inline">/</span>
                <span className="text-xs font-medium text-zinc-200 flex items-center gap-2 truncate">
                    <Film className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                    {/* Scene Navigation */}
                    <div className="flex items-center gap-1 mx-1">
                        <button 
                            onClick={handleNextScene} 
                            disabled={!nextScene}
                            className={`p-1 rounded transition ${!nextScene ? 'text-zinc-800 cursor-not-allowed' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}`}
                            title="دیمەنی داهاتوو (Ctrl+Left)"
                        >
                            <ChevronLeft className="w-4 h-4" /> {/* Next/Forward in RTL */}
                        </button>
                        <button 
                            onClick={handlePrevScene} 
                            disabled={!prevScene}
                            className={`p-1 rounded transition ${!prevScene ? 'text-zinc-800 cursor-not-allowed' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}`}
                            title="دیمەنی پێشوو (Ctrl+Right)"
                        >
                            <ChevronRight className="w-4 h-4" /> {/* Prev/Back in RTL */}
                        </button>
                    </div>
                    <span className="truncate">{isNovelMode ? 'بەشی' : 'دیمەنی'} {String(scene.number).padStart(3, '0')} - {scene.title}</span>
                </span>
            </div>
            
            <div className="flex items-center">
                {/* Undo/Redo Controls */}
                <div className="flex items-center gap-1 mx-2">
                    <button 
                        onClick={handleUndo} 
                        disabled={historyIndex <= 0}
                        className={`p-1.5 rounded transition ${historyIndex > 0 ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'}`}
                        title="گەڕانەوە (Cmd+Z)"
                    >
                        <Undo className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        className={`p-1.5 rounded transition ${historyIndex < history.length - 1 ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'}`}
                        title="هێنانەوە (Cmd+Shift+Z)"
                    >
                        <Redo className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800 p-0.5 mx-2 hidden md:flex">
                    <button onClick={handleZoomOut} className="p-1.5 hover:bg-zinc-800 text-zinc-500 rounded"><ZoomOut className="w-3.5 h-3.5" /></button>
                    <span onClick={handleZoomReset} className="text-[10px] w-10 text-center text-zinc-400 cursor-pointer font-mono select-none hover:text-zinc-200" title="ڕێکخستنەوەی قەبارە">{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-1.5 hover:bg-zinc-800 text-zinc-500 rounded"><ZoomIn className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 w-8 md:w-0">
               {/* Spacer */}
            </div>
        </header>

        <div className="flex-1 overflow-y-auto relative bg-zinc-950 scroll-smooth" id="editor-scroll">
            <div 
                className="flex flex-col items-center py-4 md:py-8 gap-6 transition-transform duration-200 ease-in-out origin-top min-h-full"
                style={{ transform: `scale(${zoom})`, width: '100%' }}
            >
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
                        zoomLevel={zoom}
                    />
                ))}
                <div className="h-32 flex-shrink-0" />
            </div>
        </div>
        
        {/* Floating Formatting Toolbar */}
        {!isNovelMode && (
            <FormattingToolbar onFormat={applyFormat} activeFormat={activeFormat} />
        )}
    </div>
  );
};

export default Editor;