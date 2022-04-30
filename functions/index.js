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

// get attendees
app.get("/api/attendees", (request, response) => {
  (async () => {
    try {
      const snapshot = await db.collection("attendees").get();
      return response.status(200).send({
        message: "Success: Got attendees",
        data: snapshot.docs.map((doc) => doc.data()),
      });
    } catch (error) {
      return response.status(500)
          .send({message: "Fail: Did not get attendees"});
    }
  })();
});

// get householdMembers by address
// requires request body of { address, city, province, country }
app.get("/api/household/:attendeeId", (request, response) => {
  (async () => {
    try {
      const householdMember = (await db.collection("attendees")
          .doc(request.params.attendeeId).get()).data();
      const householdMemberDocs = await db.collection("attendees")
          .where("address", "==", householdMember.address)
          .where("city", "==", householdMember.city)
          .where("province", "==", householdMember.province)
          .where("country", "==", householdMember.country).get();
      return response.status(200).send({
        message: "Success: Got household",
        data: householdMemberDocs.docs.map((member) => member.data()),
      });
    } catch (error) {
      return response.status(500)
          .send({message: "Fail: Did not get household"});
    }
  })();
});

// // search for household with name
// app.get("/api/search", (request, response) => {
//   (async () => {
//     try {
//       const households = await db.collection("households")
//           .where(
//               "attendees.firstName",
//               "==",
//               request.body.firstName).get();
//       return response.status(200).send({
//         message: "Success: Got households",
//         data: households.docs.map((doc) => doc.data()),
//       });
//     } catch (error) {
//       return response.status(500)
//           .send({message: "Fail: Did not find households"});
//     }
//   })();
// });


// create/update attendees
app.post("/api/attendees", (request, response) => {
  (async () => {
    const enrichedAttendees = request.body.map((attendee) => {
      if (!attendee.hashWord) {
        attendee.hashWord = crypto.randomBytes(12).toString("hex");
        attendee.hasViewed = false;
        attendee.isAttending = false;
        attendee.isMailed = false;
      }
      return attendee;
    });
    try {
      const batch = db.batch();
      enrichedAttendees
          .forEach((attendee) => {
            const attendeesRef = db.collection("attendees")
                .doc(attendee.hashWord);
            batch.set(attendeesRef, attendee);
          });
      await batch.commit();
      return response.status(200)
          .send({message: "Success: Added all attendees"});
    } catch (error) {
      console.log(error);
      return response.status(500)
          .send({message: "Fail: Did not add all attendees"});
    }
  })();
});

exports.app = functions.https.onRequest(app);
