class TokenManager {
    constructor() {
        this.tokens = new Map();
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.setupEventListeners();
        this.web3 = window.aidLinkApp.web3;
    }

    setupEventListeners() {
        document.getElementById('tokenForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createToken(e);
        });

        document.getElementById('tokenSearch').addEventListener('input', (e) => {
            this.filterTokens();
        });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterTokens();
        });

        document.getElementById('statusFilter').addEventListener('change', () => {
            this.filterTokens();
        });

        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTokens();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            const totalPages = Math.ceil(this.tokens.size / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTokens();
            }
        });

        document.getElementById('importTokens').addEventListener('click', () => {
            this.importTokens();
        });

        document.getElementById('exportTokens').addEventListener('click', () => {
            this.exportTokens();
        });
    }

    async createToken(event) {
        if (!this.web3) {
            this.showAlert('Please connect to MetaMask first', 'error');
            return;
        }

        const formData = new FormData(event.target);
        const tokenData = {
            recipient: formData.get('recipient'),
            amount: this.web3.utils.toWei(formData.get('amount'), 'ether'),
            category: formData.get('category'),
            description: formData.get('description'),
            expiry: formData.get('expiry'),
            transferable: formData.get('transferable') === 'on'
        };

        try {
            const accounts = await this.web3.eth.getAccounts();
            if (accounts.length === 0) {
                this.showAlert('Please connect your wallet', 'error');
                return;
            }

            const tokenContract = new this.web3.eth.Contract(
                window.aidLinkApp.contracts.AidToken.abi,
                window.aidLinkApp.contracts.AidToken.address
            );

            const result = await tokenContract.methods.createToken(
                tokenData.recipient,
                tokenData.amount,
                tokenData.category,
                tokenData.description,
                new Date(tokenData.expiry).getTime() / 1000,
                tokenData.transferable
            ).send({
                from: accounts[0],
                gas: '1000000'
            });

            const token = {
                id: result.events.TokenCreated.returnValues.tokenId,
                recipient: tokenData.recipient,
                amount: formData.get('amount'),
                category: tokenData.category,
                description: tokenData.description,
                expiry: tokenData.expiry,
                transferable: tokenData.transferable,
                createdAt: new Date(),
                status: 'active',
                txHash: result.transactionHash
            };

            this.tokens.set(token.id, token);
            this.renderTokens();
            this.updateStats();
            closeModal('tokenModal');
            event.target.reset();
            
            this.showAlert('Token created successfully!', 'success');
        } catch (error) {
            console.error('Error creating token:', error);
            this.showAlert('Error creating token. Please try again.', 'error');
        }
    }

    renderTokens() {
        const tokensList = document.getElementById('tokensList');
        tokensList.innerHTML = '';

        const filteredTokens = Array.from(this.tokens.values())
            .filter(token => this.filterToken(token));

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTokens = filteredTokens.slice(startIndex, endIndex);

        pageTokens.forEach(token => {
            const tokenElement = document.createElement('div');
            tokenElement.className = 'token-card';
            tokenElement.innerHTML = `
                <div class="token-header">
                    <span class="token-id">#${token.id}</span>
                    <span class="token-status ${token.status}">${token.status}</span>
                </div>
                <div class="token-info">
                    <p><i class="fas fa-user"></i> ${token.recipient}</p>
                    <p><i class="fas fa-coins"></i> ${token.amount} ETH</p>
                    <p><i class="fas fa-tag"></i> ${token.category}</p>
                    <p><i class="fas fa-clock"></i> ${new Date(token.expiry).toLocaleDateString()}</p>
                    <p><i class="fas fa-align-left"></i> ${token.description}</p>
                </div>
                <div class="token-actions">
                    <button onclick="tokenManager.transferToken('${token.id}')" 
                            class="btn secondary" 
                            ${!token.transferable ? 'disabled' : ''}>
                        <i class="fas fa-exchange-alt"></i> Transfer
                    </button>
                    <a href="https://etherscan.io/tx/${token.txHash}" 
                       target="_blank" 
                       class="btn secondary">
                        <i class="fas fa-external-link-alt"></i> View
                    </a>
                </div>
            `;
            tokensList.appendChild(tokenElement);
        });

        const totalPages = Math.ceil(filteredTokens.length / this.itemsPerPage);
        document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${totalPages}`;
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;
    }

    filterTokens() {
        this.currentPage = 1;
        this.renderTokens();
    }

    filterToken(token) {
        const searchTerm = document.getElementById('tokenSearch').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        const matchesSearch = 
            token.recipient.toLowerCase().includes(searchTerm) ||
            token.category.toLowerCase().includes(searchTerm) ||
            token.description.toLowerCase().includes(searchTerm);

        const matchesCategory = !categoryFilter || token.category === categoryFilter;
        const matchesStatus = !statusFilter || token.status === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
    }

    async transferToken(tokenId) {
        if (!this.web3) {
            this.showAlert('Please connect to MetaMask first', 'error');
            return;
        }

        const token = this.tokens.get(tokenId);
        if (token && token.transferable) {
            try {
                const accounts = await this.web3.eth.getAccounts();
                if (accounts.length === 0) {
                    this.showAlert('Please connect your wallet', 'error');
                    return;
                }

                const recipient = prompt('Enter recipient address:');
                if (!recipient) return;

                const tokenContract = new this.web3.eth.Contract(
                    window.aidLinkApp.contracts.AidToken.abi,
                    window.aidLinkApp.contracts.AidToken.address
                );

                await tokenContract.methods.transferToken(tokenId, recipient)
                    .send({
                        from: accounts[0],
                        gas: '1000000'
                    });

                token.status = 'transferred';
                token.recipient = recipient;
                this.tokens.set(tokenId, token);
                this.renderTokens();
                this.updateStats();
                
                this.showAlert('Token transferred successfully!', 'success');
            } catch (error) {
                console.error('Error transferring token:', error);
                this.showAlert('Error transferring token. Please try again.', 'error');
            }
        }
    }

    updateStats() {
        const stats = {
            total: this.tokens.size,
            active: 0,
            transferred: 0,
            completed: 0
        };

        this.tokens.forEach(token => {
            if (token.status === 'active') stats.active++;
            if (token.status === 'transferred') stats.transferred++;
            if (token.status === 'completed') stats.completed++;
        });

        document.getElementById('totalTokens').textContent = stats.total;
        document.getElementById('activeTransfers').textContent = stats.transferred;
        document.getElementById('completedTokens').textContent = stats.completed;
    }

    importTokens() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedTokens = JSON.parse(event.target.result);
                    importedTokens.forEach(token => {
                        this.tokens.set(token.id, token);
                    });
                    this.renderTokens();
                    this.updateStats();
                    this.showAlert('Tokens imported successfully!', 'success');
                } catch (error) {
                    this.showAlert('Error importing tokens. Invalid file format.', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    exportTokens() {
        const tokensArray = Array.from(this.tokens.values());
        const dataStr = JSON.stringify(tokensArray, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportName = `aid_tokens_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    }

    showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.tokenManager = new TokenManager();
});