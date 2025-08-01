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

import path from 'path';

import prompts from 'prompts';
import chalk from './vendor/chalk';

import { DiscoveryResult } from 'src/discovery-phase';

export interface DecisionResult {
  proceed: boolean;
  targetDirectory?: string;
  createNewDirectory: boolean;
}

/**
 * Decision Phase: Get user confirmation or choice about where to install
 */
export async function makeInstallDecision(discovery: DiscoveryResult): Promise<DecisionResult> {
  // Case 1: Found .claude in current directory - proceed immediately
  if (discovery.claudeDirectoryFound && discovery.isInCurrentDirectory) {
    console.log(chalk.green(`\nGreat! I'll use the .claude directory that's already here.`));
    return {
      proceed: true,
      targetDirectory: discovery.claudeDirectoryPath,
      createNewDirectory: false
    };
  }
  
  // Case 2: Found .claude in parent directory - need confirmation
  if (discovery.claudeDirectoryFound && !discovery.isInCurrentDirectory) {
    const relativePath = path.relative(process.cwd(), discovery.claudeDirectoryPath!);
    const displayPath = relativePath.split(path.sep).map(() => '..').join('/');
    
    console.log('\n' + chalk.yellow('⚠') + '  I need to check something with you:');
    console.log(chalk.white(`I found a .claude directory in a parent folder (${displayPath})`));
    console.log(chalk.gray(`If I install there, the hooks will apply to that entire project.`));
    console.log(chalk.gray(`That includes this directory and all its siblings.`));
    
    const response = await prompts({
      type: 'confirm',
      name: 'useParent',
      message: 'Should I use that parent .claude directory?',
      initial: true
    });
    
    if (response.useParent) {
      return {
        proceed: true,
        targetDirectory: discovery.claudeDirectoryPath,
        createNewDirectory: false
      };
    }
    
    // User said no to parent, offer to create new one
    console.log(`\nOkay, I won't use the parent directory.`);
    return await offerToCreateNew(discovery);
  }
  
  // Case 3: No .claude directory found - offer choices
  return await offerToCreateNew(discovery);
}

/**
 * Offer to create a new .claude directory when none exists or user declined parent
 */
async function offerToCreateNew(discovery: DiscoveryResult): Promise<DecisionResult> {
  console.log(`\nI can create a new .claude directory for you.`);
  console.log(chalk.gray(`This will establish a new scope for Claude settings.`));
  
  // Build choices from candidate directories
  const choices = discovery.candidateDirectories.map((dir, index) => {
    const relativePath = path.relative(process.cwd(), dir);
    let displayName: string;
    
    if (relativePath === '') {
      displayName = '. (current directory)';
    } else if (relativePath.startsWith('..')) {
      const levels = relativePath.split(path.sep).length;
      const parentDesc = levels === 1 ? 'parent' : `${levels} levels up`;
      const pathWithName = '../'.repeat(levels) + path.basename(dir);
      displayName = `${pathWithName} (${parentDesc})`;
    } else {
      displayName = `${relativePath} (${path.basename(dir)})`;
    }
    
    return {
      title: displayName,
      value: dir
    };
  });
  
  // Add cancel option
  choices.push({
    title: chalk.red('Cancel installation'),
    value: '__CANCEL__'
  });
  
  const response = await prompts({
    type: 'select',
    name: 'directory',
    message: 'Where should I create the .claude directory?',
    choices: choices,
    initial: choices.length - 1  // Default to "Cancel installation"
  });
  
  if (response.directory === '__CANCEL__' || response.directory === undefined) {
    console.log(`\nI understand. No changes made.`);
    return {
      proceed: false,
      createNewDirectory: false
    };
  }
  
  return {
    proceed: true,
    targetDirectory: response.directory,
    createNewDirectory: true
  };
}
