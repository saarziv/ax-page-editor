# Save & Load Configs – Spec

Save the changes made on a page, review and remove them, and open saved pages again with their changes in place. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts, configuration format and trust & safety rules.

The configuration is the product's real output: everything else (preview, agent output) is derived from page + configuration. This feature makes it last beyond one editing session. Hide and Context (03) are the only modifications so far; Forward, the Markdown view and Agent View come later.

All ACs are **Key** (must ship), except AC8, AC12 and AC13, which are **follow-ups**.

---



## 1. The flow

```
Start screen                              Editor
┌───────────────────────────────────┐     ┌───────────────────────────────────────────────────┐
│  AX Editor                        │     │ [ acme.com/pricing   ] [Open]   [Save] • Unsaved  │
│  [ https://your-site.com ] [Open] │     ├─────────────────────────────┬─────────────────────┤
│  Try a sample                     │     │  ⊘ Hidden from AI           │  Changes on this    │
│                                   │ ──▶ │  We use cookies…            │  page               │
│  Saved pages                      │     │                             │  Hidden · We use…  ✕ │
│  acme.com/pricing                 │     │  [ growth chart ]           │  Context · Custo…  ✕ │
│    3 changes · saved 2 hours ago  │     │  Context for AI             │                     │
│  acme.com/terms                   │     │  Customer growth from…      │  Needs attention    │
│    1 change · saved yesterday     │     │                             │  Hidden · Old pro… ✕ │
└───────────────────────────────────┘     └─────────────────────────────┴─────────────────────┘
```

1. The publisher makes changes on a page (03), and **saves**.
2. Later, they open the page again: from the **Saved pages** list on the start screen, or by typing its URL.
3. The page opens with its saved changes **restored** on the same elements.
4. They **review** the changes in the list, **remove** any they don't want, and save again.



## 2. Save

**What:** A Save button that stores the full configuration for the current page.

**Why:** Without saving, every change is lost when the page is closed, and there's nothing for a downstream consumer to use.

**Behavior**

- A **Save** button in the editor's top bar. It's enabled only when there are unsaved changes (see below), so there's never a save that does nothing.
- Saving stores the configuration in the format defined in the global spec (section 8, Configuration): version, normalized URL, last save time and the list of modifications. Nothing else is stored.
- **One configuration per page URL.** Saving again replaces the stored one, never adds a second.
- Saving with no changes (for example after removing all of them) stores an empty configuration. The page stays in the Saved pages list, with "0 changes".
- **Unsaved indicator:** when the changes on screen differ from the last save, the top bar shows "Unsaved changes". After a successful save it's gone. A page with no changes and nothing saved shows no indicator.
- **Success:** a small "Saved" toast that disappears after a few seconds. Save is disabled again until the next change.
- **Failure:** a toast with the plain-language message "Your changes couldn't be saved. Try again." It stays until the next save or until the publisher closes it. All changes stay in the editor, still marked unsaved, and Save stays enabled for the retry.
- **Validation:** the server checks every configuration before storing it (known modification types only, required fields present, notes at most 300 characters). An invalid one is rejected and nothing is stored.

**Acceptance criteria**

- **AC1** Given changes on a page, when the user clicks Save, then the configuration is stored for that page's URL in the global configuration format, and a "Saved" toast appears.
- **AC2** Given a configuration is already stored for a URL, when the user saves again, then it's replaced, not duplicated.
- **AC3** Given the changes differ from the last save, then the top bar shows "Unsaved changes" and Save is enabled; after a successful save, neither.
- **AC4** Given a save fails, then the user sees a toast saying "Your changes couldn't be saved. Try again.", and every change stays in the editor, still marked unsaved.
- **AC5** Given an invalid configuration (unknown type, missing field, note over 300 characters), when it's sent to the server, then it's rejected and nothing is stored.



## 3. Review & remove changes

**What:** One list of every change on the page, where each one can be removed.

**Why:** Changes are made across a long page. The publisher needs one place to see what they've applied and undo what they don't want.

**Behavior**

