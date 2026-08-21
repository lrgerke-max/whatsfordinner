# Wiring up a real AI provider

This directory is intentionally empty in the MVP. Kitchen Memory ships with
`MockVisionProvider`, `MockMealPlanningProvider`, and `MockRecipeProvider`
(in `src/ai/providers/`) implementing the interfaces in `src/ai/types.ts`, so
the whole product works offline with no API keys.

To connect a real model, implement the same interfaces here and swap the
construction in `src/ai/index.ts`. A few things worth knowing before you do:

## Never call the model directly from the app

API keys must never live in the mobile client (see `.env.example` and the
root README's Security section). A real provider should call your own
backend endpoint, which holds the key server-side and proxies to
Anthropic/OpenAI/Gemini/etc. `RealVisionProvider.analyzeKitchenVideo` would
`fetch('https://your-api.example.com/v1/scan', ...)`, not
`fetch('https://api.anthropic.com/...')`.

## Video needs to become frames first

Don't upload a raw 2-5 minute video straight into a chat-style multimodal
call. The recommended pipeline (this is what `KitchenScanProcessor` is
structured to support):

1. Sample ~1 frame every 1-2 seconds from `video.uri` (e.g. with
   `expo-video-thumbnails` or a server-side ffmpeg step after upload).
2. Optionally downsample/compress frames.
3. Send the frame set (not the raw video) to a vision-capable model with a
   prompt asking for structured JSON matching `KitchenAnalysis` —
   `detectedItems`, each with a qualitative `quantityLevel` and a
   `confidence`, plus `likelyRemovedItemIds` computed by diffing against the
   previous inventory you pass in the prompt.
4. Parse and validate the JSON (a schema-constrained response, e.g. Claude
   tool use / OpenAI structured outputs, is strongly preferred over
   freeform parsing).
5. Return it as a `KitchenAnalysis` — `KitchenScanProcessor.merge()` handles
   turning that into inventory deltas the same way it does for the mock.

## Keep the honesty guarantees

The mock never fabricates exact quantities or high confidence it doesn't
have — a real model prompt should explicitly instruct the same: prefer
`"unknown"` / qualitative levels (`full`, `half`, `nearly-empty`, ...) over
invented precision, and cap confidence when the frame is ambiguous, blurry,
or the item is partially occluded. `InventoryItem.needsReview` should stay
driven by a genuine confidence threshold, not always `false`.

## MealPlanningProvider / RecipeProvider

These don't strictly need an LLM at all — the mock's scoring engine
(`src/engines/mealPlanningEngine.ts`) is transparent, fast, fully unit
tested, and arguably a better fit for a trust-sensitive "what will my family
eat" decision than an opaque model call. If you do want LLM-generated
recipes (e.g. for `RecipeProvider.generateRecipe` to produce genuinely novel
dishes instead of selecting from the seed library), keep the scoring engine
as a *ranking* step over whatever the model proposes, so inventory
utilization, allergies, and dietary restrictions stay enforced in code
rather than left to prompt-following.
