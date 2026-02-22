const { app, BrowserWindow } = require('electron');
const path = require('path');

const { SerialHandler } = require('./src/main/serial-handler');
const { VisionAPI } = require('./src/main/vision-api');
const { processTrafficLogic, getHorizontalPhaseLogic } = require('./src/main/traffic-logic');
const { TrafficPhases } = require('./src/main/traffic-phases');

let mainWindow;

// tracking everything happening on our traffic board
let systemState = {
  incomingCount: 0,
  outgoingCount: 0,
  congestionLevel: 'LIGHT',
  flowRate: 0,
  v_density: 0,
  p_index: 0,
  pollutionLevel: 350,
  pollutionStatus: 'NORMAL',
  greenTime: 30,
  activePhase: 'VERTICAL',
  reversibleLane: 'NORMAL',
  lcdStatus: 'NORMAL',
  responseTime: 0,
  lastImageSrc: '',
  lastDetections: [],
  activeScenario: 'INITIALIZING'
};

let pendingSystemState = null;
let isFirstCycle = true;
let previousCarCount = 0;

// helper function to send logs to the UI screen
function sendLog(msg) {
  console.log(msg);
  if (mainWindow) {
    mainWindow.webContents.send('log-update', msg);
  }
}

// helper to update the top-bar status badges
function broadcastStatus(cloud, controller, sensor) {
  if (mainWindow) {
    mainWindow.webContents.send('status-update', { cloud, controller, sensor });
  }
}

// send all our math results to the frontend!
function broadcastUpdate() {
  if (mainWindow) {
    mainWindow.webContents.send('data-update', systemState);
    mainWindow.webContents.send('image-update', {
      src: systemState.lastImageSrc,
      boxes: systemState.lastDetections
    });
  }
}

function sendTimerUpdate(time, vState, hState) {
  if (mainWindow) {
    mainWindow.webContents.send('timer-update', { time: time, v_state: vState, h_state: hState });
  }
}

// create our modules
const serialHandler = new SerialHandler({
  sendLog,
  broadcastStatus
});

const visionApi = new VisionAPI({
  sendLog
});

// this captures an image and initiates the AI logic
async function performCaptureAndAnalyze(isPrefetch = false) {
  // show a spinning wheel while we wait for AI
  if (mainWindow) mainWindow.webContents.send('show-spinner', true);

  try {
    let imgBuffer;

    if (serialHandler.isSimulation) {
      // grab a fake testing photo if we just running without hardware
      imgBuffer = visionApi.getNextSampleImage();
      if (imgBuffer) {
        await processImage(imgBuffer, isPrefetch, `CYCLE_${visionApi.activeImageIndex}`);
      }
    } else {
      // ask the real camera for a new picture!
      sendLog('[ESP32] Requesting camera capture...');
      serialHandler.sendCommandToESP32('CAM:CAPTURE');

      // wait for it (timeout is 15s)
      imgBuffer = await serialHandler.waitForEspImage();

      if (imgBuffer) {
        sendLog(`[ESP32] Image received (${imgBuffer.length} bytes)!`);
        await processImage(imgBuffer, isPrefetch, 'ESP32_LIVE');
      } else {
        sendLog('[ESP32] Image timeout - using cached data');
      }
    }
  } catch (e) {
    console.error("Capture error:", e);
    sendLog(`Error: ${e.message}`);
  }

  // hide the spinning wheel
  if (mainWindow) mainWindow.webContents.send('show-spinner', false);
}

// calculating all the math after we get our picture
async function processImage(imageBuffer, isPrefetch = false, scenarioName = 'UNKNOWN') {
  const start = Date.now();

  try {
    const detections = await visionApi.analyzeImage(imageBuffer);
    sendLog(`[YOLO] ${detections.length} vehicles detected.`);

    // do the traffic logic math
    const logicResult = processTrafficLogic(detections, isFirstCycle, previousCarCount);

    // tracking cars for our flow rate chart
    if (isFirstCycle) isFirstCycle = false;
    previousCarCount = logicResult.totalCars;

    // update our main system info
    const newState = {
      incomingCount: logicResult.incoming,
      outgoingCount: logicResult.outgoing,
      congestionLevel: logicResult.congestion,
      flowRate: logicResult.flowRate,
      v_density: logicResult.vDensity.toFixed(2),
      p_index: logicResult.pIndex.toFixed(2),
      pollutionLevel: logicResult.pollution,
      pollutionStatus: logicResult.pStatus,
      greenTime: logicResult.greenTime,
      reversibleLane: logicResult.revLane,
      lcdStatus: logicResult.lcd,
      responseTime: Date.now() - start,
      lastImageSrc: 'data:image/jpeg;base64,' + imageBuffer.toString('base64'),
      lastDetections: detections,
      activeScenario: scenarioName
    };

    if (isPrefetch) {
      sendLog(`[BUFFER] Prefetch Done. J=${logicResult.greenTime}s (Will apply next cycle)`);
      pendingSystemState = newState; // queue it for next time!
    } else {
      sendLog(`[APPLY] Initial State. J=${logicResult.greenTime}s`);
      systemState = { ...systemState, ...newState };
      broadcastUpdate();
      runTrafficPhases();
    }

  } catch (err) {
    console.error("API Error:", err.message);
    sendLog(`API Error: ${err.message}`);
    broadcastStatus('ERROR', systemState.controllerStatus || 'UNKNOWN', 'SIMULATED');
  }
}

