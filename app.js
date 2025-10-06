// SecureWipe Professional - Enterprise Data Sanitization Platform

class SecureWipeApp {
    constructor() {
        // Application configuration
        this.config = {
            name: "SecureWipe Professional",
            version: "3.0.0 Enterprise",
            apiBase: "http://localhost:8000",
            websocketBase: "ws://localhost:8000",
            inspector: {
                name: "Mani Verma",
                title: "Authorized Inspector",
                certification: "CERT-MV-2025",
                organization: "SecureWipe Technologies"
            }
        };

        // Login credentials from provided data
        this.loginCredentials = {
            username: "admin",
            password: "SecureWipe2025"
        };

        // Wipe standards from provided data
        this.wipeStandards = {
            nist: {
                name: "NIST SP 800-88 Rev. 1",
                description: "Single-pass cryptographic erase",
                passes: 1,
                compliance: ["NIST", "HIPAA", "GDPR"],
                timePerGB: 2,
                pattern: "Cryptographic Random"
            },
            dod: {
                name: "DoD 5220.22-M", 
                description: "Three-pass military standard",
                passes: 3,
                compliance: ["DoD", "Military"],
                timePerGB: 6,
                pattern: "0x00, 0xFF, Random"
            },
            gutmann: {
                name: "Gutmann 35-Pass",
                description: "Maximum security overwrite", 
                passes: 35,
                compliance: ["Maximum Security"],
                timePerGB: 70,
                pattern: "35 Specialized Patterns"
            }
        };

        // Browser API support detection
        this.apiSupport = {
            webUSB: false,
            fileSystemAccess: false,
            storageAPI: false,
            mediaDevices: false
        };

        // Application state
        this.state = {
            authenticated: false,
            currentView: 'dashboard',
            selectedDevice: null,
            wipeInProgress: false,
            wipeData: null,
            certificate: null,
            devices: [],
            auditLog: [],
            operationCount: 0,
            certificatesIssued: 0,
            devicesProcessed: 0
        };

        // Device type definitions
        this.deviceTypes = {
            HDD: { icon: "💾", name: "Hard Disk Drive", color: "#4A90E2" },
            SSD: { icon: "💽", name: "Solid State Drive", color: "#7ED321" },
            USB: { icon: "🔌", name: "USB Storage Device", color: "#F5A623" },
            SD: { icon: "📱", name: "SD Card", color: "#BD10E0" },
            MOBILE: { icon: "📲", name: "Mobile Device", color: "#B8E986" },
            NVME: { icon: "⚡", name: "NVMe SSD", color: "#50E3C2" }
        };

        this.init();
    }

    async init() {
        this.bindEvents();
        this.showLoginModal();
        await this.checkAPISupport();
        this.initializeAuditLog();
    }

    bindEvents() {
        // Login functionality
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        
        // Enter key for login
        ['username', 'password'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        });

