import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Project, Scene, Character, Location, ViewType, ProjectType, ProjectFormat, Episode, ChatMessage, Relationship, Story, StoryData } from '../types';
import { supabase } from '../lib/supabase';
import { extractCharactersFromText, extractLocationsFromText } from '../services/geminiService';

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
      metadata: { logline: string, detailedStory: string, blueprint?: string, theme: string, setting: string, protagonistGoal: string, pov?: string, targetMetadata?: any },
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
  updateCharacter: (char: Character) => Promise<void>;
  deleteCharacter: (id: string) => void;
  importCharactersFromBlueprint: (blueprintText?: string) => Promise<number>;
  addLocation: (loc: Omit<Location, 'id'>) => Promise<void>;
  deleteLocation: (id: string) => void;
  importLocationsFromBlueprint: (blueprintText?: string) => Promise<number>;
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
            pov: p.target_metadata?.pov || p.pov,
            targetMetadata: p.target_metadata,
            sourceStoryId: p.source_story_id,
            planChatHistory: p.plan_chat_history || [],
            
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
      const pov = structuredData.pov || '';
      const targetMetadata = structuredData.targetMetadata || {};
      
      const blueprint = ''; 

      await addProject(
          title, type, format, genres,
          { logline, detailedStory, blueprint, theme, setting, protagonistGoal, pov, targetMetadata },
          story.id,
          [] 
      );
  };

  const addProject = async (
      title: string, 
      type: ProjectType, 
      format: ProjectFormat, 
      genres: string[], 
      metadata: { logline: string, detailedStory: string, blueprint?: string, theme: string, setting: string, protagonistGoal: string, pov?: string, targetMetadata?: any },
      sourceStoryId?: string,
      initialCharacters?: any[]
  ): Promise<string | null> => {
    try {
        const targetMetadata = metadata.targetMetadata || (
            type === 'Screenplay' ? { durationMinutes: 110 } : 
            type === 'Novel' ? { targetPageCount: 300 } : 
            type === 'Serial' ? { totalSeasons: 1, episodesPerSeason: 8, episodeDuration: 50 } :
            type === 'Advertisement' ? { adDurationSeconds: 30 } :
            { durationMinutes: 90 }
        );
        
        if (metadata.pov) {
            targetMetadata.pov = metadata.pov;
        }

        const payload: any = {
            title, type, format, genres,
            logline: metadata.logline,
            detailed_story: metadata.detailedStory,
            blueprint: metadata.blueprint || '',
            theme: metadata.theme,
            setting: metadata.setting,
            protagonist_goal: metadata.protagonistGoal,
            target_metadata: targetMetadata,
            plan_chat_history: []
        };
        
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (sourceStoryId && uuidRegex.test(sourceStoryId)) {
            payload.source_story_id = sourceStoryId;
        }

        const { data: projData, error: projError } = await supabase.from('projects').insert(payload).select().single();
        if (projError || !projData) throw projError;
        
        const newProjectId = projData.id;
        
        let initialScenes: Scene[] = [];
        let initialEpisodes: Episode[] = [];

        if (type === 'Serial') {
             const { data: epData } = await supabase.from('episodes').insert({ project_id: newProjectId, title: 'ئەڵقەی ١: سەرەتا', number: 1 }).select().single();
             if (epData) {
                 initialEpisodes = [epData];
                 const { data: s } = await supabase.from('scenes').insert({ project_id: newProjectId, episode_id: epData.id, number: 1, title: 'TEASER', content: '<div class="sp-slug">TEASER</div><div class="sp-action">Fade in...</div>' }).select().single();
                 if(s) initialScenes = [{ ...s, episodeId: s.episode_id }];
             }
        } else if (type === 'Novel') {
             const { data: s } = await supabase.from('scenes').insert({ 
                 project_id: newProjectId, 
                 number: 1, 
                 title: 'Chapter 1', 
                 content: '<h1>Chapter 1</h1><p>Start writing your story here...</p>' 
            }).select().single();
             if(s) initialScenes = [s];
        } else if (type === 'Advertisement') {
             const { data: s } = await supabase.from('scenes').insert({ 
                 project_id: newProjectId, 
                 number: 1, 
                 title: 'TV SPOT - 30s', 
                 content: '<div class="sp-slug">TV SPOT - 30s</div><div class="sp-action">VISUAL: Open on product...</div>' 
            }).select().single();
             if(s) initialScenes = [s];
        } else {
             const { data: s } = await supabase.from('scenes').insert({ 
                 project_id: newProjectId, 
                 number: 1, 
                 title: 'INT. LOCATION - DAY', 
                 content: '<div class="sp-slug">INT. LOCATION - DAY</div><div class="sp-action">Action description...</div>' 
            }).select().single();
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
            pov: targetMetadata.pov,
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
        console.error("Add Project failed:", err);
        return null;
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      try {
          const dbData: any = { ...data };
          if (data.detailedStory !== undefined) { dbData.detailed_story = data.detailedStory; delete dbData.detailedStory; }
          if (data.protagonistGoal !== undefined) { dbData.protagonist_goal = data.protagonistGoal; delete dbData.protagonistGoal; }
          
          if (data.targetMetadata !== undefined || data.pov !== undefined) {
             const currentProject = projects.find(p => p.id === id);
             const baseMeta = currentProject?.targetMetadata || {};
             
             const finalMeta = data.targetMetadata ? { ...data.targetMetadata } : { ...baseMeta };
             
             if (data.pov !== undefined) {
                 finalMeta.pov = data.pov;
             } else if (!data.targetMetadata && baseMeta.pov) {
                 // Preserve existing POV
             } else if (data.targetMetadata && baseMeta.pov && !data.targetMetadata.pov) {
                 finalMeta.pov = baseMeta.pov;
             }

             dbData.target_metadata = finalMeta;
             delete dbData.targetMetadata;
             delete dbData.pov;
          }
          
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
      
      let defaultTitle = 'New Scene';
      let defaultContent = '';

      if (project.blueprint) {
          const headerRegex = new RegExp(`(?:^|\\n)#{2,3}\\s*(?:Chapter|Scene|Episode)?\\s*${nextNumber}\\b[:.]?\\s*(.*?)(?:\\n|$)`, 'i');
          const match = project.blueprint.match(headerRegex);
          if (match && match[1]) {
              let cleanTitle = match[1].replace(/\[.*?\]/g, '').trim();
              cleanTitle = cleanTitle.replace(/^[-:.]+\s*/, '');
              if (cleanTitle.length > 0) {
                  defaultTitle = cleanTitle;
              }
          }
      }

      if (project.type === 'Novel') {
          if (defaultTitle === 'New Scene') defaultTitle = `Chapter ${nextNumber}`;
          defaultContent = `<h1>${defaultTitle}</h1><p></p>`;
      } else {
          if (defaultTitle === 'New Scene') defaultTitle = 'INT. LOCATION - DAY';
          defaultContent = `<div class="sp-slug">${defaultTitle.toUpperCase()}</div><div class="sp-action"></div>`;
      }

      if (sceneData?.title) defaultTitle = sceneData.title;
      if (sceneData?.content) defaultContent = sceneData.content;

      const newScene: Scene = {
          id: newSceneId,
          episodeId: episodeId,
          number: nextNumber,
          title: defaultTitle,
          content: defaultContent,
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
      
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              const remaining = p.scenes.filter(s => s.id !== sceneId).sort((a, b) => a.number - b.number);
              // Renumber scenes to fill the gap
              const renumbered = remaining.map((s, i) => ({ ...s, number: i + 1 }));
              
              if (currentSceneId === sceneId) {
                  const adjacent = renumbered[0];
                  setCurrentSceneId(adjacent ? adjacent.id : '');
              }
              
              return { ...p, scenes: renumbered };
          }
          return p;
      }));

      try {
          await supabase.from('scenes').delete().eq('id', sceneId);
      } catch (e) { setIsOffline(true); }
  };

  const updateSceneContent = async (sceneId: string, content: string) => {
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, scenes: p.scenes.map(s => s.id === sceneId ? { ...s, content } : s) };
          }
          return p;
      }));
      
      if (sceneUpdateTimeoutRef.current[sceneId]) clearTimeout(sceneUpdateTimeoutRef.current[sceneId]);
      sceneUpdateTimeoutRef.current[sceneId] = setTimeout(async () => {
          try {
              await supabase.from('scenes').update({ content }).eq('id', sceneId);
          } catch (e) { setIsOffline(true); }
      }, 2000);
  };

  const updateSceneSummary = async (sceneId: string, summary: string) => {
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, scenes: p.scenes.map(s => s.id === sceneId ? { ...s, summary } : s) };
          }
          return p;
      }));
      try {
          await supabase.from('scenes').update({ summary }).eq('id', sceneId);
      } catch (e) { setIsOffline(true); }
  };

  const addCharacter = async (charData: Omit<Character, 'id' | 'arcCompletion' | 'relationships'>) => {
      if (!currentProjectId) return null;
      const newId = generateId();
      const newChar: Character = {
          ...charData,
          id: newId,
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
              name: newChar.name,
              role: newChar.role,
              archetype: newChar.archetype,
              description: newChar.description,
              traits: newChar.traits,
              arc_completion: 0
          });
      } catch (e) { setIsOffline(true); }
      
      return newId;
  };

  const updateCharacter = async (char: Character) => {
      if (!currentProjectId) return;
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, characters: p.characters.map(c => c.id === char.id ? char : c) };
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
              relationships: char.relationships,
              arc_completion: char.arcCompletion
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
      try { await supabase.from('characters').delete().eq('id', id); } catch (e) { setIsOffline(true); }
  };

  const importCharactersFromBlueprint = async (blueprintText?: string): Promise<number> => {
      if (!currentProjectId) return 0;
      const project = projects.find(p => p.id === currentProjectId);
      if (!project) return 0;

      const textToAnalyze = blueprintText || project.blueprint || project.detailedStory || '';
      if (!textToAnalyze) return 0;

      const extracted = await extractCharactersFromText(textToAnalyze);
      let addedCount = 0;
      
      // 1. Map existing names to IDs for relationship resolution
      const nameToIdMap = new Map<string, string>();
      project.characters.forEach(c => {
          if (c.name) nameToIdMap.set(c.name.trim().toLowerCase(), c.id);
      });

      const newlyCreatedChars: { id: string, data: any }[] = [];

      // 2. Create Characters
      for (const c of extracted) {
          if (!c.name) continue;
          const normalizedName = c.name.trim().toLowerCase();
          
          if (nameToIdMap.has(normalizedName)) {
              continue; 
          }

          const newId = await addCharacter({
              name: c.name,
              role: c.role || 'Supporting',
              archetype: c.archetype || '',
              description: c.description || '',
              traits: c.traits || []
          });

          if (newId) {
              nameToIdMap.set(normalizedName, newId);
              newlyCreatedChars.push({ id: newId, data: c });
              addedCount++;
          }
      }

      // 3. Link Relationships for Newly Created Characters
      for (const item of newlyCreatedChars) {
          const { id, data } = item;
          
          if (data.relationships && Array.isArray(data.relationships) && data.relationships.length > 0) {
              const relationships: Relationship[] = [];
              
              for (const rel of data.relationships) {
                  if (rel.targetName) {
                      const targetId = nameToIdMap.get(rel.targetName.trim().toLowerCase());
                      if (targetId) {
                          relationships.push({
                              targetId: targetId,
                              type: rel.type || 'Connection',
                              description: rel.description || ''
                          });
                      }
                  }
              }

              if (relationships.length > 0) {
                  await updateCharacter({
                      id: id,
                      name: data.name,
                      role: data.role || 'Supporting',
                      archetype: data.archetype || '',
                      description: data.description || '',
                      traits: data.traits || [],
                      arcCompletion: 0,
                      relationships: relationships
                  });
              }
          }
      }

      return addedCount;
  };

  const addLocation = async (locData: Omit<Location, 'id'>) => {
      if (!currentProjectId) return;
      const newId = generateId();
      const newLoc: Location = { ...locData, id: newId };
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, locations: [...p.locations, newLoc] };
          }
          return p;
      }));
      try {
          await supabase.from('locations').insert({
              project_id: currentProjectId,
              name: newLoc.name,
              type: newLoc.type,
              description: newLoc.description,
              sensory_details: newLoc.sensoryDetails
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
      try { await supabase.from('locations').delete().eq('id', id); } catch (e) { setIsOffline(true); }
  };
  
  const importLocationsFromBlueprint = async (blueprintText?: string): Promise<number> => {
      if (!currentProjectId) return 0;
      const project = projects.find(p => p.id === currentProjectId);
      if (!project) return 0;

      const textToAnalyze = blueprintText || project.blueprint || project.detailedStory || '';
      if (!textToAnalyze) return 0;

      const extracted = await extractLocationsFromText(textToAnalyze);
      let addedCount = 0;
      
      const existingNames = new Set(project.locations.map(l => l.name.trim().toLowerCase()));

      for (const loc of extracted) {
          if (!loc.name) continue;
          const normalizedName = loc.name.trim().toLowerCase();
          
          if (existingNames.has(normalizedName)) {
              continue; 
          }

          await addLocation({
              name: loc.name,
              type: loc.type || 'MIXED',
              description: loc.description || ''
          });
          
          existingNames.add(normalizedName);
          addedCount++;
      }
      return addedCount;
  };

  const bulkDeleteItems = (items: { id: string, type: 'character' | 'location' | 'scene' }[]) => {
      if (!currentProjectId) return;
      const project = projects.find(p => p.id === currentProjectId);
      if (!project) return;

      const charIds = items.filter(i => i.type === 'character').map(i => i.id);
      const locIds = items.filter(i => i.type === 'location').map(i => i.id);
      const sceneIds = items.filter(i => i.type === 'scene').map(i => i.id);

      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              let updatedScenes = p.scenes;
              
              if (sceneIds.length > 0) {
                 const remaining = p.scenes.filter(s => !sceneIds.includes(s.id)).sort((a, b) => a.number - b.number);
                 updatedScenes = remaining.map((s, i) => ({ ...s, number: i + 1 }));
              }

              return {
                  ...p,
                  characters: p.characters.filter(c => !charIds.includes(c.id)),
                  locations: p.locations.filter(l => !locIds.includes(l.id)),
                  scenes: updatedScenes
              };
          }
          return p;
      }));

      // Async DB Deletions
      (async () => {
          try {
              if (charIds.length) await supabase.from('characters').delete().in('id', charIds);
              if (locIds.length) await supabase.from('locations').delete().in('id', locIds);
              if (sceneIds.length) await supabase.from('scenes').delete().in('id', sceneIds);
          } catch(e) { setIsOffline(true); }
      })();
  };

  const addEpisode = async () => {
      if (!currentProjectId) return;
      const project = projects.find(p => p.id === currentProjectId);
      if (!project) return;
      
      const nextNum = (project.episodes?.length || 0) + 1;
      const newEpTitle = `ئەڵقەی ${nextNum}`;
      
      const { data, error } = await supabase.from('episodes').insert({
          project_id: currentProjectId,
          title: newEpTitle,
          number: nextNum
      }).select().single();
      
      if (data) {
          const newEp: Episode = { id: data.id, title: data.title, number: data.number, summary: '' };
          setProjects(prev => prev.map(p => {
              if (p.id === currentProjectId) {
                  return { ...p, episodes: [...(p.episodes || []), newEp] };
              }
              return p;
          }));
      }
  };

  const updateEpisode = async (episodeId: string, title: string) => {
      if (!currentProjectId) return;
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectId) {
              return { ...p, episodes: (p.episodes || []).map(e => e.id === episodeId ? { ...e, title } : e) };
          }
          return p;
      }));
      try {
          await supabase.from('episodes').update({ title }).eq('id', episodeId);
      } catch (e) { setIsOffline(true); }
  };

  const addChatMessage = async (projectId: string, message: ChatMessage) => {
      setProjects(prev => prev.map(p => {
          if (p.id === projectId) {
              return { ...p, chatHistory: [...(p.chatHistory || []), message] };
          }
          return p;
      }));
      try {
          await supabase.from('chat_history').insert({
              project_id: projectId,
              id: message.id,
              role: message.role,
              text: message.text,
              has_contradiction: message.hasContradiction
          });
      } catch (e) { setIsOffline(true); }
  };

  const addPlanChatMessage = async (projectId: string, message: ChatMessage) => {
      setProjects(prev => prev.map(p => {
          if (p.id === projectId) {
              return { ...p, planChatHistory: [...(p.planChatHistory || []), message] };
          }
          return p;
      }));
      // We store plan chat in project metadata for simplicity or a new table if needed.
      // For now, let's just update the project row's plan_chat_history jsonb column.
      const project = projects.find(p => p.id === projectId);
      if (project) {
          const updatedHistory = [...(project.planChatHistory || []), message];
          try {
             await supabase.from('projects').update({ plan_chat_history: updatedHistory }).eq('id', projectId);
          } catch(e) { setIsOffline(true); }
      }
  };
  
  const replaceTextInProject = async (projectId: string, search: string, replace: string) => {
      setProjects(prev => prev.map(p => {
          if (p.id === projectId) {
              // Replace in scenes
              const newScenes = p.scenes.map(s => ({
                  ...s,
                  content: s.content.split(search).join(replace),
                  title: s.title.split(search).join(replace),
                  summary: s.summary ? s.summary.split(search).join(replace) : s.summary
              }));
              // Replace in characters
              const newChars = p.characters.map(c => ({
                  ...c,
                  name: c.name.split(search).join(replace),
                  description: c.description.split(search).join(replace)
              }));
              
              return { ...p, scenes: newScenes, characters: newChars };
          }
          return p;
      }));
      
      // We don't implement full DB bulk update here for brevity, usually you'd need a backend function
      // For now, we rely on the user visiting scenes to trigger specific saves or we iterate:
      const project = projects.find(p => p.id === projectId);
      if (project) {
          for (const s of project.scenes) {
              if (s.content.includes(search) || s.title.includes(search)) {
                  const newContent = s.content.split(search).join(replace);
                  const newTitle = s.title.split(search).join(replace);
                  await supabase.from('scenes').update({ content: newContent, title: newTitle }).eq('id', s.id);
              }
          }
          for (const c of project.characters) {
              if (c.name.includes(search)) {
                  const newName = c.name.split(search).join(replace);
                  await supabase.from('characters').update({ name: newName }).eq('id', c.id);
              }
          }
      }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      stories,
      currentProject,
      currentSceneId,
      currentStoryId,
      currentView,
      isSidebarOpen,
      isRightPanelOpen,
      isLoading,
      isOffline,
      setSidebarOpen,
      setRightPanelOpen,
      setCurrentProject: (id) => { setCurrentProjectId(id); setCurrentSceneId(''); },
      setCurrentSceneId,
      setCurrentStoryId,
      navigateTo,
      addProject,
      createProjectFromStory,
      addStory,
      updateStory,
      deleteStory,
      updateProject,
      deleteProject,
      importProject,
      addScene,
      deleteScene,
      updateSceneContent,
      updateSceneSummary,
      addCharacter,
      updateCharacter,
      deleteCharacter,
      importCharactersFromBlueprint,
      addLocation,
      deleteLocation,
      importLocationsFromBlueprint,
      bulkDeleteItems,
      addEpisode,
      updateEpisode,
      addChatMessage,
      addPlanChatMessage,
      replaceTextInProject,
      confirmationState,
      showConfirmation,
      hideConfirmation
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};