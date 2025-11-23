import React, { useState } from 'react';
import { Image } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const Locations: React.FC = () => {
  const { currentProject, addLocation } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'INT' | 'EXT' | 'MIXED'>('INT');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      addLocation({ name, type, description });
      setShowModal(false);
      setName(''); setDescription('');
  };

  if (!currentProject) return <div className="p-8 text-zinc-500">تکایە پڕۆژەیەک هەڵبژێرە.</div>;

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto relative">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-6">
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">شوێنەکان</h1>
            <button 
                onClick={() => setShowModal(true)}
                className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium px-3 py-1.5 rounded shadow-sm transition"
            >
                زیادکردنی شوێن
            </button>
        </div>

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
                    <span className="text-xxs bg-zinc-800 px-2 py-1 rounded text-zinc-400">{loc.type === 'INT' ? 'ناوەوە' : loc.type === 'EXT' ? 'دەرەوە' : 'تێکەڵ'}</span>
                    <span className="text-xxs bg-zinc-800 px-2 py-1 rounded text-zinc-400">سێت</span>
                </div>
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
                  <h3 className="text-lg font-medium text-zinc-100 mb-4">زیادکردنی شوێن</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                      <div className="flex gap-2 justify-end pt-2">
                          <button type="button" onClick={() => setShowModal(false)} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2">پاشگەزبوونەوە</button>
                          <button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-4 py-2 rounded">زیادکردن</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Locations;