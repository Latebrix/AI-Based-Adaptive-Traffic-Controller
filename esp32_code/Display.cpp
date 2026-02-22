#include "Display.h"

// setting up the screen object on the standard address 0x27
LiquidCrystal_I2C lcd(0x27, 16, 2);

// the pixel drawings for our big arrows and X's!
byte arrowUpTop[8]    = {0x00, 0x04, 0x0E, 0x1F, 0x04, 0x04, 0x04, 0x04};
byte arrowUpBot[8]    = {0x04, 0x04, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00};
byte arrowDownTop[8]  = {0x00, 0x00, 0x00, 0x00, 0x04, 0x04, 0x04, 0x04};
byte arrowDownBot[8]  = {0x04, 0x04, 0x04, 0x04, 0x1F, 0x0E, 0x04, 0x00};
byte xMarkTop[8]      = {0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x00, 0x00};
byte xMarkBot[8]      = {0x00, 0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x00};

// tell the ESP32 to send signals out of the pins for Screen 1
void selectScreen1() {
    Wire.end();
    Wire.begin(LCD1_SDA, LCD1_SCL);
    delay(10);
    lcd.init();
    lcd.backlight();
}

// tell the ESP32 to send signals out of the pins for Screen 2
void selectScreen2() {
    Wire.end();
    Wire.begin(LCD2_SDA, LCD2_SCL);
    delay(10);
    lcd.init();
    lcd.backlight();
}

// load our custom arrow pixel art into the screen's memory
// (you have to call this EVERY TIME you switch screens!)
void createCharsOnCurrentScreen() {
    lcd.createChar(0, arrowUpTop);
    lcd.createChar(1, arrowUpBot);
    lcd.createChar(2, arrowDownTop);
    lcd.createChar(3, arrowDownBot);
    lcd.createChar(4, xMarkTop);
    lcd.createChar(5, xMarkBot);
}

// draws a giant two-row symbol using our custom pixel art
void drawSymbol(int col, String symbol) {
    if (symbol == "UP") {
        lcd.setCursor(col, 0); lcd.write(0);
        lcd.setCursor(col, 1); lcd.write(1);
    } else if (symbol == "DOWN") {
        lcd.setCursor(col, 0); lcd.write(2);
        lcd.setCursor(col, 1); lcd.write(3);
    } else if (symbol == "X") {
        lcd.setCursor(col, 0); lcd.write(4);
        lcd.setCursor(col, 1); lcd.write(5);
    }
}

// figuring out what to draw on the screens based on the message from the computer
// example command from the JS file: LCD1:UP,X
void handleLCDCommand(String cmd) {
    bool isScreen1 = cmd.startsWith("LCD1:");
    String content = cmd.substring(5); // cut off the "LCD1:" part
    
    // split the left and right lane instructions
    int commaIdx = content.indexOf(',');
    String leftSymbol = content.substring(0, commaIdx);
    String rightSymbol = content.substring(commaIdx + 1);
    leftSymbol.trim();
    rightSymbol.trim();
    
    if (isScreen1) {
        selectScreen1();
    } else {
        selectScreen2();
    }
    
    // load fonts and wipe the old screen message
    createCharsOnCurrentScreen();
    lcd.clear();
    
    // draw the left lane symbol at column 3, right lane at 12
    drawSymbol(3, leftSymbol);
    drawSymbol(12, rightSymbol);
    
    Serial.printf("[LCD%d] %s,%s\n", isScreen1 ? 1 : 2, leftSymbol.c_str(), rightSymbol.c_str());
}
