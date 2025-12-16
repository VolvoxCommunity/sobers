# Sentinel's Journal

## 2025-02-18 - Insecure Auth Token Storage

**Vulnerability:** Supabase session tokens were stored in `AsyncStorage` on native devices, exposing them in plaintext.
**Learning:** The documentation (`AGENTS.md`) claimed `SecureStore` was used, but the code (`lib/supabase.ts`) actually used `AsyncStorage`. This discrepancy highlights the importance of verifying documentation against implementation.
**Prevention:** Use `SecureStore` for sensitive data on native platforms. Always verify that security-critical code matches architectural documentation.
