# Proovix — AI-Powered Evidence-Based Skill Verification Platform

Proovix is a modern, transparent skill verification platform that connects candidates, skills, and evidence through AI analysis and human expert review.

## Project Structure

This is a monorepo with workspaces:
- `apps/api`: Node.js Express REST API with MongoDB/Mongoose.
- `apps/web`: React SPA built with Vite.
- `apps/worker`: Background worker tasks.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance (local or MongoDB Atlas)

### Environment Variables

1. Copy `apps/api/.env.example` to `apps/api/.env` and fill in your values.
2. Copy `apps/web/.env.example` to `apps/web/.env` and set your API base URL.

### Installation & Running

Install dependencies from the root directory:
```bash
npm install
```

Seed the skills catalog:
```bash
cd apps/api
node scripts/seedSkills.js
```

Start the API server (development mode):
```bash
npm run dev:api
```

Start the web client (development mode):
```bash
npm run dev:web
```

## License
ISC
