/** Gate agent marketplace UI. Enabled by default; set NEXT_PUBLIC_AGENTS_UI_ENABLED=false to hide. */
export function isAgentsUiEnabled(): boolean {
    const v = process.env.NEXT_PUBLIC_AGENTS_UI_ENABLED?.trim();
    if (v === 'false') return false;
    return true;
}
