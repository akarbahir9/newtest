

import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const GENRES = [
    "ئەکشن", "سەرکێشی", "ئەنیمەیشن", "ژیاننامە", "کۆمێدی", "تاوان", "سایبەرپانک", 
    "کارەسات", "بەڵگەنامەیی", "دراما", "خێزانی", "فەنتازیا", "فیلم نۆیر", "مێژوویی", 
    "ترسناک", "مۆسیقا", "موزیکاڵ", "میدتێری", "دەروونی", "ڕۆمانسی", "خەیاڵی زانستی", 
    "کورتە", "سلاشەر", "وەرزشی", "سیخوڕی", "ستیمپانک", "سوپەرهیرۆ", "هەستبزوێن", "جەنگ", "وێستێرن"
];

const POV_OPTIONS = [
    { value: "First Person POV", label: "کەسی یەکەم (من، ئێمە)" },
    { value: "Second Person POV", label: "کەسی دووەم (تۆ)" },
    { value: "Third Person Limited", label: "کەسی سێیەم (سنووردار)" },
    { value: "Third Person Omniscient", label: "کەسی سێیەم (زانا بە هەموو شت)" },
    { value: "Third Person Objective", label: "کەسی سێیەم (بابەتی/کامێرا)" }
];

const Settings: React.FC = () => {
  const { currentProject, updateProject } = useProject();
  
  const [formData, setFormData] = useState<{
    title: string;
    logline: string;
    theme: string;
    setting: string;
    protagonistGoal: string;
    pov: string;
    genres: string[];
    targetMetadata: {
        durationMinutes?: number;
        targetPageCount?: number;
        totalSeasons?: number;
        episodesPerSeason?: number;
        episodeDuration?: number;
    }
  }>({
    title: '',
    logline: '',
    theme: '',
    setting: '',
    protagonistGoal: '',
    pov: '',
    genres: [],
    targetMetadata: {}
  });

  useEffect(() => {
    if (currentProject) {
      setFormData({
        title: currentProject.title || '',
        logline: currentProject.logline || '',
        theme: currentProject.theme || '',
        setting: currentProject.setting || '',
        protagonistGoal: currentProject.protagonistGoal || '',
        pov: currentProject.pov || '',
        genres: currentProject.genres || [],
        targetMetadata: currentProject.targetMetadata || {}
      });
    }
  }, [currentProject]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMetadataChange = (field: string, value: number) => {
      setFormData(prev => ({
          ...prev,
          targetMetadata: { ...prev.targetMetadata, [field]: value }
      }));
  };

  const toggleGenre = (genre: string) => {
      const current = formData.genres;
      if (current.includes(genre)) {
          setFormData(prev => ({ ...prev, genres: current.filter(g => g !== genre) }));
      } else {
          if (current.length >= 5) return;
          setFormData(prev => ({ ...prev, genres: [...current, genre] }));
      }
  };

  const handleSave = () => {
    if (currentProject) {
      updateProject(currentProject.id, formData);
    }
  };

  if (!currentProject) {
    return <div className="p-8 text-zinc-500">تکایە پڕۆژەیەک هەڵبژێرە.</div>;
  }

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">ڕێکخستنەکانی پڕۆژە: {currentProject.title}</h1>
        
        <div className="space-y-6">
          {/* Metadata Editor */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-zinc-200 mb-4 border-b border-zinc-800 pb-2">زانیاری چیرۆک</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">ناونیشانی پڕۆژە</label>
                <input 
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                />
              </div>

              {/* Specific Structural Settings */}
              {currentProject.type === 'Screenplay' && (
                  <div>
                      <label className="block text-xs text-zinc-500 mb-1">ماوەی خەمڵێنراو (خولەک)</label>
                      <input 
                          type="number"
                          value={formData.targetMetadata.durationMinutes || 110}
                          onChange={(e) => handleMetadataChange('durationMinutes', parseInt(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                      />
                  </div>
              )}

              {currentProject.type === 'Novel' && (
                  <div>
                      <label className="block text-xs text-zinc-500 mb-1">ژمارەی لاپەڕەی خەمڵێنراو</label>
                      <input 
                          type="number"
                          value={formData.targetMetadata.targetPageCount || 300}
                          onChange={(e) => handleMetadataChange('targetPageCount', parseInt(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                      />
                  </div>
              )}

              {currentProject.type === 'Serial' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                          <label className="block text-xs text-zinc-500 mb-1">ژمارەی وەرزەکان</label>
                          <input 
                              type="number"
                              value={formData.targetMetadata.totalSeasons || 1}
                              onChange={(e) => handleMetadataChange('totalSeasons', parseInt(e.target.value))}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs text-zinc-500 mb-1">ئەڵقە لە هەر وەرزێکدا</label>
                          <input 
                              type="number"
                              value={formData.targetMetadata.episodesPerSeason || 8}
                              onChange={(e) => handleMetadataChange('episodesPerSeason', parseInt(e.target.value))}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs text-zinc-500 mb-1">ماوەی هەر ئەڵقەیەک (خولەک)</label>
                          <input 
                              type="number"
                              value={formData.targetMetadata.episodeDuration || 50}
                              onChange={(e) => handleMetadataChange('episodeDuration', parseInt(e.target.value))}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                          />
                      </div>
                  </div>
              )}

              {/* POV Selector for Novels */}
              {currentProject.type === 'Novel' && (
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">گۆشەنیگا (Point of View)</label>
                    <select
                        value={formData.pov}
                        onChange={(e) => handleChange('pov', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none"
                    >
                        <option value="">هەڵبژێرە...</option>
                        {POV_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                  </div>
              )}
              
              {/* Genres Editor */}
              <div>
                  <label className="block text-xs text-zinc-500 mb-2">ژانر (تا ٥ دانە دیاری بکە)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                      {formData.genres.map(g => (
                          <span key={g} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-900/30 text-primary-300 border border-primary-500/20 text-xxs">
                              {g} <X className="w-2.5 h-2.5 cursor-pointer hover:text-white" onClick={() => toggleGenre(g)} />
                          </span>
                      ))}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-zinc-800 rounded bg-zinc-950/50 custom-scrollbar">
                      {GENRES.map(genre => (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => toggleGenre(genre)}
                            className={`text-xs px-2 py-1 rounded border transition ${
                                formData.genres.includes(genre) 
                                ? 'bg-primary-600 border-primary-500 text-white' 
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                            }`}
                          >
                              {genre}
                          </button>
                      ))}
                  </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">کورتەی چیرۆک</label>
                <textarea 
                    value={formData.logline}
                    onChange={(e) => handleChange('logline', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none h-20 resize-none"
                    placeholder="پوختەی چیرۆک لە یەک یان دوو ڕستەدا..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">بابەت (Theme)</label>
                    <input 
                        value={formData.theme}
                        onChange={(e) => handleChange('theme', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                        placeholder="واتای سەرەکی"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">ئامانجی پاڵەوان</label>
                    <input 
                        value={formData.protagonistGoal}
                        onChange={(e) => handleChange('protagonistGoal', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                        placeholder="چی دەوێت؟"
                    />
                  </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">شوێن و کات</label>
                <input 
                    value={formData.setting}
                    onChange={(e) => handleChange('setting', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                    placeholder="کات و شوێن"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button 
                    onClick={handleSave}
                    className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-4 py-2 rounded flex items-center gap-2"
                >
                    <Save className="w-3.5 h-3.5" /> پاشەکەوتکردن
                </button>
            </div>
          </div>

          {/* App Preferences */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-zinc-200 mb-4 border-b border-zinc-800 pb-2">هەڵبژاردنەکان</h3>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400">دۆخی تاریک</span>
              <div className="w-8 h-4 bg-primary-600 rounded-full relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">پیشاندانی پێشنیاری AI</span>
              <div className="w-8 h-4 bg-primary-600 rounded-full relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
