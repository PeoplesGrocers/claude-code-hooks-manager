import prompts from 'prompts';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { execSync, spawnSync } from 'child_process';
import * as jsonc from 'jsonc-parser';

export interface UninstallResult {
  success: boolean;
  error?: string;
  removedCount?: number;
  settingsPath?: string;
}

export interface SettingsFile {
  hooks?: Record<string, any[]>;
  [key: string]: any;
}

/**
 * Remove all hooks that contain a specific binary name in their commands
 * Returns the new content and count of removed hooks
 */
export async function removeHooksWithBinary(
    settingsPath: string,
    binaryName: string
): Promise<{ newContent: string; removedCount: number; }> {
    const content = await fs.readFile(settingsPath, 'utf-8');
    const errors: jsonc.ParseError[] = [];
    const existingData = jsonc.parse(content, errors) as SettingsFile;
    
    if (!existingData.hooks) {
        return { newContent: content, removedCount: 0 };
    }

    let removedCount = 0;
    let workingContent = content;

    // Track which event types to remove entirely
    const eventTypesToRemove: string[] = [];

    // Check each event type for hooks containing the binary
    for (const [eventName, matchers] of Object.entries(existingData.hooks)) {
        if (!Array.isArray(matchers)) continue;

        let hasOtherHooks = false;
        const matcherIndicesToRemove: number[] = [];

        // Check each matcher in this event
        matchers.forEach((matcher: any, index: number) => {
            if (matcher.hooks && Array.isArray(matcher.hooks)) {
                const hasBinary = matcher.hooks.some((hook: any) => 
                    hook.command && hook.command.includes(binaryName)
                );

                if (hasBinary) {
                    matcherIndicesToRemove.push(index);
                    removedCount++;
                } else {
                    hasOtherHooks = true;
                }
            }
        });

        // If all matchers are being removed, mark the entire event for removal
        if (matcherIndicesToRemove.length === matchers.length) {
            eventTypesToRemove.push(eventName);
        } else if (matcherIndicesToRemove.length > 0) {
            // Remove specific matchers (reverse order to maintain indices)
            matcherIndicesToRemove.sort((a, b) => b - a);
            for (const index of matcherIndicesToRemove) {
                const edits = jsonc.modify(workingContent, ['hooks', eventName, index], undefined, {});
                workingContent = jsonc.applyEdits(workingContent, edits);
            }
        }
    }

    // Remove entire event types that have no remaining hooks
    for (const eventType of eventTypesToRemove) {
        const edits = jsonc.modify(workingContent, ['hooks', eventType], undefined, {});
        workingContent = jsonc.applyEdits(workingContent, edits);
    }

    // Check if hooks object is now empty and remove it if so
    const updatedData = jsonc.parse(workingContent) as SettingsFile;
    if (updatedData.hooks && Object.keys(updatedData.hooks).length === 0) {
        const edits = jsonc.modify(workingContent, ['hooks'], undefined, {});
        workingContent = jsonc.applyEdits(workingContent, edits);
    }

    return { newContent: workingContent, removedCount };
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
 * Ask user for confirmation when uninstalling from parent directory
 */
async function confirmParentUninstallation(directoryPath: string): Promise<boolean> {
  console.log(chalk.yellow('\n⚠️  CONFIRMATION REQUIRED'));
  console.log(chalk.white('You are about to uninstall hooks from a parent directory.'));
  console.log(chalk.gray(`This will affect the entire project at: ${directoryPath}`));
  
  const response = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: 'Do you want to proceed?',
    initial: false
  });

  return response.confirmed === true;
}

/**
 * Uninstall Phase: Automatically remove all happy-coder-hooks entries and show diff
 */
export async function performUninstallation(
  directoryPath: string,
  requiresConfirmation: boolean = false
): Promise<UninstallResult> {
  try {
    const settingsPath = path.join(directoryPath, '.claude', 'settings.local.json');
    
    // Check if settings file exists
    try {
      await fs.stat(settingsPath);
    } catch {
      console.log(chalk.yellow('No settings.local.json file found.'));
      return {
        success: true,
        settingsPath,
        removedCount: 0
      };
    }

    // Step 1: Confirm if uninstalling from parent directory
    if (requiresConfirmation) {
      const confirmed = await confirmParentUninstallation(directoryPath);
      if (!confirmed) {
        return {
          success: false,
          error: 'Uninstallation cancelled by user'
        };
      }
    }
    
    console.log(chalk.blue('Uninstalling happy-coder-hooks...'));
    
    // Read current settings
    const currentContent = await fs.readFile(settingsPath, 'utf-8');
    
    // Remove hooks and get the result
    const result = await removeHooksWithBinary(settingsPath, 'happy-coder-hooks');
    
    if (result.removedCount === 0) {
      console.log(chalk.yellow('No happy-coder-hooks found to uninstall.'));
      return {
        success: true,
        settingsPath,
        removedCount: 0
      };
    }
    
    // Create temp directory and write new settings
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'happy-coder-hooks-'));
    const tempSettingsPath = path.join(tempDir, 'settings.local.json');
    await fs.writeFile(tempSettingsPath, result.newContent);
    
    // Show diff
    const diffTool = findDiffTool();
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
      message: `Remove ${result.removedCount} happy-coder-hooks entries?`,
      initial: true
    });
    
    if (response.confirmed) {
      await fs.writeFile(settingsPath, result.newContent);
      console.log(chalk.green(`\n✅ Uninstalled ${result.removedCount} happy-coder-hooks entries.`));
    } else {
      console.log(chalk.yellow('\nUninstall cancelled.'));
      await fs.rm(tempDir, { recursive: true });
      return {
        success: false,
        error: 'Uninstall cancelled by user'
      };
    }
    
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true });
    
    return {
      success: true,
      settingsPath,
      removedCount: result.removedCount
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Report the results of the uninstallation
 */
export function reportUninstallResults(result: UninstallResult): void {
  if (!result.success) {
    console.log(chalk.red('\n❌ Uninstallation failed'));
    console.log(chalk.yellow(`Reason: ${result.error}`));
    return;
  }

  if (!result.removedCount || result.removedCount === 0) {
    // This was already logged in performUninstallation
    return;
  }

  // Success was already logged in performUninstallation
  console.log(chalk.gray(`Location: ${result.settingsPath}`));
}
