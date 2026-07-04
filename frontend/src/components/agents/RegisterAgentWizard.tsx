'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AgentMetaForm } from './AgentMetaForm';
import { useRegisterAgent } from '@/hooks/useRegisterAgent';
import { Bot, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export function RegisterAgentWizard() {
    const { isConnected } = useAccount();
    const { register, step, error, agentId } = useRegisterAgent();

    const [stepNum, setStepNum] = useState(1);
    const [name, setName] = useState('');
    const [skill, setSkill] = useState('');
    const [toolName, setToolName] = useState('');
    const [taskFee, setTaskFee] = useState('');
    const [description, setDescription] = useState('');
    const [skills, setSkills] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');

    if (!isConnected) {
        return (
            <Card className="max-w-lg mx-auto text-center">
                <CardContent className="py-10">
                    <Bot className="w-12 h-12 text-violet-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Connect Wallet</h2>
                    <p className="text-neutral-500 mb-6">Connect to register an AI agent on Arc.</p>
                    <ConnectButton />
                </CardContent>
            </Card>
        );
    }

    if (step === 'success' && agentId) {
        return (
            <Card className="max-w-lg mx-auto text-center">
                <CardContent className="py-10">
                    <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Agent Created</h2>
                    <p className="text-neutral-500 mb-6">Agent #{agentId} is live on the marketplace.</p>
                    <div className="flex gap-3 justify-center">
                        <Link href={`/agents/${agentId}`}>
                            <Button>View Agent</Button>
                        </Link>
                        <Link href="/dashboard/agents">
                            <Button variant="outline">My Agents</Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const handleSubmit = async () => {
        await register({
            name,
            skill,
            toolName: toolName || 'None',
            taskFeeUsdc: parseFloat(taskFee) || 0,
            systemPrompt,
            description,
            skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        });
    };

    const isBusy = step === 'registering' || step === 'saving_meta';

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-violet-600" />
                    Create AI Agent
                </CardTitle>
                <p className="text-sm text-neutral-500">Step {stepNum} of 2</p>
            </CardHeader>
            <CardContent className="space-y-6">
                {stepNum === 1 && (
                    <>
                        <Input label="Agent name" value={name} onChange={(e) => setName(e.target.value)} placeholder="AuditBot" />
                        <Input label="Primary skill" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Smart contract audit" />
                        <Input label="Tool name (optional)" value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="Slither, Foundry, None" />
                        <Input label="Task fee (USDC)" type="number" min="0" step="0.01" value={taskFee} onChange={(e) => setTaskFee(e.target.value)} placeholder="5.00" />
                        <div className="flex justify-end">
                            <Button onClick={() => setStepNum(2)} disabled={!name || !skill}>Next</Button>
                        </div>
                    </>
                )}
                {stepNum === 2 && (
                    <>
                        <AgentMetaForm
                            systemPrompt={systemPrompt}
                            description={description}
                            skills={skills}
                            onSystemPromptChange={setSystemPrompt}
                            onDescriptionChange={setDescription}
                            onSkillsChange={setSkills}
                            disabled={isBusy}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStepNum(1)} disabled={isBusy}>Back</Button>
                            <Button onClick={handleSubmit} disabled={isBusy || !systemPrompt} isLoading={isBusy}>
                                {isBusy ? 'Registering on-chain…' : 'Create Agent'}
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
