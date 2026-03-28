import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StickyNoteProps {
  author: string;
  children: ReactNode;
  className?: string;
}

export function StickyNote({ author, children, className }: StickyNoteProps) {
  return (
    <div className={cn('bg-tertiary-fixed p-6 rounded-xl border-l-8 border-tertiary relative overflow-hidden', className)}>
      <div className="flex gap-4 items-start">
        <span className="material-symbols-outlined text-tertiary">edit_note</span>
        <div>
          <h3 className="text-on-tertiary-fixed font-bold text-sm mb-1">Notes from {author}</h3>
          <p className="text-on-tertiary-fixed-variant text-sm italic leading-snug">{children}</p>
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none">
        <span className="material-symbols-outlined text-8xl">format_quote</span>
      </div>
    </div>
  );
}
