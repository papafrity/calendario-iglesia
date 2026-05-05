const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const webpush = require("web-push");

initializeApp();
const db = getFirestore();

const vapidPublicKey = "BPSpnf5a-5PIsSOIU1VsK32Ckrc2WMpdo-Wtq9_GGa5zOHbePB3zw9qMYjyjTCVIR7BqEuyYPbrLByH11qIGZN4";
const vapidPrivateKey = "xA6uTbPIqit83KUC1XfWxFF6vb-LbdOH4nApGqxdvFE";

webpush.setVapidDetails(
  "mailto:soporte@calendarioiglesia.com",
  vapidPublicKey,
  vapidPrivateKey
);

// Función HTTP que el frontend llama después de crear un evento
exports.sendPush = onRequest({ cors: true }, async (req, res) => {
  try {
    const { unitCode, title, date, time, location } = req.body;

    if (!unitCode || !title) {
      res.status(400).json({ error: "Faltan datos: unitCode y title son requeridos." });
      return;
    }

    // Buscar las suscripciones push en la colección de settings del barrio
    const settingsCollection = unitCode + "_settings";
    const subsDoc = await db.collection(settingsCollection).doc("push_subscriptions").get();

    if (!subsDoc.exists) {
      res.json({ sent: 0, message: "No hay suscripciones registradas." });
      return;
    }

    const subscriptions = subsDoc.data().subs || [];
    if (subscriptions.length === 0) {
      res.json({ sent: 0, message: "No hay suscripciones registradas." });
      return;
    }

    const pushTitle = req.body.customTitle || ("Nuevo Evento: " + title);
    let pushBody = req.body.customBody;
    
    if (!pushBody) {
        pushBody = "Día: " + date + " a las " + (time || "ver detalles") + ". " + (location ? "Lugar: " + location : "");
    }

    const payload = JSON.stringify({
      title: pushTitle,
      body: pushBody,
      icon: "images/app-icon.png"
    });

    // Rastrear suscripciones expiradas para limpiarlas
    const expiredIndexes = [];

    const sendPromises = subscriptions.map((sub, index) => {
      return webpush.sendNotification(sub, payload).catch((error) => {
        console.error("Error enviando push al dispositivo " + index + ":", error.statusCode || error);
        if (error.statusCode === 410 || error.statusCode === 404) {
          expiredIndexes.push(index);
        }
      });
    });

    await Promise.all(sendPromises);

    // Limpiar suscripciones expiradas automáticamente
    if (expiredIndexes.length > 0) {
      const cleanedSubs = subscriptions.filter((_, i) => !expiredIndexes.includes(i));
      await db.collection(settingsCollection).doc("push_subscriptions").set({ subs: cleanedSubs });
      console.log("Limpiadas " + expiredIndexes.length + " suscripciones expiradas.");
    }

    const sent = subscriptions.length - expiredIndexes.length;
    console.log("Push enviado a " + sent + " dispositivos en " + settingsCollection);
    res.json({ sent: sent, message: "Notificaciones enviadas." });

  } catch (error) {
    console.error("Error en sendPushOnNewEvent:", error);
    res.status(500).json({ error: error.message });
  }
});
