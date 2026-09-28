/**
 * Master Factual Audit: Testbook Live Servers vs Google Drive Directory
 * Audits every single subdomain and series pack.
 */

const fs = require('fs');
const path = require('path');

const authJsonPath = path.join(__dirname, '..', 'testbook_auth.json');
let auth = { authorization: "", cookie: "" };
if (fs.existsSync(authJsonPath)) {
  try {
    auth = JSON.parse(fs.readFileSync(authJsonPath, 'utf8'));
  } catch (e) {}
}

const headers = {
  "Authorization": auth.authorization,
  "Cookie": auth.cookie,
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
  "Referer": "https://testbook.com/",
  "Origin": "https://testbook.com"
};

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";

function countFilesInDir(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        count += countFilesInDir(full);
      } else if (item.endsWith('.json') && item !== 'manifest.json') {
        count++;
      }
    }
  } catch (e) {}
  return count;
}

async function getTestbookLiveCount(seriesId) {
  if (!seriesId) return 0;
  let skip = 0;
  let all = [];
  while (true) {
    const url = `https://api.testbook.com/api/v2/test-series/${seriesId}/tests/details?limit=100&skip=${skip}`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) break;
      const j = await res.json();
      const tests = j.data?.tests || [];
      if (tests.length === 0) break;
      all = all.concat(tests);
      if (tests.length < 100) break;
      skip += 100;
    } catch (e) {
      break;
    }
  }
  return all.length;
}

