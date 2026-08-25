// ==================== APX / SMARTCARGO SHIPMENT-CREATION SYNC ====================
//
// GOAL: whenever a shipment is created on ROUTE3 (create-shipment route), also
// register it with the APX / SmartCargo system so the real courier network
// knows about it and tracking resolves against real data end-to-end.
//
// STATUS: NOT YET CONNECTED TO A REAL ENDPOINT.
// The rest of this codebase only reverse-engineers a READ-ONLY tracking
// lookup on smartcargo-apx.pk (POST /gettracking). There is no documented
// "create shipment" / write API anywhere in this project or publicly, so
// this service intentionally does NOT guess or fabricate one — sending
// unverified POST requests to a real courier's production system could
// create bad data or break things on their end.
//
// TO ACTIVATE REAL SYNCING:
//   1. Get the real "create shipment" endpoint, required fields, and auth
//      method from APX / SmartCargo (ask them for API docs or a partner
//      integration agreement — this is the only safe way to do this).
//   2. Fill in APX_CREATE_ENDPOINT and APX_API_KEY (or whatever auth they
//      require) in your .env file.
//   3. Implement the request body mapping in buildAPXPayload() below to
//      match their actual required schema.
//
// Until then, this module safely no-ops: every shipment still gets created
// normally in the ROUTE3 database, just flagged apxSynced:false so you can
// see which ones are only local.

const https = require('https');

function isConfigured() {
    return Boolean(process.env.APX_CREATE_ENDPOINT);
}

function buildAPXPayload(shipment) {
    // TODO: map to APX's real required field names once documented.
    return {
        reference: shipment.trackingNumber,
        customer_cn: shipment.customerCNumber,
        shipper_name: shipment.shipperName,
        shipper_address: shipment.shipperAddress,
        shipper_phone: shipment.shipperPhone,
        consignee_name: shipment.consigneeName,
        consignee_address: shipment.consigneeAddress,
        consignee_phone: shipment.consigneePhone,
        description: shipment.description,
        weight: shipment.weight,
        pieces: shipment.pieces,
        service: shipment.service,
        origin: shipment.origin,
        destination: shipment.destination
    };
}

/**
 * Attempts to sync a newly created ROUTE3 shipment to APX.
 * NEVER throws — always resolves with a status object, so a failed or
 * unconfigured sync never blocks shipment creation on our own site.
 */
async function syncShipmentToAPX(shipment) {
    if (!isConfigured()) {
        return {
            synced: false,
            status: 'not_configured',
            message: 'APX_CREATE_ENDPOINT not set — shipment saved locally only. See backend/services/apxSyncService.js for setup steps.'
        };
    }

    try {
        const payload = JSON.stringify(buildAPXPayload(shipment));
        const endpoint = new URL(process.env.APX_CREATE_ENDPOINT);

        const result = await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: endpoint.hostname,
                port: endpoint.port || 443,
                path: endpoint.pathname + endpoint.search,
                method: 'POST',
                rejectUnauthorized: false,
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    ...(process.env.APX_API_KEY ? { 'Authorization': `Bearer ${process.env.APX_API_KEY}` } : {})
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                    } catch {
                        resolve({ statusCode: res.statusCode, body: data });
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('APX sync timeout')); });
            req.write(payload);
            req.end();
        });

        if (result.statusCode >= 200 && result.statusCode < 300) {
            return {
                synced: true,
                status: 'synced',
                apxTrackingNumber: result.body?.tracking_no || result.body?.trackingNumber || null,
                message: 'Shipment successfully synced to APX'
            };
        }

        return {
            synced: false,
            status: 'failed',
            message: `APX responded with status ${result.statusCode}`
        };
    } catch (error) {
        return {
            synced: false,
            status: 'error',
            message: error.message
        };
    }
}

module.exports = { syncShipmentToAPX, isConfigured };