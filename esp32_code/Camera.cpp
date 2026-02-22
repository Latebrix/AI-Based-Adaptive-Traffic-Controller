#include "Camera.h"

// setting up all the internal settings the camera needs to turn on
void initCamera() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    
    // the camera SHARES these two wires with LCD Screen 1!
    config.pin_sccb_sda = LCD1_SDA;  
    config.pin_sccb_scl = LCD1_SCL;  
    
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    
    // figure out how much RAM we have so we know how big the picture can be
    if(psramFound()) {
        config.frame_size = FRAMESIZE_VGA;  // 640x480 resolution
        config.jpeg_quality = 10;
        config.fb_count = 1; // only keep 1 picture in memory so it's always fresh
    } else {
        config.frame_size = FRAMESIZE_VGA;  // 640x480 resolution
        config.jpeg_quality = 12;
        config.fb_count = 1;
    }
    
    esp_camera_init(&config);
}

// taking the photo and sending it to the Node.js computer app
void captureAndSendImage() {
    // 1. switch the shared wires so they are talking to the Camera/Screen1 side
    selectScreen1();
    
    // 2. flush the camera memory!
    // sometimes the camera holds onto an old blurry photo. This "dummy grab" throws it in the trash.
    camera_fb_t* fb = esp_camera_fb_get(); 
    esp_camera_fb_return(fb); 
    
    // 3. take the REAL, fresh photo!
    fb = esp_camera_fb_get();
    if(!fb) { 
        Serial.println("[CAM] Fail"); 
        return; 
    }
    
    // tell the Node.js app we are about to start sending a massive block of text
    Serial.println("IMG_START");
    
    // 4. convert the raw image data into "Base64" (which just turns pictures into extremely long text strings)
    char *input = (char *)fb->buf;
    size_t inputLen = fb->len;
    int encodedLen = 4 * ((inputLen + 2) / 3);
    char* encoded = (char*)malloc(encodedLen + 1);
    
    if(encoded) {
        base64_encodestate _state;
        base64_init_encodestate(&_state);
        int len = base64_encode_block(input, inputLen, encoded, &_state);
        base64_encode_blockend(encoded + len, &_state);
        
        // 5. send the text over the USB cable in small chunks so we don't crash
        size_t offset = 0;
        size_t totalLen = strlen(encoded);
        while (offset < totalLen) {
            size_t chunkSize = min((size_t)1024, totalLen - offset);
            Serial.write(encoded + offset, chunkSize);
            offset += chunkSize;
        }
        Serial.println(); // add a blank line at the end
        free(encoded);    // clean up memory
    }
    
    // tell the Node.js app the picture text is finished sending
    Serial.println("IMG_END");
    
    // give the memory space back to the camera
    esp_camera_fb_return(fb);
}
