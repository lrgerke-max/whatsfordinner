import { create } from 'zustand';
import { ScanArea, ScanStatus } from '../types/scan';
import { KitchenAnalysis } from '../types/scan';

interface ScanFlowState {
  status: ScanStatus;
  videoUri: string | null;
  isDemoVideo: boolean;
  durationSeconds: number;
  areasCoveredHint: ScanArea[];
  analysis: KitchenAnalysis | null;
  error: string | null;

  startRecording: () => void;
  finishRecording: (uri: string, durationSeconds: number, isDemo?: boolean) => void;
  toggleAreaHint: (area: ScanArea) => void;
  reset: () => void;
  setStatus: (status: ScanStatus) => void;
  setAnalysis: (analysis: KitchenAnalysis) => void;
  setError: (error: string | null) => void;
}

const initial = {
  status: 'idle' as ScanStatus,
  videoUri: null,
  isDemoVideo: false,
  durationSeconds: 0,
  areasCoveredHint: [] as ScanArea[],
  analysis: null,
  error: null,
};

export const useScanFlowStore = create<ScanFlowState>((set) => ({
  ...initial,
  startRecording: () => set({ status: 'recording', error: null }),
  finishRecording: (uri, durationSeconds, isDemo = false) =>
    set({ status: 'reviewing-recording', videoUri: uri, durationSeconds, isDemoVideo: isDemo }),
  toggleAreaHint: (area) =>
    set((state) => ({
      areasCoveredHint: state.areasCoveredHint.includes(area)
        ? state.areasCoveredHint.filter((a) => a !== area)
        : [...state.areasCoveredHint, area],
    })),
  reset: () => set({ ...initial }),
  setStatus: (status) => set({ status }),
  setAnalysis: (analysis) => set({ analysis }),
  setError: (error) => set({ error, status: error ? 'failed' : 'idle' }),
}));
