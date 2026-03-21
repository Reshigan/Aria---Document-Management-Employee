import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Send, Bot, Sparkles, FileText, Calculator, Users, ShoppingCart,
  CheckCircle2, XCircle, Clock, Loader2, ChevronRight, SkipForward,
  Workflow, ArrowRightLeft, Banknote, Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanStep {
  step_number: number
  bot_id: string
  bot_name: string
  description: string
  parameters: Record<string, unknown>
  depends_on: number[]
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  result?: Record<string, unknown>
  error?: string
}

interface ExecutionPlan {
  id: string
  user_request: string
  summary: string
  steps: PlanStep[]
  requires_confirmation: boolean
  resolved_entities: Array<{
    type: string
    raw_text: string
    resolved_id: string | null
    resolved_name: string | null
    confidence: number
    ambiguous: boolean
    candidates?: Array<{ id: string; name: string; code?: string }>
  }>
  created_at: string
}

interface AgentChatResponse {
  conversation_id: string
  type: 'plan' | 'execution_result' | 'clarification' | 'confirmation' | 'simple_response'
  reply: string
  plan: ExecutionPlan | null
  step_results: PlanStep[] | null
  needs_confirmation: boolean
  needs_clarification: boolean
  data: Record<string, unknown> | null
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: AgentChatResponse['type']
  plan?: ExecutionPlan | null
  stepResults?: PlanStep[] | null
  needsConfirmation?: boolean
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const quickActions = [
  { label: 'Create Quote', icon: FileText, prompt: 'Create a quote for a customer' },
  { label: 'Order to Cash', icon: ArrowRightLeft, prompt: 'Run the order to cash workflow' },
  { label: 'List Customers', icon: Users, prompt: 'List all active customers' },
  { label: 'Procure to Pay', icon: Package, prompt: 'Run the procure to pay workflow' },
  { label: 'Month-End Close', icon: Calculator, prompt: 'Run month-end close' },
  { label: 'Sales Summary', icon: ShoppingCart, prompt: 'Run sales analytics' },
  { label: 'Run Payroll', icon: Banknote, prompt: 'Process payroll' },
  { label: 'All Workflows', icon: Workflow, prompt: 'What workflows are available?' },
]

// ─── Step Status Icon ─────────────────────────────────────────────────────────

function StepStatusIcon({ status }: { status: PlanStep['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-muted-foreground" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

// ─── Plan Display Component ───────────────────────────────────────────────────

function PlanDisplay({ plan, isResult }: { plan: ExecutionPlan; isResult?: boolean }) {
  const completed = plan.steps.filter(s => s.status === 'completed').length
  const failed = plan.steps.filter(s => s.status === 'failed').length
  const total = plan.steps.length

  return (
    <div className="mt-2 space-y-2">
      {/* Summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Workflow className="h-3.5 w-3.5" />
        <span>{plan.summary}</span>
      </div>

      {/* Progress bar for results */}
      {isResult && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                failed > 0 ? 'bg-red-500' : 'bg-green-500'
              )}
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {completed}/{total}
            {failed > 0 && ` (${failed} failed)`}
          </span>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-1.5">
        {plan.steps.map((step) => (
          <div
            key={step.step_number}
            className={cn(
              'flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs',
              step.status === 'completed' && 'bg-green-500/10',
              step.status === 'failed' && 'bg-red-500/10',
              step.status === 'running' && 'bg-blue-500/10',
              step.status === 'pending' && 'bg-muted/50',
              step.status === 'skipped' && 'bg-muted/30 opacity-60',
            )}
          >
            <StepStatusIcon status={step.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Step {step.step_number}.</span>
                <span>{step.bot_name}</span>
                {step.depends_on.length > 0 && (
                  <span className="text-muted-foreground">
                    <ChevronRight className="h-3 w-3 inline" />
                    after {step.depends_on.join(', ')}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">{step.description}</p>
              {step.status === 'failed' && step.error && (
                <p className="text-red-500 mt-0.5">Error: {step.error}</p>
              )}
              {step.status === 'completed' && step.result && 'message' in step.result && (
                <p className="text-green-600 mt-0.5 truncate">
                  {String(step.result.message).substring(0, 150)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Resolved Entities */}
      {plan.resolved_entities.length > 0 && (
        <div className="pt-1 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">Resolved Entities</p>
          {plan.resolved_entities.map((entity, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              {entity.resolved_id ? (
                <span>
                  {entity.type}: &quot;{entity.raw_text}&quot; &rarr; {entity.resolved_name}
                </span>
              ) : entity.ambiguous ? (
                <span className="text-amber-500">
                  {entity.type}: &quot;{entity.raw_text}&quot; &mdash; multiple matches found
                </span>
              ) : (
                <span className="text-muted-foreground/60">
                  {entity.type}: &quot;{entity.raw_text}&quot; &mdash; not found
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AskAria() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm ARIA, your AI ERP assistant. I can run multi-step workflows like Order-to-Cash, Procure-to-Pay, and Month-End Close. I can also execute individual bots or answer questions about your data.\n\nWhat would you like to do?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
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
      const response = await api.post<AgentChatResponse>('/ask-aria/chat', {
        message: content,
        conversation_id: conversationId,
      })

      // Save conversation ID for multi-turn
      if (response.conversation_id) {
        setConversationId(response.conversation_id)
      }

      // Track whether we need confirmation
      setAwaitingConfirmation(response.needs_confirmation || false)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply || "I've processed your request.",
        timestamp: new Date(),
        type: response.type,
        plan: response.plan,
        stepResults: response.step_results,
        needsConfirmation: response.needs_confirmation,
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

  const handleConfirm = () => sendMessage('yes')
  const handleCancel = () => sendMessage('no')

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-gold-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Ask ARIA</h1>
          <p className="text-xs text-muted-foreground">Multi-step AI agent &middot; 68 bots</p>
        </div>
        <Badge variant="gold" className="ml-auto gap-1">
          <Sparkles className="h-3 w-3" /> Online
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    'text-xs',
                    msg.role === 'assistant'
                      ? 'bg-gold text-gold-foreground'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {msg.role === 'assistant' ? 'A' : 'U'}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'rounded-lg px-4 py-2.5 max-w-[85%] text-sm',
                  msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                )}
              >
                {/* Text content - render markdown-like bold */}
                <div className="whitespace-pre-wrap">
                  {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**') ? (
                      <strong key={i}>{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>

                {/* Execution Plan / Results */}
                {msg.plan && (
                  <PlanDisplay
                    plan={msg.plan}
                    isResult={msg.type === 'execution_result'}
                  />
                )}

                {/* Confirmation Buttons */}
                {msg.needsConfirmation && awaitingConfirmation && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleConfirm}
                      disabled={isLoading}
                      className="gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Execute
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <p
                  className={cn(
                    'text-[10px] mt-1',
                    msg.role === 'assistant'
                      ? 'text-muted-foreground'
                      : 'text-primary-foreground/60'
                  )}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gold text-gold-foreground text-xs">A</AvatarFallback>
              </Avatar>
              <div className="rounded-lg px-4 py-3 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  <span className="text-xs text-muted-foreground">ARIA is thinking...</span>
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
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => sendMessage(action.prompt)}
              >
                <Icon className="h-3.5 w-3.5" /> {action.label}
              </Button>
            )
          })}
        </div>
      )}

      {/* Input */}
      <div className="border-t pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              awaitingConfirmation
                ? 'Type "yes" to execute or "no" to cancel...'
                : 'Ask ARIA anything... (e.g. "create a quote", "run order to cash")'
            }
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
