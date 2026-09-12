# Code Review Evaluation Scenarios

These scenarios contain deliberately introduced defects used to evaluate
the AI Code Reviewer.

| Scenario | Review Area | Expected Severity | Expected Specialist |
|---|---|---|---|
| evaluation-01-correctness | Correctness | HIGH | correctness-logic |
| evaluation-02-security | Security | HIGH/CRITICAL | security |
| evaluation-03-architecture | Architecture | MEDIUM | architecture |
| evaluation-04-performance | Performance | HIGH | performance-scalability |
| evaluation-05-maintainability | Maintainability | MEDIUM | code-quality-maintainability |

## Expected outcomes

### 01 — Correctness

`calculateDiscount()` incorrectly applies the premium discount to guest
customers.

### 02 — Security

User-controlled command input reaches `child_process.exec()`.

### 03 — Architecture

`UserService` bypasses the injected `UserRepository` abstraction and directly
depends on the database.

### 04 — Performance

`matchUsers()` performs nested linear searches with O(n × m) complexity.

### 05 — Maintainability

`calculateOrderTotal()` duplicates logic already provided by
`calculateDiscount()`.

A successful evaluation should identify the intended defect category and
produce a finding supported by repository evidence. Exact wording may differ.
