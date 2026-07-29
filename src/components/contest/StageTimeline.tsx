"use client";

import { Check } from 'lucide-react';

interface Stage {
  id: string;
  stage_number: number;
  title: string | null;
  status: 'pending' | 'active' | 'completed';
  start_time: string | null;
  end_time: string | null;
}

interface StageTimelineProps {
  stages: Stage[];
  currentStageNumber: number;
}

export function StageTimeline({ stages, currentStageNumber }: StageTimelineProps) {
  // Sort stages by stage_number
  const sortedStages = [...stages].sort((a, b) => a.stage_number - b.stage_number);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-2">Timeline</h3>
      <div className="relative border-l border-surface-600 ml-3 pl-6 space-y-6">
        {sortedStages.map((stage) => {
          const isActive = stage.stage_number === currentStageNumber && stage.status === 'active';
          const isCompleted = stage.status === 'completed';
          const isPending = stage.status === 'pending';

          return (
            <div key={stage.id} className="relative">
              {/* Dot */}
              <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border ${
                isActive ? 'bg-brand-500 border-brand-400 ring-4 ring-brand-500/20' :
                isCompleted ? 'bg-accent-green border-accent-green' : 'bg-surface-800 border-surface-600'
              }`}>
                {isCompleted && (
                  <Check className="h-3 w-3 text-surface-900" strokeWidth={3} />
                )}
              </span>

              {/* Title & Status */}
              <div>
                <h4 className={`text-sm font-bold ${
                  isActive ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {stage.title || `Stage ${stage.stage_number}`}
                </h4>
                
                <span className={`inline-block text-[9px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded mt-1 ${
                  isActive ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' :
                  isCompleted ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' :
                  'bg-surface-800 text-gray-500 border border-surface-700'
                }`}>
                  {stage.status}
                </span>

                {stage.end_time && (
                  <span className="block text-[10px] text-gray-500 mt-1">
                    {isCompleted ? 'Ended ' : 'Ends '} {new Date(stage.end_time).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
