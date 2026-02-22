#ifndef CAMERA_H
#define CAMERA_H

#include <Arduino.h>
#include "esp_camera.h"
#include <libb64/cencode.h>
#include "Config.h"
#include "Display.h" 

// turns on the camera sensor using all the pins we defined
void initCamera();

// takes a picture, converts it to base64 text, and prints it to the computer
void captureAndSendImage();

#endif // CAMERA_H
