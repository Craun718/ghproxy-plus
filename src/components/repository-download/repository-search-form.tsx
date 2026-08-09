import { ArrowRight, LoaderCircle } from 'lucide-react';
import { type FormEvent, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RepositoryDownloadStatus } from '@/models/repository-download-model';

interface RepositorySearchFormProps {
  value: string;
  status: RepositoryDownloadStatus;
  errorMessage?: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function RepositorySearchForm({
  value,
  status,
  errorMessage,
  onValueChange,
  onSubmit
}: RepositorySearchFormProps) {
  const isBusy = status === 'validating' || status === 'loading';
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor={inputId}>GitHub repository</Label>
        <p id={descriptionId} className="text-sm text-muted-foreground">
          Paste a repository URL, release URL, or enter owner/repo.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id={inputId}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="owner/repository"
            autoComplete="url"
            spellCheck="false"
            aria-describedby={
              errorMessage ? `${descriptionId} ${errorId}` : descriptionId
            }
            aria-invalid={Boolean(errorMessage)}
            className="h-11 flex-1 px-4"
          />
          <Button
            type="submit"
            size="lg"
            disabled={isBusy}
            className="h-11 min-w-32"
          >
            {isBusy ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                Checking
              </>
            ) : (
              <>
                Find assets
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
        {errorMessage ? (
          <p id={errorId} className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}
