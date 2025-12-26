export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2>1. Introduction</h2>
      <p>Welcome to AdPilot AI. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.</p>

      <h2>2. Information We Collect</h2>
      <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
      <ul>
        <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and demographic information, that you voluntarily give to us when you register with the application.</li>
        <li><strong>Facebook Data:</strong> To provide our services, we connect to the Facebook Marketing API. We may collect information from your Facebook Ad Account, including campaign data, ad set data, ad data, and performance metrics (spend, impressions, clicks, etc.). This data is used solely to power the features of AdPilot AI and is not shared with third parties.</li>
        <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the application, such as your IP address, browser type, operating system, access times, and the pages you have viewed directly before and after accessing the application.</li>
      </ul>

      <h2>3. Use of Your Information</h2>
      <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you to:</p>
      <ul>
        <li>Create and manage your account.</li>
        <li>Automate the creation and management of your Facebook ad campaigns.</li>
        <li>Analyze ad performance and provide optimization suggestions.</li>
        <li>Email you regarding your account or order.</li>
        <li>Increase the efficiency and operation of the application.</li>
      </ul>

      <h2>4. Disclosure of Your Information</h2>
      <p>We do not share, sell, rent, or trade your information with third parties for their commercial purposes.</p>

      <h2>5. Security of Your Information</h2>
      <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>

      <h2>6. Contact Us</h2>
      <p>If you have questions or comments about this Privacy Policy, please contact us at: privacy@adpilot.ai</p>
    </>
  )
}
