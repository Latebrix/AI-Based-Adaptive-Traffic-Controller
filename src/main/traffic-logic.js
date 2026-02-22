// random number generator helper
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// this is where the camera splits the road - left side vs right side
const LANE_SPLIT_X = 262;

// calculate the traffic data based on cars detected by AI
function processTrafficLogic(detections, isFirstCycle, previousCarCount) {
    let incoming = 0;
    let outgoing = 0;

    // figure out which cars are coming and which are going based on their position on screen
    detections.forEach((d) => {
        const [x1, y1, x2, y2] = d.box;
        const cx = (x1 + x2) / 2;
        const isInc = cx < LANE_SPLIT_X;

        if (isInc) incoming++;
        else outgoing++;
    });

    const totalCars = incoming + outgoing;

    // guessing pollution levels since we don't have a real sensor attached right now
    let pollution = 350;
    if (totalCars <= 2) pollution = getRandomInt(300, 450);
    else if (totalCars <= 5) pollution = getRandomInt(600, 750);
    else pollution = getRandomInt(850, 1000);

    // here is the math to figure out how long the green light should stay on!
    // we divide total cars by 8 because that's the max capacity of our street section
    const vDensity = totalCars / 8.0;

    // a score for how bad the pollution is
    const pIndex = (pollution - 350) / 650.0;

    // J is our green light time formula
    const J = (67.2 * vDensity) + (28.8 * pIndex);
    const greenTime = Math.max(10, Math.round(J));

    // do we need to give an extra lane to the crowded side?
    let revLane = 'NORMAL';
    let lcd = 'BALANCED';
    const LANE_CAPACITY = 4;
    const HIGH_THRESHOLD = Math.ceil(LANE_CAPACITY * 0.75); // 75% full
    const LOW_THRESHOLD = Math.floor(LANE_CAPACITY * 0.50); // 50% empty or full

    if (incoming >= HIGH_THRESHOLD && outgoing <= LOW_THRESHOLD) {
        revLane = 'OPEN_FOR_INCOMING';
        lcd = 'OPEN_INC';
    } else if (outgoing >= HIGH_THRESHOLD && incoming <= LOW_THRESHOLD) {
        revLane = 'OPEN_FOR_OUTGOING';
        lcd = 'OPEN_OUT';
    } else {
        revLane = 'NORMAL';
        lcd = 'BALANCED';
    }

    // how bad is the traffic jamming?
    let congestion = 'LIGHT';
    if (totalCars >= 6) congestion = 'HEAVY';
    else if (totalCars >= 4) congestion = 'MODERATE';

    // how bad is the air quality?
    let pStatus = 'NORMAL';
    if (pollution > 800) pStatus = 'HAZARDOUS';
    else if (pollution > 600) pStatus = 'MODERATE';

    // how fast are cars moving off our street? (flow rate math)
    let flowRate = 0;
    if (!isFirstCycle) {
        const carChange = previousCarCount - totalCars;
        flowRate = greenTime > 0 ? (carChange / greenTime).toFixed(3) : 0;
    }

    return {
        incoming,
        outgoing,
        totalCars,
        pollution,
        vDensity,
        pIndex,
        greenTime,
        revLane,
        lcd,
        congestion,
        pStatus,
        flowRate
    };
}

// pretend the other side street has traffic to calculate its green light time
function getHorizontalPhaseLogic() {
    // we just make up numbers for the horizontal road since we don't have a camera there
    const h_cars = 0;
    const h_pollution = getRandomInt(300, 350);
    const h_vDensity = h_cars / 8.0;
    const h_pIndex = (h_pollution - 350) / 650.0;

    // same J formula as above!
    const h_J = (67.2 * h_vDensity) + (28.8 * Math.max(0, h_pIndex));
    const durationH = Math.max(10, Math.round(h_J));

    return { durationH, h_pollution };
}

module.exports = { processTrafficLogic, getHorizontalPhaseLogic };
