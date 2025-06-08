# Job Acceptance System Troubleshooting Guide

## Issues Fixed

1. **Missing Firestore Index for Appointment Reminders**
   - We discovered a missing Firestore index that was causing errors when the `processAppointmentReminders` function runs
   - Error details: "The query requires an index. You can create it here: [index URL]"
   - **Solution**: Create the missing composite index by visiting the URL provided in the error logs

2. **Job Acceptance Workflow Testing**
   - Created a `/test-job-acceptance` page to isolate and test the job acceptance function directly
   - This helps pinpoint whether issues are in the cloud function or the frontend integration

3. **FCM Token Management**
   - Created a `/test-fcm-tokens` page to check FCM token registration and storage
   - This helps confirm that tokens are properly stored in Firestore and notifications can be delivered

## Remaining Steps

1. **Create the Missing Firestore Index**
   - Visit this URL in your browser to create the index:
   ```
   https://console.firebase.google.com/v1/r/project/leadflow-4lvrr/firestore/indexes?create_composite=Cltwcm9qZWN0cy9sZWFkZmxvdy00bHZyci9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYXBwb2ludG1lbnRSZW1pbmRlcnMvaW5kZXhlcy9fEAEaDQoJcHJvY2Vzc2VkEAEaEAoMcmVtaW5kZXJUaW1lEAEaDAoIX19uYW1lX18QAQ
   ```
   - This index allows querying appointment reminders by processed status and reminder time

2. **Test the Complete Workflow**
   - Log in as a setter and create a new lead
   - Confirm the lead gets assigned to a closer
   - Log in as the assigned closer and click on their lead card
   - Verify that:
     - The job status changes to "accepted"
     - The setter receives a notification

3. **Check FCM Token Storage**
   - Use the `/test-fcm-tokens` page to validate token registration
   - Check the Firestore console to confirm tokens are stored in the `userTokens` collection
   - If the token "BKG3AGuGG29VYQc4WzjtGnDespL8rW8z6cobGPiml473TcdW9TLPINIHgBe3zzLfh3GzjF_S_64gDjqNKtxTESw" appears in error messages, it might be an invalid FCM token that should be removed

## Implementation Details

- The job acceptance function (`acceptJob`) updates the lead status to "accepted" and sends a notification to the setter
- When a closer clicks on their lead card for the first time, the `handleLeadClick` function in `in-process-leads.tsx` calls the `acceptJob` function
- Proper status styling for "accepted" leads has been implemented in `lead-card.tsx`
- The LeadQueue and CloserLineup components now correctly show lead availability based on the "accepted" status

## Potential Issues to Watch For

1. **Token Expiry**: FCM tokens can expire - make sure the system handles token refreshing 
2. **Multiple Devices**: Users may have multiple tokens if they use multiple devices
3. **Permission Changes**: Users might revoke notification permissions
4. **Network Issues**: Confirm API calls work even with periodic network disruptions

## Testing in Production

After deploying the changes, monitor:
1. Firebase Function logs for any errors in the `acceptJob` function
2. Firestore queries that might need additional indexes
3. FCM token registration and notification delivery success rates
