import type { Metadata, ResolvingMetadata } from 'next';
import EventDetailsClient from './EventDetailsClient';
import { eventService } from '@/services/events';

type Props = {
    params: { id: string }
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    try {
        const event = await eventService.getEventById(id);
        
        if (!event) {
            return { title: 'Event Not Found | NexVenue' };
        }

        return {
            title: `${event.title} | NexVenue`,
            description: event.description,
            openGraph: {
                images: event.imageUrl ? [event.imageUrl] : [],
                title: `${event.title} | NexVenue`,
                description: event.description
            },
            twitter: {
                card: 'summary_large_image',
                title: `${event.title} | NexVenue`,
                description: event.description,
                images: event.imageUrl ? [event.imageUrl] : [],
            }
        };
    } catch(e) {
        return {
            title: 'Event Details | NexVenue'
        }
    }
}

export default function EventDetailsPage() {
    return <EventDetailsClient />;
}
