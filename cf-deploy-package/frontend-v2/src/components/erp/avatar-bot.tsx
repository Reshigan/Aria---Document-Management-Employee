'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Bot, Sparkles, MessageCircle, X, RotateCcw, Volume2, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
}

interface BotState {
  isActive: boolean
  isThinking: boolean
  isConnected: boolean
  personality: 'professional' | 'friendly' | 'technical' | 'creative'
  mood: 'neutral' | 'happy' | 'concerned' | 'excited'
}

interface AvatarContextType {
  messages: Message[]
  botState: BotState
  sendMessage: (content: string) => Promise<void>
  clearConversation: () => void
  toggleBot: () => void
  setPersonality: (personality: BotState['personality']) => void
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined)

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('avatar_messages')
      return saved ? JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : []
    }
    return []
  })
  
  const [botState, setBotState] = useState<BotState>({
    isActive: false,
    isThinking: false,
    isConnected: true,
    personality: 'professional',
    mood: 'neutral'
  })
  
  const messageIdRef = useRef(0)

  // Save messages to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('avatar_messages', JSON.stringify(messages))
    }
  }, [messages])

  // Auto-connect check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple connectivity check
        await fetch('/api/health', { method: 'HEAD' })
        setBotState(prev => ({ ...prev, isConnected: true }))
      } catch {
        setBotState(prev => ({ ...prev, isConnected: false }))
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  const addMessage = useCallback((role: Message['role'], content: string, status?: Message['status']) => {
    const message: Message = {
      id: `msg-${Date.now()}-${messageIdRef.current++}`,
      role,
      content,
      timestamp: new Date(),
      status
    }
    setMessages(prev => [...prev, message])
    return message
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !botState.isConnected) return

    // Add user message
    const userMessage = addMessage('user', content, 'sent')
    
    // Update thinking state
    setBotState(prev => ({ ...prev, isThinking: true, mood: 'concerned' }))
    
    try {
      // Try to send to actual bot API
      const response = await api.post<{ message: string }>('/bot/chat', {
        message: content,
        context: {
          previousMessages: messages.slice(-3).map(m => ({ role: m.role, content: m.content }))
        }
      })
      
      // Add bot response
      addMessage('assistant', response.message)
      setBotState(prev => ({ ...prev, isThinking: false, mood: 'neutral' }))
      
    } catch (error) {
      // Graceful fallback handling
      console.error('Bot error:', error)
      
      // Provide helpful contextual assistance instead of generic errors
      const errorMessage = `
        I encountered an issue with our intelligent processing system, but I'm here to help!
        
        What I can assist you with directly:
        • Navigating to specific ERP sections
        • Explaining business processes
        • Providing guidance on common workflows
        • Troubleshooting basic user issues
        
        Would you like me to:
        1. Guide you through a specific workflow?
        2. Connect you with human support?
        3. Show you relevant documentation?
        
        How can I help you accomplish your goal?`
      
      addMessage('assistant', errorMessage)
      setBotState(prev => ({ ...prev, isThinking: false, mood: 'concerned' }))
    }
  }, [messages, botState.isConnected, addMessage])

  const clearConversation = useCallback(() => {
    setMessages([])
    localStorage.removeItem('avatar_messages')
  }, [])

  const toggleBot = useCallback(() => {
    setBotState(prev => ({ 
      ...prev, 
      isActive: !prev.isActive,
      mood: prev.isActive ? 'neutral' : 'happy'
    }))
  }, [])

  const setPersonality = useCallback((personality: BotState['personality']) => {
    setBotState(prev => ({ ...prev, personality, mood: 'excited' }))
  }, [])

  return (
    <AvatarContext.Provider value={{
      messages,
      botState,
      sendMessage,
      clearConversation,
      toggleBot,
      setPersonality
    }}>
      {children}
      <AvatarInterface />
    </AvatarContext.Provider>
  )
}

function AvatarInterface() {
  const context = useContext(AvatarContext)
  if (!context) return null
  
  const { messages, botState, sendMessage, clearConversation, setPersonality } = context
  const [inputValue, setInputValue] = useState('')
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when bot opens
  useEffect(() => {
    if (botState.isActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [botState.isActive])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      sendMessage(inputValue)
      setInputValue('')
    }
  }

  const handleVoiceInput = () => {
    setIsListening(!isListening)
    // In a real implementation, this would connect to speech recognition API
    if (!isListening) {
      // Simulate voice input for demo
      setTimeout(() => {
        setInputValue("Can you help me understand the inventory management workflow?")
        setIsListening(false)
      }, 2000)
    }
  }

  const getAvatarMood = () => {
    switch (botState.mood) {
      case 'happy': return '😊'
      case 'concerned': return '🤔'
      case 'excited': return '🤩'
      default: return '🤖'
    }
  }

  const getPersonalityColor = () => {
    switch (botState.personality) {
      case 'professional': return 'bg-blue-500'
      case 'friendly': return 'bg-green-500'
      case 'technical': return 'bg-purple-500'
      case 'creative': return 'bg-pink-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <AnimatePresence>
      {botState.isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 w-full max-w-md"
        >
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`relative w-10 h-10 rounded-full ${getPersonalityColor()} flex items-center justify-center text-white`}>
                  <span className="text-lg">{getAvatarMood()}</span>
                  {botState.isThinking && (
                    <motion.div 
                      className="absolute inset-0 rounded-full bg-white/30"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">ARIA Assistant</h3>
                  <p className="text-xs text-muted-foreground">
                    {botState.isConnected ? 'Online & ready to help' : 'Limited connectivity'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPersonality('professional')}
                  className="h-8 w-8"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearConversation}
                  className="h-8 w-8"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => context?.toggleBot()}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-64 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Hello! I'm your ARIA Assistant. How can I help you today?
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {[
                        "Explain journal entries",
                        "Show customer reports",
                        "Guide inventory process",
                        "Help with payroll"
                      ].map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 text-xs"
                          onClick={() => setInputValue(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                {botState.isThinking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '600ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask me anything about ERP..."
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleVoiceInput}
                    className={cn(
                      "absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6",
                      isListening && "animate-pulse text-red-500"
                    )}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
                <Button type="submit" size="icon" disabled={!inputValue.trim()}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
              {!botState.isConnected && (
                <p className="text-xs text-destructive mt-2">
                  Limited connectivity - I can still help with guidance and navigation!
                </p>
              )}
            </form>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function useAvatar() {
  const context = useContext(AvatarContext)
  if (context === undefined) {
    throw new Error('useAvatar must be used within an AvatarProvider')
  }
  return context
}

// Floating bot activation button
export function AvatarFloatingButton() {
  const { botState, toggleBot } = useAvatar()
  
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleBot}
      className={cn(
        'fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all',
        botState.isConnected 
          ? 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
          : 'bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
      )}
    >
      <motion.div
        animate={{ rotate: botState.isThinking ? 360 : 0 }}
        transition={{ duration: 1, repeat: botState.isThinking ? Infinity : 0 }}
      >
        <Bot className="h-6 w-6" />
      </motion.div>
      {botState.isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background"
        />
      )}
    </motion.button>
  )
}