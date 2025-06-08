#!/usr/bin/env node

// Debug script to investigate Firebase data without authentication
const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  // Try to use existing credentials or service account
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'leadflow-4lvrr'
    });
  }
} catch (error) {
  console.log('Note: Firebase Admin requires service account credentials for production data access');
  console.log('This script is for debugging purposes only');
  console.log('Error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function debugData() {
  try {
    console.log('=== FIREBASE DEBUG INVESTIGATION ===');
    
    // Check users collection
    console.log('\n🔍 Checking users collection...');
    const usersSnapshot = await db.collection('users').limit(10).get();
    console.log(`Found ${usersSnapshot.size} users`);
    
    if (!usersSnapshot.empty) {
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`User ${doc.id}:`, {
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          teamId: data.teamId
        });
        
        // Check for Richard Niger specifically
        if ((data.displayName || '').toLowerCase().includes('richard') || 
            (data.email || '').toLowerCase().includes('richard')) {
          console.log('🎯 FOUND RICHARD USER:', data);
        }
      });
    }

    // Check closers collection
    console.log('\n🔍 Checking closers collection...');
    const closersSnapshot = await db.collection('closers').limit(10).get();
    console.log(`Found ${closersSnapshot.size} closers`);
    
    if (!closersSnapshot.empty) {
      closersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Closer ${doc.id}:`, {
          name: data.name,
          email: data.email,
          teamId: data.teamId
        });
        
        // Check for Richard Niger specifically
        if ((data.name || '').toLowerCase().includes('richard')) {
          console.log('🎯 FOUND RICHARD CLOSER:', data);
        }
      });
    }

    // Check leads collection with in-process status
    console.log('\n🔍 Checking leads collection for in-process leads...');
    const leadsSnapshot = await db.collection('leads')
      .where('status', 'in', ['waiting_assignment', 'accepted', 'in_process'])
      .limit(20)
      .get();
      
    console.log(`Found ${leadsSnapshot.size} in-process leads`);
    
    if (!leadsSnapshot.empty) {
      leadsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Lead ${doc.id}:`, {
          status: data.status,
          assignedCloserId: data.assignedCloserId,
          customerName: data.customerName,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        });
      });
    }

    // Check teams collection
    console.log('\n🔍 Checking teams collection...');
    const teamsSnapshot = await db.collection('teams').limit(5).get();
    console.log(`Found ${teamsSnapshot.size} teams`);
    
    if (!teamsSnapshot.empty) {
      teamsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Team ${doc.id}:`, {
          name: data.name,
          createdAt: data.createdAt?.toDate?.() || data.createdAt
        });
      });
    }

    console.log('\n✅ Debug investigation complete');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
    
    if (error.code === 'permission-denied') {
      console.log('\n💡 Suggestion: This might be a Firestore security rules issue.');
      console.log('For debugging, you might need to temporarily modify Firestore rules or use Firebase Auth.');
    }
  }
}

debugData().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
