'use client';

import { Input } from '@/components/ui/Input';
import type { AgentExecutionMode } from '@/lib/agents/types';

interface AgentMetaFormProps {
    skillUri: string;
    contentHash: string;
    executionMode: AgentExecutionMode;
    mcpEndpoint: string;
    description: string;
    skills: string;
    onSkillUriChange: (v: string) => void;
    onContentHashChange: (v: string) => void;
    onExecutionModeChange: (v: AgentExecutionMode) => void;
    onMcpEndpointChange: (v: string) => void;
    onDescriptionChange: (v: string) => void;
    onSkillsChange: (v: string) => void;
    disabled?: boolean;
}

export function AgentMetaForm({
    skillUri,
    contentHash,
    executionMode,
    mcpEndpoint,
    description,
    skills,
    onSkillUriChange,
    onContentHashChange,
    onExecutionModeChange,
    onMcpEndpointChange,
    onDescriptionChange,
    onSkillsChange,
    disabled,
}: AgentMetaFormProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Description (public)
                </label>
                <Input
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="What does this agent do?"
                    disabled={disabled}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Skills (comma-separated)
                </label>
                <Input
                    value={skills}
                    onChange={(e) => onSkillsChange(e.target.value)}
                    placeholder="audit, solidity, research"
                    disabled={disabled}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Skill URI
                </label>
                <Input
                    value={skillUri}
                    onChange={(e) => onSkillUriChange(e.target.value)}
                    placeholder="ipfs://… or https://creator.example/agent.json"
                    disabled={disabled}
                />
            </div>
            <Input
                label="Content hash (optional)"
                value={contentHash}
                onChange={(e) => onContentHashChange(e.target.value)}
                placeholder="sha256:…"
                disabled={disabled}
            />
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Execution mode</label>
                <select
                    value={executionMode}
                    onChange={(e) => onExecutionModeChange(e.target.value as AgentExecutionMode)}
                    disabled={disabled}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm"
                >
                    <option value="inbox">Creator inbox</option>
                    <option value="creator_mcp">Creator-hosted MCP</option>
                </select>
            </div>
            {executionMode === 'creator_mcp' && (
                <Input
                    label="Creator MCP endpoint"
                    value={mcpEndpoint}
                    onChange={(e) => onMcpEndpointChange(e.target.value)}
                    placeholder="https://agents.example.com/mcp"
                    disabled={disabled}
                />
            )}
        </div>
    );
}
