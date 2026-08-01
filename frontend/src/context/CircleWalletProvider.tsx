'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import type { LoginCompleteCallback } from '@circle-fin/w3s-pw-web-sdk/dist/src/types';
import type {
  CircleContractExecutionParams,
  CircleLoginSession,
  CircleWalletRecord,
} from '@/lib/circle/types';
import { isCircleWalletsEnabled } from '@/lib/circle/featureFlag';

const SESSION_KEY = 'arclancer.circle.session';
const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID?.trim() ?? '';

type CircleWalletContextValue = {
  enabled: boolean;
  sdkReady: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  address?: `0x${string}`;
  walletId?: string;
  usdcBalance?: string;
  status: string;
  email: string;
  setEmail: (email: string) => void;
  otpSent: boolean;
  openConnect: () => void;
  closeConnect: () => void;
  connectOpen: boolean;
  sendEmailOtp: () => Promise<void>;
  verifyEmailOtp: () => Promise<void>;
  disconnect: () => void;
  refreshWallets: () => Promise<void>;
  executeChallenge: (challengeId: string) => Promise<void>;
  executeContract: (params: Omit<CircleContractExecutionParams, 'walletId'>) => Promise<string | undefined>;
  createConnectorToken: () => Promise<{ token: string; mcpUrl: string; walletAddress: string }>;
  fundWallet: () => Promise<{ mode?: string; checkoutUrl?: string }>;
};

const CircleWalletContext = createContext<CircleWalletContextValue | null>(null);

