'use client';

import { useEffect, useRef } from 'react';

interface WordCloudProps {
  words: Array<{ text: string; value: number }>;
}

export default function WordCloud({ words }: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || words.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxValue = Math.max(...words.map((w) => w.value));

    // Colors
    const colors = [
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#f59e0b',
      '#10b981',
      '#6366f1',
    ];

    // Simple word cloud layout
    const positions: Array<{ x: number; y: number; word: string; size: number }> = [];
    
    words.slice(0, 30).forEach((word, index) => {
      const fontSize = 12 + (word.value / maxValue) * 36;
      ctx.font = `bold ${fontSize}px sans-serif`;
      
      // Calculate text width
      const textWidth = ctx.measureText(word.text).width;
      
      // Try to find a non-overlapping position
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 50) {
        const x = Math.random() * (width - textWidth - 20) + 10;
        const y = Math.random() * (height - fontSize - 20) + fontSize + 10;
        
        // Check overlap with existing words
        const overlaps = positions.some((pos) => {
          return (
            Math.abs(pos.x - x) < (textWidth + pos.size) / 2 &&
            Math.abs(pos.y - y) < (fontSize + pos.size) / 2
          );
        });
        
        if (!overlaps) {
          positions.push({ x, y, word: word.text, size: textWidth });
          
          // Draw word
          ctx.fillStyle = colors[index % colors.length];
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillText(word.text, x, y);
          
          placed = true;
        }
        
        attempts++;
      }
    });
  }, [words]);

  if (words.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Feedback Word Cloud
        </h3>
        <div className="text-center py-12 text-gray-500">
          No feedback words yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Feedback Word Cloud
      </h3>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full h-auto border border-gray-200 rounded-lg"
      />
      <div className="mt-4 text-sm text-gray-600">
        Top words from &quot;Best Part&quot;, &quot;Improvements&quot;, and &quot;Future Topics&quot;
      </div>
    </div>
  );
}
