/* 
   RevOps Control Center - Unified Logic
   Contains logic for: Navigation, Sanitizer, Health Scorer, Workflow Generator
*/

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
});

/* ================= NAVIGATION ================= */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all
            navLinks.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            // Add active to clicked
            link.classList.add('active');

            // Show target tab
            const targetId = link.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

/* ================= TOOL 1: DATA SANITIZER ================= */
let cleanedDataCache = [];

function sanitizeData() {
    const rawData = document.getElementById('rawInput').value;
    const rows = rawData.trim().split('\n');
    const table = document.getElementById('previewTable');
    table.innerHTML = '';

    let isHeader = true;
    cleanedDataCache = []; // Reset cache

    // Heuristic: check first row for delimiter
    let firstRow = rows.find(r => r.trim().length > 0);
    let delimiter = ',';
    if (firstRow) {
        if (firstRow.includes('\t')) delimiter = '\t';
        else if (firstRow.includes('|')) delimiter = '|';
        else if (firstRow.split(',').length < 2 && /\s{2,}/.test(firstRow)) {
            delimiter = /\s{2,}/;
        }
    }

    rows.forEach(row => {
        if (!row.trim()) return;

        const rawCells = row.split(delimiter);
        const tr = document.createElement('tr');
        let cleanedCells = [];

        rawCells.forEach(cell => {
            let text = cell.trim();

            // Date Normalization
            const dateSlashRegex = /(\d{4})\/(\d{2})\/(\d{2})/;
            if (dateSlashRegex.test(text)) {
                text = text.replace(dateSlashRegex, '$1-$2-$3');
            }

            // Currency Formatting
            if (/^\d+$/.test(text) || /^\d+\.\d+$/.test(text)) {
                const val = parseFloat(text);
                if (val > 1000 && (val < 1900 || val > 2100)) {
                    text = '$' + val.toLocaleString();
                }
            }

            const cellEl = document.createElement(isHeader ? 'th' : 'td');
            cellEl.textContent = text;
            tr.appendChild(cellEl);
            cleanedCells.push(text.replace(/\|/g, '\\|'));
        });

        table.appendChild(tr);

        if (isHeader) {
            cleanedDataCache.push(cleanedCells);
            cleanedDataCache.push(cleanedCells.map(() => '---'));
        } else {
            cleanedDataCache.push(cleanedCells);
        }

        if (isHeader) isHeader = false;
    });

    document.getElementById('sanitizerResults').classList.remove('hidden');
}

function copyMarkdownTable() {
    if (!cleanedDataCache || cleanedDataCache.length === 0) {
        alert('No data to copy!');
        return;
    }
    let md = '';
    cleanedDataCache.forEach(row => {
        md += '| ' + row.join(' | ') + ' |\n';
    });
    navigator.clipboard.writeText(md).then(() => alert('Markdown table copied!'));
}

/* ================= TOOL 2: HEALTH SCORER ================= */
function calculateHealth(customer) {
    let score = (customer.frequency * 0.4) - (customer.tickets * 0.2) + (customer.daysRemaining * 0.1);
    return Math.round(score * 10) / 10;
}

function getHealthStatus(score) {
    if (score > 70) return { label: 'Healthy', class: 'status-green', advice: 'Ready for upsell.', mdStatus: '🟢 Healthy', mdAdvice: 'Upsell opportunity' };
    if (score >= 30) return { label: 'Needs Attention', class: 'status-yellow', advice: 'Schedule check-in.', mdStatus: '🟡 Attention', mdAdvice: 'Schedule check-in' };
    return { label: 'Churn Risk', class: 'status-red', advice: 'URGENT: Executive reach-out.', mdStatus: '🔴 Risk', mdAdvice: 'Executive reach-out' };
}

