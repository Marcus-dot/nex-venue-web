import { LegalDoc } from "@/components/features/legal/LegalDoc";
import { termsSections } from "@/lib/legal";

export const metadata = {
    title: "Terms & Conditions | NexVenue",
    description: "NexVenue Terms and Conditions of Use.",
};

export default function TermsPage() {
    return <LegalDoc sections={termsSections} />;
}
