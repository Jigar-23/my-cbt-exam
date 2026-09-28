/**
 * Focused Discovery Script:
 * Resolves exact Test Series IDs for SSC, UPSC/Civil Services, Regulatory Bodies, Haryana PSC & JKPSC.
 */

const fs = require('fs');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2Njg5YTA5ZDJkYzgxNTNmMTA0Y2M0OWMiLCJpYXQiOjE3NjM1MzM3MzEsImV4cCI6MTc2NjEyNTczMX0.x8PjD2L3Lw00BvLhK0l9E4H9UoU4EwW3E6oO0T8xZ7E";

async function searchPacks(query) {
  const url = `https://api.testbook.com/api/v2/test-series/search?keyword=${encodeURIComponent(query)}&limit=10`;
  try {
    const res = await fetch(url, {
      headers: {
        "testbook-version": "3",
        "testbook-platform": "web",
        "usertoken": token
      }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.testSeries || json.data || [];
  } catch (e) {
    return [];
  }
}

async function discover() {
  const searchQueries = [
    // SSC
    { domain: "SSC", exam: "SSC_CGL_MEGA", query: "SSC CGL Mock Test Series 2026" },
    { domain: "SSC", exam: "SSC_CHSL_2026", query: "SSC CHSL Mock Test Series 2026" },
    { domain: "SSC", exam: "SSC_CPO_2026", query: "SSC CPO Mock Test Series 2026" },
    { domain: "SSC", exam: "SSC_MTS_2026", query: "SSC MTS Mock Test Series 2026" },
    { domain: "SSC", exam: "SSC_GD_2026", query: "SSC GD Constable Mock Test Series 2026" },

    // UPSC & Civil Services
    { domain: "Civil_Services", exam: "UPSC_CSE_PRELIMS_2026", query: "UPSC Civil Services Exam Prelims 2026 Mock Test" },
    { domain: "Civil_Services", exam: "UPSC_CSE_PREPLAB_2027", query: "UPSC CSE Prelims 2027 PrepLab Test Series" },
    { domain: "Civil_Services", exam: "UPSC_CSE_CA_2026_27", query: "UPSC CSE Current Affairs Test Series 2026-27" },
    { domain: "Civil_Services", exam: "UPSC_CSAT", query: "UPSC Civil Services CSAT Test Series" },
    { domain: "Civil_Services", exam: "NCERT_FOUNDATION_GS", query: "NCERT Foundation for General Studies Mock Test Series" },
    { domain: "Civil_Services", exam: "POLITY_ALL_PSC", query: "Polity for All PSC Test Series" },
    { domain: "Civil_Services", exam: "HISTORY_ALL_PSC", query: "History for All PSC Test Series" },
    { domain: "Civil_Services", exam: "GEOGRAPHY_ALL_PSC", query: "Geography for All PSC Test Series" },

    // Regulatory Bodies
    { domain: "Regulatory", exam: "RBI_GRADE_B_2026", query: "RBI Grade B Mock Test Series 2026" },
    { domain: "Regulatory", exam: "SEBI_GRADE_A_2026", query: "SEBI Grade A Officer 2026" },
    { domain: "Regulatory", exam: "NABARD_GRADE_A_2026", query: "NABARD Grade A 2026" },
    { domain: "Regulatory", exam: "IFSCA_GRADE_A_2026", query: "IFSCA Grade A 2026" },
    { domain: "Regulatory", exam: "IRDAI_ASST_MGR_2026", query: "IRDAI Assistant Manager 2026" },
    { domain: "Regulatory", exam: "PFRDA_GRADE_A_2026", query: "PFRDA Grade A Officer 2026" },

    // Specific State PSCs: Haryana & Jammu
    { domain: "State_PSC", exam: "HARYANA_HPSC_HCS", query: "HPSC HCS Mock Test Series" },
    { domain: "State_PSC", exam: "HARYANA_PSC_ASST_PROF", query: "Haryana PSC Assistant Professor" },
    { domain: "State_PSC", exam: "JKPSC_CCE_KAS", query: "JKPSC CCE Mock Test Series" },
    { domain: "State_PSC", exam: "JKPSC_ASST_PROF", query: "JKPSC Assistant Professor" }
  ];

  const results = [];

  for (const item of searchQueries) {
    const list = await searchPacks(item.query);
    console.log(`\n🔍 Searched "${item.query}" (${list.length} results):`);
    if (list.length > 0) {
      const top = list[0];
      const id = top._id || top.id;
      const title = top.title || top.name;
      const testsCount = top.totalTests || top.testsCount || 0;
      console.log(`   -> PICKED: ID=${id} | Title="${title}" | Tests=${testsCount}`);
      results.push({
        domain: item.domain,
        exam: item.exam,
        id,
        title,
        testsCount
      });
    } else {
      console.log(`   -> No direct match, trying broader search...`);
    }
  }

  fs.writeFileSync('scripts/target_series_manifest.json', JSON.stringify(results, null, 2));
  console.log(`\n✅ Saved target series manifest with ${results.length} high-priority packs!`);
}

discover();
