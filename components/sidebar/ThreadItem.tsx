'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn, formatDate } from '@/lib/utils';
import { useThreadStore } from '@/stores/threadStore';
import type { Thread } from '@/lib/api/types';

interface ThreadItemProps {
  thread: Thread & { localTitle?: string };
  isActive: boolean;
  onSelect: () => void;
}

export function ThreadItem({ thread, isActive, onSelect }: ThreadItemProps) {
  const { deleteThread, saveThreadTitle } = useThreadStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const title = thread.localTitle || thread.title || 'New chat';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteThread(thread.thread_id);
      // Navigate to chat home after successful deletion
      window.location.href = '/chat';
    } catch (error) {
      console.error('Failed to delete thread:', error);
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleRename = async () => {
    if (!newTitle.trim()) return;

    setIsSaving(true);
    try {
      await saveThreadTitle(thread.thread_id, newTitle.trim());
      toast.success('Chat renamed successfully');
      setShowRenameDialog(false);
      setNewTitle('');
    } catch (error) {
      console.error('Failed to rename thread:', error);
      toast.error('Failed to save chat name');
    } finally {
      setIsSaving(false);
    }
  };

  const openRenameDialog = () => {
    setNewTitle(title);
    setShowRenameDialog(true);
  };

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
        )}
        onClick={onSelect}
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <div className="flex-1 truncate">
          <div className="truncate font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(thread.created_at)}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openRenameDialog}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{title}&quot;. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isSaving || !newTitle.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
