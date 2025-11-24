

export type ViewType = 'editor' | 'dashboard' | 'search' | 'inbox' | 'characters' | 'locations' | 'settings' | 'outline';

export type ProjectType = 'Screenplay' | 'Novel' | 'Serial';
export type ProjectFormat = 'Feature' | 'Short' | 'Episode' | 'Standard';

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
    chatHistory?: ChatMessage[];
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