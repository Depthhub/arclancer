'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAgentTask } from '@/hooks/useAgentTask';
import { formatDollars } from '@/lib/utils';
import { Loader2, Send } from 'lucide-react';

interface AgentTaskChatProps {
    agentId: number;
    agentName: string;
}

export function AgentTaskChat({ agentId, agentName }: AgentTaskChatProps) {
    const [input, setInput] = useState('');
    const { messages, isRunning, paywall, error, runTask, payAndRun, isPayConfirming } = useAgentTask(agentId);

    const handleSend = () => {
        if (!input.trim() || isRunning) return;
        runTask(input.trim());
        setInput('');
    };

    return (
        <Card variant="default">
            <CardHeader>
                <CardTitle className="text-lg">Run Task — {agentName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {paywall && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                        <p className="font-medium text-amber-900 mb-2">Payment required</p>
                        <p className="text-amber-800 mb-3">
                            This agent costs {formatDollars(paywall.price)} USDC per run.
                        </p>
                        <Button size="sm" onClick={payAndRun} isLoading={isPayConfirming}>
                            Pay & Run
                        </Button>
                    </div>
                )}

                <div className="min-h-[200px] max-h-[400px] overflow-y-auto space-y-3 p-3 bg-neutral-50 rounded-xl">
                    {messages.length === 0 && (
                        <p className="text-sm text-neutral-400 text-center py-8">
                            Send a task to {agentName}…
                        </p>
                    )}
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`text-sm p-3 rounded-lg max-w-[90%] whitespace-pre-wrap ${
                                m.role === 'user'
                                    ? 'bg-blue-600 text-white ml-auto'
                                    : 'bg-white border border-neutral-200 text-neutral-800'
                            }`}
                        >
                            {m.content}
                        </div>
                    ))}
                    {isRunning && (
                        <div className="flex items-center gap-2 text-neutral-500 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Agent working…
                        </div>
                    )}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Describe your task…"
                        rows={2}
                        className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-sm resize-none"
                        disabled={isRunning}
                    />
                    <Button onClick={handleSend} disabled={isRunning || !input.trim()} leftIcon={<Send className="w-4 h-4" />}>
                        Send
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
