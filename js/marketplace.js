class Marketplace {
    constructor() {
        this.vendors = new Map();
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.transactions = [];
        this.setupEventListeners();
        this.initializeStats();
    }

    setupEventListeners() {
        // Vendor registration
        document.getElementById('registerVendor').addEventListener('click', () => {
            document.getElementById('vendorModal').style.display = 'block';
        });

        document.getElementById('vendorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registerVendor(e);
        });

        // Search and filters
        document.getElementById('vendorSearch').addEventListener('input', () => {
            this.filterVendors();
        });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterVendors();
        });

        document.getElementById('locationFilter').addEventListener('change', () => {
            this.filterVendors();
        });

        document.getElementById('ratingFilter').addEventListener('change', () => {
            this.filterVendors();
        });

        // Pagination
        document.getElementById('prevVendorsPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderVendors();
            }
        });

        document.getElementById('nextVendorsPage').addEventListener('click', () => {
            const totalPages = Math.ceil(this.vendors.size / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderVendors();
            }
        });

        // Transaction history
        document.getElementById('viewTransactions').addEventListener('click', () => {
            document.getElementById('transactionModal').style.display = 'block';
            this.loadTransactionHistory();
        });

        document.getElementById('transactionDateRange').addEventListener('change', () => {
            this.loadTransactionHistory();
        });

        document.getElementById('transactionType').addEventListener('change', () => {
            this.loadTransactionHistory();
        });

        // Export functionality
        document.getElementById('downloadReport').addEventListener('click', () => {
            this.generateReport();
        });

        document.getElementById('exportTransactions').addEventListener('click', () => {
            this.exportTransactionHistory();
        });
    }

    async registerVendor(event) {
        const formData = new FormData(event.target);
        const vendor = {
            id: this.generateVendorId(),
            name: formData.get('vendorName'),
            description: formData.get('vendorDescription'),
            categories: Array.from(formData.getAll('categories')),
            location: formData.get('vendorLocation'),
            contact: formData.get('vendorContact'),
            email: formData.get('vendorEmail'),
            website: formData.get('vendorWebsite'),
            rating: 5.0,
            reviewCount: 0,
            registeredAt: new Date(),
            status: 'active'
        };

        try {
            // Register vendor on blockchain
            const accounts = await window.aidLinkApp.web3.eth.getAccounts();
            if (accounts.length === 0) {
                throw new Error('Please connect your wallet');
            }

            const marketplaceContract = new window.aidLinkApp.web3.eth.Contract(
                window.aidLinkApp.contracts.AidMarketplace.abi,
                window.aidLinkApp.contracts.AidMarketplace.address
            );

            await marketplaceContract.methods.registerVendor(
                vendor.id,
                vendor.name,
                vendor.categories,
                vendor.location
            ).send({
                from: accounts[0],
                gas: '1000000'
            });

            this.vendors.set(vendor.id, vendor);
            this.renderVendors();
            this.updateStats();
            this.showAlert('Vendor registered successfully!', 'success');
            document.getElementById('vendorModal').style.display = 'none';
            event.target.reset();
        } catch (error) {
            console.error('Error registering vendor:', error);
            this.showAlert('Error registering vendor. Please try again.', 'error');
        }
    }

    renderVendors() {
        const vendorsList = document.getElementById('vendorsList');
        vendorsList.innerHTML = '';

        const filteredVendors = Array.from(this.vendors.values())
            .filter(vendor => this.filterVendor(vendor));

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageVendors = filteredVendors.slice(startIndex, endIndex);

        pageVendors.forEach(vendor => {
            const vendorElement = document.createElement('div');
            vendorElement.className = 'vendor-card';
            vendorElement.innerHTML = `
                <div class="vendor-header">
                    <span class="vendor-name">${vendor.name}</span>
                    <div class="vendor-rating">
                        <i class="fas fa-star"></i>
                        <span>${vendor.rating.toFixed(1)} (${vendor.reviewCount})</span>
                    </div>
                </div>
                <div class="vendor-info">
                    <p><i class="fas fa-map-marker-alt"></i> ${vendor.location}</p>
                    <p><i class="fas fa-phone"></i> ${vendor.contact}</p>
                    <p><i class="fas fa-envelope"></i> ${vendor.email}</p>
                    ${vendor.website ? `<p><i class="fas fa-globe"></i> ${vendor.website}</p>` : ''}
                </div>
                <div class="vendor-categories">
                    ${vendor.categories.map(category => 
                        `<span class="category-tag">${category}</span>`
                    ).join('')}
                </div>
                <div class="vendor-actions">
                    <button onclick="marketplace.viewVendorDetails('${vendor.id}')" 
                            class="btn secondary">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button onclick="marketplace.contactVendor('${vendor.id}')"
                            class="btn primary">
                        <i class="fas fa-envelope"></i> Contact
                    </button>
                </div>
            `;
            vendorsList.appendChild(vendorElement);
        });

        const totalPages = Math.ceil(filteredVendors.length / this.itemsPerPage);
        document.getElementById('vendorsPageInfo').textContent = 
            `Page ${this.currentPage} of ${totalPages}`;
        document.getElementById('prevVendorsPage').disabled = this.currentPage === 1;
        document.getElementById('nextVendorsPage').disabled = this.currentPage === totalPages;
    }

    filterVendors() {
        this.currentPage = 1;
        this.renderVendors();
    }

    filterVendor(vendor) {
        const searchTerm = document.getElementById('vendorSearch').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        const locationFilter = document.getElementById('locationFilter').value;
        const ratingFilter = parseFloat(document.getElementById('ratingFilter').value) || 0;

        const matchesSearch = 
            vendor.name.toLowerCase().includes(searchTerm) ||
            vendor.description.toLowerCase().includes(searchTerm) ||
            vendor.location.toLowerCase().includes(searchTerm);

        const matchesCategory = !categoryFilter || 
            vendor.categories.includes(categoryFilter);

        const matchesLocation = !locationFilter || 
            vendor.location.toLowerCase().includes(locationFilter.toLowerCase());

        const matchesRating = vendor.rating >= ratingFilter;

        return matchesSearch && matchesCategory && matchesLocation && matchesRating;
    }

    async viewVendorDetails(vendorId) {
        const vendor = this.vendors.get(vendorId);
        if (vendor) {
            // Implement vendor details view
            console.log('Viewing vendor details:', vendor);
        }
    }

    async contactVendor(vendorId) {
        const vendor = this.vendors.get(vendorId);
        if (vendor) {
            // Implement vendor contact functionality
            console.log('Contacting vendor:', vendor);
        }
    }

    async loadTransactionHistory() {
        const dateRange = document.getElementById('transactionDateRange').value;
        const type = document.getElementById('transactionType').value;

        // Filter transactions based on selections
        const filtered = this.transactions.filter(tx => {
            const isInDateRange = this.isTransactionInRange(tx, dateRange);
            const matchesType = type === 'all' || tx.type === type;
            return isInDateRange && matchesType;
        });

        this.renderTransactions(filtered);
    }

    renderTransactions(transactions) {
        const transactionList = document.querySelector('.transaction-list');
        transactionList.innerHTML = '';

        transactions.forEach(tx => {
            const txElement = document.createElement('div');
            txElement.className = 'transaction-item';
            txElement.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-title">${tx.description}</div>
                    <div class="transaction-date">${tx.date.toLocaleDateString()}</div>
                </div>
                <div class="transaction-amount">${tx.amount} ETH</div>
            `;
            transactionList.appendChild(txElement);
        });
    }

    isTransactionInRange(transaction, range) {
        const txDate = new Date(transaction.date);
        const now = new Date();
        const daysAgo = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
        return range === 'all' || daysAgo <= parseInt(range);
    }

    async generateReport() {
        try {
            const report = {
                vendors: Array.from(this.vendors.values()),
                transactions: this.transactions,
                stats: {
                    totalVendors: this.vendors.size,
                    activeVendors: Array.from(this.vendors.values())
                        .filter(v => v.status === 'active').length,
                    totalTransactions: this.transactions.length,
                    totalVolume: this.transactions
                        .reduce((sum, tx) => sum + tx.amount, 0)
                }
            };

            const blob = new Blob(
                [JSON.stringify(report, null, 2)],
                { type: 'application/json' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `marketplace-report-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showAlert('Report downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error generating report:', error);
            this.showAlert('Error generating report', 'error');
        }
    }

    exportTransactionHistory() {
        try {
            const dateRange = document.getElementById('transactionDateRange').value;
            const type = document.getElementById('transactionType').value;
            
            const filtered = this.transactions.filter(tx => {
                const isInDateRange = this.isTransactionInRange(tx, dateRange);
                const matchesType = type === 'all' || tx.type === type;
                return isInDateRange && matchesType;
            });

            const csv = this.convertToCSV(filtered);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            this.showAlert('Transactions exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting transactions:', error);
            this.showAlert('Error exporting transactions', 'error');
        }
    }

    convertToCSV(transactions) {
        const headers = ['Date', 'Type', 'Description', 'Amount', 'Status'];
        const rows = transactions.map(tx => [
            tx.date.toLocaleDateString(),
            tx.type,
            tx.description,
            tx.amount,
            tx.status
        ]);
        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }

    initializeStats() {
        document.getElementById('activeVendorsCount').textContent = '0';
        document.getElementById('totalTransactions').textContent = '0';
        document.getElementById('aidDistributed').textContent = '0 ETH';
    }

    updateStats() {
        const stats = {
            activeVendors: Array.from(this.vendors.values())
                .filter(v => v.status === 'active').length,
            totalTransactions: this.transactions.length,
            totalVolume: this.transactions
                .reduce((sum, tx) => sum + tx.amount, 0)
        };

        document.getElementById('activeVendorsCount').textContent = 
            stats.activeVendors;
        document.getElementById('totalTransactions').textContent = 
            stats.totalTransactions;
        document.getElementById('aidDistributed').textContent = 
            `${stats.totalVolume.toFixed(2)} ETH`;
    }

    generateVendorId() {
        return `VEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

// Initialize Marketplace when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.marketplace = new Marketplace();
});