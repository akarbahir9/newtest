import React, { useState } from 'react';
import { Image, Sparkles, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const Locations: React.FC = () => {
  const { currentProject, addLocation, importLocationsFromBlueprint } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'INT' | 'EXT' | 'MIXED'>('INT');
  const [description, setDescription] = useState('');
  
  const [isImporting, setIsImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

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
      setStatusMsg(null); 

      try {
          const count = await importLocationsFromBlueprint(blueprint);
          
          if (count > 0) {
              setStatusMsg({ type: 'success', text: `${count} شوێن بە سەرکەوتوویی لە پلانەکەوە زیادکران!` });
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

  if (!currentProject) return <div className="p-8 text-zinc-500">تکایە پڕۆژەیەک هەڵبژێرە.</div>;

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto relative">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-6">
            <div>
                 <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">شوێنەکان</h1>
                 <p className="text-sm text-zinc-500 mt-1">شوێنەکانی پڕۆژەی <span className="text-primary-400">{currentProject.title}</span>.</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleImport}
                    disabled={isImporting}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-2"
                    title="دروستکردنی شوێنەکان لە پلانەکەوە"
                >
                    {isImporting ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="hidden sm:inline">جارێ...</span>
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
                    className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm transition"
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

          {currentProject.locations.map(loc => (
            <div key={loc.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="w-full sm:w-24 h-24 bg-zinc-800 rounded flex items-center justify-center text-zinc-600 flex-shrink-0">
                <Image className="w-8 h-8" />
                </div>
                <div>
                <h3 className="text-sm font-medium text-zinc-200">{loc.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-lg">{loc.description}</p>
                <div className="flex gap-2 mt-3">
                    <span className="text-xxs bg-zinc-800 px-2 py-1 rounded text-zinc-400 border border-zinc-700">{loc.type === 'INT' ? 'ناوەوە' : loc.type === 'EXT' ? 'دەرەوە' : 'تێکەڵ'}</span>
                </div>
                </div>
            </div>
          ))}
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
    </div>
  );
};

export default Locations;