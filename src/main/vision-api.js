const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_URL = process.env.API_URL;

class VisionAPI {
    constructor(callbacks) {
        this.sendLog = callbacks.sendLog || console.log;

        // lists to hold fake testing photos
        this.sampleImages = [];
        this.activeImageIndex = 0;
        this.sampleDir = path.join(__dirname, '..', '..', 'sample');
    }

    // loading local photos so we can test without the real camera plugged in!
    loadSampleImages() {
        try {
            const files = fs.readdirSync(this.sampleDir);

            // sort them numerically so the cars flow right
            const imageFiles = files
                .filter(f => /\.(jpg|jpeg|png|gif|bmp)$/i.test(f))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999');
                    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999');
                    return numA - numB;
                });

            this.sampleImages = imageFiles.map(f => path.join(this.sampleDir, f));
            console.log(`Loaded ${this.sampleImages.length} sample images.`);
        } catch (e) {
            console.error('Error loading sample images:', e);
            this.sampleImages = [];
        }
    }

    getSampleImageCount() {
        return this.sampleImages.length;
    }

    // grab the next fake photo to test with
    getNextSampleImage() {
        if (this.sampleImages.length === 0) {
            this.sendLog('[ERROR] No sample images found in sample folder!');
            return null;
        }

        const imagePath = this.sampleImages[this.activeImageIndex];
        const cycleNum = this.activeImageIndex + 1;
        this.sendLog(`--- CYCLE ${cycleNum}/${this.sampleImages.length} [${path.basename(imagePath)}] ---`);

        // loop back if we reached the end
        this.activeImageIndex = (this.activeImageIndex + 1) % this.sampleImages.length;

        return fs.readFileSync(imagePath);
    }

    // push the picture to our YOLO AI space and see how many cars there are
    async analyzeImage(imageBuffer) {
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

        try {
            const response = await axios.post(API_URL, form, {
                headers: { ...form.getHeaders() },
                timeout: 15000
            });
            return response.data.detections || [];
        } catch (err) {
            throw err;
        }
    }
}

module.exports = { VisionAPI };
