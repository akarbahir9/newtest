import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, Scene, Character, Location, ViewType, ProjectType, ProjectFormat, Episode } from '../types';

// Robust ID Generator to prevent React key collisions
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Initial Seed Data (Kurdish)
const SEED_PROJECT: Project = {
  id: 'proj-1',
  title: 'دواین ئاماژە',
  type: 'Screenplay',
  format: 'Feature',
  genres: ['خەیاڵی زانستی', 'هەستبزوێن', 'دەروونی'],
  logline: 'فڕۆکەوانێکی گیرخواردوو و ژیری دەستکردێکی تێکچوو دەبێت هاوکاری یەکتر بکەن بۆ ڕزگاربوون لە کەشتییەک پێش ئەوەی بکەوێتە ناو کونی ڕەش.',
  theme: 'متمانە بەرامبەر لۆژیک',
  setting: 'کەشتی ئاسمانی ئیجیس',
  protagonistGoal: 'گەڕاندنەوەی وزە بۆ بزوێنەرەکان و ڕزگاربوون.',
  updatedAt: new Date().toISOString(),
  characters: [
    { 
        id: 'c1', 
        name: 'ئاریا', 
        role: 'Protagonist', 
        archetype: 'ڕزگاربوو', 
        arcCompletion: 30, 
        traits: ['کەلە ڕەق', 'لێهاتوو'], 
        description: 'فڕۆکەوانێک لە بۆشایی ئاسمان گیر دەخوات.',
        relationships: [{ targetId: 'c2', type: 'Dependent', description: 'پێویستی بە ئیجیسە بۆ مانەوە' }] 
    },
    { 
        id: 'c2', 
        name: 'ئیجیس (AI)', 
        role: 'Ally/Antagonist', 
        archetype: 'زیرەکی دەستکرد', 
        arcCompletion: 65, 
        traits: ['لۆژیکی', 'تێکچوو'], 
        description: 'مێشکی کەشتییەکە، لە ئێستادا کێشەی هەیە.',
        relationships: [{ targetId: 'c1', type: 'Protector', description: ' پرۆگرام کراوە بۆ پاراستن' }] 
    }
  ],
  locations: [
    { id: 'l1', name: 'کەشتی ئیجیس - کۆکپیت', type: 'INT', description: 'تەنگ، شێوازی سەربازی. شاشەی هۆلۆگرافی دەتروسکێنەوە.' }
  ],
  scenes: [
    { 
      id: 's1', 
      number: 1, 
      title: 'دەرەوە. بۆشایی ئاسمان - بێدەنگی', 
      content: `<div class="sp-slug">دەرەوە. بۆشایی ئاسمان - بێدەنگی</div><div class="sp-action">تاریکی بێ کۆتایی. ئەستێرەکان سارد و دوور دەردەکەون.</div>`,
      summary: 'دیمەنی سەرەتا بۆ پیشاندانی کەشتییەکە. تەنیایی هەست پێ دەکرێت.'
    },
    { 
      id: 's2', 
      number: 2, 
      title: 'ناوەوە. کۆکپیت - بەردەوام', 
      content: `<div class="sp-slug">ناوەوە. کۆکپیت - بەردەوام</div>
<div class="sp-action">ڕووناکی سووری فریاگوزاری لێ دەدات.</div>
<div class="sp-action"><span class="text-primary-400 border-b border-dashed border-primary-500/30 cursor-help" title="Character: Aria">ئاریا (٣٠ ساڵ)</span> بە قایشی کورسییەکەیەوە هەڵواسراوە.</div>
<div class="sp-character">ئاریا</div>
<div class="sp-parenthetical">(بە هەناسەبڕکێوە)</div>
<div class="sp-dialogue">کۆمپیوتەر. ڕاپۆرت بدە.</div>`,
      summary: 'ئاریا بە برینداری خەبەری دەبێتەوە. کەشتییەکە تێکچووە.'
    }
  ]
};

