import chalk from 'chalk';

import { discoverClaudeDirectories } from 'src/discovery-phase';
import { performUninstallation, reportUninstallResults } from 'src/uninstall-phase';

/**
 * Main uninstall workflow using the same approach as install
 */
export async function uninstallHooks(): Promise<void> {
  console.log(chalk.blue('🗑️  Uninstalling Claude hooks...\n'));
  
  // Phase 1: Discovery
  const discovery = await discoverClaudeDirectories();
  
  // Phase 2: Simple Decision Logic
  if (!discovery.claudeDirectoryFound) {
    console.log(chalk.yellow('No .claude directory found. Nothing to uninstall.'));
    return;
  }
  
  if (!discovery.settingsFileExists) {
    console.log(chalk.yellow('No settings.local.json found. Nothing to uninstall.'));
    return;
  }
  
  // Phase 3: Uninstallation
  const requiresConfirmation = !discovery.isInCurrentDirectory;
  const result = await performUninstallation(
    discovery.claudeDirectoryPath!,
    requiresConfirmation
  );
  
  // Report results
  reportUninstallResults(result);
} 