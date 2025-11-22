
import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const GENRES = [
    "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Cyberpunk", 
    "Disaster", "Documentary", "Drama", "Family", "Fantasy", "Film-Noir", "History", 
    "Horror", "Music", "Musical", "Mystery", "Psychological", "Romance", "Sci-Fi", 
    "Short", "Slasher", "Sport", "Spy", "Steampunk", "Superhero", "Thriller", "War", "Western"
];

const Settings: React.FC = () => {
  const { currentProject, updateProject } = useProject();
  
  const [formData, setFormData] = useState<{
    title: string;
    logline: string;
    theme: string;
    setting: string;
    protagonistGoal: string;
    genres: string[];
  }>({
    title: '',
    logline: '',
    theme: '',
    setting: '',
    protagonistGoal: '',
    genres: []
  });

  useEffect(() => {
    if (currentProject) {
      setFormData({
        title: currentProject.title || '',
        logline: currentProject.logline || '',
        theme: currentProject.theme || '',
        setting: currentProject.setting || '',
        protagonistGoal: currentProject.protagonistGoal || '',
        genres: currentProject.genres || []
      });
    }
  }, [currentProject]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    return <div className="p-8 text-zinc-500">Please select a project to edit its settings.</div>;
  }

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">Project Settings: {currentProject.title}</h1>
        
        <div className="space-y-6">
          {/* Metadata Editor */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Story Metadata</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Project Title</label>
                <input 
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                />
              </div>
              
              {/* Genres Editor */}
              <div>
                  <label className="block text-xs text-zinc-500 mb-2">Genres (Select up to 5)</label>
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
                <label className="block text-xs text-zinc-500 mb-1">Logline</label>
                <textarea 
                    value={formData.logline}
                    onChange={(e) => handleChange('logline', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none h-20 resize-none"
                    placeholder="One or two sentence summary of the story..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Theme</label>
                    <input 
                        value={formData.theme}
                        onChange={(e) => handleChange('theme', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                        placeholder="Core meaning"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Protagonist Goal</label>
                    <input 
                        value={formData.protagonistGoal}
                        onChange={(e) => handleChange('protagonistGoal', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                        placeholder="What do they want?"
                    />
                  </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Setting</label>
                <input 
                    value={formData.setting}
                    onChange={(e) => handleChange('setting', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-primary-500 outline-none" 
                    placeholder="Time and place"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button 
                    onClick={handleSave}
                    className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-4 py-2 rounded flex items-center gap-2"
                >
                    <Save className="w-3.5 h-3.5" /> Save Metadata
                </button>
            </div>
          </div>

          {/* App Preferences */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Editor Preferences</h3>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400">Dark Mode</span>
              <div className="w-8 h-4 bg-primary-600 rounded-full relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Show AI Ghosts</span>
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