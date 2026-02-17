/**
 * Aria Voice Interface - Voice interaction component
 * Speech-to-text input and text-to-speech output
 */
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Volume2, VolumeX } from 'lucide-react';
import { AriaAvatar } from './AriaAvatar';

interface Message {
  role: 'user' | 'aria';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export const AriaVoiceInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize speech recognition (browser-based)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendVoiceMessage(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Create form data with audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      // Send to Aria voice endpoint
      const response = await fetch('/api/aria/voice/interact', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      // Add user message (transcribed)
      setMessages(prev => [...prev, {
        role: 'user',
        content: data.transcript,
        timestamp: new Date()
      }]);
      
      // Add Aria's response
      setMessages(prev => [...prev, {
        role: 'aria',
        content: data.text_response,
        timestamp: new Date(),
        audioUrl: data.audio_url
      }]);
      
      // Play Aria's voice response if not muted
      if (!isMuted && data.audio_url) {
        playAudio(data.audio_url);
      }
      
    } catch (error) {
      console.error('Voice message failed:', error);
      alert('Failed to process voice message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendTextMessage = async () => {
    if (!textInput.trim()) return;
    
    const userMessage = textInput;
    setTextInput('');
    setIsProcessing(true);
    
    // Add user message immediately
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);
    
    try {
      // Send to Aria chat endpoint
      const response = await fetch('/api/aria/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: userMessage,
          mode: 'text'
        })
      });
      
      const data = await response.json();
      
      // Add Aria's response
      setMessages(prev => [...prev, {
        role: 'aria',
        content: data.text_response,
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Text message failed:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsSpeaking(true);
      
      audioRef.current.onended = () => {
        setIsSpeaking(false);
      };
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Aria Avatar */}
      <div className="bg-white dark:bg-gray-800 shadow-lg p-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <AriaAvatar 
            size="medium"
            isListening={isRecording}
            isThinking={isProcessing}
            isSpeaking={isSpeaking}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Aria
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Your AI Process Orchestrator
            </p>
          </div>
        </div>
        
        {/* Audio Controls */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-300 text-lg">
              👋 Hello! I'm Aria. How can I help you today?
            </p>
            <p className="text-sm text-gray-300 dark:text-gray-500 mt-2">
              You can type or use voice to communicate with me
            </p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-2xl p-4 rounded-2xl shadow-md
                ${message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white'}
              `}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-300'}`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
              
              {/* Play audio button if available */}
              {message.audioUrl && (
                <button
                  onClick={() => playAudio(message.audioUrl!)}
                  className="mt-2 flex items-center space-x-1 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Play Audio</span>
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 shadow-lg p-4">
        <div className="flex items-center space-x-3">
          {/* Voice Button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing}
            className={`
              p-4 rounded-full transition-all duration-300
              ${isRecording
                ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700'}
              text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <Mic className="w-6 h-6" />
          </button>
          
          {/* Text Input */}
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isRecording ? 'Listening...' : 'Type a message or hold the mic button...'}
            disabled={isRecording || isProcessing}
            className="
              flex-1 px-4 py-3 rounded-full
              bg-gray-100 dark:bg-gray-700
              text-gray-800 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
          
          {/* Send Button */}
          <button
            onClick={sendTextMessage}
            disabled={!textInput.trim() || isProcessing}
            className="
              p-4 rounded-full bg-indigo-600 hover:bg-indigo-700
              text-white shadow-lg transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-xs text-center text-gray-500 dark:text-gray-300 mt-2">
          {isRecording 
            ? '🎙️ Recording... Release to send' 
            : 'Press and hold to record, or type your message'}
        </p>
      </div>
      
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};
