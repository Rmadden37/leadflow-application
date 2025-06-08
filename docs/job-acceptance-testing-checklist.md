# Job Acceptance System - Testing Checklist

Use this checklist to methodically test the job acceptance system after implementing the fixes.

## 1. Prerequisites

- [ ] Create the missing Firestore index for appointment reminders
- [ ] Ensure test pages are accessible at `/test-job-acceptance` and `/test-fcm-tokens`
- [ ] Make sure you have at least two test user accounts (one setter, one closer)

## 2. Initial FCM Token Verification

**a. Using the FCM Token Test Page:**
- [ ] Login with a setter account
- [ ] Navigate to `/test-fcm-tokens`
- [ ] Check for any existing tokens
- [ ] Remove suspicious or invalid tokens (e.g., the BKG3AGuGG29... token)
- [ ] Request a new token and verify it's saved to Firestore
- [ ] Debug the token to ensure it's properly received by FCM

**b. Verify Firebase Messaging SW:**
- [ ] Confirm `firebase-messaging-sw.js` is properly loaded in the browser
- [ ] Check browser console for any errors related to FCM initialization
- [ ] Verify service worker registration shows up in browser DevTools

## 3. Isolated Job Acceptance Testing

**Using the Job Acceptance Test Page:**
- [ ] Login with a closer account
- [ ] Navigate to `/test-job-acceptance`
- [ ] Find a lead assigned to you that's not yet accepted (waiting_assignment/scheduled)
- [ ] Use "Accept Job" to call the function directly
- [ ] Verify the lead status changes to "accepted" in the database
- [ ] Check for any errors in the console or response

## 4. End-to-End System Testing

**a. Create and Assign a New Lead:**
- [ ] Login with the setter account
- [ ] Navigate to the dashboard
- [ ] Create a new lead using the lead creation form
- [ ] Verify the lead is created and assigned to an available closer

**b. Closer Accepts the Job:**
- [ ] Login with the assigned closer account
- [ ] Navigate to the dashboard
- [ ] Find the newly created lead from the previous step
- [ ] Click on the lead card to view details (should trigger job acceptance)
- [ ] Verify lead status changes to "accepted"
- [ ] Check that the lead keeps its assigned closer

**c. Setter Notification Verification:**
- [ ] Login with the setter account again
- [ ] Check for notifications that the job was accepted
- [ ] Verify the notification contains the closer's name and lead details
- [ ] Confirm the lead shows as "accepted" in the setter's dashboard

## 5. Error Case Testing

- [ ] Try accepting a lead that doesn't exist (should show appropriate error)
- [ ] Try accepting a lead assigned to another closer (should be denied)
- [ ] Try accepting a lead that's already been accepted (should handle gracefully)
- [ ] Verify leads in other statuses (sold, cancelled, etc.) can't be accepted

## 6. Performance and Edge Case Testing

- [ ] Create multiple leads in quick succession to test system under load
- [ ] Test with poor network connectivity (simulated slow connection)
- [ ] Test with very large lead data (long customer names, addresses, etc.)
- [ ] Verify the system correctly handles FCM token refreshes

---

## Notes & Bug Tracking

Use this section to document any issues found during testing:

1. **Issue Description**:
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:
   - Possible solution:

2. **Issue Description**:
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:
   - Possible solution:
