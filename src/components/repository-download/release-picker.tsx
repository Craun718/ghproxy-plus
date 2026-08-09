import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { RepositoryRelease } from '@/models/repository-download-types';

interface ReleasePickerProps {
  releases: RepositoryRelease[];
  selectedReleaseId: string | null;
  onSelect: (releaseId: string) => void;
}

export function ReleasePicker({
  releases,
  selectedReleaseId,
  onSelect
}: ReleasePickerProps) {
  const selectId = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={selectId}>Release</Label>
      <Select
        value={selectedReleaseId}
        onValueChange={(value) => {
          if (value) onSelect(value);
        }}
      >
        <SelectTrigger id={selectId} className="min-h-11 w-full">
          <SelectValue placeholder="Select a release" />
        </SelectTrigger>
        <SelectContent>
          {releases.map((release, index) => (
            <SelectItem key={release.id} value={release.id}>
              <span>{release.name || release.tagName}</span>
              {index === 0 ? (
                <span className="text-xs text-muted-foreground">Latest</span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Type while the list is open to jump to a release. All {releases.length}{' '}
        releases are available.
      </p>
    </div>
  );
}

import { useId } from 'react';
