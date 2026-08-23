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
