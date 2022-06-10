const admin = require("firebase-admin");
const express = require("express");

const serviceAccount = require("./permissions.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fir-api-9a206..firebaseio.com",
});
const db = admin.firestore();

const cors = require("cors");
const app = express();
app.use(cors({ origin: true }));

async function initializeMarkForDeletion() {
  (await db.collection("attendees").get()).docs.forEach((doc) =>
    doc.ref.update({ markedForDeletion: false })
  );
}

async function trimNames() {
  (await db.collection("attendees").get()).docs.forEach((doc) =>
    doc.ref.update({
      firstName: doc.data().firstName.trim(),
      lastName: doc.data().lastName.trim(),
    })
  );
}

trimNames();
