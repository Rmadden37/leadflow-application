#!/usr/bin/env node

/**
 * Script to update both Ryan Madden and Rocky Niger to admin roles using Firebase Admin SDK
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// This will use the default credentials from the environment
try {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function findUserByName(searchName, searchTerms) {
  console.log(`🔍 Searching for ${searchName}...`);
  
  try {
    // Get all users and search through them
    const allUsersSnapshot = await db.collection('users').get();
    
    const matchingUsers = [];
    allUsersSnapshot.forEach(doc => {
      const data = doc.data();
      const displayName = (data.displayName || "").toLowerCase();
      const email = (data.email || "").toLowerCase();
      
      // Check if any search term matches the display name or email
      const matches = searchTerms.some(term => 
        displayName.includes(term.toLowerCase()) || email.includes(term.toLowerCase())
      );
      
      if (matches) {
        matchingUsers.push({ id: doc.id, ...data });
      }
    });
    
    if (matchingUsers.length === 0) {
      console.log(`❌ No users found for ${searchName}`);
      return null;
    }
    
    console.log(`Found ${matchingUsers.length} matching users for ${searchName}:`);
    matchingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.displayName || user.email} (${user.id}) - Role: ${user.role}`);
    });
    
    // If there's exactly one user, use that one
    if (matchingUsers.length === 1) {
      console.log(`✅ Using the only matching user for ${searchName}`);
      return matchingUsers[0];
    }
    
    // For multiple matches, try to find the best match
    const bestMatch = matchingUsers.find(user => {
      const displayName = (user.displayName || "").toLowerCase();
      return searchTerms.some(term => displayName === term.toLowerCase());
    });
    
    if (bestMatch) {
      console.log(`✅ Found exact match for ${searchName}: ${bestMatch.displayName}`);
      return bestMatch;
    }
    
    // Return the first match if no exact match
    console.log(`⚠️ Using first match for ${searchName}: ${matchingUsers[0].displayName || matchingUsers[0].email}`);
    return matchingUsers[0];
    
  } catch (error) {
    console.error(`❌ Error searching for ${searchName}:`, error);
    return null;
  }
}

async function updateUserToAdmin(user, userName) {
  if (!user) {
    console.log(`❌ No user provided to update for ${userName}`);
    return false;
  }
  
  console.log(`🔧 Updating ${user.displayName || user.email}'s role to admin...`);
  
  try {
    const batch = db.batch();
    
    // Update user role in users collection
    const userDocRef = db.collection('users').doc(user.id);
    batch.update(userDocRef, {
      role: "admin",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Check if user has a closer record and update/create it
    try {
      const closersSnapshot = await db.collection('closers').where('uid', '==', user.id).get();
      
      const closerDocRef = db.collection('closers').doc(user.id);
      
      if (!closersSnapshot.empty) {
        console.log(`📋 Updating existing closer record for ${userName}...`);
        batch.update(closerDocRef, {
          role: "admin",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        console.log(`📋 Creating new closer record for ${userName}...`);
        batch.set(closerDocRef, {
          uid: user.id,
          name: user.displayName || user.email || userName,
          status: "Off Duty",
          teamId: user.teamId,
          role: "admin",
          avatarUrl: user.avatarUrl || null,
          phone: user.phoneNumber || null,
          lineupOrder: 999,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (closerError) {
      console.log(`⚠️ Warning: Could not check/update closer record for ${userName}:`, closerError.message);
    }
    
    // Commit all changes
    await batch.commit();
    
    console.log(`✅ Successfully updated ${userName}'s role to admin!`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating ${userName}'s role:`, error);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting admin role updates...");
  console.log("==========================================");
  
  // Search for both users
  const ryanUser = await findUserByName("Ryan Madden", ["ryan", "madden", "ryan madden"]);
  const rockyUser = await findUserByName("Rocky Niger", ["rocky", "niger", "rocky niger"]);
  
  if (!ryanUser && !rockyUser) {
    console.log("❌ Could not find either user. Please check manually in the Firebase console.");
    process.exit(1);
  }
  
  let updatesNeeded = [];
  
  // Check Ryan Madden
  if (ryanUser) {
    if (ryanUser.role === "admin") {
      console.log("✅ Ryan Madden is already an admin!");
    } else {
      console.log(`📝 Ryan Madden needs update: ${ryanUser.role} → admin`);
      updatesNeeded.push({ user: ryanUser, name: "Ryan Madden" });
    }
  }
  
  // Check Rocky Niger
  if (rockyUser) {
    if (rockyUser.role === "admin") {
      console.log("✅ Rocky Niger is already an admin!");
    } else {
      console.log(`📝 Rocky Niger needs update: ${rockyUser.role} → admin`);
      updatesNeeded.push({ user: rockyUser, name: "Rocky Niger" });
    }
  }
  
  if (updatesNeeded.length === 0) {
    console.log("✅ Both users are already admins! No changes needed.");
    process.exit(0);
  }
  
  console.log("\n🔧 Performing updates...");
  let successCount = 0;
  
  for (const { user, name } of updatesNeeded) {
    const success = await updateUserToAdmin(user, name);
    if (success) {
      successCount++;
    }
  }
  
  console.log("==========================================");
  if (successCount === updatesNeeded.length) {
    console.log("🎉 ALL UPDATES COMPLETE!");
    console.log("Both Ryan Madden and Rocky Niger now have admin privileges:");
    console.log("   - Access all manager capabilities");
    console.log("   - Demote other managers");
    console.log("   - Manage all users across teams");
  } else {
    console.log(`⚠️ PARTIAL SUCCESS: ${successCount}/${updatesNeeded.length} updates completed`);
    console.log("Please check the errors above and retry if needed.");
  }
  console.log("==========================================");
  
  process.exit(successCount === updatesNeeded.length ? 0 : 1);
}

// Run the script
main().catch(error => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
