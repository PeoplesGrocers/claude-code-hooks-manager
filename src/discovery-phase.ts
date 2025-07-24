import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import chalk from 'chalk';

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
  
  console.log(chalk.blue(`I'm looking for a .claude directory...`));
  console.log(chalk.gray(`Starting in: ${currentDir}`));
  
  // First check current directory
  const currentClaudeDir = path.join(currentDir, '.claude');
  searchedDirectories.push(currentDir);
  candidateDirectories.push(currentDir);
  
  try {
    const stats = await fs.stat(currentClaudeDir);
    if (stats.isDirectory()) {
      console.log(chalk.green(`✓ I found a .claude directory right here!`));
      
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
    // Not found in current directory
  }
  
  console.log(chalk.yellow(`I don't see a .claude directory here`));
  console.log(chalk.blue(`Let me look in parent directories...`));
  
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
    const relativePath = path.relative(currentDir, searchDir);
    const displayPath = relativePath === '' ? '.' : relativePath.split(path.sep).map(() => '..').join('/');
    
    console.log(chalk.gray(`  Checking ${displayPath} (${path.basename(searchDir)})`));
    
    try {
      const stats = await fs.stat(claudeDir);
      if (stats.isDirectory() && !foundClaudeDir) {
        foundClaudeDir = searchDir;
        console.log(chalk.yellow(`  → Found .claude directory here!`));
        
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
      // Directory doesn't exist, that's ok
    }
  }
  
  if (foundClaudeDir) {
    const relativePath = path.relative(currentDir, foundClaudeDir);
    const displayPath = relativePath.split(path.sep).map(() => '..').join('/');
    console.log(chalk.blue(`\nI found a .claude directory at: ${displayPath}`));
    
    return {
      claudeDirectoryFound: true,
      claudeDirectoryPath: foundClaudeDir,
      settingsFileExists: foundSettingsExists,
      isInCurrentDirectory: false,
      candidateDirectories,
      searchedDirectories
    };
  }
  
  console.log(chalk.yellow(`\nI couldn't find any .claude directory`));
  console.log(chalk.gray(`I looked in ${searchedDirectories.length} directories from here up to ${path.basename(searchedDirectories[searchedDirectories.length - 1])}`));
  
  return {
    claudeDirectoryFound: false,
    candidateDirectories: candidateDirectories.reverse(), // Most specific to least specific
    searchedDirectories
  };
}