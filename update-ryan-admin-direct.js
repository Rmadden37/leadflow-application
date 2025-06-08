#!/usr/bin/env node

/**
 * Direct script to update Ryan Madden to admin role using his UID
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
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

async function updateRyanToAdmin() {
  const ryanUID = '8LKkUtw0f5eiHMOepO1ksbYZIv52';
  
  console.log('🚀 Updating Ryan Madden to admin role...');
  console.log(`UID: ${ryanUID}`);
  
  try {
    // Get Ryan's current data
    const userDoc = await db.collection('users').doc(ryanUID).get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found with that UID');
      return;
    }
    
    const userData = userDoc.data();
    console.log(`Found user: ${userData.displayName || userData.email}`);
    console.log(`Current role: ${userData.role}`);
    
    if (userData.role === 'admin') {
      console.log('✅ Ryan is already an admin!');
      return;
    }
    
    // Update to admin role
    const batch = db.batch();
    
    // Update user role
    const userRef = db.collection('users').doc(ryanUID);
    batch.update(userRef, {
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update or create closer record
    const closerRef = db.collection('closers').doc(ryanUID);
    const closerDoc = await closerRef.get();
    
    if (closerDoc.exists) {
      console.log('📋 Updating existing closer record...');
      batch.update(closerRef, {
        role: 'admin',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      console.log('📋 Creating new closer record...');
      batch.set(closerRef, {
        uid: ryanUID,
        name: userData.displayName || userData.email || 'Ryan Madden',
        status: 'Off Duty',
        teamId: userData.teamId,
        role: 'admin',
        avatarUrl: userData.avatarUrl || null,
        phone: userData.phoneNumber || null,
        lineupOrder: 999,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Commit the changes
    await batch.commit();
    
    console.log('✅ Successfully updated Ryan Madden to admin role!');
    console.log('🎉 Ryan now has admin privileges');
    
  } catch (error) {
    console.error('❌ Error updating Ryan:', error);
  }
}

updateRyanToAdmin().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
