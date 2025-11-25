

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Project, Scene, Character, Location, ViewType, ProjectType, ProjectFormat, Episode, ChatMessage, Relationship, Story, StoryData } from '../types';
import { supabase } from '../lib/supabase';
import { extractCharactersFromText } from '../services/geminiService';

// Robust ID Generator
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const LS_PROJECTS_KEY = 'zoer_projects_backup';
const LS_STORIES_KEY = 'zoer_stories_backup';

type ConfirmationState = {
  message: string;
  onConfirm: () => void;
} | null;

interface ProjectContextType {
  projects: Project[];
  stories: Story[];
  currentProject: Project | null;
  currentSceneId: string | null;
  currentStoryId: string | null;
  currentView: ViewType;
  isSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  isLoading: boolean;
  isOffline: boolean;
  setSidebarOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setCurrentProject: (id: string) => void;
  setCurrentSceneId: (id: string) => void;
  setCurrentStoryId: (id: string | null) => void;
  navigateTo: (view: ViewType) => void;
  addProject: (
      title: string, 
      type: ProjectType, 
      format: ProjectFormat,
      genres: string[], 
      metadata: { logline: string, detailedStory: string, blueprint?: string, theme: string, setting: string, protagonistGoal: string, targetMetadata?: any },
      sourceStoryId?: string,
      initialCharacters?: any[]
  ) => Promise<string | null>;
  createProjectFromStory: (story: Story) => Promise<void>;
  addStory: (title: string, concept: string, chatSession: ChatMessage[], structuredData: StoryData) => Promise<void>;
  updateStory: (id: string, data: Partial<Story>) => Promise<void>;
  deleteStory: (id: string) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  importProject: (project: any) => void; 
  addScene: (episodeId?: string, sceneData?: { title?: string, content?: string, summary?: string }) => void;
  deleteScene: (sceneId: string) => void; 
  updateSceneContent: (sceneId: string, content: string) => void;
  updateSceneSummary: (sceneId: string, summary: string) => void;
  addCharacter: (char: Omit<Character, 'id' | 'arcCompletion' | 'relationships'>) => Promise<string | null>;
  updateCharacter: (char: Character) => void;
  deleteCharacter: (id: string) => void;
  importCharactersFromBlueprint: (blueprintText?: string) => Promise<number>;
  addLocation: (loc: Omit<Location, 'id'>) => void;
  deleteLocation: (id: string) => void;
  bulkDeleteItems: (items: { id: string, type: 'character' | 'location' | 'scene' }[]) => void;
  addEpisode: () => void;
  updateEpisode: (episodeId: string, title: string) => void;
  addChatMessage: (projectId: string, message: ChatMessage) => void;
  addPlanChatMessage: (projectId: string, message: ChatMessage) => void;
  replaceTextInProject: (projectId: string, search: string, replace: string) => void;
  confirmationState: ConfirmationState;
  showConfirmation: (message: string, onConfirm: () => void) => void;
  hideConfirmation: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [currentSceneId, setCurrentSceneId] = useState<string>('');
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isRightPanelOpen, setRightPanelOpen] = useState(true);
  
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>(null);

  const sceneUpdateTimeoutRef = useRef<Record<string, any>>({});

  useEffect(() => {
    initializeData();
    if (window.innerWidth < 768) {
        setRightPanelOpen(false);
    }
  }, []);

  useEffect(() => {
      if (isDataLoaded) {
          try {
              localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(projects));
              localStorage.setItem(LS_STORIES_KEY, JSON.stringify(stories));
          } catch (e) {
              console.warn("Failed to save to localStorage", e);
          }
      }
  }, [projects, stories, isDataLoaded]);

  const initializeData = async () => {
      setIsLoading(true);
      
      // Load Stories
      let loadedStories: Story[] = [];
      try {
          const { data, error } = await supabase.from('stories').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          loadedStories = (data || []).map((s: any) => ({
              id: s.id,
              title: s.title,
              summary: s.summary,
              chatSession: s.chat_session || [],
              structuredData: s.structured_data || {},
              createdAt: s.created_at
          }));
      } catch (err: any) {
          console.warn("Offline Mode: Loading stories from LocalStorage", err);
          const lsStories = localStorage.getItem(LS_STORIES_KEY);
          if (lsStories) loadedStories = JSON.parse(lsStories);
          setIsOffline(true);
      }
      setStories(loadedStories);

      // Load Projects
      let loadedProjects: Project[] = [];
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

          loadedProjects = (projectsData || []).map(p => ({
            id: p.id,
            title: p.title,
            type: p.type,
            format: p.format,
            genres: p.genres,
            updatedAt: p.updated_at,
            logline: p.logline,
            detailedStory: p.detailed_story,
            blueprint: p.blueprint,
            theme: p.theme,
            setting: p.setting,
            protagonistGoal: p.protagonist_goal,
            targetMetadata: p.target_metadata,
            sourceStoryId: p.source_story_id,
            planChatHistory: p.plan_chat_history || [], // Load Plan Chat
            
            scenes: (p.scenes || []).map((s: any) => ({
                id: s.id,
                title: s.title,
                number: s.number,
                episodeId: s.episode_id,
                content: s.content,
                summary: s.summary
            })).sort((a: any, b: any) => a.number - b.number),

            episodes: (p.episodes || []).map((e: any) => ({
                id: e.id,
                title: e.title,
                number: e.number,
                summary: e.summary
            })).sort((a: any, b: any) => a.number - b.number),

            characters: (p.characters || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                role: c.role,
                archetype: c.archetype,
                description: c.description,
                traits: c.traits,
                relationships: c.relationships || [],
                arcCompletion: c.arc_completion
            })),

            locations: (p.locations || []).map((l: any) => ({
                id: l.id,
                name: l.name,
                type: l.type,
                description: l.description,
                sensoryDetails: l.sensory_details
            })),

            chatHistory: (p.chatHistory || []).map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                text: msg.text,
                hasContradiction: msg.has_contradiction
            })).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
        }));
      } catch (err) {
          console.warn("Offline Mode: Loading projects from LocalStorage");
          const lsProjects = localStorage.getItem(LS_PROJECTS_KEY);
          if (lsProjects) loadedProjects = JSON.parse(lsProjects);
          setIsOffline(true);
      }
      setProjects(loadedProjects);
      
      setIsDataLoaded(true);
      setIsLoading(false);
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

  const addStory = async (title: string, concept: string, chatSession: ChatMessage[], structuredData: StoryData) => {
      const tempId = generateId();
      const newStory: Story = {
          id: tempId,
          title,
          summary: concept,
          chatSession,
          structuredData,
          createdAt: new Date().toISOString()
      };
      const updatedStories = [newStory, ...stories];
      setStories(updatedStories);
      setCurrentStoryId(tempId);
      try {
          const { data, error } = await supabase.from('stories').insert({
              title,
              summary: concept,
              chat_session: chatSession,
              structured_data: structuredData
          }).select().single();
          if (error || !data) throw error;
          setStories(prev => prev.map(s => s.id === tempId ? { ...s, ...data, id: data.id } : s));
          if (currentStoryId === tempId) setCurrentStoryId(data.id);
      } catch (err) { setIsOffline(true); }
  };

  const updateStory = async (id: string, data: Partial<Story>) => {
      setStories(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
      try {
          const payload: any = {};
          if (data.title) payload.title = data.title;
          if (data.summary) payload.summary = data.summary;
          if (data.chatSession) payload.chat_session = data.chatSession;
          if (data.structuredData) payload.structured_data = data.structuredData;
          await supabase.from('stories').update(payload).eq('id', id);
      } catch (err) { setIsOffline(true); }
  };

  const deleteStory = async (id: string) => {
      setStories(prev => prev.filter(s => s.id !== id));
      try { await supabase.from('stories').delete().eq('id', id); } catch (err) {}
  };

  const createProjectFromStory = async (story: Story) => {
      const structuredData = (story.structuredData || {}) as any;
      const title = structuredData.title || story.title || 'Untitled Project';
      const type = structuredData.type || 'Screenplay';
      const format = structuredData.format || 'Feature';
      const genres = structuredData.genres || [];
      const logline = structuredData.logline || story.summary || '';
      const detailedStory = structuredData.detailedStory || '';
      const theme = structuredData.theme || '';
      const setting = structuredData.setting || '';
      const protagonistGoal = structuredData.protagonistGoal || '';
      const targetMetadata = structuredData.targetMetadata || {};
      
      const blueprint = ''; 

      await addProject(
          title, type, format, genres,
          { logline, detailedStory, blueprint, theme, setting, protagonistGoal, targetMetadata },
          story.id,
          [] 
      );
  };

  const addProject = async (
      title: string, 
      type: ProjectType, 
      format: ProjectFormat, 
      genres: string[], 
      metadata: { logline: string, detailedStory: string, blueprint?: string, theme: string, setting: string, protagonistGoal: string, targetMetadata?: any },
      sourceStoryId?: string,
      initialCharacters?: any[]
  ): Promise<string | null> => {
    try {
        const payload: any = {
            title, type, format, genres,
            logline: metadata.logline,
            detailed_story: metadata.detailedStory,
            blueprint: metadata.blueprint || '',
            theme: metadata.theme,
            setting: metadata.setting,
            protagonist_goal: metadata.protagonistGoal,
            target_metadata: metadata.targetMetadata || (type === 'Screenplay' ? { durationMinutes: 110 } : type === 'Novel' ? { targetPageCount: 300 } : { totalSeasons: 1, episodesPerSeason: 8, episodeDuration: 50 }),
            plan_chat_history: []
        };
        if (sourceStoryId) payload.source_story_id = sourceStoryId;

        const { data: projData, error: projError } = await supabase.from('projects').insert(payload).select().single();
        if (projError || !projData) throw projError;
        
        const newProjectId = projData.id;
        
        let initialScenes: Scene[] = [];
        let initialEpisodes: Episode[] = [];
        if (type === 'Serial') {
             // Create initial seasons/episodes based on target metadata if provided
             const numSeasons = metadata.targetMetadata?.totalSeasons || 1;
             const numEpisodes = metadata.targetMetadata?.episodesPerSeason || 1;
             
             // Just create the first episode of the first season to start with
             const { data: epData } = await supabase.from('episodes').insert({ project_id: newProjectId, title: 'ئەڵقەی ١: سەرەتا', number: 1 }).select().single();
             if (epData) {
                 initialEpisodes = [epData];
                 const { data: s } = await supabase.from('scenes').insert({ project_id: newProjectId, episode_id: epData.id, number: 1, title: 'TEASER', content: '<div class="sp-slug">TEASER</div><div class="sp-action">Fade in...</div>' }).select().single();
                 if(s) initialScenes = [{ ...s, episodeId: s.episode_id }];
             }
        } else {
             const { data: s } = await supabase.from('scenes').insert({ project_id: newProjectId, number: 1, title: 'ناوەوە. شوێن - ڕۆژ', content: '<div class="sp-slug">ناوەوە. شوێن - ڕۆژ</div><div class="sp-action">...</div>' }).select().single();
             if(s) initialScenes = [s];
        }

        const newProject: Project = {
            id: projData.id,
            title: projData.title,
            type: projData.type,
            format: projData.format,
            genres: projData.genres,
            updatedAt: projData.updated_at,
            logline: projData.logline,
            detailedStory: projData.detailed_story,
            blueprint: projData.blueprint,
            theme: projData.theme,
            setting: projData.setting,
            protagonistGoal: projData.protagonist_goal,
            targetMetadata: projData.target_metadata,
            scenes: initialScenes,
            episodes: initialEpisodes,
            characters: [], 
            locations: [],
            chatHistory: [],
            planChatHistory: [],
            sourceStoryId: sourceStoryId
        };

        setProjects(prev => [newProject, ...prev]);
        setCurrentProjectId(newProject.id);
        setIsOffline(false);
        navigateTo('dashboard');
        return newProjectId;

    } catch (err: any) {
        console.error("Add Project failed", err);
        return null;
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      try {
          const dbData: any = { ...data };
          if (data.detailedStory !== undefined) { dbData.detailed_story = data.detailedStory; delete dbData.detailedStory; }
          if (data.protagonistGoal !== undefined) { dbData.protagonist_goal = data.protagonistGoal; delete dbData.protagonistGoal; }
          if (data.targetMetadata !== undefined) { dbData.target_metadata = data.targetMetadata; delete dbData.targetMetadata; }
          
          delete dbData.scenes; delete dbData.characters; delete dbData.locations; 
          delete dbData.episodes; delete dbData.chatHistory; delete dbData.sourceStoryId;
          
          if (data.planChatHistory) {
              dbData.plan_chat_history = data.planChatHistory;
          }

          await supabase.from('projects').update({ ...dbData, updated_at: new Date() }).eq('id', id);
      } catch (err) { setIsOffline(true); }
  };
  
  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProjectId === id) {
        setCurrentProjectId('');
        navigateTo('dashboard');
    }
    try {
        await supabase.from('projects').delete().eq('id', id);
    } catch (e) { setIsOffline(true); }
  };

  const importProject = (projectData: any) => {
      const newId = generateId();
      const newProject = { ...projectData, id: newId, updatedAt: new Date().toISOString() };
      setProjects(prev => [newProject, ...prev]);
  };

  const addScene = async (episodeId?: string, sceneData?: { title?: string, content?: string, summary?: string }) => {
      if (!currentProjectId) return;
      const project = projects.find(p => p.id === currentProjectId);
      if (!project) return;

      const newSceneId = generateId();
      const nextNumber = (project.scenes.length > 0 ? Math.max(...project.scenes.map(s => s.number)) : 0) + 1;
      
      const newScene: Scene = {
          id: newSceneId,
          episodeId: episodeId,
          number: nextNumber,
          title: sceneData?.title || (project.type === 'Screenplay' ? 'INT. LOCATION - DAY' : 'New Scene'),
          content: sceneData?.content || '',
          summary: sceneData?.summary || ''
      };

      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, scenes: [...p.scenes, newScene] };
          }
          return p;
      }));

      if (!episodeId && !currentSceneId) {
          setCurrentSceneId(newSceneId);
      }

      try {
          await supabase.from('scenes').insert({
              project_id: currentProjectId,
              episode_id: episodeId,
              number: newScene.number,
              title: newScene.title,
              content: newScene.content,
              summary: newScene.summary,
              id: newSceneId
          });
      } catch (e) { setIsOffline(true); }
  };

  const deleteScene = async (sceneId: string) => {
      if (!currentProjectId) return;
      
      const project = projects.find(p => p.id === currentProjectId);

      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              const remaining = p.scenes.filter(s => s.id !== sceneId).sort((a, b) => a.number - b.number);
              // Renumber scenes to fill the gap
              const renumbered = remaining.map((s, i) => ({ ...s, number: i + 1 }));
              return { ...p, scenes: renumbered };
          }
          return p;
      }));
      
      if (currentSceneId === sceneId) setCurrentSceneId('');

      try {
          // 1. Delete the target scene
          await supabase.from('scenes').delete().eq('id', sceneId);

          // 2. Update numbers for remaining scenes in DB
          if (project) {
               const remaining = project.scenes.filter(s => s.id !== sceneId).sort((a, b) => a.number - b.number);
               const updates = remaining.map((s, i) => ({ id: s.id, number: i + 1, oldNumber: s.number }))
                                      .filter(u => u.number !== u.oldNumber);
               
               for (const update of updates) {
                   await supabase.from('scenes').update({ number: update.number }).eq('id', update.id);
               }
          }
      } catch (e) { setIsOffline(true); }
  };

  const updateSceneContent = async (sceneId: string, content: string) => {
      if (!currentProjectId) return;
      
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { 
                  ...p, 
                  scenes: p.scenes.map(s => s.id === sceneId ? { ...s, content } : s) 
              };
          }
          return p;
      }));

      if (sceneUpdateTimeoutRef.current[sceneId]) {
          clearTimeout(sceneUpdateTimeoutRef.current[sceneId]);
      }

      sceneUpdateTimeoutRef.current[sceneId] = setTimeout(async () => {
          try {
              await supabase.from('scenes').update({ content }).eq('id', sceneId);
          } catch (e) { setIsOffline(true); }
      }, 1000);
  };

  const updateSceneSummary = async (sceneId: string, summary: string) => {
       if (!currentProjectId) return;
       setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { 
                  ...p, 
                  scenes: p.scenes.map(s => s.id === sceneId ? { ...s, summary } : s) 
              };
          }
          return p;
      }));
      try {
          await supabase.from('scenes').update({ summary }).eq('id', sceneId);
      } catch (e) { setIsOffline(true); }
  };

  const addCharacter = async (charData: Omit<Character, 'id' | 'arcCompletion' | 'relationships'>): Promise<string | null> => {
      if (!currentProjectId) return null;
      const newId = generateId();
      const newChar: Character = {
          id: newId,
          ...charData,
          arcCompletion: 0,
          relationships: []
      };

      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, characters: [...p.characters, newChar] };
          }
          return p;
      }));

      try {
          await supabase.from('characters').insert({
              project_id: currentProjectId,
              id: newId,
              name: newChar.name,
              role: newChar.role,
              archetype: newChar.archetype,
              description: newChar.description,
              traits: newChar.traits,
              relationships: []
          });
      } catch (e) { setIsOffline(true); }
      return newId;
  };

  const updateCharacter = async (char: Character) => {
      if (!currentProjectId) return;
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { 
                  ...p, 
                  characters: p.characters.map(c => c.id === char.id ? char : c) 
              };
          }
          return p;
      }));

      try {
          await supabase.from('characters').update({
              name: char.name,
              role: char.role,
              archetype: char.archetype,
              description: char.description,
              traits: char.traits,
              relationships: char.relationships
          }).eq('id', char.id);
      } catch (e) { setIsOffline(true); }
  };

  const deleteCharacter = async (id: string) => {
      if (!currentProjectId) return;
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, characters: p.characters.filter(c => c.id !== id) };
          }
          return p;
      }));
      try {
          await supabase.from('characters').delete().eq('id', id);
      } catch (e) { setIsOffline(true); }
  };

  const addLocation = async (locData: Omit<Location, 'id'>) => {
      if (!currentProjectId) return;
      const newId = generateId();
      const newLoc: Location = {
          id: newId,
          ...locData
      };

      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, locations: [...p.locations, newLoc] };
          }
          return p;
      }));

      try {
          await supabase.from('locations').insert({
              project_id: currentProjectId,
              id: newId,
              name: newLoc.name,
              type: newLoc.type,
              description: newLoc.description
          });
      } catch (e) { setIsOffline(true); }
  };

  const deleteLocation = async (id: string) => {
      if (!currentProjectId) return;
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, locations: p.locations.filter(l => l.id !== id) };
          }
          return p;
      }));
      try {
          await supabase.from('locations').delete().eq('id', id);
      } catch (e) { setIsOffline(true); }
  };

  const addEpisode = async () => {
      if (!currentProjectId) return;
      const project = projects.find(p => p.id === currentProjectId);
      if (!project) return;

      const newId = generateId();
      const nextNum = (project.episodes?.length || 0) + 1;
      const newEp: Episode = {
          id: newId,
          title: `Episode ${nextNum}`,
          number: nextNum,
          summary: ''
      };

      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, episodes: [...(p.episodes || []), newEp] };
          }
          return p;
      }));

      try {
          await supabase.from('episodes').insert({
              project_id: currentProjectId,
              id: newId,
              title: newEp.title,
              number: newEp.number,
              summary: ''
          });
      } catch (e) { setIsOffline(true); }
  };

  const updateEpisode = async (episodeId: string, title: string) => {
      if (!currentProjectId) return;
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { 
                  ...p, 
                  episodes: p.episodes?.map(e => e.id === episodeId ? { ...e, title } : e) || [] 
              };
          }
          return p;
      }));

      try {
          await supabase.from('episodes').update({ title }).eq('id', episodeId);
      } catch (e) { setIsOffline(true); }
  };
  
  const bulkDeleteItems = async (items: { id: string, type: 'character' | 'location' | 'scene' }[]) => {
    if (!currentProjectId) return;
    
    // Capture project state before update for DB logic if needed
    const project = projects.find(p => p.id === currentProjectId);

    setProjects(prev => prev.map(p => {
        if (p.id !== currentProjectId) return p;
        
        let newP = { ...p };
        const charIds = items.filter(i => i.type === 'character').map(i => i.id);
        const locIds = items.filter(i => i.type === 'location').map(i => i.id);
        const sceneIds = items.filter(i => i.type === 'scene').map(i => i.id);
        
        if (charIds.length) newP.characters = newP.characters.filter(c => !charIds.includes(c.id));
        if (locIds.length) newP.locations = newP.locations.filter(l => !locIds.includes(l.id));
        
        if (sceneIds.length) {
            // Renumber remaining scenes
            const remaining = newP.scenes.filter(s => !sceneIds.includes(s.id)).sort((a,b) => a.number - b.number);
            newP.scenes = remaining.map((s, i) => ({ ...s, number: i + 1 }));
        }
        
        return newP;
    }));

    try {
        const charIds = items.filter(i => i.type === 'character').map(i => i.id);
        const locIds = items.filter(i => i.type === 'location').map(i => i.id);
        const sceneIds = items.filter(i => i.type === 'scene').map(i => i.id);

        if (charIds.length) await supabase.from('characters').delete().in('id', charIds);
        if (locIds.length) await supabase.from('locations').delete().in('id', locIds);
        
        if (sceneIds.length) {
            await supabase.from('scenes').delete().in('id', sceneIds);
            // Renumber remaining scenes in DB
            if (project) {
                const remaining = project.scenes.filter(s => !sceneIds.includes(s.id)).sort((a,b) => a.number - b.number);
                const updates = remaining.map((s, i) => ({ id: s.id, number: i + 1, oldNumber: s.number }))
                                       .filter(u => u.number !== u.oldNumber);
                
                for (const update of updates) {
                    await supabase.from('scenes').update({ number: update.number }).eq('id', update.id);
                }
            }
        }
    } catch(e) { setIsOffline(true); }
  };

  const importCharactersFromBlueprint = async (blueprintText?: string): Promise<number> => {
      if (!currentProjectId) return 0;
      const project = projects.find(p => p.id === currentProjectId);
      if (!project) return 0;
      
      const text = blueprintText || project.blueprint || project.detailedStory;
      if (!text) return 0;
      
      try {
          const extracted = await extractCharactersFromText(text);
          if (!extracted || extracted.length === 0) return 0;
          
          const newCharacters: Character[] = [];
          const nameToIdMap: Record<string, string> = {};
          
          // Pre-populate map with existing characters
          project.characters.forEach(c => {
              nameToIdMap[c.name.toLowerCase()] = c.id;
          });

          // PASS 1: Generate IDs and store basic details for NEW characters
          for (const charData of extracted) {
              const normalizedName = charData.name.toLowerCase();
              if (!nameToIdMap[normalizedName]) {
                  const newId = generateId();
                  nameToIdMap[normalizedName] = newId;
                  
                  newCharacters.push({
                      id: newId,
                      name: charData.name as string,
                      role: (charData.role as string) || 'Supporting',
                      archetype: (charData.archetype as string) || '',
                      description: (charData.description as string) || '',
                      traits: (charData.traits as string[]) || [],
                      relationships: [], // Will fill in Pass 2
                      arcCompletion: 0
                  });
              }
          }

          // PASS 2: Resolve Relationships
          // We iterate through the AI response again to map relationships using the IDs we just generated (or found)
          extracted.forEach(charData => {
              const sourceId = nameToIdMap[charData.name.toLowerCase()];
              // Find the character object we just created (if it's new)
              const charObj = newCharacters.find(c => c.id === sourceId);
              
              if (charObj && charData.relationships && Array.isArray(charData.relationships)) {
                  const resolvedRelationships: Relationship[] = [];
                  
                  charData.relationships.forEach((rel: any) => {
                      const targetId = nameToIdMap[rel.targetName?.toLowerCase()];
                      if (targetId && targetId !== sourceId) {
                          resolvedRelationships.push({
                              targetId: targetId,
                              type: rel.type || 'Connected',
                              description: rel.description || ''
                          });
                      }
                  });
                  
                  charObj.relationships = resolvedRelationships;
              }
          });

          if (newCharacters.length === 0) return 0;

          // BATCH UPDATE STATE
          setProjects(prev => prev.map(p => {
              if (p.id === currentProjectId) {
                  return { ...p, characters: [...p.characters, ...newCharacters] };
              }
              return p;
          }));

          // BATCH INSERT DB
          const dbPayload = newCharacters.map(c => ({
              project_id: currentProjectId,
              id: c.id,
              name: c.name,
              role: c.role,
              archetype: c.archetype,
              description: c.description,
              traits: c.traits,
              relationships: c.relationships
          }));

          try {
              await supabase.from('characters').insert(dbPayload);
          } catch(e) {
              console.warn("Offline mode - saved locally", e);
              setIsOffline(true);
          }

          return newCharacters.length;
      } catch (e) {
          console.error(e);
          return 0;
      }
  };

  const addChatMessage = async (projectId: string, message: ChatMessage) => {
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) return { ...p, chatHistory: [...(p.chatHistory || []), message] };
        return p;
    }));
    try {
        await supabase.from('chat_history').insert({
            project_id: projectId,
            role: message.role,
            text: message.text,
            has_contradiction: message.hasContradiction
        });
    } catch (e) { setIsOffline(true); }
  };

  const addPlanChatMessage = async (projectId: string, message: ChatMessage) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      const newHistory = [...(project.planChatHistory || []), message];
      
      setProjects(prev => prev.map(p => {
          if (p.id === projectId) return { ...p, planChatHistory: newHistory };
          return p;
      }));

      try {
          await supabase.from('projects').update({
              plan_chat_history: newHistory,
              updated_at: new Date()
          }).eq('id', projectId);
      } catch (e) { setIsOffline(true); }
  };

  const replaceTextInProject = (projectId: string, search: string, replace: string) => {
      setProjects(prev => prev.map(p => {
          if (p.id === projectId) {
              return { 
                  ...p, 
                  scenes: p.scenes.map(s => ({
                      ...s,
                      content: s.content.split(search).join(replace)
                  }))
              };
          }
          return p;
      }));
  };

  return (
    <ProjectContext.Provider value={{
      projects, stories, currentProject, currentSceneId, currentStoryId, currentView,
      isSidebarOpen, isRightPanelOpen, isLoading, isOffline,
      setSidebarOpen, setRightPanelOpen, setCurrentProject: setCurrentProjectId,
      setCurrentSceneId, setCurrentStoryId, navigateTo,
      addProject, createProjectFromStory, addStory, updateStory, deleteStory, updateProject, deleteProject, importProject,
      addScene, deleteScene, updateSceneContent, updateSceneSummary,
      addCharacter, updateCharacter, deleteCharacter, importCharactersFromBlueprint,
      addLocation, deleteLocation, bulkDeleteItems, 
      addEpisode, updateEpisode,
      addChatMessage,
      addPlanChatMessage,
      replaceTextInProject,
      confirmationState, showConfirmation, hideConfirmation,
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