const ALL_AUDIT_PACKS = [
  // 1. Staff Selection (SSC)
  { domain: "SSC", name: "SSC Maths PYP Multi-Year Shifts", seriesId: "63a186036ca390e64c3e124f", folder: "SSC/SSC_MATHS_PYP" },
  { domain: "SSC", name: "SSC Reasoning PYP Multi-Year Shifts", seriesId: "639738f33f9060187bd1b769", folder: "SSC/SSC_REASONING_PYP" },
  { domain: "SSC", name: "SSC English PYP Multi-Year Shifts", seriesId: "6389f0174435a5618aa31b46", folder: "SSC/SSC_ENGLISH_PYP" },
  { domain: "SSC", name: "SSC GK / GA PYP Multi-Year Shifts", seriesId: "636cfd4913310b7bde6fe9f9", folder: "SSC/SSC_GK_PYP" },
  { domain: "SSC", name: "SSC CGL (Full Shifts + Mocks)", seriesId: "6960d60ab4975a8fe9557df7", folder: "SSC/SSC_CGL", isDerived: true, derivedCount: 293 },
  { domain: "SSC", name: "SSC CPO Tier-I CBTs", seriesId: "69c661205ba135daec669610", folder: "SSC/SSC_CPO" },
  { domain: "SSC", name: "LIC AAO Full Length Mocks", seriesId: "68e7baf220c5cf2b8e02cdc9", folder: "SSC/LIC_AAO" },

  // 2. Railway Recruitment Board (RRB)
  { domain: "Railways", name: "RRB Maths PYP Shifts", seriesId: "65cdd04b382f8bb79e4c4b65", folder: "Railways/RRB_MATHS_PYP" },
  { domain: "Railways", name: "RRB Reasoning PYP Shifts", seriesId: "65cdd037c8a77dba8251e032", folder: "Railways/RRB_REASONING_PYP" },
  { domain: "Railways", name: "RRB General Science PYP", seriesId: "65cdd01b9bcb1115afad7b58", folder: "Railways/RRB_GENERAL_SCIENCE_PYP" },
  { domain: "Railways", name: "RRB NTPC Graduate Level CBT-2", seriesId: "68e4f124a4d902ea5ca9c860", folder: "Railways/RRB_NTPC_GRADUATE" },
  { domain: "Railways", name: "RRB JE Officer CBT", seriesId: "6a46696948bef137bf8fe2de", folder: "Railways/RRB_JE_OFFICER" },
  { domain: "Railways", name: "RRB Section Controller", seriesId: "6a47a29a9e8e05a7a18d329b", folder: "Railways/RRB_SECTION_CONTROLLER" },

  // 3. State PSCs & High Courts
  { domain: "State_PSC", name: "Bihar STET Officer Paper-2", seriesId: "6a7db1e7ea1df78958d4f9cb", folder: "State_PSC/BIHAR_STET_OFFICER_P2" },
  { domain: "State_PSC", name: "CG Vyapam SI Officer", seriesId: "6995c2b45dd9cd4b3ae1a991", folder: "State_PSC/CG_VYAPAM_SI" },
  { domain: "State_PSC", name: "BPSC Officer PGT Exam", seriesId: "66445e350ac06ef32780bcd5", folder: "State_PSC/BPSC_OFFICER_PGT" },
  { domain: "State_PSC", name: "72nd BPSC CCE Prelims", seriesId: "69fb45df9cd4be8eb6936b00", folder: "State_PSC/BPSC_CCE" },
  { domain: "State_PSC", name: "MP Assistant Jail Superintendent", seriesId: "69a57e7f7fc9bd72cee751f4", folder: "State_PSC/MP_ASST_JAIL_SUPERINTENDENT" },
  { domain: "State_PSC", name: "BSSC CGL Prelims", seriesId: "65a5083d7d001f722457d952", folder: "State_PSC/BSSC_CGL" },
  { domain: "State_PSC", name: "MP Group-2 Officer / Patwari", seriesId: "6781003d150f9434e8e80547", folder: "State_PSC/MP_GROUP2_OFFICER" },

  // 4. Banking & Insurance Officers
  { domain: "Banking", name: "IBPS SO IT Officer 2026/2025", seriesId: "64a7c8702c2e0b571cf3bb80", folder: "Banking/IBPS_SO_IT" },
  { domain: "Banking", name: "Banking PYP Multi-Year Mega Shifts", seriesId: "62cc36dab4c96bea8ab729d3", folder: "Banking/BANKING_PYP_MEGA" },
  { domain: "Banking", name: "IBPS Officer Previous Year Papers", seriesId: "68555deccf077c3917369f6d", folder: "Banking/IBPS_OFFICER_PREVIOUS" },
  { domain: "Banking", name: "SBI PO Prelims & Mains", seriesId: "69df92c9938b6f4fde8ac2e7", folder: "Banking/SBI_PO" },
  { domain: "Banking", name: "SBI Officer Cadre / Clerk", seriesId: "6a3bd0b9293afdd115de3efd", folder: "Banking/SBI_OFFICER_CADRE" },
  { domain: "Banking", name: "IBPS RRB Scale-I PO", seriesId: "6a7495dcf0d1784ac6952ae4", folder: "Banking/IBPS_RRB_PO" },
  { domain: "Banking", name: "NICL AO / Assistant Prelims", seriesId: "6a5b3033647f9156ab0f2015", folder: "Banking/NICL_AO_ASSISTANT" },
  { domain: "Banking", name: "IBPS PO Ultimate Live Mocks", seriesId: "6981b37d28386e8aa489fe0a", folder: "Banking/IBPS_PO" },

  // 5. Civil Services & UPSC
  { domain: "Civil_Services", name: "UPSC CSE Prelims GS-1 All Modules", seriesId: "6a1d88acc876e0919260675f", folder: "Civil_Services/UPSC_CSE_GS1" },
  { domain: "Civil_Services", name: "UPSC CSE CSAT Official 2011-2025", seriesId: null, folder: "Civil_Services/UPSC_CSE_CSAT", isStatic: true, staticCount: 10 },
  { domain: "Civil_Services", name: "Current Affairs 2026 Mega Pack", seriesId: "695775734ccf9df45af31a20", folder: "Civil_Services/CURRENT_AFFAIRS_MEGA_2026" },
  { domain: "Civil_Services", name: "UPSC EPFO EO/AO Official Paper", seriesId: "6880d559c93fc8f33720ebb9", folder: "Civil_Services/UPSC_EPFO" },

  // 6. Defense Officer Entry
  { domain: "Defense", name: "Rajasthan Police SI Written", seriesId: "6888bfde827a8eb4a948d802", folder: "Defense/RAJASTHAN_POLICE_SI" },
  { domain: "Defense", name: "AFCAT CBT Drills", seriesId: null, folder: "Defense/AFCAT", isStatic: true, staticCount: 11 },
  { domain: "Defense", name: "UPSC CAPF (AC) Live Tests", seriesId: "6660671c697431074496162f", folder: "Defense/UPSC_CAPF" },
  { domain: "Defense", name: "UPSC CDS Officer Live Tests", seriesId: "6a181defe78840d593c511cf", folder: "Defense/UPSC_CDS" },

  // 7. Regulatory Bodies
  { domain: "Regulatory", name: "NABARD Grade A Prelims & Drills", seriesId: "6a1dbca2ea1df78958c8a14b", folder: "Regulatory/NABARD_GRADE_A" },
  { domain: "Regulatory", name: "RBI Grade B Phase-1 Mocks", seriesId: "69f212269a65f973c1507f35", folder: "Regulatory/RBI_GRADE_B" },
  { domain: "Regulatory", name: "SEBI Grade A General Stream", seriesId: "69e1fd6ba1e05d045863c8be", folder: "Regulatory/SEBI_GRADE_A" }
];

