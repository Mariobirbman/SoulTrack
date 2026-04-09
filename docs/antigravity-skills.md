# Antigravity skills (optional)

Most users should start with the full library install and use bundles/workflows to narrow down what to try first.

## Full library install
Default install path: `~/.gemini/antigravity/skills` (Antigravity global). Use `--path` for other locations.

```sh
npx antigravity-awesome-skills
```

Note: the npm installer uses a shallow clone by default so first-run installs stay lighter than a full repository history checkout.

## Verify the install

### macOS/Linux (bash/zsh)
```sh
test -d ~/.gemini/antigravity/skills && echo "Skills installed in ~/.gemini/antigravity/skills"
```

### Windows (PowerShell)
```powershell
if (Test-Path "$HOME/.gemini/antigravity/skills") {
  'Skills installed in ~/.gemini/antigravity/skills'
}
```

## Run your first skill
Use `@brainstorming` to plan a SaaS MVP.

Example prompt:
```text
@brainstorming Plan a SaaS MVP for tracking running shoes and workouts. Keep it to 3 milestones with clear success metrics.
```
