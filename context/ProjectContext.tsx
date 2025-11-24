

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Project, Scene, Character, Location, ViewType, ProjectType, ProjectFormat, Episode, ChatMessage } from '../types';
import { supabase } from '../lib/supabase';

// Robust ID Generator (used for temporary optimistic updates or fallbacks)
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const DEMO_PROJECT: Project = {
    id: 'demo-offline',
    title: 'Demo Project (Offline)',
    type: 'Screenplay',
    format: 'Feature',
    genres: ['Sci-Fi'],
    updatedAt: new Date().toISOString(),
    logline: 'This project is loaded because a connection to the database could not be established.',
    detailedStory: '',
    blueprint: '# Act 1\n\n## The Hook\nA brief intro to the world.\n\n## Inciting Incident\nSomething happens that changes everything.',
    targetMetadata: { durationMinutes: 120 },
    theme: '',
    setting: '',
    protagonistGoal: '',
    episodes: [],
    scenes: [
        {
            id: 'demo-scene-1',
            number: 1,
            title: 'INT. DEMO - DAY',
            content: '<div class="sp-slug">INT. DEMO - DAY</div><div class="sp-action">The system is running in offline mode.</div><div class="sp-character">SYSTEM</div><div class="sp-dialogue">Connection failed. Loaded demo project.</div>',
            summary: 'Introduction to offline mode.'
        }
    ],
    characters: [],
    locations: [],
    chatHistory: [
        { id: 'msg-1', role: 'model', text: 'I noticed the database connection failed. I have loaded this demo project so you can still explore the interface.' }
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
  isLoading: boolean;
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
      metadata: { logline: string, detailedStory: string, theme: string, setting: string, protagonistGoal: string }
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
  addChatMessage: (projectId: string, message: ChatMessage) => void;
  replaceTextInProject: (projectId: string, search: string, replace: string) => void;
  confirmationState: ConfirmationState;
  showConfirmation: (message: string, onConfirm: () => void) => void;
  hideConfirmation: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [currentSceneId, setCurrentSceneId] = useState<string>('');
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isRightPanelOpen, setRightPanelOpen] = useState(true);
  
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>(null);

  // Debounce ref for scene content updates
  const sceneUpdateTimeoutRef = useRef<Record<string, any>>({});

  // Fetch initial data
  useEffect(() => {
    fetchProjects();
    if (window.innerWidth < 768) {
        setRightPanelOpen(false);
    }
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
        const { data: projectsData, error } = await supabase
            .from('projects')
            .select(`
                *,
                scenes (*),
                characters (*),
                locations (*),
                episodes (*),
                chatHistory:chat_history (*)
            `)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Sort relations client-side and Map DB fields to TS types
        const formattedProjects = (projectsData || []).map(p => ({
            ...p,
            detailedStory: p.detailed_story,
            protagonistGoal: p.protagonist_goal,
            targetMetadata: p.target_metadata,
            scenes: p.scenes?.sort((a: Scene, b: Scene) => a.number - b.number) || [],
            episodes: p.episodes?.sort((a: Episode, b: Episode) => a.number - b.number) || [],
            characters: p.characters || [],
            locations: p.locations || [],
            chatHistory: (p.chatHistory || []).map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                text: msg.text,
                hasContradiction: msg.has_contradiction
            })).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
        }));

        setProjects(formattedProjects);

    } catch (err: any) {
        console.warn("Error fetching projects. Using Demo Project.", err.message || err);
        setProjects([DEMO_PROJECT]);
    } finally {
        setIsLoading(false);
    }
  };

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

  const addProject = async (
      title: string, 
      type: ProjectType, 
      format: ProjectFormat,
      genres: string[], 
      metadata: { logline: string, detailedStory: string, theme: string, setting: string, protagonistGoal: string }
  ) => {
    try {
        // 1. Create Project
        const { data: projData, error: projError } = await supabase
            .from('projects')
            .insert({
                title,
                type,
                format,
                genres,
                logline: metadata.logline,
                detailed_story: metadata.detailedStory,
                theme: metadata.theme,
                setting: metadata.setting,
                protagonist_goal: metadata.protagonistGoal,
                target_metadata: type === 'Screenplay' ? { durationMinutes: 110 } : type === 'Novel' ? { targetPageCount: 300 } : { totalSeasons: 1, episodesPerSeason: 8, episodeDuration: 50 }
            })
            .select()
            .single();

        if (projError || !projData) throw projError;

        const newProjectId = projData.id;
        let initialScenes: Scene[] = [];
        let initialEpisodes: Episode[] = [];

        // 2. Create Initial Content based on Type
        if (type === 'Serial') {
            const { data: epData, error: epError } = await supabase
                .from('episodes')
                .insert({ project_id: newProjectId, title: 'ئەڵقەی ١: سەرەتا', number: 1 })
                .select()
                .single();
            
            if (epError) throw epError;
            
            if (epData) {
                initialEpisodes = [epData];
                const { data: sceneData, error: sceneError } = await supabase
                    .from('scenes')
                    .insert({
                        project_id: newProjectId,
                        episode_id: epData.id,
                        number: 1,
                        title: 'TEASER',
                        content: '<div class="sp-slug">TEASER</div><div class="sp-action">Fade in...</div>'
                    })
                    .select()
                    .single();
                
                if (sceneError) throw sceneError;
                if (sceneData) initialScenes = [sceneData];
            }
        } else if (type === 'Novel') {
             const { data: sceneData, error: sceneError } = await supabase
                .from('scenes')
                .insert({
                    project_id: newProjectId,
                    number: 1,
                    title: 'بەشی ١',
                    content: '<div class="novel-chapter">بەشی ١</div><p>لێرەوە دەست بە نووسین بکە...</p>'
                })
                .select()
                .single();
                
             if (sceneError) throw sceneError;
             if (sceneData) initialScenes = [sceneData];
        } else {
             const { data: sceneData, error: sceneError } = await supabase
                .from('scenes')
                .insert({
                    project_id: newProjectId,
                    number: 1,
                    title: 'ناوەوە. شوێن - ڕۆژ',
                    content: '<div class="sp-slug">ناوەوە. شوێن - ڕۆژ</div><div class="sp-action">وەسفی کردار...</div>'
                })
                .select()
                .single();
                
             if (sceneError) throw sceneError;
             if (sceneData) initialScenes = [sceneData];
        }

        // 3. Add Welcome Message
        await supabase.from('chat_history').insert({
            project_id: newProjectId,
            role: 'model',
            text: 'دەتوانم یارمەتیت بدەم. داوام لێ بکە دیمەنەکە شیبکەمەوە، پێشنیاری نووسین بکەم، یان دەستکاری زانیارییەکانی پڕۆژە بکەم.'
        });

        const newProject: Project = {
            ...projData,
            detailedStory: projData.detailed_story, // Map snake_case to camelCase
            protagonistGoal: projData.protagonist_goal,
            targetMetadata: projData.target_metadata,
            scenes: initialScenes,
            episodes: initialEpisodes,
            characters: [],
            locations: [],
            chatHistory: [{ 
                id: 'init', 
                role: 'model', 
                text: 'دەتوانم یارمەتیت بدەم. داوام لێ بکە دیمەنەکە شیبکەمەوە، پێشنیاری نووسین بکەم، یان دەستکاری زانیارییەکانی پڕۆژە بکەم.' 
            }]
        };

        setProjects(prev => [newProject, ...prev]);
        setCurrentProjectId(newProject.id);
        if (initialScenes.length > 0) {
            setCurrentSceneId(initialScenes[0].id);
            navigateTo('editor');
        } else {
            navigateTo('dashboard');
        }

    } catch (err: any) {
        console.warn("Supabase insert failed, utilizing local fallback.", err);
        
        // Fallback Logic
        const fallbackId = generateId();
        const now = new Date().toISOString();
        
        let initialScenes: Scene[] = [];
        let initialEpisodes: Episode[] = [];

        if (type === 'Serial') {
             const epId = generateId();
             initialEpisodes = [{
                 id: epId,
                 title: 'ئەڵقەی ١: سەرەتا',
                 number: 1
             }];
             initialScenes = [{
                 id: generateId(),
                 number: 1,
                 title: 'TEASER',
                 content: '<div class="sp-slug">TEASER</div><div class="sp-action">Fade in...</div>',
                 episodeId: epId
             }];
        } else if (type === 'Novel') {
             initialScenes = [{
                 id: generateId(),
                 number: 1,
                 title: 'بەشی ١',
                 content: '<div class="novel-chapter">بەشی ١</div><p>لێرەوە دەست بە نووسین بکە...</p>'
             }];
        } else {
             initialScenes = [{
                 id: generateId(),
                 number: 1,
                 title: 'ناوەوە. شوێن - ڕۆژ',
                 content: '<div class="sp-slug">ناوەوە. شوێن - ڕۆژ</div><div class="sp-action">وەسفی کردار...</div>'
             }];
        }

        const fallbackProject: Project = {
            id: fallbackId,
            title,
            type,
            format,
            genres,
            updatedAt: now,
            logline: metadata.logline,
            detailedStory: metadata.detailedStory,
            theme: metadata.theme,
            setting: metadata.setting,
            protagonistGoal: metadata.protagonistGoal,
            targetMetadata: type === 'Screenplay' ? { durationMinutes: 110 } : type === 'Novel' ? { targetPageCount: 300 } : { totalSeasons: 1, episodesPerSeason: 8, episodeDuration: 50 },
            blueprint: '',
            scenes: initialScenes,
            episodes: initialEpisodes,
            characters: [],
            locations: [],
            chatHistory: [{
                id: generateId(),
                role: 'model',
                text: 'پڕۆژەکە بە شێوازی ناوخۆیی (Offline) دروستکرا چونکە پەیوەندی بە داتابەیسەوە نییە. (' + (err.message || 'Error Unknown') + ')'
            }]
        };
        
        setProjects(prev => [fallbackProject, ...prev]);
        setCurrentProjectId(fallbackId);
        if (initialScenes.length > 0) {
            setCurrentSceneId(initialScenes[0].id);
            navigateTo('editor');
        } else {
            navigateTo('dashboard');
        }
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
      // Optimistic Update
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      
      try {
          const dbData: any = { ...data };
          // Map camelCase to snake_case for DB
          if (data.detailedStory !== undefined) {
              dbData.detailed_story = data.detailedStory;
              delete dbData.detailedStory;
          }
          if (data.protagonistGoal !== undefined) {
              dbData.protagonist_goal = data.protagonistGoal;
              delete dbData.protagonistGoal;
          }
          if (data.targetMetadata !== undefined) {
              dbData.target_metadata = data.targetMetadata;
              delete dbData.targetMetadata;
          }

          // Remove relation arrays if present in partial update to avoid DB errors
          delete dbData.scenes;
          delete dbData.characters;
          delete dbData.locations;
          delete dbData.episodes;
          delete dbData.chatHistory;

          await supabase.from('projects').update({ ...dbData, updated_at: new Date() }).eq('id', id);
      } catch (err) {
          console.error("Error updating project:", err);
      }
  };

  const deleteProject = async (id: string) => {
    // Optimistic Update
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);

    if (currentProjectId === id) {
        setCurrentProjectId('');
        setCurrentSceneId('');
        navigateTo('dashboard');
    }

    try {
        await supabase.from('projects').delete().eq('id', id);
    } catch (err) {
        console.error("Error deleting project:", err);
    }
  };

  const importProject = async (projectData: any) => {
      alert("Importing directly to Supabase is not fully implemented in this demo.");
  };

  const addEpisode = async () => {
      if (!currentProject || currentProject.type !== 'Serial') return;
      
      const nextNum = (currentProject.episodes?.length || 0) + 1;
      const title = `ئەڵقەی ${nextNum}`;
      
      // Optimistic
      const tempEp = { id: generateId(), title, number: nextNum, project_id: currentProject.id };
      const updatedProject = { ...currentProject, episodes: [...(currentProject.episodes || []), tempEp] };
      setProjects(prev => prev.map(p => p.id === currentProject.id ? updatedProject : p));

      try {
          const { data, error } = await supabase
            .from('episodes')
            .insert({ project_id: currentProject.id, title, number: nextNum })
            .select()
            .single();
          
          if (error || !data) throw error;
          
          // Replace temp with real
          const finalEpProject = { 
              ...currentProject, 
              episodes: [...(currentProject.episodes || []).filter(e => e.id !== tempEp.id), data] 
          };
          setProjects(prev => prev.map(p => p.id === currentProject.id ? finalEpProject : p));

      } catch (err) {
          console.error("Error adding episode", err);
      }
  };

  const updateEpisode = async (episodeId: string, title: string) => {
      if (!currentProject) return;
      
      const updatedEpisodes = (currentProject.episodes || []).map(e => e.id === episodeId ? { ...e, title } : e);
      setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...currentProject, episodes: updatedEpisodes } : p));

      await supabase.from('episodes').update({ title }).eq('id', episodeId);
  };

  const addScene = async (episodeId?: string) => {
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

    // Optimistic
    const tempScene: Scene = {
        id: generateId(),
        number: nextNum,
        title: newTitle,
        content: newContent,
        episodeId: targetEpisodeId
    };
    
    const updatedProject = { ...currentProject, scenes: [...currentProject.scenes, tempScene] };
    setProjects(prev => prev.map(p => p.id === currentProject.id ? updatedProject : p));
    setCurrentSceneId(tempScene.id);
    navigateTo('editor');

    try {
        const { data: newScene, error } = await supabase
            .from('scenes')
            .insert({
                project_id: currentProject.id,
                episode_id: targetEpisodeId,
                number: nextNum,
                title: newTitle,
                content: newContent
            })
            .select()
            .single();

        if (error || !newScene) throw error;
        
        // Update with real ID
        const finalProject = { 
            ...currentProject, 
            scenes: [...currentProject.scenes.filter(s => s.id !== tempScene.id), newScene] 
        };
        setProjects(prev => prev.map(p => p.id === currentProject.id ? finalProject : p));
        setCurrentSceneId(newScene.id);

    } catch (err) {
        console.error("Error adding scene:", err);
    }
  };

  const deleteScene = async (sceneId: string) => {
      if (!currentProject) return;

      const sceneIndex = currentProject.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex === -1) return;

      const updatedScenes = currentProject.scenes.filter(s => s.id !== sceneId);

      // Optimistic Update
      const updatedProject = { ...currentProject, scenes: updatedScenes };
      setProjects(prev => prev.map(p => p.id === currentProject.id ? updatedProject : p));
      
      if (currentSceneId === sceneId) {
          if (updatedScenes.length > 0) {
              const newIndex = Math.max(0, sceneIndex - 1);
              setCurrentSceneId(updatedScenes[newIndex].id);
          } else {
              setCurrentSceneId('');
          }
      }

      await supabase.from('scenes').delete().eq('id', sceneId);
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

    // 1. Local Optimistic Update (Instant)
    const updatedScenes = currentProject.scenes.map(s => 
      s.id === sceneId ? { ...s, content, title: newTitle || s.title } : s
    );
    setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...currentProject, scenes: updatedScenes } : p));

    // 2. Debounced Database Update
    if (sceneUpdateTimeoutRef.current[sceneId]) {
        clearTimeout(sceneUpdateTimeoutRef.current[sceneId]);
    }

    sceneUpdateTimeoutRef.current[sceneId] = setTimeout(async () => {
        const updatePayload: any = { content };
        if (newTitle) updatePayload.title = newTitle;
        
        await supabase.from('scenes').update(updatePayload).eq('id', sceneId);
        await supabase.from('projects').update({ updated_at: new Date() }).eq('id', currentProject.id);
    }, 1500); // 1.5s debounce
  };

  const updateSceneSummary = async (sceneId: string, summary: string) => {
    if (!currentProject) return;
    const updatedScenes = currentProject.scenes.map(s => s.id === sceneId ? { ...s, summary } : s);
    setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...currentProject, scenes: updatedScenes } : p));
    
    await supabase.from('scenes').update({ summary }).eq('id', sceneId);
  };

  const addCharacter = async (char: Omit<Character, 'id' | 'arcCompletion' | 'relationships'>) => {
    if (!currentProject) return;
    
    // Optimistic
    const tempChar = { ...char, id: generateId(), arcCompletion: 0, relationships: [] };
    const updatedProject = { ...currentProject, characters: [...currentProject.characters, tempChar] };
    setProjects(prev => prev.map(p => p.id === currentProject.id ? updatedProject : p));

    try {
        const { data: newChar, error } = await supabase
            .from('characters')
            .insert({
                project_id: currentProject.id,
                name: char.name,
                role: char.role,
                archetype: char.archetype,
                description: char.description,
                traits: char.traits,
                relationships: []
            })
            .select()
            .single();
        
        if (error || !newChar) throw error;
        
        const finalProject = { 
            ...currentProject, 
            characters: [...currentProject.characters.filter(c => c.id !== tempChar.id), newChar] 
        };
        setProjects(prev => prev.map(p => p.id === currentProject.id ? finalProject : p));

    } catch (err) {
        console.error("Error adding character:", err);
    }
  };

  const updateCharacter = async (updatedChar: Character) => {
    if (!currentProject) return;
    
    // Optimistic
    const updatedChars = currentProject.characters.map(c => c.id === updatedChar.id ? updatedChar : c);
    setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...currentProject, characters: updatedChars } : p));

    try {
        await supabase.from('characters').update({
            name: updatedChar.name,
            role: updatedChar.role,
            archetype: updatedChar.archetype,
            description: updatedChar.description,
            traits: updatedChar.traits,
            relationships: updatedChar.relationships
        }).eq('id', updatedChar.id);
    } catch (err) {
        console.error("Error updating character:", err);
    }
  };

  const addLocation = async (loc: Omit<Location, 'id'>) => {
    if (!currentProject) return;

    // Optimistic
    const tempLoc = { ...loc, id: generateId() };
    const updatedProject = { ...currentProject, locations: [...currentProject.locations, tempLoc] };
    setProjects(prev => prev.map(p => p.id === currentProject.id ? updatedProject : p));

    try {
        const { data: newLoc, error } = await supabase
            .from('locations')
            .insert({
                project_id: currentProject.id,
                name: loc.name,
                type: loc.type,
                description: loc.description
            })
            .select()
            .single();

        if (error || !newLoc) throw error;

        const finalProject = { 
            ...currentProject, 
            locations: [...currentProject.locations.filter(l => l.id !== tempLoc.id), newLoc] 
        };
        setProjects(prev => prev.map(p => p.id === currentProject.id ? finalProject : p));
    } catch (err) {
        console.error("Error adding location:", err);
    }
  };

  const addChatMessage = async (projectId: string, message: ChatMessage) => {
    // Optimistic
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            const history = p.chatHistory || [];
            return { ...p, chatHistory: [...history, message] };
        }
        return p;
    }));

    // DB
    try {
        await supabase.from('chat_history').insert({
            project_id: projectId,
            role: message.role,
            text: message.text,
            has_contradiction: message.hasContradiction
        });
    } catch (err) {
        console.error("Error saving chat:", err);
    }
  };

  const replaceTextInProject = async (projectId: string, search: string, replace: string) => {
    // 1. Optimistic Update
    setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        const updatedScenes = p.scenes.map(s => ({
            ...s,
            content: s.content.split(search).join(replace),
            title: s.title ? s.title.split(search).join(replace) : s.title,
            summary: s.summary ? s.summary.split(search).join(replace) : s.summary
        }));
        return { ...p, scenes: updatedScenes };
    }));

    // 2. Database Update
    if (currentProject) {
        for (const scene of currentProject.scenes) {
             const newContent = scene.content.split(search).join(replace);
             const newTitle = scene.title ? scene.title.split(search).join(replace) : scene.title;
             
             if (newContent !== scene.content || newTitle !== scene.title) {
                 await supabase.from('scenes').update({
                     content: newContent,
                     title: newTitle
                 }).eq('id', scene.id);
             }
        }
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      currentSceneId,
      currentView,
      isSidebarOpen,
      isRightPanelOpen,
      isLoading,
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
      addChatMessage,
      replaceTextInProject,
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