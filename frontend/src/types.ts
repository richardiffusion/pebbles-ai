export enum ViewState {
  DROP = 'DROP',
  CONSTRUCT = 'CONSTRUCT',
  ARTIFACT = 'ARTIFACT',
  ARCHIVE = 'ARCHIVE',
}

export enum CognitiveLevel {
  ELI5 = 'ELI5', // Simple, metaphorical
  ACADEMIC = 'ACADEMIC', // Deep, technical
}

// --- New Magazine Layout Types ---

export type IconType = 'definition' | 'history' | 'idea' | 'controversy' | 'future' | 'analysis' | 'default';

export type MainBlockType = 'text' | 'pull_quote' | 'key_points';
export type SidebarBlockType = 'definition' | 'profile' | 'stat';

export interface MainBlock {
  type: MainBlockType;
  heading?: string;
  iconType?: IconType; 
  body: string | string[]; // string for text/quote, array for list items
  isUserEdited?: boolean;
}

export interface SidebarBlock {
  type: SidebarBlockType;
  heading: string;
  body: string;
  emoji?: string; // For profile avatars or visual stats
  isUserEdited?: boolean;
}

export interface CognitiveContent {
  title: string;
  summary: string;
  emojiCollage: string[]; // 3-5 emojis for visual texture
  mainContent: MainBlock[];
  sidebarContent: SidebarBlock[];
  keywords: string[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface PebbleData {
  id: string;
  topic: string;
  timestamp: number;
  folderId: string | null; // null represents Root
  content: {
    [CognitiveLevel.ELI5]: CognitiveContent;
    [CognitiveLevel.ACADEMIC]: CognitiveContent;
  };
  socraticQuestions: string[];
  isVerified: boolean; // Acts as "Mastery Level"
  isDeleted?: boolean; // Soft delete flag
}

export interface LogEntry {
  message: string;
  timestamp: number;
}

export interface GenerationTask {
  id: string;
  status: 'generating' | 'completed';
  topic: string;
  logs: LogEntry[];
  result?: PebbleData;
  progress: number; // 0-100 representation of phase
}