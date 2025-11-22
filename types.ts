
export type ViewType = 'editor' | 'dashboard' | 'search' | 'inbox' | 'characters' | 'locations' | 'settings' | 'outline';

export interface Project {
    id: string;
    title: string;
    type: 'Screenplay' | 'Novel';
    genres: string[]; // Changed from single string to array
    updatedAt: string;
    logline?: string;
    theme?: string;
    setting?: string;
    protagonistGoal?: string;
    scenes: Scene[];
    characters: Character[];
    locations: Location[];
}

export interface Scene {
    id: string;
    title: string;
    number: number;
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