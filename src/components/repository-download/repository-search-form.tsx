import { ArrowRight, ChevronDown, KeyRound, LoaderCircle } from 'lucide-react';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RepositoryDownloadStatus } from '@/models/repository-download-model';

interface RepositorySearchFormProps {
  value: string;
  token: string;
  status: RepositoryDownloadStatus;
  errorMessage?: string;
  promptForToken?: boolean;
  onValueChange: (value: string) => void;
  onTokenChange: (token: string) => void;
  onSubmit: (value: string, token: string) => void;
}

export function RepositorySearchForm({
  value,
  token,
  status,
  errorMessage,
  promptForToken = false,
  onValueChange,
  onTokenChange,
  onSubmit
}: RepositorySearchFormProps) {
  const [tokenOpen, setTokenOpen] = useState(false);
  const isBusy = status === 'validating' || status === 'loading';
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const tokenId = useId();
  const tokenDescriptionId = useId();

  useEffect(() => {
    if (promptForToken) setTokenOpen(true);
  }, [promptForToken]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value, token);
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

        <Collapsible
          open={tokenOpen}
          onOpenChange={setTokenOpen}
          className="rounded-3xl border border-border/70 bg-muted/35"
        >
          <CollapsibleTrigger
            type="button"
            className="group flex min-h-11 w-full items-center gap-3 rounded-3xl px-4 py-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <KeyRound
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              Optional GitHub authentication
            </span>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-2 border-t border-border/70 pt-4">
              <Label htmlFor={tokenId}>GitHub token</Label>
              <Input
                id={tokenId}
                name="github-token"
                type="password"
                value={token}
                onChange={(event) => onTokenChange(event.target.value)}
                placeholder="github_pat_…"
                autoComplete="off"
                spellCheck="false"
                maxLength={255}
                aria-describedby={tokenDescriptionId}
                className="h-11 px-4"
              />
              <p
                id={tokenDescriptionId}
                className="text-xs leading-relaxed text-foreground/80"
              >
                Use a fine-grained token with read-only public repository
                access. It is sent to this deployment for forwarding to GitHub,
                kept only in this page's memory, and never added to the URL or
                browser storage.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </form>
  );
}