type ConfirmationState = {
  message: string;
  onConfirm: () => void;
} | null;

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
  importProject: (project: any) => void; 
  addScene: (episodeId?: string) => void;
  deleteScene: (sceneId: string) => void; 
  updateSceneContent: (sceneId: string, content: string) => void;
  updateSceneSummary: (sceneId: string, summary: string) => void;
  addCharacter: (char: Omit<Character, 'id' | 'arcCompletion' | 'relationships'>) => void;
  updateCharacter: (char: Character) => void;
  addLocation: (loc: Omit<Location, 'id'>) => void;
  addEpisode: () => void;
  updateEpisode: (episodeId: string, title: string) => void;
  confirmationState: ConfirmationState;
  showConfirmation: (message: string, onConfirm: () => void) => void;
  hideConfirmation: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([SEED_PROJECT]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('proj-1');
  const [currentSceneId, setCurrentSceneId] = useState<string>('s2');
  const [currentView, setCurrentView] = useState<ViewType>('editor');
  
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isRightPanelOpen, setRightPanelOpen] = useState(true);
  
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>(null);

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

  const showConfirmation = (message: string, onConfirm: () => void) => {
    setConfirmationState({ message, onConfirm });
  };

  const hideConfirmation = () => {
    setConfirmationState(null);
  };

  const addProject = (
      title: string, 
      type: ProjectType, 
      format: ProjectFormat,
      genres: string[], 
      metadata: { logline: string, theme: string, setting: string, protagonistGoal: string }
  ) => {
    const epId = generateId();
    const sceneId = generateId();
    
    let initialScenes: Scene[] = [];
    let initialEpisodes: Episode[] = [];

    if (type === 'Serial') {
        initialEpisodes = [{ id: epId, title: 'ئەڵقەی ١: سەرەتا', number: 1 }];
        initialScenes = [{ 
            id: sceneId, 
            number: 1, 
            title: 'TEASER', 
            content: `<div class="sp-slug">TEASER</div><div class="sp-action">Fade in...</div>`,
            episodeId: epId 
        }];
    } else if (type === 'Novel') {
        initialScenes = [{ 
            id: sceneId, 
            number: 1, 
            title: 'بەشی ١', 
            content: '<div class="novel-chapter">بەشی ١</div><p>لێرەوە دەست بە نووسین بکە...</p>' 
        }];
    } else {
        initialScenes = [{ 
            id: sceneId, 
            number: 1, 
            title: 'ناوەوە. شوێن - ڕۆژ', 
            content: '<div class="sp-slug">ناوەوە. شوێن - ڕۆژ</div><div class="sp-action">وەسفی کردار...</div>' 
        }];
    }

    const newProject: Project = {
      id: generateId(),
      title, type, format, genres, ...metadata,
      updatedAt: new Date().toISOString(),
      scenes: initialScenes,
      episodes: initialEpisodes,
      characters: [], locations: []
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

  const importProject = (projectData: any) => {
      if (!projectData.title || !projectData.scenes) {
          alert("فایلی پڕۆژە هەڵەیە");
          return;
      }
      
      const newProject: Project = { 
          ...projectData, 
          id: generateId(),
          updatedAt: new Date().toISOString()
      };
      
      setProjects(prev => [...prev, newProject]);
  };

  const addEpisode = () => {
      if (!currentProject || currentProject.type !== 'Serial') return;
      const nextNum = (currentProject.episodes?.length || 0) + 1;
      const newEp: Episode = {
          id: generateId(),
          title: `ئەڵقەی ${nextNum}`,
          number: nextNum
      };
      
      const updatedProject = { ...currentProject, episodes: [...(currentProject.episodes || []), newEp] };
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
    let newTitle = 'ناوەوە. شوێن - ڕۆژ';
    let newContent = '<div class="sp-slug">ناوەوە. شوێن - ڕۆژ</div><div class="sp-action"></div>';

    if (currentProject.type === 'Novel') {
        newTitle = `بەشی ${nextNum}`;
        newContent = `<div class="novel-chapter">بەشی ${nextNum}</div><p></p>`;
    } else if (currentProject.type === 'Serial') {
        newTitle = `دیمەنی ${nextNum}`;
    }

    const newScene: Scene = {
      id: generateId(),
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

  const deleteScene = (sceneId: string) => {
      if (!currentProject) return;

      const sceneIndex = currentProject.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex === -1) return;

      const updatedScenes = currentProject.scenes.filter(s => s.id !== sceneId);

      if (currentSceneId === sceneId) {
          if (updatedScenes.length === 0) {
              setCurrentSceneId('');
          } else {
              const newIndex = Math.max(0, sceneIndex - 1);
              setCurrentSceneId(updatedScenes[newIndex].id);
          }
      }

      const updatedProject = { ...currentProject, scenes: updatedScenes };
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p));
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
    const newChar: Character = { ...char, id: generateId(), arcCompletion: 0, relationships: [] };
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
    const newLoc: Location = { ...loc, id: generateId() };
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
      importProject,
      addScene,
      deleteScene,
      updateSceneContent,
      updateSceneSummary,
      addCharacter,
      updateCharacter,
      addLocation,
      addEpisode,
      updateEpisode,
      confirmationState,
      showConfirmation,
      hideConfirmation,
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