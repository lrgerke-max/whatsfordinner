import { InventoryItem } from '../../types/inventory';
import { KitchenAnalysis, ScanArea } from '../../types/scan';
import { VideoInput, VisionProvider } from '../types';
import { buildDemoAnalysis, GENERIC_ITEM_POOL } from '../mockData/demoScan';
import { generateId } from '../../utils/id';
import { findInventoryMatch } from '../../engines/inventoryMatch';

/** Small deterministic PRNG so a given video produces stable, repeatable results. */
function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const ALL_AREAS: ScanArea[] = ['refrigerator', 'freezer', 'pantry', 'cabinets', 'countertops'];

/**
 * Mock implementation of VisionProvider. Stands in for a real multimodal
 * model (e.g. a Claude/GPT-4o/Gemini vision call over sampled video frames —
 * see src/ai/providers/real/README.md). It never invents false precision:
 * confidence is capped, quantities stay qualitative unless a "clean" read
 * is simulated, and everything is clearly synthetic.
 */
export class MockVisionProvider implements VisionProvider {
  async analyzeKitchenVideo(video: VideoInput, previousInventory: InventoryItem[]): Promise<KitchenAnalysis> {
    // Simulate processing latency so the "remembering your kitchen" UI has
    // room to show its steps rather than flashing instantly.
    await delay(400);

    if (video.isDemoVideo) {
      return buildDemoAnalysis(previousInventory);
    }

    return this.simulateGenericScan(video, previousInventory);
  }

  private simulateGenericScan(video: VideoInput, previousInventory: InventoryItem[]): KitchenAnalysis {
    const rand = seededRandom(video.uri + video.durationSeconds);
    // Longer tours see more: a quick fridge glance (~30s) finds the obvious
    // items; a thorough 2-3 minute walkthrough reads enough labels to fill
    // out the whole pantry. Generous curve so effort is rewarded.
    const itemCount = Math.max(
      8,
      Math.min(GENERIC_ITEM_POOL.length, Math.round((video.durationSeconds / 150) * GENERIC_ITEM_POOL.length))
    );

    const shuffled = [...GENERIC_ITEM_POOL].sort(() => rand() - 0.5).slice(0, itemCount);

    const detectedItems = shuffled.map((base) => {
      const match = findInventoryMatch(base.name, previousInventory);
      const confidenceJitter = (rand() - 0.5) * 0.15;
      return {
        ...base,
        id: generateId('detected'),
        confidence: Math.max(0.25, Math.min(0.97, base.confidence + confidenceJitter)),
        matchedInventoryItemId: match?.id,
      };
    });

    // Assume a handful of previously-known items that go unmentioned in a
    // shorter tour were probably used up — but only when we're fairly
    // confident, and only a small number, to avoid over-claiming.
    const unmentioned = previousInventory.filter(
      (item) => !detectedItems.some((d) => d.matchedInventoryItemId === item.id)
    );
    const likelyRemovedItemIds = unmentioned
      .filter(() => rand() < 0.12)
      .slice(0, 3)
      .map((i) => i.id);

    const areasObserved = ALL_AREAS.filter(() => rand() > 0.15);
    const minutes = Math.max(1, Math.round(video.durationSeconds / 60));
    const labelReads = Math.max(1, Math.round(itemCount / 2));

    return {
      detectedItems,
      likelyRemovedItemIds,
      areasObserved: areasObserved.length > 0 ? areasObserved : ALL_AREAS.slice(0, 2),
      summary: `Reviewed about ${minutes} minute${minutes === 1 ? '' : 's'} of footage across ${areasObserved.length || 2} area(s) — spotted ${detectedItems.length} things, close enough to read ${labelReads} package label${labelReads === 1 ? '' : 's'}.`,
    };
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
