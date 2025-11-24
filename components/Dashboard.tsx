
import React, { useState, useRef } from 'react';
import { FileText, Clock, Users, Book, ChevronLeft, Plus, Trash2, AlertTriangle, X, Clapperboard, Tv, Upload, Download, FileDown } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Project, ProjectType, ProjectFormat } from '../types';
import { PDFDocument, rgb } from 'pdf-lib';
import html2canvas from 'html2canvas';

const GENRES = [
    "ئەکشن", "سەرکێشی", "ئەنیمەیشن", "ژیاننامە", "کۆمێدی", "تاوان", "سایبەرپانک", 
    "کارەسات", "بەڵگەنامەیی", "دراما", "خێزانی", "فەنتازیا", "فیلم نۆیر", "مێژوویی", 
    "ترسناک", "مۆسیقا", "موزیکاڵ", "میدتێری", "دەروونی", "ڕۆمانسی", "خەیاڵی زانستی", 
    "کورتە", "سلاشەر", "وەرزشی", "سیخوڕی", "ستیمپانک", "سوپەرهیرۆ", "هەستبزوێن", "جەنگ", "وێستێرن"
];

const Dashboard: React.FC = () => {
  const { projects, navigateTo, setCurrentProject, addProject, deleteProject, importProject } = useProject();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('Screenplay');
  const [projectFormat, setProjectFormat] = useState<ProjectFormat>('Feature');
  const [newGenres, setNewGenres] = useState<string[]>(['خەیاڵی زانستی']);
  const [newLogline, setNewLogline] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [newSetting, setNewSetting] = useState('');
  const [newGoal, setNewGoal] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGenres.length === 0) {
        alert("تکایە لانی کەم ژانرێک دیاری بکە.");
        return;
    }
    
    addProject(newTitle, projectType, projectFormat, newGenres, {
        logline: newLogline,
        theme: newTheme,
        setting: newSetting,
        protagonistGoal: newGoal
    });
    
    setShowNewProjectModal(false);
    // Reset
    setNewTitle('');
    setProjectType('Screenplay');
    setProjectFormat('Feature');
    setNewGenres(['خەیاڵی زانستی']);
    setNewLogline('');
    setNewTheme('');
    setNewSetting('');
    setNewGoal('');
  };

  const toggleGenre = (genre: string) => {
      if (newGenres.includes(genre)) {
          setNewGenres(newGenres.filter(g => g !== genre));
      } else {
          if (newGenres.length >= 5) return; // Max 5 limit
          setNewGenres([...newGenres, genre]);
      }
  };

  const confirmDelete = () => {
      if (projectToDelete) {
          deleteProject(projectToDelete.id);
          setProjectToDelete(null);
      }
  };
  
  // Export Handler (JSON)
  const handleExportJSON = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup.json`);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  // Export Handler (PDF) with Robust Page Breaking and Unicode Support
  const handleExportPDF = async (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      document.body.style.cursor = 'wait';
      
      try {
        const pdfDoc = await PDFDocument.create();
        
        // A4 Dimensions (Points)
        const pdfWidth = 595.28; 
        const pdfHeight = 841.89;
        
        // HTML rendering dimensions (Pixels at approx 96 DPI)
        // We use a fixed width container for consistent rendering
        const pixelWidth = 794; 
        const pixelHeight = 1123; 
        const margin = 96; // 1 inch approx (96px)
        
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap');

            .pdf-export-wrapper {
                font-family: 'Noto Kufi Arabic', monospace;
                color: #000000;
                background: #ffffff;
                width: ${pixelWidth}px;
                position: absolute;
                top: 0;
                right: -9999px; /* Moved offscreen to right */
                z-index: 10000;
                direction: rtl; /* Force RTL for PDF capture */
            }
            .pdf-page {
                width: ${pixelWidth}px;
                height: ${pixelHeight}px;
                padding: ${margin}px;
                box-sizing: border-box;
                background: #ffffff;
                position: relative;
                display: flex;
                flex-direction: column;
                overflow: hidden; 
            }
            .pdf-page * {
                color: #000000 !important;
                background: transparent !important;
                border-color: #000000 !important;
                text-shadow: none !important;
                box-shadow: none !important;
            }
            
            /* Screenplay Formatting Overrides for Black Text and RTL */
            .sp-slug { 
                font-weight: bold; 
                text-transform: none !important; 
                margin-top: 24px; 
                margin-bottom: 8px; 
                font-size: 14px; 
                line-height: 1.2; 
                text-align: right; 
                color: #000000 !important;
                letter-spacing: normal !important;
            }
            .sp-action { 
                margin-bottom: 12px; 
                line-height: 1.2; 
                font-size: 14px; 
                text-align: right; 
                color: #000000 !important;
                letter-spacing: normal !important;
            }
            .sp-character { 
                text-align: center; 
                width: 60%;
                margin: 18px auto 0 auto;
                padding: 0;
                font-weight: bold; 
                font-size: 14px; 
                line-height: 1.2; 
                color: #000000 !important;
                letter-spacing: normal !important;
                text-transform: none !important;
            }
            .sp-dialogue { 
                text-align: center; 
                width: 70%;
                margin: 0 auto 12px auto;
                padding: 0;
                line-height: 1.2; 
                font-size: 14px; 
                color: #000000 !important;
                letter-spacing: normal !important;
            }
            .sp-parenthetical { 
                text-align: center; 
                width: 50%;
                margin: 0 auto;
                padding: 0;
                font-size: 12px; 
                margin-bottom: 0; 
                line-height: 1.2; 
                color: #000000 !important;
                letter-spacing: normal !important;
            }
            .sp-transition { 
                text-align: left; /* Left for End in RTL */
                text-transform: none !important; 
                margin-top: 18px; 
                margin-bottom: 18px; 
                font-size: 14px; 
                line-height: 1.2; 
                color: #000000 !important;
                letter-spacing: normal !important;
            }
            .novel-chapter { 
                font-size: 24px; 
                font-weight: bold; 
                text-align: center; 
                margin-bottom: 30px; 
                margin-top: 40px; 
                page-break-before: always; 
                color: #000000 !important;
                letter-spacing: normal !important;
            }
            p { 
                margin-bottom: 12px; 
                line-height: 1.5; 
                text-indent: 24px; 
                font-size: 14px; 
                color: #000000 !important;
                letter-spacing: normal !important;
            }
            
            .title-page-content {
                text-align: center;
                margin-top: 250px;
                display: flex;
                flex-direction: column;
                align-items: center;
                color: #000000 !important;
            }
        `;

        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-export-wrapper';
        wrapper.setAttribute('dir', 'rtl');
        const styleTag = document.createElement('style');
        styleTag.innerHTML = css;
        wrapper.appendChild(styleTag);
        document.body.appendChild(wrapper);

        const addPageToPDF = async (element: HTMLElement, pageNum?: number) => {
            const canvas = await html2canvas(element, {
                scale: 2, 
                logging: false,
                useCORS: true,
                windowWidth: pixelWidth,
                height: pixelHeight,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const all = clonedDoc.querySelectorAll('*');
                    all.forEach((el: any) => {
                         if (el.style) {
                             el.style.color = '#000000';
                             el.style.borderColor = '#000000';
                             // Ensure letter spacing is reset for all elements in the clone
                             el.style.letterSpacing = 'normal';
                         }
                    });
                }
            });
            
            const imgData = canvas.toDataURL('image/png');
            const img = await pdfDoc.embedPng(imgData);
            const page = pdfDoc.addPage([pdfWidth, pdfHeight]);
            
            page.drawImage(img, {
                x: 0,
                y: 0,
                width: pdfWidth,
                height: pdfHeight
            });

            if (pageNum !== undefined) {
                 // In RTL, page number usually bottom left or center
                 page.drawText(`${pageNum}.`, {
                     x: 50, // Left side
                     y: 30,
                     size: 10,
                     color: rgb(0, 0, 0)
                 });
            }
        };

        // --- Title Page ---
        const titlePage = document.createElement('div');
        titlePage.className = 'pdf-page';
        titlePage.innerHTML = `
            <div class="title-page-content">
                <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 10px; text-transform: none; letter-spacing: normal;">${project.title}</h1>
                <p style="font-size: 14px; margin-bottom: 40px; color: #000;">فۆرماتی ${project.type}</p>
                <div style="height: 40px;"></div>
                <p style="font-size: 12px; color: #333;">نووسراوە لەلایەن</p>
                <p style="font-size: 16px; font-weight: bold; margin-bottom: 20px;">نووسەر</p>
                ${project.logline ? `<p style="font-size: 12px; font-style: italic; max-width: 400px; color: #444; margin-top: 40px;">${project.logline}</p>` : ''}
            </div>
        `;
        wrapper.appendChild(titlePage);
        
        await document.fonts.ready;
        // Increased timeout to ensure fonts and layout settle for RTL
        await new Promise(resolve => setTimeout(resolve, 500));

        await addPageToPDF(titlePage); 
        wrapper.removeChild(titlePage);

        // --- Content Pages ---
        const sourceDiv = document.createElement('div');
        const fullContent = [...project.scenes].sort((a,b) => a.number - b.number).map(s => s.content).join("");
        sourceDiv.innerHTML = fullContent;
        const children = Array.from(sourceDiv.childNodes);

        let currentPage = document.createElement('div');
        currentPage.className = 'pdf-page';
        wrapper.appendChild(currentPage);
        
        let pageNumber = 1;

        for (const child of children) {
            if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) continue;

            const clone = child.cloneNode(true) as HTMLElement;
            currentPage.appendChild(clone);
            
            if (currentPage.scrollHeight > pixelHeight) {
                currentPage.removeChild(clone);
                await addPageToPDF(currentPage, pageNumber++);
                wrapper.removeChild(currentPage);
                currentPage = document.createElement('div');
                currentPage.className = 'pdf-page';
                wrapper.appendChild(currentPage);
                currentPage.appendChild(clone);
            }
        }
        
        if (currentPage.childNodes.length > 0) {
            await addPageToPDF(currentPage, pageNumber);
        }

        document.body.removeChild(wrapper);

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        link.click();

      } catch (err) {
          console.error("PDF Gen Error", err);
          alert("تێکچوونێک ڕوویدا لە دروستکردنی PDF. تکایە دووبارە هەوڵبدەوە.");
      } finally {
          document.body.style.cursor = 'default';
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
      e.target.value = ''; // reset so same file can be selected again
  };

  // Calculate Stats
  const totalWords = projects.reduce((acc, p) => acc + p.scenes.reduce((sAcc, s) => sAcc + s.content.length / 5, 0), 0); // Rough estimate
  const totalChars = projects.reduce((acc, p) => acc + p.characters.length, 0);

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto relative">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6 pl-0 md:pl-0">
            <div className="flex items-center gap-4">
                 <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">داشبۆرد</h1>
            </div>
            
            <div className="flex gap-2">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".json" 
                    className="hidden" 
                />
                <button 
                    onClick={handleImportClick}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded flex items-center gap-2 shadow-lg border border-zinc-700/50"
                >
                    <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">هاوردەکردن</span>
                </button>
                <button 
                    onClick={() => setShowNewProjectModal(true)}
                    className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-2 shadow-lg shadow-primary-900/20"
                >
                    <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">پڕۆژەی نوێ</span>
                </button>
            </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">کۆی وشەکان</span>
              <FileText className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-mono text-zinc-100">{Math.floor(totalWords)}</div>
            <div className="text-xxs text-emerald-500 mt-1 flex items-center gap-1">+١٥% لە هەفتەی پێشوو</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">تێکڕای دانیشتن</span>
              <Clock className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-mono text-zinc-100">٤٢ خولەک</div>
            <div className="text-xxs text-zinc-500 mt-1">جێگیر</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg col-span-1 sm:col-span-2 md:col-span-1">
            <div className="flex justify-between items-start mb-3">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">کاراکتەرەکان</span>
              <Users className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-mono text-zinc-100">{totalChars}</div>
            <div className="text-xxs text-primary-500 mt-1 flex items-center gap-1">{projects.length} پڕۆژە</div>
          </div>
        </div>

        {/* Projects List - Responsive Grid */}
        <h2 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wide">پڕۆژەکانی ڕابردوو</h2>
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
                        <button 
                            onClick={(e) => handleExportPDF(e, project)}
                            className="text-zinc-500 hover:text-zinc-200 transition"
                            title="PDF"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={(e) => handleExportJSON(e, project)}
                            className="text-zinc-500 hover:text-zinc-200 transition"
                            title="JSON"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono">
                        {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal - Responsive Fix with fixed position for keyboard friendliness */}
      {showNewProjectModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/80 backdrop-blur-sm">
              <div 
                  className="bg-zinc-900 border-t sm:border border-zinc-800 p-6 rounded-t-2xl sm:rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90dvh] h-auto sm:h-auto overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
                  style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              >
                  <h3 className="text-lg font-medium text-zinc-100 mb-4 flex-shrink-0">دەستپێکردنی پڕۆژەی نوێ</h3>
                  <form onSubmit={handleCreate} className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar pb-2">
                      {/* ... Form Content ... */}
                      <div className="space-y-3">
                          <label className="block text-xs text-zinc-500 font-semibold uppercase tracking-wider">جۆر هەڵبژێرە</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div 
                                onClick={() => setProjectType('Screenplay')}
                                className={`cursor-pointer p-3 rounded-lg border text-center transition flex flex-col items-center gap-2 ${projectType === 'Screenplay' ? 'bg-primary-600/10 border-primary-600 text-primary-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                              >
                                  <Clapperboard className="w-5 h-5" />
                                  <span className="text-xs font-medium">سیناریۆ</span>
                              </div>
                              <div 
                                onClick={() => { setProjectType('Novel'); setProjectFormat('Standard'); }}
                                className={`cursor-pointer p-3 rounded-lg border text-center transition flex flex-col items-center gap-2 ${projectType === 'Novel' ? 'bg-primary-600/10 border-primary-600 text-primary-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                              >
                                  <Book className="w-5 h-5" />
                                  <span className="text-xs font-medium">ڕۆمان</span>
                              </div>
                              <div 
                                onClick={() => { setProjectType('Serial'); setProjectFormat('Episode'); }}
                                className={`cursor-pointer p-3 rounded-lg border text-center transition flex flex-col items-center gap-2 ${projectType === 'Serial' ? 'bg-primary-600/10 border-primary-600 text-primary-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                              >
                                  <Tv className="w-5 h-5" />
                                  <span className="text-xs font-medium">زنجیرە</span>
                              </div>
                          </div>
                      </div>

                      {projectType === 'Screenplay' && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                              <label className="block text-xs text-zinc-500">فۆرماتی سیناریۆ</label>
                              <div className="flex flex-col sm:flex-row gap-3">
                                  <button 
                                    type="button"
                                    onClick={() => setProjectFormat('Feature')}
                                    className={`flex-1 py-2 text-xs rounded border transition ${projectFormat === 'Feature' ? 'bg-zinc-800 border-primary-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                                  >
                                      فیلمی درێژ
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setProjectFormat('Short')}
                                    className={`flex-1 py-2 text-xs rounded border transition ${projectFormat === 'Short' ? 'bg-zinc-800 border-primary-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                                  >
                                      فیلمی کورت
                                  </button>
                              </div>
                          </div>
                      )}

                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs text-zinc-500 mb-1">ناونیشان</label>
                              <input 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                required
                                placeholder={projectType === 'Screenplay' ? "نموونە: مەریخییەکە" : "نموونە: گاتسبی مەزن"}
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-zinc-500 mb-2">ژانر (تا ٥ دانە دیاری بکە)</label>
                              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-zinc-800 rounded bg-zinc-950/50">
                                  {GENRES.map(genre => (
                                      <button
                                        key={genre}
                                        type="button"
                                        onClick={() => toggleGenre(genre)}
                                        className={`text-xs px-2 py-1 rounded border transition ${
                                            newGenres.includes(genre) 
                                            ? 'bg-primary-600 border-primary-500 text-white' 
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                                        }`}
                                      >
                                          {genre}
                                      </button>
                                  ))}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                  {newGenres.map(g => (
                                      <span key={g} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-900/30 text-primary-300 border border-primary-500/20 text-xxs">
                                          {g} <X className="w-2.5 h-2.5 cursor-pointer hover:text-white" onClick={() => toggleGenre(g)} />
                                      </span>
                                  ))}
                              </div>
                          </div>
                      </div>
                      
                      <div className="border-t border-zinc-800 pt-4 mt-2">
                          <p className="text-xs text-zinc-400 mb-4">یارمەتی زیرەکی دەستکرد بدە لە تێگەیشتن لە چیرۆکەکەت:</p>
                          
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs text-zinc-500 mb-1">کورتەی چیرۆک (چیرۆکەکە دەربارەی چییە؟)</label>
                                  <textarea 
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none h-16 resize-none"
                                      value={newLogline}
                                      onChange={e => setNewLogline(e.target.value)}
                                      placeholder="نموونە: ئاسمانەوانێک لەسەر مەریخ گیر دەخوات..."
                                  />
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs text-zinc-500 mb-1">بابەت (Theme)</label>
                                      <input 
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none"
                                          value={newTheme}
                                          onChange={e => setNewTheme(e.target.value)}
                                          placeholder="نموونە: مانەوە دژی سروشت"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs text-zinc-500 mb-1">شوێن و کات</label>
                                      <input 
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none"
                                          value={newSetting}
                                          onChange={e => setNewSetting(e.target.value)}
                                          placeholder="نموونە: مەریخ، ٢٠٣٥"
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-xs text-zinc-500 mb-1">ئامانجی پاڵەوان</label>
                                  <input 
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none"
                                      value={newGoal}
                                      onChange={e => setNewGoal(e.target.value)}
                                      placeholder="نموونە: مانەوە تا گەیشتنی تیمەکە"
                                  />
                              </div>
                          </div>
                      </div>
                  </form>
                  <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800 flex-shrink-0">
                      <button type="button" onClick={() => setShowNewProjectModal(false)} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2">پاشگەزبوونەوە</button>
                      <button type="submit" onClick={handleCreate} className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-4 py-2 rounded">دروستکردن</button>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-sm shadow-2xl">
                  <div className="flex flex-col items-center text-center mb-4">
                      <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-3">
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-100">سڕینەوەی پڕۆژە؟</h3>
                      <p className="text-xs text-zinc-400 mt-1">
                          ئایا دڵنیایت دەتەوێت <span className="font-bold text-zinc-200">{projectToDelete.title}</span> بسڕیتەوە؟ ئەم کردارە پاشگەزبوونەوەی نییە.
                      </p>
                  </div>
                  
                  <div className="flex gap-3 justify-center mt-6">
                      <button 
                          onClick={() => setProjectToDelete(null)} 
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-4 py-2.5 rounded transition"
                      >
                          نەخێر
                      </button>
                      <button 
                          onClick={confirmDelete} 
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-4 py-2.5 rounded transition shadow-lg shadow-red-900/20"
                      >
                          بەڵێ، بسڕەوە
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
