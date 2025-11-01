'use client';

import { PresentationFeedback } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface FeedbackChartProps {
  feedback: PresentationFeedback;
}

export default function FeedbackChart({ feedback }: FeedbackChartProps) {
  const data = [
    { name: 'Engaging', score: feedback.engaging },
    { name: 'Clear', score: feedback.clear },
    { name: 'Demos', score: feedback.usefulDemos },
    { name: 'Right Level', score: feedback.rightLevel },
    { name: 'Learned', score: feedback.learnedSomething },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Presentation Feedback (1-5)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 5]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="score" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-5 gap-2 text-center text-sm">
        {data.map((item) => (
          <div key={item.name}>
            <div className="font-semibold text-blue-600 text-lg">
              {item.score.toFixed(1)}
            </div>
            <div className="text-gray-600 text-xs">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
