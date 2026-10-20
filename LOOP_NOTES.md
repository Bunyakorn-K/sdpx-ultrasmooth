# Verification Loop Notes

No reliable count of every development iteration was recorded, so a total is not invented.

The final App Router integration exposed a duplicate homepage action in a retained auth screen, a layout that discarded its child segment, and a logout redirect race. Each was corrected in the feature implementation while keeping the existing journey assertions. The final login/logout regression was run three times before the complete repeatability run.

A deliberate duplicate-vote mutation made an existing unit test fail; exact source restoration was verified. A separate failing container assertion returned exit 1. The scoped AssignmentService refactor used unchanged tests before and after (44 passed each, 0 reverts). See [lab status](docs/lab-status.md) for final checks and [loop metrics](docs/loop-metrics.md) for measured timings and external work still pending.

The Linux browser exposed an additional export filename issue caused by the container's POSIX locale. The unchanged workbook test passed with UTF-8 enabled; Docker now declares UTF-8 explicitly.
