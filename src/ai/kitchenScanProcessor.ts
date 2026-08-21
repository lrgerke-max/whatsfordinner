import { InventoryItem } from '../types/inventory';
import { KitchenAnalysis } from '../types/scan';
import { mergeScanIntoInventory, MergeResult } from '../engines/inventoryMerge';
import { VideoInput, VisionProvider } from './types';

export { PROCESSING_STEPS } from '../types/scan';

/**
 * Orchestrates a kitchen scan end to end:
 *   1. hand the video to a VisionProvider (frame extraction + model calls
 *      happen inside a real provider — see providers/real/README.md)
 *   2. merge the resulting analysis into the household's existing inventory
 *      as a delta, never a full replace
 *
 * This class is the seam a real implementation would replace/extend — e.g.
 * to actually sample frames from `video.uri` with expo-video-thumbnails
 * before calling a hosted multimodal model.
 */
export class KitchenScanProcessor {
  constructor(private vision: VisionProvider) {}

  async analyze(video: VideoInput, previousInventory: InventoryItem[]): Promise<KitchenAnalysis> {
    return this.vision.analyzeKitchenVideo(video, previousInventory);
  }

  merge(previousInventory: InventoryItem[], analysis: KitchenAnalysis): MergeResult {
    return mergeScanIntoInventory(previousInventory, analysis);
  }
}
