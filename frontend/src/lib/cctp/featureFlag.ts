/** Gate CCTP UI behind env flag (default off in production). */
export function isCctpUiEnabled(): boolean {
    return process.env.NEXT_PUBLIC_CCTP_UI_ENABLED?.trim() === 'true';
}
