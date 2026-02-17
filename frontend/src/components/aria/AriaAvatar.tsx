/**
 * Aria Avatar Component - Realistic visual representation
 * Shows Aria's status, mood, and provides interactive interface
 */
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Activity, Zap, Brain } from 'lucide-react';

interface AriaAvatarProps {
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  mood?: 'neutral' | 'happy' | 'focused' | 'concerned';
  size?: 'small' | 'medium' | 'large';
  customAvatarUrl?: string;
  onVoiceToggle?: () => void;
}

export const AriaAvatar: React.FC<AriaAvatarProps> = ({
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  mood = 'neutral',
  size = 'medium',
  customAvatarUrl,
  onVoiceToggle
}) => {
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    if (isListening || isSpeaking || isThinking) {
      setPulseAnimation(true);
    } else {
      setPulseAnimation(false);
    }
  }, [isListening, isSpeaking, isThinking]);

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-24 h-24',
    large: 'w-48 h-48'
  };

  const getStatusColor = () => {
    if (isListening) return 'ring-red-500';
    if (isThinking) return 'ring-yellow-500';
    if (isSpeaking) return 'ring-blue-500';
    return 'ring-indigo-500';
  };

  const getStatusText = () => {
    if (isListening) return 'Listening...';
    if (isThinking) return 'Thinking...';
    if (isSpeaking) return 'Speaking...';
    return 'Ready';
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Avatar Container */}
      <div className="relative">
        {/* Pulsing Ring */}
        {pulseAnimation && (
          <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full ${getStatusColor()} animate-ping opacity-75`} />
        )}
        
        {/* Main Avatar */}
        <div 
          className={`
            relative ${sizeClasses[size]} rounded-full 
            ring-4 ${getStatusColor()} 
            overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600
            shadow-2xl transition-all duration-300
            ${pulseAnimation ? 'scale-110' : 'scale-100'}
          `}
        >
          {customAvatarUrl ? (
            <img 
              src={customAvatarUrl} 
              alt="Aria" 
              className="w-full h-full object-cover"
            />
          ) : (
            // Default Aria representation
            <div className="w-full h-full flex items-center justify-center">
              <Brain className="w-3/5 h-3/5 text-white opacity-90" />
            </div>
          )}
          
          {/* Status Indicator Overlay */}
          {isThinking && (
            <div className="absolute inset-0 bg-yellow-500 bg-opacity-20 flex items-center justify-center">
              <Activity className="w-8 h-8 text-white animate-pulse" />
            </div>
          )}
          
          {isListening && (
            <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center">
              <Mic className="w-8 h-8 text-white animate-pulse" />
            </div>
          )}
          
          {isSpeaking && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-20">
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-1 bg-white rounded-full animate-sound-wave"
                      style={{
                        height: '40%',
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Activity Indicator */}
        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 shadow-lg">
          <Zap className="w-4 h-4 text-white" />
        </div>
      </div>
      
      {/* Status Text */}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-300">
          AI Orchestrator
        </p>
      </div>
      
      {/* Voice Control Button */}
      {onVoiceToggle && (
        <button
          onClick={onVoiceToggle}
          className={`
            p-3 rounded-full transition-all duration-300
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-indigo-500 hover:bg-indigo-600'}
            text-white shadow-lg hover:shadow-xl
          `}
        >
          {isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
  );
};

// CSS for sound wave animation (add to global styles)
const soundWaveStyles = `
  @keyframes sound-wave {
    0%, 100% { height: 20%; }
    50% { height: 60%; }
  }
  
  .animate-sound-wave {
    animation: sound-wave 0.8s ease-in-out infinite;
  }
`;
