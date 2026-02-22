#ifndef TRAFFICLIGHTS_H
#define TRAFFICLIGHTS_H

#include <Arduino.h>
#include "Config.h"

// turns every single LED on the model RED (used when swapping traffic phases)
void setAllRed();

// give the green light to the vertical main road for a specific amount of seconds
void setVerticalGreen(int duration);

// give the green light to the horizontal side road
void setHorizontalGreen(int duration);

// sets up the LED pins so Arduino knows they are outputting electricity
void initTrafficLights();

#endif // TRAFFICLIGHTS_H