- The **Changes on this page** list in the inspector (shown when nothing is selected, from 02) becomes the full review list.
- Each item shows the change type in plain words, the element's text snippet, and for context, the note. Each has a **Remove** button.
- Removing is immediate: the change disappears from the list and the preview, and "Unsaved changes" appears. It's removed from the stored configuration on the next save.
- **Needs attention:** changes that no longer match the page (section 4) are listed in their own group, labeled "Not found on this page". They're not applied to anything, and can only be removed. Until removed, they stay in the configuration and are saved with it, so a temporary page change doesn't wipe out the publisher's work.

**Acceptance criteria**

- **AC6** Given N changes on a page, then the list shows N items, each with its type, element snippet, the note for context, and a Remove button.
- **AC7** Given the user removes a change, then it disappears from the list and the preview, and "Unsaved changes" appears. After saving and reopening, it's gone.
- **AC8** (follow-up) Given a change that no longer matches the page, then it's listed under "Needs attention" and can be removed.



## 4. Load saved pages

**What:** Open a page with its saved configuration, from a list of saved pages on the start screen or by URL.

**Why:** Saved work is only useful if it comes back. A list of saved pages lets the publisher find and continue it without retyping URLs.

**Behavior**

- **Saved pages list:** below "Try a sample" on the start screen. One row per stored configuration: the page URL, the number of changes, and when it was last saved ("2 hours ago"), newest first. Clicking a row opens that page. The list isn't shown when nothing is saved.
- **Opening any page loads its configuration**, however it's opened: a Saved pages row, a typed URL (start screen or top bar) or the sample page. A typed URL is normalized first (01), so `acme.com/pricing/?utm_source=x` finds the configuration saved for `acme.com/pricing`. A page with nothing saved opens with no changes.
- **Restoring:** each saved change is matched back to its element by its target (position in the clean page + text snippet, global spec section 8). A match is applied exactly as before. If the page changed so the element is gone, moved, or its text is different, the change is **never applied to a different element**: it goes to "Needs attention" (section 3).
- **Loading:** the editor shows the spinner (01) until both the page and its configuration are loaded, so a page never appears without its changes.
- **Configuration can't be loaded** (our server fails): the message "Your saved changes couldn't be loaded." with a Retry button, and no editing. Editing a blank page could otherwise overwrite the real saved changes on the next save.

**Acceptance criteria**

- **AC9** Given saved configurations exist, then the start screen lists them under "Saved pages", newest first, each with its URL, change count and last-saved time.
- **AC10** Given the user clicks a saved page, then it opens with its saved changes on the same elements as before.
- **AC11** Given a configuration was saved for a URL, when the user types an equivalent URL (different tracking parameters, trailing slash), then the page opens with that configuration.
- **AC12** (follow-up) Given the page changed so a saved change's element no longer matches, when it's opened, then that change is not applied and is listed under "Needs attention".
- **AC13** (follow-up) Given the load error from AC14, then it offers Retry, and the page opens with its saved changes once the configuration loads.
- **AC14** Given the configuration can't be loaded, then the user sees "Your saved changes couldn't be loaded." and can't edit the page.



## Edge cases


| Case                                   | What the user sees                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| Save fails (server down or error)      | A toast: "Your changes couldn't be saved. Try again." Changes stay, still unsaved.   |
| Saved configuration can't be loaded    | "Your saved changes couldn't be loaded." No editing. (Retry is a follow-up, AC13.)   |
| Saved pages list can't be loaded       | The rest of the start screen works; the list shows "Saved pages couldn't be loaded." |
| The saved page itself can't be fetched | The same messages as opening any page (01).                                          |
| All changes removed, then saved        | An empty configuration is stored; the row shows "0 changes".                         |




## Out of scope

- Forward a link, and its over-budget and failed statuses in the list: 05.
- Markdown view and Agent View: 06.
- Warning before leaving a page with unsaved changes.
- Deleting a saved configuration from the start screen.
- Clicking a list item to select its element in the preview.
- Showing changes inside a hidden element as inactive (03, Out of scope).

