import { Download, FileArchive, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList
} from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { formatBytes, titleCase } from '@/lib/utils';
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

interface AssetGroupDefinition {
  kinds: AssetKind[];
  title: string;
  description: string;
}

interface AssetGroup extends AssetGroupDefinition {
  value: string;
  items: RepositoryAsset[];
}

const groupDefinitions: AssetGroupDefinition[] = [
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

function matchesAsset(asset: RepositoryAsset, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return [
    asset.name,
    asset.kind,
    asset.platform,
    asset.architecture,
    asset.format
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

export function AssetList({
  assets,
  selectedAssetId,
  recommendedAssetId,
  onSelect
}: AssetListProps) {
  const inputId = useId();
  const selectedAsset =
    assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const assetGroups: AssetGroup[] = groupDefinitions
    .map((group) => ({
      ...group,
      value: group.title,
      items: assets.filter((asset) => group.kinds.includes(asset.kind))
    }))
    .filter((group) => group.items.length > 0);
  const [inputValue, setInputValue] = useState(() => selectedAsset?.name ?? '');
  const selectedLabel = selectedAsset?.name ?? '';
  const searchQuery = inputValue === selectedLabel ? '' : inputValue;
  const filteredAssetGroups = assetGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((asset) => matchesAsset(asset, searchQuery))
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    setInputValue(selectedAsset?.name ?? '');
  }, [selectedAsset]);

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Asset</Label>
      <Combobox
        items={assetGroups}
        filteredItems={filteredAssetGroups}
        value={selectedAsset}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        itemToStringLabel={(asset) => asset.name}
        itemToStringValue={(asset) => asset.id}
        isItemEqualToValue={(asset, value) => asset.id === value.id}
        autoHighlight
        onValueChange={(asset) => {
          if (asset) onSelect(asset.id);
        }}
      >
        <ComboboxInput
          id={inputId}
          className="min-h-11 w-full"
          placeholder="Search files, platforms, or architectures"
          triggerLabel="Open asset options"
        />
        <ComboboxContent className="max-w-[calc(100vw-2rem)]">
          <ComboboxEmpty>No assets match your search.</ComboboxEmpty>
          <ComboboxList aria-label="Asset options">
            {(group: AssetGroup) => (
              <ComboboxGroup
                key={group.value}
                items={group.items}
                className="pb-1.5 last:pb-0"
              >
                <ComboboxLabel className="space-y-0.5">
                  <span className="block font-medium text-foreground">
                    {group.title}
                  </span>
                  <span className="block font-normal">{group.description}</span>
                </ComboboxLabel>
                <ComboboxCollection>
                  {(asset: RepositoryAsset) => {
                    const isRecommended = asset.id === recommendedAssetId;

                    return (
                      <ComboboxItem
                        key={asset.id}
                        value={asset}
                        className="min-h-14 items-start py-3 sm:items-center"
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
                          <span className="mt-1 block text-xs text-foreground/80">
                            {titleCase(asset.platform)} ·{' '}
                            {titleCase(asset.architecture)} ·{' '}
                            {titleCase(asset.format)} ·{' '}
                            {formatBytes(asset.size)}
                            {asset.downloadCount !== null
                              ? ` · ${asset.downloadCount.toLocaleString()} downloads`
                              : ''}
                          </span>
                        </span>
                      </ComboboxItem>
                    );
                  }}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-xs text-muted-foreground">
        Search {assets.length} files by name or metadata. Your current selection
        stays unchanged when there are no matches.
      </p>
    </div>
  );
}
