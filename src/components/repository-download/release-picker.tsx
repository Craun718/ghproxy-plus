import { useEffect, useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import type { RepositoryRelease } from '@/models/repository-download-types';

interface ReleasePickerProps {
  releases: RepositoryRelease[];
  selectedReleaseId: string | null;
  onSelect: (releaseId: string) => void;
}

function getReleaseLabel(release: RepositoryRelease) {
  return release.name || release.tagName;
}

function matchesRelease(release: RepositoryRelease, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return `${getReleaseLabel(release)} ${release.tagName}`
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

export function ReleasePicker({
  releases,
  selectedReleaseId,
  onSelect
}: ReleasePickerProps) {
  const inputId = useId();
  const selectedRelease =
    releases.find((release) => release.id === selectedReleaseId) ?? null;
  const [inputValue, setInputValue] = useState(() =>
    selectedRelease ? getReleaseLabel(selectedRelease) : ''
  );
  const selectedLabel = selectedRelease ? getReleaseLabel(selectedRelease) : '';
  const searchQuery = inputValue === selectedLabel ? '' : inputValue;
  const filteredReleases = releases.filter((release) =>
    matchesRelease(release, searchQuery)
  );

  useEffect(() => {
    setInputValue(selectedRelease ? getReleaseLabel(selectedRelease) : '');
  }, [selectedRelease]);

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Release</Label>
      <Combobox
        items={releases}
        filteredItems={filteredReleases}
        value={selectedRelease}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        itemToStringLabel={getReleaseLabel}
        itemToStringValue={(release) => release.id}
        isItemEqualToValue={(release, value) => release.id === value.id}
        autoHighlight
        onValueChange={(release) => {
          if (release) onSelect(release.id);
        }}
      >
        <ComboboxInput
          id={inputId}
          className="min-h-11 w-full"
          placeholder="Search releases by name or tag"
          triggerLabel="Open release options"
        />
        <ComboboxContent className="max-w-[calc(100vw-2rem)]">
          <ComboboxEmpty>No releases match your search.</ComboboxEmpty>
          <ComboboxList aria-label="Release options">
            {(release: RepositoryRelease) => (
              <ComboboxItem
                key={release.id}
                value={release}
                className="min-h-12"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {getReleaseLabel(release)}
                  </span>
                  {getReleaseLabel(release) !== release.tagName ? (
                    <span className="mt-0.5 block truncate text-xs text-foreground/80">
                      {release.tagName}
                    </span>
                  ) : null}
                </span>
                {release.id === releases[0]?.id ? (
                  <Badge variant="secondary">Latest</Badge>
                ) : null}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-xs text-muted-foreground">
        Search by release name or tag. All {releases.length} releases are
        available.
      </p>
    </div>
  );
}
