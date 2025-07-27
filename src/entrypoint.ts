#!/usr/bin/env node

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

import { Command } from 'commander';
import chalk from './vendor/chalk';
import { installHooks } from 'src/commands/install';
import { uninstallHooks } from 'src/commands/uninstall';

// Declarative specification of which hooks to install
const HOOKS_TO_INSTALL = {
  PreToolUse: [
    {
      matcher: '*',
      hooks: [
        {
          type: 'command',
          command: 'happy-coder-hooks PreToolUse'
        }
      ]
    }
  ],
  PostToolUse: [
    {
      matcher: '*',
      hooks: [
        {
          type: 'command',
          command: 'happy-coder-hooks PostToolUse'
        }
      ]
    }
  ]
};

const program = new Command();

program
  .name('claude-hooks')
  .description('CLI tool for managing Claude Code hooks')
  .version('1.0.0');

program
  .command('install')
  .description('Install Claude Code hooks')
  .action(async () => {
    //console.log(chalk.blue('◆') + ' Installing Claude hooks');
    //console.log(chalk.gray('Claude hooks are shell commands that run when you use specific tools.'));
    //console.log(chalk.gray('They are configured in .claude directory settings files.\n'));

    try {
      await installHooks(HOOKS_TO_INSTALL);
    } catch (error) {
      console.error(chalk.red('Error installing hooks:'), error);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Uninstall Claude Code hooks')
  .action(async () => {
    try {
      await uninstallHooks(HOOKS_TO_INSTALL);
    } catch (error) {
      console.error(chalk.red('Error uninstalling hooks:'), error);
      process.exit(1);
    }
  });

program.parse(); 
