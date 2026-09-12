# AI Code Reviewer

An agentic AI code-review system built with Mastra and Next.js.

## Overview

The system reviews Git repositories, individual commits, and Git diffs.

A Code Review Supervisor Agent coordinates specialist review agents for:

- Correctness and Logic
- Security
- Architecture and Design
- Performance and Scalability
- Code Quality and Maintainability
- Testing

The Supervisor selectively delegates relevant review activities rather than automatically invoking every specialist.

## Features

- Repository review
- Individual Git commit review
- Git diff review
- Supervisor and specialist-agent architecture
- Selective specialist delegation
- Repository-aware code analysis
- Structured findings
- Severity and confidence prioritization
- Duplicate and overlapping finding consolidation
- Overall review recommendations
- Review history
- Review-detail view
- Specialist activity tracking
- Finding filters by file, category, and severity
- Graceful AI-provider error handling
- Five known-defect evaluation scenarios

## Architecture

```text
Next.js Frontend
       |
       v
POST /review
       |
       v
Review Service
       |
       v
Review Context Service
       |
       v
Code Review Supervisor Agent
       |
       +---- Correctness and Logic Agent
       +---- Security Agent
       +---- Architecture and Design Agent
       +---- Performance and Scalability Agent
       +---- Code Quality and Maintainability Agent
       +---- Testing Agent
       |
       v
Finding Validation and Consolidation
       |
       +---- Recommendation
       +---- Review History
       |
       v
Next.js Review UI

The Supervisor determines which specialist agents are relevant rather than automatically invoking every agent.

Requirements
Node.js 22.13.0 or later
npm
OpenRouter API key
Installation

Clone the repository:

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd ai-code-reviewer
npm install

Install frontend dependencies:

cd frontend
npm install
cd ..
Environment Configuration

Create a .env file from .env.example.

PowerShell:

Copy-Item .env.example .env

Configure:

OPENROUTER_API_KEY=your_openrouter_api_key
MODEL_NAME=your_openrouter_model

Never commit .env.

Running the Backend

From the project root:

npm run dev

The Mastra backend runs on:

http://localhost:4111

The API is available under:

http://localhost:4111/api
Running the Frontend

Open a second terminal:

cd frontend
npm run dev

The Next.js application runs on:

http://localhost:3000
Preparing a Repository for Review

Repositories reviewed by the application must be located inside:

workspace/repositories/

Example:

workspace/repositories/sample-repo/

The repository must be a valid Git repository.

Example:

git clone <REPOSITORY_URL> workspace/repositories/sample-repo
Running a Repository Review

Open:

http://localhost:3000

Select:

Repository

Enter a repository path such as:

./workspace/repositories/sample-repo

Click:

Start Code Review

The system builds repository context and passes it to the Supervisor Agent.

Running a Commit Review

Select:

Commit

Provide the repository path and commit reference.

Example:

Repository:
./workspace/repositories/sample-repo

Commit:
HEAD

Then start the review.

Running a Git Diff Review

Select:

Git Diff

Paste a Git diff into the editor and start the review.

Review Findings

Each finding can contain:

Short title
Category
Severity
Confidence
File and line location where supported
Explanation
Potential impact
Recommended fix
Supporting evidence
Specialist attribution

Supported severity levels:

CRITICAL
HIGH
MEDIUM
LOW
OPTIONAL

Supported recommendations:

APPROVE
APPROVE WITH COMMENTS
REQUEST CHANGES
BLOCK MERGE

Findings are prioritized by severity and then confidence.

Review History

Completed reviews are stored in:

workspace/review-history/

This directory contains generated runtime data and is ignored by Git.

The UI allows users to revisit saved reviews and inspect:

Review recommendation
Findings
Specialist activity
Review details
API Endpoints

Review:

POST /review

List review history:

GET /reviews

Retrieve a specific review:

GET /reviews/:reviewId
Testing

Run the automated test suite:

npm test

Current validated result:

51 tests
51 pass
0 fail

Run TypeScript validation:

npx tsc --noEmit
Production Builds

Backend:

npm run build

Frontend:

cd frontend
npm run build
Evaluation

The project contains five deliberately defective evaluation repositories:

evaluation-01-correctness
evaluation-02-security
evaluation-03-architecture
evaluation-04-performance
evaluation-05-maintainability

The fixtures contain known defects covering:

Correctness
Security
Architecture
Performance
Maintainability
Prepare Evaluation Fixtures

The evaluation repositories require temporary local Git history containing:

A clean baseline commit
A deliberately defective commit

After cloning the project into a clean environment, prepare the fixtures with:

npm run evaluation:setup

This creates the required local Git history for the five scenarios.

Run the Evaluation

After preparing the fixtures:

node --env-file=.env --import tsx evaluation/run-evaluation.mjs

The evaluation validates the repository fixtures and then runs the live AI evaluation.

See:

evaluation/README.md

for the expected defects and outcomes.

Evaluation Results

The evaluation infrastructure checks:

Repository existence
Git repository validity
HEAD commit
Baseline parent commit
Non-empty Git diff
Clean working tree
Expected review category
Expected specialist
Expected severity

The five evaluation fixtures currently validate successfully.

Live AI evaluation depends on the configured OpenRouter provider.

Provider Error Handling

If the OpenRouter provider cannot process a request, for example because the account has insufficient credits, the backend returns a structured provider-unavailable response.

The frontend displays a clear error instead of leaving the review request unresolved.

Previously completed reviews and review history remain available.

Security

Do not commit:

.env
API keys
Credentials
Repository tokens
Generated review history

API configuration uses:

OPENROUTER_API_KEY
MODEL_NAME

These values are supplied through environment variables.

Current Limitation

GitHub pull-request review integration is not currently implemented.

The current supported review inputs are:

Local or cloned Git repositories
Individual Git commits
Git diffs
Development Commands

Backend:

npm run dev
npm test
npm run build

Evaluation fixtures:

npm run evaluation:setup

Evaluation:

node --env-file=.env --import tsx evaluation/run-evaluation.mjs

Frontend:

cd frontend
npm run dev
npm run build
Project Structure
ai-code-reviewer/
├── src/
│   └── mastra/
│       ├── agents/
│       │   ├── review-agent.ts
│       │   └── specialists/
│       ├── routes/
│       ├── schemas/
│       ├── services/
│       │   ├── history/
│       │   ├── repository/
│       │   └── review/
│       ├── tools/
│       └── index.ts
├── frontend/
│   └── app/
├── evaluation/
│   ├── README.md
│   ├── run-evaluation.mjs
│   └── setup-fixtures.mjs
├── workspace/
│   └── repositories/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
License

This project was developed as a KodeCamp capstone project.