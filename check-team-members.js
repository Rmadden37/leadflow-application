#!/usr/bin/env node

/**
 * Script to check if Richard Niger and Marcelo Guerra are on the same team
 * Run with: node check-team-members.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (you might need to set up service account)
try {
  // Try to initialize with default credentials
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id'
  });
} catch (error) {
  console.log('Could not initialize Firebase Admin:', error.message);
  console.log('Please set up Firebase Admin credentials or run this from the web interface');
  process.exit(1);
}

const db = admin.firestore();

async function checkTeamMembers() {
  try {
    console.log('=== CHECKING RICHARD NIGER & MARCELO GUERRA TEAM MEMBERSHIP ===\n');
    
    // Get all closers
    const closersSnapshot = await db.collection('closers').get();
    const allClosers = [];
    
    closersSnapshot.forEach(doc => {
      allClosers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Total closers found: ${allClosers.length}\n`);
    
    // Find Richard Niger
    const richard = allClosers.find(closer => 
      closer.name && closer.name.toLowerCase().includes('richard niger')
    );
    
    // Find Marcelo Guerra  
    const marcelo = allClosers.find(closer =>
      closer.name && closer.name.toLowerCase().includes('marcelo guerra')
    );
    
    console.log('=== SEARCH RESULTS ===');
    console.log('Richard Niger found:', richard ? '✅ YES' : '❌ NO');
    if (richard) {
      console.log('  - ID:', richard.id);
      console.log('  - Name:', richard.name);
      console.log('  - Email:', richard.email);
      console.log('  - Team ID:', richard.teamId);
      console.log('  - Active:', richard.isActive ? '✅ Yes' : '❌ No');
    }
    
    console.log('\nMarcelo Guerra found:', marcelo ? '✅ YES' : '❌ NO');
    if (marcelo) {
      console.log('  - ID:', marcelo.id);
      console.log('  - Name:', marcelo.name);
      console.log('  - Email:', marcelo.email);
      console.log('  - Team ID:', marcelo.teamId);
      console.log('  - Active:', marcelo.isActive ? '✅ Yes' : '❌ No');
    }
    
    console.log('\n=== TEAM MEMBERSHIP ANALYSIS ===');
    if (richard && marcelo) {
      const sameTeam = richard.teamId === marcelo.teamId;
      console.log(`Same team: ${sameTeam ? '✅ YES' : '❌ NO'}`);
      
      if (sameTeam) {
        console.log(`Both are on team: ${richard.teamId}`);
        
        // Get team details
        if (richard.teamId) {
          try {
            const teamDoc = await db.collection('teams').doc(richard.teamId).get();
            if (teamDoc.exists) {
              const teamData = teamDoc.data();
              console.log(`Team name: ${teamData.name || 'Unknown'}`);
            }
          } catch (error) {
            console.log('Could not fetch team details:', error.message);
          }
        }
      } else {
        console.log(`Richard's team: ${richard.teamId}`);
        console.log(`Marcelo's team: ${marcelo.teamId}`);
      }
      
      // Check their lead assignments
      console.log('\n=== LEAD ASSIGNMENTS ===');
      const leadsSnapshot = await db.collection('leads').get();
      const allLeads = [];
      
      leadsSnapshot.forEach(doc => {
        allLeads.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      const richardLeads = allLeads.filter(lead => lead.assignedCloserId === richard.id);
      const marceloLeads = allLeads.filter(lead => lead.assignedCloserId === marcelo.id);
      
      console.log(`Richard Niger has ${richardLeads.length} leads assigned`);
      console.log(`Marcelo Guerra has ${marceloLeads.length} leads assigned`);
      
      // Check in-process leads
      const inProcessStatuses = ['waiting_assignment', 'accepted', 'in_process'];
      const richardInProcess = richardLeads.filter(lead => inProcessStatuses.includes(lead.status));
      const marceloInProcess = marceloLeads.filter(lead => inProcessStatuses.includes(lead.status));
      
      console.log(`Richard Niger has ${richardInProcess.length} in-process leads`);
      console.log(`Marcelo Guerra has ${marceloInProcess.length} in-process leads`);
      
    } else if (!richard && !marcelo) {
      console.log('❌ Neither Richard Niger nor Marcelo Guerra found in the system');
    } else if (!richard) {
      console.log('❌ Richard Niger not found - cannot compare teams');
    } else if (!marcelo) {
      console.log('❌ Marcelo Guerra not found - cannot compare teams');
    }
    
    console.log('\n=== ALL CLOSERS (for reference) ===');
    allClosers.forEach((closer, index) => {
      console.log(`${index + 1}. ${closer.name || 'Unnamed'} (${closer.email || 'No email'}) - Team: ${closer.teamId || 'No team'}`);
    });
    
  } catch (error) {
    console.error('Error checking team members:', error);
  }
}

// Run the check
checkTeamMembers()
  .then(() => {
    console.log('\n=== ANALYSIS COMPLETE ===');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
