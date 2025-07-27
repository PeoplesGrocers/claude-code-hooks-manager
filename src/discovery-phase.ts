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

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import chalk from './vendor/chalk';

export interface DiscoveryResult {
  claudeDirectoryFound: boolean;
  claudeDirectoryPath?: string;
  settingsFileExists?: boolean;
  isInCurrentDirectory?: boolean;
  candidateDirectories: string[];
  searchedDirectories: string[];
}

/**
 * Discovery Phase: Find existing .claude directories and identify candidate locations
 * Returns comprehensive information about what was found and where we looked
 */
export async function discoverClaudeDirectories(): Promise<DiscoveryResult> {
  const currentDir = process.cwd();
  const homeDir = os.homedir();
  const rootDir = path.parse(currentDir).root;
  
  const candidateDirectories: string[] = [];
  const searchedDirectories: string[] = [];
  
  console.log(`Looking for .claude directory in...`);
  
  // First check current directory
  const currentClaudeDir = path.join(currentDir, '.claude');
  searchedDirectories.push(currentDir);
  candidateDirectories.push(currentDir);
  
  try {
    const stats = await fs.stat(currentClaudeDir);
    if (stats.isDirectory()) {
      console.log(`  ${chalk.green('✓')} ${chalk.gray(currentDir)}`);
      
      // Check if settings.local.json exists
      const settingsPath = path.join(currentClaudeDir, 'settings.local.json');
      let settingsExists = false;
      
      try {
        await fs.stat(settingsPath);
        console.log(chalk.gray(`  I see there's already a settings.local.json file`));
        settingsExists = true;
      } catch {
        console.log(chalk.gray(`  No settings.local.json file yet`));
      }
      
      return {
        claudeDirectoryFound: true,
        claudeDirectoryPath: currentDir,
        settingsFileExists: settingsExists,
        isInCurrentDirectory: true,
        candidateDirectories,
        searchedDirectories
      };
    }
  } catch {
    console.log(`  ${chalk.red('✗')} ${chalk.gray(currentDir)}`);
  }
  
  // Search upward through parent directories
  let searchDir = currentDir;
  let foundClaudeDir: string | undefined;
  let foundSettingsExists = false;
  
  while (searchDir !== rootDir && searchDir !== path.dirname(searchDir)) {
    searchDir = path.dirname(searchDir);
    
    // Stop at home directory
    if (searchDir === homeDir) {
      break;
    }
    
    searchedDirectories.push(searchDir);
    candidateDirectories.push(searchDir);
    
    const claudeDir = path.join(searchDir, '.claude');
    
    try {
      const stats = await fs.stat(claudeDir);
      if (stats.isDirectory() && !foundClaudeDir) {
        foundClaudeDir = searchDir;
        console.log(`  ${chalk.green('✓')} ${chalk.gray(searchDir)}`);
        
        // Check for settings file
        const settingsPath = path.join(claudeDir, 'settings.local.json');
        try {
          await fs.stat(settingsPath);
          console.log(chalk.gray(`     With existing settings.local.json`));
          foundSettingsExists = true;
        } catch {
          console.log(chalk.gray(`     No settings.local.json yet`));
        }
        
        // Continue searching to find all candidates
      }
    } catch {
      console.log(`  ${chalk.red('✗')} ${chalk.gray(searchDir)}`);
    }
  }
  
  if (foundClaudeDir) {
    const relativePath = path.relative(currentDir, foundClaudeDir);
    const displayPath = relativePath.split(path.sep).map(() => '..').join('/');
    console.log(`\nI found a .claude directory at: ${displayPath}`);
    
    return {
      claudeDirectoryFound: true,
      claudeDirectoryPath: foundClaudeDir,
      settingsFileExists: foundSettingsExists,
      isInCurrentDirectory: false,
      candidateDirectories,
      searchedDirectories
    };
  }
  
  console.log(chalk.yellow('⚠') + ` No .claude directory found in ${searchedDirectories.length} locations`);
  
  return {
    claudeDirectoryFound: false,
    candidateDirectories: candidateDirectories.reverse(), // Most specific to least specific
    searchedDirectories
  };
}
