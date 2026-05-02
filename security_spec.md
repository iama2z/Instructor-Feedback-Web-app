# Security Specification

## 1. Data Invariants
- A student document maps directly to a student's alphanumeric code.
- Only an administrator (instructor) can write, list, or update the student's records.
- Students can ONLY `get()` their own record by knowing the unique code, acting as a token capability.
- An Administrator is defined by their Google-authenticated email (specifically the instructor's email) or if their UID is present in the admins collection.

## 2. The "Dirty Dozen" Payloads
1. **Empty Document:** Attempting to create an empty document.
2. **Missing Name:** Payload omitting `name`.
3. **Invalid Data Type:** Providing an integer instead of a string for `feedback`.
4. **Oversized String:** Submitting a 5MB string for `feedback`.
5. **Ghost Field:** Submitting `{ "name": "A", "period": "2nd", "feedback": "Good", "ghost": true }`.
6. **Guest Overwrite:** A non-admin user trying to `create` or `update` a student document.
7. **Role Spoofing:** A non-admin user trying to write to `/admins/{uid}` to escalate privilege.
8. **Email Spoofing:** Logging in with a fake unverified Google account and trying to write as an admin.
9. **Blanket Read Attack:** Querying the `students` list to scrape codes using `getDocs()`.
10. **ID Poisoning:** Referencing a student code `ABC123!@#$` to exploit directory traversal or bad IDs.
11. **System Field Modification:** Student trying to change `role` to `instructor`.
12. **Status Shortcutting:** Instructor overwriting missing existing required fields by avoiding merge operations.

## 3. Threat Model
- Since `studentCode` is guessable (e.g. `ACQ012612`), anonymous get is restricted purely to exact ID hits. While a guess is possible, mass scraping is disallowed because `list` is disabled. Rate limiting should ideally be coupled with client-side protections.
- Firebase Auth completely mitigates unauthorized instructors.
