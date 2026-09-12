// ==================== WEB PUSH NOTIFICATION SERVICE ====================
// Sends real browser/phone push notifications (e.g. for OTP codes) using
// VAPID-authenticated Web Push. Requires these .env vars:
//
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT      e.g. mailto:support@route3.com.pk (optional, has a default)
//
// Generate a key pair once with:  npx web-push generate-vapid-keys
// If these are not set, push notifications are silently skipped — email
// OTP delivery keeps working normally either way.

const webpush = require('web-push');

let vapidConfigured = false;

function initVapid() {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.log('⚠️  Push notifications not configured (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY missing).');
        console.log('   Run `npx web-push generate-vapid-keys` and add them to your .env.');
        vapidConfigured = false;
        return;
    }

    webpush.setVapidDetails(
        VAPID_SUBJECT || 'mailto:support@route3.com.pk',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
    console.log('✅ Push notification service configured');
}

initVapid();

/**
 * Sends the same push payload to a list of stored subscription documents
 * ({ subscription: <PushSubscription JSON> }). Never throws — a failed or
 * unconfigured push never blocks the OTP/email flow that triggered it.
 * Returns which endpoints are dead (410/404) so the caller can clean them up.
 */
async function sendPushToSubscriptions(subscriptionDocs, payload) {
    if (!vapidConfigured || !subscriptionDocs?.length) {
        return { sent: 0, failed: 0, deadEndpoints: [] };
    }

    const body = JSON.stringify(payload);
    let sent = 0, failed = 0;
    const deadEndpoints = [];

    await Promise.all(subscriptionDocs.map(async (doc) => {
        try {
            await webpush.sendNotification(doc.subscription, body);
            sent++;
        } catch (error) {
            failed++;
            if (error.statusCode === 404 || error.statusCode === 410) {
                // The browser/OS says this subscription no longer exists
                // (permission revoked, app uninstalled, etc.) — safe to forget it.
                deadEndpoints.push(doc.subscription.endpoint);
            } else {
                console.error('Push send error:', error.message);
            }
        }
    }));

    return { sent, failed, deadEndpoints };
}

module.exports = {
    sendPushToSubscriptions,
    isPushConfigured: () => vapidConfigured
};