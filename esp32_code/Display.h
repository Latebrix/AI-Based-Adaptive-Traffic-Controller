#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>
#include <LiquidCrystal_I2C.h>
#include "Config.h"

// we use one library object for two screens by swapping wires back and forth!
extern LiquidCrystal_I2C lcd;

// flip the switch to talk to LCD #1
void selectScreen1();

// flip the switch to talk to LCD #2
void selectScreen2();

// we create these special drawings (arrows, X's) so the screen knows what they look like
void createCharsOnCurrentScreen();

// helper to draw one of our special drawings at a specific position
void drawSymbol(int col, String symbol);

// figures out what to draw on the screens based on the message we got from the computer
void handleLCDCommand(String cmd);

#endif // DISPLAY_H
