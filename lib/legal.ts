// Legal content ported verbatim from the mobile app (app/auth/terms.tsx) so both
// platforms present identical, legally-reviewed Terms and Privacy text.

export type LegalSection =
    | { type: "title"; text: string }
    | { type: "meta"; text: string }
    | { type: "heading"; text: string }
    | { type: "paragraph"; text: string }
    | { type: "bullets"; items: string[] }
    | { type: "contact"; lines: string[] };

export const termsSections: LegalSection[] = [
    { type: "title", text: "Terms and Conditions of Use" },
    { type: "meta", text: "Last Updated: May 2026" },

    { type: "heading", text: "1. Acceptance of Terms" },
    { type: "paragraph", text: 'By downloading, accessing, or using NexVenue ("the App"), you confirm that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App. These terms constitute a legally binding agreement between you and Gralix Actuarial Consulting ("Gralix", "we", "us", or "our").' },

    { type: "heading", text: "2. About NexVenue" },
    { type: "paragraph", text: "NexVenue is an event networking platform developed by Gralix Technologies and operated by Gralix Actuarial Consulting. Gralix Technologies and Gralix Actuarial Consulting are sister companies and members of Gralix Group, one of the first fully Zambian-owned professional services groups. The App is designed to facilitate professional networking, event management, and engagement at Gralix-hosted conferences, workshops, and industry events. Features include event discovery, live agenda tracking, real-time chat, attendee networking, and push notifications." },

    { type: "heading", text: "3. Eligibility" },
    { type: "paragraph", text: "You must be at least 18 years of age and a registered professional or invited delegate to use NexVenue. By using the App, you represent and warrant that you meet these requirements. Gralix reserves the right to verify eligibility and deny or terminate access at its discretion." },

    { type: "heading", text: "4. User Accounts" },
    { type: "bullets", items: [
        "You must register using a valid phone number and provide accurate, complete information.",
        "You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.",
        "You must notify us immediately at info@gralix.co if you suspect any unauthorised use of your account.",
        "Gralix reserves the right to suspend or terminate accounts that contain false information or that are used in violation of these Terms.",
    ] },

    { type: "heading", text: "5. Acceptable Use" },
    { type: "paragraph", text: "By using NexVenue, you agree not to:" },
    { type: "bullets", items: [
        "Use the App for any unlawful purpose or in violation of any applicable Zambian law or regulation.",
        "Post, share, or transmit content that is defamatory, discriminatory, abusive, threatening, or otherwise harmful.",
        "Impersonate any person or entity, or misrepresent your affiliation with any organisation.",
        "Attempt to gain unauthorised access to any system, account, or data.",
        "Use the App to solicit, advertise, or promote services outside the context of Gralix events without prior written consent.",
        "Interfere with the operation of the App or disrupt other users' experience.",
        "Reverse-engineer, decompile, or attempt to extract the source code of the App.",
    ] },

    { type: "heading", text: "6. Event Participation" },
    { type: "bullets", items: [
        "Event creators and organisers are responsible for the accuracy of event information they publish on NexVenue.",
        "Attendance at events listed on NexVenue is subject to the specific terms and conditions of each event.",
        "Gralix reserves the right to remove events or content that violates these Terms or Gralix's professional standards.",
        "Role requests (organiser, speaker, exhibitor) are subject to review and approval by event organisers or Gralix administrators.",
    ] },

    { type: "heading", text: "7. Professional Conduct" },
    { type: "paragraph", text: "NexVenue is a professional networking platform associated with Gralix's actuarial and financial advisory practice. Users are expected to conduct themselves in a manner consistent with the standards of the actuarial profession and the broader financial services industry. Gralix may remove users who engage in conduct that is inconsistent with these standards or that could bring Gralix or the profession into disrepute." },

    { type: "heading", text: "8. Content Ownership" },
    { type: "bullets", items: [
        "You retain ownership of content you submit to NexVenue (profile information, messages, images).",
        "By submitting content, you grant Gralix a non-exclusive, royalty-free licence to use, display, and distribute that content within the App for the purpose of operating the service.",
        "Gralix retains all intellectual property rights in the App, its design, software, trademarks, and proprietary content.",
    ] },

    { type: "heading", text: "9. Privacy" },
    { type: "paragraph", text: "Your use of NexVenue is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review the Privacy Policy to understand how we collect, use, and protect your personal information." },

    { type: "heading", text: "10. Third-Party Services" },
    { type: "paragraph", text: "NexVenue uses third-party services including Firebase (Google) for authentication, data storage, and push notifications. Your use of the App is also subject to the applicable terms of these third-party providers. Gralix is not responsible for the practices of third-party service providers." },

    { type: "heading", text: "11. Limitation of Liability" },
    { type: "paragraph", text: "To the fullest extent permitted by applicable law:" },
    { type: "bullets", items: [
        'Gralix provides NexVenue on an "as is" and "as available" basis without warranties of any kind.',
        "Gralix shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.",
        "Gralix's total liability to you for any claim arising from your use of the App shall not exceed the amount you have paid to Gralix in the twelve months preceding the claim (if any).",
        "Gralix does not warrant that the App will be uninterrupted, error-free, or free from viruses or other harmful components.",
    ] },

    { type: "heading", text: "12. Indemnification" },
    { type: "paragraph", text: "You agree to indemnify and hold harmless Gralix Actuarial Consulting, its directors, officers, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising out of your use of NexVenue or your violation of these Terms." },

    { type: "heading", text: "13. Modifications to Terms" },
    { type: "paragraph", text: "Gralix reserves the right to modify these Terms at any time. We will notify users of material changes through the App or by other reasonable means. Continued use of NexVenue after changes take effect constitutes your acceptance of the revised Terms." },

    { type: "heading", text: "14. Termination" },
    { type: "paragraph", text: "Gralix may suspend or terminate your account and access to NexVenue at any time, with or without notice, for conduct that violates these Terms or is otherwise harmful to Gralix, other users, or third parties." },

    { type: "heading", text: "15. Governing Law and Dispute Resolution" },
    { type: "paragraph", text: "These Terms are governed by and construed in accordance with the laws of the Republic of Zambia. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Zambia. Gralix encourages users to first attempt to resolve disputes informally by contacting info@gralix.co." },

    { type: "heading", text: "16. Contact Information" },
    { type: "contact", lines: [
        "Gralix Actuarial Consulting",
        "Ground Floor LA Complex, Plot 4897 L.A. Boulevard",
        "Longacres, Lusaka, Zambia",
        "Email: info@gralix.co",
        "Phone: +260 770 007 775",
    ] },
];

