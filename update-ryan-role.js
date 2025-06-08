#!/usr/bin/env node

/**
 * Script to update Ryan Madden's role to admin
 * This script searches for Ryan Madden in the users collection and updates his role
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc, writeBatch } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBc3jmFE6dRXBApmWD9Jg2PO86suqGgaZw",
  authDomain: "leadflow-4lvrr.firebaseapp.com",
  projectId: "leadflow-4lvrr",
  storageBucket: "leadflow-4lvrr.firebasestorage.app",
  messagingSenderId: "13877630896",
  appId: "1:13877630896:web:ab7d2717024960ec36e875",
  measurementId: "G-KDEF2C21SH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findRyanMadden() {
  console.log("🔍 Searching for Ryan Madden in users collection...");
  
  try {
    // Search by display name first
    let usersQuery = query(
      collection(db, "users"),
      where("displayName", "==", "Ryan Madden")
    );
    
    let snapshot = await getDocs(usersQuery);
    
    if (snapshot.empty) {
      console.log("No user found with displayName 'Ryan Madden', trying email search...");
      
      // Try searching by email if display name doesn't work
      usersQuery = query(
        collection(db, "users"),
        where("email", "==", "ryanmadden@leadflow.com")
      );
      
      snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) {
        // Try a different email pattern
        usersQuery = query(
          collection(db, "users"),
          where("email", "==", "ryan.madden@leadflow.com")
        );
        
        snapshot = await getDocs(usersQuery);
        
        if (snapshot.empty) {
          // Search for any user with "ryan" in their display name (case insensitive search by getting all users)
          const allUsersSnapshot = await getDocs(collection(db, "users"));
          
          const ryanUsers = [];
          allUsersSnapshot.forEach(doc => {
            const data = doc.data();
            const displayName = (data.displayName || "").toLowerCase();
            const email = (data.email || "").toLowerCase();
            
            if (displayName.includes("ryan") || email.includes("ryan")) {
              ryanUsers.push({ id: doc.id, ...data });
            }
          });
          
          if (ryanUsers.length === 0) {
            console.log("❌ No users found with 'ryan' in their name or email");
            return null;
          }
          
          console.log(`Found ${ryanUsers.length} users with 'ryan' in their data:`);
          ryanUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.displayName || user.email} (${user.id}) - Role: ${user.role}`);
          });
          
          // If there's exactly one user with "ryan", use that one
          if (ryanUsers.length === 1) {
            console.log("Using the only Ryan user found...");
            return ryanUsers[0];
          }
          
          // Otherwise, return all found users for manual selection
          return ryanUsers;
        }
      }
    }
    
    const user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    console.log("✅ Found Ryan Madden:", {
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      teamId: user.teamId
    });
    
    return user;
    
  } catch (error) {
    console.error("❌ Error searching for Ryan Madden:", error);
    return null;
  }
}

async function updateRyanRoleToAdmin(ryanUser) {
  if (!ryanUser) {
    console.log("❌ No user provided to update");
    return false;
  }
  
  console.log(`🔧 Updating ${ryanUser.displayName || ryanUser.email}'s role to admin...`);
  
  try {
    const batch = writeBatch(db);
    
    // Update user role in users collection
    const userDocRef = doc(db, "users", ryanUser.id);
    batch.update(userDocRef, {
      role: "admin",
      updatedAt: new Date()
    });
    
    // If Ryan has a closer record, update that too
    const closerDocRef = doc(db, "closers", ryanUser.id);
    
    // Check if closer record exists
    try {
      const closersQuery = query(
        collection(db, "closers"),
        where("uid", "==", ryanUser.id)
      );
      const closersSnapshot = await getDocs(closersQuery);
      
      if (!closersSnapshot.empty) {
        console.log("📋 Updating closer record as well...");
        batch.update(closerDocRef, {
          role: "admin",
          updatedAt: new Date()
        });
      } else {
        console.log("📋 Creating new closer record for admin role...");
        batch.set(closerDocRef, {
          uid: ryanUser.id,
          name: ryanUser.displayName || ryanUser.email || "Ryan Madden",
          status: "Off Duty",
          teamId: ryanUser.teamId,
          role: "admin",
          avatarUrl: ryanUser.avatarUrl || null,
          phone: ryanUser.phoneNumber || null,
          lineupOrder: 999,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (closerError) {
      console.log("⚠️ Warning: Could not check/update closer record:", closerError.message);
    }
    
    // Commit all changes
    await batch.commit();
    
    console.log("✅ Successfully updated Ryan Madden's role to admin!");
    console.log("🎉 Ryan now has admin privileges and can:");
    console.log("   - Access all manager capabilities");
    console.log("   - Demote other managers");
    console.log("   - Manage all users across teams");
    
    return true;
    
  } catch (error) {
    console.error("❌ Error updating Ryan's role:", error);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting Ryan Madden admin role update...");
  console.log("==========================================");
  
  const ryanUser = await findRyanMadden();
  
  if (!ryanUser) {
    console.log("❌ Could not find Ryan Madden. Please check manually in the Firebase console.");
    process.exit(1);
  }
  
  // If we found multiple users, ask for clarification
  if (Array.isArray(ryanUser)) {
    console.log("⚠️ Multiple users found with 'ryan' in their data. Please run this script again and manually specify which user to update.");
    process.exit(1);
  }
  
  // Check if already admin
  if (ryanUser.role === "admin") {
    console.log("✅ Ryan Madden is already an admin! No changes needed.");
    process.exit(0);
  }
  
  console.log(`Current role: ${ryanUser.role} → New role: admin`);
  
  const success = await updateRyanRoleToAdmin(ryanUser);
  
  if (success) {
    console.log("==========================================");
    console.log("🎉 UPDATE COMPLETE!");
    console.log("Ryan Madden is now an admin with full privileges.");
    console.log("==========================================");
    process.exit(0);
  } else {
    console.log("❌ Update failed. Please check the errors above.");
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
