# Development Workflow

This document records the working agreement for the two-person project team.
The `main` branch is always the version that should run locally.

## First-time setup after cloning

```powershell
cd api
npm install
Copy-Item .env.example .env
```

Edit `api/.env` with the local MySQL password, then install the two websites:

```powershell
cd ..\clientside
npm install

cd ..\adminside
npm install
```

Import the database files before starting the API. The complete start-up order
is in `README.md`.

## Start of each work session

Pull the latest committed version before editing:

```powershell
git pull origin main
git status
```

Do not continue if `git status` shows unexpected changes that belong to another
team member.

## Commit one coherent change at a time

Examples of useful separate commits:

```text
feat(search): add date-range validation
fix(admin): preserve form values after a failed save
test(api): cover duplicate registration quantities
docs(setup): explain the MySQL import step
```

Stage and review before committing:

```powershell
git add .
git diff --cached
git commit -m "type(scope): short description"
git push
```

Avoid combining unrelated code, documentation and formatting changes in one
commit. A small number of meaningful commits is better than empty or repeated
commits.

## Files that must not be committed

- `api/.env` - contains the local database password;
- any `node_modules` folder - recreated by `npm install`;
- `dist-browser`, `dist-ngc` and other build output - recreated by the build;
- log files and temporary browser-test output.

These exclusions are configured in `.gitignore`.

## Before pushing

Run the API tests:

```powershell
cd api
npm test
```

Then confirm the three local addresses work in the browser:

```text
http://localhost:3000/api
http://localhost:4200
http://localhost:4300
```

If the change affects a screen, check it at both desktop width and a narrow
mobile width.

## Merge conflicts

The second person should never force-push over the first person's work. Pull
again, resolve the conflict by reading both versions, then run the tests before
committing the resolution. If a file is unclear, coordinate before choosing a
side.
