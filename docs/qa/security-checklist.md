# Security Checklist

- [ ] Password hashing uses strong adaptive algorithm in production.
- [ ] Access and refresh secrets rotated and managed by secret manager.
- [ ] Auth endpoints rate-limited and lockout policy tested.
- [ ] RBAC checks enforced on all admin endpoints.
- [ ] Audit logs written for sensitive operations.
- [ ] Webhook signatures verified for billing/events.
- [ ] Privacy and consent records stored and queryable.
- [ ] Dependency and secret scans run in CI.
