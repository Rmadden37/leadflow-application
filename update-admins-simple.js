#!/usr/bin/env node

/**
 * Simple script to update admin roles using Firestore CLI approach
 */

const { execSync } = require('child_process');

console.log('🚀 Starting admin role updates using Firebase CLI...');
console.log('==========================================');

// Define the users to update
const usersToUpdate = [
  { name: 'Ryan Madden', searchTerms: ['ryan', 'madden'] },
  { name: 'Rocky Niger', searchTerms: ['rocky', 'niger'] }
];

async function updateAdminRoles() {
  try {
    // Use Firebase CLI to update the users
    const script = `
      const admin = require('firebase-admin');
      const fs = require('fs');
      
      // Use the current project from Firebase CLI
      admin.initializeApp();
      const db = admin.firestore();
      
      async function updateUsers() {
        console.log('🔍 Searching for users...');
        
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        
        usersSnapshot.forEach(doc => {
          const data = doc.data();
          users.push({ id: doc.id, ...data });
        });
        
        console.log(\`Found \${users.length} total users\`);
        
        // Find Ryan Madden
        const ryan = users.find(user => {
          const name = (user.displayName || '').toLowerCase();
          const email = (user.email || '').toLowerCase();
          return name.includes('ryan') || email.includes('ryan') || name.includes('madden');
        });
        
        // Find Rocky Niger
        const rocky = users.find(user => {
          const name = (user.displayName || '').toLowerCase();
          const email = (user.email || '').toLowerCase();
          return name.includes('rocky') || email.includes('niger');
        });
        
        const updates = [];
        
        if (ryan) {
          console.log(\`Found Ryan: \${ryan.displayName || ryan.email} - Current role: \${ryan.role}\`);
          if (ryan.role !== 'admin') {
            updates.push({ user: ryan, name: 'Ryan Madden' });
          } else {
            console.log('✅ Ryan is already admin');
          }
        } else {
          console.log('❌ Could not find Ryan Madden');
        }
        
        if (rocky) {
          console.log(\`Found Rocky: \${rocky.displayName || rocky.email} - Current role: \${rocky.role}\`);
          if (rocky.role !== 'admin') {
            updates.push({ user: rocky, name: 'Rocky Niger' });
          } else {
            console.log('✅ Rocky is already admin');
          }
        } else {
          console.log('❌ Could not find Rocky Niger');
        }
        
        if (updates.length === 0) {
          console.log('✅ No updates needed - both users are already admins');
          return;
        }
        
        console.log(\`🔧 Updating \${updates.length} users...\`);
        
        for (const { user, name } of updates) {
          try {
            const batch = db.batch();
            
            // Update user role
            const userRef = db.collection('users').doc(user.id);
            batch.update(userRef, {
              role: 'admin',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Update or create closer record
            const closerRef = db.collection('closers').doc(user.id);
            const closerDoc = await closerRef.get();
            
            if (closerDoc.exists) {
              batch.update(closerRef, {
                role: 'admin',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            } else {
              batch.set(closerRef, {
                uid: user.id,
                name: user.displayName || user.email || name,
                status: 'Off Duty',
                teamId: user.teamId,
                role: 'admin',
                avatarUrl: user.avatarUrl || null,
                phone: user.phoneNumber || null,
                lineupOrder: 999,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            }
            
            await batch.commit();
            console.log(\`✅ Updated \${name} to admin role\`);
            
          } catch (error) {
            console.error(\`❌ Error updating \${name}:\`, error.message);
          }
        }
        
        console.log('🎉 Admin role updates complete!');
      }
      
      updateUsers().then(() => {
        console.log('Script completed successfully');
        process.exit(0);
      }).catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
      });
    `;
    
    // Write the script to a temporary file
    const fs = require('fs');
    fs.writeFileSync('temp-admin-update.js', script);
    
    // Execute using firebase CLI
    console.log('📝 Executing admin update script...');
    execSync('cd /Users/ryanmadden/studio/studio && firebase functions:shell < temp-admin-update.js', { 
      stdio: 'inherit',
      timeout: 30000
    });
    
    // Clean up
    fs.unlinkSync('temp-admin-update.js');
    
  } catch (error) {
    console.error('❌ Error executing script:', error.message);
    
    // Try a direct Node.js approach with service account
    console.log('🔄 Trying alternative approach...');
    
    try {
      execSync('cd /Users/ryanmadden/studio/studio && GOOGLE_APPLICATION_CREDENTIALS="" node update-admins-server.js', { 
        stdio: 'inherit',
        timeout: 30000
      });
    } catch (altError) {
      console.error('❌ Alternative approach also failed:', altError.message);
      console.log('🛠️ Please try running the script manually through the Firebase console');
    }
  }
}

updateAdminRoles();
