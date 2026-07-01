// app.js - Frontend Orchestration Logic
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const nodesContainer = document.getElementById('nodes-container');
  const addNodeForm = document.getElementById('add-node-form');
  const btnCheckConn = document.getElementById('btn-check-conn');
  const btnBulkSetup = document.getElementById('btn-bulk-setup');
  const btnBulkRdp = document.getElementById('btn-bulk-rdp');
  const btnBulkVnc = document.getElementById('btn-bulk-vnc');
  const btnRunTest = document.getElementById('btn-run-test');
  const btnStopTest = document.getElementById('btn-stop-test');
  const presetCapacityInput = document.getElementById('preset-capacity');
  const btnApplyPreset = document.getElementById('btn-apply-preset');
  const terminalOutput = document.getElementById('terminal-output');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const operationSpinner = document.getElementById('operation-spinner');
  const reportsContainer = document.getElementById('reports-container');
  const btnInstallHostVnc = document.getElementById('btn-install-host-vnc');
  
  // Modal Elements
  const reportModal = document.getElementById('report-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalTextContent = document.getElementById('modal-text-content');
  const modalOverlay = document.querySelector('.modal-overlay');

  let activeOperation = false;
  let eventSource = null;

  // Initial setup
  fetchNodes();
  fetchReports();
  checkActiveOperation();
  setupSSE();

  // 1. Fetch and render nodes
  async function fetchNodes() {
    try {
      const res = await fetch('/api/nodes');
      const nodes = await res.json();
      renderNodes(nodes);
    } catch (e) {
      appendTerminalLine('❌ Error fetching nodes from backend.', 'err');
    }
  }

  function renderNodes(nodes) {
    if (nodes.length === 0) {
      nodesContainer.innerHTML = '<div class="no-reports">No nodes registered yet. Add one below.</div>';
      return;
    }

    nodesContainer.innerHTML = nodes.map(node => {
      const statusClass = node.status || 'unknown';
      const checkedAttribute = 'checked';
      
      return `
        <div class="node-card" data-ip="${node.ip}">
          <div class="node-info-block">
            <input type="checkbox" class="node-checkbox" ${checkedAttribute}>
            <div class="node-details">
              <h4>${node.hostname}</h4>
              <span>${node.ip}</span>
            </div>
          </div>
          <div class="node-status-group">
            <div class="node-capacity-field">
              <label>Limit:</label>
              <input type="number" class="node-cap-val" value="130" min="1" max="200">
            </div>
            <span class="badge ${statusClass}">${statusClass}</span>
            <button class="btn-rdp-node" data-ip="${node.ip}" title="Open Remote Desktop (RDP)">🖥️</button>
            <button class="btn-vnc-launch" data-ip="${node.ip}" title="Open VNC Remote Desktop">📺</button>
            <button class="btn-delete-node" data-ip="${node.ip}" title="Delete Node">&times;</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind delete buttons
    document.querySelectorAll('.btn-delete-node').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const ip = e.target.getAttribute('data-ip');
        if (confirm(`Remove node ${ip}?`)) {
          await deleteNode(ip);
        }
      });
    });

    // Bind RDP buttons
    document.querySelectorAll('.btn-rdp-node').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const ip = e.currentTarget.getAttribute('data-ip');
        try {
          appendTerminalLine(`🔌 Launching Remote Desktop connection to ${ip}...`);
          await fetch('/api/nodes/rdp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip })
          });
        } catch (err) {
          appendTerminalLine(`❌ Failed to request RDP launch for ${ip}`, 'err');
        }
      });
    });

    // Bind VNC launcher buttons
    document.querySelectorAll('.btn-vnc-launch').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const ip = e.currentTarget.getAttribute('data-ip');
        try {
          appendTerminalLine(`🔌 Launching VNC Viewer connection to ${ip}...`);
          const res = await fetch('/api/nodes/vnc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip })
          });
          const data = await res.json();
          if (data.warning) {
            appendTerminalLine(`⚠️ ${data.warning}`);
          }
        } catch (err) {
          appendTerminalLine(`❌ Failed to request VNC launch for ${ip}`, 'err');
        }
      });
    });
  }

  // 2. Add Node
  addNodeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hostname = document.getElementById('node-hostname').value.trim();
    const ip = document.getElementById('node-ip').value.trim();
    const username = document.getElementById('node-user').value.trim();
    const password = document.getElementById('node-pass').value.trim();

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, hostname, username, password })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('node-hostname').value = '';
        document.getElementById('node-ip').value = '';
        fetchNodes();
        appendTerminalLine(`✅ Node ${hostname} (${ip}) added/updated successfully.`);
      }
    } catch (e) {
      appendTerminalLine('❌ Failed to add node.', 'err');
    }
  });

  // 3. Delete Node
  async function deleteNode(ip) {
    try {
      const res = await fetch(`/api/nodes/${ip}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchNodes();
        appendTerminalLine(`🗑️ Node ${ip} removed.`);
      }
    } catch (e) {
      appendTerminalLine(`❌ Failed to delete node ${ip}.`, 'err');
    }
  }

  // 4. Check Connection
  btnCheckConn.addEventListener('click', async () => {
    if (activeOperation) return;
    btnCheckConn.disabled = true;
    appendTerminalLine('⚡ Initiating network connectivity and SSH check...');
    try {
      const res = await fetch('/api/nodes/check', { method: 'POST' });
      const nodes = await res.json();
      renderNodes(nodes);
    } catch (e) {
      appendTerminalLine('❌ Connection check command failed.', 'err');
    } finally {
      btnCheckConn.disabled = false;
    }
  });

  // Apply preset capacity to all node cards
  btnApplyPreset.addEventListener('click', () => {
    const val = presetCapacityInput.value;
    document.querySelectorAll('.node-cap-val').forEach(input => {
      input.value = val;
    });
    appendTerminalLine(`⚙️ Set target limit of ${val} browsers on all nodes.`);
  });

  // 5. Bulk Setup Node
  btnBulkSetup.addEventListener('click', async () => {
    if (activeOperation) return;
    const selectedIps = getSelectedIps();
    if (selectedIps.length === 0) {
      alert('Please select at least one online node to setup.');
      return;
    }

    if (!confirm(`Are you sure you want to perform node installation/setup on: ${selectedIps.join(', ')}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/nodes/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: selectedIps })
      });
      const data = await res.json();
      if (data.success) {
        setOperationState(true);
        appendTerminalLine(`🔧 Setup initiated. Follow console for real-time progress.`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      appendTerminalLine('❌ Failed to trigger node setup.', 'err');
    }
  });

  // 5b. Bulk Enable RDP
  btnBulkRdp.addEventListener('click', async () => {
    if (activeOperation) return;
    const selectedIps = getSelectedIps();
    if (selectedIps.length === 0) {
      alert('Please select at least one node to enable RDP.');
      return;
    }

    if (!confirm(`Are you sure you want to enable Remote Desktop (RDP) on: ${selectedIps.join(', ')}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/nodes/enable-rdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: selectedIps })
      });
      const data = await res.json();
      if (data.success) {
        setOperationState(true);
        appendTerminalLine(`🛡️ Enabling RDP on selected nodes. Follow console for progress.`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      appendTerminalLine('❌ Failed to trigger RDP enablement.', 'err');
    }
  });

  // 5c. Bulk Install VNC
  btnBulkVnc.addEventListener('click', async () => {
    if (activeOperation) return;
    const selectedIps = getSelectedIps();
    if (selectedIps.length === 0) {
      alert('Please select at least one node to install VNC.');
      return;
    }

    if (!confirm(`Are you sure you want to install TightVNC Server on: ${selectedIps.join(', ')}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/nodes/install-vnc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: selectedIps })
      });
      const data = await res.json();
      if (data.success) {
        setOperationState(true);
        appendTerminalLine(`📺 Initiating TightVNC Server installation. Follow console for progress.`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      appendTerminalLine('❌ Failed to trigger VNC installation.', 'err');
    }
  });

  // 6. Launch Coordinated Stress Test
  btnRunTest.addEventListener('click', async () => {
    if (activeOperation) return;
    const selectedIps = getSelectedIps();
    if (selectedIps.length === 0) {
      alert('Please select at least one node to target for stress testing.');
      return;
    }

    const config = selectedIps.map(ip => {
      const card = document.querySelector(`.node-card[data-ip="${ip}"]`);
      const capacity = parseInt(card.querySelector('.node-cap-val').value) || 130;
      return { ip, capacity };
    });

    const totalBrowsers = config.reduce((acc, curr) => acc + curr.capacity, 0);

    if (!confirm(`Launch stress test with a total of ${totalBrowsers} browsers across ${config.length} nodes?`)) {
      return;
    }

    try {
      const res = await fetch('/api/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
      const data = await res.json();
      if (data.success) {
        setOperationState(true);
        appendTerminalLine(`🚀 Distributed stress test launched! Monitoring progress...`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      appendTerminalLine('❌ Failed to launch coordinated test.', 'err');
    }
  });

  // 6b. Emergency Stop Coordinated Stress Test
  btnStopTest.addEventListener('click', async () => {
    if (!confirm('🛑 WARNING: Are you sure you want to FORCE STOP all running tests and kill chrome/node on ALL nodes?')) {
      return;
    }
    
    appendTerminalLine('🛑 Sending emergency stop signal to coordinator server...');
    try {
      const res = await fetch('/api/test/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setOperationState(false);
        appendTerminalLine('🛑 Emergency stop request received. Processes are being killed...', 'err');
      }
    } catch (e) {
      appendTerminalLine('❌ Failed to send emergency stop signal.', 'err');
    }
  });

  // Helper: Get selected IPs
  function getSelectedIps() {
    const checked = [];
    document.querySelectorAll('.node-card').forEach(card => {
      const chk = card.querySelector('.node-checkbox');
      if (chk && chk.checked) {
        checked.push(card.getAttribute('data-ip'));
      }
    });
    return checked;
  }

  // 7. Check operation state
  async function checkActiveOperation() {
    try {
      const res = await fetch('/api/status');
      const status = await res.json();
      setOperationState(status.active);
    } catch (e) {}
  }

  function setOperationState(active) {
    activeOperation = active;
    if (active) {
      btnBulkSetup.disabled = true;
      btnBulkRdp.disabled = true;
      btnBulkVnc.disabled = true;
      btnRunTest.disabled = true;
      btnInstallHostVnc.disabled = true;
      operationSpinner.classList.remove('hidden');
    } else {
      btnBulkSetup.disabled = false;
      btnBulkRdp.disabled = false;
      btnBulkVnc.disabled = false;
      btnRunTest.disabled = false;
      btnInstallHostVnc.disabled = false;
      operationSpinner.classList.add('hidden');
      fetchNodes(); // Refresh statuses
      fetchReports(); // Update reports directory
    }
  }

  // 8. Server-Sent Events (SSE) Log Stream Connection
  function setupSSE() {
    if (eventSource) eventSource.close();
    
    eventSource = new EventSource('/api/stream-logs');
    
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.log) {
        appendTerminalLine(data.log);
        // If operation finished signal is detected in logs, we check status
        if (data.log.includes('Setup finished') || data.log.includes('Distributed test completed')) {
          setOperationState(false);
        }
      }
      if (data.type === 'nodes') {
        data.nodes.forEach(node => {
          updateNodeStatusInDOM(node.ip, node.status);
        });
      }
      if (data.clear) {
        terminalOutput.innerHTML = '';
      }
    };

    function updateNodeStatusInDOM(ip, status) {
      const card = document.querySelector(`.node-card[data-ip="${ip}"]`);
      if (card) {
        const badge = card.querySelector('.badge');
        if (badge) {
          badge.className = `badge ${status}`;
          badge.textContent = status;
        }
      }
    }

    eventSource.onerror = () => {
      // Reconnect in 3s
      setTimeout(setupSSE, 3000);
    };
  }

  // 9. Fetch reports
  async function fetchReports() {
    try {
      const res = await fetch('/api/reports');
      const reports = await res.json();
      renderReports(reports);
    } catch (e) {}
  }

  function renderReports(reports) {
    if (reports.length === 0) {
      reportsContainer.innerHTML = '<div class="no-reports">No reports generated yet.</div>';
      return;
    }

    reportsContainer.innerHTML = reports.map(r => {
      const filesHtml = r.files.map(file => {
        const btnText = file.startsWith('summary_') ? '📊 View Database Summary' : file.replace('report_', '');
        return `<button class="report-file-btn" data-id="${r.id}" data-file="${file}">${btnText}</button>`;
      }).join('');

      let summaryHtml = '';
      if (r.browsers) {
        summaryHtml = `
          <div class="report-summary-badge" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-top: 0.5rem; background: rgba(0,0,0,0.25); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03); font-size: 0.75rem;">
            <div>🤖 <b>Limit:</b> ${r.browsers}</div>
            <div style="color: #10b981;">✅ <b>Success:</b> ${r.success}</div>
            <div style="color: #ef4444;">❌ <b>Failed:</b> ${r.fail}</div>
            <div style="color: #38bdf8;">⚡ <b>Avg:</b> ${(r.avg_latency / 1000).toFixed(2)}s</div>
          </div>
        `;
      }

      return `
        <div class="report-item">
          <div class="report-meta">
            <span class="report-id">${r.id}</span>
            <span class="report-date">${r.timestamp}</span>
          </div>
          ${summaryHtml}
          <div class="report-files" style="margin-top: 0.75rem;">
            ${filesHtml || '<span class="system-line">Only logs preserved</span>'}
          </div>
        </div>
      `;
    }).join('');

    // Bind report click buttons
    document.querySelectorAll('.report-file-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const file = e.target.getAttribute('data-file');
        openReportModal(id, file);
      });
    });
  }

  const btnExportReport = document.getElementById('btn-export-report');
  let currentOpenRunId = null;

  // Open modal & fetch report contents
  async function openReportModal(id, filename) {
    currentOpenRunId = id;
    modalTitle.textContent = `${id} — ${filename}`;
    modalTextContent.textContent = 'Loading report file content...';
    reportModal.classList.remove('hidden');

    try {
      const res = await fetch(`/api/reports/${id}/${filename}`);
      const text = await res.text();
      modalTextContent.textContent = text;
    } catch (e) {
      modalTextContent.textContent = 'Error loading report contents.';
    }
  }

  // Close modal
  function closeModal() {
    reportModal.classList.add('hidden');
    currentOpenRunId = null;
  }

  // Bind Export button in Modal
  btnExportReport.addEventListener('click', () => {
    if (currentOpenRunId) {
      window.location.href = `/api/reports/${currentOpenRunId}/export`;
    }
  });

  btnCloseModal.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);

  // Install Local VNC Viewer on Host PC
  btnInstallHostVnc.addEventListener('click', async () => {
    if (confirm('Download and install TightVNC Viewer silently on your main PC?')) {
      btnInstallHostVnc.disabled = true;
      appendTerminalLine('📥 Triggering TightVNC Viewer silent installation on Host PC...');
      try {
        const res = await fetch('/api/host/install-vnc', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setOperationState(true);
        } else {
          btnInstallHostVnc.disabled = false;
          alert(data.error || 'Failed to trigger installation.');
        }
      } catch (err) {
        btnInstallHostVnc.disabled = false;
        appendTerminalLine('❌ Failed to trigger local VNC installation.', 'err');
      }
    }
  });

  // Clear logs terminal
  btnClearLogs.addEventListener('click', async () => {
    await fetch('/api/clear-logs', { method: 'POST' });
  });

  // Helper: Append line to terminal emulator
  function appendTerminalLine(text, type = '') {
    const div = document.createElement('div');
    if (type === 'err' || text.includes('❌') || text.includes('ERROR')) {
      div.style.color = '#ef4444';
    } else if (text.includes('✅') || text.includes('SUCCESS') || text.includes('complete')) {
      div.style.color = '#10b981';
    } else if (text.includes('🚀') || text.includes('🔧')) {
      div.style.color = '#f59e0b';
    }
    div.textContent = text;
    terminalOutput.appendChild(div);
    
    // Auto-scroll
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }
});
