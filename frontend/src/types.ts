// src/types.ts
// Local type definitions that are compatible with Wails generated types

export interface Position {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
}

export interface RTZRoute {
  waypoints?: Waypoint[]; // Made optional to match generated type
}

export interface SimulationStatus {
  isRunning: boolean;
  mode: string;
  position: Position;
  speed: number;
  course: number;
  route?: any; // Use any for route to avoid type conflicts
}

export interface ManualConfig {
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
}

export interface RTZConfig {
  filePath: string;
  speed: number;
}

// Component prop types
export interface StatusBarProps {
  status: SimulationStatus;
  onStart: (config: any) => Promise<void>;
  onStop: () => Promise<void>;
}

export interface ManualModeProps {
  onStart: (config: ManualConfig) => Promise<void>;
  onUpdateSpeed: (speed: number) => Promise<void>;
  onUpdateCourse: (course: number) => Promise<void>;
  isRunning: boolean;
}

export interface RTZModeProps {
  onStart: (config: RTZConfig) => Promise<void>;
  onUpdateSpeed: (speed: number) => Promise<void>;
  onFileSelect: () => Promise<string>;
  onValidateFile: (filePath: string) => Promise<any>;
  isRunning: boolean;
}

export interface SidebarProps {
  route?: any; // Use any to avoid conflicts with generated types
  mode: 'manual' | 'rtz';
}