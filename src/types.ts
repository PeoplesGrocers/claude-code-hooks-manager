// Hook configuration types
export interface Hook {
  type: 'command';
  command: string;
}

export interface HookMatcher {
  matcher: string;
  hooks: Hook[];
}

export interface Hooks {
  [eventName: string]: HookMatcher[];
}

export interface ClaudeSettings {
  hooks?: Hooks;
}

// Type for directory information
export interface DirectoryInfo {
  path: string;
  hasSettings: boolean;
  hasLocalSettings: boolean;
  displayName: string;
} 