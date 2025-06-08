// Script to move Sebastian, Andrea, and Joshua to Ryan Madden's team

const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');

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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Note: This script needs to be run in a browser console where the user is authenticated
// You cannot run it from Node.js without proper authentication

const moveUsersToRyanTeam = async () => {
  try {
    console.log('🔍 Finding Ryan Madden and target users...');
    
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const allUsers = [];
    
    usersSnapshot.forEach(doc => {
      allUsers.push({
        uid: doc.id,
        ...doc.data()
      });
    });
    
    // Find Ryan Madden
    const ryanUser = allUsers.find(user => 
      user.email?.includes('ryan.madden') || 
      (user.displayName || '').toLowerCase().includes('ryan madden')
    );
    
    if (!ryanUser) {
      console.error('❌ Ryan Madden not found');
      return;
    }
    
    console.log(`✅ Found Ryan Madden on team: ${ryanUser.teamId}`);
    
    // Find target users
    const targetNames = ['Sebastian', 'Andrea', 'Joshua'];
    const targetUsers = allUsers.filter(user => {
      const displayName = user.displayName || '';
      const email = user.email || '';
      
      return targetNames.some(name => 
        displayName.toLowerCase().includes(name.toLowerCase()) ||
        email.toLowerCase().includes(name.toLowerCase())
      );
    });
    
    console.log(`🎯 Found ${targetUsers.length} target users:`, targetUsers.map(u => u.displayName || u.email));
    
    // Move each user to Ryan's team
    for (const user of targetUsers) {
      if (user.teamId === ryanUser.teamId) {
        console.log(`✅ ${user.displayName || user.email} is already on Ryan's team`);
        continue;
      }
      
      console.log(`🔄 Moving ${user.displayName || user.email} from team "${user.teamId}" to "${ryanUser.teamId}"`);
      
      // Update user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        teamId: ryanUser.teamId,
        updatedAt: new Date()
      });
      
      // If they have a closer record, update that too
      const closersSnapshot = await getDocs(collection(db, 'closers'));
      const closerDoc = closersSnapshot.docs.find(doc => doc.id === user.uid);
      
      if (closerDoc) {
        console.log(`🚪 Also updating closer record for ${user.displayName || user.email}`);
        const closerRef = doc(db, 'closers', user.uid);
        await updateDoc(closerRef, {
          teamId: ryanUser.teamId,
          updatedAt: new Date()
        });
      }
      
      console.log(`✅ Moved ${user.displayName || user.email} to Ryan's team`);
    }
    
    console.log('🎉 All users moved successfully!');
    
  } catch (error) {
    console.error('❌ Error moving users:', error);
  }
};

// Export the function so it can be called from browser console
window.moveUsersToRyanTeam = moveUsersToRyanTeam;

console.log('📋 Script loaded. To move users to Ryan\'s team, run: moveUsersToRyanTeam()');
console.log('⚠️  Make sure you are signed in as a manager first!');
