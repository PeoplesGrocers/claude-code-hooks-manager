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
import { makeInstallDecision } from 'src/decision-phase';
import { performInstallation, reportInstallResults } from 'src/install-phase';

export async function installHooks(
  hooksToInstall: Record<string, any[]>, 
  settingsFile: 'settings.json' | 'settings.local.json' = 'settings.local.json'
): Promise<void> {
  const hookCount = Object.keys(hooksToInstall).length;
  const fileType = settingsFile === 'settings.local.json' ? '(personal, not committed)' : '(shared, committed with repo)';
  console.log(chalk.blue('◆') + ` Installing ${hookCount} ${hookCount > 1 ? "hooks" : "hook"} into .claude/${settingsFile} ` + chalk.gray(`${fileType}\n`));
  
  // Phase 1: Discovery
  const discovery = await discoverClaudeDirectories();
  
  // Phase 2: Decision
  const decision = await makeInstallDecision(discovery);
  
  if (!decision.proceed) {
    // User cancelled
    return;
  }
  
  // Phase 3: Installation
  const result = await performInstallation(
    decision.targetDirectory!,
    decision.createNewDirectory,
    hooksToInstall,
    settingsFile
  );
  
  // Report results
  reportInstallResults(result, hooksToInstall);
} 
