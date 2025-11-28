export interface Chapter {
  number: number;
  title: string;
  summary?: string;
  content?: string;
  isGenerating?: boolean;
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  tags: string[];
  chapters: Chapter[];
  status: 'Serializing' | 'Completed';
  sourceUrls?: string[]; // URLs found during search
}

export enum AppState {
  IDLE,
  SEARCHING,
  PREVIEW,
  DOWNLOADING, // Fetching content for EPUB
  PACKING,     // Generating EPUB
  COMPLETE,
  ERROR
}
