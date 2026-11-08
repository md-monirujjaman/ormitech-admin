export interface Tutorial {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  youtubeId: string;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TutorialCategory {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
  tutorials: Tutorial[];
}

export interface CategoryInput {
  title: string;
  description: string;
  enabled: boolean;
  sortOrder?: number;
}

export interface TutorialInput {
  categoryId: string;
  title: string;
  description: string;
  /** A YouTube link or the 11-character video id; the API reads the id out of it. */
  youtubeUrl: string;
  enabled: boolean;
  sortOrder?: number;
}
