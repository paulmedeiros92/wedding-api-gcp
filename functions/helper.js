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

async function markNotViewed(first, last) {
  const householdMemberSnapshot = await db
    .collection("attendees")
    .where("markedForDeletion", "==", false)
    .where("firstName", "==", first)
    .where("lastName", "==", last)
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
    if (docs[0].data().hasViewed) {
      docs.forEach((doc) => doc.ref.update({ hasViewed: false }));
    }
  }
}

markNotViewed("Isabelle", "Mitchell");
