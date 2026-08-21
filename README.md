# Kitchen Memory

*The app that knows what's in your kitchen.*

Kitchen Memory is a weekly household meal-planning assistant. Once a week
you record a short video walking through your fridge, freezer, and pantry.
The app remembers what you have, plans dinners your family will actually
eat around it, and generates the smallest possible grocery list to fill
the gaps.

```
SCAN → KNOW WHAT WE HAVE → PLAN → BUY WHAT'S MISSING → COOK → LEARN
```

The inventory is the foundation. The meal planner is built on top of the
inventory. The grocery list is the difference between what the household
wants to eat and what it already owns. Every screen reinforces that
relationship.

Built with **Expo + React Native + TypeScript + Expo Router**. Runs
completely offline with **zero API keys** — every AI capability is backed by
a deterministic mock provider you can inspect and swap out (see
[`docs/ai-architecture.md`](docs/ai-architecture.md)).

---

## Quick start

```bash
git clone <this-repo>
cd whatsfordinner
npm install
npm start
```

Then press `i` for iOS Simulator, `a` for Android Emulator, `w` for web, or
scan the QR code with **Expo Go** on your phone. No `.env` file, no signup,
no API keys required — see [`.env.example`](.env.example) for what those
variables would be *for*, whenever you connect a real backend.

Requires Node 18+ and npm. On a fresh checkout with just `npm install`, the
app opens straight into a fully-populated demo household — see **Demo
flow** below.

### Other useful commands

```bash
npm run android   # open in a connected Android device/emulator
npm run ios       # open in the iOS Simulator (macOS only)
npm run web       # run in a browser (react-native-web)
npm test          # run the business-logic test suite (Jest)
npx tsc --noEmit  # typecheck
```

---

## Demo flow

This is the flow a reviewer should be able to run start to finish with no
setup:

