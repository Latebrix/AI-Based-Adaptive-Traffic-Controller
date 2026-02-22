// --- Updating the Dashboard Numbers and Colors ---

// listening for the main math results to finish and update the screen
window.electronAPI.onDataUpdate((data) => {
    // 0. Update the big scenario badge at the top
    const badge = document.getElementById('scenario-badge');
    if (data.activeScenario && badge) {
        badge.innerText = `SCENARIO: ${data.activeScenario.replace(/_/g, ' ')}`;

        // turning it red for emergencies, blue for quiet, grey for normal
        if (data.activeScenario.includes('MAX')) {
            badge.style.background = '#aa0000';
            badge.style.borderColor = '#ff3333';
        } else if (data.activeScenario.includes('LOW')) {
            badge.style.background = '#0055aa';
            badge.style.borderColor = '#3399ff';
        } else {
            badge.style.background = '#444';
            badge.style.borderColor = '#666';
        }
    }

    // 1. the time it took the AI to think
    document.getElementById('val-latency').innerText = data.responseTime;

    // 2. showing how many cars we counted
    document.getElementById('val-inc').innerText = data.incomingCount;
    document.getElementById('val-out').innerText = data.outgoingCount;

    // 3. changing the congestion badge color (red = bad, green = good)
    const congEl = document.getElementById('val-congestion');
    congEl.innerText = data.congestionLevel;
    if (data.congestionLevel === 'HEAVY') {
        congEl.style.color = '#ff3333';
        document.getElementById('card-congestion').style.border = '1px solid #ff3333';
    } else if (data.congestionLevel === 'MODERATE') {
        congEl.style.color = '#ffcc00';
        document.getElementById('card-congestion').style.border = '1px solid #ffcc00';
    } else {
        congEl.style.color = '#00ff9d';
        document.getElementById('card-congestion').style.border = '1px solid #333';
    }

    // 4. push the new flow rate to our line graph (the function is inside chart.js!)
    if (typeof addDataToChart === 'function') {
        addDataToChart(data.flowRate);
    }

    // 5. moving the pollution gauge bar
    document.getElementById('val-p-level').innerText = data.pollutionLevel;
    document.getElementById('val-p-status').innerText = data.pollutionStatus;

    // figure out the percentage to fill the bar
    const pPct = Math.min(((data.pollutionLevel - 350) / (1000 - 350)) * 100, 100);
    const fillEl = document.getElementById('gauge-fill');
    fillEl.style.width = Math.max(0, pPct) + '%';

    // changing bar colors
    if (data.pollutionStatus === 'HAZARDOUS') fillEl.style.background = '#cc0000';
    else if (data.pollutionStatus === 'MODERATE') fillEl.style.background = '#cc9900';
    else fillEl.style.background = '#00aa00';

    // 6. plugging our hidden math variables into the screen
    document.getElementById('val-v-density').innerText = data.v_density;
    document.getElementById('val-p-index').innerText = data.p_index;
    document.getElementById('val-j-calc').innerText = data.greenTime;

    // 7. updating the fake LED screens for the reversible lane
    const revEl = document.getElementById('val-rev-lane');
    const lcd1 = document.getElementById('lcd-1-content'); // screen for incoming side
    const lcd2 = document.getElementById('lcd-2-content'); // screen for outgoing side

    revEl.innerText = data.reversibleLane;

    // drawing the big green arrows and red X's on the street-simulated LCDs
    if (data.lcdStatus === 'CLEARING_INC') {
        // waiting for the outgoing cars to clear the left lane so incoming can take it
        revEl.style.color = '#ffcc00';
        revEl.innerText = 'CLEARING...';
        lcd1.innerHTML = '<span class="arrow-up">⬆</span><span class="arrow-up">⬆</span>';
        if (lcd2) lcd2.innerHTML = '<span class="color-red">✖</span><span class="arrow-down">⬇</span>';
    } else if (data.lcdStatus === 'CLEARING_OUT') {
        // waiting for incoming cars to clear their right lane
        revEl.style.color = '#ffcc00';
        revEl.innerText = 'CLEARING...';
        lcd1.innerHTML = '<span class="arrow-up">⬆</span><span class="color-red">✖</span>';
        if (lcd2) lcd2.innerHTML = '<span class="arrow-down">⬇</span><span class="arrow-down">⬇</span>';
    } else if (data.lcdStatus === 'OPEN_INC') {
        // success! the incoming side now has 3 lanes! (one up arrow moved to the other screen)
        revEl.style.color = '#00ff9d';
        revEl.style.textShadow = '0 0 10px rgba(0,255,157,0.5)';
        lcd1.innerHTML = '<span class="arrow-up">⬆</span><span class="arrow-up">⬆</span>';
        if (lcd2) lcd2.innerHTML = '<span class="arrow-up">⬆</span><span class="arrow-down">⬇</span>';
    } else if (data.lcdStatus === 'OPEN_OUT') {
        // success! the outgoing side has an extra lane!
        revEl.style.color = '#00ff9d';
        revEl.style.textShadow = '0 0 10px rgba(0,255,157,0.5)';
        lcd1.innerHTML = '<span class="arrow-up">⬆</span><span class="arrow-down">⬇</span>';
        if (lcd2) lcd2.innerHTML = '<span class="arrow-down">⬇</span><span class="arrow-down">⬇</span>';
    } else {
        // boring normal everyday traffic... 2 lanes each way
        revEl.style.color = '#ccc';
        revEl.style.textShadow = 'none';
        lcd1.innerHTML = '<span class="arrow-up">⬆</span><span class="arrow-up">⬆</span>';
        if (lcd2) lcd2.innerHTML = '<span class="arrow-down">⬇</span><span class="arrow-down">⬇</span>';
    }
});

// updating the tiny status text in the top right corner
window.electronAPI.onUpdateStatus((status) => {
    const cEl = document.getElementById('status-cloud');
    cEl.innerText = status.cloud;
    if (status.cloud.includes('OK') || status.cloud.includes('READY')) cEl.style.color = '#00ff9d';
    else if (status.cloud.includes('ERROR')) cEl.style.color = '#f00';
    else cEl.style.color = '#fff';

    const ctrlEl = document.getElementById('status-ctrl');
    ctrlEl.innerText = status.controller;
    if (status.controller.includes('CONNECTED')) ctrlEl.style.color = '#00ff9d';
    else ctrlEl.style.color = '#007acc';

    const sensorEl = document.getElementById('status-sensor');
    if (sensorEl && status.sensor) {
        sensorEl.innerText = status.sensor;
        if (status.sensor.includes('ACTIVE')) sensorEl.style.color = '#00ff9d';
        else sensorEl.style.color = '#ffcc00';
    }
});

// grabbing logs from the backend and scrolling the log box down whenever a new piece of text drops
window.electronAPI.onUpdateLogs((msg) => {
    const logBox = document.getElementById('log-container');
    const line = document.createElement('div');
    line.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logBox.appendChild(line);

    // auto scroll to stay touching the bottom
    logBox.scrollTop = logBox.scrollHeight;
});
