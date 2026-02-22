// --- Traffic Light Colors and Countdown Setup ---

window.electronAPI.onTimerUpdate((data) => {
    // ensuring the timer is always two digits (05 instead of 5)
    const timeStr = data.time.toString().padStart(2, '0');

    // we show the timer bright over the street that is currently green!
    // the street with the red light gets a dim timer so we know it's just waiting
    if (data.v_state === 'GREEN') {
        document.getElementById('timer-v').style.opacity = 1;
        document.getElementById('timer-h').style.opacity = 0.2;
    } else {
        document.getElementById('timer-v').style.opacity = 0.2;
        document.getElementById('timer-h').style.opacity = 1;
        document.getElementById('timer-h').innerText = timeStr; // show its own wait time
    }

    // always keep the vertical timer ticking
    document.getElementById('timer-v').innerText = timeStr;

    // swap the colors on the mini traffic lights on the screen
    updateLights('v', data.v_state);
    updateLights('h', data.h_state);
});

// helper to turn on a specific color bulb
function updateLights(prefix, state) {
    // turn them all off first by replacing the CSS classes
    document.getElementById(`${prefix}-red`).className = 'light-mini red';
    document.getElementById(`${prefix}-yellow`).className = 'light-mini yellow';
    document.getElementById(`${prefix}-green`).className = 'light-mini green';

    // glow the one that's currently active!
    if (state === 'RED') document.getElementById(`${prefix}-red`).className += ' active';
    if (state === 'YELLOW') document.getElementById(`${prefix}-yellow`).className += ' active';
    if (state === 'GREEN') document.getElementById(`${prefix}-green`).className += ' active';
}