export const privacySections: LegalSection[] = [
    { type: "title", text: "Privacy Policy" },
    { type: "meta", text: "Last Updated: May 2026" },

    { type: "heading", text: "1. Introduction" },
    { type: "paragraph", text: 'Gralix Actuarial Consulting ("Gralix", "we", "us", "our") is committed to protecting the privacy of users of the NexVenue application ("App"). This Privacy Policy explains what personal information we collect, how we use it, and your rights in relation to that information. By using NexVenue, you consent to the practices described in this Policy.' },

    { type: "heading", text: "2. Information We Collect" },
    { type: "paragraph", text: "Personal information you provide:" },
    { type: "bullets", items: [
        "Mobile phone number (used for account verification via one-time passcode)",
        "Full name and profile details (job title, company, professional bio, industry)",
        "Profile photograph (optional, uploaded by you)",
        "Networking availability preferences and social media links",
        "Messages sent through in-app chat features",
    ] },
    { type: "paragraph", text: "Information collected automatically:" },
    { type: "bullets", items: [
        "Device information (device type, operating system, unique device identifiers)",
        "App usage data (screens visited, features used, session duration)",
        "Push notification token (for delivering event and chat notifications)",
        "Event attendance records (events you create, organise, or attend)",
    ] },

    { type: "heading", text: "3. How We Use Your Information" },
    { type: "paragraph", text: "We use your personal information to:" },
    { type: "bullets", items: [
        "Verify your identity and create and manage your NexVenue account",
        "Provide and personalise the App's features, including event discovery, agenda tracking, and chat",
        "Send you push notifications about events, agenda updates, messages, and role requests you are involved in",
        "Enable other users to discover and connect with you at Gralix events",
        "Maintain the security and integrity of the App and prevent fraudulent or unauthorised activity",
        "Improve NexVenue based on usage patterns and user feedback",
        "Comply with applicable legal and regulatory obligations",
    ] },

    { type: "heading", text: "4. Information Sharing" },
    { type: "paragraph", text: "We do not sell, rent, or trade your personal information to third parties. We may share your information in the following limited circumstances:" },
    { type: "bullets", items: [
        "With other NexVenue users: your name, professional profile, and networking availability are visible to other registered users within the App",
        "With event organisers: your attendance and role request information is shared with organisers of events you interact with",
        "With service providers: we use Firebase (Google) to power authentication, data storage, and notifications; these providers process data on our behalf under appropriate agreements",
        "As required by law: we may disclose information if required by a court order, regulatory authority, or applicable Zambian law",
        "To protect rights: we may share information where necessary to protect the rights, property, or safety of Gralix, our users, or others",
    ] },

    { type: "heading", text: "5. Data Security" },
    { type: "paragraph", text: "Gralix takes reasonable technical and organisational measures to protect your personal information, including:" },
    { type: "bullets", items: [
        "Encryption of data in transit (TLS/HTTPS) and at rest via Firebase's security infrastructure",
        "Authentication controls including phone-based OTP verification",
        "Role-based access controls within the App (admin, organiser, user tiers)",
        "Firestore security rules restricting data access to authorised users",
        "Regular review of access permissions and security configurations",
    ] },
    { type: "paragraph", text: "No system is completely secure. If you have reason to believe that your account has been compromised, please contact us immediately at info@gralix.co." },

    { type: "heading", text: "6. Data Retention" },
    { type: "paragraph", text: "We retain your personal information for as long as your account is active or as necessary to provide our services. If you request deletion of your account, we will delete or anonymise your personal data within a reasonable period, except where retention is required by law or legitimate business purposes (such as dispute resolution or fraud prevention)." },

    { type: "heading", text: "7. Your Rights" },
    { type: "paragraph", text: "You have the right to:" },
    { type: "bullets", items: [
        "Access the personal information we hold about you",
        "Request correction of inaccurate or incomplete information",
        "Request deletion of your account and associated personal data",
        "Withdraw consent for optional data processing (such as profile visibility settings)",
        "Lodge a complaint with the relevant data protection authority in Zambia",
    ] },
    { type: "paragraph", text: "To exercise any of these rights, contact us at info@gralix.co." },

    { type: "heading", text: "8. Push Notifications" },
    { type: "paragraph", text: "NexVenue uses Firebase Cloud Messaging to send push notifications relating to events, agenda updates, chat messages, and role or admin requests. You can manage notification preferences within your device settings. Disabling notifications will not affect your ability to use the App, but you may miss important real-time updates." },

    { type: "heading", text: "9. Children's Privacy" },
    { type: "paragraph", text: "NexVenue is intended for professional use and is not directed at persons under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has registered on NexVenue, please contact us at info@gralix.co and we will promptly remove the account." },

    { type: "heading", text: "10. International Data Transfers" },
    { type: "paragraph", text: "Your data may be processed and stored on servers outside of Zambia through our use of Firebase (Google Cloud). By using the App, you consent to this transfer. Gralix takes reasonable steps to ensure that any international transfers are conducted in accordance with applicable privacy standards." },

    { type: "heading", text: "11. Third-Party Links and Services" },
    { type: "paragraph", text: "NexVenue may display links to external websites or services (such as LinkedIn, Twitter, or personal websites included in user profiles). This Privacy Policy does not apply to those third-party services, and Gralix is not responsible for their privacy practices." },

    { type: "heading", text: "12. Changes to This Policy" },
    { type: "paragraph", text: "We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. We will notify you of material changes through the App or by other reasonable means. Your continued use of NexVenue after the effective date of any changes constitutes your acceptance of the updated Policy." },

    { type: "heading", text: "13. Contact Us" },
    { type: "contact", lines: [
        "Gralix Actuarial Consulting",
        "Ground Floor LA Complex, Plot 4897 L.A. Boulevard",
        "Longacres, Lusaka, Zambia",
        "Email: info@gralix.co",
        "Phone: +260 770 007 775",
        "Twitter: @GralixActuarial",
    ] },
];
