'use client';

import { useWallet } from '@/hooks/useWallet';
import { useAgents } from './useAgents';

export function useMyAgents() {
    const { address } = useWallet();
    return useAgents({ owner: address });
}
