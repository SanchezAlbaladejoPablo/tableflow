# docs/AGENT_WORKFLOW.md — Rules for AI Agents

This file defines how any AI agent must operate in this repository.
These rules exist to maintain project continuity across multiple development sessions.

---

## Mandatory Session Sequence

**Every development session must follow these steps in order. Never skip any step.**

### Step 1 — Read Context Files

Read in this exact order:
1. `CLAUDE.md` — primary context, tech stack, conventions
2. `MEMORY.md` — accumulated project knowledge
3. `PROJECT_STATUS.md` — what is done and what is next
4. `TASK_QUEUE.md` — ordered task list

### Step 2 — Identify the Next Task

- Find the first task with status `PENDING` in `TASK_QUEUE.md`
- Mark it `IN_PROGRESS` before starting work
- If a task is too large, split it into sub-tasks and add them to `TASK_QUEUE.md`

### Step 3 — Implement the Task

- Follow all coding standards from `CLAUDE.md`
- Read existing code before modifying it
- Keep changes focused on the current task only
- Do not refactor unrelated code
- Do not add features not requested by the task

### Step 4 — Update Documentation

After completing a task:

1. Update `TASK_QUEUE.md` — mark task as `DONE`
2. Update `PROJECT_STATUS.md` — reflect current state
3. Append a new entry to `PROGRESS_LOG.md` — describe what was done
4. If any architectural decisions were made, add them to `DECISIONS.md`
5. If new project knowledge was gained, update `MEMORY.md`

---

## Coding Standards

### JavaScript
- `camelCase` for variables and functions
- `PascalCase` for classes and constructors
- Prefer `const` over `let`; never use `var`
- Async operations use `async/await`, not `.then()` chains
- Functions should be small and have a single responsibility

### Database Fields
- `snake_case` for all PocketBase collection field names

### Files and Folders
- `kebab-case` for all file and folder names (e.g., `floor-plan.js`)

### API Responses
All API responses from custom endpoints must follow this format:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": "Human-readable error message"
}
```

---

## What Agents Must Never Do

- **Never store secrets in code or committed files** — use environment variables
- **Never commit `.env` files**
- **Never implement a feature without updating the task queue and progress log**
- **Never modify architecture without recording the decision in `DECISIONS.md`**
- **Never create large monolithic files** — prefer modular components under 200 lines
- **Never skip input validation** — validate at system boundaries
- **Never use `var`** in JavaScript
- **Never force-push** to main/master

---

## When to Ask for Clarification

An agent should pause and ask a human before:
- Making irreversible infrastructure changes
- Changing the database schema in a way that breaks existing data
- Introducing a new external dependency
- Changing the authentication model

---

## File Size Guidelines

| File type | Recommended max lines |
|---|---|
| JavaScript module | 200 lines |
| CSS file | 300 lines |
| Documentation file | No limit |
| Migration file | 100 lines |
| Test file | 200 lines |

If a file exceeds these limits, consider splitting it.

---

## Testing Requirements

New features must include tests when they involve:
- Business logic (table assignment algorithm)
- API endpoints
- Automation triggers
- Data transformations

Tests go in `/tests/` and must be runnable with `npm test`.
