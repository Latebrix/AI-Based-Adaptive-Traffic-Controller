const canvas = document.getElementById('vision-canvas');
const ctx = canvas.getContext('2d');
const LANE_SPLIT_X = 262; // where the middle of the road is in the picture

// receiving new pictures from the main brain of the app
window.electronAPI.onUpdateImage((data) => {
    const { src, boxes } = data;
    if (!src) return;

    const img = new Image();
    img.onload = () => {
        // resize our drawing board to perfectly match the photo width/height
        const aspectRatio = img.width / img.height;
        canvas.width = 640;
        canvas.height = Math.round(640 / aspectRatio);

        // draw the raw photo on the screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // figuring out how much the photo got shrunk down, so we can draw boxes in the proper tiny spots
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;

        // drawing the yellow dotted line right down the middle of the road
        const splitLineX = LANE_SPLIT_X * scaleX;
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.moveTo(splitLineX, 0);
        ctx.lineTo(splitLineX, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffd700';
        ctx.font = '10px monospace';
        ctx.fillText('LANE SPLIT | X=' + LANE_SPLIT_X, splitLineX + 5, 20);

        // drawing squares around all the cars the AI found!
        if (boxes && boxes.length > 0) {
            boxes.forEach(b => {
                const [ox1, oy1, ox2, oy2] = b.box;
                const x1 = ox1 * scaleX;
                const y1 = oy1 * scaleY;
                const x2 = ox2 * scaleX;
                const y2 = oy2 * scaleY;
                const w = x2 - x1;
                const h = y2 - y1;

                // making trucks red and normal cars green so they are easy to spot
                const classType = b.class || 'car';
                const color = (classType.includes('truck') || classType.includes('bus')) ? '#ff3333' : '#00ff00';

                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.rect(x1, y1, w, h);
                ctx.stroke();

                // put a tiny label showing if it's a car or truck, and a percentage of how sure the AI is
                const confValue = b.confidence || 0;
                ctx.fillStyle = color;
                ctx.fillRect(x1, y1 - 14, Math.max(w, 60), 14);

                ctx.fillStyle = '#000';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(`${classType.toUpperCase()} ${(confValue * 100).toFixed(0)}%`, x1 + 2, y1 - 3);
            });
        }
    };
    img.src = src;
});

// show or hide the "SCANNING..." spinning circle overlay whenever we are thinking
window.electronAPI.onShowSpinner((show) => {
    const el = document.getElementById('loader');
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
});