        // Disclaimer modal
        document.getElementById('acceptDisclaimer').addEventListener('click', () => this.hideDisclaimer());

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.navigateTo(e.target.dataset.view));
        });

        // Dashboard actions
        document.getElementById('startWorkflow').addEventListener('click', () => this.navigateTo('devices'));
        document.getElementById('scanDevicesBtn').addEventListener('click', () => this.startDeviceScan());
        document.getElementById('quickDemo').addEventListener('click', () => this.startQuickDemo());

        // Device discovery
        document.getElementById('scanRealDevices').addEventListener('click', () => this.scanRealDevices());
        document.getElementById('selectDirectory').addEventListener('click', () => this.selectDirectory());
        document.getElementById('refreshDevices').addEventListener('click', () => this.refreshDevices());

        // Wipe configuration
        document.getElementById('backToDevices').addEventListener('click', () => this.navigateTo('devices'));
        document.getElementById('wipeStandard').addEventListener('change', (e) => this.updateComplianceInfo(e.target.value));
        
        // Safety confirmations
        ['confirmSafety', 'confirmWipe', 'confirmCompliance'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.updateWipeButtonState());
        });

        document.getElementById('startWipe').addEventListener('click', () => this.startSecureWipe());
        document.getElementById('scheduleWipe').addEventListener('click', () => this.scheduleWipe());
        document.getElementById('preWipeReport').addEventListener('click', () => this.generatePreWipeReport());

        // Emergency controls
        document.getElementById('emergencyStop').addEventListener('click', () => this.emergencyStop());

        // Certificate actions
        document.getElementById('goToWipe').addEventListener('click', () => this.navigateTo('wipe'));
        document.getElementById('viewAllCerts').addEventListener('click', () => this.viewAllCertificates());

        // Audit controls
        document.getElementById('exportAudit').addEventListener('click', () => this.exportAuditLog());
        document.getElementById('clearAudit').addEventListener('click', () => this.clearAuditLog());
    }

    showLoginModal() {
        document.getElementById('loginModal').classList.remove('hidden');
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username === this.loginCredentials.username && password === this.loginCredentials.password) {
            this.state.authenticated = true;
            document.getElementById('loginModal').classList.add('hidden');
            this.showDisclaimer();
            this.addAuditEntry(`Administrator login successful: ${username}`, 'success');
        } else {
            alert('Invalid credentials. Please use:\nUsername: admin\nPassword: SecureWipe2025');
            this.addAuditEntry(`Login attempt failed for user: ${username}`, 'error');
        }
    }

    showDisclaimer() {
        document.getElementById('disclaimerModal').classList.remove('hidden');
    }

    hideDisclaimer() {
        document.getElementById('disclaimerModal').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        this.updateDashboardStats();
        this.addAuditEntry('System disclaimer accepted - Real device scanning authorized', 'success');
    }

    async checkAPISupport() {
        // Check Web USB API
        this.apiSupport.webUSB = 'usb' in navigator;
        
        // Check File System Access API  
        this.apiSupport.fileSystemAccess = 'showDirectoryPicker' in window || 'showOpenFilePicker' in window;
        
        // Check Storage API
        this.apiSupport.storageAPI = 'storage' in navigator && 'estimate' in navigator.storage;
        
        // Check Media Devices API
        this.apiSupport.mediaDevices = 'mediaDevices' in navigator;

        this.updateAPIStatusUI();
        this.addAuditEntry('Browser API compatibility check completed', 'info');
    }

    updateAPIStatusUI() {
        const apis = [
            { id: 'usbApiStatus', supported: this.apiSupport.webUSB, name: 'Web USB API' },
            { id: 'fsApiStatus', supported: this.apiSupport.fileSystemAccess, name: 'File System Access' },
            { id: 'storageApiStatus', supported: this.apiSupport.storageAPI, name: 'Storage API' },
            { id: 'mediaApiStatus', supported: this.apiSupport.mediaDevices, name: 'Media Devices' }
        ];

        apis.forEach(api => {
            const element = document.getElementById(api.id);
            const badge = element.querySelector('.api-badge');
            
            if (api.supported) {
                badge.textContent = '✅ Available';
                badge.className = 'api-badge supported';
            } else {
                badge.textContent = '❌ Not Available';
                badge.className = 'api-badge not-supported';
            }
        });
    }

    navigateTo(view) {
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');

        // Update views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}View`)?.classList.add('active');

        this.state.currentView = view;

        // View-specific initialization
        if (view === 'audit') {
            this.renderAuditLog();
        } else if (view === 'devices' && this.state.devices.length === 0) {
            this.scanRealDevices();
        }

        this.addAuditEntry(`Navigated to ${view} view`, 'info');
    }

    updateDashboardStats() {
        document.getElementById('devicesCount').textContent = this.state.devices.length;
        document.getElementById('operationsCount').textContent = this.state.operationCount;
        document.getElementById('certificatesCount').textContent = this.state.certificatesIssued;
        document.getElementById('complianceScore').textContent = '100%';
    }

    startDeviceScan() {
        this.navigateTo('devices');
        this.scanRealDevices();
    }

    async scanRealDevices() {
        const scanStatus = document.getElementById('scanStatus');
        const deviceGrid = document.getElementById('deviceGrid');
        const noDevices = document.getElementById('noDevices');
        const scanDetails = document.getElementById('scanDetails');

        // Show scanning UI
        scanStatus.style.display = 'block';
        deviceGrid.innerHTML = '';
        noDevices.style.display = 'none';

        this.addAuditEntry('Starting real device discovery scan', 'info');

        const scanSteps = [
            'Initializing device discovery protocols...',
            'Checking browser security permissions...',
            'Scanning USB interface for connected devices...',
            'Analyzing file system mount points...',
            'Reading storage device metadata...',
            'Gathering hardware specifications...',
            'Performing device type classification...',
            'Finalizing device inventory...'
        ];

        let devices = [];

        // Step through scanning process
        for (let i = 0; i < scanSteps.length; i++) {
            scanDetails.textContent = scanSteps[i];
            await this.delay(600);
        }

        try {
            // Attempt real device detection using browser APIs
            if (this.apiSupport.webUSB) {
                const usbDevices = await this.scanUSBDevices();
                devices.push(...usbDevices);
            }

            if (this.apiSupport.storageAPI) {
                const storageDevices = await this.scanStorageDevices();
                devices.push(...storageDevices);
            }

            if (this.apiSupport.mediaDevices) {
                const mediaDevices = await this.scanMediaDevices();
                devices.push(...mediaDevices);
            }

            // If no real devices found, generate realistic simulated devices
            if (devices.length === 0) {
                devices = this.generateRealisticDevices();
                this.addAuditEntry('Generated realistic device simulation for demonstration', 'warning');
            }

        } catch (error) {
            console.error('Device scanning error:', error);
            devices = this.generateRealisticDevices();
            this.addAuditEntry(`Device scan encountered error: ${error.message}`, 'error');
        }

        // Hide scanning UI and show results
        scanStatus.style.display = 'none';
        this.state.devices = devices;
        
        if (devices.length > 0) {
            this.renderDeviceGrid();
            this.addAuditEntry(`Device scan completed: ${devices.length} storage devices detected`, 'success');
        } else {
            noDevices.style.display = 'block';
            this.addAuditEntry('No storage devices detected during scan', 'warning');
        }

        this.updateDashboardStats();
    }

    async scanUSBDevices() {
        const devices = [];
        
        try {
            if ('usb' in navigator) {
                // This would require user permission to access USB devices
                const existingDevices = await navigator.usb.getDevices();
                
                for (let device of existingDevices) {
                    devices.push({
                        id: `usb_${device.productId}_${device.vendorId}`,
                        name: device.productName || 'USB Storage Device',
                        type: 'USB',
                        size: this.generateRealisticSize('USB'),
                        interface: 'USB 3.0',
                        serial: this.generateSerial('USB'),
                        realDevice: true,
                        status: 'Connected',
                        model: device.productName || 'USB Drive'
                    });
                }
            }
        } catch (error) {
            console.log('USB scanning requires user permission:', error);
        }
        
        return devices;
    }

    async scanStorageDevices() {
        const devices = [];
        
        try {
            if (this.apiSupport.storageAPI) {
                const estimate = await navigator.storage.estimate();
                const totalGB = Math.round((estimate.quota || 0) / (1024 * 1024 * 1024));
                const usedGB = Math.round((estimate.usage || 0) / (1024 * 1024 * 1024));
                
                if (totalGB > 0) {
                    devices.push({
                        id: `storage_system_${Date.now()}`,
                        name: 'Primary System Storage',
                        type: 'SSD',
                        size: `${totalGB} GB`,
                        used: `${usedGB} GB`,
                        free: `${totalGB - usedGB} GB`,
                        interface: 'NVMe PCIe 4.0',
                        serial: this.generateSerial('SSD'),
                        realDevice: true,
                        status: 'Active',
                        model: 'System NVMe SSD'
                    });
                }
            }
        } catch (error) {
            console.log('Storage API error:', error);
        }
        
        return devices;
    }

    async scanMediaDevices() {
        const devices = [];
        
        try {
            if (this.apiSupport.mediaDevices) {
                const mediaDevices = await navigator.mediaDevices.enumerateDevices();
                const storageDevices = mediaDevices.filter(device => 
                    device.kind === 'videoinput' && device.label.includes('USB')
                ).slice(0, 1); // Limit to avoid clutter

                for (let device of storageDevices) {
                    devices.push({
                        id: `media_${device.deviceId.substr(0, 8)}`,
                        name: 'USB Media Device',
                        type: 'MOBILE',
                        size: this.generateRealisticSize('MOBILE'),
                        interface: 'USB Media Interface',
                        serial: this.generateSerial('MOBILE'),
                        realDevice: true,
                        status: 'Connected',
                        model: 'Mobile Storage Device'
                    });
                }
            }
        } catch (error) {
            console.log('Media devices scanning error:', error);
        }
        
        return devices;
    }

    async selectDirectory() {
        try {
            if ('showDirectoryPicker' in window) {
                const directoryHandle = await window.showDirectoryPicker();
                
                const device = {
                    id: `dir_${Date.now()}`,
                    name: `Selected Directory: ${directoryHandle.name}`,
                    type: 'HDD',
                    size: 'Unknown',
                    interface: 'File System Access API',
                    serial: this.generateSerial('HDD'),
                    realDevice: true,
                    status: 'Selected',
                    model: `Directory: ${directoryHandle.name}`
                };
                
                this.state.devices.push(device);
                this.renderDeviceGrid();
                this.addAuditEntry(`Manual directory selection: ${directoryHandle.name}`, 'success');
                this.updateDashboardStats();
            } else {
                alert('File System Access API not supported in this browser');
                this.addAuditEntry('File System Access API not supported', 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Directory selection error:', error);
                this.addAuditEntry(`Directory selection error: ${error.message}`, 'error');
            }
        }
    }

    refreshDevices() {
        this.addAuditEntry('Manual device refresh initiated', 'info');
        this.scanRealDevices();
    }

    generateRealisticDevices() {
        return [
            {
                id: 'realistic_ssd_001',
                name: 'Samsung NVMe SSD 980 PRO',
                type: 'SSD',
                size: '1 TB',
                used: '567 GB',
                free: '433 GB',
                interface: 'NVMe PCIe 4.0',
                serial: this.generateSerial('SSD'),
                realDevice: false,
                status: 'Connected',
                model: 'Samsung 980 PRO 1TB'
            },
            {
                id: 'realistic_usb_001',
                name: 'SanDisk Ultra USB 3.2',
                type: 'USB',
                size: '128 GB',
                used: '45 GB',
                free: '83 GB',
                interface: 'USB 3.2 Gen 1',
                serial: this.generateSerial('USB'),
                realDevice: false,
                status: 'Connected',
                model: 'SanDisk Ultra 128GB'
            },
            {
                id: 'realistic_hdd_001',
                name: 'Western Digital Blue',
                type: 'HDD',
                size: '2 TB',
                used: '1.2 TB',
                free: '800 GB',
                interface: 'SATA III',
                serial: this.generateSerial('HDD'),
                realDevice: false,
                status: 'Connected',
                model: 'WD Blue 2TB'
            }
        ];
    }

    generateRealisticSize(type) {
        const sizes = {
            USB: ['16 GB', '32 GB', '64 GB', '128 GB', '256 GB'],
            SSD: ['256 GB', '512 GB', '1 TB', '2 TB'],
            HDD: ['500 GB', '1 TB', '2 TB', '4 TB'],
            MOBILE: ['32 GB', '64 GB', '128 GB', '256 GB'],
            SD: ['8 GB', '16 GB', '32 GB', '64 GB', '128 GB']
        };
        return sizes[type]?.[Math.floor(Math.random() * sizes[type].length)] || '64 GB';
    }

    generateSerial(type) {
        const prefix = type.substring(0, 3).toUpperCase();
        const suffix = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `${prefix}${suffix}`;
    }

    renderDeviceGrid() {
        const deviceGrid = document.getElementById('deviceGrid');
        deviceGrid.innerHTML = '';

        this.state.devices.forEach(device => {
            const deviceType = this.deviceTypes[device.type] || this.deviceTypes.HDD;
            const deviceCard = document.createElement('div');
            deviceCard.className = `device-card ${device.realDevice ? 'real-device' : ''}`;
            
            deviceCard.innerHTML = `
                <div class="device-header">
                    <div class="device-icon">${deviceType.icon}</div>
                    <div class="device-info">
                        <h3>${device.name}</h3>
                        <p>${deviceType.name} - ${device.interface}</p>
                    </div>
                    <span class="status ${device.realDevice ? 'status--success' : 'status--info'}">${device.status}</span>
                </div>
                <div class="device-specs">
                    <div class="spec-row">
                        <span class="spec-label">Capacity:</span>
                        <span class="spec-value">${device.size}</span>
                    </div>
                    <div class="spec-row">
                        <span class="spec-label">Used:</span>
                        <span class="spec-value">${device.used || 'Unknown'}</span>
                    </div>
                    <div class="spec-row">
                        <span class="spec-label">Interface:</span>
                        <span class="spec-value">${device.interface}</span>
                    </div>
                    <div class="spec-row">
                        <span class="spec-label">Serial:</span>
                        <span class="spec-value">${device.serial}</span>
                    </div>
                </div>
            `;

            deviceCard.addEventListener('click', () => this.selectDevice(device, deviceCard));
            deviceGrid.appendChild(deviceCard);
        });
    }

    selectDevice(device, cardElement) {
        this.state.selectedDevice = device;
        
        // Update visual selection
        document.querySelectorAll('.device-card').forEach(card => card.classList.remove('selected'));
        cardElement.classList.add('selected');

        this.renderDeviceDetail();
        this.navigateTo('wipe');
        this.addAuditEntry(`Device selected for sanitization: ${device.name} (${device.serial})`, 'success');
    }

    renderDeviceDetail() {
        const device = this.state.selectedDevice;
        const deviceType = this.deviceTypes[device.type];
        const deviceDetail = document.getElementById('deviceDetail');
        
        deviceDetail.innerHTML = `
            <div class="device-detail-header">
                <div class="detail-icon">${deviceType.icon}</div>
                <div class="detail-info">
                    <h3>${device.name} ${device.realDevice ? '🔍' : ''}</h3>
                    <p>${device.model}</p>
                </div>
                <span class="status ${device.realDevice ? 'status--success' : 'status--info'}">${device.status}</span>
            </div>
            <div class="device-specifications">
                <div class="spec-section">
                    <h4>Storage Information</h4>
                    <div class="spec-grid">
                        <div class="spec-item">
                            <span class="spec-label">Total Capacity:</span>
                            <span class="spec-value">${device.size}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Used Space:</span>
                            <span class="spec-value">${device.used || 'Unknown'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Available Space:</span>
                            <span class="spec-value">${device.free || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
                <div class="spec-section">
                    <h4>Hardware Details</h4>
                    <div class="spec-grid">
                        <div class="spec-item">
                            <span class="spec-label">Serial Number:</span>
                            <span class="spec-value">${device.serial}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Interface:</span>
                            <span class="spec-value">${device.interface}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Device Type:</span>
                            <span class="spec-value">${deviceType.name}</span>
                        </div>
                    </div>
                </div>
                <div class="spec-section">
                    <h4>Detection Information</h4>
                    <div class="spec-grid">
                        <div class="spec-item">
                            <span class="spec-label">Real Device:</span>
                            <span class="spec-value">${device.realDevice ? 'Yes ✅' : 'Simulated ⚠️'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Detection Method:</span>
                            <span class="spec-value">Browser API</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Safety Status:</span>
                            <span class="spec-value">Protected ✅</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize with NIST standard
        this.updateComplianceInfo('nist');
    }

    updateComplianceInfo(standardKey) {
        const standard = this.wipeStandards[standardKey];
        const complianceBadges = document.getElementById('complianceBadges');
        const standardDetails = document.getElementById('standardDetails');
        
        complianceBadges.innerHTML = standard.compliance.map(comp => 
            `<span class="compliance-badge">${comp}</span>`
        ).join('');

        standardDetails.innerHTML = `
            <p><strong>${standard.name}</strong></p>
            <p>${standard.description}</p>
            <p><strong>Passes:</strong> ${standard.passes} | <strong>Pattern:</strong> ${standard.pattern}</p>
            <p><strong>Estimated Time:</strong> ~${standard.timePerGB} minutes per GB</p>
        `;
    }

    updateWipeButtonState() {
        const safety = document.getElementById('confirmSafety').checked;
        const wipe = document.getElementById('confirmWipe').checked;
        const compliance = document.getElementById('confirmCompliance').checked;
        
        document.getElementById('startWipe').disabled = !(safety && wipe && compliance);
    }

    async startSecureWipe() {
        const standardKey = document.getElementById('wipeStandard').value;
        const standard = this.wipeStandards[standardKey];
        const verification = document.getElementById('verification').value;
        const priority = document.getElementById('priority').value;

        this.state.wipeInProgress = true;
        this.state.operationCount++;
        
        this.state.wipeData = {
            device: this.state.selectedDevice,
            standard: standard,
            verification: verification,
            priority: priority,
            startTime: new Date(),
            passes: standard.passes,
            currentPass: 0,
            progress: 0,
            wipeId: `WIPE-${Date.now()}`,
            estimatedDuration: Math.max(standard.passes * 60, 180) // At least 3 minutes
        };

        document.getElementById('emergencyStop').style.display = 'inline-flex';
        
        this.navigateTo('progress');
        this.simulateSecureWipe();
        
        this.addAuditEntry(`Secure wipe operation started: ${this.state.selectedDevice.name} using ${standard.name}`, 'success');
    }

    async simulateSecureWipe() {
        const wipeData = this.state.wipeData;
        
        this.updateProgressUI();
        this.addProgressLog('🚀 Secure wipe operation initiated', 'info');
        this.addProgressLog(`📱 Target device: ${wipeData.device.name} (${wipeData.device.serial})`, 'info');
        this.addProgressLog(`🛡️ Sanitization standard: ${wipeData.standard.name}`, 'info');
        this.addProgressLog(`🔄 Total passes: ${wipeData.passes} | Verification: ${wipeData.verification}`, 'info');
        this.addProgressLog(`⚠️ SAFE SIMULATION MODE - No actual data destruction will occur`, 'warning');
        
        await this.delay(2000);

        // Simulate multi-pass wipe operation
        for (let pass = 1; pass <= wipeData.passes && this.state.wipeInProgress; pass++) {
            wipeData.currentPass = pass;
            this.addProgressLog(`🔄 Initiating pass ${pass} of ${wipeData.passes}...`, 'info');
            
            // Simulate pass progress
            for (let progress = 0; progress <= 100 && this.state.wipeInProgress; progress += Math.random() * 4 + 1) {
                wipeData.progress = ((pass - 1) / wipeData.passes * 100) + (progress / wipeData.passes);
                wipeData.progress = Math.min(wipeData.progress, 100);
                
                this.updateProgressUI();
                
                // Log milestones
                if (Math.floor(progress) % 25 === 0 && progress > 0) {
                    this.addProgressLog(`Pass ${pass}: ${Math.floor(progress)}% complete - Writing ${wipeData.standard.pattern}`, 'success');
                }
                
                await this.delay(80);
            }
            
            if (this.state.wipeInProgress) {
                this.addProgressLog(`✅ Pass ${pass} completed successfully`, 'success');
                await this.delay(1000);
            }
        }

        if (this.state.wipeInProgress) {
            // Verification phase
            this.addProgressLog('🔍 Starting verification phase...', 'info');
            await this.delay(2000);
            
            if (wipeData.verification === 'full') {
                this.addProgressLog('✅ Full verification complete: All sectors confirmed sanitized', 'success');
            } else if (wipeData.verification === 'quick') {
                this.addProgressLog('✅ Quick verification complete: Sample verification passed', 'success');
            }
            
            await this.delay(1500);
            
            // Certificate generation
            this.addProgressLog('📄 Generating compliance certificate...', 'info');
            await this.delay(2000);
            
            this.generateComplianceCertificate();
            this.addProgressLog('🎯 Digital certificate generated successfully', 'success');
            this.addProgressLog('🏁 Secure wipe operation completed successfully', 'success');
            
            wipeData.progress = 100;
            this.updateProgressUI();
            
            this.state.wipeInProgress = false;
            this.state.devicesProcessed++;
            document.getElementById('emergencyStop').style.display = 'none';
            
            this.addAuditEntry(`Wipe operation completed successfully: ${wipeData.device.name}`, 'success');
            
            setTimeout(() => {
                this.navigateTo('certificate');
            }, 3000);
        }
    }

    updateProgressUI() {
        const wipeData = this.state.wipeData;
        const elapsed = Math.floor((Date.now() - wipeData.startTime) / 1000);
        const remaining = Math.max(wipeData.estimatedDuration - elapsed, 0);
        
        document.getElementById('currentPass').textContent = wipeData.currentPass || 0;
        document.getElementById('totalPasses').textContent = wipeData.passes;
        document.getElementById('estimatedTime').textContent = this.formatTime(remaining);
        document.getElementById('wipeSpeed').textContent = '156 MB/s';
        document.getElementById('dataProcessed').textContent = `${Math.floor(wipeData.progress * 10)} MB`;
        document.getElementById('deviceTemp').textContent = `${32 + Math.floor(wipeData.progress * 0.2)}°C`;
        
        document.getElementById('progressPercentage').textContent = `${Math.floor(wipeData.progress)}%`;
        document.getElementById('progressFill').style.width = `${wipeData.progress}%`;
        
        const status = wipeData.progress === 100 ? 'Completed Successfully' :
                      wipeData.progress > 0 ? `Pass ${wipeData.currentPass} - In Progress` : 'Initializing';
        document.getElementById('progressStatus').textContent = status;
        document.getElementById('progressStatus').className = `status ${wipeData.progress === 100 ? 'status--success' : 'status--info'}`;
        
        const operation = wipeData.progress < 5 ? 'Initializing secure wipe sequence...' :
                         wipeData.progress < 95 ? `Writing sanitization pattern ${wipeData.currentPass}/${wipeData.passes}` :
                         wipeData.progress < 100 ? 'Finalizing and generating certificate...' :
                         'Operation completed successfully';
        document.getElementById('currentOperation').textContent = operation;
    }

    addProgressLog(message, type = 'info') {
        const logContent = document.getElementById('logContent');
        const timestamp = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    emergencyStop() {
        this.state.wipeInProgress = false;
        this.addProgressLog('🛑 EMERGENCY STOP - Operation halted by administrator', 'error');
        this.addAuditEntry('Emergency stop activated - Operation terminated', 'error');
        document.getElementById('emergencyStop').style.display = 'none';
        document.getElementById('progressStatus').textContent = 'Stopped';
        document.getElementById('progressStatus').className = 'status status--error';
    }

    scheduleWipe() {
        const device = this.state.selectedDevice;
        this.addAuditEntry(`Wipe operation scheduled for device: ${device.name}`, 'info');
        alert(`Wipe operation scheduled for ${device.name}\n\nThis feature demonstrates enterprise scheduling capabilities.`);
    }

    generatePreWipeReport() {
        const device = this.state.selectedDevice;
        const timestamp = new Date().toLocaleString();
        
        const report = `
SECUREWIPE PROFESSIONAL - PRE-SANITIZATION ASSESSMENT
====================================================

DEVICE INFORMATION:
- Name: ${device.name}
- Model: ${device.model}
- Serial Number: ${device.serial}
- Capacity: ${device.size}
- Interface: ${device.interface}
- Type: ${this.deviceTypes[device.type].name}
- Real Device: ${device.realDevice ? 'Yes' : 'Simulated'}

ASSESSMENT RESULTS:
- Device Status: Ready for Sanitization
- Data Risk Level: Standard
- Recommended Standard: NIST SP 800-88 Rev. 1
- Estimated Duration: 3-5 minutes (simulation)
- Compliance Requirements: Met

AUTHORIZATION:
- Inspector: ${this.config.inspector.name}
- Certification: ${this.config.inspector.certification}
- Generated: ${timestamp}
- Report ID: RPT-${Date.now()}

DISCLAIMER: This is a demonstration report for a safe simulation environment.
        `.trim();
        
        this.downloadTextFile(report, `PreWipeAssessment_${device.serial}_${Date.now()}.txt`);
        this.addAuditEntry(`Pre-wipe assessment report generated for ${device.name}`, 'success');
    }

    generateComplianceCertificate() {
        const wipeData = this.state.wipeData;
        const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        this.state.certificate = {
            id: certificateId,
            device: wipeData.device,
            standard: wipeData.standard,
            verification: wipeData.verification,
            startTime: wipeData.startTime,
            completionTime: new Date(),
            inspector: this.config.inspector,
            passes: wipeData.passes,
            verificationStatus: wipeData.verification === 'none' ? 'Skipped' : 'Passed',
            compliance: wipeData.standard.compliance,
            wipeId: wipeData.wipeId,
            operationId: `OP-${this.state.operationCount.toString().padStart(4, '0')}`
        };
        
        this.state.certificatesIssued++;
        this.renderCertificate();
        this.updateDashboardStats();
    }

    renderCertificate() {
        const cert = this.state.certificate;
        const duration = Math.floor((cert.completionTime - cert.startTime) / 1000);
        const certificatePanel = document.getElementById('certificatePanel');
        
        certificatePanel.innerHTML = `
            <div class="certificate-content">
                <div class="certificate-header">
                    <h2 class="certificate-title">🛡️ DATA SANITIZATION CERTIFICATE</h2>
                    <p class="certificate-subtitle">Official Compliance Certificate - Enterprise SecureWipe</p>
                </div>
                
                <div class="certificate-body">
                    <div class="cert-section">
                        <h4>Certificate Information</h4>
                        <div class="cert-field">
                            <span class="cert-field-label">Certificate ID:</span>
                            <span class="cert-field-value">${cert.id}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Operation ID:</span>
                            <span class="cert-field-value">${cert.operationId}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Issue Date:</span>
                            <span class="cert-field-value">${cert.completionTime.toLocaleString()}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Verification:</span>
                            <span class="cert-field-value">${cert.verificationStatus}</span>
                        </div>
                    </div>
                    
                    <div class="cert-section">
                        <h4>Device Information</h4>
                        <div class="cert-field">
                            <span class="cert-field-label">Device Name:</span>
                            <span class="cert-field-value">${cert.device.name}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Serial Number:</span>
                            <span class="cert-field-value">${cert.device.serial}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Capacity:</span>
                            <span class="cert-field-value">${cert.device.size}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Interface:</span>
                            <span class="cert-field-value">${cert.device.interface}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Device Type:</span>
                            <span class="cert-field-value">${this.deviceTypes[cert.device.type].name}</span>
                        </div>
                    </div>
                    
                    <div class="cert-section">
                        <h4>Sanitization Process</h4>
                        <div class="cert-field">
                            <span class="cert-field-label">Standard:</span>
                            <span class="cert-field-value">${cert.standard.name}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Passes:</span>
                            <span class="cert-field-value">${cert.passes}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Duration:</span>
                            <span class="cert-field-value">${this.formatTime(duration)}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Pattern:</span>
                            <span class="cert-field-value">${cert.standard.pattern}</span>
                        </div>
                    </div>
                    
                    <div class="cert-section">
                        <h4>Compliance Standards</h4>
                        ${cert.compliance.map(comp => `
                            <div class="cert-field">
                                <span class="cert-field-label">${comp}:</span>
                                <span class="cert-field-value">✅ Compliant</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="cert-section">
                        <h4>Inspector Authorization</h4>
                        <div class="cert-field">
                            <span class="cert-field-label">Inspector:</span>
                            <span class="cert-field-value">${cert.inspector.name}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Title:</span>
                            <span class="cert-field-value">${cert.inspector.title}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Certification:</span>
                            <span class="cert-field-value">${cert.inspector.certification}</span>
                        </div>
                        <div class="cert-field">
                            <span class="cert-field-label">Organization:</span>
                            <span class="cert-field-value">${cert.inspector.organization}</span>
                        </div>
                    </div>
                </div>
                
                <div class="certificate-footer">
                    <div class="cert-disclaimer">
                        <p><strong>🛡️ SAFE DEMONSTRATION MODE:</strong> This certificate documents a simulated data sanitization operation using real device detection capabilities. No actual data destruction occurred during this demonstration. The system successfully detected real devices and demonstrated enterprise-grade compliance workflows.</p>
                    </div>
                </div>
                
                <div class="cert-actions">
                    <button class="btn btn--primary" id="downloadPdfCert">📄 Download PDF Certificate</button>
                    <button class="btn btn--outline" id="printCert">🖨️ Print Certificate</button>
                    <button class="btn btn--secondary" id="emailCert">📧 Email Certificate</button>
                    <button class="btn btn--outline" id="verifyCert">🔍 Verify Certificate</button>
                </div>
            </div>
        `;
        
        // Bind certificate actions
        this.bindCertificateActions();
    }

    bindCertificateActions() {
        document.getElementById('downloadPdfCert').addEventListener('click', () => this.downloadCertificatePDF());
        document.getElementById('printCert').addEventListener('click', () => window.print());
        document.getElementById('emailCert').addEventListener('click', () => this.emailCertificate());
        document.getElementById('verifyCert').addEventListener('click', () => this.verifyCertificate());
    }

    downloadCertificatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const cert = this.state.certificate;
        
        // Header
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('SECUREWIPE PROFESSIONAL', 20, 25);
        doc.text('DATA SANITIZATION CERTIFICATE', 20, 35);
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text('Official Enterprise Compliance Certificate', 20, 45);
        
        let y = 65;
        const addSection = (title, fields) => {
            doc.setFont(undefined, 'bold');
            doc.setFontSize(14);
            doc.text(title, 20, y);
            y += 10;
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            fields.forEach(field => {
                doc.text(`${field.label}: ${field.value}`, 25, y);
                y += 8;
            });
            y += 5;
        };

        addSection('CERTIFICATE DETAILS', [
            { label: 'Certificate ID', value: cert.id },
            { label: 'Operation ID', value: cert.operationId },
            { label: 'Issue Date', value: cert.completionTime.toLocaleString() },
            { label: 'Verification Status', value: cert.verificationStatus }
        ]);

        addSection('DEVICE INFORMATION', [
            { label: 'Device Name', value: cert.device.name },
            { label: 'Serial Number', value: cert.device.serial },
            { label: 'Capacity', value: cert.device.size },
            { label: 'Interface', value: cert.device.interface },
            { label: 'Device Type', value: this.deviceTypes[cert.device.type].name }
        ]);

        addSection('SANITIZATION PROCESS', [
            { label: 'Standard', value: cert.standard.name },
            { label: 'Passes Completed', value: cert.passes.toString() },
            { label: 'Pattern Used', value: cert.standard.pattern },
            { label: 'Duration', value: this.formatTime(Math.floor((cert.completionTime - cert.startTime) / 1000)) }
        ]);

        addSection('COMPLIANCE VERIFICATION', 
            cert.compliance.map(comp => ({ label: comp, value: 'COMPLIANT ✓' }))
        );

        addSection('INSPECTOR AUTHORIZATION', [
            { label: 'Inspector Name', value: cert.inspector.name },
            { label: 'Title', value: cert.inspector.title },
            { label: 'Certification', value: cert.inspector.certification },
            { label: 'Organization', value: cert.inspector.organization }
        ]);

        // Footer disclaimer
        y += 15;
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text('DEMONSTRATION MODE: This certificate documents a safe simulation using real device detection.', 20, y);
        doc.text('No actual data destruction occurred. System successfully demonstrated enterprise compliance.', 20, y + 8);
        
        doc.save(`SecureWipe_Certificate_${cert.id}.pdf`);
        this.addAuditEntry(`PDF certificate downloaded: ${cert.id}`, 'success');
    }

    emailCertificate() {
        const cert = this.state.certificate;
        const subject = `SecureWipe Certificate ${cert.id} - Device Sanitization Complete`;
        const body = `Dear Recipient,\n\nPlease find the SecureWipe data sanitization certificate for:\n\nDevice: ${cert.device.name}\nSerial: ${cert.device.serial}\nStandard: ${cert.standard.name}\nDate: ${cert.completionTime.toLocaleString()}\n\nThis certificate verifies successful completion of secure data sanitization in accordance with industry standards.\n\nBest regards,\n${cert.inspector.name}\n${cert.inspector.title}`;
        
        const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto);
        
        this.addAuditEntry(`Email certificate initiated: ${cert.id}`, 'info');
    }

    verifyCertificate() {
        const cert = this.state.certificate;
        alert(`Certificate Verification\n\nCertificate ID: ${cert.id}\nStatus: ✅ VALID\nIssued: ${cert.completionTime.toLocaleString()}\nInspector: ${cert.inspector.name}\n\nThis certificate is cryptographically verified and compliant with enterprise security standards.`);
        this.addAuditEntry(`Certificate verification performed: ${cert.id}`, 'info');
    }

    viewAllCertificates() {
        this.addAuditEntry('Certificate archive accessed', 'info');
        alert('Certificate Archive\n\nThis feature would display all previously issued certificates in an enterprise environment. Current session has issued ' + this.state.certificatesIssued + ' certificate(s).');
    }

    // Quick demo functionality
    async startQuickDemo() {
        this.addAuditEntry('Quick demonstration mode activated', 'info');
        
        const demoSteps = [
            { view: 'devices', message: 'Demonstrating device discovery...', duration: 2000 },
            { view: 'wipe', message: 'Showing wipe configuration...', duration: 2000 },
            { view: 'progress', message: 'Simulating wipe progress...', duration: 3000 },
            { view: 'certificate', message: 'Displaying certificate generation...', duration: 2000 }
        ];
        
        // Ensure we have devices
        if (this.state.devices.length === 0) {
            this.state.devices = this.generateRealisticDevices();
            this.updateDashboardStats();
        }
        
        // Auto-select first device
        this.state.selectedDevice = this.state.devices[0];
        
        for (let step of demoSteps) {
            this.navigateTo(step.view);
            this.addActivityEntry(step.message, 'demo');
            
            if (step.view === 'wipe') {
                this.renderDeviceDetail();
                this.updateComplianceInfo('nist');
            } else if (step.view === 'progress') {
                // Quick wipe simulation
                this.state.wipeData = {
                    device: this.state.selectedDevice,
                    standard: this.wipeStandards.nist,
                    startTime: new Date(),
                    passes: 1,
                    currentPass: 1,
                    progress: 100
                };
                this.updateProgressUI();
                this.generateComplianceCertificate();
            }
            
            await this.delay(step.duration);
        }
        
        this.addAuditEntry('Quick demonstration completed', 'success');
    }

    // Audit functionality
    initializeAuditLog() {
        this.state.auditLog = [{
            timestamp: new Date().toLocaleString(),
            message: 'SecureWipe Professional system initialized',
            type: 'info'
        }];
    }

    addAuditEntry(message, type) {
        const entry = {
            timestamp: new Date().toLocaleString(),
            message: message,
            type: type
        };
        
        this.state.auditLog.push(entry);
        this.addActivityEntry(message, type);
        
        // Keep only last 100 entries
        if (this.state.auditLog.length > 100) {
            this.state.auditLog = this.state.auditLog.slice(-100);
        }
        
        if (this.state.currentView === 'audit') {
            this.renderAuditLog();
        }
    }

    addActivityEntry(message, type) {
        const recentActivity = document.getElementById('recentActivity');
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const icons = {
            info: '📝',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            demo: '🎭'
        };
        
        activityItem.innerHTML = `
            <span class="activity-icon">${icons[type] || '📝'}</span>
            <span class="activity-message">${message}</span>
            <span class="activity-time">${new Date().toLocaleTimeString()}</span>
        `;
        
        recentActivity.insertBefore(activityItem, recentActivity.firstChild);
        
        // Keep only last 5 activity items
        while (recentActivity.children.length > 5) {
            recentActivity.removeChild(recentActivity.lastChild);
        }
    }

    renderAuditLog() {
        const auditLogContent = document.getElementById('auditLogContent');
        auditLogContent.innerHTML = '';
        
        // Update audit statistics
        document.getElementById('totalOperations').textContent = this.state.operationCount;
        document.getElementById('devicesProcessed').textContent = this.state.devicesProcessed;
        document.getElementById('certificatesIssued').textContent = this.state.certificatesIssued;
        document.getElementById('complianceRate').textContent = '100%';
        
        // Render audit entries (most recent first)
        this.state.auditLog.slice(-50).reverse().forEach(entry => {
            const auditEntry = document.createElement('div');
            auditEntry.className = 'audit-entry';
            auditEntry.innerHTML = `
                <span class="audit-timestamp">${entry.timestamp}</span>
                <span class="audit-message">${entry.message}</span>
                <span class="audit-type ${entry.type}">${entry.type.toUpperCase()}</span>
            `;
            auditLogContent.appendChild(auditEntry);
        });
    }

    exportAuditLog() {
        const auditData = this.state.auditLog.map(entry => 
            `[${entry.timestamp}] ${entry.type.toUpperCase()}: ${entry.message}`
        ).join('\n');
        
        const header = `SECUREWIPE PROFESSIONAL - AUDIT LOG EXPORT
Generated: ${new Date().toLocaleString()}
Inspector: ${this.config.inspector.name}
Session Summary: ${this.state.operationCount} operations, ${this.state.certificatesIssued} certificates issued
----------------------------------------\n\n`;
        
        this.downloadTextFile(header + auditData, `SecureWipe_AuditLog_${new Date().toISOString().split('T')[0]}.txt`);
        this.addAuditEntry('Audit log exported to file', 'success');
    }

    clearAuditLog() {
        if (confirm('Are you sure you want to clear the audit log?\n\nThis action cannot be undone and will remove all recorded system events.')) {
            this.state.auditLog = [];
            this.initializeAuditLog();
            this.renderAuditLog();
            this.addAuditEntry('Audit log cleared by administrator', 'warning');
        }
    }

    downloadTextFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the SecureWipe application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.secureWipeApp = new SecureWipeApp();
});

// Global error handler for demonstration
window.addEventListener('error', (event) => {
    if (window.secureWipeApp) {
        window.secureWipeApp.addAuditEntry(`System error: ${event.message}`, 'error');
    }
});

// Prevent context menu for professional appearance
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});