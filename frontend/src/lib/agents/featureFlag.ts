export function isAgentsUiEnabled(): boolean {
    return process.env.NEXT_PUBLIC_AGENTS_UI_ENABLED?.trim() === 'true';
}
