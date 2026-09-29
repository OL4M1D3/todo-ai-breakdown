# To-Do App with Notes and AI Task Breakdown

A to-do list app with a notes feature and an AI feature that breaks a big task into smaller subtasks. The app is deployed publicly with a live URL.

## Features
- Add, edit, complete, and delete tasks
- Create, edit, and delete notes
- AI task breakdown: the user enters a big task, the AI suggests subtasks, the user reviews them, then saves them under the original task

## Stack
- Frontend: plain HTML, CSS, and JavaScript (no framework, no build step)
- Backend: one Vercel serverless function that calls the AI provider
- AI provider: Groq (free tier)
- Storage: browser localStorage only (no database, no accounts)
- Hosting: Vercel, deployed from GitHub

## Project Structure
- `index.html`: page layout
- `style.css`: styling
- `script.js`: task, note, and localStorage logic, plus the call to the serverless function
- `api/breakdown.js`: serverless function that calls Groq
- `.gitignore`: excludes `.env` and other local files
- `README.md`: what the app does and its live URL
- `AGENTS.md`: this file

## AI Task Breakdown Logic
1. User enters a task, e.g. "Plan a birthday party".
2. Frontend sends the text to the serverless function.
3. The function sends Groq a prompt: break the task into 4-7 small, actionable subtasks and return only a JSON list.
4. The function returns the parsed list to the frontend.
5. The user reviews, edits, or removes subtasks, then confirms.
6. Confirmed subtasks are saved under the original task.

## Coding Rules
- Keep changes small and focused; do not rewrite unrelated code.
- Keep the Groq model name in one config setting so it can be changed easily.
- Ask the AI for structured output (a JSON list) so parsing is reliable.
- Never save AI-generated subtasks automatically; the user must approve them first.
- Wrap all localStorage reads and writes in try/catch and handle empty data.

## Security Rules
- Never put API keys in frontend code or commit them to the repository.
- Read the Groq API key only from an environment variable (`GROQ_API_KEY`) on the server.
- Do not store sensitive data in localStorage.
- Add a simple request limit to the serverless function so the public URL cannot drain the free AI quota.

## Git and GitHub
- Create `.gitignore` (listing `.env`) before the first commit.
- Make small commits with clear messages, e.g. "add notes feature".
- Commit after each working step so changes can be undone.
- Never commit API keys. If one is committed by accident, delete and regenerate it in Groq; removing it from the code is not enough.
- Pushing to the main branch on GitHub triggers a new Vercel deployment.

## Testing & Validation

Before finishing any change, verify:
- The app loads with no console errors.
- A task can be added, edited, completed, and deleted.
- A note can be created, edited, and deleted.
- Tasks and notes still appear after refreshing the page (localStorage).
- Empty or whitespace-only tasks are rejected.

AI task breakdown:
- Reject empty input before calling the AI.
- Handle failed or empty AI responses with a friendly error message.
- Confirm the AI reply parses into a list before showing it.
- Show subtasks for user review; never save them automatically.
- Limit the number of subtasks (e.g. max 10) and trim very long text.

Security:
- No API keys in frontend code or committed files.
- `.env` is listed in `.gitignore`.
- The API key is read only from environment variables.

Deployment:
- The live URL loads and the AI breakdown works there, not just locally.
- `GROQ_API_KEY` is set as an environment variable in Vercel.

Do not mark work complete until these checks pass.

## Notes
- Data is saved per browser and device; it does not sync across devices.