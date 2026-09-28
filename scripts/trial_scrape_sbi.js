/**
 * Trial Scraper for SBI PO (and other Group A / Group B tests)
 * Usage:
 *   node scripts/trial_scrape_sbi.js [optional_test_id]
 * 
 * You can pass your credentials via:
 *   1. A local file in the test folder: testbook_auth.json or .env
 *   2. Or in terminal: AUTH_TOKEN="Bearer ..." node scripts/trial_scrape_sbi.js
 */

const fs = require('fs');
const path = require('path');

// Auto-load from testbook_auth.json or .env if exists
let fileAuthToken = "";
let fileCookie = "";

const authJsonPath = path.join(__dirname, '..', 'testbook_auth.json');
if (fs.existsSync(authJsonPath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(authJsonPath, 'utf8'));
    fileAuthToken = parsed.authorization || parsed.token || parsed.authToken || "";
    fileCookie = parsed.cookie || "";
  } catch (e) {}
}

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const tokenMatch = envContent.match(/AUTH_TOKEN=["']?([^"'\n\r]+)["']?/);
  if (tokenMatch) fileAuthToken = tokenMatch[1];
  const cookieMatch = envContent.match(/COOKIE=["']?([^"'\n\r]+)["']?/);
  if (cookieMatch) fileCookie = cookieMatch[1];
}

const DEFAULT_TEST_ID = "69df6095ad9290c28de257b7"; // SBI PO Reasoning Ability Mock
const targetTestId = process.argv[2] || process.env.TEST_ID || DEFAULT_TEST_ID;
const authToken = process.env.AUTH_TOKEN || fileAuthToken || "";
const cookieHeader = process.env.COOKIE || fileCookie || "";

async function downloadImage(url, destFolder) {
  try {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return url;
    const filename = path.basename(new URL(url).pathname);
    const localPath = path.join(destFolder, filename);

    if (fs.existsSync(localPath)) {
      return `assets/sbi_po/${filename}`;
    }

    const res = await fetch(url);
    if (!res.ok) return url;
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
    return `assets/sbi_po/${filename}`;
  } catch (err) {
    return url;
  }
}

