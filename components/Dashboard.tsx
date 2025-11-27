
import React, { useState, useRef, useEffect } from 'react';
import { FileText, Clock, Users, Book, ChevronLeft, Plus, Trash2, AlertTriangle, X, Clapperboard, Tv, Upload, Download, FileDown, WifiOff, Database, MessageSquare, Sparkles, Send, Play, Edit2 } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Project, ProjectType, ProjectFormat, Story, ChatMessage } from '../types';
import { PDFDocument, rgb } from 'pdf-lib';
import * as fontkitProxy from '@pdf-lib/fontkit';
import * as ArabicReshaperProxy from 'arabic-persian-reshaper';

// Reliable CDN for Noto Sans Arabic (TTF format is more stable with pdf-lib than WOFF)
const FONT_URL = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf';

const Dashboard: React.FC = () => {
  const { projects, stories, navigateTo, setCurrentProject, deleteProject, importProject, isOffline, addStory, deleteStory, createProjectFromStory, setCurrentStoryId } = useProject();
  
  // Tabs: 'projects' or 'stories'
  const [activeTab, setActiveTab] = useState<'projects' | 'stories'>('projects');
  const [isExporting, setIsExporting] = useState(false);

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [storyToConvert, setStoryToConvert] = useState<Story | null>(null);

  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateProjectFromStory = async (story: Story) => {
      await createProjectFromStory(story);
      setActiveTab('projects');
  };

  const confirmDeleteProject = () => {
      if (projectToDelete) {
          deleteProject(projectToDelete.id);
          setProjectToDelete(null);
      }
  };

  const confirmDeleteStory = () => {
      if (storyToDelete) {
          deleteStory(storyToDelete.id);
          setStoryToDelete(null);
      }
  };

  const handleCreateNewStory = () => {
      setCurrentStoryId(null);
      navigateTo('story-builder');
  };

  const handleEditStory = (e: React.MouseEvent, storyId: string) => {
      e.stopPropagation();
      setCurrentStoryId(storyId);
      navigateTo('story-builder');
  };
  
  // Export Handler (JSON)
  const handleExportJSON = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${(project.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup.json`);
      document.body.appendChild(downloadAnchorNode); 
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  // --- ARABIC TEXT SHAPING HELPER ---
  const formatTextForPDF = (text: string): string => {
      if (!text) return "";
      
      // Robust resolution for ArabicReshaper class/constructor
      let ReshaperClass: any = ArabicReshaperProxy;
      
      // Check default export
      if (ReshaperClass.default) {
          ReshaperClass = ReshaperClass.default;
      }
      // Check named export if nested
      if (ReshaperClass.ArabicReshaper) {
          ReshaperClass = ReshaperClass.ArabicReshaper;
      }

      // If we still don't have a function, try to find it on the proxy object itself
      if (typeof ReshaperClass !== 'function') {
           // Fallback: If it's an object, look for keys that might be the class
           if ((ArabicReshaperProxy as any).ArabicReshaper) {
               ReshaperClass = (ArabicReshaperProxy as any).ArabicReshaper;
           }
      }

      if (typeof ReshaperClass !== 'function') {
          console.warn("ArabicReshaper library not loaded correctly. Text shaping may fail.");
          return text; // Fallback to raw text
      }

      try {
          const reshaper = new ReshaperClass({
              GoogleNotCompatability: false,
              WorkaroundForLetters: false
          });

          // 1. Reshape Arabic Characters (Connect letters)
          const connected = reshaper.convertArabic(text);

          // 2. Simple BiDi Reordering for PDF LTR Drawing
          // We assume the text is primarily RTL (Kurdish).
          // Strategy: Split by space, reverse word order.
          // For each word: if it has Arabic chars, reverse the characters.
          
          const words = connected.split(' ');
          const reversedWords = words.reverse();
          
          const finalWords = reversedWords.map((word: string) => {
              // Check if word has Arabic characters (range 0600–06FF)
              if (/[\u0600-\u06FF]/.test(word)) {
                  return word.split('').reverse().join('');
              }
              // Preserve English/Numbers direction
              return word;
          });

          return finalWords.join(' ');
      } catch (e) {
          console.error("Error reshaping text:", e);
          return text;
      }
  };

  // --- ADVANCED PDF EXPORT ---
  const handleExportPDF = async (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setIsExporting(true);

      try {
        const pdfDoc = await PDFDocument.create();
        
        // Handle fontkit import robustly (ESM vs Default export)
        const fontkit = (fontkitProxy as any).default || fontkitProxy;
        pdfDoc.registerFontkit(fontkit);
        
        // Fetch and embed Kurdish-compatible font
        let customFont: any;
        try {
            const fontBytes = await fetch(FONT_URL).then(res => {
                if (!res.ok) throw new Error(`Failed to fetch font: ${res.status} ${res.statusText}`);
                return res.arrayBuffer();
            });
            customFont = await pdfDoc.embedFont(fontBytes);
        } catch (fontError) {
            console.error("Font loading error:", fontError);
            alert("کێشە لە دابەزاندنی فۆنتی کوردی. تکایە دڵنیابەرەوە کە ئینتەرنێتەکەت باشە.");
            setIsExporting(false);
            return; // STOP EXECUTION. Do not fallback to standard fonts as they crash on Arabic/Kurdish.
        }
        
        const fontSize = 12;
        const lineHeight = 16;
        const margin = 50;
        const width = 595.28; // A4 Width
        const height = 841.89; // A4 Height
        const contentWidth = width - (margin * 2);

        // Helper: Word Wrap using original text for width calculation
        // but returning reshaped text for drawing?
        // Note: Reshaped chars usually have same width as isolated in many fonts, but strictly speaking 
        // we should measure the reshaped string.
        const wrapAndFormat = (text: string, maxWidth: number) => {
            if (!text) return [];
            
            // Step 1: Reshape first so width calculation is accurate
            // (Connected glyphs might be slightly different width than isolated)
            const shapedText = formatTextForPDF(text);
            
            // Note: Our formatTextForPDF reverses the string for drawing.
            // PDF's measureText might get confused if we pass reversed string?
            // Actually, width of "C B A" is same as "A B C".
            
            const words = shapedText.split(' ');
            // Since shapedText is already reversed (Words reversed, Chars reversed),
            // The first word in 'words' is visually the RIGHT-most word in the original string.
            // But we draw LTR. So we draw the first word first (at left).
            // This is correct for our hack.
            
            const lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = customFont.widthOfTextAtSize(currentLine + " " + word, fontSize);
                if (width < maxWidth) {
                    currentLine += " " + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            lines.push(currentLine);
            return lines;
        };

        // Helper: Add Page & Reset Cursor
        let page = pdfDoc.addPage([width, height]);
        let y = height - margin;

        const checkPageBreak = (neededSpace: number) => {
            if (y - neededSpace < margin) {
                page = pdfDoc.addPage([width, height]);
                y = height - margin;
            }
        };

        // --- 1. COVER PAGE ---
        const titleSize = 24;
        const shapedTitle = formatTextForPDF(project.title);
        const titleWidth = customFont.widthOfTextAtSize(shapedTitle, titleSize);
        page.drawText(shapedTitle, {
            x: (width - titleWidth) / 2,
            y: height / 2 + 50,
            size: titleSize,
            font: customFont,
            color: rgb(0, 0, 0),
        });

        const subtitle = formatTextForPDF(`${project.type} | ${project.genres.join(', ')}`);
        const subWidth = customFont.widthOfTextAtSize(subtitle, 10);
        page.drawText(subtitle, {
            x: (width - subWidth) / 2,
            y: height / 2 + 20,
            size: 10,
            font: customFont,
            color: rgb(0.5, 0.5, 0.5),
        });
        
        if (project.logline) {
             const logLines = wrapAndFormat(project.logline, 400);
             let logY = height / 2 - 20;
             logLines.forEach(line => {
                 const lw = customFont.widthOfTextAtSize(line, 12);
                 page.drawText(line, {
                     x: (width - lw) / 2,
                     y: logY,
                     size: 12,
                     font: customFont,
                     color: rgb(0.2, 0.2, 0.2)
                 });
                 logY -= 18;
             });
        }

        // --- 2. DETAILED STORY ---
        if (project.detailedStory) {
            page = pdfDoc.addPage([width, height]);
            y = height - margin;
            
            page.drawText("Detailed Story", { x: margin, y, size: 18, font: customFont, color: rgb(0.2, 0.2, 0.2) });
            y -= 30;

            const storyLines = project.detailedStory.split('\n');
            storyLines.forEach(para => {
                const lines = wrapAndFormat(para, contentWidth);
                lines.forEach(line => {
                    checkPageBreak(16);
                    // Right Align Attempt: For proper RTL feel, we align text to Right.
                    // Since our string is reversed ("3 2 1"), drawing it at X aligns '3' at X.
                    // If we want '1' (start of sentence) to be at the Right Margin,
                    // we need to calculate where to start drawing.
                    // In our reversed logic, the first char drawn is the "Right most" char.
                    // So we align to the Right Margin.
                    
                    const tw = customFont.widthOfTextAtSize(line, 12);
                    page.drawText(line, { x: width - margin - tw, y, size: 12, font: customFont });
                    y -= 16;
                });
                y -= 10; // Para spacing
            });
        }

        // --- 3. BLUEPRINT PLAN (STYLED) ---
        if (project.blueprint) {
            page = pdfDoc.addPage([width, height]);
            y = height - margin;
            
            page.drawText("Blueprint & Structure", { x: margin, y, size: 18, font: customFont, color: rgb(0.3, 0.3, 0.9) });
            y -= 40;

            const lines = project.blueprint.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;

                // Style: ACT (#)
                if (line.startsWith('# ')) {
                    const text = formatTextForPDF(line.replace('# ', ''));
                    checkPageBreak(60);
                    y -= 20;
                    
                    // Draw Box
                    page.drawRectangle({
                        x: margin, y: y - 10, width: contentWidth, height: 40,
                        color: rgb(0.1, 0.1, 0.1),
                    });
                    
                    const tw = customFont.widthOfTextAtSize(text, 16);
                    page.drawText(text, {
                        x: (width - tw) / 2,
                        y: y + 5,
                        size: 16,
                        font: customFont,
                        color: rgb(1, 1, 1)
                    });
                    y -= 40;
                }
                // Style: SEQUENCE / EPISODE (##)
                else if (line.startsWith('## ')) {
                    const originalText = line.replace('## ', '');
                    const text = formatTextForPDF(originalText);
                    checkPageBreak(40);
                    y -= 15;
                    
                    // Purple Box for Episodes
                    if (originalText.toLowerCase().includes('episode') || originalText.includes('ئەڵقە')) {
                        page.drawRectangle({
                            x: margin, y: y - 5, width: contentWidth, height: 30,
                            color: rgb(0.4, 0.1, 0.5), // Purple
                        });
                        const tw = customFont.widthOfTextAtSize(text, 14);
                        page.drawText(text, { x: width - margin - tw - 10, y: y + 5, size: 14, font: customFont, color: rgb(1, 1, 1) });
                    } else {
                        // Emerald/Dark for Sequences
                        const tw = customFont.widthOfTextAtSize(text, 14);
                        page.drawText(text, { x: width - margin - tw, y, size: 14, font: customFont, color: rgb(0.2, 0.6, 0.4) });
                        page.drawLine({ start: { x: margin, y: y-2 }, end: { x: width-margin, y: y-2 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
                    }
                    y -= 25;
                }
                // Style: SCENE (###)
                else if (line.startsWith('### ')) {
                    const text = formatTextForPDF(line.replace('### ', ''));
                    checkPageBreak(20);
                    const tw = customFont.widthOfTextAtSize(text, 12);
                    // Bullet point style
                    page.drawCircle({ x: width - margin - 5, y: y + 4, size: 3, color: rgb(0.4, 0.4, 1) });
                    page.drawText(text, { x: width - margin - tw - 15, y, size: 12, font: customFont, color: rgb(0.2, 0.2, 0.2) });
                    y -= 18;
                }
                // Standard Text
                else {
                    const wrapped = wrapAndFormat(trimmed, contentWidth - 20);
                    wrapped.forEach(l => {
                        checkPageBreak(14);
                        const tw = customFont.widthOfTextAtSize(l, 11);
                        page.drawText(l, { x: width - margin - tw, y, size: 11, font: customFont, color: rgb(0.3, 0.3, 0.3) });
                        y -= 14;
                    });
                }
            });
        }

        // --- 4. SCRIPT / SCENES ---
        if (project.scenes.length > 0) {
            page = pdfDoc.addPage([width, height]);
            y = height - margin;
            
            page.drawText("Script", { x: margin, y, size: 18, font: customFont, color: rgb(0, 0, 0) });
            y -= 40;

            // Sort scenes
            const sortedScenes = [...project.scenes].sort((a,b) => a.number - b.number);

            sortedScenes.forEach(scene => {
                checkPageBreak(60); // Ensure header fits
                
                // Scene Header (Slugline) style
                page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 20, color: rgb(0.9, 0.9, 0.9) });
                const headerText = formatTextForPDF(`${scene.number}. ${scene.title.toUpperCase()}`);
                
                // Align Slugline Right (Standard for Kurdish)
                const htW = customFont.widthOfTextAtSize(headerText, 12);
                page.drawText(headerText, { x: width - margin - htW - 5, y, size: 12, font: customFont, color: rgb(0,0,0) });
                y -= 30;

                // Content Parser
                const contentParts = scene.content.split(/(<div class="[^"]+">.*?<\/div>)/g);
                
                contentParts.forEach(part => {
                    if (!part.trim()) return;
                    
                    let text = part.replace(/<[^>]+>/g, '').trim();
                    let type = 'action';
                    if (part.includes('sp-character')) type = 'character';
                    if (part.includes('sp-dialogue')) type = 'dialogue';
                    if (part.includes('sp-parenthetical')) type = 'parenthetical';
                    if (part.includes('sp-slug')) type = 'slug'; 
                    if (part.includes('sp-transition')) type = 'transition';

                    if (!text) return;

                    // Screenplay Layout Math
                    let xOffset = margin;
                    let maxWidth = contentWidth;
                    let align = 'right'; // RTL Default
                    
                    if (type === 'character') {
                        xOffset = margin + 180; // Center-ish
                        maxWidth = 200;
                        align = 'center';
                    } else if (type === 'dialogue') {
                        xOffset = margin + 100;
                        maxWidth = 350;
                        align = 'center'; 
                    } else if (type === 'parenthetical') {
                        xOffset = margin + 140;
                        maxWidth = 250;
                        align = 'center';
                    } else if (type === 'transition') {
                        xOffset = margin; // Left
                        align = 'left';
                    }

                    const wrapped = wrapAndFormat(text, maxWidth);
                    wrapped.forEach(l => {
                        checkPageBreak(12);
                        const lw = customFont.widthOfTextAtSize(l, 12);
                        
                        let drawX = xOffset;
                        // Adjust X for RTL alignment within the "Block"
                        if (align === 'right') {
                            drawX = width - margin - lw; 
                        } else if (align === 'center') {
                            drawX = (width - lw) / 2;
                        }

                        page.drawText(l, { x: drawX, y, size: 12, font: customFont });
                        y -= 14;
                    });
                    
                    y -= 6; // Spacing between blocks
                });

                y -= 20; // Spacing between scenes
            });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project.title.replace(/\s+/g, '_')}_Full_Script.pdf`;
        link.click();

      } catch (err) {
          console.error("PDF Export failed", err);
          alert("ببورە، کێشەیەک ڕوویدا لە دروستکردنی PDF.");
      } finally {
          setIsExporting(false);
      }
  };

  // Import Handlers
  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              importProject(json);
              alert("پڕۆژە بە سەرکەوتوویی هاوردە کرا!");
          } catch (err) {
              alert("نەتوانرا فایلەکە بخوێنرێتەوە. دڵنیابەرەوە کە فایلی زۆری دروستە.");
              console.error(err);
          }
      };
      reader.readAsText(file);
      e.target.value = ''; 
  };

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto relative bg-zinc-950">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                 <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">داشبۆرد</h1>
                 <p className="text-xs text-zinc-500">بەخێربێیتەوە بۆ زۆری. ئامادەیت بۆ نووسین؟</p>
            </div>
            
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                <button 
                  onClick={() => setActiveTab('projects')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'projects' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <FileText className="w-4 h-4" /> پڕۆژەکان
                </button>
                <button 
                  onClick={() => setActiveTab('stories')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'stories' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <Book className="w-4 h-4" /> چیرۆکەکان
                </button>
            </div>
        </div>

        {isOffline && (
            <div className="mb-6 bg-amber-950/40 border border-amber-500/20 p-4 rounded-xl flex items-start gap-4" dir="rtl">
                <div className="bg-amber-500/10 p-2.5 rounded-lg flex-shrink-0">
                    <WifiOff className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-200 mb-1">پەیوەندی بە داتابەیسەوە نییە</h3>
                    <p className="text-xs text-amber-400/80">هەندێک تایبەتمەندی وەک دروستکردنی چیرۆک بە AI لەوانەیە کار نەکەن.</p>
                </div>
            </div>
        )}
        
        {/* --- PROJECTS TAB --- */}
        {activeTab === 'projects' && (
            <>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">پڕۆژە چالاکەکان</h2>
                    <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                        <button onClick={handleImportClick} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded flex items-center gap-2 border border-zinc-800">
                            <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">هاوردەکردن</span>
                        </button>
                        <button onClick={() => setActiveTab('stories')} className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-2 shadow-lg shadow-primary-900/20">
                            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">پڕۆژەی نوێ</span>
                        </button>
                    </div>
                </div>

                {projects.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                         <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                             <FileText className="w-8 h-8 text-zinc-600" />
                         </div>
                         <h3 className="text-lg font-medium text-zinc-300 mb-2">هیچ پڕۆژەیەک نییە</h3>
                         <p className="text-sm text-zinc-500 max-w-xs text-center mb-6">سەرەتا چیرۆکێک دروست بکە، پاشان بیکە بە پڕۆژە بۆ دەستکردن بە نووسین.</p>
                         <button onClick={() => setActiveTab('stories')} className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition">چوونە بەشی چیرۆکەکان</button>
                     </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {projects.map(project => (
                        <div 
                            key={project.id}
                            onClick={() => { setCurrentProject(project.id); navigateTo('editor'); }} 
                            className="group flex flex-col p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 cursor-pointer transition relative h-full min-h-[180px]"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg ${project.type === 'Screenplay' ? 'bg-primary-900/20 text-primary-400' : project.type === 'Serial' ? 'bg-purple-900/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'} flex items-center justify-center border border-white/5`}>
                                        {project.type === 'Screenplay' ? <Clapperboard className="w-5 h-5" /> : project.type === 'Serial' ? <Tv className="w-5 h-5" /> : <Book className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white line-clamp-1 leading-tight">{project.title}</h3>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">{project.type} • {project.genres?.[0] || 'General'}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
                                    className="text-zinc-600 hover:text-red-500 transition opacity-100 md:opacity-0 group-hover:opacity-100 p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 mb-4">
                                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
                                    {project.logline || 'هیچ کورتەیەک زیاد نەکراوە بۆ ئەم پڕۆژەیە...'}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 mt-auto">
                                <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={(e) => handleExportJSON(e, project)} className="text-zinc-500 hover:text-zinc-200 transition" title="Backup JSON">
                                        <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={(e) => handleExportPDF(e, project)} className="text-zinc-500 hover:text-red-400 transition" title="Export PDF">
                                        {isExporting ? <span className="animate-spin">⌛</span> : <FileDown className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                    {new Date(project.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </>
        )}

        {/* --- STORIES TAB --- */}
        {activeTab === 'stories' && (
            <>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">بیرۆکە و چیرۆکەکان</h2>
                    <button onClick={handleCreateNewStory} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-4 py-2 rounded flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                        <Sparkles className="w-3.5 h-3.5" /> <span className="hidden sm:inline">دروستکردنی چیرۆک بە AI</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* New Story Card */}
                    <div 
                        onClick={handleCreateNewStory}
                        className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl hover:bg-zinc-900 hover:border-emerald-500/50 cursor-pointer transition min-h-[200px] group"
                    >
                        <div className="w-12 h-12 rounded-full bg-emerald-900/20 group-hover:bg-emerald-600 text-emerald-500 group-hover:text-white flex items-center justify-center mb-3 transition">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-300 group-hover:text-white">چیرۆکێکی نوێ دروست بکە</h3>
                        <p className="text-xs text-zinc-500 text-center mt-2 max-w-[200px]">با زیرەکی دەستکرد یارمەتیت بدات لە گەڵاڵەکردنی بیرۆکەکە.</p>
                    </div>

                    {stories.map(story => (
                        <div key={story.id} className="group flex flex-col p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition relative h-full min-h-[200px]">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-900/20 text-indigo-400 flex items-center justify-center border border-white/5">
                                        <Book className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white line-clamp-1 leading-tight">{story.title}</h3>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">{story.structuredData?.type || 'Story'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                                     <button 
                                        onClick={(e) => handleEditStory(e, story.id)}
                                        className="text-zinc-600 hover:text-emerald-500 p-1"
                                        title="دەستکاری"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setStoryToDelete(story); }}
                                        className="text-zinc-600 hover:text-red-500 p-1"
                                        title="سڕینەوە"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 mb-4">
                                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
                                    {story.summary || 'هیچ کورتەیەک نییە.'}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 mt-auto">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleCreateProjectFromStory(story); }}
                                    className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition"
                                >
                                    <Play className="w-2.5 h-2.5 fill-current" /> کردن بە پڕۆژە
                                </button>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                    {new Date(story.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    
                    {stories.length === 0 && (
                         <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                             <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                                 <Book className="w-8 h-8 text-zinc-600" />
                             </div>
                             <h3 className="text-lg font-medium text-zinc-300 mb-2">هیچ چیرۆکێک نییە</h3>
                             <p className="text-sm text-zinc-500 max-w-xs text-center mb-6">یەکەم چیرۆکت دروست بکە بە یارمەتی زیرەکی دەستکرد.</p>
                             <button onClick={handleCreateNewStory} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition">دروستکردنی چیرۆک</button>
                         </div>
                    )}
                </div>
            </>
        )}
      </div>

      {/* Confirmation Modal for Project Deletion */}
      {projectToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">سڕینەوەی پڕۆژە</h3>
                  <p className="text-sm text-zinc-400 mb-6">ئایا دڵنیایت دەتەوێت پڕۆژەی "{projectToDelete.title}" بسڕیتەوە؟ ئەم کرداره گەڕانەوەی نییە.</p>
                  <div className="flex gap-3 justify-end">
                      <button onClick={() => setProjectToDelete(null)} className="text-xs text-zinc-400 hover:text-white px-3 py-2">پاشگەزبوونەوە</button>
                      <button onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-4 py-2 rounded">سڕینەوە</button>
                  </div>
              </div>
          </div>
      )}

      {/* Confirmation Modal for Story Deletion */}
      {storyToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">سڕینەوەی چیرۆک</h3>
                  <p className="text-sm text-zinc-400 mb-6">ئایا دڵنیایت دەتەوێت چیرۆکی "{storyToDelete.title}" بسڕیتەوە؟</p>
                  <div className="flex gap-3 justify-end">
                      <button onClick={() => setStoryToDelete(null)} className="text-xs text-zinc-400 hover:text-white px-3 py-2">پاشگەزبوونەوە</button>
                      <button onClick={confirmDeleteStory} className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-4 py-2 rounded">سڕینەوە</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
