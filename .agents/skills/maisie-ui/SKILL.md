---
name: maisie-ui
description: Apply Maisie's established interaction and visual conventions when editing selectable controls, dropdowns, permission screens, or other frontend UI in this repository.
---

# Maisie UI Conventions

Preserve these product-specific choices when changing the Maisie frontend:

- Selectable bubbles and chips keep their labels centered in every state.
- Show selection with the existing border, background, and text-weight highlight.
- Do not add checkmarks or other indicators that shift a bubble's label when it is selected.
- Preserve semantic selection state such as `aria-pressed`; the visual rule does not remove accessibility state.
- Selecting an answer should only update its highlighted state. Do not automatically
  advance to another screen; wait for the user to press the screen's Next or Continue button.
- Use Maisie's shared custom dropdown for visible option menus instead of browser-native
  select or date-picker popovers when consistent placement matters. Menus open downward,
  float over content without shifting the layout, and stay anchored to their trigger.
- Dropdowns close after selection, on an outside tap, and with Escape. Long menus use a
  capped, scrollable panel. Show the selected option with border/background/text emphasis,
  without a checkmark that moves the label.
- Collect birth month and year with separate Month and Year dropdowns. Do not use the
  browser's calendar-style month picker or ask for an exact birth day.
- Keep operational screens compact and easy to scan. Group controls and actions with the
  person or record they affect, distinguish active and pending states clearly, and keep
  revoked or superseded records out of the primary active list.
- Use the repository's Phosphor icons for tabs and commands instead of emoji when an icon
  exists. Keep icon-and-label controls aligned and stable between selected states.
- Write user-facing copy for teens in familiar, concrete language. Prefer words such as
  "device," "saved information," and "sign in" over technical implementation terms such
  as "browser," "database," "authentication," or "session."

Add future user-confirmed Maisie UI conventions here only when they are reusable
across the product, not when they apply to a single one-off screen.
