AI Code Reviewer

An agentic AI code-review system built with Mastra and Next.js.

Overview

AI Code Reviewer reviews software changes and coordinates multiple specialist agents to produce a consolidated, actionable code-review report.

The system supports:

Local Git repository reviews

Individual Git commit reviews

Git diff reviews

GitHub Pull Request reviews

Selective specialist-agent delegation

Repository-aware code analysis

High-severity cross-validation when appropriate

Duplicate and overlapping finding consolidation

Severity and confidence prioritization

Persistent review history

Finding filters by file, category, and severity

Specialist-agent activity tracking

Structured provider-error handling

Five known-defect evaluation scenarios

Review Architecture

                         Next.js Review UI
                                 |
                                 v
                           POST /review
                                 |
                                 v
                        Review Service
                                 |
                                 v
                    Review Context Service
                         /      |       \
                        /       |        \
                 Repository   Commit   Pull Request
                        \       |        /
                         \      |       /
                          Git / GitHub
                                 |
                                 v
                    Code Review Supervisor
                                 |
             +-------------------+-------------------+
             |         |         |         |         |
             v         v         v         v         v
        Correctness  Security  Architecture  Performance
             |         |         |         |
             +---------+---------+---------+------+
                                 |
                                 v
                     Maintainability + Testing
                                 |
                                 v
                  Finding Validation / Consolidation
                                 |
                    +------------+-------------+
                    |                          |
                    v                          v
             Recommendation              Review History
                    |
                    v
                Review Report

The Supervisor determines which specialist agents are relevant to the supplied change rather than automatically invoking every specialist.

Specialist Agents

Correctness & Logic Agent

Reviews logical errors, incorrect behavior, edge cases, control-flow problems, exception handling, and regression risks.

Security Agent

Reviews authentication, authorization, injection vulnerabilities, user-controlled input, sensitive-data exposure, trust boundaries, security configuration, and insecure command or data handling.

Architecture & Design Agent

Reviews architectural boundaries, coupling, abstractions, dependency direction, layering, responsibility placement, and repository design consistency.

Performance & Scalability Agent

Reviews inefficient algorithms, excessive loops, repeated I/O, database or network overhead, blocking operations, memory concerns, and scalability problems.

Code Quality & Maintainability Agent

Reviews complexity, duplication, modularity, readability, dead code, fragile implementation patterns, and maintainability risks.

Testing Agent

Reviews missing regression tests, edge-case tests, failure-path tests, changed-behavior coverage, and other concrete testing weaknesses.

Finding Model

Each finding can include:

ID

Short title

Category

Severity

Confidence

File

Line range when supported

Explanation

Potential impact

Recommended fix

Repository evidence

Specialist attribution

Supported categories:

CORRECTNESS
SECURITY
ARCHITECTURE
PERFORMANCE
MAINTAINABILITY
TESTING

Supported severities:

CRITICAL
HIGH
MEDIUM
LOW
OPTIONAL

Supported confidence levels:

VERY_HIGH
HIGH
MEDIUM
LOW

Review Recommendations

The system produces one overall recommendation:

APPROVE
APPROVE WITH COMMENTS
REQUEST CHANGES
BLOCK MERGE

The recommendation is derived from the consolidated findings:

CRITICAL findings -> BLOCK MERGE

HIGH findings -> REQUEST CHANGES

Medium, Low, or Optional findings -> APPROVE WITH COMMENTS

No meaningful findings -> APPROVE

Prerequisites

Node.js 22.13.0 or later

npm

Git

OpenRouter API key

For GitHub Pull Request reviews, a public repository can be tested without a GitHub token in suitable cases. GITHUB_TOKEN may be supplied for authenticated access and private repositories.

Installation

Clone the repository:

git clone https://github.com/Aniking1/ai-code-reviewer.git
cd ai-code-reviewer

Install backend dependencies:

npm install

Install frontend dependencies:

cd frontend
npm install
cd ..

Environment Configuration

Create a local .env file from .env.example.

PowerShell:

Copy-Item .env.example .env

Configure:

OPENROUTER_API_KEY=your_openrouter_api_key
MODEL_NAME=your_openrouter_model
GITHUB_TOKEN=your_github_token

GITHUB_TOKEN may be left empty when testing suitable public GitHub repositories.

Never commit .env, API keys, GitHub tokens, or credentials.

Running the Backend

From the project root:

npm run dev

The Mastra backend runs on:

http://localhost:4111

Running the Frontend

Open a second terminal:

cd frontend
npm run dev

Open:

http://localhost:3000

Reviewing a Local Repository

Repositories reviewed through the local repository workflow should be located inside:

workspace/repositories/

Example:

workspace/repositories/sample-repo/

The target must be a valid Git repository.

In the UI:

Select Repository.

Enter a repository path, for example ./workspace/repositories/sample-repo.

Click Start Code Review.

Reviewing an Individual Commit

In the UI:

Select Commit.

Enter the repository path.

Enter a commit reference such as HEAD.

Click Start Code Review.

The system retrieves commit metadata, changed files, and the commit diff before running the review.

Reviewing a Git Diff

In the UI:

Select Git Diff.

Paste the Git diff.

Click Start Code Review.

The supplied diff is passed into the review-context pipeline.

