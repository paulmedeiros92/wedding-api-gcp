const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const crypto = require("crypto");

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

// get households
app.get("/api/households", (request, response) => {
  (async () => {
    try {
      const snapshot = await db.collection("households").get();
      return response.status(200).send({
        message: "Success: Got households",
        data: snapshot.docs.map((doc) => doc.data()),
      });
    } catch (error) {
      console.log(error);
      return response.status(500)
          .send({message: "Fail: Did not get households"});
    }
  })();
});

// create households
app.post("/api/households", (request, response) => {
  (async () => {
    const enriched = request.body.map((household) => {
      household.hashWord = crypto.randomBytes(5).toString("hex");
      household.hasViewed = false;
      household.isAttending = false;
      household.isMailed = false;
      return household;
    });
    try {
      await Promise.all(enriched.map(async (household) => {
        return db.collection("households").doc(household.hashWord)
            .set(household);
      }));
      return response.status(200)
          .send({message: "Success: Added all households"});
    } catch (error) {
      console.log(error);
      return response.status(500)
          .send({message: "Fail: Did not add all households"});
    }
  })();
});

// update household
app.put("/api/households/:id", (request, response) => {
  (async () => {
    try {
      const household = await db.collection("households")
          .doc(request.params.id).get();
      if (household.exists) {
        await db.collection("households")
            .doc(request.params.id).set(request.body);
        return response.status(200)
            .send({message: `Success: Updated ${request.params.id} household`});
      } else {
        return response.status(404).send(
            {message: `Fail: Household "${request.params.id}" not found`}
        );
      }
    } catch (error) {
      console.log(error);
      return response.status(500).send(error);
    }
  })();
});

exports.app = functions.https.onRequest(app);
