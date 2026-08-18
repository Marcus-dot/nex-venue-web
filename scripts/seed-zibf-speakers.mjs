/**
 * Seed the ZIBF (2026 Banking & Finance Conference) speaker profiles.
 * Uploads speaker photos to Storage and writes event.speakerProfiles[].
 * Does NOT touch the agenda.
 *
 * Run: node scripts/seed-zibf-speakers.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// ── Load env ────────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET; // nexvenue-2a4fa.firebasestorage.app
if (!getApps().length) initializeApp({ credential: cert(serviceAccount), storageBucket: BUCKET });

const db = getFirestore();
const bucket = getStorage().bucket();

const EVENT_ID = "TRrVSIUDcrDad4cuOcbD";
const PHOTO_DIR = "/Users/marcus/Projects/nex-venue/Banking and finan. event detailes/.resized";

// ── Speaker roster (order matters) ──────────────────────────────────────────
const SPEAKERS = [
    {
        id: "zibf-lwanga",
        name: "Dr. Francis Lwanga",
        title: "Chief Executive Officer",
        company: "Zambia Electronic Clearing House Limited (ZECHL)",
        photo: "zibf-lwanga.jpg",
        bio: "Dr. Francis Lwanga is CEO of Zambia Electronic Clearing House Limited (ZECHL), where he has transformed the organisation from a back-office clearing facility into a digital-era payments backbone serving Zambia's financial ecosystem. He has over thirty years' industry experience, fifteen of them at C-Suite level, spanning banking, mining, railways, print media and insurance. A multiple international award-winning payments-industry CEO, he is a Fellow of the Institute of Directors, a Chartered Marketer, Banker and Registered Engineer. He holds a Doctorate in Business Administration and an MBA from Maastricht School of Management.",
    },
    {
        id: "zibf-gupta",
        name: "Dr. Pooja Gupta",
        title: "Chief Executive Officer",
        company: "Bridging Gap Solutions Limited",
        photo: "zibf-gupta.jpg",
        bio: "Dr. Pooja Gupta is an award-winning technology executive, AI strategist and digital transformation leader, and CEO of Bridging Gap Solutions Limited. With expertise in artificial intelligence, project management, digital governance and organisational leadership, she champions responsible technology adoption, digital inclusion and the empowerment of women and young people across Africa. A respected speaker, mentor, researcher and advisory board member, her recognitions include the Icons of Africa Global Leadership in Technology and AI Award and Glow Woman of the Year.",
    },
    {
        id: "zibf-hamusute",
        name: "Keith Hamusute",
        title: "Chief Risk Officer",
        company: "National Savings and Credit Bank (NATSAVE)",
        photo: "zibf-keith.jpg",
        bio: "Keith Hamusute is a banker and economist with over fifteen years' experience in the public financial sector. He began his career as a tax consultant with PricewaterhouseCoopers before moving into banking, and currently serves as Chief Risk Officer for the National Savings and Credit Bank (NATSAVE). He holds qualifications in Economics, Banking and Finance, Business, Law and Risk Management from institutions including the University of Zambia, the Korea Development Institute and the University of London. His opinions are regularly sought on the economy, banking and risk management.",
    },
    {
        id: "zibf-lockhat",
        name: "Yaseen Lockhat",
        title: "Sustainability Specialist",
        company: "Banking Association South Africa (BASA)",
        photo: "zibf-yaseen.jpg",
        bio: "Yaseen Lockhat is a sustainability specialist working in sustainable finance and climate risk. He holds a Master of Science in Development Planning from the University of the Witwatersrand and the Sustainability and Climate Risk (SCR) certificate from GARP. Over the past eight years at the Banking Association South Africa (BASA) he has helped the banking sector navigate climate-related risks and shape policy frameworks for sustainable finance, playing a central role in the Sustainable Finance Forum for which BASA acts as secretariat.",
    },
    {
        id: "zibf-mumbi",
        name: "Francis Chanda Mumbi",
        title: "Head, Data & Analytics",
        company: "Stanbic Bank Zambia",
        photo: null,
        bio: "Francis Chanda Mumbi is a Digital Banking, Data & AI executive with over fifteen years' experience leading enterprise transformation across financial services. As Head of Data & Analytics at Stanbic Bank Zambia, he leads the bank's data, AI and automation strategy, building AI-powered platforms that scale revenue, efficiency and customer experience across banking ecosystems.",
    },
    {
        id: "zibf-mungule",
        name: "Dr. Oswald K. Mungule",
        title: "Sustainable Finance & ESG Expert",
        company: "Bank of Zambia",
        photo: null,
        bio: "Dr. Oswald K. Mungule is a sustainable finance and regulatory policy expert at the Bank of Zambia and a recognised thought leader on Environmental, Social and Governance (ESG) issues, the Zambia Green Finance Taxonomy and green loans guidelines. A frequent speaker, trainer and panelist on ESG integration, sustainable finance and climate-related financial risk, he has represented Zambia in international initiatives under the Alliance for Financial Inclusion (AFI) and plays a leading role in advancing ESG policy, regulation and capacity building in Zambia's financial sector.",
    },
];

// ── Upload a photo, return a tokenised download URL ─────────────────────────
async function uploadPhoto(localName, destPath) {
    const token = randomUUID();
    await bucket.upload(resolve(PHOTO_DIR, localName), {
        destination: destPath,
        metadata: {
            contentType: "image/jpeg",
            metadata: { firebaseStorageDownloadTokens: token },
        },
    });
    const encoded = encodeURIComponent(destPath);
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encoded}?alt=media&token=${token}`;
}

// ── Build speakerProfiles[] ─────────────────────────────────────────────────
const speakerProfiles = [];
for (let i = 0; i < SPEAKERS.length; i++) {
    const s = SPEAKERS[i];
    const profile = {
        id: s.id,
        name: s.name,
        title: s.title,
        company: s.company,
        bio: s.bio,
        order: i,
    };
    if (s.photo) {
        const url = await uploadPhoto(s.photo, `events/${EVENT_ID}/speakers/${s.id}.jpg`);
        profile.photoUrl = url;
        console.log(`  ↑ uploaded photo for ${s.name}`);
    } else {
        console.log(`  · no photo for ${s.name} (initials avatar)`);
    }
    speakerProfiles.push(profile);
}

// ── Write to the event (agenda untouched) ───────────────────────────────────
await db.collection("events").doc(EVENT_ID).update({ speakerProfiles });

console.log(`\n✓ Wrote ${speakerProfiles.length} speaker profiles to event ${EVENT_ID}`);
process.exit(0);
