

export type ViewType = 'editor' | 'dashboard' | 'search' | 'inbox' | 'characters' | 'locations' | 'settings' | 'outline' | 'story-builder';

export type ProjectType = 'Screenplay' | 'Novel' | 'Serial' | 'Advertising';
export type ProjectFormat = 'Feature' | 'Short' | 'Episode' | 'Standard' | 'TV Commercial' | 'Social Media' | 'Radio Spot' | 'Print';

export interface Episode {
    id: string;
    title: string;
    number: number;
    summary?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    hasContradiction?: boolean;
    // New fields for Story Builder interactivity
    options?: string[];
    isMultiSelect?: boolean;
}

export interface TargetMetadata {
    // Movie
    durationMinutes?: number;
    
    // Novel
    targetPageCount?: number;
    targetWordCount?: number;
    
    // Series
    totalSeasons?: number;
    episodesPerSeason?: number;
    episodeDuration?: number;

    // Advertising
    durationSeconds?: number;
    platform?: string;
}

export interface StoryData {
    title: string;
    type: ProjectType;
    format: ProjectFormat;
    genres: string[];
    logline: string;
    detailedStory: string;
    theme: string;
    setting: string;
    protagonistGoal: string;
    characters?: any[]; // Initial character ideas
}

export interface Story {
    id: string;
    title: string;
    summary?: string; // Quick display summary
    chatSession: ChatMessage[]; // The history of the creation chat
    structuredData: StoryData; // The final data to spawn a project
    createdAt: string;
}

export interface Project {
    id: string;
    title: string;
    type: ProjectType;
    format?: ProjectFormat; 
    genres: string[];
    updatedAt: string;
    logline?: string;
    detailedStory?: string; // New field for detailed story metadata
    blueprint?: string; // New field for the generated plan
    targetMetadata?: TargetMetadata; // Configuration for length/structure
    theme?: string;
    setting?: string;
    protagonistGoal?: string;
    episodes?: Episode[]; 
    scenes: Scene[];
    characters: Character[];
    locations: Location[];
    chatHistory?: ChatMessage[]; // Editor Chat
    planChatHistory?: ChatMessage[]; // Blueprint/Plan Chat
    sourceStoryId?: string; // Link back to the concept story
}

export interface Scene {
    id: string;
    title: string;
    number: number;
    episodeId?: string; 
    content: string; 
    summary?: string;
}

export interface Relationship {
    targetId: string;
    type: string; 
    description?: string;
}

export interface Character {
    id: string;
    name: string;
    role: string; 
    archetype: string;
    arcCompletion: number;
    traits: string[];
    description: string;
    relationships: Relationship[];
}

export interface Location {
    id: string;
    name: string;
    type: 'INT' | 'EXT' | 'MIXED';
    description: string;
    sensoryDetails?: string[];
}