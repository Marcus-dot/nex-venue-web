import { LegalDoc } from "@/components/features/legal/LegalDoc";
import { privacySections } from "@/lib/legal";

export const metadata = {
    title: "Privacy Policy | NexVenue",
    description: "How NexVenue collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
    return <LegalDoc sections={privacySections} />;
}
