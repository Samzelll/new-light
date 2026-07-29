"use client";

import { useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface ShareVoteCardProps {
  contestTitle: string;
  contestType: string;
  votedForName: string;
  percentageLeading?: number; // optional — current % of the voted option
  contestId: string;
}

/**
 * Share button shown after a successful vote.
 * Generates a canvas-based share card and attempts native share → fallback to clipboard.
 */
export function ShareVoteCard({
  contestTitle,
  contestType,
  votedForName,
  percentageLeading,
  contestId,
}: ShareVoteCardProps) {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sharing, setSharing] = useState(false);
  const [visible, setVisible] = useState(false);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/contest/${contestId}`;

  const TYPE_COLORS: Record<string, { main: string; bg: string }> = {
    battle:   { main: '#ff5757', bg: '#1a0a0a' },
    race:     { main: '#ffc857', bg: '#1a150a' },
    eternal:  { main: '#a855f7', bg: '#120a1a' },
    standard: { main: '#3861ff', bg: '#0a0d1a' },
  };
  const colors = TYPE_COLORS[contestType] || TYPE_COLORS.standard;

  /** Draw the share card on canvas and return a Blob */
  const drawCard = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);

      const W = 800;
      const H = 420;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      // Background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, W, H);

      // Gradient overlay
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, colors.main + '30');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Top accent line
      const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
      lineGrad.addColorStop(0, 'transparent');
      lineGrad.addColorStop(0.5, colors.main);
      lineGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = lineGrad as any;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(W, 2);
      ctx.stroke();

      // "I VOTED" badge
      ctx.fillStyle = colors.main + 'cc';
      roundRect(ctx, 32, 36, 100, 28, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('⚡ I VOTED', 46, 55);

      // Contest title
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '500 15px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(contestTitle.length > 52 ? contestTitle.slice(0, 52) + '…' : contestTitle, 32, 102);

      // "I'm voting for"
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '500 13px system-ui';
      ctx.fillText('My vote goes to', 32, 140);

      // Voted name — big
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${votedForName.length > 20 ? 36 : 48}px system-ui`;
      ctx.fillText(votedForName.length > 24 ? votedForName.slice(0, 24) + '…' : votedForName, 32, 210);

      // Percentage if available
      if (percentageLeading !== undefined) {
        ctx.fillStyle = colors.main;
        ctx.font = 'bold 64px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(percentageLeading)}%`, W - 40, 220);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '500 12px system-ui';
        ctx.fillText('currently leading', W - 40, 242);
      }

      // Bottom divider
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, H - 68);
      ctx.lineTo(W - 32, H - 68);
      ctx.stroke();

      // URL
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '500 13px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(shareUrl, 32, H - 36);

      // Logo
      ctx.fillStyle = colors.main;
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('Opinion Net', W - 32, H - 36);

      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.9);
    });
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await drawCard();

      // Try native Web Share API (mobile)
      if (blob && navigator.share && navigator.canShare?.({ files: [new File([blob], 'vote.png', { type: 'image/png' })] })) {
        await navigator.share({
          title: `I voted for ${votedForName}`,
          text: `Check out this contest on Opinion Net: ${contestTitle}`,
          url: shareUrl,
          files: [new File([blob], 'my-vote.png', { type: 'image/png' })],
        });
        toastSuccess('Shared successfully!', '🎉');
      } else if (blob) {
        // Fallback: copy link + offer download
        try {
          await navigator.clipboard.writeText(`I voted for ${votedForName} in "${contestTitle}"!\n${shareUrl}`);
          toastSuccess('Link copied to clipboard!', '📋');
        } catch {
          // Last fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'my-vote.png';
          a.click();
          URL.revokeObjectURL(url);
          toastInfo('Image saved — share it anywhere!', '🖼️');
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toastError('Could not share. Try copying the link instead.');
      }
    } finally {
      setSharing(false);
    }
  };

  const handlePreview = () => {
    setVisible(!visible);
    // Trigger draw after DOM update
    setTimeout(() => drawCard(), 50);
  };

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Preview toggle */}
      {visible && (
        <div
          style={{
            marginBottom: '12px',
            borderRadius: '16px',
            overflow: 'hidden',
            border: `1px solid ${colors.main}30`,
            animation: 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 20px',
            borderRadius: '14px',
            border: `1px solid ${colors.main}40`,
            background: `${colors.main}15`,
            color: colors.main,
            fontSize: '13px',
            fontWeight: '700',
            cursor: sharing ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!sharing) {
              (e.currentTarget as HTMLButtonElement).style.background = `${colors.main}25`;
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 20px ${colors.main}20`;
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = `${colors.main}15`;
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          {sharing ? (
            <span style={{ width: '14px', height: '14px', border: `2px solid ${colors.main}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          ) : (
            <span>↑</span>
          )}
          Share My Vote
        </button>

        {/* Copy link */}
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              toastSuccess('Link copied!', '🔗');
            } catch {
              toastError('Could not copy link');
            }
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '11px 16px', borderRadius: '14px',
            border: '1px solid var(--color-surface-500)',
            background: 'var(--color-surface-700)',
            color: 'rgb(156,163,175)',
            fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgb(156,163,175)'; }}
        >
          🔗 Copy Link
        </button>

        {/* Telegram */}
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`I voted for ${votedForName} in "${contestTitle}"! Check it out:`)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '11px 16px', borderRadius: '14px',
            border: '1px solid rgba(38,150,255,0.3)',
            background: 'rgba(38,150,255,0.08)',
            color: '#2696ff',
            fontSize: '13px', fontWeight: '600',
            textDecoration: 'none', transition: 'all 0.15s',
          }}
        >
          ✈️ Telegram
        </a>
      </div>
    </div>
  );
}

// Helper: rounded rect path
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
