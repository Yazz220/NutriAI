# Claims

## C01: The retired internal ledger caused the observed generation failures
- **Statement**: Before the N08 policy change, recipe page generation could fail at Nosh's internal credit reservation even while the configured OpenRouter account retained provider credit.
- **Status**: supported
- **Provenance**: ai-suggested
- **Crystallized via**: empirical-resolution
- **Falsification criteria**: The failed capture traces show an OpenRouter image request rejected for insufficient provider funds before any internal reservation failure, or the Nosh ledger had a positive balance at failure time.
- **Proof**: [N06]
- **Dependencies**: []
- **Tags**: generation, credits, OpenRouter, diagnosis
- **From staging**: O02

## C02: Opening the first ready recipe is the candidate activation event
- **Statement**: A user's first open of a ready, personally sourced recipe page is expected to predict D1 and D7 return more strongly than onboarding completion, cookbook creation, or capture start alone.
- **Status**: untested
- **Provenance**: ai-suggested
- **Crystallized via**: artifact-commitment
- **Falsification criteria**: Cohort data shows no positive relationship—or a weaker relationship than an earlier milestone—between `first_ready_recipe_opened` and D1/D7 return after controlling for acquisition cohort.
- **Proof**: [N20, pending production analytics and cohort analysis]
- **Dependencies**: []
- **Tags**: onboarding, activation, retention, analytics
- **From staging**: O08
