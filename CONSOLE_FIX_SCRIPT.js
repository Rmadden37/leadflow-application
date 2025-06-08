// COPY AND PASTE THIS ENTIRE SCRIPT INTO BROWSER CONSOLE
// Press F12 → Console tab → Paste this script → Press Enter

console.log("🔧 FIXING TONY TIGER LEAD STATUS...");

async function fixTonyTigerStatus() {
  try {
    // Check if Firebase is available
    if (!window.firebase || !window.firebase.firestore) {
      throw new Error("Firebase not found. Make sure you're on the dashboard page.");
    }

    const db = window.firebase.firestore();
    console.log("✅ Firebase connected");

    // Search for Tony Tiger leads
    console.log("🔍 Searching for Tony Tiger leads...");
    
    let snapshot = await db.collection('leads').where('customerName', '==', 'Tony Tiger').get();
    
    if (snapshot.empty) {
      console.log("No leads found with customerName 'Tony Tiger', trying assignedCloserName...");
      snapshot = await db.collection('leads').where('assignedCloserName', '==', 'Tony Tiger').get();
    }

    if (snapshot.empty) {
      console.log("❌ No Tony Tiger leads found");
      alert("❌ No Tony Tiger leads found in database");
      return;
    }

    console.log(`📋 Found ${snapshot.size} lead(s) for Tony Tiger`);

    // Update each lead that has "scheduled" status to "rescheduled"
    let updatedCount = 0;
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n📄 Lead ID: ${doc.id}`);
      console.log(`   Customer: ${data.customerName}`);
      console.log(`   Current Status: ${data.status}`);
      console.log(`   Assigned To: ${data.assignedCloserName}`);

      if (data.status === 'scheduled') {
        console.log(`   🔄 Updating status to "rescheduled"`);
        batch.update(doc.ref, {
          status: 'rescheduled',
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          statusChangeReason: 'Lead was reassigned - changed from scheduled to rescheduled'
        });
        updatedCount++;
      } else {
        console.log(`   ℹ️ Status is already "${data.status}" - no update needed`);
      }
    });

    if (updatedCount > 0) {
      console.log(`\n💾 Committing ${updatedCount} update(s)...`);
      await batch.commit();
      console.log("🎉 SUCCESS! Database updated");
      alert(`🎉 SUCCESS!\n\nUpdated ${updatedCount} Tony Tiger lead(s) to "rescheduled" status.\n\nThe lead will now show a PURPLE calendar icon.\n\nRefresh the page to see the changes!`);
    } else {
      console.log("📝 No updates needed");
      alert("ℹ️ Tony Tiger leads found but no status updates needed.");
    }

  } catch (error) {
    console.error("❌ Error:", error);
    alert(`❌ Error: ${error.message}\n\nMake sure you're:\n1. On the dashboard page\n2. Logged in as admin/manager\n3. Page has fully loaded`);
  }
}

// Execute the fix
fixTonyTigerStatus();
