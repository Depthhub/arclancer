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

type ConnectPhase = 'email' | 'verify' | 'username';

type CircleWalletContextValue = {
  enabled: boolean;
  sdkReady: boolean;
  deviceReady: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  address?: `0x${string}`;
  username?: string;
  walletId?: string;
  usdcBalance?: string;
  status: string;
  statusIsError: boolean;
  email: string;
  setEmail: (email: string) => void;
  usernameDraft: string;
  setUsernameDraft: (value: string) => void;
  connectPhase: ConnectPhase;
  otpSent: boolean;
  openConnect: () => void;
  closeConnect: () => void;
  connectOpen: boolean;
  sendEmailOtp: () => Promise<void>;
  resendEmailOtp: () => Promise<void>;
  verifyEmailOtp: () => Promise<void>;
  saveUsername: () => Promise<void>;
  disconnect: () => void;
  refreshWallets: () => Promise<void>;
  executeChallenge: (challengeId: string) => Promise<void>;
  executeContract: (params: Omit<CircleContractExecutionParams, 'walletId'>) => Promise<string | undefined>;
  createConnectorToken: () => Promise<{ token: string; mcpUrl: string; walletAddress: string }>;
  fundWallet: () => Promise<{ mode?: string; checkoutUrl?: string }>;
  resolveOAuthRequest: (requestId: string, approved: boolean) => Promise<string>;
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
  const [username, setUsername] = useState<string | undefined>();
  const [usernameDraft, setUsernameDraft] = useState('');
  const [connectPhase, setConnectPhase] = useState<ConnectPhase>('email');
  const [otpSent, setOtpSent] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const deviceReady = sdkReady && Boolean(deviceId);
  const address = wallet?.address as `0x${string}` | undefined;
  const isConnected = Boolean(session && wallet?.address);

  const applyLoginConfigs = useCallback(
    (login: {
      deviceToken: string;
      deviceEncryptionKey: string;
      otpToken: string;
      email: string;
    }) => {
      const sdk = sdkRef.current;
      if (!sdk) return;
      sdk.updateConfigs({
        appSettings: { appId: APP_ID },
        loginConfigs: {
          deviceToken: login.deviceToken,
          deviceEncryptionKey: login.deviceEncryptionKey,
          otpToken: login.otpToken,
          email: { email: login.email },
        } as import('@circle-fin/w3s-pw-web-sdk/dist/src/types').LoginConfigs,
      });
    },
    []
  );

  const refreshProfileFromSession = useCallback(async (login: CircleLoginSession) => {
    const res = await fetch(
      `/api/profile?userToken=${encodeURIComponent(login.userToken)}`
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.profile?.username) {
      setUsername(data.profile.username as string);
      setConnectPhase('email');
      setConnectOpen(false);
      setOtpSent(false);
      setStatus('');
      setStatusIsError(false);
      return;
    }
    setConnectPhase('username');
    setConnectOpen(true);
    setStatus('Choose a username so clients can tag you (e.g. samuel)');
    setStatusIsError(false);
  }, []);

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
            setConnectOpen(true);
            setConnectPhase('verify');
            setStatus(err?.message ?? 'That code did not work. Request a new code and try again.');
            setStatusIsError(true);
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
          setStatus('Setting up your account…');
          setStatusIsError(false);

          ensureWalletRef.current(login)
            .then(async () => {
              if (!cancelled) {
                await refreshProfileFromSession(login);
                setIsConnecting(false);
              }
            })
            .catch((err) => {
              if (!cancelled) {
                setStatus(err instanceof Error ? err.message : 'Sign-in failed');
                setStatusIsError(true);
                setIsConnecting(false);
              }
            });
        };

        const sdk = new W3SSdk({ appSettings: { appId: APP_ID } }, onLoginComplete);
        sdkRef.current = sdk;
        if (!cancelled) setSdkReady(true);
      } catch (err) {
        console.error('Circle SDK init failed:', err);
        if (!cancelled) {
          setStatus('Sign-in is temporarily unavailable. Refresh and try again.');
          setStatusIsError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshProfileFromSession]);

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
          setStatus('Almost done…');
          await executeChallenge(init.challengeId);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (!msg.includes('155106') && !msg.toLowerCase().includes('initialized')) {
          throw err;
        }
      }

      const arcWallet = await loadWallets(login.userToken);
      if (!arcWallet) throw new Error('Could not finish account setup');
      setStatus('Signed in');
      setStatusIsError(false);
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

  useEffect(() => {
    if (!session?.userToken || !wallet?.address || username) return;
    let cancelled = false;
    (async () => {
      try {
        await refreshProfileFromSession(session);
      } catch {
        /* ignore */
      }
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [session, wallet?.address, username, refreshProfileFromSession]);

  const sendEmailOtp = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatus('Enter your email address');
      setStatusIsError(true);
      return;
    }
    if (!deviceId) {
      setStatus('Still preparing sign-in. Wait a moment and try again.');
      setStatusIsError(true);
      return;
    }
    setIsConnecting(true);
    setStatus('Sending your code…');
    setStatusIsError(false);
    try {
      const data = await circleApi('requestEmailOtp', { deviceId, email: trimmedEmail });
      setDeviceToken(data.deviceToken);
      setDeviceEncryptionKey(data.deviceEncryptionKey);
      setOtpToken(data.otpToken);

      applyLoginConfigs({
        deviceToken: data.deviceToken,
        deviceEncryptionKey: data.deviceEncryptionKey,
        otpToken: data.otpToken,
        email: trimmedEmail,
      });

      setOtpSent(true);
      setConnectPhase('verify');
      setStatus('Check your email for the 6-digit code');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not send code');
      setStatusIsError(true);
    } finally {
      setIsConnecting(false);
    }
  }, [deviceId, email, applyLoginConfigs]);

  const resendEmailOtp = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !deviceId) {
      setStatus('Enter your email and send a code first');
      setStatusIsError(true);
      return;
    }
    setIsConnecting(true);
    setStatus('Sending a new code…');
    setStatusIsError(false);
    try {
      let data: { deviceToken?: string; deviceEncryptionKey?: string; otpToken?: string };
      if (otpToken) {
        data = await circleApi('resendEmailOtp', {
          deviceId,
          email: trimmedEmail,
          otpToken,
        });
        setOtpToken(data.otpToken ?? otpToken);
      } else {
        data = await circleApi('requestEmailOtp', { deviceId, email: trimmedEmail });
        if (data.deviceToken) setDeviceToken(data.deviceToken);
        if (data.deviceEncryptionKey) setDeviceEncryptionKey(data.deviceEncryptionKey);
        if (data.otpToken) setOtpToken(data.otpToken);
      }

      if (data.deviceToken && data.deviceEncryptionKey && data.otpToken) {
        applyLoginConfigs({
          deviceToken: data.deviceToken,
          deviceEncryptionKey: data.deviceEncryptionKey,
          otpToken: data.otpToken,
          email: trimmedEmail,
        });
      } else if (data.otpToken && deviceToken && deviceEncryptionKey) {
        applyLoginConfigs({
          deviceToken,
          deviceEncryptionKey,
          otpToken: data.otpToken,
          email: trimmedEmail,
        });
      }

      setOtpSent(true);
      setConnectPhase('verify');
      setStatus('New code sent — check your email');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not resend code');
      setStatusIsError(true);
    } finally {
      setIsConnecting(false);
    }
  }, [
    deviceId,
    email,
    otpToken,
    deviceToken,
    deviceEncryptionKey,
    applyLoginConfigs,
  ]);

  const verifyEmailOtp = useCallback(async () => {
    const sdk = sdkRef.current;
    const trimmedEmail = email.trim();
    if (!sdk || !deviceToken || !deviceEncryptionKey || !otpToken || !trimmedEmail) {
      setStatus('Send a verification code first');
      setStatusIsError(true);
      return;
    }

    setStatusIsError(false);
    setStatus(
      'A secure sign-in window will open — paste your 6-digit code there. If you do not see it, check behind this tab or allow pop-ups.'
    );

    applyLoginConfigs({
      deviceToken,
      deviceEncryptionKey,
      otpToken,
      email: trimmedEmail,
    });

    // Circle hosts OTP entry in its own window/iframe — hide our modal so it is not covered.
    setConnectOpen(false);
    setIsConnecting(true);

    try {
      sdk.verifyOtp();
    } catch (err) {
      setConnectOpen(true);
      setIsConnecting(false);
      setStatus(err instanceof Error ? err.message : 'Could not open sign-in window');
      setStatusIsError(true);
    }
  }, [deviceToken, deviceEncryptionKey, otpToken, email, applyLoginConfigs]);

  const saveUsername = useCallback(async () => {
    if (!session?.userToken) {
      setStatus('Sign in first');
      setStatusIsError(true);
      return;
    }
    setIsConnecting(true);
    setStatusIsError(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameDraft,
          userToken: session.userToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Could not save username');
      }
      setUsername(data.profile.username as string);
      setConnectPhase('email');
      setConnectOpen(false);
      setStatus('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save username');
      setStatusIsError(true);
    } finally {
      setIsConnecting(false);
    }
  }, [session, usernameDraft]);

  const executeContract = useCallback(
    async (params: Omit<CircleContractExecutionParams, 'walletId'>) => {
      if (!session || !wallet?.id) throw new Error('Sign in first');
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
    if (!session) throw new Error('Sign in first');
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
    if (!address) throw new Error('Sign in first');
    setStatus('Adding test funds…');
    const result = await circleApi('fundWallet', { address });
    if (result.checkoutUrl) {
      window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
      setStatus('Complete funding in the Circle checkout');
    } else {
      setStatus('Test funds requested. They may take a moment to arrive.');
      window.setTimeout(() => void refreshWallets(), 4000);
    }
    return result as { mode?: string; checkoutUrl?: string };
  }, [address, refreshWallets]);

  const resolveOAuthRequest = useCallback(
    async (requestId: string, approved: boolean) => {
      if (approved && !session) throw new Error('Sign in first');
      const response = await fetch('/api/mcp/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          approved,
          userToken: approved ? session?.userToken : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.redirectTo !== 'string') {
        throw new Error(data.error || 'Failed to complete connector authorization');
      }
      return data.redirectTo as string;
    },
    [session]
  );

  const disconnect = useCallback(() => {
    setSession(null);
    setWallet(null);
    setUsername(undefined);
    setUsernameDraft('');
    setConnectPhase('email');
    setUsdcBalance(undefined);
    setOtpSent(false);
    setDeviceToken('');
    setDeviceEncryptionKey('');
    setOtpToken('');
    saveSession(null);
    setStatus('');
    setStatusIsError(false);
  }, []);

  const value = useMemo<CircleWalletContextValue>(
    () => ({
      enabled,
      sdkReady,
      deviceReady,
      isConnected,
      isConnecting,
      address,
      username,
      walletId: wallet?.id,
      usdcBalance,
      status,
      statusIsError,
      email,
      setEmail,
      usernameDraft,
      setUsernameDraft,
      connectPhase,
      otpSent,
      openConnect: () => {
        setConnectPhase('email');
        setOtpSent(false);
        setStatus('');
        setStatusIsError(false);
        setConnectOpen(true);
      },
      closeConnect: () => setConnectOpen(false),
      connectOpen,
      sendEmailOtp,
      resendEmailOtp,
      verifyEmailOtp,
      saveUsername,
      disconnect,
      refreshWallets,
      executeChallenge,
      executeContract,
      createConnectorToken,
      fundWallet,
      resolveOAuthRequest,
    }),
    [
      enabled,
      sdkReady,
      deviceReady,
      isConnected,
      isConnecting,
      address,
      username,
      wallet?.id,
      usdcBalance,
      status,
      statusIsError,
      email,
      usernameDraft,
      connectPhase,
      otpSent,
      connectOpen,
      sendEmailOtp,
      resendEmailOtp,
      verifyEmailOtp,
      saveUsername,
      disconnect,
      refreshWallets,
      executeChallenge,
      executeContract,
      createConnectorToken,
      fundWallet,
      resolveOAuthRequest,
    ]
  );

  if (!enabled) return <>{children}</>;

  const showVerifyBanner =
    isConnecting && !connectOpen && connectPhase === 'verify';

  return (
    <>
      {showVerifyBanner && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[200] mx-auto max-w-md rounded-2xl border border-blue-100 bg-white p-4 shadow-lg"
          role="status"
        >
          <p className="text-sm font-medium text-neutral-900">Paste your code in the Circle window</p>
          <p className="mt-1 text-xs text-neutral-500">
            Look for a pop-up or new panel from Circle. Allow pop-ups if nothing appears.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void verifyEmailOtp()}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Open window again
            </button>
            <button
              type="button"
              onClick={() => setConnectOpen(true)}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
            >
              Back to sign-in
            </button>
          </div>
        </div>
      )}
      <CircleWalletContext.Provider value={value}>
        {children}
      </CircleWalletContext.Provider>
    </>
  );
}

export function useCircleWallet() {
  const ctx = useContext(CircleWalletContext);
  if (!ctx) {
    return {
      enabled: false,
      sdkReady: false,
      deviceReady: false,
      isConnected: false,
      isConnecting: false,
      status: '',
      statusIsError: false,
      email: '',
      setEmail: () => {},
      usernameDraft: '',
      setUsernameDraft: () => {},
      connectPhase: 'email' as ConnectPhase,
      otpSent: false,
      openConnect: () => {},
      closeConnect: () => {},
      connectOpen: false,
      sendEmailOtp: async () => {},
      resendEmailOtp: async () => {},
      verifyEmailOtp: async () => {},
      saveUsername: async () => {},
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
      resolveOAuthRequest: async () => {
        throw new Error('Circle wallet is not enabled');
      },
    } satisfies Partial<CircleWalletContextValue> & { enabled: false };
  }
  return ctx;
}
