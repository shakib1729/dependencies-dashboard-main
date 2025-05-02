# Dependency Dashboard


This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) which analyses your repo's Dependency including the analysis of gzip size of used Dependencies, version comparison, Dependency duplication and outdated Dependency just by using the project's yarn.lock file.

### Usage
**Step 1**: Run this app locally and visit `/generate` route, upload `yarn.lock` file, after processing, a corresponding `dependencyData.json` file will be downloaded.

**Step 2**: Then visit the home page (either local or deployed) and upload the `dependencyData.json` file to view the analysis.


## Getting Started

Create `.env.local` file and setup `REDIS_URL`
```bash
REDIS_URL = rediss://default:AWLPAAIjcDE0YTg1MDFkMjhkNDY0OGJiOGFhNDc4YTJmYzEzYTk5YXAxMA@generous-molly-25295.upstash.io:6379
NEXT_PUBLIC_ENV = development
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) on the browser to see the result.


