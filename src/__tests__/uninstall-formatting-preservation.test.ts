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

import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import * as jsonc from 'jsonc-parser';
import { removeHooksWithDefinition } from '../uninstall-phase';
import { Hooks } from '../types';

/**
 * FORMATTING PRESERVATION TESTS
 * 
 * These tests verify that when removing hooks leaves other content intact,
 * the existing formatting and structure is preserved as much as possible.
 * This is important for maintaining user-friendly configuration files.
 * 
 * These scenarios test partial removal where:
 * - Other matchers remain in the same event type
 * - Other events remain in the hooks object  
 * - Other configuration outside hooks remains untouched
 * - Weird formatting/spacing is preserved where possible
 * - Malformed content is left unchanged
 */

const fixturesDir = path.join(__dirname, 'fixtures');

/**
 * Helper to create a temporary file with content and run the removal function
 */
async function testFormattingPreservation(
  beforeContent: string,
  hookDefinition: Hooks,
  expectedAfterContent: string,
  testName: string
): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hooks-format-test-'));
  const tempFile = path.join(tempDir, 'settings.local.json');
  
  try {
    await fs.writeFile(tempFile, beforeContent);
    const result = await removeHooksWithDefinition(tempFile, hookDefinition);
    
    const normalizeJson = (str: string) => JSON.stringify(jsonc.parse(str));
    const actualNormalized = normalizeJson(result.newContent);
    const expectedNormalized = normalizeJson(expectedAfterContent);
    
    assert.equal(actualNormalized, expectedNormalized, 
      `${testName}: Formatting preservation should match expected result`);
      
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
}

test('formatting preservation - complex scenario with partial removal', async () => {
  const beforeContent = await fs.readFile(path.join(fixturesDir, 'complex-before.json'), 'utf-8');
  const expectedAfterContent = await fs.readFile(path.join(fixturesDir, 'complex-after.json'), 'utf-8');
  
  // Remove specific hooks while leaving others intact
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Edit",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks validate-edit"
          }
        ]
      },
      {
        matcher: "Read",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks track-read"
          },
          {
            type: "command", 
            command: "other-tool something"
          }
        ]
      }
    ],
    session_start: [
      {
        matcher: "*",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks session-init"
          }
        ]
      }
    ]
  };
  
  await testFormattingPreservation(beforeContent, hooksToRemove, expectedAfterContent, 
    'complex scenario with partial removal');
});

test('formatting preservation - weird formatting preserved where possible', async () => {
  const beforeContent = await fs.readFile(path.join(fixturesDir, 'weird-formatting-before.json'), 'utf-8');
  const expectedAfterContent = await fs.readFile(path.join(fixturesDir, 'weird-formatting-after.json'), 'utf-8');
  
  // Remove specific hooks while preserving unusual formatting
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Edit",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks validate"
          }
        ]
      },
      {
        matcher: "Write",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks track-write"
          },
          {
            type: "command",
            command: "some-other-tool action"
          }
        ]
      }
    ],
    session_end: [
      {
        matcher: "*",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks cleanup"
          }
        ]
      }
    ]
  };
  
  await testFormattingPreservation(beforeContent, hooksToRemove, expectedAfterContent, 
    'weird formatting preserved where possible');
});

test('formatting preservation - no matches returns original content unchanged', async () => {
  const originalContent = `{
    "someConfig": "value",
    "hooks": {
      "tool_use": [
        {
          "matcher": "Edit",
          "hooks": [
            {
              "type": "command",
              "command": "some-other-tool action"
            }
          ]
        }
      ],
      "otherEvent": [
        {
          "matcher": "*",
          "hooks": [
            {
              "type": "command", 
              "command": "keep-this"
            }
          ]
        }
      ]
    }
  }`;
  
  // Try to remove hooks that don't exist - everything should remain unchanged
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "NonExistent",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks something"
          }
        ]
      }
    ]
  };
  
  await testFormattingPreservation(originalContent, hooksToRemove, originalContent, 
    'no matches returns original content');
});

test('formatting preservation - partial matcher removal leaves others intact', async () => {
  const beforeContent = `{
    "settings": {
      "theme": "dark"
    },
    "hooks": {
      "tool_use": [
        {
          "matcher": "Read",
          "hooks": [
            {
              "type": "command",
              "command": "happy-coder-hooks track-read"
            }
          ]
        },
        {
          "matcher": "Write", 
          "hooks": [
            {
              "type": "command",
              "command": "other-tool keep-this"
            }
          ]
        },
        {
          "matcher": "Edit",
          "hooks": [
            {
              "type": "command",
              "command": "another-tool also-keep"
            }
          ]
        }
      ],
      "session_start": [
        {
          "matcher": "*",
          "hooks": [
            {
              "type": "command",
              "command": "preserve-this-too"
            }
          ]
        }
      ]
    }
  }`;
  
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Read",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks track-read"
          }
        ]
      }
    ]
  };
  
  // Only the Read matcher should be removed, everything else preserved
  const expectedAfterContent = `{
    "settings": {
      "theme": "dark"
    },
    "hooks": {
      "tool_use": [
        {
          "matcher": "Write", 
          "hooks": [
            {
              "type": "command",
              "command": "other-tool keep-this"
            }
          ]
        },
        {
          "matcher": "Edit",
          "hooks": [
            {
              "type": "command",
              "command": "another-tool also-keep"
            }
          ]
        }
      ],
      "session_start": [
        {
          "matcher": "*",
          "hooks": [
            {
              "type": "command",
              "command": "preserve-this-too"
            }
          ]
        }
      ]
    }
  }`;
  
  await testFormattingPreservation(beforeContent, hooksToRemove, expectedAfterContent, 
    'partial matcher removal leaves others intact');
});

test('formatting preservation - partial event removal leaves others intact', async () => {
  const beforeContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Edit",
          "hooks": [
            {
              "type": "command",
              "command": "happy-coder-hooks validate"
            }
          ]
        }
      ],
      "session_start": [
        {
          "matcher": "*",
          "hooks": [
            {
              "type": "command",
              "command": "keep-this-event"
            }
          ]
        }
      ],
      "session_end": [
        {
          "matcher": "*",
          "hooks": [
            {
              "type": "command", 
              "command": "and-this-one-too"
            }
          ]
        }
      ]
    }
  }`;
  
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Edit",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks validate"
          }
        ]
      }
    ]
  };
  
  // Only tool_use should be removed, other events preserved
  const expectedAfterContent = `{
    "hooks": {
      "session_start": [
        {
          "matcher": "*",
          "hooks": [
            {
              "type": "command",
              "command": "keep-this-event"
            }
          ]
        }
      ],
      "session_end": [
        {
          "matcher": "*",
          "hooks": [
            {
              "type": "command", 
              "command": "and-this-one-too"
            }
          ]
        }
      ]
    }
  }`;
  
  await testFormattingPreservation(beforeContent, hooksToRemove, expectedAfterContent, 
    'partial event removal leaves others intact');
});

test('formatting preservation - malformed hook structure left unchanged', async () => {
  const malformedContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Edit",
          "hooks": "not-an-array"
        },
        {
          "matcher": "Read",
          "hooks": [
            {
              "type": "command",
              "command": "valid-hook"
            }
          ]
        }
      ]
    }
  }`;
  
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Edit",
        hooks: [
          {
            type: "command",
            command: "some-command"
          }
        ]
      }
    ]
  };
  
  // Should not crash and should leave malformed content unchanged
  await testFormattingPreservation(malformedContent, hooksToRemove, malformedContent, 
    'malformed hook structure gracefully handled');
});

test.run();