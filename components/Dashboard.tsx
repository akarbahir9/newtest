
import React, { useState } from 'react';
import { FileText, Clock, Users, Film, Book, ChevronRight, Plus, Trash2, AlertTriangle, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Project } from '../types';

const GENRES = [
    "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Cyberpunk", 
    "Disaster", "Documentary", "Drama", "Family", "Fantasy", "Film-Noir", "History", 
    "Horror", "Music", "Musical", "Mystery", "Psychological", "Romance", "Sci-Fi", 
    "Short", "Slasher", "Sport", "Spy", "Steampunk", "Superhero", "Thriller", "War", "Western"
];

const Dashboard: React.FC = () => {
  const { projects, navigateTo, setCurrentProject, addProject, deleteProject } = useProject();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newGenres, setNewGenres] = useState<string[]>(['Sci-Fi']);
  const [newLogline, setNewLogline] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [newSetting, setNewSetting] = useState('');
  const [newGoal, setNewGoal] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGenres.length === 0) {
        alert("Please select at least one genre.");
        return;
    }
    addProject(newTitle, newGenres, {
        logline: newLogline,
        theme: newTheme,
        setting: newSetting,
        protagonistGoal: newGoal
    });
    setShowNewProjectModal(false);
    // Reset
    setNewTitle('');
    setNewGenres(['Sci-Fi']);
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

  // Calculate Stats
  const totalWords = projects.reduce((acc, p) => acc + p.scenes.reduce((sAcc, s) => sAcc + s.content.length / 5, 0), 0); // Rough estimate
  const totalChars = projects.reduce((acc, p) => acc + p.characters.length, 0);

  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto relative">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Dashboard</h1>
            <button 
                onClick={() => setShowNewProjectModal(true)}
                className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-2 shadow-lg shadow-primary-900/20"
            >
                <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Project</span>
            </button>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Total Words</span>
              <FileText className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-mono text-zinc-100">{Math.floor(totalWords)}</div>
            <div className="text-xxs text-emerald-500 mt-1 flex items-center gap-1">+15% from last week</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Avg. Session</span>
              <Clock className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-mono text-zinc-100">42m</div>
            <div className="text-xxs text-zinc-500 mt-1">Stable</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Characters</span>
              <Users className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl font-mono text-zinc-100">{totalChars}</div>
            <div className="text-xxs text-primary-500 mt-1 flex items-center gap-1">{projects.length} Projects</div>
          </div>
        </div>

        {/* Projects List */}
        <h2 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wide">Recent Projects</h2>
        <div className="grid gap-3">
          {projects.map(project => (
              <div 
                key={project.id}
                onClick={() => { setCurrentProject(project.id); navigateTo('editor'); }} 
                className="group flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 cursor-pointer transition relative"
              >
                <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded ${project.type === 'Screenplay' ? 'bg-primary-900/30 text-primary-400 border-primary-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'} flex items-center justify-center border flex-shrink-0`}>
                    {project.type === 'Screenplay' ? <Film className="w-5 h-5" /> : <Book className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">{project.title}</h3>
                    <p className="text-xs text-zinc-500 truncate">
                        {project.genres.join(', ')} • {project.type}
                    </p>
                </div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                <button 
                    onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
                    className="p-2 text-zinc-600 hover:text-red-500 hover:bg-zinc-800 rounded transition opacity-0 group-hover:opacity-100"
                    title="Delete Project"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showNewProjectModal && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  <h3 className="text-lg font-medium text-zinc-100 mb-4">Start New Project</h3>
                  <form onSubmit={handleCreate} className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs text-zinc-500 mb-1">Title</label>
                              <input 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                required
                                placeholder="e.g. The Martian"
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-zinc-500 mb-2">Genres (Select up to 5)</label>
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
                          <p className="text-xs text-zinc-400 mb-4">Help the AI understand your story context:</p>
                          
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs text-zinc-500 mb-1">Logline (What is the story about?)</label>
                                  <textarea 
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none h-16 resize-none"
                                      value={newLogline}
                                      onChange={e => setNewLogline(e.target.value)}
                                      placeholder="e.g. An astronaut becomes stranded on Mars..."
                                  />
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs text-zinc-500 mb-1">Theme</label>
                                      <input 
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none"
                                          value={newTheme}
                                          onChange={e => setNewTheme(e.target.value)}
                                          placeholder="e.g. Survival vs. Nature"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs text-zinc-500 mb-1">Setting</label>
                                      <input 
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none"
                                          value={newSetting}
                                          onChange={e => setNewSetting(e.target.value)}
                                          placeholder="e.g. Mars, 2035"
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-xs text-zinc-500 mb-1">Protagonist's Main Goal</label>
                                  <input 
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-primary-500 focus:outline-none"
                                      value={newGoal}
                                      onChange={e => setNewGoal(e.target.value)}
                                      placeholder="e.g. To survive until rescue arrives"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
                          <button type="button" onClick={() => setShowNewProjectModal(false)} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2">Cancel</button>
                          <button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-4 py-2 rounded">Create Project</button>
                      </div>
                  </form>
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
                      <h3 className="text-lg font-semibold text-zinc-100">Delete Project?</h3>
                      <p className="text-xs text-zinc-400 mt-1">
                          Are you sure you want to delete <span className="font-bold text-zinc-200">{projectToDelete.title}</span>? This action cannot be undone.
                      </p>
                  </div>
                  
                  <div className="flex gap-3 justify-center mt-6">
                      <button 
                          onClick={() => setProjectToDelete(null)} 
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-4 py-2.5 rounded transition"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDelete} 
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-4 py-2.5 rounded transition shadow-lg shadow-red-900/20"
                      >
                          Yes, Delete
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;