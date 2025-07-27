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

// Library exports for using this as a reusable hook management library
export { installHooks } from './commands/install';
export { uninstallHooks } from './commands/uninstall';
export { performInstallation, performUninstallation, reportInstallResults, addHooks } from './install-phase';
export { removeHooksWithBinary, removeHooksWithDefinition } from './uninstall-phase';
export { discoverClaudeDirectories } from './discovery-phase';
export { makeInstallDecision } from './decision-phase';

// Export types
export type { InstallResult, UninstallOptions } from './install-phase';
export type { UninstallResult } from './uninstall-phase';
export type { Hook, HookMatcher, Hooks, ClaudeSettings, DirectoryInfo } from './types';