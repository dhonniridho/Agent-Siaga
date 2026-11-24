export type GamePhase =
  | 'MENU'
  | 'TEAM_SETUP'
  | 'GUIDE' // Panduan singkat setelah tim mendaftar
  | 'WORLD_3D' // Dunia jelajah 3D (pintu masuk misi)
  | 'ACTION'
  | 'RECOVERY'
  | 'MISSION_COMPLETE' // Perayaan setelah kuis akhir misi
  | 'VICTORY';

export type DisasterType = 'EARTHQUAKE' | 'FLOOD' | 'VOLCANO' | 'LANDSLIDE';

export interface Avatar {
  id: string;
  name: string; // Internal name
  icon: string; // Emoji
  color: string;
  bgGradient: string;
}

export interface Item {
  id: string;
  name: string;
  isCorrect: boolean; 
  icon: string; 
  description: string;
}

export interface LevelConfig {
  id: DisasterType;
  title: string;
  location: string;
  color: string; 
  description: string;
  bagItems: Item[];
  quizQuestions: QuizQuestion[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PlayerState {
  teamName: string;
  score: number;
  badges: string[];
  completedLevels: DisasterType[];
  currentLevel: DisasterType | null;
}