# Save & Review Changes – Spec

See every change on the page in one place, save them, and get them back later. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts, configuration format and trust & safety rules.

---

## 1. Review & remove changes

**What:** One list of every modification on the page.

**Why:** Users apply changes across a long page; they need one place to see, verify and undo them. Required by the assignment.

**Behavior**

- Shown in the inspector when nothing is selected, and reachable from the change count in the top bar.
- Each item: modification type (icon + word), the element in plain words with a text snippet, and for context the note, for forward the destination.
- Clicking an item selects its element and scrolls the preview to it.
- Each item has a remove button. Removal is immediate and visible in the preview.
- Items are grouped by status:
  - **Active:** applied normally.
  - **Inactive:** inside a hidden element, shown with the reason (see the Hide & add context spec).
  - **Needs attention:** modifications that **no longer match** the page (section 2). They have no element, so clicking them selects nothing; they can only be removed.
- Forwards that are **over budget** or whose target **failed** to load are shown with the reason (see the Forward a link spec).

**Acceptance criteria**

- Given N modifications, then the list shows N items, grouped by status.
- Given an item is removed, then it disappears from the preview, the list and the agent output.
- Given an item in the list, when clicked, then its element is selected and the preview scrolls it into view.
- Given a modification that no longer matches, then it appears under "Needs attention" and can be removed.
- Given a forward that is over budget or failed, then its item shows that reason.
- Given the user clicks the change count in the top bar, then the changes list is shown.

## 2. Save & restore

**What:** Save stores the configuration for the current URL. Reopening restores it.

**Why:** The configuration is the product's real output. Everything else (preview, Markdown) is derived from page + configuration.

**Behavior**

- Save button with an "unsaved changes" indicator; confirmation on success; plain-language error on failure (changes stay in the editor).
- One configuration per normalized URL; saving replaces the previous one.
- What is saved, and what is deliberately not saved, is defined in the global spec (Configuration).
- On reopening, each modification is matched back to its element by its target (position + text snippet). If a modification **no longer matches** (the page changed, the element moved or its text changed), it is **not applied to anything** and is listed under "Needs attention". It is never applied to a different element.
- Unsaved changes are protected when leaving or opening another page (see the Open a page spec).

**Acceptance criteria**

- Given changes are saved, when the page is reopened, then the same modifications appear on the same elements.
- Given the page changed so a target's text no longer matches, when reopened, then that modification is listed as not matching and is not applied.
- Given the draft differs from the last save, then the Save button shows the "unsaved" indicator; after a successful save, it doesn't.
- Given a save fails, then the user sees a plain-language error and all changes remain in the editor, still marked unsaved.
- Given a configuration was saved for a URL, when the user saves again, then the stored configuration is replaced, not duplicated.
- Given an invalid configuration (unknown type, missing field, forward on a non-link), when saved, then it is rejected.