Reviewing a GitHub Pull Request

The application supports GitHub Pull Request reviews.

In the UI:

Select Pull Request.

Enter the repository in owner/repository format. Example: Aniking1/ai-code-reviewer.

Enter the Pull Request number. Example: 1.

Click Start Code Review.

The frontend sends:

{
  "type": "pull_request",
  "repository": "owner/repository",
  "pullRequest": 123
}

The backend retrieves Pull Request metadata, base and target branch information, changed files, available file patches, and the complete Pull Request diff. That context then enters the existing Supervisor, specialist-agent, consolidation, recommendation, and history pipeline.

Consolidation and Deduplication

Specialist findings are consolidated before the final review is returned or saved.

The consolidation stage:

Validates finding structure.

Removes duplicate findings.

Detects overlapping findings describing the same underlying defect.

Retains the strongest justified finding.

Sorts findings by severity and confidence.

Determines the overall recommendation.

Generates a concise summary.

The live runReview() service invokes this consolidation before returning or saving the final review.

Specialist Activity

The UI records which specialists the Supervisor actually selected. This allows the reviewer to see Supervisor completion, selected specialists, and specialists that were not selected.

Review History

Completed reviews can be revisited from the Review History section of the UI.

The history view provides review type, repository, date, recommendation, findings, specialist activity, and review details.

Runtime review-history data is generated locally and should not be committed to Git.

API Endpoints

Review

POST /review

Accepts repository, commit, diff, and pull-request review inputs.

List Review History

GET /reviews

Retrieve a Specific Review

GET /reviews/:reviewId

Testing

Run the complete automated test suite:

npm test

Current validated result:

52 tests
52 pass
0 fail

The suite covers repository operations, Git diffs, commit and repository context, Pull Request context, input validation, orchestration, specialist parsing, Supervisor orchestration, finding consolidation, review-service integration, review history, and repository tools.

Run TypeScript validation:

npx tsc --noEmit

Production Builds

Backend

From the project root:

npm run build

A successful Mastra build produces deployable output under:

.mastra/output/

Frontend

cd frontend
npm run build

Evaluation Scenarios

The project contains five deliberately defective evaluation repositories:

evaluation-01-correctness
evaluation-02-security
evaluation-03-architecture
evaluation-04-performance
evaluation-05-maintainability

Scenario

Review Area

Expected Severity

Expected Specialist

evaluation-01-correctness

Correctness

HIGH

correctness-logic

evaluation-02-security

Security

HIGH/CRITICAL

security

evaluation-03-architecture

Architecture

MEDIUM/HIGH

architecture-design

evaluation-04-performance

Performance

HIGH

performance-scalability

evaluation-05-maintainability

Maintainability

MEDIUM/HIGH

code-quality-maintainability

Prepare Evaluation Fixtures

Run:

npm run evaluation:setup

This prepares the clean baseline and deliberately defective commit for each scenario.

Run the Evaluation

After preparing the fixtures:

node --env-file=.env --import tsx evaluation/run-evaluation.mjs

The evaluation validates the fixtures and then performs the live AI evaluation.

See evaluation/README.md for the intended defects and expected outcomes.

Evaluation Validation

The evaluation infrastructure checks repository existence, Git repository validity, HEAD commit, baseline parent commit, non-empty diff, clean working tree, expected review category, expected specialist, and expected severity.

Live AI evaluation depends on the configured OpenRouter provider. A provider or credit failure is distinguished from fixture validation failure in the evaluation reporting.

Provider Error Handling

When the configured AI provider cannot process a request, the backend returns a structured provider-unavailable response and the frontend displays a clear error.

Previously completed reviews and review history remain available.

Security

Never commit:

.env
API keys
GitHub tokens
Credentials
Private repository credentials
Generated runtime data

Environment variables used by the application include:

OPENROUTER_API_KEY
MODEL_NAME
GITHUB_TOKEN

Project Structure

ai-code-reviewer/
├── evaluation/
│   ├── README.md
│   ├── run-evaluation.mjs
│   └── setup-fixtures.mjs
│
├── frontend/
│   └── app/
│       └── page.tsx
│
├── src/
│   └── mastra/
│       ├── agents/
│       │   ├── review-agent.ts
│       │   ├── specialist-output.ts
│       │   └── specialists/
│       ├── routes/
│       │   ├── history-routes.ts
│       │   └── review-route.ts
│       ├── schemas/
│       ├── services/
│       │   ├── github/
│       │   ├── history/
│       │   ├── repository/
│       │   └── review/
│       └── tools/
│
├── workspace/
│   └── repositories/
│
├── .env.example
├── .gitignore
├── package.json
└── README.md

Development Commands

Backend:

npm run dev
npm test
npm run build

Frontend:

cd frontend
npm run dev
npm run build

Evaluation:

npm run evaluation:setup
node --env-file=.env --import tsx evaluation/run-evaluation.mjs

Current Validation Status

The current local implementation has been validated with:

TypeScript compilation: PASS
Automated tests: 52/52 PASS
Backend production build: PASS
Frontend production build: PASS
Pull Request context test: PASS
Live review-service consolidation test: PASS

GitHub Repository

https://github.com/Aniking1/ai-code-reviewer

The repository should be public for capstone evaluation.