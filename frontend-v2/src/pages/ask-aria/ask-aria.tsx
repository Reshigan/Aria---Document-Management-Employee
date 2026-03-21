import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Paperclip, Sparkles, FileText, Calculator, Users, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const quickActions = [
  { label: 'Create Invoice', icon: FileText, prompt: 'Create a new customer invoice' },
  { label: 'Check AR Aging', icon: Calculator, prompt: 'Show me the AR aging report' },
  { label: 'List Customers', icon: Users, prompt: 'List all active customers' },
  { label: 'Sales Summary', icon: ShoppingCart, prompt: 'Give me a sales summary for this month' },
]

export default function AskAria() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm ARIA, your AI ERP assistant. I can help you with invoicing, reports, inventory checks, and more. What would you like to do?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.post<{ reply: string }>('/ask-aria/message/stream', {
        message: content,
      })
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply || "I've processed your request. Is there anything else I can help with?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-gold-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Ask ARIA</h1>
          <p className="text-xs text-muted-foreground">AI-powered ERP assistant</p>
        </div>
        <Badge variant="gold" className="ml-auto gap-1"><Sparkles className="h-3 w-3" /> Online</Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={cn('text-xs', msg.role === 'assistant' ? 'bg-gold text-gold-foreground' : 'bg-primary text-primary-foreground')}>
                  {msg.role === 'assistant' ? 'A' : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                'rounded-lg px-4 py-2.5 max-w-[80%] text-sm',
                msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={cn(
                  'text-[10px] mt-1',
                  msg.role === 'assistant' ? 'text-muted-foreground' : 'text-primary-foreground/60'
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8"><AvatarFallback className="bg-gold text-gold-foreground text-xs">A</AvatarFallback></Avatar>
              <div className="rounded-lg px-4 py-3 bg-muted">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 py-3 max-w-3xl mx-auto w-full">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button key={action.label} variant="outline" size="sm" className="gap-1.5" onClick={() => sendMessage(action.prompt)}>
                <Icon className="h-3.5 w-3.5" /> {action.label}
              </Button>
            )
          })}
        </div>
      )}

      {/* Input */}
      <div className="border-t pt-4">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex gap-2 max-w-3xl mx-auto">
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask ARIA anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
