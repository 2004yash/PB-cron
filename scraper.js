const puppeteer = require("puppeteer");
const axios = require("axios");

const scrapeRankData = async () => {
  let browser = null;
  try {
    // Launch browser with updated configuration
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      headless: "new",
    });

    // Create new page with longer timeout
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(120000); // 2 minutes
    await page.setViewport({ width: 1280, height: 800 });

    // Enable request interception to handle navigation better
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Fetch contest data
    console.log("Fetching contest data...");
    const API_URL =
      process.env.VJUDGE_CONTEST_API ||
      "https://vjudge.net/contest/data?draw=2&start=0&length=20&sortDir=desc&sortCol=0&category=mine&running=3&title=&owner=Pbhustle&_=1733642420751";

    const { data } = await axios.get(API_URL);
    const ccode = data.data[0][0];
    const contestUrl = `https://vjudge.net/contest/${ccode}#rank`;

    console.log(`Navigating to contest ${ccode}...`);
    
    // Navigate with better error handling
    const response = await page.goto(contestUrl, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 120000
    });

    if (!response.ok()) {
      throw new Error(`Failed to load page: ${response.status()} ${response.statusText()}`);
    }

    console.log("Waiting for rank table...");
    
    // Wait for table with multiple fallback selectors
    await Promise.race([
      page.waitForSelector("#contest-rank-table tbody", { 
        timeout: 60000,
        visible: true 
      }),
      page.waitForSelector(".contest-rank-table tbody", { 
        timeout: 60000,
        visible: true 
      })
    ]);

    // Add small delay to ensure content is fully loaded
    await page.waitForTimeout(2000);

    console.log("Scraping rank data...");
    
    // Scrape with additional error checking
    const rankData = await page.evaluate(() => {
      const table = document.querySelector("#contest-rank-table tbody") || 
                   document.querySelector(".contest-rank-table tbody");
      
      if (!table) {
        throw new Error("Rank table not found in DOM");
      }

      const rows = Array.from(table.querySelectorAll("tr"));
      
      if (rows.length === 0) {
        throw new Error("No rows found in rank table");
      }

      return rows.map((row) => {
        const cells = row.querySelectorAll("td");
        return {
          rank: parseInt(cells[0]?.textContent?.trim() || "0"),
          name: cells[1]?.textContent?.trim() || "",
          score: parseInt(cells[2]?.textContent?.trim() || "0"),
          timestamp: new Date().toISOString()
        };
      });
    });

    if (!rankData || rankData.length === 0) {
      throw new Error("No rank data was scraped");
    }

    console.log(`Successfully scraped ${rankData.length} entries`);

    return {
      message: "Scraping completed successfully",
      rankings: rankData,
      contestCode: ccode,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error("Error during scraping:", error.message);
    throw new Error(`Scraping failed: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error("Error closing browser:", error.message);
      }
    }
  }
};

module.exports = { scrapeRankData };