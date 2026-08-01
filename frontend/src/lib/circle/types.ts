export type CircleWalletRecord = {
  id: string;
  address: string;
  blockchain: string;
  state?: string;
};

export type CircleLoginSession = {
  userToken: string;
  encryptionKey: string;
};

export type CircleContractExecutionParams = {
  walletId: string;
  contractAddress: string;
  abiFunctionSignature: string;
  abiParameters: unknown[];
  feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
};