function cleanHtmlText(text) {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

async function scrapeSingleTest() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Mock Scraping Trial for SBI PO`);
  console.log(`🎯 Target Test ID: ${targetTestId}`);
  console.log(`======================================================\n`);

  if (!authToken && !cookieHeader) {
    console.log(`⚠️  No AUTH_TOKEN or COOKIE found!`);
    console.log(`👉 To scrape full authenticated test questions, you can either:`);
    console.log(`   A) Create a file named "testbook_auth.json" in this folder with:`);
    console.log(`      { "authorization": "Bearer YOUR_COPIED_TOKEN_HERE" }`);
    console.log(`   B) Or run in terminal:`);
    console.log(`      AUTH_TOKEN="Bearer YOUR_TOKEN" node scripts/trial_scrape_sbi.js ${targetTestId}\n`);
  }

  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://testbook.com/",
    "Origin": "https://testbook.com",
    "Accept-Language": "en-US,en;q=0.9"
  };

  if (authToken) {
    headers["Authorization"] = authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`;
  }
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }

  const endpointUrl = `https://api.testbook.com/api/v2/tests/${targetTestId}`;
  console.log(`📡 Fetching test data from: ${endpointUrl} ...`);

  try {
    const res = await fetch(endpointUrl, { headers });
    console.log(`📥 Response Status: ${res.status} ${res.statusText}`);

    if (res.status === 401) {
      console.error(`\n❌ Error: 401 Unauthorized.`);
      console.error(`👉 Your session token/cookie is needed to access this test.`);
      console.error(`👉 Quick 10-second guide to get your token:`);
      console.error(`   1. Open Testbook in Chrome (logged into your subscribed account).`);
      console.error(`   2. Press F12 -> Network tab.`);
      console.error(`   3. Open any test and look for the request in Network tab.`);
      console.error(`   4. Copy the "authorization" header value into "testbook_auth.json".\n`);
      return;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Fetch failed with status ${res.status}:`, errText.substring(0, 300));
      return;
    }

    const rawData = await res.json();
    console.log(`✅ Raw JSON successfully received! Parsing structure...`);

    // Parse the payload
    const testData = rawData.data || rawData;
    const testTitle = testData.title || testData.name || "SBI PO Mock Test";
    const durationMinutes = testData.duration || (testData.timeLimit ? Math.round(testData.timeLimit / 60) : 60);
    const totalMarks = testData.totalMarks || testData.marks || 100;
    const questionsRaw = testData.questions || testData.questionList || [];
    const sectionsRaw = testData.sections || [];

    const assetFolder = path.join(__dirname, '..', 'data', 'assets', 'sbi_po');
    fs.mkdirSync(assetFolder, { recursive: true });

    console.log(`📊 Found ${sectionsRaw.length || 1} Section(s) and ${questionsRaw.length} Questions.`);

    const parsedSections = [];
    const sectionMap = {};

    // Build sections
    if (sectionsRaw.length > 0) {
      for (const s of sectionsRaw) {
        sectionMap[s._id || s.id] = s.name || s.title || "Section";
        parsedSections.push({
          id: s._id || s.id,
          name: s.name || s.title || "General",
          durationMinutes: s.duration || s.timeLimit ? Math.round(s.timeLimit / 60) : undefined,
          questions: []
        });
      }
    } else {
      parsedSections.push({
        id: "default_section",
        name: "General",
        questions: []
      });
    }

    let questionIndex = 1;
    let imagesDownloaded = 0;

    for (const q of questionsRaw) {
      // Extract English text
      const questionText = cleanHtmlText(
        (q.text && (q.text.en || (typeof q.text === 'string' ? q.text : ''))) ||
        q.question ||
        q.title ||
        ""
      );

      // Handle Image
      let localImageUrl = null;
      if (q.image || q.imageUrl || q.img) {
        const rawImgUrl = q.image || q.imageUrl || q.img;
        localImageUrl = await downloadImage(rawImgUrl, assetFolder);
        if (localImageUrl !== rawImgUrl) imagesDownloaded++;
      }

      // Handle Options (English only)
      const optionsRaw = q.options || q.choices || [];
      const parsedOptions = [];
      let optIdx = 0;
      const optionLabels = ["A", "B", "C", "D", "E"];

      for (const opt of optionsRaw) {
        const optText = cleanHtmlText(
          (opt.text && (opt.text.en || (typeof opt.text === 'string' ? opt.text : ''))) ||
          (typeof opt === 'string' ? opt : '')
        );

        let optImage = null;
        if (opt.image || opt.imageUrl) {
          optImage = await downloadImage(opt.image || opt.imageUrl, assetFolder);
        }

        parsedOptions.push({
          id: opt._id || opt.id || `opt_${optIdx + 1}`,
          label: optionLabels[optIdx] || `${optIdx + 1}`,
          text: optText,
          image: optImage
        });
        optIdx++;
      }

      // Handle Solution
      const explanationText = cleanHtmlText(
        (q.explanation && (q.explanation.en || (typeof q.explanation === 'string' ? q.explanation : ''))) ||
        (q.solution && (q.solution.en || (typeof q.solution === 'string' ? q.solution : ''))) ||
        q.hint ||
        "Solution not provided."
      );

      const parsedQ = {
        id: q._id || q.id || `q_${questionIndex}`,
        questionNumber: questionIndex,
        type: q.type || (q.isMultipleChoice ? "mcq_multiple" : "mcq_single"),
        text: questionText,
        image: localImageUrl,
        options: parsedOptions,
        correctOptionId: q.correctOption || q.answer || q.correctAnswer || (parsedOptions[0] ? parsedOptions[0].id : undefined),
        marks: q.marks || q.positiveMarks || 1.0,
        negativeMarks: q.negativeMarks || 0.25,
        explanation: explanationText,
        topic: q.topic || q.subject || "General",
        difficulty: q.difficulty || "Medium"
      };

      // Assign to section
      const targetSec = parsedSections.find(s => s.id === (q.sectionId || q.section)) || parsedSections[0];
      targetSec.questions.push(parsedQ);
      questionIndex++;
    }

    const finalTestJson = {
      testId: targetTestId,
      title: testTitle,
      category: "Group B",
      exam: "SBI PO",
      totalDurationMinutes: durationMinutes,
      totalMarks: totalMarks,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      sections: parsedSections,
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalQuestions: questionIndex - 1,
        imagesCount: imagesDownloaded
      }
    };

    const outputPath = path.join(__dirname, '..', 'data', 'group_b', 'sbi_po', `sbi_po_${targetTestId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(finalTestJson, null, 2), 'utf-8');

    console.log(`\n🎉 ======================================================`);
    console.log(`✅ Trial Scraping Completed Successfully!`);
    console.log(`📄 Saved to: ${outputPath}`);
    console.log(`📊 Summary:`);
    console.log(`   • Test Title: ${testTitle}`);
    console.log(`   • Total Questions: ${questionIndex - 1}`);
    console.log(`   • Sections: ${parsedSections.length} (${parsedSections.map(s => s.name).join(', ')})`);
    console.log(`   • Duration: ${durationMinutes} Minutes`);
    console.log(`   • Total Marks: ${totalMarks}`);
    console.log(`   • Local Diagrams Downloaded: ${imagesDownloaded}`);
    console.log(`======================================================\n`);

  } catch (error) {
    console.error(`❌ Unexpected Scraping Error:`, error);
  }
}

scrapeSingleTest();