// keeping track of making the lane reversible
let clearingInProgress = false;
let clearingTimeout = null;

const trafficPhases = new TrafficPhases({
  sendLog,
  sendTimerUpdate,
  triggerPrefetch: () => performCaptureAndAnalyze(true)
});

// traffic light running mechanism
async function runTrafficPhases() {
  // swap in the waiting data if we downloaded an image early!
  if (pendingSystemState) {
    sendLog('[CYCLE] Applying Buffered Data...');
    systemState = { ...systemState, ...pendingSystemState };
    pendingSystemState = null;
  }

  // do we need to swap the lanes right now?
  const needsLaneChange = systemState.lcdStatus && systemState.lcdStatus.includes('OPEN');

  if (needsLaneChange && !clearingInProgress) {
    const isForIncoming = systemState.lcdStatus === 'OPEN_INC';
    sendLog(`[LANE] Starting 10s CLEARING phase for ${isForIncoming ? 'INCOMING' : 'OUTGOING'}...`);

    // show the X on the street screens to safely clear it
    systemState.lcdStatus = isForIncoming ? 'CLEARING_INC' : 'CLEARING_OUT';
    broadcastUpdate();
    serialHandler.sendLCDState(systemState.lcdStatus);

    clearingInProgress = true;

    // wait exactly 10 seconds before actually opening the lane completely
    clearingTimeout = setTimeout(() => {
      sendLog('[LANE] Clearing complete. Opening reversed lane.');
      systemState.lcdStatus = isForIncoming ? 'OPEN_INC' : 'OPEN_OUT';
      broadcastUpdate();
      serialHandler.sendLCDState(systemState.lcdStatus);
      clearingInProgress = false;
    }, 10000);
  } else if (!needsLaneChange) {
    // balanced traffic, no lane borrowing
    broadcastUpdate();
    serialHandler.sendLCDState('BALANCED');
  } else {
    broadcastUpdate();
  }

  // The main green light phase starts!
  const durationV = systemState.greenTime;
  serialHandler.sendCommandToESP32(`TL:V:${durationV}`);
  sendLog(`[PHASE A] Vertical GREEN (${durationV}s)`);

  // run the big timer
  trafficPhases.startDualCountdown(durationV, 'GREEN', 'RED', () => {
    sendLog('[PHASE A] End.');
    serialHandler.sendCommandToESP32('TL:R');

    // math for the fake ghost side street
    const { durationH, h_pollution } = getHorizontalPhaseLogic();
    sendLog(`[PHASE B CALC] Horiz Cars=0, Poll=${h_pollution}, J=${durationH}s`);

    serialHandler.sendCommandToESP32(`TL:H:${durationH}`);
    sendLog(`[PHASE B] Horizontal GREEN (${durationH}s)`);

    // run the timer for the horizontal street next
    trafficPhases.startDualCountdown(durationH, 'RED', 'GREEN', () => {
      sendLog('[PHASE B] End. Looping...');
      runTrafficPhases();
    }, true);
  });
}

// creating our desktop app window UI
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Smart Traffic System',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#0a0a0a'
  });

  mainWindow.loadFile('index.html');
}

// when the app is ready...
app.whenReady().then(() => {
  // get our test photos ready from the folder
  visionApi.loadSampleImages();
  createWindow();

  // once the screen renders, start the ESP32 connection
  mainWindow.webContents.on('did-finish-load', () => {
    serialHandler.init();

    setTimeout(() => {
      if (serialHandler.isSimulation) {
        broadcastStatus('READY', 'SIMULATION', 'SIMULATED');
      }
      sendLog(`System Ready. Found ${visionApi.getSampleImageCount()} sample images.`);

      // start digging into our traffic loop!
      performCaptureAndAnalyze(false);
    }, 1500);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
