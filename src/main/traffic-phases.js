class TrafficPhases {
    constructor(callbacks) {
        // callbacks to update the app
        this.sendLog = callbacks.sendLog || console.log;
        this.sendTimerUpdate = callbacks.sendTimerUpdate || (() => { });
        this.triggerPrefetch = callbacks.triggerPrefetch || (() => { });
    }

    // running the countdown timer for the traffic lights
    startDualCountdown(seconds, vState, hState, onComplete, enablePrefetch = false) {
        let timeLeft = seconds;
        let prefetchTriggered = false;

        this.sendTimerUpdate(timeLeft, vState, hState);

        // if the green light time is very short (< 16s), we tell the camera to take the next picture immediately
        if (enablePrefetch && !prefetchTriggered && timeLeft <= 16) {
            this.sendLog('[OPTIMIZATION] Pre-fetching next cycle (Short phase)...');
            this.triggerPrefetch();
            prefetchTriggered = true;
        }

        // tick the clock every 1 second
        const interval = setInterval(() => {
            timeLeft--;

            // grab the next picture exactly 15s before the light turns red!
            if (enablePrefetch && !prefetchTriggered && timeLeft === 15) {
                this.sendLog('[OPTIMIZATION] Pre-fetching next cycle (15s before end)...');
                this.triggerPrefetch();
                prefetchTriggered = true;
            }

            if (timeLeft <= 0) {
                // time's up, stop the timer
                clearInterval(interval);
                onComplete();
            } else {
                // update the screen
                this.sendTimerUpdate(timeLeft, vState, hState);
            }
        }, 1000);
    }
}

module.exports = { TrafficPhases };
