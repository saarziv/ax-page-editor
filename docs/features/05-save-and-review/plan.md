# Save & Review Changes – Plan

How we build the Save & review changes spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

- Config type and zod schemas (global plan §3.6–3.7)
- `resolve` and the `unmatched` status (§3.3–3.4)
- Store and derived `dirty` (§5.1)

## API

| Method | Path | In | Out |
|---|---|---|---|
| GET | `/api/configs?url=` | | `Config` or 404 |
| PUT | `/api/configs` | `Config` | saved `Config` |

- **Validation:** the zod pipe with the core schemas, plus checks that context ≤ 500, forward `href` is absolute http(s), and ids are unique.

### Storage
`ConfigRepository` interface (`get(url)`, `save(config)`, `list()`), implemented with SQLite:
`page_configs(url TEXT PRIMARY KEY, config TEXT NOT NULL, updated_at TEXT NOT NULL)`.
The JSON is validated on save and on read. Saving the same URL replaces the row.

## Web

- **ChangesList:** shown in the inspector when nothing is selected, and from the top bar's change count. Grouped by `Result.status`:
  - Active
  - Inactive (with the reason)
  - Needs attention (`unmatched`), removable only
  - `overBudget` and `failed` forwards show their reason
- Clicking an item selects it and scrolls it into view.
- **Save:** `PUT /api/configs`; on success `markSaved`; on failure a plain-language error and the draft stays dirty.
- **Store actions:**
  - `load(config)`: sets `draft` and `savedJson` from the saved configuration.
  - `remove(id)`: removes one modification.
  - `markSaved()`: sets `savedJson` to the current draft.

## Tests

- `resolve`: match; snippet mismatch gives `unmatched`.
- Config validation (API): unknown type, missing fields, note > 500, relative forward `href`, duplicate ids.
- Repository: save replaces, list orders by `updatedAt`.
- Store: `dirty` after edit, clean after `markSaved`.
