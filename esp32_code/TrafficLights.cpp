#include "TrafficLights.h"

void initTrafficLights() {
    pinMode(V_RED_PIN, OUTPUT); 
    pinMode(V_YELLOW_PIN, OUTPUT); 
    pinMode(V_GREEN_PIN, OUTPUT);
    
    pinMode(H_RED_PIN, OUTPUT); 
    pinMode(H_YELLOW_PIN, OUTPUT); 
    pinMode(H_GREEN_PIN, OUTPUT);
}

void setAllRed() {
    // vertical road is red
    digitalWrite(V_RED_PIN, HIGH); 
    digitalWrite(V_YELLOW_PIN, LOW); 
    digitalWrite(V_GREEN_PIN, LOW);
    
    // horizontal road is also red
    digitalWrite(H_RED_PIN, HIGH); 
    digitalWrite(H_YELLOW_PIN, LOW); 
    digitalWrite(H_GREEN_PIN, LOW);
    
    Serial.println("[TL] All Red");
}

void setVerticalGreen(int duration) {
    // vertical = GO!
    digitalWrite(V_RED_PIN, LOW); 
    digitalWrite(V_YELLOW_PIN, LOW); 
    digitalWrite(V_GREEN_PIN, HIGH);
    
    // horizontal = STOP!
    digitalWrite(H_RED_PIN, HIGH); 
    digitalWrite(H_YELLOW_PIN, LOW); 
    digitalWrite(H_GREEN_PIN, LOW);
    
    Serial.printf("[TL] V-Green %ds\n", duration);
}

void setHorizontalGreen(int duration) {
    // vertical = STOP!
    digitalWrite(V_RED_PIN, HIGH); 
    digitalWrite(V_YELLOW_PIN, LOW); 
    digitalWrite(V_GREEN_PIN, LOW);
    
    // horizontal = GO!
    digitalWrite(H_RED_PIN, LOW); 
    digitalWrite(H_YELLOW_PIN, LOW); 
    digitalWrite(H_GREEN_PIN, HIGH);
    
    Serial.printf("[TL] H-Green %ds\n", duration);
}
