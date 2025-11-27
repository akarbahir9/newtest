import React, { useState } from 'react';
import { Image, Sparkles, Loader2, CheckCircle2, AlertTriangle, X, CheckSquare, Square, Trash2, Eye } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const Locations: React.FC = () => {
  const { currentProject, addLocation, deleteLocation, bulkDeleteItems, importLocationsFromBlueprint, showConfirmation } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'INT' | 'EXT' | 'MIXED'>('INT');
  const [description, setDescription] = useState('');
  
  const [isImporting, setIsImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      addLocation({ name, type, description });
      setShowModal(false);
      setName(''); setDescription('');
      setStatusMsg({ type: 'success', text: 'شوێن زیادکرا.' });
      setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleImport = async () => {
      const blueprint = currentProject?.blueprint || currentProject?.detailedStory;
      
      if (!blueprint || blueprint.trim().length < 50) {
          setStatusMsg({ 
              type: 'error', 
              text: 'تکایە سەرەتا پلانێکی تێروتەسەل دابنێ لە بەشی "پوختە" (Blueprint) بۆ ئەوەی بتوانم شوێنەکان دەربهێنم.' 
          });
          return;
      }

      setIsImporting(true);
      setStatusMsg({ type: 'info', text: 'خەریکی شیکردنەوەی پلان و دروستکردنی وێنەی شوێنەکانم...' });

      try {
          const count = await importLocationsFromBlueprint(blueprint);
          
          if (count > 0) {
              setStatusMsg({ type: 'success', text: `${count} شوێن زیادکران. وێنەکان لە پاشبنەما (Background) دروست دەکرێن.` });
          } else {
              setStatusMsg({ type: 'info', text: 'هیچ شوێنێکی نوێ لە پلانەکەدا نەدۆزرایەوە، یان هەموویان پێشتر تۆمارکراون.' });
          }
      } catch (error) {
          console.error(error);
          setStatusMsg({ type: 'error', text: 'کێشەیەک ڕوویدا لە کاتی شیکردنەوەی پلانەکە.' });
      } finally {
          setIsImporting(false);
      }
  };

  const handleDeleteSingle = (id: string, name: string) => {
      showConfirmation(`ئایا دڵنیایت دەتەوێت شوێنی "${name}" بسڕیتەوە؟`, () => {
          deleteLocation(id);
          if (selectedIds.has(id)) {
              const newSet = new Set(selectedIds);
              newSet.delete(id);
              setSelectedIds(newSet);
          }
          setStatusMsg({ type: 'success', text: 'شوێن سڕایەوە.' });
          setTimeout(() => setStatusMsg(null), 3000);
      });
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (!currentProject) return;
      if (selectedIds.size === currentProject.locations.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(currentProject.locations.map(l => l.id)));
      }
  };

  const handleBulkDelete = () => {
      if (selectedIds.size === 0) return;
      showConfirmation(`ئایا دڵنیایت دەتەوێت ${selectedIds.size} شوێن بسڕیتەوە؟`, () => {
          const items = Array.from(selectedIds).map(id => ({ id, type: 'location' as const }));
          bulkDeleteItems(items);
          setSelectedIds(new Set());
          setStatusMsg({ type: 'success', text: `${items.length} شوێن سڕانەوە.` });
          setTimeout(() => setStatusMsg(null), 3000);
      });
  };

  if (!currentProject) return <div className="p-8 text-zinc-500">تکایە پڕۆژەیەک هەڵبژێرە.</div>;

  const allSelected = currentProject.locations.length > 0 && selectedIds.size === currentProject.locations.length;

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto relative">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 gap-4">
            <div>
                 <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">شوێنەکان</h1>
                 <p className="text-sm text-zinc-500 mt-1">شوێنەکانی پڕۆژەی <span className="text-primary-400">{currentProject.title}</span>.</p>
            </div>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
                <button 
                    onClick={toggleSelectAll}
                    className={`text-xs font-medium px-3 py-2 rounded-lg border transition flex items-center gap-2 ${allSelected ? 'bg-primary-900/20 border-primary-500/30 text-primary-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                    title="دیاریکردنی هەمووی"
                >
                    {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">دیاریکردن</span>
                </button>

                {selectedIds.size > 0 && (
                    <button 
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition flex-shrink-0 flex items-center gap-2 animate-in fade-in zoom-in"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">سڕینەوەی ({selectedIds.size})</span>
                    </button>
                )}

                <button 
                    onClick={handleImport}
                    disabled={isImporting}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition flex-shrink-0 flex items-center gap-2"
                    title="دروستکردنی شوێنەکان لە پلانەکەوە"
                >
                    {isImporting ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="hidden sm:inline">دروستکردن...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">هاوردەکردن لە پلان</span>
                        </>
                    )}
                </button>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition flex-shrink-0 flex items-center gap-2"
                >
                    زیادکردنی شوێن
                </button>
            </div>
        </div>

        {/* Status Message Banner */}
        {statusMsg && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 ${
                statusMsg.type === 'success' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' :
                statusMsg.type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-300' :
                'bg-blue-900/20 border-blue-500/30 text-blue-300'
            }`}>
                <div className="flex items-center gap-3">
                    {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                     statusMsg.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : 
                     <Sparkles className="w-5 h-5" />}
                    <span className="text-sm font-medium">{statusMsg.text}</span>
                </div>
                <button onClick={() => setStatusMsg(null)} className="p-1 hover:bg-white/10 rounded">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        <div className="grid gap-4">
          {currentProject.locations.length === 0 && (
               <div className="text-center py-12 border border-zinc-800 border-dashed rounded-xl">
                    <p className="text-zinc-500 text-sm">هیچ شوێنێک نییە.</p>
               </div>
          )}

          {currentProject.locations.map(loc => {
            const isSelected = selectedIds.has(loc.id);
            return (
                <div 
                    key={loc.id} 
                    className={`
                        flex flex-col sm:flex-row gap-4 p-4 bg-zinc-900 border rounded-lg group relative transition-colors
                        ${isSelected ? 'border-primary-500 ring-1 ring-primary-500/30 bg-primary-900/10' : 'border-zinc-800 hover:border-zinc-700'}
                    `}
                    onClick={() => { /* Optional: Open Edit Modal in Future */ }}
                >
                    {/* Checkbox */}
                    <div 
                        className="absolute top-2 left-2 z-20 p-2 -m-2 cursor-pointer"
                        onClick={(e) => toggleSelection(e, loc.id)}
                    >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-600 border-primary-500' : 'bg-zinc-950/80 border-zinc-600 hover:border-zinc-400'}`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                    </div>

                    {/* Delete Button (Overlay) */}
                    <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteSingle(loc.id, loc.name); }}
                            className="p-1.5 bg-zinc-950/80 backdrop-blur-sm rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-900/20 border border-zinc-700 transition"
                            title="سڕینەوە"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div 
                        className="w-full sm:w-32 h-32 sm:h-24 bg-zinc-800 rounded flex items-center justify-center text-zinc-600 flex-shrink-0 overflow-hidden relative group/image cursor-pointer"
                        onClick={(e) => {
                             if (loc.imageUrl) {
                                 e.stopPropagation();
                                 setViewingImage(loc.imageUrl);
                             }
                        }}
                    >
                        {loc.imageUrl ? (
                            <>
                                <img src={loc.imageUrl} alt={loc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition flex items-center justify-center pointer-events-none">
                                    <Eye className="w-6 h-6 text-white/80 drop-shadow-lg" />
                                </div>
                            </>
                        ) : (
                            <Image className="w-8 h-8 opacity-20" />
                        )}
                        {loc.type && <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">{loc.type}</div>}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-medium text-zinc-200">{loc.name}</h3>
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-lg">{loc.description}</p>
                        <div className="flex gap-2 mt-3">
                            <span className="text-xxs bg-zinc-800 px-2 py-1 rounded text-zinc-400 border border-zinc-700">{loc.type === 'INT' ? 'ناوەوە' : loc.type === 'EXT' ? 'دەرەوە' : 'تێکەڵ'}</span>
                        </div>
                    </div>
                </div>
            );
          })}
        </div>
      </div>

      {/* Modal - Responsive Fix with Safe Area Padding */}
      {showModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/80 backdrop-blur-sm">
              <div 
                  className="bg-zinc-900 border-t sm:border border-zinc-800 p-6 rounded-t-2xl sm:rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90dvh] h-auto animate-in slide-in-from-bottom-5 duration-300"
                  style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              >
                  <h3 className="text-lg font-medium text-zinc-100 mb-4 flex-shrink-0">زیادکردنی شوێن</h3>
                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pb-2">
                      <div>
                          <label className="block text-xs text-zinc-500 mb-1">ناوی شوێن</label>
                          <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">جۆر</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 outline-none">
                            <option value="INT">ناوەوە (INT)</option>
                            <option value="EXT">دەرەوە (EXT)</option>
                            <option value="MIXED">تێکەڵ</option>
                        </select>
                      </div>
                      <div>
                          <label className="block text-xs text-zinc-500 mb-1">وەسف</label>
                          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 outline-none h-20 resize-none" />
                      </div>
                  </form>
                  <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800 flex-shrink-0">
                      <button type="button" onClick={() => setShowModal(false)} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2">پاشگەزبوونەوە</button>
                      <button type="submit" onClick={handleSubmit} className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-4 py-2 rounded">زیادکردن</button>
                  </div>
              </div>
          </div>
      )}

      {/* IMAGE VIEWER MODAL */}
      {viewingImage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in" onClick={() => setViewingImage(null)}>
              <div className="relative max-w-4xl max-h-[90vh] w-full p-4 flex items-center justify-center">
                   <button 
                       onClick={() => setViewingImage(null)}
                       className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition z-50"
                   >
                       <X className="w-6 h-6" />
                   </button>
                   <img 
                       src={viewingImage} 
                       alt="Full view" 
                       className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                       onClick={(e) => e.stopPropagation()} // Prevent close on image click
                   />
              </div>
          </div>
      )}
    </div>
  );
};

export default Locations;