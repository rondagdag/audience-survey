'use client';

interface NpsStripProps {
  npsDistribution: number[];
  averageScore: number;
}

export default function NpsStrip({ npsDistribution, averageScore }: NpsStripProps) {
  const total = npsDistribution.reduce((sum, count) => sum + count, 0);
  
  // Calculate NPS categories
  const promoters = npsDistribution.slice(9, 11).reduce((sum, count) => sum + count, 0);
  const passives = npsDistribution.slice(7, 9).reduce((sum, count) => sum + count, 0);
  const detractors = npsDistribution.slice(0, 7).reduce((sum, count) => sum + count, 0);
  
  const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Recommendation Score (NPS)
      </h3>
      
      <div className="text-center mb-4">
        <div className="text-5xl font-bold text-blue-600 mb-1">
          {averageScore.toFixed(1)}
        </div>
        <div className="text-gray-600">Average Score (0-10)</div>
        <div className="text-2xl font-semibold text-green-600 mt-2">
          NPS: {npsScore}
        </div>
      </div>

      <div className="space-y-2">
        {npsDistribution.map((count, score) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          // Color coding: 0-6 (red), 7-8 (yellow), 9-10 (green)
          let barColor = 'bg-red-500';
          if (score >= 9) barColor = 'bg-green-500';
          else if (score >= 7) barColor = 'bg-yellow-500';

          return (
            <div key={score} className="flex items-center gap-3">
              <div className="w-8 text-right font-semibold text-gray-700">
                {score}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className={`${barColor} h-full rounded-full transition-all duration-500 flex items-center justify-end px-2`}
                  style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                >
                  {count > 0 && (
                    <span className="text-white text-xs font-semibold">
                      {count}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-12 text-sm text-gray-600">
                {percentage.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="text-red-600 font-bold text-lg">{detractors}</div>
          <div className="text-gray-600">Detractors (0-6)</div>
        </div>
        <div>
          <div className="text-yellow-600 font-bold text-lg">{passives}</div>
          <div className="text-gray-600">Passives (7-8)</div>
        </div>
        <div>
          <div className="text-green-600 font-bold text-lg">{promoters}</div>
          <div className="text-gray-600">Promoters (9-10)</div>
        </div>
      </div>
    </div>
  );
}
