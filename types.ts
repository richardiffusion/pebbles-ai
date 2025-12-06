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

export type BlockType = 'text' | 'image' | 'stat' | 'quote';
export type BlockWeight = 1 | 2 | 3; // 1: Minor (1x1), 2: Major (2x1 or 1x2), 3: Hero (2x2)

export interface ImageBlockData {
  url_regular: string;
  url_thumb: string;
  alt_text: string;
  photographer?: {
    name: string;
    url: string;
  };
  download_location?: string;
}

export interface ContentBlock {
  type: BlockType;
  weight: BlockWeight;
  heading?: string;
  body: string; // For 'image', this contains the search keywords
  data?: ImageBlockData; // Populated after generation/retrieval
}

export interface CognitiveContent {
  title: string;
  summary: string;
  blocks: ContentBlock[];
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