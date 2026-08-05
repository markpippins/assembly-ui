import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTTS } from '../context/TTSContext';

interface TTSButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export const TTSButton: React.FC<TTSButtonProps> = ({ text, label = 'Read Aloud', className = '' }) => {
  const { isPlaying, activeText, speak, stop } = useTTS();
  const currentIsThis = isPlaying && activeText === text;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (currentIsThis) {
          stop();
        } else {
          speak(text);
        }
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
        currentIsThis
          ? 'bg-indigo-600 text-white border-indigo-500 animate-pulse'
          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
      } ${className}`}
      title={currentIsThis ? 'Stop Reading' : label}
    >
      {currentIsThis ? <VolumeX className="w-3.5 h-3.5 text-rose-300" /> : <Volume2 className="w-3.5 h-3.5" />}
      <span>{currentIsThis ? 'Stop' : label}</span>
    </button>
  );
};