async function circleApi(action: string, params: Record<string, unknown> = {}) {
  const res = await fetch('/api/circle/wallets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : `Circle API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function loadSession(): CircleLoginSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CircleLoginSession;
    if (parsed.userToken && parsed.encryptionKey) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function saveSession(session: CircleLoginSession | null) {
  if (typeof window === 'undefined') return;
  if (!session) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function CircleWalletProvider({ children }: { children: React.ReactNode }) {
  const enabled = isCircleWalletsEnabled();
  const sdkRef = useRef<W3SSdk | null>(null);
  const ensureWalletRef = useRef<(login: CircleLoginSession) => Promise<CircleWalletRecord | null>>(
    async () => null
  );

  const [sdkReady, setSdkReady] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [deviceEncryptionKey, setDeviceEncryptionKey] = useState('');
  const [otpToken, setOtpToken] = useState('');

  const [session, setSession] = useState<CircleLoginSession | null>(null);
  const [wallet, setWallet] = useState<CircleWalletRecord | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | undefined>();

  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const address = wallet?.address as `0x${string}` | undefined;
  const isConnected = Boolean(session && wallet?.address);

  useEffect(() => {
    if (!enabled || !APP_ID) return;
    let cancelled = false;

    (async () => {
      try {
        const { W3SSdk } = await import('@circle-fin/w3s-pw-web-sdk');

        const onLoginComplete: LoginCompleteCallback = (error, result) => {
          if (cancelled) return;
          if (error || !result?.userToken || !result?.encryptionKey) {
            const err = error as { message?: string } | undefined;
            setStatus(err?.message ?? 'Email verification failed');
            setIsConnecting(false);
            return;
          }

          const login: CircleLoginSession = {
            userToken: result.userToken,
            encryptionKey: result.encryptionKey,
          };
          setSession(login);
          saveSession(login);
          setIsConnecting(true);
          setStatus('Creating your Arc wallet…');

          ensureWalletRef.current(login)
            .then(() => {
              if (!cancelled) {
                setConnectOpen(false);
                setOtpSent(false);
                setIsConnecting(false);
              }
            })
            .catch((err) => {
              if (!cancelled) {
                setStatus(err instanceof Error ? err.message : 'Wallet setup failed');
                setIsConnecting(false);
              }
            });
        };

        const sdk = new W3SSdk({ appSettings: { appId: APP_ID } }, onLoginComplete);
        sdkRef.current = sdk;
        if (!cancelled) setSdkReady(true);
      } catch (err) {
        console.error('Circle SDK init failed:', err);
        if (!cancelled) setStatus('Failed to load Circle wallet SDK');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!sdkReady || !sdkRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const cached = localStorage.getItem('arclancer.circle.deviceId');
        const id = cached || (await sdkRef.current!.getDeviceId());
        if (!cached) localStorage.setItem('arclancer.circle.deviceId', id);
        if (!cancelled) setDeviceId(id);
      } catch (err) {
        console.error('Circle deviceId failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sdkReady]);

  useEffect(() => {
    const restored = loadSession();
    if (restored) setSession(restored);
  }, []);

  const authenticateSdk = useCallback(
    (login: CircleLoginSession) => {
      sdkRef.current?.setAuthentication({
        userToken: login.userToken,
        encryptionKey: login.encryptionKey,
      });
    },
    []
  );

  const loadUsdcBalance = useCallback(async (userToken: string, walletId: string) => {
    try {
      const data = await circleApi('getTokenBalance', { userToken, walletId });
      const balances = (data.tokenBalances as Array<{ amount?: string; token?: { symbol?: string; name?: string } }>) ?? [];
      const usdc =
        balances.find((t) => {
          const symbol = t.token?.symbol ?? '';
          const name = t.token?.name ?? '';
          return symbol.startsWith('USDC') || name.includes('USDC');
        })?.amount ?? '0';
      setUsdcBalance(usdc);
    } catch {
      setUsdcBalance(undefined);
    }
  }, []);

  const loadWallets = useCallback(
    async (userToken: string) => {
      const data = await circleApi('listWallets', { userToken });
      const wallets = (data.wallets as CircleWalletRecord[]) ?? [];
      const arcWallet =
        wallets.find((w) => w.blockchain === 'ARC-TESTNET') ?? wallets[0] ?? null;
      setWallet(arcWallet);
      if (arcWallet) await loadUsdcBalance(userToken, arcWallet.id);
      return arcWallet;
    },
    [loadUsdcBalance]
  );

  const executeChallenge = useCallback(async (challengeId: string) => {
    const sdk = sdkRef.current;
    if (!sdk) throw new Error('Circle SDK not ready');

    await new Promise<void>((resolve, reject) => {
      sdk.execute(challengeId, (error) => {
        if (error) {
          reject(new Error(error.message ?? 'Challenge failed'));
          return;
        }
        resolve();
      });
    });
  }, []);

  const ensureWallet = useCallback(
    async (login: CircleLoginSession) => {
      authenticateSdk(login);

      try {
        const init = await circleApi('initializeUser', { userToken: login.userToken });
        if (init.challengeId) {
          setStatus('Creating your Arc wallet…');
          await executeChallenge(init.challengeId);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        // User already initialized — load existing wallet
        if (!msg.includes('155106') && !msg.toLowerCase().includes('initialized')) {
          throw err;
        }
      }

      const arcWallet = await loadWallets(login.userToken);
      if (!arcWallet) throw new Error('No Arc Testnet wallet found');
      setStatus('Connected to Arc Testnet');
      return arcWallet;
    },
    [authenticateSdk, executeChallenge, loadWallets]
  );

  ensureWalletRef.current = ensureWallet;

  const refreshWallets = useCallback(async () => {
    if (!session) return;
    await loadWallets(session.userToken);
  }, [session, loadWallets]);

  useEffect(() => {
    if (!session || wallet) return;
    let cancelled = false;
    (async () => {
      setIsConnecting(true);
      try {
        authenticateSdk(session);
        await loadWallets(session.userToken);
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, wallet, authenticateSdk, loadWallets]);

  const sendEmailOtp = useCallback(async () => {
    if (!deviceId || !email.trim()) {
      setStatus('Enter your email address');
      return;
    }
    setIsConnecting(true);
    setStatus('Sending verification code…');
    try {
      const data = await circleApi('requestEmailOtp', { deviceId, email: email.trim() });
      setDeviceToken(data.deviceToken);
      setDeviceEncryptionKey(data.deviceEncryptionKey);
      setOtpToken(data.otpToken);

      const sdk = sdkRef.current;
      if (sdk) {
        sdk.updateConfigs({
          appSettings: { appId: APP_ID },
          loginConfigs: {
            deviceToken: data.deviceToken,
            deviceEncryptionKey: data.deviceEncryptionKey,
            otpToken: data.otpToken,
          },
        });
      }

      setOtpSent(true);
      setStatus('Check your email for the verification code');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setIsConnecting(false);
    }
  }, [deviceId, email]);

  const verifyEmailOtp = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || !deviceToken || !deviceEncryptionKey || !otpToken) {
      setStatus('Send a verification code first');
      return;
    }

    setIsConnecting(true);
    setStatus('Opening verification…');

    sdk.updateConfigs({
      appSettings: { appId: APP_ID },
      loginConfigs: {
        deviceToken,
        deviceEncryptionKey,
        otpToken,
      },
    });

    sdk.verifyOtp();
  }, [deviceToken, deviceEncryptionKey, otpToken]);

  const executeContract = useCallback(
    async (params: Omit<CircleContractExecutionParams, 'walletId'>) => {
      if (!session || !wallet?.id) throw new Error('Connect your Circle wallet first');
      authenticateSdk(session);
      const data = await circleApi('createContractExecution', {
        userToken: session.userToken,
        walletId: wallet.id,
        ...params,
      });
      if (!data.challengeId) throw new Error('No challenge returned');
      await executeChallenge(data.challengeId);
      return data.challengeId as string;
    },
    [session, wallet, authenticateSdk, executeChallenge]
  );

  const createConnectorToken = useCallback(async () => {
    if (!session) throw new Error('Connect your Circle wallet first');
    const response = await fetch('/api/mcp/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userToken: session.userToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create connector token');
    }
    return data as { token: string; mcpUrl: string; walletAddress: string };
  }, [session]);

  const fundWallet = useCallback(async () => {
    if (!address) throw new Error('Connect your Circle wallet first');
    setStatus('Requesting USDC funding…');
    const result = await circleApi('fundWallet', { address });
    if (result.checkoutUrl) {
      window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
      setStatus('Complete funding in the Circle checkout');
    } else {
      setStatus('Test USDC requested. It may take a moment to arrive.');
      window.setTimeout(() => void refreshWallets(), 4000);
    }
    return result as { mode?: string; checkoutUrl?: string };
  }, [address, refreshWallets]);

  const disconnect = useCallback(() => {
    setSession(null);
    setWallet(null);
    setUsdcBalance(undefined);
    setOtpSent(false);
    setDeviceToken('');
    setDeviceEncryptionKey('');
    setOtpToken('');
    saveSession(null);
    setStatus('');
  }, []);

  const value = useMemo<CircleWalletContextValue>(
    () => ({
      enabled,
      sdkReady,
      isConnected,
      isConnecting,
      address,
      walletId: wallet?.id,
      usdcBalance,
      status,
      email,
      setEmail,
      otpSent,
      openConnect: () => setConnectOpen(true),
      closeConnect: () => setConnectOpen(false),
      connectOpen,
      sendEmailOtp,
      verifyEmailOtp,
      disconnect,
      refreshWallets,
      executeChallenge,
      executeContract,
      createConnectorToken,
      fundWallet,
    }),
    [
      enabled,
      sdkReady,
      isConnected,
      isConnecting,
      address,
      wallet?.id,
      usdcBalance,
      status,
      email,
      otpSent,
      connectOpen,
      sendEmailOtp,
      verifyEmailOtp,
      disconnect,
      refreshWallets,
      executeChallenge,
      executeContract,
      createConnectorToken,
      fundWallet,
    ]
  );

  if (!enabled) return <>{children}</>;

  return (
    <CircleWalletContext.Provider value={value}>
      {children}
    </CircleWalletContext.Provider>
  );
}

export function useCircleWallet() {
  const ctx = useContext(CircleWalletContext);
  if (!ctx) {
    return {
      enabled: false,
      sdkReady: false,
      isConnected: false,
      isConnecting: false,
      status: '',
      email: '',
      setEmail: () => {},
      otpSent: false,
      openConnect: () => {},
      closeConnect: () => {},
      connectOpen: false,
      sendEmailOtp: async () => {},
      verifyEmailOtp: async () => {},
      disconnect: () => {},
      refreshWallets: async () => {},
      executeChallenge: async () => {},
      executeContract: async () => undefined,
      createConnectorToken: async () => {
        throw new Error('Circle wallet is not enabled');
      },
      fundWallet: async () => {
        throw new Error('Circle wallet is not enabled');
      },
    } satisfies Partial<CircleWalletContextValue> & { enabled: false };
  }
  return ctx;
}
