'use client';

import { useState, useEffect, useRef } from 'react';
import { Spot } from '@/lib/types';

interface ShareMenuProps {
  spot: Spot;
  onClose: () => void;
}

function ShareIcon({ type }: { type: string }) {
  switch (type) {
    case 'whatsapp':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      );
    case 'telegram':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
      );
    case 'link':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      );
    case 'check':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      );
    default:
      return null;
  }
}

export default function ShareMenu({ spot, onClose }: ShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const spotUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `${spot.name} — Spot mancing favorit di SpotFish!`;

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${spotUrl}`)}`,
    },
    {
      name: 'Telegram',
      icon: 'telegram',
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20',
      url: `https://t.me/share/url?url=${encodeURIComponent(spotUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'Salin Link',
      icon: copied ? 'check' : 'link',
      color: 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-700',
      action: () => {
        navigator.clipboard.writeText(spotUrl).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[180px] z-50 dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="px-3 py-1 text-xs font-medium text-gray-500 border-b border-gray-100 dark:text-gray-400 dark:border-gray-800">
        Bagikan spot ini
      </div>
      {shareLinks.map((link) =>
        link.url ? (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 text-sm ${link.color} transition-colors`}
            onClick={onClose}
          >
            <ShareIcon type={link.icon} />
            <span>{link.name}</span>
          </a>
        ) : (
          <button
            key={link.name}
            onClick={() => {
              link.action?.();
              if (link.name === 'Salin Link') {
                setTimeout(onClose, 1500);
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left ${link.color} transition-colors`}
          >
            <ShareIcon type={link.icon} />
            <span>{link.name}</span>
          </button>
        )
      )}
    </div>
  );
}
