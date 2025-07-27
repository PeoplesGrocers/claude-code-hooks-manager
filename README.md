# Claude Hooks Library - Usage

## As a CLI tool:
```bash
# Install globally
npm install -g @peoplesgrocers/claude-code-hooks-manager

# Use the binary
cchooks install my-tool-hooks-definition.json
cchooks uninstall my-tools-hooks-definition.json
```

## As a library:
```typescript
// Import the library functions
import { installHooks, uninstallHooks } from '@peoplesgrocers/claude-code-hooks-manager/lib';

const MY_HOOKS = {
  PreToolUse: [
    {
      matcher: '*',
      hooks: [
        {
          type: 'command',
          command: 'my-custom-binary PreToolUse'
        }
      ]
    }
  ]
};

await installHooks(MY_HOOKS);
await uninstallHooks(MY_HOOKS, { binaryName: 'my-custom-binary' });
```

## Why use this library?

See this output? That's 1000+ lines of cross-platform compatibility, error
handling, and JSON editing you don't have to write.

```
user@work 12.057-joint-venture-claude-code-client % node experiment-insert-hooks/dist/entrypoint.js install
◆ Installing 2 hooks into .claude/settings.local.json (personal, not committed)

Looking for .claude directory in...
  ✗ /Users/user/src/github.com/12.057-joint-venture-claude-code-client
  ✗ /Users/user/src/github.com
  ✗ /Users/user/src
⚠ No .claude directory found in 3 locations

I can create a new .claude directory for you.
This will establish a new scope for Claude settings.
? Where should I create the .claude directory? › - Use arrow-keys. Return to submit.
    ../../src (2 levels up)
    ../github.com (parent)
    . (current directory)
❯   Cancel installation
```

For engineers who don't want to debug weird platform issues. I've already done
the R&D on weird compatibility edge cases across different IDEs, terminals, and
operating systems. I made friendly error messages tell users exactly what's
wrong and how to fix it.

What you get:
  - Precise JSON editing that preserves formatting and comments
  - Surgical uninstall (only removes what it added)
  - Users can self-diagnose 95% of installation issues
  - Windows/Mac/Linux compatibility baked in

What you avoid:
  - Reimplementing .claude project directory discovery logic
  - Cross-platform file permission headaches
  - JSON editing edge cases
  - "Installation failed" support ticket

Focus on your hook commands, not installation debugging.

### Philosophy
You're a guest in their settings.local.json file. Users have comments, weird
formatting, existing hooks. If you just JSON.parse() + JSON.stringify() to add
your hooks, you'll nuke their formatting and users will be rightfully mad.

This library respects their file: 2-step process with file-level diff preview
before any destructive operations. Auto-detects popular diff tools (difft,
delta, etc.) they already have installed. Users see exactly what changes,
accept/reject, then atomic file swap.

Maximum respect for the end user developer is baked into this library.

```
user@work experiment-insert-hooks % node dist/entrypoint.js uninstall
Looking for .claude directory in...
  ✓ /Users/user/src/github.com/12.057-joint-venture-claude-code-client/experiment-insert-hooks
  I see there's already a settings.local.json file
Uninstalling hooks...

Showing diff (difft):

settings.local.json --- JSON
 1 1 {
 2 2     "some": "key",
 3 3     // This is a comment
 4 4             "and another key": 6,
 5 .             "hooks": {
 6 .               "PreToolUse": [
 7 .                 {
 8 .                   "matcher": "*",
 9 .                   "hooks": [
10 .                     {
11 .                       "type": "command",
12 .                       "command": "happy-coder-hooks PreToolUse"
13 .                     }
14 .                   ]
15 .                 }
16 .               ],
17 .               "PostToolUse": [
18 .                 {
19 .                   "matcher": "*",
20 .                   "hooks": [
21 .                     {
22 .                       "type": "command",
23 .                       "command": "happy-coder-hooks PostToolUse"
24 .                     }
25 .                   ]
26 .                 }
27 .               ]
28 .             }
29 5 }

? Remove 2 hooks entries? › (Y/n)
```
