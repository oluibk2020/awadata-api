# Focused PoC Threat Model

This is a living analysis for the synthetic demonstration. It is not a
penetration test, certification, or guarantee against all inference or
re-identification risk.

## Protected assets

- account credentials, JWT sessions, and role state;
- consent choices and withdrawal history;
- research request and governance decision;
- synthetic dataset and pseudonymous participants;
- access decisions, attempts, and benefit commitment;
- database credentials and signing secrets.

## Key threats and PoC controls

| Threat | PoC control |
|---|---|
| Unauthorized account use | JWT validation, current account lookup, session revocation, role guard |
| Consent bypass | Evaluate current participant consent for exact purpose + operation |
| Governance bypass | Require explicit governance approval separate from consent |
| Purpose/operation escalation | Bind decisions and grants to exact requested purpose and operation |
| Identifiable-record access | No aggregate-to-record fallback; deny unsupported operation |
| Commercial AI training | Explicit consent and governance checks deny the refused operation |
| Withdrawal bypass | Re-check current consent at access time |
| Audit omission | Record decisions and execution attempts as part of the access workflow |
| Re-identification | Synthetic data, pseudonymous codes, aggregate-only output |
| Secret leakage | Environment configuration and redacted logs; never log tokens or request bodies |

## PoC limitations

- Data is synthetic; this does not validate real clinical or community
  operations.
- The governance representative is a simplified demonstration mechanism, not
  an established community protocol.
- Audit records are accountability records, not automatically tamper-proof.
- Aggregate output controls do not guarantee protection against all inference.
- Operational hardening, independent security review, privacy assessment,
  backup/recovery, and deployment controls remain future work.

Review this document when the PoC gains a new data type, external integration,
privileged workflow, export path, or access operation.
