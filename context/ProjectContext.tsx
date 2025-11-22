import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, Scene, Character, Location, ViewType, ProjectType, ProjectFormat, Episode } from '../types';

// Initial Seed Data
const SEED_PROJECT: Project = {
  id: 'proj-1',
  title: 'The Last Signal',
  type: 'Screenplay',
  format: 'Feature',
  genres: ['Sci-Fi', 'Thriller', 'Psychological'],
  logline: 'A stranded pilot and a glitching AI must cooperate to escape a dying ship before it falls into a black hole.',
  theme: 'Trust vs. Logic',
  setting: 'The USS Aegis, a derelict destroyer drifting in deep space.',
  protagonistGoal: 'Restore power to the engines and escape.',
  updatedAt: new Date().toISOString(),
  characters: [
    { 
        id: 'c1', 
        name: 'Aria', 
        role: 'Protagonist', 
        archetype: 'The Survivor', 
        arcCompletion: 30, 
        traits: ['Stubborn', 'Skilled'], 
        description: 'A pilot stranded in deep space.',
        relationships: [{ targetId: 'c2', type: 'Dependent', description: 'Needs AEGIS to survive' }] 
    },
    { 
        id: 'c2', 
        name: 'A.E.G.I.S', 
        role: 'Ally/Antagonist', 
        archetype: 'Artificial Intelligence', 
        arcCompletion: 65, 
        traits: ['Logical', 'Glitching'], 
        description: 'The ship AI core, currently failing.',
        relationships: [{ targetId: 'c1', type: 'Protector', description: ' programmed to save crew' }] 
    }
  ],
  locations: [
    { id: 'l1', name: 'USS Aegis - Cockpit', type: 'INT', description: 'Cramped, utilitarian layout. Flickering holographic displays.' }
  ],
  scenes: [
    { 
      id: 's1', 
      number: 1, 
      title: 'EXT. DEEP SPACE - SILENCE', 
      content: `<div class="sp-slug">EXT. DEEP SPACE - SILENCE</div><div class="sp-action">The vast, infinite dark. Stars are cold, distant pinpricks.</div>`,
      summary: 'Establishing shot of the derelict ship. We understand the isolation.'
    },
    { 
      id: 's2', 
      number: 2, 
      title: 'INT. COCKPIT - CONTINUOUS', 
      content: `<div class="sp-slug">INT. COCKPIT - CONTINUOUS</div>
<div class="sp-action">Red emergency lights pulse in a rhythmic, suffocating beat.</div>
<div class="sp-action"><span class="text-primary-400 border-b border-dashed border-primary-500/30 cursor-help" title="Character: Aria">ARIA (30s)</span> hangs suspended in her harness.</div>
<div class="sp-character">ARIA</div>
<div class="sp-parenthetical">(breathless)</div>
<div class="sp-dialogue">Computer. Report.</div>`,
      summary: 'Aria wakes up injured. The ship is failing. She tries to re-establish control.'
    }
  ]
};

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  currentSceneId: string | null;
  currentView: ViewType;
  isSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setCurrentProject: (id: string) => void;
  setCurrentSceneId: (id: string) => void;
  navigateTo: (view: ViewType) => void;
  addProject: (
      title: string, 
      type: ProjectType, 
      format: ProjectFormat,
      genres: string[], 
      metadata: { logline: string, theme: string, setting: string, protagonistGoal: string }
  ) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addScene: (episodeId?: string) => void;
  updateSceneContent: (sceneId: string, content: string) => void;
  updateSceneSummary: (sceneId: string, summary: string) => void;
  addCharacter: (char: Omit<Character, 'id' | 'arcCompletion' | 'relationships'>) => void;
  updateCharacter: (char: Character) => void;
  addLocation: (loc: Omit<Location, 'id'>) => void;
  // Functions for Episode Management
  addEpisode: () => void;
  updateEpisode: (episodeId: string, title: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([SEED_PROJECT]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('proj-1');
  const [currentSceneId, setCurrentSceneId] = useState<string>('s2');
  const [currentView, setCurrentView] = useState<ViewType>('editor');
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isRightPanelOpen, setRightPanelOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('zoer-projects');
    if (saved) {
      setProjects(JSON.parse(saved));
    }
    if (window.innerWidth < 768) {
        setRightPanelOpen(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('zoer-projects', JSON.stringify(projects));
  }, [projects]);

  const currentProject = projects.find(p => p.id === currentProjectId) || null;

  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
    if (window.innerWidth < 768) {
        setSidebarOpen(false);
    }
  };

  const addProject = (
      title: string, 
      type: ProjectType, 
      format: ProjectFormat,
      genres: string[], 
      metadata: { logline: string, theme: string, setting: string, protagonistGoal: string }
  ) => {
    const epId = Date.now().toString() + 'ep';
    const sceneId = Date.now().toString() + 's';
    
    let initialScenes: Scene[] = [];
    let initialEpisodes: Episode[] = [];

    if (type === 'Serial') {
        initialEpisodes = [{ id: epId, title: 'Episode 1: Pilot', number: 1 }];
        initialScenes = [{ 
            id: sceneId, 
            number: 1, 
            title: 'TEASER', 
            content: '<div class="sp-slug">TEASER</div><div class="sp-action">Fade in...</div>',
            episodeId: epId 
        }];
    } else if (type === 'Novel') {
        initialScenes = [{ 
            id: sceneId, 
            number: 1, 
            title: 'Chapter 1', 
            content: '<div class="novel-chapter">Chapter 1</div><p>Start writing your chapter here...</p>' 
        }];
    } else {
        initialScenes = [{ 
            id: sceneId, 
            number: 1, 
            title: 'INT. LOCATION - DAY', 
            content: '<div class="sp-slug">INT. LOCATION - DAY</div><div class="sp-action">Action description...</div>' 
        }];
    }

    const newProject: Project = {
      id: Date.now().toString(),
      title,
      type,
      format,
      genres,
      ...metadata,
      updatedAt: new Date().toISOString(),
      scenes: initialScenes,
      episodes: initialEpisodes,
      characters: [],
      locations: []
    };
    setProjects([...projects, newProject]);
    setCurrentProjectId(newProject.id);
    setCurrentSceneId(newProject.scenes[0].id);
    navigateTo('editor');
  };

  const updateProject = (id: string, data: Partial<Project>) => {
      setProjects(projects.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const deleteProject = (id: string) => {
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);

    if (currentProjectId === id) {
        if (updatedProjects.length > 0) {
            setCurrentProjectId(updatedProjects[0].id);
            setCurrentSceneId(updatedProjects[0].scenes[0].id);
        } else {
            setCurrentProjectId('');
            setCurrentSceneId('');
        }
    }
  };

  // --- EPISODE MANAGEMENT ---
  const addEpisode = () => {
      if (!currentProject || currentProject.type !== 'Serial') return;
      const nextNum = (currentProject.episodes?.length || 0) + 1;
      const newEp: Episode = {
          id: Date.now().toString() + 'ep',
          title: `Episode ${nextNum}`,
          number: nextNum
      };
      
      const updatedProject = { 
          ...currentProject, 
          episodes: [...(currentProject.episodes || []), newEp] 
      };
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p));
  };

  const updateEpisode = (episodeId: string, title: string) => {
      if (!currentProject || !currentProject.episodes) return;
      const updatedEpisodes = currentProject.episodes.map(e => e.id === episodeId ? { ...e, title } : e);
      setProjects(projects.map(p => p.id === currentProject.id ? { ...currentProject, episodes: updatedEpisodes } : p));
  };

  const addScene = (episodeId?: string) => {
    if (!currentProject) return;
    
    let targetEpisodeId = episodeId;
    if (currentProject.type === 'Serial' && !targetEpisodeId) {
        if (currentProject.episodes && currentProject.episodes.length > 0) {
            targetEpisodeId = currentProject.episodes[currentProject.episodes.length - 1].id;
        }
    }

    const nextNum = currentProject.scenes.length + 1;
    let newTitle = 'INT. LOCATION - DAY';
    let newContent = '<div class="sp-slug">INT. LOCATION - DAY</div><div class="sp-action"></div>';

    if (currentProject.type === 'Novel') {
        newTitle = `Chapter ${nextNum}`;
        newContent = `<div class="novel-chapter">Chapter ${nextNum}</div><p></p>`;
    } else if (currentProject.type === 'Serial') {
        newTitle = `Scene ${nextNum}`;
    }

    const newScene: Scene = {
      id: Date.now().toString(),
      number: nextNum,
      title: newTitle,
      content: newContent,
      episodeId: targetEpisodeId,
      summary: ''
    };
    
    const updatedProject = { ...currentProject, scenes: [...currentProject.scenes, newScene] };
    setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p));
    setCurrentSceneId(newScene.id);
    navigateTo('editor');
  };

  const updateSceneContent = (sceneId: string, content: string) => {
    if (!currentProject) return;

    let newTitle = null;
    if (currentProject.type === 'Novel') {
        const chapMatch = content.match(/<div class="novel-chapter"[^>]*>(.*?)<\/div>/i);
        if (chapMatch && chapMatch[1]) {
            newTitle = chapMatch[1].replace(/<[^>]+>/g, '').trim();
        }
    } else {
        const slugMatch = content.match(/<div class="sp-slug"[^>]*>(.*?)<\/div>/i);
        if (slugMatch && slugMatch[1]) {
            let cleanText = slugMatch[1].replace(/<[^>]+>/g, '').trim();
            if (cleanText) newTitle = cleanText.toUpperCase();
        }
    }

    const updatedScenes = currentProject.scenes.map(s => 
      s.id === sceneId ? { ...s, content, title: newTitle || s.title } : s
    );
    setProjects(projects.map(p => p.id === currentProject.id ? { ...currentProject, scenes: updatedScenes } : p));
  };

  const updateSceneSummary = (sceneId: string, summary: string) => {
    if (!currentProject) return;
    const updatedScenes = currentProject.scenes.map(s => s.id === sceneId ? { ...s, summary } : s);
    setProjects(projects.map(p => p.id === currentProject.id ? { ...currentProject, scenes: updatedScenes } : p));
  };

  const addCharacter = (char: Omit<Character, 'id' | 'arcCompletion' | 'relationships'>) => {
    if (!currentProject) return;
    const newChar: Character = { ...char, id: Date.now().toString(), arcCompletion: 0, relationships: [] };
    const updatedProject = { ...currentProject, characters: [...currentProject.characters, newChar] };
    setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p));
  };

  const updateCharacter = (updatedChar: Character) => {
    if (!currentProject) return;
    const updatedChars = currentProject.characters.map(c => c.id === updatedChar.id ? updatedChar : c);
    const updatedProject = { ...currentProject, characters: updatedChars };
    setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p));
  };

  const addLocation = (loc: Omit<Location, 'id'>) => {
    if (!currentProject) return;
    const newLoc: Location = { ...loc, id: Date.now().toString() };
    const updatedProject = { ...currentProject, locations: [...currentProject.locations, newLoc] };
    setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p));
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      currentSceneId,
      currentView,
      isSidebarOpen,
      isRightPanelOpen,
      setSidebarOpen,
      setRightPanelOpen,
      setCurrentProject: setCurrentProjectId,
      setCurrentSceneId,
      navigateTo,
      addProject,
      updateProject,
      deleteProject,
      addScene,
      updateSceneContent,
      updateSceneSummary,
      addCharacter,
      updateCharacter,
      addLocation,
      // CRITICAL FIX: Expose episode functions
      addEpisode,
      updateEpisode,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used within a ProjectProvider");
  return context;
};