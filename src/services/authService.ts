import { StellarService } from './stellarService';

interface User {
    id: string;
    name: string;
    email: string;
    walletAddress?: string;
    role: 'user' | 'admin' | 'vendor';
    createdAt: Date;
}

interface AuthResponse {
    user: User;
    token: string;
}

export class AuthService {
    private currentUser: User | null = null;
    private token: string | null = null;
    private apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000/api';

    constructor(private stellarService: StellarService) {
        this.checkExistingSession();
    }

    private checkExistingSession() {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('user');
        if (token && user) {
            this.token = token;
            this.currentUser = JSON.parse(user);
        }
    }

    async register(data: {
        name: string;
        email: string;
        password: string;
        walletAddress?: string;
    }): Promise<AuthResponse> {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Registration failed');
            }

            const auth: AuthResponse = await response.json();
            this.setSession(auth);
            return auth;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async loginWithFreighter(): Promise<AuthResponse> {
        try {
            const address = await this.stellarService.connectWallet();
            
            const nonceResponse = await fetch(`${this.apiBaseUrl}/auth/nonce`);
            const { nonce } = await nonceResponse.json();
            
            const message = `Sign this message to login to AidLink\nNonce: ${nonce}`;
            
            const signedXDR = await window.freighter.signTransaction(
                message,
                'TESTNET'
            );

            const response = await fetch(`${this.apiBaseUrl}/auth/verify-signature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address,
                    message,
                    signature: signedXDR
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Freighter login failed');
            }

            const auth: AuthResponse = await response.json();
            this.setSession(auth);
            return auth;
        } catch (error) {
            console.error('Freighter login error:', error);
            throw error;
        }
    }

    private setSession(auth: AuthResponse): void {
        this.currentUser = auth.user;
        this.token = auth.token;
        localStorage.setItem('auth_token', auth.token);
        localStorage.setItem('user', JSON.stringify(auth.user));
    }

    logout(): void {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }

    isAuthenticated(): boolean {
        return !!this.token && !!this.currentUser;
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    getToken(): string | null {
        return this.token;
    }
}