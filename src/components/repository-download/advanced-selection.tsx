import { AssetList } from '@/components/repository-download/asset-list';
import { ReleasePicker } from '@/components/repository-download/release-picker';
import type {
  AssetRecommendation,
  RepositoryRelease
} from '@/models/repository-download-types';

interface AdvancedSelectionProps {
  releases: RepositoryRelease[];
  currentRelease: RepositoryRelease;
  selectedReleaseId: string | null;
  selectedAssetId: string | null;
  recommendation: AssetRecommendation | null;
  onSelectRelease: (releaseId: string) => void;
  onSelectAsset: (assetId: string) => void;
}

export default function AdvancedSelection({
  releases,
  currentRelease,
  selectedReleaseId,
  selectedAssetId,
  recommendation,
  onSelectRelease,
  onSelectAsset
}: AdvancedSelectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
      <ReleasePicker
        releases={releases}
        selectedReleaseId={selectedReleaseId}
        onSelect={onSelectRelease}
      />
      <AssetList
        assets={currentRelease.assets}
        selectedAssetId={selectedAssetId}
        recommendedAssetId={recommendation?.assetId ?? null}
        onSelect={onSelectAsset}
      />
    </div>
  );
}
