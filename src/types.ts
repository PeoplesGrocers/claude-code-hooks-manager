/*
 * CLI tool for managing Claude Code hooks
 * Copyright (C) 2025  Peoples Grocers LLC
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, see <https://www.gnu.org/licenses/>.
 */

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