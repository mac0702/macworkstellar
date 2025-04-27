declare interface Window {
  freighter?: {
    getPublicKey(): Promise<string>;
    signTransaction(
      xdr: string, 
      network: string
    ): Promise<string>;
  }
}