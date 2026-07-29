"use client";

import { formatPercentage } from '@/utils/formatters';
import { getPublicUrl } from '@/services/storageService';

interface Profile {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface ParticipantResult {
  participant_id: string;
  vote_percentage: number;
  rank_in_group: number;
  passed: boolean;
  participants?: {
    submission_data: {
      photos?: string[];
      description?: string;
    };
    profiles?: Profile | null;
  } | null;
}

interface ResultsViewProps {
  results: ParticipantResult[];
}

export function ResultsView({ results }: ResultsViewProps) {
  // Sort results by percentage desc
  const sortedResults = [...results].sort((a, b) => b.vote_percentage - a.vote_percentage);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-2">Group Results</h3>
      <p className="text-gray-400 text-sm">
        Stage completed. Percentages reflect final weighted votes in this group.
      </p>

      <div className="space-y-4">
        {sortedResults.map((result) => {
          const displayName = result.participants?.profiles?.display_name || result.participants?.profiles?.username || 'Anonymous';
          const avatarPath = result.participants?.profiles?.avatar_url;
          const avatarUrl = avatarPath ? getPublicUrl('avatars', avatarPath, { width: 80, quality: 80 }) : null;
          
          return (
            <div key={result.participant_id} className="card bg-surface-800 border-surface-700 flex flex-col p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={displayName} 
                      className="w-10 h-10 rounded-full object-cover border border-surface-600" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-600 flex items-center justify-center font-bold text-white text-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-white text-sm">{displayName}</h4>
                    {result.passed && (
                      <span className="badge badge-green text-[9px] uppercase tracking-wider py-0.5 px-1.5 mt-0.5 inline-block">
                        Advanced
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-extrabold text-white">
                    {formatPercentage(result.vote_percentage)}
                  </span>
                  <span className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                    Rank #{result.rank_in_group}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-bar w-full">
                <div 
                  className={`progress-bar-fill ${result.passed ? 'bg-accent-green' : 'bg-brand-500'}`}
                  style={{ width: `${result.vote_percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