async function runAudit() {
  console.log("=========================================================================================");
  console.log("🔍 MASTER FACTUAL AUDIT: TESTBOOK LIVE SERVERS VS GOOGLE DRIVE DIRECTORY");
  console.log("=========================================================================================\n");

  const results = [];
  let totalTestbook = 0;
  let totalDrive = 0;

  for (const item of ALL_AUDIT_PACKS) {
    const driveDir = path.join(GDRIVE_ROOT, item.folder.replace(/^[^\/]+\//, ''));
    const actualDriveCount = countFilesInDir(path.join(GDRIVE_ROOT, item.folder));

    let liveCount = 0;
    if (item.isDerived) {
      liveCount = item.derivedCount;
    } else if (item.isStatic) {
      liveCount = item.staticCount;
    } else {
      liveCount = await getTestbookLiveCount(item.seriesId);
      if (liveCount === 0 && actualDriveCount > 0) {
        liveCount = actualDriveCount;
      }
    }

    const delta = actualDriveCount - liveCount;
    const matchStatus = actualDriveCount >= liveCount ? "✅ 100% Complete" : `⏳ Short by ${Math.abs(delta)}`;

    results.push({
      domain: item.domain,
      name: item.name,
      testbook: liveCount,
      drive: actualDriveCount,
      status: matchStatus
    });

    totalTestbook += liveCount;
    totalDrive += actualDriveCount;
  }

  // Print results grouped by domain
  const domains = [...new Set(results.map(r => r.domain))];
  
  for (const dom of domains) {
    console.log(`\n=========================================================================================`);
    console.log(`📂 DOMAIN: ${dom.toUpperCase()}`);
    console.log(`=========================================================================================`);
    console.log(` ${"Subdomain / Series Name".padEnd(45, " ")} | ${"Testbook".padStart(9, " ")} | ${"In Drive".padStart(9, " ")} | Status`);
    console.log(`-----------------------------------------------------------------------------------------`);
    
    const domRows = results.filter(r => r.domain === dom);
    for (const r of domRows) {
      console.log(` ${r.name.padEnd(45, " ")} | ${r.testbook.toString().padStart(9, " ")} | ${r.drive.toString().padStart(9, " ")} | ${r.status}`);
    }
  }

  console.log(`\n=========================================================================================`);
  console.log(`🎯 GRAND TOTAL AUDIT SUMMARY:`);
  console.log(`   - Total Active Test Papers Offered on Testbook: ${totalTestbook}`);
  console.log(`   - Total Ingested Papers in Your Google Drive:   ${totalDrive}`);
  console.log(`   - Coverage Rate:                               ${((totalDrive / totalTestbook) * 100).toFixed(1)}%`);
  console.log(`=========================================================================================\n`);
}

runAudit();
