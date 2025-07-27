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

import chalk from 'chalk';

import { discoverClaudeDirectories } from 'src/discovery-phase';
import { performUninstallation, UninstallOptions } from 'src/install-phase';

/**
 * Main uninstall workflow using the same approach as install
 */
export async function uninstallHooks(hooksToRemove: Record<string, any[]>, options: UninstallOptions = {}): Promise<void> {
  // Phase 1: Discovery
  const discovery = await discoverClaudeDirectories();
  
  // Phase 2: Simple Decision Logic
  if (!discovery.claudeDirectoryFound) {
    console.log('No .claude directory found. Nothing to uninstall.');
    return;
  }
  
  if (!discovery.settingsFileExists) {
    console.log('No settings.local.json found. Nothing to uninstall.');
    return;
  }
  
  // Phase 3: Uninstallation
  const result = await performUninstallation(
    discovery.claudeDirectoryPath!,
    hooksToRemove,
    options
  );
  
  // Results are reported within performUninstallation
  if (!result.success && result.error) {
    console.log(chalk.red(`\n❌ Uninstallation failed: ${result.error}`));
  }
} 
