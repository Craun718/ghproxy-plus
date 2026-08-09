import { Check, Download, FileArchive, ShieldCheck } from 'lucide-react';
import { useId } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn, formatBytes, titleCase } from '@/lib/utils';
import type {
  AssetKind,
  RepositoryAsset
} from '@/models/repository-download-types';

interface AssetListProps {
  assets: RepositoryAsset[];
  selectedAssetId: string | null;
  recommendedAssetId: string | null;
  onSelect: (assetId: string) => void;
}

interface AssetGroup {
  kinds: AssetKind[];
  title: string;
  description: string;
}

const groups: AssetGroup[] = [
  {
    kinds: ['binary'],
    title: 'Installers and binaries',
    description: 'Ready-to-run packages for supported platforms.'
  },
  {
    kinds: ['source'],
    title: 'Source code',
    description: 'Archives for building or reviewing the project.'
  },
  {
    kinds: ['checksum', 'signature'],
    title: 'Checksums and signatures',
    description: 'Verification files are never selected automatically.'
  }
];

function AssetIcon({ kind }: { kind: AssetKind }) {
  if (kind === 'checksum' || kind === 'signature') {
    return <ShieldCheck className="size-4" aria-hidden="true" />;
  }
  if (kind === 'source') {
    return <FileArchive className="size-4" aria-hidden="true" />;
  }
  return <Download className="size-4" aria-hidden="true" />;
}

export function AssetList({
  assets,
  selectedAssetId,
  recommendedAssetId,
  onSelect
}: AssetListProps) {
  const groupIdPrefix = useId();

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupedAssets = assets.filter((asset) =>
          group.kinds.includes(asset.kind)
        );
        if (groupedAssets.length === 0) return null;

        return (
          <section
            key={group.title}
            aria-labelledby={`${groupIdPrefix}-${group.kinds[0]}`}
          >
            <div className="mb-2">
              <h3
                id={`${groupIdPrefix}-${group.kinds[0]}`}
                className="font-medium"
              >
                {group.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border">
              {groupedAssets.map((asset) => {
                const isSelected = asset.id === selectedAssetId;
                const isRecommended = asset.id === recommendedAssetId;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onSelect(asset.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex min-h-14 w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/30 sm:items-center',
                      isSelected && 'bg-secondary/70'
                    )}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:mt-0">
                      <AssetIcon kind={asset.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="break-all font-medium">
                          {asset.name}
                        </span>
                        {isRecommended ? <Badge>Recommended</Badge> : null}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {titleCase(asset.platform)} ·{' '}
                        {titleCase(asset.architecture)} ·{' '}
                        {titleCase(asset.format)} · {formatBytes(asset.size)}
                        {asset.downloadCount !== null
                          ? ` · ${asset.downloadCount.toLocaleString()} downloads`
                          : ''}
                      </span>
                    </span>
                    {isSelected ? (
                      <Check
                        className="mt-1 size-4 shrink-0 text-primary sm:mt-0"
                        aria-label="Selected"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
