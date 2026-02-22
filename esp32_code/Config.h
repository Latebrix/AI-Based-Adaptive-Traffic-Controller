#ifndef CONFIG_H
#define CONFIG_H

// ============== PIN CONFIGURATION ==================
// Camera specific wires (DON'T TOUCH THESE UNLESS YOU KNOW WHAT YOU'RE DOING!)
#define PWDN_GPIO_NUM    -1
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM    21
#define SIOD_GPIO_NUM    26
#define SIOC_GPIO_NUM    27

#define Y9_GPIO_NUM      35
#define Y8_GPIO_NUM      34
#define Y7_GPIO_NUM      39
#define Y6_GPIO_NUM      36
#define Y5_GPIO_NUM      19
#define Y4_GPIO_NUM      18
#define Y3_GPIO_NUM       5
#define Y2_GPIO_NUM       4
#define VSYNC_GPIO_NUM   25
#define HREF_GPIO_NUM    23
#define PCLK_GPIO_NUM    22

// The wires connecting to our real Red/Yellow/Green LEDs on the street model
#define V_RED_PIN     12
#define V_YELLOW_PIN  13
#define V_GREEN_PIN   14
#define H_RED_PIN     15
#define H_YELLOW_PIN  2
#define H_GREEN_PIN   4

// The wires connecting to our two fake LCD street screens
// (Screen 1 is sharing pins 26 and 27 with the camera... it's a bit of a hack but it works!)
#define LCD1_SDA 26
#define LCD1_SCL 27
#define LCD2_SDA 33
#define LCD2_SCL 32

#endif // CONFIG_H
