
export type ViewType = 'editor' | 'dashboard' | 'search' | 'inbox' | 'characters' | 'locations' | 'settings' | 'outline';

export type ProjectType = 'Screenplay' | 'Novel' | 'Serial';
export type ProjectFormat = 'Feature' | 'Short' | 'Episode' | 'Standard';

export interface Episode {
    id: string;
    title: string;
    number: number;
    summary?: string;
}

export interface Project {
    id: string;
    title: string;
    type: ProjectType;
    format?: ProjectFormat; 
    genres: string[];
    updatedAt: string;
    logline?: string;
    theme?: string;
    setting?: string;
    protagonistGoal?: string;
    episodes?: Episode[]; // New: For Serials
    scenes: Scene[];
    characters: Character[];
    locations: Location[];
}

export interface Scene {
    id: string;
    title: string;
    number: number;
    episodeId?: string; // New: Link to Episode
    content: string; // HTML/Text content
    summary?: string;
}

export interface Relationship {
    targetId: string;
    type: string; // e.g., "Sibling", "Enemy", "Ex-Lover"
    description?: string;
}

export interface Character {
    id: string;
    name: string;
    role: string; // e.g. Protagonist, Antagonist
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

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    hasContradiction?: boolean;
}