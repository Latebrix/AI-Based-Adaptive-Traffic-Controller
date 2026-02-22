/**
 * ESP32 WROVER Traffic Control System - MODULAR VERSION
 * 
 * We took the giant file and split it into smaller pieces so it's easier to read!
 * - Config.h:        Holds all our wire/pin numbers.
 * - TrafficLights:   Turns the red/yellow/green LEDs on and off.
 * - Display:         Controls the two LCD screens and draws our arrows/Xs.
 * - Camera:          Takes pictures and sends them to the computer.
 */

#include "Config.h"
#include "TrafficLights.h"
#include "Display.h"
#include "Camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ============== COMMAND HANDLER ==============
// this looks at the text command the computer sent us, and decides which 
// module should handle the job!
void handleCommand(String cmd) {
    // 1. the computer wants a picture
    if (cmd == "CAM:CAPTURE") {
        // we HAVE to make sure the wires are talking to Screen 1 before taking a picture!
        selectScreen1();  
        captureAndSendImage();
    }
    // 2. the computer says "turn on the vertical green light!"
    else if (cmd.startsWith("TL:V:")) {
        int seconds = cmd.substring(5).toInt();
        setVerticalGreen(seconds);
    }
    // 3. the computer says "turn on the horizontal green light!"
    else if (cmd.startsWith("TL:H:")) {
        int seconds = cmd.substring(5).toInt();
        setHorizontalGreen(seconds);
    }
    // 4. the computer says "emergency, make everything red!"
    else if (cmd == "TL:R") {
        setAllRed();
    }
    // 5. the computer wants us to draw on the LCD screens
    else if (cmd.startsWith("LCD1:") || cmd.startsWith("LCD2:")) {
        handleLCDCommand(cmd);
    }
}

// ============== SETUP ==============
// this runs exactly once when we first plug the ESP32 into power
void setup() {
    // this stops the ESP32 from restarting randomly if the power drops slightly
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);  
    
    // start talking to the computer over the USB cable at 115200 speed
    Serial.begin(115200);
    Serial.println("\n--- MODULAR SYSTEM STARTING ---");

    // 1. set up the red/yellow/green LEDs
    initTrafficLights();
    setAllRed();

    // 2. test the screens to make sure they are connected
    selectScreen1();
    lcd.setCursor(0, 0);
    lcd.print("Screen 1 OK");
    
    selectScreen2();
    lcd.setCursor(0, 0);
    lcd.print("Screen 2 OK");
    
    delay(1000);

    // 3. turn on the camera (remember we have to swap to Screen 1 wires first!)
    selectScreen1();
    initCamera();

    // 4. draw the default "2 lanes each way" arrows on the screens
    selectScreen1();
    createCharsOnCurrentScreen();
    lcd.clear();
    drawSymbol(3, "UP");
    drawSymbol(12, "UP");
    
    selectScreen2();
    createCharsOnCurrentScreen();
    lcd.clear();
    drawSymbol(3, "DOWN");
    drawSymbol(12, "DOWN");

    Serial.println("[READY] Waiting for commands...");
}

// ============== MAIN LOOP ==============
// this runs over and over, thousands of times a second forever
void loop() {
    // is the computer sending us a message?
    if (Serial.available()) {
        // read the message until they hit 'enter' (\n)
        String command = Serial.readStringUntil('\n');
        
        // trim off any weird invisible spaces at the end
        command.trim();
        
        // if it wasn't just a blank enter press, do what the command says!
        if (command.length() > 0) {
            handleCommand(command);
        }
    }
}
