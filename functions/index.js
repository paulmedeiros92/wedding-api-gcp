const functions = require("firebase-functions");
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
app.use(cors({origin: true}));

app.get("/hello-world", (req, res) => {
  return res.status(200).send("Hello World!");
});

// get guests
app.get("/api/guests", (request, response) => {
  (async () => {
    try {
      const snapshot = await db.collection("guests").get();
      return response.status(200).send({
        status: "Success",
        data: snapshot.docs.map((doc) => doc.data()),
      });
    } catch (error) {
      console.log(error);
      return response.status(500).send(error);
    }
  })();
});

// create guest
app.post("/api/guest", (request, response) => {
  (async () => {
    try {
      await db.collection("guests").add(request.body);
      return response.status(200).send({status: "Success"});
    } catch (error) {
      console.log(error);
      return response.status(500).send(error);
    }
  })();
});

// update guest
app.put("/api/guest/:id", (request, response) => {
  (async () => {
    try {
      await db.collection("guests").doc(request.params.id).set(request.body);
      return response.status(200).send({status: "Success"});
    } catch (error) {
      console.log(error);
      return response.status(500).send(error);
    }
  })();
});

exports.app = functions.https.onRequest(app);
