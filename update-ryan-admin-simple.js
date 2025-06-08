const admin = require('firebase-admin');

// Initialize admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function updateRyanToAdminDirect() {
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
    
    await batch.commit();
    console.log('✅ Successfully updated Ryan to admin role!');
    
    // Verify the update
    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();
    console.log(`✅ Verified - Ryan's role is now: ${updatedUserData.role}`);
    
  } catch (error) {
    console.error('❌ Error updating Ryan to admin:', error);
  }
}

updateRyanToAdminDirect();
