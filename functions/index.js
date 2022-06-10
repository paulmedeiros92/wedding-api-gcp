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
app.use(cors({ origin: true }));

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
      return response
        .status(500)
        .send({ message: "Fail: Did not get attendees" });
    }
  })();
});

// get householdMembers by address
// requires request body of { address, city, province, country }
app.get("/api/household/:attendeeId", (request, response) => {
  (async () => {
    try {
      const householdMember = (
        await db.collection("attendees").doc(request.params.attendeeId).get()
      ).data();
      const householdMemberDocs = await db
        .collection("attendees")
        .where("address", "==", householdMember.address)
        .where("city", "==", householdMember.city)
        .where("province", "==", householdMember.province)
        .where("country", "==", householdMember.country)
        .get();
      return response.status(200).send({
        message: "Success: Got household",
        data: householdMemberDocs.docs.map((member) => member.data()),
      });
    } catch (error) {
      return response
        .status(500)
        .send({ message: "Fail: Did not get household" });
    }
  })();
});

// search for household with name
app.get("/api/search", (request, response) => {
  (async () => {
    try {
      const firstName =
        request.query.firstName.charAt(0).toUpperCase() +
        request.query.firstName.toLowerCase().slice(1);
      const lastName =
        request.query.lastName.charAt(0).toUpperCase() +
        request.query.lastName.toLowerCase().slice(1);
      const householdMemberSnapshot = await db
        .collection("attendees")
        .where("markedForDeletion", "==", false)
        .where("firstName", "==", firstName)
        .where("lastName", "==", lastName)
        .limit(1)
        .get();
      if (householdMemberSnapshot.size > 0) {
        const householdMember = householdMemberSnapshot.docs[0].data();
        const householdMemberQuerySnap = await db
          .collection("attendees")
          .where("markedForDeletion", "==", false)
          .where("address", "==", householdMember.address)
          .where("city", "==", householdMember.city)
          .where("province", "==", householdMember.province)
          .where("country", "==", householdMember.country)
          .get();
        const docs = householdMemberQuerySnap.docs;
        if (!docs[0].data().hasViewed) {
          docs.forEach((doc) => doc.ref.update({ hasViewed: true }));
        }
        return response.status(200).send({
          message: "Success: Got household",
          data: docs.map((member) => member.data()),
        });
      }
      return response.status(200).send({
        message: "Success: No household members found",
        data: [],
      });
    } catch (error) {
      return response
        .status(500)
        .send({ message: "Fail: Did not find household members" });
    }
  })();
});

// create/update attendees
app.post("/api/attendees", (request, response) => {
  (async () => {
    const enrichedAttendees = request.body.map((attendee) => {
      if (!attendee.hashWord) {
        attendee.hashWord = crypto.randomBytes(12).toString("hex");
        attendee.hasViewed = false;
        attendee.isMailed = false;
        attendee.markedForDeletion = false;
      }
      return attendee;
    });
    try {
      const batch = db.batch();
      enrichedAttendees.forEach((attendee) => {
        const attendeesRef = db.collection("attendees").doc(attendee.hashWord);
        batch.set(attendeesRef, attendee);
      });
      await batch.commit();
      return response
        .status(200)
        .send({ message: "Success: Added all attendees" });
    } catch (error) {
      console.log(error);
      return response
        .status(500)
        .send({ message: "Fail: Did not add all attendees" });
    }
  })();
});

// mark attendee for deletion
app.delete("/api/attendee/:hashWord", (request, response) => {
  try {
    db.collection("attendees")
      .doc(request.params.hashWord)
      .update({ markedForDeletion: true });
    return response
      .status(200)
      .send({ message: "Success: Marked for deletion" });
  } catch (error) {
    return response
      .status(500)
      .send({ message: "Fail: Could not be marked for deletion" });
  }
});

exports.app = functions.https.onRequest(app);
