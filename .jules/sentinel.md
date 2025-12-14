## 2025-02-27 - [Insecure Auth Storage vs Documentation]
**Vulnerability:** Supabase auth tokens were stored using `AsyncStorage` (unencrypted) on native devices, despite `AGENTS.md` claiming `SecureStore` was used.
**Learning:** Documentation can drift from reality or be aspirational. Always verify critical security claims in the code.
**Prevention:** Audit codebase against security documentation periodically.
