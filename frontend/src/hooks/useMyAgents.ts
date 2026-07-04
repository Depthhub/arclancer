'use client';

import { useAccount } from 'wagmi';
import { useAgents } from './useAgents';

export function useMyAgents() {
    const { address } = useAccount();
    return useAgents({ owner: address });
}
