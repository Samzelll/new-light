"use client";

import React from 'react';
import { Check, Trophy, Swords, Users, Clock, Flame, ChevronRight } from 'lucide-react';

export interface Stage {
  id: string;
  stage_number: number;
  title: string | null;
  status: 'pending' | 'active' | 'completed';
  start_time: string | null;
  end_time: string | null;
}

export interface StageTimelineProps {
  stages: Stage[];
  currentStageNumber: number;
}

export function StageTimeline({ stages, currentStageNumber }: StageTimelineProps) {
  // If empty, generate standard tournament progression stages
  const effectiveStages: Stage[] = stages.length > 0 ? [...stages].sort((a, b) => a.stage_number - b.stage_number) : [
    {
      id: 'stg-1',
      stage_number: 1,
      title: 'Registration & Verification',
      status: currentStageNumber > 1 ? 'completed' : currentStageNumber === 1 ? 'active' : 'pending',
      start_time: null,
      end_time: null,
    },
    {
      id: 'stg-2',
      stage_number: 2,
      title: 'Group Stage (Groups of 4)',
      status: currentStageNumber > 2 ? 'completed' : currentStageNumber === 2 ? 'active' : 'pending',
      start_time: null,
      end_time: null,
    },
    {
      id: 'stg-3',
      stage_number: 3,
      title: 'Playoff Semi-Finals',
      status: currentStageNumber > 3 ? 'completed' : currentStageNumber === 3 ? 'active' : 'pending',
      start_time: null,
      end_time: null,
    },
    {
      id: 'stg-4',
      stage_number: 4,
      title: 'Grand Final Showcase',
      status: currentStageNumber === 4 ? 'active' : 'pending',
      start_time: null,
      end_time: null,
    },
  ];

  const getStageIcon = (stageNum: number, isFinal: boolean) => {
    if (isFinal || stageNum >= 4) return <Trophy size={14} className="text-accent" />;
    if (stageNum === 3) return <Swords size={14} className="text-accent" />;
    if (stageNum === 2) return <Users size={14} className="text-side-b" />;
    return <Clock size={14} className="text-faint" />;
  };

  const getCutoffBadge = (stageNum: number, isFinal: boolean) => {
    if (isFinal || stageNum >= 4) return '1 Winner Takes All';
    if (stageNum === 3) return 'Top 2 to Grand Final';
    if (stageNum === 2) return 'Top 2 Advance per Group';
    return 'Open Submissions';
  };

  return (
    <div className="w-full space-y-3.5 font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-ink tracking-tight flex items-center gap-2 font-display">
          <span>Tournament Roadmap</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent-soft border border-accent/30">
            Stages
          </span>
        </h3>
        <span className="text-[11px] font-medium text-muted">
          Stage {currentStageNumber} of {effectiveStages.length}
        </span>
      </div>

      <div className="relative border-l-2 border-line ml-3.5 pl-5 space-y-4">
        {effectiveStages.map((stage, idx) => {
          const isFinal = idx === effectiveStages.length - 1;
          const isActive = stage.stage_number === currentStageNumber || stage.status === 'active';
          const isCompleted = stage.status === 'completed' || stage.stage_number < currentStageNumber;
          const isPending = !isActive && !isCompleted;

          return (
            <div key={stage.id} className="relative group">
              {/* Node Indicator on Timeline */}
              <div
                className={`absolute -left-[29px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300 ${
                  isActive
                    ? 'bg-accent-solid border-line-strong ring-4 ring-accent/30 shadow-[0_0_12px_rgba(196,165,116,0.5)]'
                    : isCompleted
                    ? 'bg-accent border-accent text-on-accent'
                    : 'bg-surface-2 border-line text-faint'
                }`}
              >
                {isCompleted ? (
                  <Check size={11} strokeWidth={3.5} className="text-on-accent" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                )}
              </div>

              {/* Stage Card Box */}
              <div
                className={`rounded-2xl p-3.5 transition-all border ${
                  isActive
                    ? 'bg-surface border-accent/50 shadow-[0_4px_20px_-4px_rgba(196,165,116,0.2)]'
                    : isCompleted
                    ? 'bg-surface border-line opacity-85'
                    : 'bg-surface-2 border-line opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {getStageIcon(stage.stage_number, isFinal)}
                      <h4
                        className={`text-xs font-bold tracking-tight font-display ${
                          isActive ? 'text-ink' : isCompleted ? 'text-ink/90' : 'text-faint'
                        }`}
                      >
                        {stage.title || `Stage ${stage.stage_number}`}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {/* Status Pill */}
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-accent-solid text-white shadow-xs'
                            : isCompleted
                            ? 'bg-accent/15 text-accent-soft border border-accent/30'
                            : 'bg-surface-2 text-faint border border-line'
                        }`}
                      >
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                        {isActive ? 'Live Voting' : isCompleted ? 'Finished' : 'Upcoming'}
                      </span>

                      {/* Tournament Rule Cutoff */}
                      <span className="text-[10px] text-muted font-medium">
                        • {getCutoffBadge(stage.stage_number, isFinal)}
                      </span>
                    </div>
                  </div>

                  {stage.end_time && (
                    <span className="text-[10px] text-muted font-semibold tabular-nums shrink-0">
                      {isCompleted ? 'Ended ' : 'Ends '}
                      {new Date(stage.end_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StageTimeline;