function analyzeHealth() {
    const input = document.getElementById('jsonInput').value;
    try {
        const customers = JSON.parse(input);
        const dashboard = document.getElementById('healthDashboard');
        dashboard.innerHTML = '';

        customers.forEach(customer => {
            const score = calculateHealth(customer);
            const statusInfo = getHealthStatus(score);

            const card = document.createElement('div');
            card.className = `card status-card ${statusInfo.class}`;
            card.innerHTML = `
                <h3>${customer.name}</h3>
                <div class="mt-20">
                    <span class="badge ${statusInfo.class === 'status-green' ? 'bg-green' : statusInfo.class === 'status-yellow' ? 'bg-yellow' : 'bg-red'}">${statusInfo.label}</span>
                    <span style="float:right; font-weight:bold;">Score: ${score}</span>
                </div>
                <div class="mt-20" style="font-size: 0.9rem; color: #666;">
                    <p><strong>Frequency:</strong> ${customer.frequency}</p>
                    <p><strong>Tickets:</strong> ${customer.tickets}</p>
                    <p><strong>Contract:</strong> ${customer.daysRemaining} days left</p>
                </div>
                <div class="mt-20 p-10 advice-box" style="background:#f9f9f9; padding:10px; border-radius:4px; font-style:italic;">
                    "${statusInfo.advice}"
                </div>
            `;
            dashboard.appendChild(card);
        });

        document.getElementById('healthResults').classList.remove('hidden');

    } catch (e) {
        alert('Invalid JSON!');
        console.error(e);
    }
}

function copyHealthMarkdown() {
    const input = document.getElementById('jsonInput').value;
    try {
        const customers = JSON.parse(input);
        let md = '# Customer Health Report\n\n';
        md += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
        md += '| Customer | Score | Status | Recommended Action |\n';
        md += '| :--- | :---: | :--- | :--- |\n';

        customers.forEach(customer => {
            const score = calculateHealth(customer);
            const statusInfo = getHealthStatus(score);
            md += `| **${customer.name}** | ${score} | ${statusInfo.mdStatus} | ${statusInfo.mdAdvice} |\n`;
        });

        navigator.clipboard.writeText(md).then(() => alert('Health Report copied!'));
    } catch (e) {
        alert('Error generating report.');
    }
}

/* ================= TOOL 3: WORKFLOW GENERATOR ================= */
function generateWorkflow() {
    const customerName = document.getElementById('customerName').value || 'New Customer';
    const industry = document.getElementById('industry').value;
    const plan = document.getElementById('plan').value;

    let steps = [];
    steps.push({ task: 'Kickoff Meeting', subtasks: ['Introduce Team', 'Review Goals', 'Set Timeline'] });
    steps.push({ task: 'Account Setup', subtasks: ['Create Org', 'Invite Users'] });

    if (plan === 'Enterprise') {
        steps.push({
            task: 'Security & Compliance',
            subtasks: ['Security Compliance Review', 'SAML/SSO Configuration', 'Dedicated Slack Channel Setup']
        });
    }

    if (industry === 'SaaS') {
        steps.push({
            task: 'Technical Integration',
            subtasks: ['API Integration Guide', 'Webhook Setup', 'Sandbox Testing']
        });
    } else if (industry === 'Finance') {
        steps.push({
            task: 'Audit & Compliance',
            subtasks: ['Audit Log Configuration', 'Data Retention Policy Review']
        });
    } else if (industry === 'Retail') {
        steps.push({
            task: 'POS Integration',
            subtasks: ['Inventory Sync Check', 'Barcode Scanner Setup']
        });
    }

    steps.push({ task: 'Go-Live', subtasks: ['Final Verification', 'Send Welcome Email'] });

    let md = `# Onboarding Plan: ${customerName}\n`;
    md += `**Industry**: ${industry} | **Plan**: ${plan}\n\n`;
    md += `> Generated on ${new Date().toLocaleDateString()}\n\n`;

    steps.forEach((step, index) => {
        md += `### ${index + 1}. ${step.task}\n`;
        step.subtasks.forEach(sub => {
            md += `- [ ] ${sub}\n`;
        });
        md += '\n';
    });

    document.getElementById('workflowOutput').textContent = md;
    document.getElementById('generatorResults').classList.remove('hidden');
}

function copyWorkflowMarkdown() {
    const text = document.getElementById('workflowOutput').textContent;
    navigator.clipboard.writeText(text).then(() => alert('Onboarding Plan copied!'));
}
