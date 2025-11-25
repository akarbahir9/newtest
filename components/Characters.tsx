

import React, { useState } from 'react';
import { Edit2, Save, Trash2, Plus, ArrowRightLeft, Sparkles, X, CheckCircle2, AlertTriangle, Loader2, Circle, CheckSquare, Square } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Character, Relationship } from '../types';

const Characters: React.FC = () => {
  const { currentProject, addCharacter, updateCharacter, importCharactersFromBlueprint, deleteCharacter, bulkDeleteItems, showConfirmation } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Status Message State for feedback
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Create Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('Protagonist');
  const [archetype, setArchetype] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      addCharacter({ name, role, archetype, traits: [], description });
      setShowModal(false);
      setName(''); setDescription(''); setArchetype('');
      setStatusMsg({ type: 'success', text: 'کاراکتەر زیادکرا.' });
      setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChar) {
        updateCharacter(editingChar);
        setEditingChar(null);
        setStatusMsg({ type: 'success', text: 'گۆڕانکارییەکان پاشەکەوت کران.' });
        setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleImport = async () => {
      const blueprint = currentProject?.blueprint || currentProject?.detailedStory;
      
      if (!blueprint || blueprint.trim().length < 50) {
          setStatusMsg({ 
              type: 'error', 
              text: 'تکایە سەرەتا پلانێکی تێروتەسەل دابنێ لە بەشی "پوختە" (Blueprint) بۆ ئەوەی بتوانم کاراکتەرەکان دەربهێنم.' 
          });
          return;
      }

      setIsImporting(true);
      setStatusMsg(null); // Clear previous messages

      try {
          // Pass blueprint explicitly to avoid stale state
          const count = await importCharactersFromBlueprint(blueprint);
          
          if (count > 0) {
              setStatusMsg({ type: 'success', text: `${count} کاراکتەر بە سەرکەوتوویی لە پلانەکەوە زیادکران!` });
          } else {
              setStatusMsg({ type: 'info', text: 'هیچ کاراکتەرێکی نوێ لە پلانەکەدا نەدۆزرایەوە، یان هەموویان پێشتر تۆمارکراون.' });
          }
      } catch (error) {
          console.error(error);
          setStatusMsg({ type: 'error', text: 'کێشەیەک ڕوویدا لە کاتی شیکردنەوەی پلانەکە.' });
      } finally {
          setIsImporting(false);
      }
  };

  const handleDeleteSingle = (id: string, name: string) => {
      showConfirmation(`ئایا دڵنیایت دەتەوێت "${name}" بسڕیتەوە؟`, () => {
          deleteCharacter(id);
          if (editingChar?.id === id) setEditingChar(null);
          // Remove from selection if it was selected
          if (selectedIds.has(id)) {
              const newSet = new Set(selectedIds);
              newSet.delete(id);
              setSelectedIds(newSet);
          }
          setStatusMsg({ type: 'success', text: 'کاراکتەر سڕایەوە.' });
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
      if (selectedIds.size === currentProject.characters.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(currentProject.characters.map(c => c.id)));
      }
  };

  const handleBulkDelete = () => {
      if (selectedIds.size === 0) return;
      showConfirmation(`ئایا دڵنیایت دەتەوێت ${selectedIds.size} کاراکتەر بسڕیتەوە؟`, () => {
          const items = Array.from(selectedIds).map(id => ({ id, type: 'character' as const }));
          bulkDeleteItems(items);
          setSelectedIds(new Set());
          setStatusMsg({ type: 'success', text: `${items.length} کاراکتەر سڕانەوە.` });
          setTimeout(() => setStatusMsg(null), 3000);
      });
  };

  const addRelationship = () => {
      if (!editingChar || !currentProject) return;
      const potentialTargets = currentProject.characters.filter(c => c.id !== editingChar.id);
      if (potentialTargets.length === 0) return;

      const newRel: Relationship = { targetId: potentialTargets[0].id, type: 'Ally', description: '' };
      setEditingChar({
          ...editingChar,
          relationships: [...(editingChar.relationships || []), newRel]
      });
  };

  const updateRelationship = (index: number, field: keyof Relationship, value: string) => {
      if (!editingChar) return;
      const updatedRels = [...editingChar.relationships];
      updatedRels[index] = { ...updatedRels[index], [field]: value };
      setEditingChar({ ...editingChar, relationships: updatedRels });
  };

  const removeRelationship = (index: number) => {
      if (!editingChar) return;
      const updatedRels = editingChar.relationships.filter((_, i) => i !== index);
      setEditingChar({ ...editingChar, relationships: updatedRels });
  };

  const updateTrait = (index: number, val: string) => {
     if(!editingChar) return;
     const newTraits = [...editingChar.traits];
     newTraits[index] = val;
     setEditingChar({ ...editingChar, traits: newTraits });
  };

  if (!currentProject) return <div className="p-8 text-zinc-500">تکایە پڕۆژەیەک هەڵبژێرە.</div>;

  const allSelected = currentProject.characters.length > 0 && selectedIds.size === currentProject.characters.length;

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">کاراکتەرەکان</h1>
            <p className="text-sm text-zinc-500 mt-1 hidden sm:block">بەڕێوەبردنی کەسایەتییەکان بۆ <span className="text-primary-400">{currentProject.title}</span>.</p>
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
                title="دروستکردنی کاراکتەرەکان لە پلانەکەوە"
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
                className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition flex-shrink-0 flex items-center gap-2"
            >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">زیادکردن</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentProject.characters.length === 0 && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-12 border border-zinc-800 border-dashed rounded-xl">
                  <p className="text-zinc-500 text-sm">هیچ کاراکتەرێک نییە. پاڵەوانەکەت دروست بکە یان لە پلانەکەوە هاوردەی بکە!</p>
              </div>
          )}
          
          {currentProject.characters.map(char => {
            const isSelected = selectedIds.has(char.id);
            return (
                <div 
                    key={char.id} 
                    onClick={() => setEditingChar(char)} 
                    className={`
                        bg-zinc-900 border rounded-xl overflow-hidden transition group cursor-pointer relative shadow-sm hover:shadow-md
                        ${isSelected ? 'border-primary-500 ring-1 ring-primary-500/50' : 'border-zinc-800 hover:border-zinc-600'}
                    `}
                >
                    {/* Checkbox */}
                    <div 
                        className="absolute top-2 left-2 z-20 p-2 -m-2"
                        onClick={(e) => toggleSelection(e, char.id)}
                    >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-600 border-primary-500' : 'bg-zinc-950/80 border-zinc-600 hover:border-zinc-400'}`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                    </div>

                    <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10">
                        <button className="p-1.5 bg-zinc-950/80 backdrop-blur-sm rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700">
                            <Edit2 className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="h-24 bg-gradient-to-bl from-zinc-800 to-zinc-900 relative">
                        <div className={`absolute bottom-0 left-4 transform translate-y-1/2 w-12 h-12 rounded-full border-4 border-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg ${char.role === 'Protagonist' ? 'bg-zinc-200 text-zinc-900' : 'bg-primary-900 text-primary-200'}`}>
                            {char.name.substring(0, 2).toUpperCase()}
                        </div>
                    </div>
                    <div className="pt-8 pb-4 px-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-medium text-zinc-200">{char.name}</h3>
                                <p className="text-xs text-zinc-500">{char.role} • {char.archetype}</p>
                            </div>
                            {char.role === 'Protagonist' && <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-medium border border-emerald-500/20">پاڵەوان</div>}
                        </div>
                        
                        {/* Relationship Preview */}
                        <div className="mt-3 min-h-[1.5rem]">
                            {char.relationships && char.relationships.length > 0 ? (
                                 <div className="flex flex-wrap gap-1">
                                     {char.relationships.slice(0, 2).map((rel, i) => {
                                         const targetName = currentProject.characters.find(c => c.id === rel.targetId)?.name || 'Unknown';
                                         return (
                                             <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded flex items-center gap-1 border border-zinc-700/50">
                                                 <ArrowRightLeft className="w-2 h-2" /> {rel.type}: {targetName}
                                             </span>
                                         )
                                     })}
                                     {char.relationships.length > 2 && <span className="text-[10px] text-zinc-600 px-1 py-0.5">+{char.relationships.length - 2}</span>}
                                 </div>
                            ) : (
                                <p className="text-[10px] text-zinc-600 italic">هیچ پەیوەندییەک نییە.</p>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-zinc-800 flex gap-1.5 flex-wrap">
                            {char.traits.map((t, i) => (
                                 <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded-full text-[10px] text-zinc-400 border border-zinc-700/50">{t}</span>
                            ))}
                        </div>
                    </div>
                </div>
            );
          })}
        </div>
      </div>

      {/* CREATE Modal */}
      {showModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/80 backdrop-blur-sm">
              <div 
                  className="bg-zinc-900 border-t sm:border border-zinc-800 p-6 rounded-t-2xl sm:rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90dvh] h-auto animate-in slide-in-from-bottom-5 duration-300"
                  style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              >
                  <h3 className="text-lg font-medium text-zinc-100 mb-4 flex-shrink-0">زیادکردنی کاراکتەر</h3>
                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pb-2">
                      <div>
                          <label className="block text-xs text-zinc-500 mb-1">ناو</label>
                          <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 outline-none" required />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs text-zinc-500 mb-1">ڕۆڵ</label>
                            <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 outline-none">
                                <option value="Protagonist">پاڵەوان</option>
                                <option value="Antagonist">دژە پاڵەوان</option>
                                <option value="Ally">هاوکار</option>
                                <option value="Love Interest">خۆشەویست</option>
                                <option value="Mentor">ڕێنیشاندەر</option>
                                <option value="Supporting">لاوەکی</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs text-zinc-500 mb-1">ئارکیتایپ</label>
                            <input value={archetype} onChange={e => setArchetype(e.target.value)} placeholder="نموونە: پاڵەوان" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 outline-none" />
                         </div>
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

      {/* EDIT Modal */}
      {editingChar && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/80 backdrop-blur-sm">
              <div 
                  className="bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90dvh] h-auto animate-in slide-in-from-bottom-5 duration-300"
                  style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              >
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-medium text-zinc-100">دەستکاری {editingChar.name}</h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleDeleteSingle(editingChar.id, editingChar.name)} 
                            title="سڕینەوە" 
                            className="p-1.5 hover:bg-red-900/20 rounded-lg text-zinc-500 hover:text-red-500 transition"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setEditingChar(null)} 
                            title="داخستن" 
                            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      {/* Basic Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs text-zinc-500 mb-1">ناو</label>
                             <input value={editingChar.name} onChange={e => setEditingChar({...editingChar, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 outline-none" />
                         </div>
                         <div>
                             <label className="block text-xs text-zinc-500 mb-1">ئارکیتایپ</label>
                             <input value={editingChar.archetype} onChange={e => setEditingChar({...editingChar, archetype: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 outline-none" />
                         </div>
                      </div>
                      
                      <div>
                          <label className="block text-xs text-zinc-500 mb-1">وەسف</label>
                          <textarea value={editingChar.description} onChange={e => setEditingChar({...editingChar, description: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 outline-none h-20 resize-none" />
                      </div>

                      {/* Traits */}
                      <div>
                          <div className="flex justify-between items-center mb-2">
                             <label className="text-xs text-zinc-500">سیفەتەکان</label>
                             <button onClick={() => setEditingChar({...editingChar, traits: [...editingChar.traits, 'سیفەتی نوێ']})} className="text-xs text-primary-400 hover:text-primary-300">+ زیادکردن</button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              {editingChar.traits.map((t, i) => (
                                  <input 
                                    key={i} 
                                    value={t} 
                                    onChange={(e) => updateTrait(i, e.target.value)}
                                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 w-24 text-center focus:border-primary-500 outline-none"
                                  />
                              ))}
                          </div>
                      </div>

                      {/* Relationships */}
                      <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
                           <div className="flex justify-between items-center mb-3">
                               <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2"><ArrowRightLeft className="w-3.5 h-3.5" /> پەیوەندییەکان</h4>
                               <button onClick={addRelationship} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded flex items-center gap-1 border border-zinc-700">
                                   <Plus className="w-3 h-3" /> زیادکردنی بەستەر
                               </button>
                           </div>
                           
                           <div className="space-y-3">
                               {editingChar.relationships?.map((rel, i) => (
                                   <div key={i} className="flex flex-col sm:flex-row gap-2 items-start bg-zinc-900 p-2 rounded border border-zinc-800 relative">
                                       <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                           <div>
                                               <label className="block text-[10px] text-zinc-600 mb-0.5">پەیوەندی لەگەڵ</label>
                                               <select 
                                                    value={rel.targetId} 
                                                    onChange={(e) => updateRelationship(i, 'targetId', e.target.value)}
                                                    className="w-full bg-zinc-800 text-xs text-zinc-300 rounded border border-zinc-700 p-1"
                                               >
                                                   {currentProject.characters.filter(c => c.id !== editingChar.id).map(c => (
                                                       <option key={c.id} value={c.id}>{c.name}</option>
                                                   ))}
                                               </select>
                                           </div>
                                           <div>
                                               <label className="block text-[10px] text-zinc-600 mb-0.5">جۆر</label>
                                               <input 
                                                    value={rel.type}
                                                    onChange={(e) => updateRelationship(i, 'type', e.target.value)}
                                                    placeholder="نموونە: خوشک/برا"
                                                    className="w-full bg-zinc-800 text-xs text-zinc-300 rounded border border-zinc-700 p-1"
                                               />
                                           </div>
                                           <div className="col-span-1 sm:col-span-2">
                                                <input 
                                                    value={rel.description || ''}
                                                    onChange={(e) => updateRelationship(i, 'description', e.target.value)}
                                                    placeholder="تێبینی (نموونە: بە نهێنی ڕقی لێیەتی...)"
                                                    className="w-full bg-zinc-800 text-xs text-zinc-400 rounded border border-zinc-700 p-1"
                                               />
                                           </div>
                                       </div>
                                       <button onClick={() => removeRelationship(i)} className="absolute top-2 left-2 sm:relative sm:top-auto sm:left-auto text-zinc-600 hover:text-red-400 p-1">
                                            <X className="w-3.5 h-3.5" />
                                       </button>
                                   </div>
                               ))}
                               {(!editingChar.relationships || editingChar.relationships.length === 0) && (
                                   <p className="text-xs text-zinc-600 text-center italic py-2">هیچ پەیوەندییەک نییە.</p>
                               )}
                           </div>
                      </div>
                  </div>

                  <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-zinc-900 rounded-b-xl flex-shrink-0">
                      <button onClick={() => setEditingChar(null)} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2">پاشگەزبوونەوە</button>
                      <button onClick={handleEditSave} className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-4 py-2 rounded flex items-center gap-2">
                          <Save className="w-3.5 h-3.5" /> پاشەکەوتکردن
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Characters;
