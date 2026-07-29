"use client";

import { useState } from 'react';
import {
  Play, Pause, CheckCircle, AlertTriangle, ClipboardList,
  ChevronDown, ChevronUp, Settings, Trash2, UserPlus,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type ContestStatus = 'draft' | 'registration' | 'active' | 'paused' | 'blocked' | 'completed' | 'cancelled';

interface CreatorToolbarProps {
  contestId: string;
  currentStatus: ContestStatus;
  contestType: string;
  participantsCount: number;
  onStatusChange: (status: ContestStatus) => void;
  onAddCompetitor?: () => void;
  onDeleteContest?: () => void;
  role: string; // 'admin' | 'developer' | 'creator' | 'moderator'
}

const STATUS_ACTIONS: {
  status: ContestStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  description: string;
}[] = [
  {
    status: 'registration',
    label: 'Open Registration',
    icon: <ClipboardList size={14} />,
    color: '#5c87ff',
    bg: 'rgba(56,97,255,0.15)',
    border: 'rgba(56,97,255,0.3)',
    description: 'Allow participants to submit entries',
  },
  {
    status: 'active',
    label: 'Start Voting',
    icon: <Play size={14} />,
    color: 'var(--color-accent-green)',
    bg: 'rgba(0,229,160,0.12)',
    border: 'rgba(0,229,160,0.3)',
    description: 'Open voting for all participants',
  },
  {
    status: 'paused',
    label: 'Pause',
    icon: <Pause size={14} />,
    color: '#ffc857',
    bg: 'rgba(255,200,87,0.12)',
    border: 'rgba(255,200,87,0.3)',
    description: 'Temporarily suspend voting',
  },
  {
    status: 'blocked',
    label: 'Block / Caution',
    icon: <AlertTriangle size={14} />,
    color: 'var(--color-accent-red)',
    bg: 'rgba(255,87,87,0.12)',
    border: 'rgba(255,87,87,0.3)',
    description: 'Mark as caution — hidden from feed',
  },
  {
    status: 'completed',
    label: 'Mark Completed',
    icon: <CheckCircle size={14} />,
    color: '#00e5a0',
    bg: 'rgba(0,229,160,0.08)',
    border: 'rgba(0,229,160,0.2)',
    description: 'Finalize and close the contest',
  },
];

const ROLE_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  developer: { label: 'Developer', color: '#a855f7', glow: 'rgba(168,85,247,0.3)' },
  admin:     { label: 'Admin',     color: '#ff5757', glow: 'rgba(255,87,87,0.3)'  },
  creator:   { label: 'Creator',   color: '#ffc857', glow: 'rgba(255,200,87,0.3)' },
  moderator: { label: 'Moderator', color: '#00e5a0', glow: 'rgba(0,229,160,0.3)'  },
};

export function CreatorToolbar({
  contestId,
  currentStatus,
  contestType,
  participantsCount,
  onStatusChange,
  onAddCompetitor,
  onDeleteContest,
  role,
}: CreatorToolbarProps) {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [changingStatus, setChangingStatus] = useState<ContestStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const roleConf = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const isAdmin = ['admin', 'developer'].includes(role);

  const handleStatusChange = async (status: ContestStatus) => {
    if (status === currentStatus) {
      toastInfo(`Contest is already ${status}`, '💡');
      return;
    }
    setChangingStatus(status);
    try {
      await onStatusChange(status);
      toastSuccess(`Status changed to "${status}"`, '✅');
    } catch (e: any) {
      toastError(e.message || 'Failed to change status');
    } finally {
      setChangingStatus(null);
    }
  };

  return (
    <div
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        border: `1px solid ${roleConf.color}30`,
        boxShadow: `0 0 32px ${roleConf.glow}, 0 8px 32px rgba(0,0,0,0.4)`,
        background: 'var(--color-surface-800)',
      }}
    >
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          background: `linear-gradient(135deg, ${roleConf.color}18, ${roleConf.color}08)`,
          borderBottom: expanded ? `1px solid ${roleConf.color}20` : 'none',
          cursor: 'pointer',
          border: 'none',
          textAlign: 'left',
        }}
      >
        {/* Role indicator dot */}
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: roleConf.color,
            boxShadow: `0 0 8px ${roleConf.color}`,
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={14} style={{ color: roleConf.color }} />
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
              Contest Controls
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: '800',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: roleConf.color,
                background: `${roleConf.color}18`,
                border: `1px solid ${roleConf.color}30`,
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {roleConf.label}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'rgb(107,114,128)', margin: '2px 0 0' }}>
            Status: <span style={{ color: 'white', fontWeight: '600' }}>{currentStatus}</span>
            {' · '}
            {participantsCount} participant{participantsCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ color: 'rgb(107,114,128)', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Status controls */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgb(107,114,128)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              Change Status
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
              {STATUS_ACTIONS.map((action) => {
                const isActive = currentStatus === action.status;
                const isLoading = changingStatus === action.status;

                return (
                  <button
                    key={action.status}
                    onClick={() => handleStatusChange(action.status)}
                    disabled={isLoading}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: `1px solid ${isActive ? action.border : 'var(--color-surface-600)'}`,
                      background: isActive ? action.bg : 'var(--color-surface-900)',
                      cursor: isLoading ? 'wait' : 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isLoading) {
                        (e.currentTarget as HTMLButtonElement).style.background = action.bg;
                        (e.currentTarget as HTMLButtonElement).style.borderColor = action.border;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !isLoading) {
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-900)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-surface-600)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isActive ? action.color : 'rgb(156,163,175)' }}>
                      {isLoading ? (
                        <span style={{ width: '14px', height: '14px', border: `2px solid ${action.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                      ) : action.icon}
                      <span style={{ fontSize: '12px', fontWeight: '700', color: isActive ? action.color : 'white' }}>
                        {action.label}
                      </span>
                      {isActive && (
                        <span style={{ marginLeft: 'auto', fontSize: '8px', background: action.color, color: '#000', padding: '1px 5px', borderRadius: '3px', fontWeight: '900', textTransform: 'uppercase' }}>
                          NOW
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '10px', color: 'rgb(107,114,128)', margin: 0, paddingLeft: '20px' }}>
                      {action.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--color-surface-700)' }}>
            {/* Add competitor — for battles */}
            {contestType === 'battle' && onAddCompetitor && (
              <button
                onClick={onAddCompetitor}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: 'rgba(56,97,255,0.12)',
                  border: '1px solid rgba(56,97,255,0.3)',
                  color: 'var(--color-brand-400)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <UserPlus size={14} />
                Add Competitor
              </button>
            )}

            {/* Delete — admin only */}
            {isAdmin && onDeleteContest && (
              !confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,87,87,0.08)',
                    border: '1px solid rgba(255,87,87,0.2)',
                    color: 'var(--color-accent-red)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Trash2 size={14} />
                  Delete Contest
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,87,87,0.15)',
                    border: '1px solid rgba(255,87,87,0.4)',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--color-accent-red)', fontWeight: '600' }}>Are you sure?</span>
                  <button
                    onClick={() => { onDeleteContest(); setConfirmDelete(false); }}
                    style={{ fontSize: '11px', fontWeight: '800', color: 'white', background: 'var(--color-accent-red)', border: 'none', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{ fontSize: '11px', fontWeight: '700', color: 'rgb(156,163,175)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
