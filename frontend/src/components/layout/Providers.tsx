'use client';

import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { wagmiConfig } from '@/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

// Create QueryClient outside component to avoid recreation on every render
function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                refetchOnWindowFocus: false,
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
    if (typeof window === 'undefined') {
        // Server: always create a new query client
        return makeQueryClient();
    } else {
        // Browser: reuse existing client
        if (!browserQueryClient) browserQueryClient = makeQueryClient();
        return browserQueryClient;
    }
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const queryClient = getQueryClient();

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={lightTheme({
                        accentColor: '#2563eb',
                        accentColorForeground: 'white',
                        borderRadius: 'large',
                        fontStack: 'system',
                        overlayBlur: 'small',
                    })}
                >
                    {children}
                    {mounted && (
                        <Toaster
                            position="bottom-right"
                            toastOptions={{
                                duration: 5000,
                                style: {
                                    background: '#ffffff',
                                    color: '#111827',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                                },
                                success: {
                                    iconTheme: {
                                        primary: '#10b981',
                                        secondary: '#ffffff',
                                    },
                                },
                                error: {
                                    iconTheme: {
                                        primary: '#ef4444',
                                        secondary: '#ffffff',
                                    },
                                },
                            }}
                        />
                    )}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
