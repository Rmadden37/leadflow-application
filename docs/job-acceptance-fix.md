# Job Acceptance System Fix Implementation

## 1. Create Missing Firestore Index

Follow these steps to create the missing Firestore index:

1. Visit this URL in your browser:
```
https://console.firebase.google.com/v1/r/project/leadflow-4lvrr/firestore/indexes?create_composite=Cltwcm9qZWN0cy9sZWFkZmxvdy00bHZyci9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYXBwb2ludG1lbnRSZW1pbmRlcnMvaW5kZXhlcy9fEAEaDQoJcHJvY2Vzc2VkEAEaEAoMcmVtaW5kZXJUaW1lEAEaDAoIX19uYW1lX18QAQ
```

2. Click "Create" when the Firebase console opens showing the index creation dialog

3. Wait for the index to finish building (usually takes a few minutes)

## 2. Test FCM Token Management

1. Navigate to the `/test-fcm-tokens` page we created
2. Click "Request & Save FCM Token"
3. Verify in the Firebase console that tokens are being properly saved to `userTokens` collection
4. Check if "BKG3AGuGG29VYQc4WzjtGnDespL8rW8z6cobGPiml473TcdW9TLPINIHgBe3zzLfh3GzjF_S_64gDjqNKtxTESw" is present in any of the token documents, as this might be an invalid token

## 3. Testing Job Acceptance

1. Navigate to the `/test-job-acceptance` page
2. Enter a valid lead ID for a lead that's assigned to you but not yet accepted
3. Click "Accept Job"
4. Verify the function returns success and check the Firestore console to confirm the lead status changed to "accepted"

## 4. Testing Complete Workflow

1. Login as a setter
2. Create a new lead
3. Login as the assigned closer
4. Navigate to dashboard
5. Click on the lead card
6. Verify the status updates to "accepted"
7. Login again as the setter
8. Check for notifications that the job was accepted

## 5. Debugging Production Issues

If you need to further debug acceptance issues in production:

1. Add this to `src/lib/firebase-messaging.ts`:

```typescript
export const debugToken = (token: string): void => {
  console.log('Debug FCM token:', token);
  
  // Check current permissions
  if ('Notification' in window) {
    console.log('Notification permission:', Notification.permission);
  }
  
  // Test if token is valid by sending a test message from Firebase console
  // targeting this specific token
  const encodedToken = encodeURIComponent(token);
  console.log(`Use this URL to test the token: https://console.firebase.google.com/project/leadflow-4lvrr/notification/compose?tokens=${encodedToken}`);
};
```

2. Add this to `src/lib/firebase.ts`:

```typescript
// Debug function for job acceptance issues
export const debugAcceptJobFunction = async (leadId: string): Promise<any> => {
  console.log('Testing acceptJob function with leadId:', leadId);
  try {
    const result = await acceptJobFunction({ leadId });
    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error('Error calling acceptJob:', error);
    throw error;
  }
};
```

## 6. Address FCM Token Storage Issues

In production, ensure proper token refreshing with this implementation in `/Users/ryanmadden/studio/studio/src/lib/firebase-messaging.ts`:

```typescript
export const refreshAndStoreToken = async (userId: string): Promise<string | null> => {
  try {
    if (!messaging) {
      console.log('Messaging not supported');
      return null;
    }

    // Request permission
    let permission = Notification.permission;
    
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });
      
      if (token) {
        console.log('FCM token obtained:', token);
        
        // Save token to Firestore
        const userTokensRef = doc(db, "userTokens", userId);
        const tokenDoc = await getDoc(userTokensRef);
        
        if (tokenDoc.exists()) {
          // Check if token already exists
          const tokens = tokenDoc.data().tokens || [];
          if (!tokens.includes(token)) {
            tokens.push(token);
            await setDoc(userTokensRef, { tokens }, { merge: true });
            console.log('New FCM token added to Firestore');
          } else {
            console.log('FCM token already exists in Firestore');
          }
        } else {
          // Create new document
          await setDoc(userTokensRef, { 
            tokens: [token],
            userId: userId
          });
          console.log('Initial FCM token added to Firestore');
        }
        
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};
```

Remember to call this function when a user logs in and periodically during their session.
