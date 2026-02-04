'use client';

import { Loader2, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/lib/utils';

export function IndexingBanner() {
  const { indexingDocuments, isIndexing } = useChatStore();

  if (indexingDocuments.length === 0) return null;

  const pendingDocs = indexingDocuments.filter(
    (d) => d.status === 'pending' || d.status === 'processing'
  );
  const completedDocs = indexingDocuments.filter((d) => d.status === 'indexed');
  const failedDocs = indexingDocuments.filter((d) => d.status === 'failed');

  return (
    <div className="border-t border-border bg-muted/50 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          {isIndexing() ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Indexing documents... ({pendingDocs.length} remaining)
              </span>
            </>
          ) : failedDocs.length > 0 ? (
            <>
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Some documents failed to index
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                All documents indexed
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {indexingDocuments.map((doc) => (
            <div
              key={doc.document_id}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
                doc.status === 'indexed' && 'bg-primary/10 text-primary',
                doc.status === 'failed' && 'bg-destructive/10 text-destructive',
                (doc.status === 'pending' || doc.status === 'processing') &&
                  'bg-muted text-muted-foreground'
              )}
            >
              {doc.status === 'indexed' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : doc.status === 'failed' ? (
                <XCircle className="h-3 w-3" />
              ) : (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              <FileText className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{doc.filename}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
