import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(onCommandPaletteOpen?: () => void) {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    // Global Navigation
    { key: 'k', ctrl: true, action: () => onCommandPaletteOpen?.(), description: 'Open command palette' },
    { key: 'h', alt: true, action: () => navigate('/dashboard'), description: 'Go to Dashboard' },
    { key: 'q', alt: true, action: () => navigate('/quotes'), description: 'Go to Quotes' },
    { key: 's', alt: true, action: () => navigate('/sales-orders'), description: 'Go to Sales Orders' },
    { key: 'p', alt: true, action: () => navigate('/procurement'), description: 'Go to Purchase Orders' },
    { key: 'c', alt: true, action: () => navigate('/customers'), description: 'Go to Customers' },
    { key: 'i', alt: true, action: () => navigate('/inventory/products'), description: 'Go to Products' },
    { key: 'r', alt: true, action: () => navigate('/reports'), description: 'Go to Reports' },
    { key: 'a', alt: true, action: () => navigate('/ask-aria'), description: 'Ask ARIA' },
    
    // Quick Actions
    { key: 'n', ctrl: true, shift: true, action: () => navigate('/quotes?action=new'), description: 'New Quote' },
    { key: 'o', ctrl: true, shift: true, action: () => navigate('/sales-orders?action=new'), description: 'New Sales Order' },
    { key: 'p', ctrl: true, shift: true, action: () => navigate('/procurement?action=new'), description: 'New Purchase Order' },
    
    // Navigation
    { key: 'ArrowLeft', alt: true, action: () => window.history.back(), description: 'Go back' },
    { key: 'ArrowRight', alt: true, action: () => window.history.forward(), description: 'Go forward' },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Escape and Ctrl+K even in inputs
      if (event.key !== 'Escape' && !(event.key === 'k' && (event.ctrlKey || event.metaKey))) {
        return;
      }
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      
      if (event.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

export function getShortcutDisplay(shortcut: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean }) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push('⇧');
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(isMac ? '' : '+');
}
