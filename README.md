Lunaris Monorepo Template
A high-performance full-stack boilerplate featuring a Next.js 14 frontend and an Express/TypeScript backend. This template is designed for rapid development with a unified styling system and shared TypeScript types.

🚀 Quick Start (New Project)
Follow these steps when you clone this template to start a new project from scratch.

1. Installation

Install all dependencies for the entire monorepo (Frontend & Backend) from the root directory:

Bash
npm install 2. Environment Setup

Create local environment files by copying the examples. These files are ignored by Git to keep your secrets safe.

Frontend:

Bash
cp frontend/.env.example frontend/.env.local
Backend:

Bash
cp backend/.env.example backend/.env 3. Running the Project

You can launch both services simultaneously using the root workspace commands, or run them in separate terminals for better log visibility:

Option A: Separate Terminals (Recommended)

Backend: cd backend && npm run dev (Runs on port 3001)

Frontend: cd frontend && npm run dev (Runs on port 3000)

Option B: Root Commands

npm run dev:frontend

npm run dev:backend

🛠 Tech Stack
Frontend

Framework: Next.js 14 (App Router)

Styling: Tailwind CSS (Dark theme by default)

Language: TypeScript

UI: Minimalist "Teal & Black" design system

Backend

Framework: Express.js

Runtime: Node.js with ts-node / nodemon

Language: TypeScript (ESM)

Database: better-sqlite3 support included

📁 Project Structure
Plaintext
├── backend/
│ ├── src/index.ts # API Entry point (Hello World)
│ └── tsconfig.json # Node-specific TS config (NodeNext)
├── frontend/
│ ├── src/app/ # Next.js App Router (Layout, Page, CSS)
│ ├── src/components/ # Generic UI components
│ └── tsconfig.json # React-specific TS config
├── README.md # Project documentation
└── package.json # Root workspace configuration
🔧 Maintenance & Troubleshooting
Build all: npm run build --workspaces

Clean build artifacts: rm -rf frontend/.next backend/dist

Fix "Red Lines" (VS Code): If TypeScript shows errors on valid imports (like CSS), press Ctrl + Shift + P and select "TypeScript: Restart TS Server".

📝 License
MIT
