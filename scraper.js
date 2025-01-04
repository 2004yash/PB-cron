const puppeteer = require("puppeteer-core");
const axios = require("axios");

const scrapeRankData = async () => {
  let browser = null;
  try {
    // Configuration specifically for Render
    const options = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath: '/usr/bin/google-chrome-beta',  // Using Chrome Beta on Render
      headless: "new"
    };

    console.log("Launching browser...");
    browser = await puppeteer.launch(options);
    
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setViewport({ width: 1280, height: 800 });

    console.log("Fetching contest data...");
    const API_URL =
      process.env.VJUDGE_CONTEST_API ||
      "https://vjudge.net/contest/data?draw=2&start=0&length=20&sortDir=desc&sortCol=0&category=mine&running=3&title=&owner=Pbhustle&_=1733642420751";

    const { data } = await axios.get(API_URL);
    const ccode = data.data[0][0];
    const contestUrl = `https://vjudge.net/contest/${ccode}#rank`;

    console.log(`Navigating to contest ${ccode}...`);
    await page.goto(contestUrl, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });

    console.log("Waiting for rank table...");
    await page.waitForSelector("#contest-rank-table tbody", { 
      timeout: 60000,
      visible: true 
    });

    // Add small delay to ensure content is fully loaded
    await page.waitForTimeout(2000);

    console.log("Scraping rank data...");
    const rankData = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll("#contest-rank-table tbody tr")
      );
      return rows.map((row) => {
        const cells = row.querySelectorAll("td");
        return {
          rank: parseInt(cells[0]?.textContent?.trim() || "0"),
          name: cells[1]?.textContent?.trim() || "",
          score: parseInt(cells[2]?.textContent?.trim() || "0"),
        };
      });
    });

    console.log(`Successfully scraped ${rankData.length} entries`);

    return {
      message: "Scraping completed successfully",
      rankings: rankData,
      contestCode: ccode,
    };

  } catch (error) {
    console.error("Error during scraping:", error.message);
    throw new Error(`Scraping failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = { scrapeRankData };