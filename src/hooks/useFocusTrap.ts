import { useEffect, useRef } from 'react';

const modalStack: HTMLElement[] = [];
const inertRegistry = new Map<HTMLElement, { count: number; originalInert: boolean; originalAriaHidden: string | null }>();

function setSiblingsInert(modalElement: HTMLElement): () => void {
  const localAffected: HTMLElement[] = [];
  let current: HTMLElement | null = modalElement;

  while (current && current !== document.body && current !== document.documentElement) {
    const parentEl: HTMLElement | null = current.parentElement;
    if (!parentEl) break;

    const siblings = Array.from(parentEl.children) as HTMLElement[];
    for (const sibling of siblings) {
      if (
        sibling !== current &&
        sibling.tagName !== 'SCRIPT' &&
        sibling.tagName !== 'STYLE' &&
        sibling.tagName !== 'LINK'
      ) {
        // Skip backdrops
        if (sibling.hasAttribute('data-backdrop')) continue;
        
        // Skip if this sibling contains ANY modal in the stack (prevents isolating higher modals)
        if (modalStack.some(m => sibling.contains(m))) continue;

        localAffected.push(sibling);

        if (!inertRegistry.has(sibling)) {
          inertRegistry.set(sibling, {
            count: 1,
            originalInert: sibling.hasAttribute('inert'),
            originalAriaHidden: sibling.getAttribute('aria-hidden')
          });
          sibling.setAttribute('inert', '');
          sibling.setAttribute('aria-hidden', 'true');
        } else {
          const record = inertRegistry.get(sibling)!;
          record.count++;
        }
      }
    }
    current = parentEl;
  }

  return () => {
    for (const node of localAffected) {
      const record = inertRegistry.get(node);
      if (record) {
        record.count--;
        if (record.count <= 0) {
          if (!record.originalInert) {
            node.removeAttribute('inert');
          }
          if (record.originalAriaHidden === null) {
            node.removeAttribute('aria-hidden');
          } else {
            node.setAttribute('aria-hidden', record.originalAriaHidden);
          }
          inertRegistry.delete(node);
        }
      }
    }
  };
}

export function useFocusTrap(isOpen: boolean, onClose?: () => void) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }

    if (!isOpen) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    if (!modalStack.includes(modalElement)) {
      modalStack.push(modalElement);
    }

    previousFocusRef.current = document.activeElement as HTMLElement;

    // We MUST save inline style correctly. If it's empty, we should save empty.
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const cleanupInert = setSiblingsInert(modalElement);

    if (modalElement.getAttribute('tabIndex') === null) {
      modalElement.setAttribute('tabIndex', '-1');
    }

    const focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';

    const getFocusable = () => {
      if (!modalRef.current) return [];
      return Array.from(modalRef.current.querySelectorAll<HTMLElement>(focusableElementsString)).filter(el => {
        if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) return false;
        if (el.closest('[aria-hidden="true"]')) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (el.getClientRects().length === 0) return false;
        return true;
      });
    };

    const timer = setTimeout(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalElement.focus();
      }
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== modalElement) return;

      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = getFocusable();
      if (focusableElements.length === 0) {
        e.preventDefault();
        modalElement.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || document.activeElement === modalElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      cleanupInert();
      
      document.body.style.overflow = originalStyle;
      
      const index = modalStack.indexOf(modalElement);
      if (index !== -1) {
        modalStack.splice(index, 1);
      }

      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        restoreTimerRef.current = setTimeout(() => {
          if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
            const topmost = modalStack[modalStack.length - 1];
            // If another modal is topmost, and our trigger is outside it, don't steal focus
            // back to an inert background element.
            if (topmost && !topmost.contains(previousFocusRef.current)) {
              // Do nothing, let the topmost modal handle focus
            } else {
              previousFocusRef.current.focus();
            }
          }
          previousFocusRef.current = null;
          restoreTimerRef.current = null;
        }, 0);
      }
    };
  }, [isOpen, onClose]);

  return modalRef;
}