1. **Open the app.** The demo household ("The Gerke Family" — see
   [Seed household](#seed-household) below) is already configured. Home
   immediately shows tonight's dinner, kitchen status, this week's plan,
   and ingredients worth using soon.
2. **Tap Kitchen** → see the current inventory, grouped by
   fridge/freezer/pantry/cabinet/countertop.
3. **Tap Scan Kitchen** → **✨ Try it with a demo video**. No camera, no
   file picker needed.
4. Watch the "Remembering your kitchen…" processing animation.
5. Review the results — new items, updated quantities, and two items
   flagged as likely used up (and see the low-confidence "we aren't sure
   about this one" flow on one item). Tap **Looks Good**.
6. A completion screen confirms the update and that the week's meal plan
   and grocery list were refreshed automatically.
7. **Plan** and **Grocery** tabs now reflect the updated inventory.

To see onboarding instead of the pre-filled demo: **Settings → Data Export
& Delete → Delete All Data**, then relaunch — you'll land on the welcome
screen and can either **Get Started** (full onboarding) or tap **✨ Explore
with a demo household** again to jump straight back to the seeded data.

### Seed household

The default household ("The Gerke Family") matches the target persona this
product was designed for — a busy family, not hardcoded logic:

- 2 adults (one dislikes seafood), 2 teenage athletes (one from Brazil, one
  from Italy — reflected as favorite cuisines, not a hardcoded feature)
- No allergies or dietary restrictions
- Dinner around 8:30 PM, weeknight cooking target 30–45 minutes
- Not brand-loyal, moderate budget
- ~52 seeded inventory items, a generated weekly meal plan, and a grocery
  list derived from it

All of this is *editable data* (`src/data/seedHousehold.ts`,
`src/data/seedInventory.ts`), not special-cased behavior — everything the
demo household can do, a household you create through onboarding can do
too.

---

## What's implemented (MVP scope)

**P0 — core loop**
Onboarding · household profiles (members, preferences, allergies,
dietary restrictions) · kitchen inventory with manual add/edit/delete ·
video record/upload/demo scan flow · AI vision abstraction (mocked) ·
delta inventory merge between scans · meal planning engine · grocery list
generation with consolidation and "why am I buying this" · full
demo mode.

**P1**
Food-waste "Use These Soon" + "Save My Food" · meal ratings (😍🙂😐👎)
feeding future planning · meal swap with inventory-aware alternatives ·
full cook-along recipe screen with keep-screen-awake · notification
*preferences* UI (see [Not built](#not-built--production-integrations)).

**P2 (architected for, not built — see below)**
Real grocery store integration, live pricing, automatic cart creation,
push notifications, receipt/barcode scanning.

---

## Architecture

```
app/                          Expo Router file-based routes (screens only —
                               no business logic lives here)
  onboarding/                 5-screen onboarding flow
  (tabs)/                     Home · Kitchen · Plan · Grocery · Family
  scan/                       record → review → processing → results → complete
  recipe/[id]/                full recipe + cook-along, and swap
  settings/                   account, AI settings, privacy, notifications, data
  edit-*.tsx, edit-member/    Family-screen edit forms

src/
  types/                      TypeScript data model (see docs/data-model.md)
  ai/                         VisionProvider / MealPlanningProvider /
                               RecipeProvider interfaces + mock implementations
                               (see docs/ai-architecture.md)
  engines/                    Pure, unit-tested business logic:
                               mealPlanningEngine, groceryListEngine,
                               inventoryMerge, inventoryMatch, dietaryRules,
                               categorize
  state/                      Zustand stores — one persisted store for
                               household/inventory/plan/grocery data, one
                               ephemeral store for in-progress scans
  data/                       Seed household, seed inventory, recipe library
  components/                 Design-system building blocks (Button, Card,
                               Chip, Typography, RecipeImage, ...)
  theme/                      Design tokens (colors, spacing, type scale)
  utils/                      id/date/label helpers, cross-platform confirm()

__tests__/                    Jest tests for the engines (see Testing)
docs/                         Deep-dive docs referenced throughout this file
```

**Why this structure:** screens are thin — they read from the store, call
an engine or AI provider, and render. All the decisions that make the
product feel intelligent (what to plan, what to buy, how a scan updates
memory) live in `src/engines/`, are framework-agnostic, and are covered by
tests that don't need a simulator to run.

### Design direction

Warm, calm, premium — cream/terracotta/sage palette, large type, rounded
cards, generous spacing, no gradients-as-decoration, no chat-bubble "AI
assistant" aesthetic. Food imagery is represented as tasteful cuisine-tinted
gradient tiles with an emoji mark rather than stock photography, so the app
looks finished and looks the same for every reviewer without a network
dependency on an image CDN. See `src/theme/` for the full token set.

### State & persistence

One Zustand store (`src/state/store.ts`), persisted to `AsyncStorage`,
holds the household, inventory, scan history, current meal plan + past
meals, meal ratings, and grocery list. Because it's all local-first,
already-loaded screens keep working with no network connection — there's
nothing to "go offline," there's just local state that syncs when a real
backend exists (see Not built). The transient in-progress-scan state
(recording status, local video URI) is a **separate**, non-persisted store
(`src/state/scanFlowStore.ts`) so a killed app doesn't resurrect a half
recorded video.

### AI abstraction

See [`docs/ai-architecture.md`](docs/ai-architecture.md) for the full
writeup. Summary: three provider interfaces
(`VisionProvider`/`MealPlanningProvider`/`RecipeProvider`), one file
(`src/ai/index.ts`) that constructs them, zero other files that know a
concrete provider exists. Today they're all mocks; wiring in a real model
means implementing the same interfaces in `src/ai/providers/real/` and
changing three lines in `src/ai/index.ts`.

### Grocery architecture

See [`docs/grocery-provider-architecture.md`](docs/grocery-provider-architecture.md).
The list is generated purely from local data (meal plan + recipes +
inventory) — no store integration required for the MVP — with a
`GroceryProvider` interface sketched out for later (real pricing,
availability, cart creation).

---

## Testing

```bash
npm test
```

32 Jest tests cover the engines that make the product's promises real —
not UI snapshot tests, behavioral guarantees:

- `mealPlanningEngine` — never includes an allergen-violating recipe,
  scores better inventory coverage higher, penalizes cuisine repetition,
  excludes `never-again`-rated recipes, produces exactly one meal per
  requested day.
- `groceryListEngine` — doesn't list an ingredient you already have enough
  of, does list one that's nearly empty, consolidates the same ingredient
  across recipes into one rounded-up line, skips optional ingredients,
  and produces a correct "why am I buying this" explanation.
- `inventoryMerge` — a matched scan detection updates the existing item
  (never duplicates it), a genuinely new detection is added, an item
  flagged as likely-removed is actually removed, and anything the scan
  didn't mention is left untouched.
- `dietaryRules` / `inventoryMatch` — the safety-filter and fuzzy-matching
  primitives everything else depends on.

Beyond the automated suite, every screen and the full demo/onboarding flow
was exercised end-to-end (web build via Playwright + manual reasoning about
the native paths) during development — see **Known gaps** below for what
that surfaced and how it was fixed, and what's left.

---

## Accessibility

Dynamic type support (`maxFontSizeMultiplier` tuned per text role rather
than uncapped, so large accessibility text sizes don't break layouts),
`accessibilityRole`/`accessibilityLabel`/`accessibilityState` on every
interactive element, minimum 40–44px tap targets with `hitSlop` on smaller
icon buttons, high-contrast text tokens, and no interactive element nested
inside another interactive element (a real bug found and fixed during QA —
see below).

## Privacy & security

- Kitchen videos are used only to identify food in the frame; the app
  stores the *structured inventory* it derives, not the raw video, longer
  than needed to process it (see the in-app Privacy screen and the scan
  intro screen for the copy shown to users).
- No AI provider API key is ever bundled into the client — see
  `.env.example` and `docs/ai-architecture.md`'s "never call the model
  directly from the app" note. A real deployment holds keys server-side.
- **Settings → Data Export & Delete** lets a user export their full
  household data as JSON or permanently delete everything from the device.

## Product language

The UI never says "AI inference," "vision pipeline," or "LLM." It says
"Remembering your kitchen…", "Finding dinners you'll actually want to eat…",
"We aren't sure about this one." See `src/types/scan.ts`'s
`PROCESSING_STEPS` and the scan/results copy for the pattern.

---

## Known gaps & what's left for production

**Found and fixed during QA** (kept here for transparency, not swept
under the rug): three nested-interactive-element bugs (a card with its own
`onPress` that also contained button children — invalid on web, ambiguous
touch handling on native) on Home, Plan, and Kitchen; `Alert.alert` silently
no-ops on web with no polyfill, so destructive confirmations and the "why
am I buying this" explainer now go through a small `confirmAction`/
`informAction` cross-platform helper (`src/utils/confirm.ts`); several
`ScrollView`s were missing `flex: 1` on their own style (harmless on native
in most cases, but a real clipping risk with long content); and
"delete all data" was incorrectly reseeding the demo household instead of
handing back a blank slate for onboarding.

**Not built — genuine extension points, not silently skipped:**

- **Real AI vision/meal-planning/recipe models.** Fully abstracted (see
  above) but not connected — no vendor credentials were available in this
  environment. `src/ai/providers/real/README.md` is a concrete implementation
  guide.
- **Real grocery store integration** (Walmart, Instacart, Kroger, Amazon
  Fresh) — pricing is a flat mock table; `GroceryProvider` interface is
  sketched in `docs/grocery-provider-architecture.md` but not implemented.
- **Push notifications.** The Settings → Notifications screen has working,
  persisted *preference toggles* for the notification types described in
  the product spec (scan reminders, plan-ready, tonight's-dinner,
  food-waste alerts), but no scheduler actually fires them yet — that needs
  `expo-notifications` + a server or local scheduling job.
- **Multi-household / shared accounts / multi-device sync.** Single
  household, single device, `AsyncStorage`-only today; see
  `docs/data-model.md`'s "Not built" section for the shape this would take.
- **Nutrition tracking, calorie/macro goals, Apple Health, barcode/receipt
  scanning, voice assistant, Apple Watch/CarPlay** — out of scope for this
  MVP by design (see the product brief's explicit priority ordering);
  nothing in the current architecture blocks adding them later.
- **Automated end-to-end/UI tests.** The 32 Jest tests cover business logic
  exhaustively; there's no Detox/Maestro native UI test suite yet.
