const { SerialPort, ReadlineParser } = require('serialport');

const ESP_IMAGE_TIMEOUT = 15000;

class SerialHandler {
    constructor(callbacks) {
        this.port = null;
        this.parser = null;
        this.isSimulation = false;
        
        // callbacks for sending stuff to the app UI
        this.sendLog = callbacks.sendLog || console.log;
        this.broadcastStatus = callbacks.broadcastStatus || (() => {});
        
        // state for building the image chunks
        this.isReceivingImage = false;
        this.imageChunks = [];
        this.espImageResolve = null;
    }

    init() {
        // try to find the ESP32 connection
        SerialPort.list().then(ports => {
            console.log('Available Ports:', ports.map(p => p.path));
            this.sendLog(`Ports: ${ports.map(p => p.path).join(', ') || 'None'}`);

            // connecting to the board using its id
            const espPort = ports.find(p => p.vendorId?.includes('10C4') || p.path.includes('USB') || p.path.includes('COM'));
            
            if (espPort) {
                console.log(`Connecting to ESP32 on ${espPort.path}...`);
                this.port = new SerialPort({ path: espPort.path, baudRate: 115200 });
                this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

                this.parser.on('data', (data) => this.handleSerialData(data));
                
                this.port.on('open', () => {
                    console.log('ESP32 Connected.');
                    this.broadcastStatus('READY', 'CONNECTED', 'SIMULATED');
                });
                
                this.port.on('error', (err) => {
                    console.error('Serial Error:', err.message);
                    this.switchToSimulation();
                });
            } else {
                console.log('No Port Found -> Simulation');
                this.switchToSimulation();
            }
        }).catch(err => {
            console.error('List Error:', err);
            this.switchToSimulation();
        });
    }

    switchToSimulation() {
        if (this.isSimulation) return;
        this.isSimulation = true;
        console.log('[MODE] Switched to SIMULATION');
        this.broadcastStatus('READY', 'SIMULATION', 'SIMULATED');
    }

    // sending text commands to the ESP32 to change lights and screens
    sendCommandToESP32(cmd) {
        if (this.port && this.port.isOpen) {
            this.port.write(cmd + '\n');
            this.sendLog(`[ESP32] TX -> ${cmd}`);
        } else {
            this.sendLog(`[SIM] TX -> ${cmd}`);
        }
    }

    // telling the street screens which arrows or X's to show
    sendLCDState(lcdStatus) {
        // usually both lanes are balanced
        let lcd1 = 'UP,UP';
        let lcd2 = 'DOWN,DOWN';

        switch (lcdStatus) {
            case 'CLEARING_INC':
                // taking a lane from outgoing to give to incoming
                lcd1 = 'UP,X';
                lcd2 = 'DOWN,DOWN';
                break;
            case 'CLEARING_OUT':
                // taking a lane from incoming to give to outgoing
                lcd1 = 'UP,UP';
                lcd2 = 'X,DOWN';
                break;
            case 'OPEN_INC':
                // giving the extra lane completely to the incoming side!
                lcd1 = 'UP,DOWN';
                lcd2 = 'DOWN,DOWN';
                break;
            case 'OPEN_OUT':
                // giving the extra lane completely to the outgoing side!
                lcd1 = 'UP,UP';
                lcd2 = 'UP,DOWN';
                break;
            default:
                // balanced normal traffic
                lcd1 = 'UP,UP';
                lcd2 = 'DOWN,DOWN';
        }

        this.sendCommandToESP32(`LCD1:${lcd1}`);
        this.sendCommandToESP32(`LCD2:${lcd2}`);
    }

    // pause until the ESP32 sends us a full picture
    waitForEspImage() {
        return new Promise((resolve) => {
            this.espImageResolve = resolve;
            
            // if it takes more than 15s, just give up
            setTimeout(() => {
                if (this.espImageResolve) {
                    this.espImageResolve(null);
                    this.espImageResolve = null;
                }
            }, ESP_IMAGE_TIMEOUT);
        });
    }

    // handling the messages sent back from the ESP32
    handleSerialData(data) {
        const line = data.toString().trim();

        if (line === 'IMG_START') {
            this.sendLog('[ESP32] Image transmission starting...');
            this.isReceivingImage = true;
            this.imageChunks = [];
            return;
        }

        if (line === 'IMG_END') {
            this.sendLog('[ESP32] Image transmission complete.');
            this.isReceivingImage = false;

            try {
                // sticking the picture chunks back together!
                const base64Data = this.imageChunks.join('');
                const imgBuffer = Buffer.from(base64Data, 'base64');

                if (this.espImageResolve) {
                    this.espImageResolve(imgBuffer);
                    this.espImageResolve = null;
                }
            } catch (e) {
                this.sendLog(`[ESP32] Image decode error: ${e.message}`);
                if (this.espImageResolve) {
                    this.espImageResolve(null);
                    this.espImageResolve = null;
                }
            }
            this.imageChunks = [];
            return;
        }

        if (this.isReceivingImage) {
            // grab the chunks of the picture as they arrive
            this.imageChunks.push(line);
            return;
        }

        // just normal logs
        this.sendLog(`[ESP32] RX <- ${line}`);
    }
}

module.exports = { SerialHandler };
