# Security Specification (Payload-First TDD)

## 1. Data Invariants
1. **Identity Integrity**: A user profile (`/profiles/{userId}`), private PII record (`/users_private/{userId}`), trust record (`/user_trust/{userId}`), vote (`/votes/{voteId}`), and subscription (`/contest_subscriptions/{subId}`) must have its owner/voter UID field strictly equal to `request.auth.uid` on creation and immutable on update.
2. **Privilege Escalation Prevention**: Non-admin users cannot set `role` to `'admin'`, `'moderator'`, `'creator'`, or `'developer'` when creating `/profiles/{userId}` and cannot alter `role` on update.
3. **PII Isolation**: User email addresses are stored exclusively in `/users_private/{userId}` and readable only by the owner (`request.auth.uid == userId`) or verified admins. `/profiles/{userId}` contains no PII.
4. **Parent Existence & Integrity**: Votes, subscriptions, and participant submissions require the target `contest_id` to exist in `/contests/{contestId}` (or belong to the built-in seed catalog IDs).
5. **Terminal State Locking**: Contests in terminal states (`completed`, `blocked`) cannot be modified by non-admin users.
6. **Path & Size Bounds**: Every document ID matches `^[a-zA-Z0-9_-]+$` (`<= 128` chars) and every string/list field enforces bounded `.size()` checks to prevent resource exhaustion.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Creating `/contests/c1` with `request.auth == null`.
2. **Unverified Email Write**: Creating `/votes/v1` with `request.auth.token.email_verified == false`.
3. **Role Escalation on Profile Create**: Creating `/profiles/{uid}` with `role: "admin"` as a standard user.
4. **Role Escalation on Profile Update**: Updating `/profiles/{uid}` changing `role` from `"user"` to `"admin"`.
5. **Shadow / Ghost Field Injection**: Updating `/profiles/{uid}` with an unlisted key `isVerified: true`.
6. **PII Cross-User Read**: Reading `/users_private/{otherUid}` as a non-admin authenticated user.
7. **Email Spoofing Admin Bypass**: Authenticating with `email: "triumlabsgroup@gmail.com"` and `email_verified: false`.
8. **Voter Spoofing**: Creating `/votes/v1` with `voter_id` different from `request.auth.uid`.
9. **Contest Creator Spoofing**: Creating `/contests/c1` with `created_by` different from `request.auth.uid`.
10. **Terminal Contest Tampering**: Non-admin updating a contest whose `status` is `"completed"`.
11. **ID Poisoning**: Creating `/contests/<1500-char-string>` or invalid characters in document ID.
12. **Unbounded Array / Resource Poisoning**: Creating `/participants/p1` with `submission_data.photos` exceeding 10 items or string fields exceeding max bounds.
