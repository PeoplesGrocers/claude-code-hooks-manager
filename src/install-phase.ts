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
import { execSync, spawnSync } from 'child_process';
import * as os from 'os';

import * as jsonc from 'jsonc-parser';
import chalk from 'chalk';
import prompts from 'prompts';

import { removeHooksWithBinary, removeHooksWithDefinition } from 'src/uninstall-phase';

export interface InstallResult {
  success: boolean;
  error?: string;
  settingsPath?: string;
  createdNewFile?: boolean;
  createdNewDirectory?: boolean;
}

export interface UninstallOptions {
  diffTool?: string;
  binaryName?: string;
}

/**
 * Install Phase: Create directories if needed, install hooks, and report results
 */
export async function performInstallation(
  targetDirectory: string,
  createNewDirectory: boolean,
  hooksToInstall: Record<string, any[]>,
  settingsFile: 'settings.json' | 'settings.local.json' = 'settings.local.json'
): Promise<InstallResult> {
  console.log(`Installing hooks into project's .claude/${settingsFile}`)
  try {
    let createdNewDirectory = false;
    
    // Create .claude directory if needed
    if (createNewDirectory) {
      const claudeDir = path.join(targetDirectory, '.claude');
      console.log(`\nI'm creating a new .claude directory...`);
      await fs.mkdir(claudeDir, { recursive: true });
      console.log(chalk.green(`✓ I created: ${claudeDir}`));
      createdNewDirectory = true;
    }
    
    // Check if settings file exists
    const settingsPath = path.join(targetDirectory, '.claude', settingsFile);
    let createdNewFile = false;
    
    try {
      await fs.stat(settingsPath);
      console.log(chalk.gray(`\nI found an existing ${settingsFile} file`));
      console.log(`I'll add the hooks to it...`);
    } catch {
      console.log(`\nI'm creating a ${settingsFile} file...`);
      createdNewFile = true;
    }
    
    // Install the hooks using the jsonc-parser based addHooks function
    await addHooks(settingsPath, hooksToInstall);
    
    if (createdNewFile) {
      console.log(chalk.green(`✓ I created: ${settingsFile}`));
    }
    
    return {
      success: true,
      settingsPath,
      createdNewFile,
      createdNewDirectory
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Report the results of the installation
 */
export function reportInstallResults(result: InstallResult, hooksInstalled: Record<string, any[]>): void {
  if (!result.success) {
    console.log(chalk.red(`\n✗ I couldn't complete the installation`));
    console.log(chalk.yellow('⚠') + ` The problem was: ${result.error}`);
    return;
  }
  
  console.log(chalk.green(`\n✓`) + ` Installation complete!`);
  
  const settingsFileName = path.basename(result.settingsPath!);
  
  if (result.createdNewDirectory && result.createdNewFile) {
    console.log(chalk.gray(`I created both the .claude directory and ${settingsFileName} file`));
  } else if (result.createdNewFile) {
    console.log(chalk.gray(`I created the ${settingsFileName} file`));
  } else {
    console.log(chalk.gray(`I updated your existing ${settingsFileName} file`));
  }
  
  console.log(`\nI installed these hooks:`);
  for (const [eventName, matchers] of Object.entries(hooksInstalled)) {
    console.log(chalk.cyan(`  ${eventName}:`));
    if (Array.isArray(matchers)) {
      matchers.forEach((matcher: any) => {
        matcher.hooks.forEach((hook: any, index: number) => {
          console.log(chalk.gray(`    ${index + 1}. ${hook.command}`));
        });
      });
    }
  }
  
  console.log(chalk.gray(`\nLocation: ${result.settingsPath}`));
}

/**
 * Find diff tool to use
 */
function findDiffTool(): string {
  try {
    execSync('which difft', { stdio: 'ignore' });
    return 'difft';
  } catch {
    return 'diff';
  }
}

/**
 * Uninstall happy-coder-hooks
 */
export async function performUninstallation(
  targetDirectory: string,
  hooksToRemove: Record<string, any[]>,
  options: UninstallOptions = {}
): Promise<InstallResult> {
  try {
    const settingsPath = path.join(targetDirectory, '.claude', 'settings.local.json');
    
    // Check if settings file exists
    try {
      await fs.stat(settingsPath);
    } catch {
      console.log('No settings.local.json file found.');
      return {
        success: true,
        settingsPath
      };
    }
    
    const binaryName = options.binaryName || 'hooks';
    console.log(chalk.blue(`Uninstalling ${binaryName}...`));
    
    // Read current settings
    const currentContent = await fs.readFile(settingsPath, 'utf-8');
    
    // Remove hooks and get the result
    const result = await removeHooksWithDefinition(settingsPath, hooksToRemove);
    
    if (result.removedCount === 0) {
      console.log(`No matching ${binaryName} found to uninstall.`);
      return {
        success: true,
        settingsPath
      };
    }
    
    // Create temp directory and write new settings
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'happy-coder-hooks-'));
    const tempSettingsPath = path.join(tempDir, 'settings.local.json');
    await fs.writeFile(tempSettingsPath, result.newContent);
    
    // Show diff
    const diffTool = options.diffTool || findDiffTool();
    console.log(chalk.blue(`\nShowing diff (${diffTool}):\n`));
    
    try {
      if (diffTool === 'difft') {
        spawnSync(diffTool, [settingsPath, tempSettingsPath], { stdio: 'inherit' });
      } else {
        spawnSync(diffTool, ['-u', settingsPath, tempSettingsPath], { stdio: 'inherit' });
      }
    } catch (error) {
      console.error(chalk.red(`Error running diff tool: ${error}`));
      console.log(chalk.gray('\nCurrent settings:'));
      console.log(currentContent);
      console.log(chalk.gray('\nNew settings:'));
      console.log(result.newContent);
    }
    
    // Ask for confirmation using prompts
    const response = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `Remove ${result.removedCount} ${binaryName} entries?`,
      initial: true
    });
    
    if (response.confirmed) {
      await fs.writeFile(settingsPath, result.newContent);
      console.log(chalk.green(`\n✅ Uninstalled ${result.removedCount} ${binaryName} entries.`));
    } else {
      console.log('\nUninstall cancelled.');
    }
    
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true });
    
    return {
      success: true,
      settingsPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Add hooks to a settings file, preserving formatting and comments for existing files
 * 
 * CRITICAL: This function operates on HUMAN-OWNED configuration files!
 * 
 * The .claude/settings.local.json files are hand-edited by developers and can contain:
 * - Custom comments explaining their configuration choices
 * - Weird spacing, indentation, and formatting preferences
 * - Trailing commas, multi-line strings, and other JSON quirks
 * - Personal organization and structure that makes sense to them
 * 
 * WE ARE GUESTS IN THESE FILES. Our job is to surgically insert/update our hooks
 * without destroying ANYTHING else the human has created. We must:
 * - Preserve all existing comments
 * - Maintain their chosen formatting and spacing
 * - Keep their property ordering
 * - Handle their comma preferences (trailing or not)
 * - Leave their weird formatting exactly as they like it
 * 
 * This is why we use jsonc-parser for concrete syntax tree editing instead of
 * JSON.parse/stringify which would strip comments and reformat everything.
 * 
 * If you're tempted to "simplify" this with JSON.stringify(), DON'T.
 * You'll break someone's carefully crafted configuration file.
 */
export async function addHooks(
  settingsPath: string,
  hooks: Record<string, any[]>
): Promise<void> {
  console.log(`Adding hooks to: ${settingsPath}`);



  
  try {
    // Try to read existing file
    let content = await fs.readFile(settingsPath, 'utf-8');
    const errors: jsonc.ParseError[] = [];

    interface SettingsFile {
      hooks?: Record<string, any[]>;
      [key: string]: any;
    }

    const existingData = jsonc.parse(content, errors) as SettingsFile;
    
    if (errors.length > 0) {
      console.warn(chalk.yellow('⚠') + ` JSON parsing errors:`);
      errors.forEach(error => {
        console.warn(`  - Parse error at offset ${error.offset}`);
      });
    }
    
    console.log(chalk.gray(`Found existing settings file`));
    
    // If hooks don't exist, create the hooks object first
    if (!existingData.hooks) {
      const hooksEdits = jsonc.modify(content, ['hooks'], {}, {
        formattingOptions: { tabSize: 2, insertSpaces: true, eol: '\n' }
      });
      content = jsonc.applyEdits(content, hooksEdits);
    }
    
    // Now add each hook type using jsonc.modify
    for (const [hookType, hookConfig] of Object.entries(hooks)) {
      const edits = jsonc.modify(content, ['hooks', hookType], hookConfig, {
        formattingOptions: { tabSize: 2, insertSpaces: true, eol: '\n' }
      });
      content = jsonc.applyEdits(content, edits);
    }
    
    await fs.writeFile(settingsPath, content, 'utf-8');
  } catch (error) {
    // File doesn't exist, create new one
    console.log(chalk.gray(`Creating new settings file`));
    let content = '{}';
    
    // Add hooks object
    const hooksEdits = jsonc.modify(content, ['hooks'], {}, {
      formattingOptions: { tabSize: 2, insertSpaces: true, eol: '\n' }
    });
    content = jsonc.applyEdits(content, hooksEdits);
    
    // Add each hook type
    for (const [hookType, hookConfig] of Object.entries(hooks)) {
      const edits = jsonc.modify(content, ['hooks', hookType], hookConfig, {
        formattingOptions: { tabSize: 2, insertSpaces: true, eol: '\n' }
      });
      content = jsonc.applyEdits(content, edits);
    }
    
    await fs.writeFile(settingsPath, content, 'utf-8');
  }
  
  // Report what was added
  const hookTypes = Object.keys(hooks);
  console.log(chalk.green(`✓ Added ${hookTypes.length} hook type(s): ${hookTypes.join(', ')}`));
}
