export default function DataDeletionPage() {
  return (
    <>
      <h1>Data Deletion Policy</h1>
      <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>How to Request Data Deletion</h2>
      <p>
        At AdPilot AI, we respect your right to control your personal data. You can request the deletion of your account and all associated data at any time.
      </p>
      <p>
        To permanently delete your account and all of your data, please follow these steps:
      </p>
      <ol>
        <li>Log in to your AdPilot AI account.</li>
        <li>Navigate to the "Settings" page.</li>
        <li>Under the "Account Deletion" section, click the "Delete My Account" button.</li>
        <li>Confirm your choice in the confirmation dialog.</li>
      </ol>
      
      <h2>What Data is Deleted?</h2>
      <p>
        Upon confirming your account deletion, the following data will be permanently removed from our systems:
      </p>
      <ul>
        <li><strong>Your User Profile:</strong> This includes your name, email address, and any other profile information.</li>
        <li><strong>Authentication Data:</strong> Your login credentials and connections to third-party providers like Google and Facebook will be removed.</li>
        <li><strong>Campaign & Ad Data:</strong> All information related to the campaigns, ad sets, and ads you have created or managed through AdPilot AI will be deleted from our database. Note that this does not delete the campaigns from your Facebook Ad Account itself.</li>
        <li><strong>Usage Logs:</strong> Any logs associated with your activity within the application will be anonymized or deleted.</li>
      </ul>

      <h2>What Data is Retained?</h2>
      <p>
        We do not retain any personally identifiable information after your account is deleted. Non-personal, anonymized, and aggregated data may be retained for statistical and analytical purposes to improve our service, but this data cannot be linked back to you.
      </p>
      
      <h2>Deletion Timeline</h2>
      <p>
        The data deletion process is initiated immediately upon your confirmation. Most data is removed from our active databases within 24 hours. Complete deletion from all our backup systems may take up to 30 days.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have any questions about our data deletion process or are unable to access your account to perform the deletion, please contact us at <a href="mailto:support@adpilot.ai">support@adpilot.ai</a> for assistance.
      </p>
    </>
  )
}
