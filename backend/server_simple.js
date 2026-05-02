const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mock data
const shipments = {
    '1350120891': { status: 'Departed from Facility', location: 'Dubai', lastUpdate: '2026-01-21' },
    'TRX12345678': { status: 'In Transit', location: 'Karachi', lastUpdate: '2026-02-14' }
};

app.get('/api/track/:trackingNumber', (req, res) => {
    const data = shipments[req.params.trackingNumber];
    if(data) {
        res.json({ latestStatus: data.status, latestLocation: data.location, lastUpdate: data.lastUpdate });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});