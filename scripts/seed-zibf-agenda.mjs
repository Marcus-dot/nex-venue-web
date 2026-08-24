/**
 * Seed the ZIBF 2026 agenda (V2 programme, 10-11 Sept) into the `agendas`
 * collection for event TRrVSIUDcrDad4cuOcbD. Aborts if agenda items already
 * exist (so re-running doesn't duplicate). Additions come later per ZIBFS.
 * Run: FIRESTORE_PREFER_REST=true node scripts/seed-zibf-agenda.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}
if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) });
const db = getFirestore();

const EVENT_ID = "TRrVSIUDcrDad4cuOcbD";
const AUTHOR = "myQpOXhHOnOYlbRy6q5lJOaqE6u2"; // NexVenue Support (admin)
const D1 = "2026-09-10";
const D2 = "2026-09-11";

// date, start, end, title, category, isBreak, speaker, description
const ITEMS = [
    // ── Day 1 ──────────────────────────────────────────────────────────────
    [D1, "07:50", "08:30", "Arrivals & Registration", "networking", false, "", ""],
    [D1, "08:30", "08:40", "Arrival of the Guest of Honour", "other", false, "", ""],
    [D1, "08:40", "08:55", "National Anthem", "other", false, "", ""],
    [D1, "08:45", "08:50", "Remarks & Announcements from the Conference Moderator", "remarks", false, "", ""],
    [D1, "08:50", "09:00", "Remarks by the ZIBFS President", "remarks", false, "Dr. Kuldip Paliwal", ""],
    [D1, "09:00", "09:10", "Remarks by the BAZ Chairperson", "remarks", false, "Mr. Mwindwa Siakalima", ""],
    [D1, "09:10", "09:30", "Keynote Address by the Guest of Honour", "keynote", false, "Dr. Francis Chipimo — Deputy Governor Operations, Bank of Zambia", ""],
    [D1, "09:30", "09:35", "Platinum Sponsor Message (ZANACO)", "remarks", false, "", ""],
    [D1, "09:35", "10:35", "Panel Discussion: Data Privacy, Security, and Governance for Regulated Innovation in Banking and Financial Services", "panel", false, "",
        "Panellists:\n• Ms. Tendai Luwabelwa — Principal Examiner & ICT Specialist, Prudential Supervision Department, Bank of Zambia\n• Mr. Chinedu Koggu — Chief Technology Officer, Tech Masters Zambia\n• Mr. Simon Chinungo — Chief Operating Officer, IZWE Loans Zambia Plc\n• FNB"],
    [D1, "10:35", "10:50", "Health Break (Pick & Sit)", "break", true, "", ""],
    [D1, "10:50", "10:55", "Silver Sponsor Message (MFZ)", "remarks", false, "", ""],
    [D1, "10:55", "12:05", "Presentations & Panel Discussion: Responsible AI and Customer-Centric Innovation in Banking and Financial Services", "panel", false, "",
        "Panellists:\n• Dr. Francis Mbao — Assistant Director, Data Management, Bank of Zambia\n• Mr. Mutisunge Zulu — Chief Risk Officer, Zanaco Plc\n• Mr. Chellah Silavwe — CEO, ICT Association of Zambia (ICTAZ)"],
    [D1, "12:05", "12:30", "Presentation + Q&A: TransUnion Zambia", "presentation", false, "Ms. Mildred Stephenson — Chief Executive Officer, TransUnion Zambia", ""],
    [D1, "12:30", "14:00", "Lunch Break", "break", true, "", ""],
    [D1, "14:00", "14:15", "Presentation + Q&A: Gralix Zambia", "presentation", false, "Mr. Mulenga Mutati — CEO, Gralix Actuarial Consulting", ""],
    [D1, "14:15", "15:15", "Presentation & Panel Discussion: Navigating ESG in the SADC Banking Sector — From Strategy to Sustainable Implementation", "panel", false, "",
        "Panellists:\n• Mr. Yaseen Lockhat — Senior Specialist: Sustainable Finance, South African Banking Association\n• Dr. Oswald Mungule — Senior Analyst, Regulatory Policy Research & Licensing, Bank of Zambia; President, Economics Association of Zambia\n• Mr. James Chona — CEO, Micro Finance Zambia (MFZ)\n• Mr. Joseph Banda — Senior Project Officer, DSIK\n• Mr. Keith Hamusute — Group Chief Risk Officer & Director, Bridging Gap Solutions Group"],
    [D1, "15:15", "15:20", "Announcements / Health Break (end of day one)", "break", true, "", ""],
    [D1, "15:40", "15:40", "Departure for the Evening Boat Cruise", "networking", false, "", ""],
    [D1, "16:00", "19:00", "Evening Boat Cruise", "networking", false, "", ""],

    // ── Day 2 ──────────────────────────────────────────────────────────────
    [D2, "08:30", "09:00", "Recap of Day One", "remarks", false, "", ""],
    [D2, "09:00", "10:00", "Presentation & Panel Discussion: Analytics-Driven Financial Inclusion — Turning Data Insights into Banking Solutions", "panel", false, "",
        "Panellists:\n• Mr. Francis Mumbi — Head of Analytics, Stanbic Bank\n• Mr. Mutisunge Zulu — Chief Risk Officer, ZANACO\n• Mr. Chellah Silavwe — CEO, ICT Association of Zambia (ICTAZ)"],
    [D2, "10:00", "10:05", "Sponsor Message", "remarks", false, "", ""],
    [D2, "10:05", "11:05", "Panel Discussion: Digital Transformation, Customer Experience, and Inclusive Access in Banking", "panel", false, "",
        "Panellists:\n• Dr. Francis Lwanga — CEO, Zambia Electronic Clearing House (ZECHL)\n• Mr. Simon Ziba — CEO, VisionFund Zambia\n• Dr. Pooja Gupta — CEO, Bridging Gap Solutions (BGS)\n• Mr. Kalimukwa Kalimukwa — Manager, Enterprise Risk, ZICB\n• INDO Zambia Bank"],
    [D2, "11:05", "11:10", "Announcements & Remarks — Closing Day 2", "remarks", false, "", ""],
    [D2, "11:10", "11:20", "Health Break", "break", true, "", ""],
    [D2, "11:20", "11:20", "Departure for Game Viewing / Kazungula Bridge Viewing", "networking", false, "", ""],
    [D2, "18:45", "22:00", "Banking & Finance Awards Gala Dinner", "networking", false, "",
        "The 2026 Banking & Finance Awards (BFA2026) Gala Dinner recognises individual and corporate achievement across the sector, including the Leadership Awards for the top CEOs of 2026.\n\nProgramme:\n18:45 — Arrival of guests & seating\n19:00 — Arrival of award nominees & VIP guests\n19:20 — Arrival of the Guest of Honour; VIP reception\n19:30 — Entry of the Guest of Honour & VIP guests · National Anthem · Entertainment · Remarks (ZIBFS President, BAZ Chairperson) · Keynote by the Guest of Honour · Raffle draw · Dinner · Presentation of Awards · Group photo · Dancing & entertainment"],
];

// Guard against duplicate loads.
const existing = await db.collection("agendas").where("eventId", "==", EVENT_ID).get();
if (!existing.empty) {
    console.error(`Aborting: ${existing.size} agenda item(s) already exist for this event. Delete them first if you mean to reload.`);
    process.exit(1);
}

const now = Date.now();
let batch = db.batch();
ITEMS.forEach((it, i) => {
    const [date, startTime, endTime, title, category, isBreak, speaker, description] = it;
    const ref = db.collection("agendas").doc();
    batch.set(ref, {
        eventId: EVENT_ID,
        title,
        description: description || "",
        startTime,
        endTime,
        date,
        speaker: speaker || "",
        category,
        isBreak,
        order: i,
        createdAt: now,
        updatedAt: now,
        createdBy: AUTHOR,
        lastEditedBy: AUTHOR,
    });
});
await batch.commit();

const byDay = ITEMS.reduce((m, it) => ((m[it[0]] = (m[it[0]] || 0) + 1), m), {});
console.log(`✓ Created ${ITEMS.length} agenda items — Day 1: ${byDay[D1]}, Day 2: ${byDay[D2]}`);
process.exit(0);
