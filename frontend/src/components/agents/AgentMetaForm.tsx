'use client';

import { Input } from '@/components/ui/Input';

interface AgentMetaFormProps {
    systemPrompt: string;
    description: string;
    skills: string;
    onSystemPromptChange: (v: string) => void;
    onDescriptionChange: (v: string) => void;
    onSkillsChange: (v: string) => void;
    disabled?: boolean;
}

export function AgentMetaForm({
    systemPrompt,
    description,
    skills,
    onSystemPromptChange,
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
                    System prompt (agent brain)
                </label>
                <textarea
                    value={systemPrompt}
                    onChange={(e) => onSystemPromptChange(e.target.value)}
                    placeholder="You are an expert..."
                    disabled={disabled}
                    rows={6}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
            </div>
        </div>
    );
}
