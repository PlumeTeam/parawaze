# ParaWaze Development Rules

## MANDATORY: TypeScript check before every commit

Before committing ANY changes, ALWAYS run:

```bash
npx tsc --noEmit
```

If there are TypeScript errors, fix them ALL before committing. Never push code that fails TypeScript compilation.

## Why This Matters

- TypeScript errors caught locally save time vs. discovering them during Vercel build failures
- Prevents broken builds from being pushed to main
- Ensures code quality and type safety
- Makes the development workflow faster with quick feedback loops

## Workflow

1. Make your code changes
2. Run `npx tsc --noEmit` to check for ALL errors
3. Fix any TypeScript errors that appear
4. Run `npx tsc --noEmit` again to confirm zero errors
5. Run tests if applicable
6. Only then commit and push

This is mandatory for all code changes.
